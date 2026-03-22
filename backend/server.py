from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File
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
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ CONSTANTS ============

SUPERADMIN_EMAIL = "admin@facturatie.sr"
SUPERADMIN_PASSWORD = "Bharat7755"
SUBSCRIPTION_PRICE = 3500
TRIAL_DAYS = 3
GRACE_DAYS = 3
BANK_NAME = "Hakrinbank"
BANK_ACCOUNT = "205911044"
BANK_REFERENCE = "5978934982"

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

class SuperAdminLogin(BaseModel):
    email: str
    password: str

class RegisterPayment(BaseModel):
    paid_amount: float

class ApartmentCreate(BaseModel):
    number: str
    monthly_rent: float
    service_costs: float = 0
    description: str = ""
    status: str = "vacant"

class ApartmentUpdate(BaseModel):
    number: Optional[str] = None
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
    rent_month: Optional[str] = None

class CompanySettingsUpdate(BaseModel):
    billing_day_of_month: Optional[int] = None
    late_fee_amount: Optional[float] = None
    stamp_company_name: Optional[str] = None
    stamp_address: Optional[str] = None
    stamp_phone: Optional[str] = None
    stamp_whatsapp: Optional[str] = None

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

def parse_dt(val):
    if not val:
        return None
    if isinstance(val, datetime):
        dt = val
    else:
        dt = datetime.fromisoformat(str(val))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt

# ============ SUBSCRIPTION LOGIC ============

async def update_subscription_status(company: dict) -> dict:
    status = company.get("subscription_status", "trial")
    now = datetime.now(timezone.utc)
    if status == "free":
        return company
    new_status = None
    if status == "trial":
        trial_end = parse_dt(company.get("trial_end"))
        if trial_end and now > trial_end:
            grace_end = trial_end + timedelta(days=GRACE_DAYS)
            new_status = "deactivated" if now > grace_end else "expired"
    elif status == "active":
        sub_end = parse_dt(company.get("subscription_end"))
        if sub_end and now > sub_end:
            grace_end = sub_end + timedelta(days=GRACE_DAYS)
            new_status = "deactivated" if now > grace_end else "expired"
    elif status == "expired":
        trial_end = parse_dt(company.get("trial_end"))
        sub_end = parse_dt(company.get("subscription_end"))
        ref = sub_end or trial_end
        if ref:
            grace_end = ref + timedelta(days=GRACE_DAYS)
            if now > grace_end:
                new_status = "deactivated"
    if new_status and new_status != status:
        await db.companies.update_one(
            {"company_id": company["company_id"]},
            {"$set": {"subscription_status": new_status}}
        )
        company["subscription_status"] = new_status
    return company

async def check_company_subscription(company_id: str) -> dict:
    company = await db.companies.find_one({"company_id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    company = await update_subscription_status(company)
    if company["subscription_status"] == "deactivated":
        raise HTTPException(status_code=403, detail="Service niet beschikbaar. Het abonnement van dit bedrijf is verlopen.")
    return company

# ============ AUTH HELPERS ============

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
    expires_at = parse_dt(session["expires_at"])
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Sessie verlopen")
    company = await db.companies.find_one({"company_id": session["company_id"]}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=401, detail="Bedrijf niet gevonden")
    company = await update_subscription_status(company)
    if company["subscription_status"] == "deactivated":
        raise HTTPException(status_code=403, detail="Uw abonnement is gedeactiveerd. Neem contact op met de beheerder.")
    return company

async def get_superadmin(request: Request):
    session_token = request.cookies.get("sa_session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    if not session_token:
        raise HTTPException(status_code=401, detail="Niet ingelogd als super admin")
    session = await db.superadmin_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Super admin sessie ongeldig")
    expires_at = parse_dt(session["expires_at"])
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Sessie verlopen")
    return True

# ============ SUPER ADMIN AUTH ============

@api_router.post("/superadmin/login")
async def superadmin_login(data: SuperAdminLogin, response: Response):
    if data.email != SUPERADMIN_EMAIL or data.password != SUPERADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Ongeldig e-mailadres of wachtwoord")
    session_token = secrets.token_hex(32)
    await db.superadmin_sessions.insert_one({
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    response.set_cookie(
        key="sa_session_token", value=session_token,
        httponly=True, secure=True, samesite="none",
        path="/", max_age=7*24*60*60
    )
    return {"email": SUPERADMIN_EMAIL, "role": "superadmin"}

@api_router.get("/superadmin/me")
async def superadmin_me(request: Request):
    await get_superadmin(request)
    return {"email": SUPERADMIN_EMAIL, "role": "superadmin"}

@api_router.post("/superadmin/logout")
async def superadmin_logout(request: Request, response: Response):
    token = request.cookies.get("sa_session_token")
    if token:
        await db.superadmin_sessions.delete_many({"session_token": token})
    response.delete_cookie(key="sa_session_token", path="/", secure=True, samesite="none")
    return {"message": "Uitgelogd"}

# ============ SUPER ADMIN: COMPANIES ============

@api_router.get("/superadmin/companies")
async def sa_list_companies(request: Request):
    await get_superadmin(request)
    companies = await db.companies.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    for c in companies:
        await update_subscription_status(c)
    return companies

@api_router.get("/superadmin/companies/{company_id}")
async def sa_get_company(company_id: str, request: Request):
    await get_superadmin(request)
    company = await db.companies.find_one({"company_id": company_id}, {"_id": 0, "password_hash": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    company = await update_subscription_status(company)
    apt_count = await db.apartments.count_documents({"company_id": company_id})
    tenant_count = await db.tenants.count_documents({"company_id": company_id, "status": "active"})
    payment_count = await db.payments.count_documents({"company_id": company_id})
    company["apartment_count"] = apt_count
    company["tenant_count"] = tenant_count
    company["payment_count"] = payment_count
    return company

@api_router.put("/superadmin/companies/{company_id}/activate")
async def sa_activate_company(company_id: str, request: Request):
    await get_superadmin(request)
    now = datetime.now(timezone.utc)
    await db.companies.update_one(
        {"company_id": company_id},
        {"$set": {"subscription_status": "active", "subscription_end": (now + timedelta(days=30)).isoformat()}}
    )
    return {"message": "Bedrijf geactiveerd voor 30 dagen"}

@api_router.put("/superadmin/companies/{company_id}/deactivate")
async def sa_deactivate_company(company_id: str, request: Request):
    await get_superadmin(request)
    await db.companies.update_one(
        {"company_id": company_id},
        {"$set": {"subscription_status": "deactivated"}}
    )
    return {"message": "Bedrijf gedeactiveerd"}

@api_router.put("/superadmin/companies/{company_id}/free-subscription")
async def sa_free_subscription(company_id: str, request: Request):
    await get_superadmin(request)
    await db.companies.update_one(
        {"company_id": company_id},
        {"$set": {"subscription_status": "free", "is_free": True}}
    )
    return {"message": "Gratis abonnement toegekend (geen vervaldatum)"}

@api_router.delete("/superadmin/companies/{company_id}")
async def sa_delete_company(company_id: str, request: Request):
    await get_superadmin(request)
    company = await db.companies.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    await db.companies.delete_one({"company_id": company_id})
    await db.company_sessions.delete_many({"company_id": company_id})
    await db.apartments.delete_many({"company_id": company_id})
    await db.tenants.delete_many({"company_id": company_id})
    await db.payments.delete_many({"company_id": company_id})
    await db.breakers.delete_many({"company_id": company_id})
    await db.invoices.delete_many({"company_id": company_id})
    return {"message": "Bedrijf en alle bijbehorende data verwijderd"}

# ============ SUPER ADMIN: INVOICES ============

@api_router.get("/superadmin/invoices")
async def sa_list_invoices(request: Request, status: Optional[str] = None):
    await get_superadmin(request)
    query = {}
    if status:
        query["status"] = status
    return await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)

@api_router.post("/superadmin/invoices/generate/{company_id}")
async def sa_generate_invoice(company_id: str, request: Request):
    await get_superadmin(request)
    company = await db.companies.find_one({"company_id": company_id}, {"_id": 0, "password_hash": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    now = datetime.now(timezone.utc)
    inv_count = await db.invoices.count_documents({})
    invoice_number = f"FAC-{now.strftime('%Y')}-{str(inv_count + 1).zfill(4)}"
    invoice = {
        "invoice_id": f"inv_{uuid.uuid4().hex[:8]}",
        "invoice_number": invoice_number,
        "company_id": company_id,
        "company_name": company["name"],
        "company_email": company.get("email", ""),
        "amount": SUBSCRIPTION_PRICE,
        "description": "Maandabonnement Appartement Kiosk",
        "period_start": now.isoformat(),
        "period_end": (now + timedelta(days=30)).isoformat(),
        "status": "pending",
        "paid_amount": 0,
        "paid_at": None,
        "bank_name": BANK_NAME,
        "bank_account": BANK_ACCOUNT,
        "bank_reference": BANK_REFERENCE,
        "created_at": now.isoformat()
    }
    await db.invoices.insert_one(invoice)
    return await db.invoices.find_one({"invoice_id": invoice["invoice_id"]}, {"_id": 0})

@api_router.post("/superadmin/invoices/{invoice_id}/register-payment")
async def sa_register_payment(invoice_id: str, data: RegisterPayment, request: Request):
    await get_superadmin(request)
    invoice = await db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    if invoice["status"] == "paid":
        raise HTTPException(status_code=400, detail="Factuur is al betaald")
    now = datetime.now(timezone.utc)
    await db.invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"status": "paid", "paid_amount": data.paid_amount, "paid_at": now.isoformat()}}
    )
    sub_end = (now + timedelta(days=30)).isoformat()
    await db.companies.update_one(
        {"company_id": invoice["company_id"]},
        {"$set": {"subscription_status": "active", "subscription_end": sub_end}}
    )
    return {"message": f"Betaling geregistreerd. Abonnement actief tot {sub_end[:10]}"}

@api_router.delete("/superadmin/invoices/{invoice_id}")
async def sa_delete_invoice(invoice_id: str, request: Request):
    await get_superadmin(request)
    result = await db.invoices.delete_one({"invoice_id": invoice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    return {"message": "Factuur verwijderd"}

@api_router.get("/superadmin/stats")
async def sa_stats(request: Request):
    await get_superadmin(request)
    total = await db.companies.count_documents({})
    trial = await db.companies.count_documents({"subscription_status": "trial"})
    active = await db.companies.count_documents({"subscription_status": "active"})
    free = await db.companies.count_documents({"subscription_status": "free"})
    expired = await db.companies.count_documents({"subscription_status": "expired"})
    deactivated = await db.companies.count_documents({"subscription_status": "deactivated"})
    total_invoices = await db.invoices.count_documents({})
    paid_invoices = await db.invoices.count_documents({"status": "paid"})
    pending_invoices = await db.invoices.count_documents({"status": "pending"})
    total_proofs = await db.payment_proofs.count_documents({})
    pipeline = [{"$match": {"status": "paid"}}, {"$group": {"_id": None, "total": {"$sum": "$paid_amount"}}}]
    rev = await db.invoices.aggregate(pipeline).to_list(1)
    total_revenue = rev[0]["total"] if rev else 0
    return {
        "total_companies": total,
        "trial_companies": trial,
        "active_companies": active,
        "free_companies": free,
        "expired_companies": expired,
        "deactivated_companies": deactivated,
        "total_invoices": total_invoices,
        "paid_invoices": paid_invoices,
        "pending_invoices": pending_invoices,
        "total_proofs": total_proofs,
        "total_revenue": total_revenue,
        "subscription_price": SUBSCRIPTION_PRICE,
        "bank_name": BANK_NAME,
        "bank_account": BANK_ACCOUNT,
        "bank_reference": BANK_REFERENCE,
    }

@api_router.get("/superadmin/payment-proofs")
async def sa_list_proofs(request: Request):
    await get_superadmin(request)
    return await db.payment_proofs.find({}, {"_id": 0, "file_data": 0}).sort("created_at", -1).to_list(200)

@api_router.get("/superadmin/payment-proofs/{proof_id}/file")
async def sa_get_proof_file(proof_id: str, request: Request):
    await get_superadmin(request)
    proof = await db.payment_proofs.find_one({"proof_id": proof_id}, {"_id": 0})
    if not proof:
        raise HTTPException(status_code=404, detail="Bewijs niet gevonden")
    from fastapi.responses import Response as RawResponse
    file_data = base64.b64decode(proof["file_data"])
    return RawResponse(content=file_data, media_type=proof.get("content_type", "application/octet-stream"))

# ============ COMPANY AUTH ROUTES ============

@api_router.post("/companies/register")
async def register_company(data: CompanyRegister, response: Response):
    existing = await db.companies.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="E-mailadres is al geregistreerd")
    now = datetime.now(timezone.utc)
    company_id = f"comp_{uuid.uuid4().hex[:8]}"
    await db.companies.insert_one({
        "company_id": company_id,
        "name": data.name,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "address": data.address,
        "phone": data.phone,
        "subscription_status": "trial",
        "trial_end": (now + timedelta(days=TRIAL_DAYS)).isoformat(),
        "subscription_end": None,
        "is_free": False,
        "created_at": now.isoformat()
    })
    session_token = secrets.token_hex(32)
    await db.company_sessions.insert_one({
        "company_id": company_id,
        "session_token": session_token,
        "expires_at": (now + timedelta(days=7)).isoformat(),
        "created_at": now.isoformat()
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

# ============ SUBSCRIPTION ROUTES (company, protected) ============

@api_router.get("/subscription/status")
async def subscription_status(request: Request):
    company = await db.companies.find_one(
        {"company_id": (await get_current_company(request))["company_id"]},
        {"_id": 0, "password_hash": 0}
    )
    proofs = await db.payment_proofs.find(
        {"company_id": company["company_id"]},
        {"_id": 0, "file_data": 0}
    ).sort("created_at", -1).to_list(20)
    return {
        **company,
        "subscription_price": SUBSCRIPTION_PRICE,
        "bank_name": BANK_NAME,
        "bank_account": BANK_ACCOUNT,
        "bank_reference": BANK_REFERENCE,
        "payment_proofs": proofs,
    }

@api_router.post("/subscription/upload-proof")
async def upload_payment_proof(request: Request, file: UploadFile = File(...)):
    company = await db.companies.find_one(
        {"company_id": (await get_current_company(request))["company_id"]},
        {"_id": 0}
    )
    cid = company["company_id"]
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Bestand te groot (max 10MB)")
    now = datetime.now(timezone.utc)
    proof_id = f"proof_{uuid.uuid4().hex[:8]}"
    await db.payment_proofs.insert_one({
        "proof_id": proof_id,
        "company_id": cid,
        "company_name": company["name"],
        "filename": file.filename,
        "content_type": file.content_type,
        "file_data": base64.b64encode(content).decode(),
        "amount": SUBSCRIPTION_PRICE,
        "status": "approved",
        "created_at": now.isoformat()
    })
    inv_count = await db.invoices.count_documents({})
    invoice_number = f"FAC-{now.strftime('%Y')}-{str(inv_count + 1).zfill(4)}"
    await db.invoices.insert_one({
        "invoice_id": f"inv_{uuid.uuid4().hex[:8]}",
        "invoice_number": invoice_number,
        "company_id": cid,
        "company_name": company["name"],
        "company_email": company.get("email", ""),
        "amount": SUBSCRIPTION_PRICE,
        "description": "Maandabonnement Appartement Kiosk",
        "period_start": now.isoformat(),
        "period_end": (now + timedelta(days=30)).isoformat(),
        "status": "paid",
        "paid_amount": SUBSCRIPTION_PRICE,
        "paid_at": now.isoformat(),
        "proof_id": proof_id,
        "bank_name": BANK_NAME,
        "bank_account": BANK_ACCOUNT,
        "bank_reference": BANK_REFERENCE,
        "created_at": now.isoformat()
    })
    sub_end = (now + timedelta(days=30)).isoformat()
    await db.companies.update_one(
        {"company_id": cid},
        {"$set": {"subscription_status": "active", "subscription_end": sub_end}}
    )
    return {"message": "Betaling ontvangen. Abonnement geactiveerd voor 30 dagen.", "subscription_end": sub_end}

# ============ APARTMENT ROUTES (admin, protected) ============

@api_router.get("/company/settings")
async def get_company_settings(request: Request):
    company = await get_current_company(request)
    return {
        "billing_day_of_month": company.get("billing_day_of_month", 1),
        "late_fee_amount": company.get("late_fee_amount", 0),
        "stamp_company_name": company.get("stamp_company_name", ""),
        "stamp_address": company.get("stamp_address", ""),
        "stamp_phone": company.get("stamp_phone", ""),
        "stamp_whatsapp": company.get("stamp_whatsapp", ""),
    }

@api_router.put("/company/settings")
async def update_company_settings(data: CompanySettingsUpdate, request: Request):
    company = await get_current_company(request)
    update_data = {}
    if data.billing_day_of_month is not None:
        if data.billing_day_of_month < 1 or data.billing_day_of_month > 28:
            raise HTTPException(status_code=400, detail="Factureringsdag moet tussen 1 en 28 liggen")
        update_data["billing_day_of_month"] = data.billing_day_of_month
    if data.late_fee_amount is not None:
        if data.late_fee_amount < 0:
            raise HTTPException(status_code=400, detail="Boetebedrag kan niet negatief zijn")
        update_data["late_fee_amount"] = data.late_fee_amount
    if data.stamp_company_name is not None:
        update_data["stamp_company_name"] = data.stamp_company_name
    if data.stamp_address is not None:
        update_data["stamp_address"] = data.stamp_address
    if data.stamp_phone is not None:
        update_data["stamp_phone"] = data.stamp_phone
    if data.stamp_whatsapp is not None:
        update_data["stamp_whatsapp"] = data.stamp_whatsapp
    if update_data:
        await db.companies.update_one(
            {"company_id": company["company_id"]},
            {"$set": update_data}
        )
    return {"message": "Instellingen bijgewerkt"}

@api_router.get("/kiosk/{company_id}/company/stamp")
async def kiosk_get_company_stamp(company_id: str):
    await check_company_subscription(company_id)
    company = await db.companies.find_one({"company_id": company_id}, {"_id": 0})
    return {
        "stamp_company_name": company.get("stamp_company_name", ""),
        "stamp_address": company.get("stamp_address", ""),
        "stamp_phone": company.get("stamp_phone", ""),
        "stamp_whatsapp": company.get("stamp_whatsapp", ""),
    }

@api_router.post("/company/apply-late-fees")
async def apply_late_fees(request: Request):
    company = await get_current_company(request)
    cid = company["company_id"]
    billing_day = company.get("billing_day_of_month", 1)
    late_fee = company.get("late_fee_amount", 0)
    if late_fee <= 0:
        return {"message": "Geen boetebedrag ingesteld", "applied": 0}
    now = datetime.now(timezone.utc)
    if now.day <= billing_day:
        return {"message": "Vervaldatum nog niet bereikt", "applied": 0}
    current_month = now.strftime("%Y-%m")
    tenants = await db.tenants.find({"company_id": cid, "status": "active"}, {"_id": 0}).to_list(1000)
    applied = 0
    for t in tenants:
        if (t.get("outstanding_rent", 0) or 0) > 0:
            already = await db.payments.find_one({
                "company_id": cid, "tenant_id": t["tenant_id"],
                "payment_type": "late_fee", "rent_month": current_month
            })
            if not already:
                current_fines = t.get("fines", 0) or 0
                await db.tenants.update_one(
                    {"tenant_id": t["tenant_id"]},
                    {"$set": {"fines": current_fines + late_fee}}
                )
                await db.payments.insert_one({
                    "payment_id": f"fee_{uuid.uuid4().hex[:8]}",
                    "company_id": cid,
                    "company_name": company.get("name", ""),
                    "tenant_id": t["tenant_id"],
                    "tenant_name": t["name"],
                    "tenant_code": t["tenant_code"],
                    "apartment_number": t["apartment_number"],
                    "apartment_id": t["apartment_id"],
                    "amount": late_fee,
                    "payment_type": "late_fee",
                    "payment_method": "system",
                    "description": f"Automatische boete - huur niet betaald voor dag {billing_day}",
                    "rent_month": current_month,
                    "kwitantie_nummer": f"BOETE-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}",
                    "receipt_number": f"BOETE-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}",
                    "created_at": now.isoformat()
                })
                applied += 1
    return {"message": f"Boetes toegepast op {applied} huurder(s)", "applied": applied}

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
    now = datetime.now(timezone.utc)
    rent_month = data.rent_month
    if not rent_month and data.payment_type in ["rent", "partial_rent"]:
        rent_month = now.strftime("%Y-%m")
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
        "rent_month": rent_month,
        "kwitantie_nummer": kwitantie_nr,
        "receipt_number": kwitantie_nr,
        "created_at": now.isoformat()
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
async def list_payments(request: Request, tenant_id: Optional[str] = None, month: Optional[str] = None, limit: int = 100):
    company = await get_current_company(request)
    query = {"company_id": company["company_id"]}
    if tenant_id:
        query["tenant_id"] = tenant_id
    if month:
        query["created_at"] = {"$regex": f"^{month}"}
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
        "recent_payments": recent_payments,
        "subscription_status": company.get("subscription_status", "trial"),
        "trial_end": company.get("trial_end"),
        "subscription_end": company.get("subscription_end"),
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
    company = await check_company_subscription(company_id)
    return {k: v for k, v in company.items() if k not in ("password_hash",)}

@api_router.get("/kiosk/{company_id}/apartments")
async def kiosk_list_apartments(company_id: str):
    await check_company_subscription(company_id)
    return await db.apartments.find({"company_id": company_id}, {"_id": 0}).to_list(1000)

@api_router.get("/kiosk/{company_id}/tenants")
async def kiosk_list_tenants(company_id: str):
    await check_company_subscription(company_id)
    return await db.tenants.find({"company_id": company_id}, {"_id": 0}).to_list(1000)

@api_router.get("/kiosk/{company_id}/tenants/lookup/{query}")
async def kiosk_lookup_tenant(company_id: str, query: str):
    await check_company_subscription(company_id)
    tenant = await db.tenants.find_one(
        {"company_id": company_id, "$or": [{"tenant_code": query.upper()}, {"apartment_number": query.upper()}]},
        {"_id": 0}
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    return tenant

@api_router.post("/kiosk/{company_id}/payments")
async def kiosk_create_payment(company_id: str, data: PaymentCreate):
    company = await check_company_subscription(company_id)
    tenant = await db.tenants.find_one({"tenant_id": data.tenant_id, "company_id": company_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    return await _process_payment(tenant, data, company_id, company.get("name", ""))

# ============ SEED DATA ============

@app.on_event("startup")
async def seed_data():
    demo = await db.companies.find_one({"company_id": "comp_demo"})
    if demo:
        if "subscription_status" not in demo:
            now = datetime.now(timezone.utc)
            await db.companies.update_one(
                {"company_id": "comp_demo"},
                {"$set": {
                    "subscription_status": "active",
                    "trial_end": now.isoformat(),
                    "subscription_end": (now + timedelta(days=30)).isoformat(),
                    "is_free": False,
                }}
            )
            logger.info("Updated comp_demo with subscription fields")
        return
    logger.info("Seeding multi-tenant demo data...")
    await db.apartments.delete_many({"company_id": {"$exists": False}})
    await db.tenants.delete_many({"company_id": {"$exists": False}})
    await db.payments.delete_many({"company_id": {"$exists": False}})
    await db.breakers.delete_many({"company_id": {"$exists": False}})
    now = datetime.now(timezone.utc)
    cid = "comp_demo"
    await db.companies.insert_one({
        "company_id": cid,
        "name": "Demo Vastgoed BV",
        "email": "demo@vastgoed.sr",
        "password_hash": hash_password("demo123"),
        "address": "Kernkampweg 15, Paramaribo",
        "phone": "+597 400-000",
        "subscription_status": "active",
        "trial_end": now.isoformat(),
        "subscription_end": (now + timedelta(days=30)).isoformat(),
        "is_free": False,
        "created_at": now.isoformat()
    })
    apartments = [
        {"apartment_id": "apt_001", "company_id": cid, "number": "A101", "floor": 1, "monthly_rent": 2500, "service_costs": 150, "description": "2-kamer appartement", "status": "occupied", "created_at": now.isoformat()},
        {"apartment_id": "apt_002", "company_id": cid, "number": "A102", "floor": 1, "monthly_rent": 2800, "service_costs": 175, "description": "3-kamer appartement", "status": "occupied", "created_at": now.isoformat()},
        {"apartment_id": "apt_003", "company_id": cid, "number": "A201", "floor": 2, "monthly_rent": 3000, "service_costs": 200, "description": "3-kamer appartement met balkon", "status": "occupied", "created_at": now.isoformat()},
        {"apartment_id": "apt_004", "company_id": cid, "number": "A202", "floor": 2, "monthly_rent": 2200, "service_costs": 125, "description": "Studio appartement", "status": "vacant", "created_at": now.isoformat()},
        {"apartment_id": "apt_005", "company_id": cid, "number": "B101", "floor": 1, "monthly_rent": 3500, "service_costs": 250, "description": "4-kamer appartement", "status": "occupied", "created_at": now.isoformat()},
        {"apartment_id": "apt_006", "company_id": cid, "number": "B102", "floor": 1, "monthly_rent": 2000, "service_costs": 100, "description": "1-kamer studio", "status": "vacant", "created_at": now.isoformat()},
    ]
    await db.apartments.insert_many(apartments)
    tenants = [
        {"tenant_id": "ten_001", "company_id": cid, "tenant_code": "HUR001", "name": "Radjesh Kanhai", "apartment_id": "apt_001", "apartment_number": "A101", "phone": "+597 8123456", "email": "radjesh@email.com", "monthly_rent": 2500, "outstanding_rent": 5000, "service_costs": 300, "fines": 0, "deposit_required": 5000, "deposit_paid": 5000, "status": "active", "created_at": now.isoformat()},
        {"tenant_id": "ten_002", "company_id": cid, "tenant_code": "HUR002", "name": "Maria Janssen", "apartment_id": "apt_002", "apartment_number": "A102", "phone": "+597 8234567", "email": "maria@email.com", "monthly_rent": 2800, "outstanding_rent": 2800, "service_costs": 175, "fines": 500, "deposit_required": 5600, "deposit_paid": 5600, "status": "active", "created_at": now.isoformat()},
        {"tenant_id": "ten_003", "company_id": cid, "tenant_code": "HUR003", "name": "Andre Pengel", "apartment_id": "apt_003", "apartment_number": "A201", "phone": "+597 8345678", "email": "andre@email.com", "monthly_rent": 3000, "outstanding_rent": 9000, "service_costs": 600, "fines": 250, "deposit_required": 6000, "deposit_paid": 3000, "status": "active", "created_at": now.isoformat()},
        {"tenant_id": "ten_004", "company_id": cid, "tenant_code": "HUR004", "name": "Shanti Ramsodit", "apartment_id": "apt_005", "apartment_number": "B101", "phone": "+597 8456789", "email": "shanti@email.com", "monthly_rent": 3500, "outstanding_rent": 3500, "service_costs": 250, "fines": 0, "deposit_required": 7000, "deposit_paid": 7000, "status": "active", "created_at": now.isoformat()},
    ]
    await db.tenants.insert_many(tenants)
    breakers = [
        {"breaker_id": "brk_001", "company_id": cid, "apartment_number": "A101", "name": "Hoofdstroom A101", "status": "on", "last_toggled": now.isoformat()},
        {"breaker_id": "brk_002", "company_id": cid, "apartment_number": "A102", "name": "Hoofdstroom A102", "status": "on", "last_toggled": now.isoformat()},
        {"breaker_id": "brk_003", "company_id": cid, "apartment_number": "A201", "name": "Hoofdstroom A201", "status": "on", "last_toggled": now.isoformat()},
        {"breaker_id": "brk_004", "company_id": cid, "apartment_number": "A202", "name": "Hoofdstroom A202", "status": "off", "last_toggled": now.isoformat()},
        {"breaker_id": "brk_005", "company_id": cid, "apartment_number": "B101", "name": "Hoofdstroom B101", "status": "on", "last_toggled": now.isoformat()},
        {"breaker_id": "brk_006", "company_id": cid, "apartment_number": "B102", "name": "Hoofdstroom B102", "status": "off", "last_toggled": now.isoformat()},
    ]
    await db.breakers.insert_many(breakers)
    logger.info("Multi-tenant demo data seeded! Login: demo@vastgoed.sr / demo123")

@app.on_event("startup")
async def check_expired_subscriptions():
    companies = await db.companies.find(
        {"subscription_status": {"$in": ["trial", "active", "expired"]}},
        {"_id": 0}
    ).to_list(1000)
    for c in companies:
        await update_subscription_status(c)
    logger.info(f"Subscription check complete for {len(companies)} companies")

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
