from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import hashlib
import secrets
from pathlib import Path
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ MODELS ============

class CompanyRegister(BaseModel):
    name: str
    email: str
    password: str
    address: str = ""
    phone: str = ""

class CompanyLogin(BaseModel):
    email: str
    password: str

class ApartmentCreate(BaseModel):
    number: str
    floor: int = 0
    monthly_rent: float
    service_costs: float = 0
    description: str = ""
    status: str = "vacant"

class ApartmentUpdate(BaseModel):
    number: Optional[str] = None
    floor: Optional[int] = None
    monthly_rent: Optional[float] = None
    service_costs: Optional[float] = None
    description: Optional[str] = None
    status: Optional[str] = None

class TenantCreate(BaseModel):
    name: str
    apartment_id: str
    phone: str = ""
    email: str = ""
    deposit_required: float = 0
    deposit_paid: float = 0

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    outstanding_rent: Optional[float] = None
    service_costs: Optional[float] = None
    fines: Optional[float] = None
    deposit_required: Optional[float] = None
    deposit_paid: Optional[float] = None
    status: Optional[str] = None

class PaymentCreate(BaseModel):
    tenant_id: str
    amount: float
    payment_type: str
    payment_method: str = "cash"
    description: str = ""

class BreakerToggle(BaseModel):
    breaker_id: str
    status: str

# ============ PASSWORD HELPERS ============

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"{salt}:{h.hex()}"

def verify_password(password: str, stored: str) -> bool:
    try:
        salt, hash_hex = stored.split(':')
        h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return h.hex() == hash_hex
    except Exception:
        return False

# ============ AUTH HELPER ============

async def get_current_company(request: Request) -> dict:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    if not session_token:
        raise HTTPException(status_code=401, detail="Niet ingelogd")
    session = await db.company_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Sessie ongeldig")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Sessie verlopen")
    company = await db.companies.find_one({"company_id": session["company_id"]}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=401, detail="Bedrijf niet gevonden")
    return company

# ============ COMPANY AUTH ROUTES ============

@api_router.post("/companies/register")
async def register_company(data: CompanyRegister, response: Response):
    existing = await db.companies.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="E-mailadres is al geregistreerd")
    company_id = f"comp_{uuid.uuid4().hex[:8]}"
    await db.companies.insert_one({
        "company_id": company_id,
        "name": data.name,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "address": data.address,
        "phone": data.phone,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    session_token = secrets.token_hex(32)
    await db.company_sessions.insert_one({
        "company_id": company_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none",
        path="/", max_age=7*24*60*60
    )
    created = await db.companies.find_one({"company_id": company_id}, {"_id": 0})
    return {k: v for k, v in created.items() if k != "password_hash"}

@api_router.post("/companies/login")
async def login_company(data: CompanyLogin, response: Response):
    company = await db.companies.find_one({"email": data.email}, {"_id": 0})
    if not company or not verify_password(data.password, company.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Ongeldig e-mailadres of wachtwoord")
    session_token = secrets.token_hex(32)
    await db.company_sessions.insert_one({
        "company_id": company["company_id"],
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none",
        path="/", max_age=7*24*60*60
    )
    return {k: v for k, v in company.items() if k != "password_hash"}

@api_router.get("/companies/me")
async def company_me(request: Request):
    company = await get_current_company(request)
    return {k: v for k, v in company.items() if k != "password_hash"}

@api_router.post("/companies/logout")
async def company_logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.company_sessions.delete_many({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/", secure=True, samesite="none")
    return {"message": "Uitgelogd"}

@api_router.get("/companies/public")
async def list_companies_public():
    companies = await db.companies.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    return companies

# ============ APARTMENT ROUTES (admin, protected) ============

@api_router.get("/apartments")
async def list_apartments(request: Request):
    company = await get_current_company(request)
    return await db.apartments.find({"company_id": company["company_id"]}, {"_id": 0}).to_list(1000)

@api_router.get("/apartments/{apartment_id}")
async def get_apartment(apartment_id: str, request: Request):
    company = await get_current_company(request)
    apt = await db.apartments.find_one({"apartment_id": apartment_id, "company_id": company["company_id"]}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    return apt

@api_router.post("/apartments")
async def create_apartment(data: ApartmentCreate, request: Request):
    company = await get_current_company(request)
    apartment_id = f"apt_{uuid.uuid4().hex[:8]}"
    doc = {
        "apartment_id": apartment_id,
        "company_id": company["company_id"],
        "number": data.number,
        "floor": data.floor,
        "monthly_rent": data.monthly_rent,
        "service_costs": data.service_costs,
        "description": data.description,
        "status": data.status,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.apartments.insert_one(doc)
    return await db.apartments.find_one({"apartment_id": apartment_id}, {"_id": 0})

@api_router.put("/apartments/{apartment_id}")
async def update_apartment(apartment_id: str, data: ApartmentUpdate, request: Request):
    company = await get_current_company(request)
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Geen data om bij te werken")
    result = await db.apartments.update_one(
        {"apartment_id": apartment_id, "company_id": company["company_id"]}, {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    return await db.apartments.find_one({"apartment_id": apartment_id}, {"_id": 0})

@api_router.delete("/apartments/{apartment_id}")
async def delete_apartment(apartment_id: str, request: Request):
    company = await get_current_company(request)
    result = await db.apartments.delete_one({"apartment_id": apartment_id, "company_id": company["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    return {"message": "Appartement verwijderd"}

# ============ TENANT ROUTES (admin, protected) ============

@api_router.get("/tenants")
async def list_tenants(request: Request):
    company = await get_current_company(request)
    return await db.tenants.find({"company_id": company["company_id"]}, {"_id": 0}).to_list(1000)

@api_router.get("/tenants/{tenant_id}")
async def get_tenant(tenant_id: str, request: Request):
    company = await get_current_company(request)
    tenant = await db.tenants.find_one({"tenant_id": tenant_id, "company_id": company["company_id"]}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    return tenant

@api_router.post("/tenants")
async def create_tenant(data: TenantCreate, request: Request):
    company = await get_current_company(request)
    cid = company["company_id"]
    apt = await db.apartments.find_one({"apartment_id": data.apartment_id, "company_id": cid}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    count = await db.tenants.count_documents({"company_id": cid})
    tenant_code = f"HUR{str(count + 1).zfill(3)}"
    tenant_id = f"ten_{uuid.uuid4().hex[:8]}"
    doc = {
        "tenant_id": tenant_id,
        "company_id": cid,
        "tenant_code": tenant_code,
        "name": data.name,
        "apartment_id": data.apartment_id,
        "apartment_number": apt["number"],
        "phone": data.phone,
        "email": data.email,
        "monthly_rent": apt["monthly_rent"],
        "outstanding_rent": apt["monthly_rent"],
        "service_costs": apt["service_costs"],
        "fines": 0,
        "deposit_required": data.deposit_required,
        "deposit_paid": data.deposit_paid,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tenants.insert_one(doc)
    await db.apartments.update_one({"apartment_id": data.apartment_id}, {"$set": {"status": "occupied"}})
    return await db.tenants.find_one({"tenant_id": tenant_id}, {"_id": 0})

@api_router.put("/tenants/{tenant_id}")
async def update_tenant(tenant_id: str, data: TenantUpdate, request: Request):
    company = await get_current_company(request)
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Geen data om bij te werken")
    result = await db.tenants.update_one(
        {"tenant_id": tenant_id, "company_id": company["company_id"]}, {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    return await db.tenants.find_one({"tenant_id": tenant_id}, {"_id": 0})

@api_router.delete("/tenants/{tenant_id}")
async def delete_tenant(tenant_id: str, request: Request):
    company = await get_current_company(request)
    cid = company["company_id"]
    tenant = await db.tenants.find_one({"tenant_id": tenant_id, "company_id": cid}, {"_id": 0})
    if tenant:
        await db.apartments.update_one({"apartment_id": tenant["apartment_id"]}, {"$set": {"status": "vacant"}})
    result = await db.tenants.delete_one({"tenant_id": tenant_id, "company_id": cid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    return {"message": "Huurder verwijderd"}

# ============ SHARED PAYMENT LOGIC ============

async def _process_payment(tenant, data, company_id, company_name=""):
    payment_id = f"pay_{uuid.uuid4().hex[:8]}"
    kwitantie_nr = f"KW-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    doc = {
        "payment_id": payment_id,
        "company_id": company_id,
        "company_name": company_name,
        "tenant_id": data.tenant_id,
        "tenant_name": tenant["name"],
        "tenant_code": tenant["tenant_code"],
        "apartment_number": tenant["apartment_number"],
        "apartment_id": tenant["apartment_id"],
        "monthly_rent": tenant.get("monthly_rent", 0),
        "amount": data.amount,
        "payment_type": data.payment_type,
        "payment_method": data.payment_method,
        "description": data.description,
        "kwitantie_nummer": kwitantie_nr,
        "receipt_number": kwitantie_nr,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payments.insert_one(doc)
    apt = await db.apartments.find_one({"apartment_id": tenant["apartment_id"]}, {"_id": 0})
    if data.payment_type in ["rent", "partial_rent"]:
        outstanding = tenant.get("outstanding_rent", 0) or 0
        new_rent = max(0, outstanding - data.amount)
        update_fields = {"outstanding_rent": new_rent}
        if new_rent == 0 and apt:
            update_fields["outstanding_rent"] = apt["monthly_rent"]
            update_fields["service_costs"] = (tenant.get("service_costs", 0) or 0) + apt.get("service_costs", 0)
        await db.tenants.update_one({"tenant_id": data.tenant_id}, {"$set": update_fields})
    elif data.payment_type == "service_costs":
        sc = tenant.get("service_costs", 0) or 0
        await db.tenants.update_one({"tenant_id": data.tenant_id}, {"$set": {"service_costs": max(0, sc - data.amount)}})
    elif data.payment_type == "fines":
        fines = tenant.get("fines", 0) or 0
        await db.tenants.update_one({"tenant_id": data.tenant_id}, {"$set": {"fines": max(0, fines - data.amount)}})
    elif data.payment_type == "deposit":
        dep = tenant.get("deposit_paid", 0) or 0
        await db.tenants.update_one({"tenant_id": data.tenant_id}, {"$set": {"deposit_paid": dep + data.amount}})
    return await db.payments.find_one({"payment_id": payment_id}, {"_id": 0})

# ============ PAYMENT ROUTES (admin, protected) ============

@api_router.post("/payments")
async def create_payment(data: PaymentCreate, request: Request):
    company = await get_current_company(request)
    cid = company["company_id"]
    tenant = await db.tenants.find_one({"tenant_id": data.tenant_id, "company_id": cid}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    return await _process_payment(tenant, data, cid, company.get("name", ""))

@api_router.get("/payments")
async def list_payments(request: Request, tenant_id: Optional[str] = None, limit: int = 100):
    company = await get_current_company(request)
    query = {"company_id": company["company_id"]}
    if tenant_id:
        query["tenant_id"] = tenant_id
    return await db.payments.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)

@api_router.get("/payments/{payment_id}")
async def get_payment(payment_id: str, request: Request):
    company = await get_current_company(request)
    payment = await db.payments.find_one({"payment_id": payment_id, "company_id": company["company_id"]}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    return payment

# ============ DASHBOARD ROUTES (admin, protected) ============

@api_router.get("/dashboard/stats")
async def dashboard_stats(request: Request):
    company = await get_current_company(request)
    cid = company["company_id"]
    total_apartments = await db.apartments.count_documents({"company_id": cid})
    occupied = await db.apartments.count_documents({"company_id": cid, "status": "occupied"})
    total_tenants = await db.tenants.count_documents({"company_id": cid, "status": "active"})
    total_payments = await db.payments.count_documents({"company_id": cid})
    pipeline = [{"$match": {"company_id": cid}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    revenue_result = await db.payments.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    pipeline_outstanding = [
        {"$match": {"company_id": cid, "status": "active"}},
        {"$group": {"_id": None, "rent": {"$sum": "$outstanding_rent"}, "services": {"$sum": "$service_costs"}, "fines": {"$sum": "$fines"}}}
    ]
    outstanding_result = await db.tenants.aggregate(pipeline_outstanding).to_list(1)
    outstanding = outstanding_result[0] if outstanding_result else {"rent": 0, "services": 0, "fines": 0}
    recent_payments = await db.payments.find({"company_id": cid}, {"_id": 0}).sort("created_at", -1).to_list(10)
    return {
        "total_apartments": total_apartments,
        "occupied_apartments": occupied,
        "vacant_apartments": total_apartments - occupied,
        "total_tenants": total_tenants,
        "total_payments": total_payments,
        "total_revenue": total_revenue,
        "outstanding_rent": outstanding.get("rent", 0),
        "outstanding_services": outstanding.get("services", 0),
        "outstanding_fines": outstanding.get("fines", 0),
        "recent_payments": recent_payments
    }

# ============ BREAKER ROUTES (admin, protected) ============

@api_router.get("/breakers")
async def list_breakers(request: Request):
    company = await get_current_company(request)
    return await db.breakers.find({"company_id": company["company_id"]}, {"_id": 0}).to_list(100)

@api_router.post("/breakers/toggle")
async def toggle_breaker(data: BreakerToggle, request: Request):
    company = await get_current_company(request)
    cid = company["company_id"]
    breaker = await db.breakers.find_one({"breaker_id": data.breaker_id, "company_id": cid}, {"_id": 0})
    if not breaker:
        raise HTTPException(status_code=404, detail="Breker niet gevonden")
    await db.breakers.update_one(
        {"breaker_id": data.breaker_id},
        {"$set": {"status": data.status, "last_toggled": datetime.now(timezone.utc).isoformat()}}
    )
    return await db.breakers.find_one({"breaker_id": data.breaker_id}, {"_id": 0})

# ============ KIOSK PUBLIC ROUTES ============

@api_router.get("/kiosk/{company_id}/company")
async def kiosk_get_company(company_id: str):
    company = await db.companies.find_one({"company_id": company_id}, {"_id": 0, "password_hash": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    return company

@api_router.get("/kiosk/{company_id}/apartments")
async def kiosk_list_apartments(company_id: str):
    company = await db.companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    return await db.apartments.find({"company_id": company_id}, {"_id": 0}).to_list(1000)

@api_router.get("/kiosk/{company_id}/tenants")
async def kiosk_list_tenants(company_id: str):
    company = await db.companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    return await db.tenants.find({"company_id": company_id}, {"_id": 0}).to_list(1000)

@api_router.get("/kiosk/{company_id}/tenants/lookup/{query}")
async def kiosk_lookup_tenant(company_id: str, query: str):
    company = await db.companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    tenant = await db.tenants.find_one(
        {"company_id": company_id, "$or": [{"tenant_code": query.upper()}, {"apartment_number": query.upper()}]},
        {"_id": 0}
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    return tenant

@api_router.post("/kiosk/{company_id}/payments")
async def kiosk_create_payment(company_id: str, data: PaymentCreate):
    company = await db.companies.find_one({"company_id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    tenant = await db.tenants.find_one({"tenant_id": data.tenant_id, "company_id": company_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    return await _process_payment(tenant, data, company_id, company.get("name", ""))

# ============ SEED DATA ============

@app.on_event("startup")
async def seed_data():
    demo = await db.companies.find_one({"company_id": "comp_demo"})
    if demo:
        return
    logger.info("Seeding multi-tenant demo data...")
    await db.apartments.delete_many({"company_id": {"$exists": False}})
    await db.tenants.delete_many({"company_id": {"$exists": False}})
    await db.payments.delete_many({"company_id": {"$exists": False}})
    await db.breakers.delete_many({"company_id": {"$exists": False}})
    cid = "comp_demo"
    await db.companies.insert_one({
        "company_id": cid,
        "name": "Demo Vastgoed BV",
        "email": "demo@vastgoed.sr",
        "password_hash": hash_password("demo123"),
        "address": "Kernkampweg 15, Paramaribo",
        "phone": "+597 400-000",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    apartments = [
        {"apartment_id": "apt_001", "company_id": cid, "number": "A101", "floor": 1, "monthly_rent": 2500, "service_costs": 150, "description": "2-kamer appartement", "status": "occupied", "created_at": datetime.now(timezone.utc).isoformat()},
        {"apartment_id": "apt_002", "company_id": cid, "number": "A102", "floor": 1, "monthly_rent": 2800, "service_costs": 175, "description": "3-kamer appartement", "status": "occupied", "created_at": datetime.now(timezone.utc).isoformat()},
        {"apartment_id": "apt_003", "company_id": cid, "number": "A201", "floor": 2, "monthly_rent": 3000, "service_costs": 200, "description": "3-kamer appartement met balkon", "status": "occupied", "created_at": datetime.now(timezone.utc).isoformat()},
        {"apartment_id": "apt_004", "company_id": cid, "number": "A202", "floor": 2, "monthly_rent": 2200, "service_costs": 125, "description": "Studio appartement", "status": "vacant", "created_at": datetime.now(timezone.utc).isoformat()},
        {"apartment_id": "apt_005", "company_id": cid, "number": "B101", "floor": 1, "monthly_rent": 3500, "service_costs": 250, "description": "4-kamer appartement", "status": "occupied", "created_at": datetime.now(timezone.utc).isoformat()},
        {"apartment_id": "apt_006", "company_id": cid, "number": "B102", "floor": 1, "monthly_rent": 2000, "service_costs": 100, "description": "1-kamer studio", "status": "vacant", "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.apartments.insert_many(apartments)
    tenants = [
        {"tenant_id": "ten_001", "company_id": cid, "tenant_code": "HUR001", "name": "Radjesh Kanhai", "apartment_id": "apt_001", "apartment_number": "A101", "phone": "+597 8123456", "email": "radjesh@email.com", "monthly_rent": 2500, "outstanding_rent": 5000, "service_costs": 300, "fines": 0, "deposit_required": 5000, "deposit_paid": 5000, "status": "active", "created_at": datetime.now(timezone.utc).isoformat()},
        {"tenant_id": "ten_002", "company_id": cid, "tenant_code": "HUR002", "name": "Maria Janssen", "apartment_id": "apt_002", "apartment_number": "A102", "phone": "+597 8234567", "email": "maria@email.com", "monthly_rent": 2800, "outstanding_rent": 2800, "service_costs": 175, "fines": 500, "deposit_required": 5600, "deposit_paid": 5600, "status": "active", "created_at": datetime.now(timezone.utc).isoformat()},
        {"tenant_id": "ten_003", "company_id": cid, "tenant_code": "HUR003", "name": "Andre Pengel", "apartment_id": "apt_003", "apartment_number": "A201", "phone": "+597 8345678", "email": "andre@email.com", "monthly_rent": 3000, "outstanding_rent": 9000, "service_costs": 600, "fines": 250, "deposit_required": 6000, "deposit_paid": 3000, "status": "active", "created_at": datetime.now(timezone.utc).isoformat()},
        {"tenant_id": "ten_004", "company_id": cid, "tenant_code": "HUR004", "name": "Shanti Ramsodit", "apartment_id": "apt_005", "apartment_number": "B101", "phone": "+597 8456789", "email": "shanti@email.com", "monthly_rent": 3500, "outstanding_rent": 3500, "service_costs": 250, "fines": 0, "deposit_required": 7000, "deposit_paid": 7000, "status": "active", "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.tenants.insert_many(tenants)
    breakers = [
        {"breaker_id": "brk_001", "company_id": cid, "apartment_number": "A101", "name": "Hoofdstroom A101", "status": "on", "last_toggled": datetime.now(timezone.utc).isoformat()},
        {"breaker_id": "brk_002", "company_id": cid, "apartment_number": "A102", "name": "Hoofdstroom A102", "status": "on", "last_toggled": datetime.now(timezone.utc).isoformat()},
        {"breaker_id": "brk_003", "company_id": cid, "apartment_number": "A201", "name": "Hoofdstroom A201", "status": "on", "last_toggled": datetime.now(timezone.utc).isoformat()},
        {"breaker_id": "brk_004", "company_id": cid, "apartment_number": "A202", "name": "Hoofdstroom A202", "status": "off", "last_toggled": datetime.now(timezone.utc).isoformat()},
        {"breaker_id": "brk_005", "company_id": cid, "apartment_number": "B101", "name": "Hoofdstroom B101", "status": "on", "last_toggled": datetime.now(timezone.utc).isoformat()},
        {"breaker_id": "brk_006", "company_id": cid, "apartment_number": "B102", "name": "Hoofdstroom B102", "status": "off", "last_toggled": datetime.now(timezone.utc).isoformat()},
    ]
    await db.breakers.insert_many(breakers)
    logger.info("Multi-tenant demo data seeded! Login: demo@vastgoed.sr / demo123")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
