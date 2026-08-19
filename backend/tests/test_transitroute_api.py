import os
from datetime import date, timedelta
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://vehicle-book-5.preview.emergentagent.com").rstrip("/")


def test_health_and_vehicles():
    root = requests.get(f"{BASE_URL}/api/", timeout=15)
    assert root.status_code == 200 and root.json()["message"]
    vehicles = requests.get(f"{BASE_URL}/api/vehicles", timeout=15)
    assert vehicles.status_code == 200
    data = vehicles.json()
    assert len(data) >= 3 and all("id" in item for item in data)


def test_auth_cookies_and_customer_forbidden():
    customer = requests.Session()
    response = customer.post(f"{BASE_URL}/api/auth/login", json={"email": "customer@example.com", "password": "Customer@2026!"}, timeout=15)
    assert response.status_code == 200 and response.json()["role"] == "customer"
    cookie = response.cookies.get("access_token")
    assert cookie and "HttpOnly" in response.headers.get("set-cookie", "")
    assert customer.get(f"{BASE_URL}/api/auth/me", timeout=15).status_code == 200
    assert customer.get(f"{BASE_URL}/api/dashboard", timeout=15).status_code == 403


def test_admin_dashboard_and_booking_lifecycle():
    admin = requests.Session()
    login = admin.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@transitroute.in", "password": "Transit@2026!"}, timeout=15)
    assert login.status_code == 200 and login.json()["role"] == "admin"
    assert admin.get(f"{BASE_URL}/api/dashboard", timeout=15).status_code == 200

    vehicles = requests.get(f"{BASE_URL}/api/vehicles", timeout=15).json()
    vehicle = next(v for v in vehicles if v["status"] == "Available")
    pickup_date = (date.today() + timedelta(days=120)).isoformat()
    payload = {"customer_name": "TEST API Customer", "mobile": "9999999999", "email": "test.api@example.com", "vehicle_type": vehicle["vehicle_type"], "vehicle_id": vehicle["id"], "pickup_date": pickup_date, "pickup_time": "11:00", "pickup_address": "A", "pickup_city": "Mumbai", "delivery_address": "B", "delivery_city": "Pune", "approximate_km": 20}
    created = requests.post(f"{BASE_URL}/api/bookings", json=payload, timeout=15)
    assert created.status_code == 200 and created.json()["status"] == "Pending Confirmation"
    booking = created.json()
    duplicate = requests.post(f"{BASE_URL}/api/bookings", json=payload, timeout=15)
    assert duplicate.status_code == 409
    assert requests.get(f"{BASE_URL}/api/bookings/lookup/{booking['booking_id']}", timeout=15).json()["booking_id"] == booking["booking_id"]
    confirmed = admin.patch(f"{BASE_URL}/api/bookings/{booking['booking_id']}/status", json={"status": "Confirmed"}, timeout=15)
    assert confirmed.status_code == 200 and confirmed.json()["status"] == "Confirmed"