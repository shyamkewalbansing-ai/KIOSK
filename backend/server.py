from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
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
    payment_type: str  # rent, service_costs, fines, deposit, partial_rent
    payment_method: str = "cash"
    description: str = ""

class BreakerToggle(BaseModel):
    breaker_id: str
    status: str  # on or off

class SessionExchange(BaseModel):
    session_id: str

# ============ AUTH HELPERS ============

async def get_current_user(request: Request):
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    if not session_token:
        raise HTTPException(status_code=401, detail="Niet ingelogd")
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Sessie ongeldig")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Sessie verlopen")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Gebruiker niet gevonden")
    return user

# ============ AUTH ROUTES ============

@api_router.post("/auth/session")
async def exchange_session(data: SessionExchange, response: Response):
    async with httpx.AsyncClient() as http_client:
        resp = await http_client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": data.session_id}
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Ongeldige sessie")
    session_data = resp.json()
    email = session_data["email"]
    name = session_data["name"]
    picture = session_data.get("picture", "")
    session_token = session_data["session_token"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"email": email}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none",
        path="/", max_age=7*24*60*60
    )
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user

@api_router.get("/auth/me")
async def auth_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/", secure=True, samesite="none")
    return {"message": "Uitgelogd"}

# ============ APARTMENT ROUTES ============

@api_router.get("/apartments")
async def list_apartments():
    apartments = await db.apartments.find({}, {"_id": 0}).to_list(1000)
    return apartments

@api_router.get("/apartments/{apartment_id}")
async def get_apartment(apartment_id: str):
    apt = await db.apartments.find_one({"apartment_id": apartment_id}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    return apt

@api_router.post("/apartments")
async def create_apartment(data: ApartmentCreate):
    apartment_id = f"apt_{uuid.uuid4().hex[:8]}"
    doc = {
        "apartment_id": apartment_id,
        "number": data.number,
        "floor": data.floor,
        "monthly_rent": data.monthly_rent,
        "service_costs": data.service_costs,
        "description": data.description,
        "status": data.status,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.apartments.insert_one(doc)
    created = await db.apartments.find_one({"apartment_id": apartment_id}, {"_id": 0})
    return created

@api_router.put("/apartments/{apartment_id}")
async def update_apartment(apartment_id: str, data: ApartmentUpdate):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Geen data om bij te werken")
    await db.apartments.update_one({"apartment_id": apartment_id}, {"$set": update_data})
    updated = await db.apartments.find_one({"apartment_id": apartment_id}, {"_id": 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    return updated

@api_router.delete("/apartments/{apartment_id}")
async def delete_apartment(apartment_id: str):
    result = await db.apartments.delete_one({"apartment_id": apartment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    return {"message": "Appartement verwijderd"}

# ============ TENANT ROUTES ============

@api_router.get("/tenants")
async def list_tenants():
    tenants = await db.tenants.find({}, {"_id": 0}).to_list(1000)
    return tenants

@api_router.get("/tenants/{tenant_id}")
async def get_tenant(tenant_id: str):
    tenant = await db.tenants.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    return tenant

@api_router.get("/tenants/lookup/{query}")
async def lookup_tenant(query: str):
    tenant = await db.tenants.find_one(
        {"$or": [{"tenant_code": query.upper()}, {"apartment_number": query.upper()}]},
        {"_id": 0}
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    return tenant

@api_router.post("/tenants")
async def create_tenant(data: TenantCreate):
    apt = await db.apartments.find_one({"apartment_id": data.apartment_id}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Appartement niet gevonden")
    count = await db.tenants.count_documents({})
    tenant_code = f"HUR{str(count + 1).zfill(3)}"
    tenant_id = f"ten_{uuid.uuid4().hex[:8]}"
    doc = {
        "tenant_id": tenant_id,
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
    created = await db.tenants.find_one({"tenant_id": tenant_id}, {"_id": 0})
    return created

@api_router.put("/tenants/{tenant_id}")
async def update_tenant(tenant_id: str, data: TenantUpdate):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Geen data om bij te werken")
    await db.tenants.update_one({"tenant_id": tenant_id}, {"$set": update_data})
    updated = await db.tenants.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    return updated

@api_router.delete("/tenants/{tenant_id}")
async def delete_tenant(tenant_id: str):
    tenant = await db.tenants.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if tenant:
        await db.apartments.update_one(
            {"apartment_id": tenant["apartment_id"]},
            {"$set": {"status": "vacant"}}
        )
    result = await db.tenants.delete_one({"tenant_id": tenant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    return {"message": "Huurder verwijderd"}

# ============ PAYMENT ROUTES ============

@api_router.post("/payments")
async def create_payment(data: PaymentCreate):
    tenant = await db.tenants.find_one({"tenant_id": data.tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    payment_id = f"pay_{uuid.uuid4().hex[:8]}"
    receipt_number = f"BON-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    doc = {
        "payment_id": payment_id,
        "tenant_id": data.tenant_id,
        "tenant_name": tenant["name"],
        "tenant_code": tenant["tenant_code"],
        "apartment_number": tenant["apartment_number"],
        "amount": data.amount,
        "payment_type": data.payment_type,
        "payment_method": data.payment_method,
        "description": data.description,
        "receipt_number": receipt_number,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payments.insert_one(doc)
    # Update tenant balances
    apt = await db.apartments.find_one({"apartment_id": tenant["apartment_id"]}, {"_id": 0})
    if data.payment_type in ["rent", "partial_rent"]:
        new_rent = max(0, tenant["outstanding_rent"] - data.amount)
        update_fields = {"outstanding_rent": new_rent}
        # Auto-add next month rent + service costs when fully paid
        if new_rent == 0 and apt:
            update_fields["outstanding_rent"] = apt["monthly_rent"]
            update_fields["service_costs"] = (tenant.get("service_costs", 0) or 0) + apt.get("service_costs", 0)
        await db.tenants.update_one({"tenant_id": data.tenant_id}, {"$set": update_fields})
    elif data.payment_type == "service_costs":
        new_sc = max(0, tenant["service_costs"] - data.amount)
        await db.tenants.update_one({"tenant_id": data.tenant_id}, {"$set": {"service_costs": new_sc}})
    elif data.payment_type == "fines":
        new_fines = max(0, tenant["fines"] - data.amount)
        await db.tenants.update_one({"tenant_id": data.tenant_id}, {"$set": {"fines": new_fines}})
    elif data.payment_type == "deposit":
        new_deposit = tenant["deposit_paid"] + data.amount
        await db.tenants.update_one({"tenant_id": data.tenant_id}, {"$set": {"deposit_paid": new_deposit}})
    created = await db.payments.find_one({"payment_id": payment_id}, {"_id": 0})
    return created

@api_router.get("/payments")
async def list_payments(tenant_id: Optional[str] = None, limit: int = 100):
    query = {}
    if tenant_id:
        query["tenant_id"] = tenant_id
    payments = await db.payments.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return payments

@api_router.get("/payments/{payment_id}")
async def get_payment(payment_id: str):
    payment = await db.payments.find_one({"payment_id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    return payment

# ============ DASHBOARD ROUTES ============

@api_router.get("/dashboard/stats")
async def dashboard_stats():
    total_apartments = await db.apartments.count_documents({})
    occupied = await db.apartments.count_documents({"status": "occupied"})
    total_tenants = await db.tenants.count_documents({"status": "active"})
    total_payments = await db.payments.count_documents({})
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    revenue_result = await db.payments.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    pipeline_outstanding = [
        {"$match": {"status": "active"}},
        {"$group": {"_id": None, "rent": {"$sum": "$outstanding_rent"}, "services": {"$sum": "$service_costs"}, "fines": {"$sum": "$fines"}}}
    ]
    outstanding_result = await db.tenants.aggregate(pipeline_outstanding).to_list(1)
    outstanding = outstanding_result[0] if outstanding_result else {"rent": 0, "services": 0, "fines": 0}
    recent_payments = await db.payments.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)
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

# ============ TUYA MOCK ROUTES ============

@api_router.get("/breakers")
async def list_breakers():
    breakers = await db.breakers.find({}, {"_id": 0}).to_list(100)
    return breakers

@api_router.post("/breakers/toggle")
async def toggle_breaker(data: BreakerToggle):
    breaker = await db.breakers.find_one({"breaker_id": data.breaker_id}, {"_id": 0})
    if not breaker:
        raise HTTPException(status_code=404, detail="Breker niet gevonden")
    new_status = data.status
    await db.breakers.update_one(
        {"breaker_id": data.breaker_id},
        {"$set": {"status": new_status, "last_toggled": datetime.now(timezone.utc).isoformat()}}
    )
    updated = await db.breakers.find_one({"breaker_id": data.breaker_id}, {"_id": 0})
    return updated

# ============ SEED DATA ============

@app.on_event("startup")
async def seed_data():
    apt_count = await db.apartments.count_documents({})
    if apt_count == 0:
        logger.info("Seeding demo data...")
        apartments = [
            {"apartment_id": "apt_001", "number": "A101", "floor": 1, "monthly_rent": 2500, "service_costs": 150, "description": "2-kamer appartement", "status": "occupied", "created_at": datetime.now(timezone.utc).isoformat()},
            {"apartment_id": "apt_002", "number": "A102", "floor": 1, "monthly_rent": 2800, "service_costs": 175, "description": "3-kamer appartement", "status": "occupied", "created_at": datetime.now(timezone.utc).isoformat()},
            {"apartment_id": "apt_003", "number": "A201", "floor": 2, "monthly_rent": 3000, "service_costs": 200, "description": "3-kamer appartement met balkon", "status": "occupied", "created_at": datetime.now(timezone.utc).isoformat()},
            {"apartment_id": "apt_004", "number": "A202", "floor": 2, "monthly_rent": 2200, "service_costs": 125, "description": "Studio appartement", "status": "vacant", "created_at": datetime.now(timezone.utc).isoformat()},
            {"apartment_id": "apt_005", "number": "B101", "floor": 1, "monthly_rent": 3500, "service_costs": 250, "description": "4-kamer appartement", "status": "occupied", "created_at": datetime.now(timezone.utc).isoformat()},
            {"apartment_id": "apt_006", "number": "B102", "floor": 1, "monthly_rent": 2000, "service_costs": 100, "description": "1-kamer studio", "status": "vacant", "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.apartments.insert_many(apartments)
        tenants = [
            {"tenant_id": "ten_001", "tenant_code": "HUR001", "name": "Radjesh Kanhai", "apartment_id": "apt_001", "apartment_number": "A101", "phone": "+597 8123456", "email": "radjesh@email.com", "monthly_rent": 2500, "outstanding_rent": 5000, "service_costs": 300, "fines": 0, "deposit_required": 5000, "deposit_paid": 5000, "status": "active", "created_at": datetime.now(timezone.utc).isoformat()},
            {"tenant_id": "ten_002", "tenant_code": "HUR002", "name": "Maria Janssen", "apartment_id": "apt_002", "apartment_number": "A102", "phone": "+597 8234567", "email": "maria@email.com", "monthly_rent": 2800, "outstanding_rent": 2800, "service_costs": 175, "fines": 500, "deposit_required": 5600, "deposit_paid": 5600, "status": "active", "created_at": datetime.now(timezone.utc).isoformat()},
            {"tenant_id": "ten_003", "tenant_code": "HUR003", "name": "Andre Pengel", "apartment_id": "apt_003", "apartment_number": "A201", "phone": "+597 8345678", "email": "andre@email.com", "monthly_rent": 3000, "outstanding_rent": 9000, "service_costs": 600, "fines": 250, "deposit_required": 6000, "deposit_paid": 3000, "status": "active", "created_at": datetime.now(timezone.utc).isoformat()},
            {"tenant_id": "ten_004", "tenant_code": "HUR004", "name": "Shanti Ramsodit", "apartment_id": "apt_005", "apartment_number": "B101", "phone": "+597 8456789", "email": "shanti@email.com", "monthly_rent": 3500, "outstanding_rent": 3500, "service_costs": 250, "fines": 0, "deposit_required": 7000, "deposit_paid": 7000, "status": "active", "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.tenants.insert_many(tenants)
        breakers = [
            {"breaker_id": "brk_001", "apartment_number": "A101", "name": "Hoofdstroom A101", "status": "on", "last_toggled": datetime.now(timezone.utc).isoformat()},
            {"breaker_id": "brk_002", "apartment_number": "A102", "name": "Hoofdstroom A102", "status": "on", "last_toggled": datetime.now(timezone.utc).isoformat()},
            {"breaker_id": "brk_003", "apartment_number": "A201", "name": "Hoofdstroom A201", "status": "on", "last_toggled": datetime.now(timezone.utc).isoformat()},
            {"breaker_id": "brk_004", "apartment_number": "A202", "name": "Hoofdstroom A202", "status": "off", "last_toggled": datetime.now(timezone.utc).isoformat()},
            {"breaker_id": "brk_005", "apartment_number": "B101", "name": "Hoofdstroom B101", "status": "on", "last_toggled": datetime.now(timezone.utc).isoformat()},
            {"breaker_id": "brk_006", "apartment_number": "B102", "name": "Hoofdstroom B102", "status": "off", "last_toggled": datetime.now(timezone.utc).isoformat()},
        ]
        await db.breakers.insert_many(breakers)
        logger.info("Demo data seeded successfully!")

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
