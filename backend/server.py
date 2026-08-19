from dotenv import load_dotenv
from pathlib import Path
import os

load_dotenv(Path(__file__).parent / ".env")
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
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
LOCK = asyncio.Lock()
logging.basicConfig(level=logging.INFO)

def now():
    return datetime.now(timezone.utc).isoformat()

def hash_password(value):
    return bcrypt.hashpw(value.encode(), bcrypt.gensalt()).decode()

def verify_password(value, hashed):
    return bcrypt.checkpw(value.encode(), hashed.encode())

def token(user):
    return jwt.encode(
        {"sub": user["id"], "role": user["role"], "exp": datetime.now(timezone.utc).timestamp() + 86400},
        JWT_SECRET,
        algorithm="HS256"
    )

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
            raise HTTPException(401, "Session expired")
        return user
    except Exception:
        raise HTTPException(401, "Session expired")

async def admin_only(user=Depends(current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return user

async def transporter_or_admin(user=Depends(current_user)):
    if user.get("role") not in ["transporter", "admin"]:
        raise HTTPException(403, "Transporter or Admin access required")
    return user

class Register(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = ""
    role: str = "customer"
    company_name: Optional[str] = ""

class Login(BaseModel):
    email: EmailStr
    password: str

class PasswordChangeIn(BaseModel):
    old_password: str
    new_password: str

class VehicleIn(BaseModel):
    vehicle_type: str
    vehicle_number: str = ""
    capacity: str
    size: str = ""
    rate_per_km: float = 0
    minimum_fare: float = 0
    status: str = "Available"

class BookingIn(BaseModel):
    customer_name: Optional[str] = ""
    mobile: Optional[str] = ""
    email: Optional[str] = ""
    company_name: Optional[str] = ""
    vehicle_type: Optional[str] = ""
    vehicle_id: Optional[str] = ""
    pickup_date: Optional[str] = ""
    pickup_time: Optional[str] = "09:00"
    pickup_address: Optional[str] = ""
    pickup_city: Optional[str] = ""
    delivery_address: Optional[str] = ""
    delivery_city: Optional[str] = ""
    approximate_km: Optional[float] = 0
    goods_type: Optional[str] = ""
    weight: Optional[str] = ""
    instructions: Optional[str] = ""
    trip_type: Optional[str] = "One Way"
    payment_method: Optional[str] = "Pay Later"
    loading_charge: Optional[float] = 0
    waiting_charge: Optional[float] = 0
    other_charges: Optional[float] = 0
    gst: Optional[float] = 0
    estimated_total: Optional[float] = 0

class StatusIn(BaseModel):
    status: str

async def seed_data():
    await db.users.create_index("email", unique=True)
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Super Admin (Owner)",
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "role": "admin",
            "phone": "9725506630",
            "company_name": "Sachin Logistics Platform",
            "created_at": now()
        })

@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_data()
    yield
    client.close()

app = FastAPI(title="Logistics Platform API", lifespan=lifespan)

origins = [
    "http://localhost:3000",
    "https://transit-jade.vercel.app",
    "https://transit-ops-jade.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")

@api.get("/")
async def root():
    return {"message": "Logistics Marketplace API is Online"}

@api.post("/auth/register")
async def register(data: Register, response: Response):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "Email already registered")
    
    role = "transporter" if data.role == "transporter" else "customer"
    user = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "email": email,
        "phone": data.phone,
        "company_name": data.company_name,
        "password_hash": hash_password(data.password),
        "role": role,
        "created_at": now()
    }
    await db.users.insert_one(user)
    t = token(user)
    public = {k: v for k, v in user.items() if k not in ["_id", "password_hash"]}
    public["token"] = t
    response.set_cookie(key="access_token", value=t, httponly=True, samesite="none", secure=True, path="/", max_age=86400)
    return public

@api.post("/auth/login")
async def login(data: Login, response: Response):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Email or password is incorrect")
    t = token(user)
    public = {k: v for k, v in clean(user).items() if k != "password_hash"}
    public["token"] = t
    response.set_cookie(key="access_token", value=t, httponly=True, samesite="none", secure=True, path="/", max_age=86400)
    return public

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/", samesite="none", secure=True)
    return {"ok": True}

@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return user

@api.get("/vehicles")
async def get_all_vehicles():
    return await db.vehicles.find({}, {"_id": 0}).sort("vehicle_type", 1).to_list(200)

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
        "created_at": now()
    })
    await db.vehicles.insert_one(doc)
    return clean(doc)

@api.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, user=Depends(transporter_or_admin)):
    query = {"id": vehicle_id} if user["role"] == "admin" else {"id": vehicle_id, "transporter_id": user["id"]}
    await db.vehicles.delete_one(query)
    return {"ok": True}

@api.post("/bookings")
async def create_booking(data: BookingIn, user=Depends(current_user)):
    target_veh = None
    if data.vehicle_id:
        target_veh = await db.vehicles.find_one({"id": data.vehicle_id})
    
    transporter_id = target_veh.get("transporter_id", "") if target_veh else ""
    vehicle_type = data.vehicle_type or (target_veh.get("vehicle_type", "") if target_veh else "Commercial Vehicle")
    
    count = await db.bookings.count_documents({}) + 1
    bid = f"TRN-{datetime.now().year}-{count:05d}"
    doc = data.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "booking_id": bid,
        "customer_id": user["id"],
        "customer_name": data.customer_name or user.get("name", "Customer"),
        "email": user.get("email", data.email or ""),
        "mobile": data.mobile or user.get("phone", ""),
        "vehicle_type": vehicle_type,
        "transporter_id": transporter_id,
        "status": "Pending Confirmation",
        "created_at": now()
    })
    await db.bookings.insert_one(doc)
    return clean(doc)

@api.get("/bookings")
async def get_bookings(user=Depends(current_user)):
    if user["role"] == "admin":
        return await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    elif user["role"] == "transporter":
        return await db.bookings.find({"$or": [{"transporter_id": user["id"]}, {"transporter_id": ""}]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    else:
        return await db.bookings.find({"customer_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)

@api.patch("/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, data: StatusIn, user=Depends(transporter_or_admin)):
    await db.bookings.update_one({"booking_id": booking_id}, {"$set": {"status": data.status, "updated_at": now()}})
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
        "users": users
    }

app.include_router(api)