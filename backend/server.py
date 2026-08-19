from dotenv import load_dotenv
from pathlib import Path
import os

load_dotenv(Path(__file__).parent / ".env")
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from contextlib import asynccontextmanager
import uuid, logging, bcrypt, jwt, asyncio

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "transitroute")
JWT_SECRET = os.environ.get("JWT_SECRET", "super_secret_jwt_transitroute_2026_secure_key_32bytes")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@transitroute.in")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Transit@2026!")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
logging.basicConfig(level=logging.INFO)

def now():
    return datetime.now(timezone.utc).isoformat()

def hash_password(value: str) -> str:
    return bcrypt.hashpw(value.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(value: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(value.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def generate_token(user: dict) -> str:
    payload = {
        "sub": str(user["id"]),
        "role": str(user.get("role", "customer")),
        "mobile": str(user.get("phone", "")),
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 30
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def clean(doc):
    if not doc:
        return None
    doc.pop("_id", None)
    return doc

async def current_user(request: Request):
    raw = request.cookies.get("access_token")
    if not raw:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            raw = auth_header.replace("Bearer ", "").strip()
            
    if not raw:
        raise HTTPException(401, "Please sign in to continue")
    try:
        payload = jwt.decode(raw, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except Exception:
        raise HTTPException(401, "Invalid or expired session")

async def admin_only(user=Depends(current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return user

async def transporter_or_admin(user=Depends(current_user)):
    if user.get("role") not in ["transporter", "admin"]:
        raise HTTPException(403, "Transporter access required")
    return user

class AuthPayload(BaseModel):
    phone: str
    password: str
    name: Optional[str] = ""
    email: Optional[str] = ""
    role: Optional[str] = "customer"
    company_name: Optional[str] = ""

class VehicleIn(BaseModel):
    vehicle_type: str
    vehicle_number: Optional[str] = ""
    capacity: str
    size: Optional[str] = ""
    rate_per_km: float = 0
    minimum_fare: float = 0
    operating_city: Optional[str] = "All Gujarat"
    status: Optional[str] = "Available"

class BookingIn(BaseModel):
    customer_name: Optional[str] = ""
    mobile: Optional[str] = ""
    vehicle_type: Optional[str] = ""
    vehicle_id: Optional[str] = ""
    pickup_date: Optional[str] = ""
    pickup_time: Optional[str] = "09:00"
    pickup_city: Optional[str] = ""
    delivery_city: Optional[str] = ""
    approximate_km: Optional[float] = 0
    goods_type: Optional[str] = ""
    estimated_total: Optional[float] = 0

class PaymentApproveIn(BaseModel):
    payment_status: str # "Approved" / "Rejected"
    booking_status: Optional[str] = "Confirmed"

async def seed_data():
    try:
        await db.users.create_index("phone", unique=True)
        existing = await db.users.find_one({"role": "admin"})
        if not existing:
            await db.users.insert_one({
                "id": str(uuid.uuid4()),
                "name": "Super Admin (Owner)",
                "phone": "9725506630",
                "email": ADMIN_EMAIL.lower(),
                "password_hash": hash_password(ADMIN_PASSWORD),
                "role": "admin",
                "company_name": "Platform Management",
                "created_at": now()
            })
    except Exception as e:
        logging.error(f"Seed Error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_data()
    yield
    client.close()

app = FastAPI(title="Logistics Platform API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")

@api.get("/")
@app.get("/")
async def root():
    return {"status": "ok", "message": "Sachin Logistics API is Online"}

@api.post("/auth/register")
async def register(data: AuthPayload):
    phone = data.phone.strip().replace(" ", "").replace("+91", "")
    if len(phone) < 10:
        raise HTTPException(400, "માન્ય ૧૦ આંકડાનો મોબાઇલ નંબર દાખલ કરો")
        
    if await db.users.find_one({"phone": phone}):
        raise HTTPException(400, "આ મોબાઇલ નંબર પર પહેલેથી એકાઉન્ટ છે. Login કરો.")
    
    role = "transporter" if data.role == "transporter" else "customer"
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": data.name.strip() or "User",
        "phone": phone,
        "email": data.email.strip().lower(),
        "company_name": data.company_name.strip(),
        "password_hash": hash_password(data.password),
        "role": role,
        "created_at": now()
    }
    await db.users.insert_one(user_doc)
    t = generate_token(user_doc)
    
    return {
        "id": user_id,
        "name": user_doc["name"],
        "phone": user_doc["phone"],
        "role": user_doc["role"],
        "company_name": user_doc["company_name"],
        "token": t
    }

@api.post("/auth/login")
async def login(data: AuthPayload):
    phone = data.phone.strip().replace(" ", "").replace("+91", "")
    user = await db.users.find_one({"phone": phone})
    if not user:
        raise HTTPException(400, "આ મોબાઇલ નંબર રજિસ્ટર નથી. પહેલાં Register કરો.")
    
    if not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(400, "પાસવર્ડ ખોટો છે.")
        
    t = generate_token(user)
    return {
        "id": user["id"],
        "name": user.get("name", "User"),
        "phone": user.get("phone", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "customer"),
        "company_name": user.get("company_name", ""),
        "token": t
    }

@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return user

@api.get("/vehicles")
async def get_all_vehicles(search_type: Optional[str] = None):
    query = {}
    if search_type and search_type != "All":
        query["vehicle_type"] = {"$regex": search_type, "$options": "i"}
    return await db.vehicles.find(query, {"_id": 0}).sort("vehicle_type", 1).to_list(200)

@api.get("/transporter/vehicles")
async def transporter_vehicles(user=Depends(transporter_or_admin)):
    if user["role"] == "admin":
        return await db.vehicles.find({}, {"_id": 0}).to_list(200)
    return await db.vehicles.find({"transporter_id": user["id"]}, {"_id": 0}).to_list(200)

@api.post("/vehicles")
async def add_vehicle(data: VehicleIn, user=Depends(transporter_or_admin)):
    doc = data.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "transporter_id": user["id"],
        "transporter_name": user.get("company_name") or user.get("name"),
        "transporter_phone": user.get("phone", ""),
        "created_at": now()
    })
    await db.vehicles.insert_one(doc)
    return clean(doc)

@api.post("/bookings")
async def create_booking(data: BookingIn, user=Depends(current_user)):
    target_veh = None
    if data.vehicle_id:
        target_veh = await db.vehicles.find_one({"id": data.vehicle_id})
    
    transporter_id = target_veh.get("transporter_id", "") if target_veh else ""
    transporter_phone = target_veh.get("transporter_phone", "") if target_veh else ""
    transporter_name = target_veh.get("transporter_name", "Fleet Owner") if target_veh else ""
    
    count = await db.bookings.count_documents({}) + 1
    bid = f"TRN-{datetime.now().year}-{count:05d}"
    doc = data.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "booking_id": bid,
        "customer_id": user["id"],
        "customer_name": data.customer_name or user.get("name", "Customer"),
        "customer_phone": data.mobile or user.get("phone", ""),
        "vehicle_type": data.vehicle_type or (target_veh.get("vehicle_type", "") if target_veh else "Commercial Vehicle"),
        "transporter_id": transporter_id,
        "transporter_phone": transporter_phone,
        "transporter_name": transporter_name,
        "payment_status": "Pending Admin Approval",
        "status": "Awaiting Payment Approval",
        "created_at": now()
    })
    await db.bookings.insert_one(doc)
    return clean(doc)

@api.get("/bookings")
async def get_bookings(user=Depends(current_user)):
    if user["role"] == "admin":
        return await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    elif user["role"] == "transporter":
        return await db.bookings.find({"transporter_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    else:
        return await db.bookings.find({"customer_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)

@api.patch("/admin/bookings/{booking_id}/payment")
async def approve_payment(booking_id: str, data: PaymentApproveIn, user=Depends(admin_only)):
    update_data = {"payment_status": data.payment_status, "updated_at": now()}
    if data.payment_status == "Approved":
        update_data["status"] = "Confirmed & Dispatched"
    elif data.payment_status == "Rejected":
        update_data["status"] = "Payment Rejected"
    await db.bookings.update_one({"booking_id": booking_id}, {"$set": update_data})
    return {"ok": True}

@api.patch("/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, status: str, user=Depends(transporter_or_admin)):
    query = {"booking_id": booking_id}
    if user["role"] == "transporter":
        query["transporter_id"] = user["id"]
    await db.bookings.update_one(query, {"$set": {"status": status, "updated_at": now()}})
    return {"ok": True}

@api.get("/admin/dashboard")
async def admin_dashboard(user=Depends(admin_only)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    bookings = await db.bookings.find({}, {"_id": 0}).to_list(500)
    vehicles = await db.vehicles.find({}, {"_id": 0}).to_list(200)
    
    return {
        "total_users": len(users),
        "total_transporters": sum(1 for u in users if u.get("role") == "transporter"),
        "total_customers": sum(1 for u in users if u.get("role") == "customer"),
        "total_bookings": len(bookings),
        "total_vehicles": len(vehicles),
        "users": users,
        "bookings": bookings
    }

app.include_router(api)