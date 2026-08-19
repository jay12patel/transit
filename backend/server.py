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

async def admin_user(user=Depends(current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return user

class Register(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = ""

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
    size: str
    rate_per_km: float = 0
    minimum_fare: float = 0
    status: str = "Available"
    photo: str = ""

class DriverIn(BaseModel):
    name: str
    mobile: str
    licence: str = ""
    assigned_vehicle: str = ""
    status: str = "Available"

class BookingIn(BaseModel):
    customer_name: str
    mobile: str
    email: EmailStr
    company_name: str = ""
    vehicle_type: str
    vehicle_id: str = ""
    pickup_date: str
    pickup_time: str
    pickup_address: str
    pickup_city: str
    delivery_address: str
    delivery_city: str
    approximate_km: float = 0
    goods_type: str = ""
    weight: str = ""
    instructions: str = ""
    trip_type: str = "One Way"
    payment_method: str = "Pay Later"
    loading_charge: float = 0
    waiting_charge: float = 0
    other_charges: float = 0
    gst: float = 0
    estimated_total: float = 0

class StatusIn(BaseModel):
    status: str

class AssignmentIn(BaseModel):
    vehicle_id: str = ""
    driver_id: str = ""

async def seed_data():
    await db.users.create_index("email", unique=True)
    await db.bookings.create_index([("vehicle_id", 1), ("pickup_date", 1), ("pickup_time", 1)])
    
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "TransitRoute Admin",
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "role": "admin",
            "created_at": now()
        })
        
    if await db.users.count_documents({"role": "customer"}) == 0:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Demo Customer",
            "email": "customer@example.com",
            "password_hash": hash_password("Customer@2026!"),
            "role": "customer",
            "phone": "9876543210",
            "created_at": now()
        })
        
    if await db.vehicles.count_documents({}) == 0:
        seeds = [
            ("Tata Ace / Tenkor", "TR-01-AC-2046", "750 kg", "7 × 4 ft", 18, 900, "Available"),
            ("Loading Tempo", "TR-02-LT-1188", "1.5 ton", "10 × 5 ft", 24, 1400, "Available"),
            ("Loading Truck", "TR-03-LK-9302", "5 ton", "17 × 7 ft", 32, 2800, "On Trip"),
            ("20 FT Container", "TR-04-CN-2020", "15 ton", "20 × 8 ft", 48, 5200, "Available"),
            ("30 FT Container", "TR-05-CN-3030", "20 ton", "30 × 8 ft", 58, 6800, "Maintenance"),
            ("Refrigerated Van", "TR-06-RV-7711", "2 ton", "14 × 6 ft", 38, 3200, "Available")
        ]
        await db.vehicles.insert_many([
            {
                "id": str(uuid.uuid4()),
                "vehicle_type": a,
                "vehicle_number": b,
                "capacity": c,
                "size": d,
                "rate_per_km": e,
                "minimum_fare": f,
                "status": g,
                "photo": "",
                "created_at": now()
            } for a, b, c, d, e, f, g in seeds
        ])

@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_data()
    yield
    client.close()

app = FastAPI(title="TransitRoute Fleet API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")

@api.get("/")
async def root():
    return {"message": "TransitRoute Fleet API"}

@api.post("/auth/register")
async def register(data: Register, response: Response):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "An account with this email already exists")
    user = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "email": email,
        "phone": data.phone,
        "password_hash": hash_password(data.password),
        "role": "customer",
        "created_at": now()
    }
    await db.users.insert_one(user)
    t = token(user)
    # _id અને password_hash બંને દૂર કરો જેથી JSON એરર ન આવે
    public = {k: v for k, v in user.items() if k not in ["_id", "password_hash"]}
    public["token"] = t
    response.set_cookie(key="access_token", value=t, httponly=False, samesite="lax", secure=False, path="/", max_age=86400)
    return public
@api.post("/auth/login")
async def login(data: Login, response: Response):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Email or password is incorrect")
        
    t = token(user)
    public = {k: v for k, v in clean(user).items() if k != "password_hash"}
    public["token"] = t
    response.set_cookie(key="access_token", value=t, httponly=False, samesite="lax", secure=False, path="/", max_age=86400)
    return public

@api.post("/auth/change-password")
async def change_password(data: PasswordChangeIn, user=Depends(current_user)):
    db_user = await db.users.find_one({"id": user["id"]})
    if not db_user or not verify_password(data.old_password, db_user["password_hash"]):
        raise HTTPException(400, "Old password is incorrect")
    
    new_hash = hash_password(data.new_password)
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": new_hash}})
    return {"ok": True, "message": "Password changed successfully"}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return user

@api.get("/customer/bookings")
async def customer_bookings(user=Depends(current_user)):
    # Fetch all bookings matching customer email
    return await db.bookings.find({"email": user["email"].lower()}, {"_id": 0}).sort("created_at", -1).to_list(100)

@api.get("/vehicles")
async def vehicles():
    return await db.vehicles.find({}, {"_id": 0}).sort("vehicle_type", 1).to_list(100)

@api.post("/vehicles")
async def add_vehicle(data: VehicleIn, user=Depends(admin_user)):
    doc = data.model_dump()
    doc.update({"id": str(uuid.uuid4()), "created_at": now()})
    await db.vehicles.insert_one(doc)
    return clean(doc)

@api.put("/vehicles/{vehicle_id}")
async def edit_vehicle(vehicle_id: str, data: VehicleIn, user=Depends(admin_user)):
    await db.vehicles.update_one({"id": vehicle_id}, {"$set": data.model_dump()})
    return clean(await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0}))

@api.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, user=Depends(admin_user)):
    await db.vehicles.delete_one({"id": vehicle_id})
    return {"ok": True}

@api.get("/drivers")
async def drivers(user=Depends(admin_user)):
    return await db.drivers.find({}, {"_id": 0}).to_list(100)

@api.post("/drivers")
async def add_driver(data: DriverIn, user=Depends(admin_user)):
    doc = data.model_dump()
    doc.update({"id": str(uuid.uuid4()), "created_at": now()})
    await db.drivers.insert_one(doc)
    return clean(doc)

@api.get("/availability")
async def availability(date: str, vehicle_type: str = ""):
    query = {"status": {"$in": ["Available", "Booked", "On Trip"]}}
    if vehicle_type:
        query["vehicle_type"] = vehicle_type
    items = await db.vehicles.find(query, {"_id": 0}).to_list(100)
    busy = await db.bookings.find(
        {"pickup_date": date, "status": {"$in": ["Pending Confirmation", "Confirmed", "Running"]}},
        {"_id": 0, "vehicle_id": 1}
    ).to_list(100)
    busy_ids = {x.get("vehicle_id") for x in busy}
    return [{**v, "availability": "Booked" if v["id"] in busy_ids else v.get("status", "Available")} for v in items]

async def create_notification(title, body, kind="booking"):
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "title": title,
        "body": body,
        "kind": kind,
        "read": False,
        "created_at": now(),
        "delivery": "in-app",
        "email_status": "MOCKED"
    })

@api.post("/bookings")
async def create_booking(data: BookingIn):
    async with LOCK:
        if data.vehicle_id:
            clash = await db.bookings.find_one({
                "vehicle_id": data.vehicle_id,
                "pickup_date": data.pickup_date,
                "status": {"$in": ["Pending Confirmation", "Confirmed", "Running"]}
            })
            if clash:
                raise HTTPException(409, "That vehicle is no longer available for this date")
        count = await db.bookings.count_documents({}) + 1
        bid = f"TRN-{datetime.now().year}-{count:05d}"
        doc = data.model_dump()
        doc.update({"id": str(uuid.uuid4()), "booking_id": bid, "email": data.email.lower(), "status": "Pending Confirmation", "payment_status": "Unpaid", "created_at": now()})
        await db.bookings.insert_one(doc)
        await create_notification("New booking received", f"{bid} from {data.customer_name} · {data.vehicle_type}")
        return clean(doc)

@api.get("/bookings/lookup/{booking_id}")
async def lookup(booking_id: str):
    doc = await db.bookings.find_one({"booking_id": booking_id.strip().upper()}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Booking ID not found")
    return doc

@api.get("/bookings")
async def all_bookings(user=Depends(admin_user)):
    return await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.patch("/bookings/{booking_id}/status")
async def booking_status(booking_id: str, data: StatusIn, user=Depends(admin_user)):
    result = await db.bookings.update_one({"booking_id": booking_id}, {"$set": {"status": data.status, "updated_at": now()}})
    if not result.matched_count:
        raise HTTPException(404, "Booking not found")
    await create_notification(f"Booking {data.status.lower()}", f"{booking_id} is now {data.status}")
    return await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})

@api.patch("/bookings/{booking_id}/assignment")
async def assignment(booking_id: str, data: AssignmentIn, user=Depends(admin_user)):
    await db.bookings.update_one({"booking_id": booking_id}, {"$set": {"vehicle_id": data.vehicle_id, "driver_id": data.driver_id, "status": "Confirmed", "updated_at": now()}})
    return await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})

@api.get("/dashboard")
async def dashboard(user=Depends(admin_user)):
    bookings = await db.bookings.find({}, {"_id": 0}).to_list(500)
    vehicles = await db.vehicles.find({}, {"_id": 0}).to_list(100)
    def n(status):
        return sum(1 for b in bookings if b.get("status") == status)
    return {
        "today": sum(1 for b in bookings if b.get("pickup_date") == datetime.now().date().isoformat()),
        "pending": n("Pending Confirmation"),
        "confirmed": n("Confirmed"),
        "running": n("Running"),
        "completed": n("Completed"),
        "cancelled": n("Cancelled"),
        "available_vehicles": sum(1 for v in vehicles if v.get("status") == "Available"),
        "booked_vehicles": sum(1 for v in vehicles if v.get("status") in ["Booked", "On Trip"]),
        "revenue": sum(float(b.get("estimated_total", 0)) for b in bookings if b.get("status") == "Completed")
    }

@api.get("/notifications")
async def notifications(user=Depends(admin_user)):
    return await db.notifications.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)

app.include_router(api)