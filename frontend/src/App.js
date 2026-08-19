import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { BrowserRouter, Link, Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { ArrowRight, CircleUserRound, LogOut, Plus, Route as RouteIcon, Truck } from "lucide-react";
import { Toaster, toast } from "sonner";
import "./App.css";

// Fix backend URL directly
const API = "https://transit-1-l2b5.onrender.com/api";
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("transit_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function Header({ user, setUser }) {
  const nav = useNavigate();
  const loc = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("transit_token");
    setUser(null);
    toast.success("Signed out");
    nav("/login");
  };

  const getDashboardLink = () => {
    if (user?.role === "admin") return "/admin";
    if (user?.role === "transporter") return "/transporter-dashboard";
    return "/customer-dashboard";
  };

  return (
    <header className="site-header">
      <Link to="/" className="brand">
        <span className="brand-mark"><RouteIcon size={20} /></span>
        <span>SACHIN<span>LOGISTICS</span></span>
      </Link>
      <nav className="desktop-nav">
        <Link className={loc.pathname === "/" ? "active" : ""} to="/">Home</Link>
        <Link className={loc.pathname === "/vehicles" ? "active" : ""} to="/vehicles">Fleet</Link>
        <Link className={loc.pathname === "/book" ? "active" : ""} to="/book">Book Vehicle</Link>
      </nav>
      <div className="header-actions">
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link to={getDashboardLink()} className="text-link" style={{ fontWeight: 600 }}>
              <CircleUserRound size={16} style={{ verticalAlign: "middle", marginRight: 4 }} />
              {user.name} ({user.role})
            </Link>
            <button onClick={handleLogout} className="button button-quiet" style={{ padding: "6px 10px", fontSize: 13 }}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        ) : (
          <Link to="/login" className="text-link">Login / Register</Link>
        )}
        <Link to="/book" className="button button-primary header-book">
          Book Load <ArrowRight size={16} />
        </Link>
      </div>
    </header>
  );
}

function Status({ value }) {
  return <span className={`status status-${(value || "available").toLowerCase().replaceAll(" ", "-")}`}>{value}</span>;
}

function Auth({ setUser }) {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const payload = mode === "login" 
        ? { email, password } 
        : { name, email, password, phone, role, company_name: companyName };
      
      const res = await api.post(endpoint, payload);
      
      if (res.data?.token) {
        localStorage.setItem("transit_token", res.data.token);
      }
      setUser(res.data);
      toast.success(mode === "login" ? "Logged in successfully!" : "Account created successfully!");
      
      if (res.data.role === "admin") nav("/admin");
      else if (res.data.role === "transporter") nav("/transporter-dashboard");
      else nav("/customer-dashboard");
    } catch (err) {
      console.error("Auth Error:", err);
      const detail = err.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : (err.message || "Authentication failed");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-form" style={{ maxWidth: 440, margin: "40px auto", padding: 24, background: "#fff", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button type="button" className={`button ${mode === "login" ? "button-primary" : "button-quiet"}`} style={{ flex: 1 }} onClick={() => setMode("login")}>Sign in</button>
          <button type="button" className={`button ${mode === "register" ? "button-primary" : "button-quiet"}`} style={{ flex: 1 }} onClick={() => setMode("register")}>Register</button>
        </div>

        <h2>{mode === "login" ? "Sign in to Platform" : "Create New Account"}</h2>
        
        <form onSubmit={handleAuth} style={{ marginTop: 16 }}>
          {mode === "register" && (
            <>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>ACCOUNT TYPE</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="customer">Customer (મારે સામાન મોકલવો છે)</option>
                  <option value="transporter">Transporter (હું વાહન માલિક છું)</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>{role === "transporter" ? "OWNER NAME" : "FULL NAME"}</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Enter name" />
              </div>
              {role === "transporter" && (
                <div className="field" style={{ marginBottom: 12 }}>
                  <label>COMPANY / TRANSPORT NAME</label>
                  <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Mahadev Transport" />
                </div>
              )}
              <div className="field" style={{ marginBottom: 12 }}>
                <label>MOBILE NUMBER</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="10-digit number" />
              </div>
            </>
          )}
          <div className="field" style={{ marginBottom: 12 }}>
            <label>EMAIL ADDRESS</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@example.com" />
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label>PASSWORD</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} className="button button-primary" style={{ width: "100%", padding: "12px", justifyContent: "center" }}>
            {loading ? "Processing..." : mode === "login" ? "Sign in" : "Create Account"}
          </button>
        </form>
      </div>
    </main>
  );
}

function TransporterDashboard({ user }) {
  const [vehicles, setVehicles] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("Orders");
  const [newVeh, setNewVeh] = useState({ vehicle_type: "", vehicle_number: "", capacity: "", size: "", rate_per_km: 25, minimum_fare: 1500, status: "Available" });

  const loadData = useCallback(async () => {
    try {
      const [vRes, oRes] = await Promise.all([api.get("/transporter/vehicles"), api.get("/bookings")]);
      if (Array.isArray(vRes.data)) setVehicles(vRes.data);
      if (Array.isArray(oRes.data)) setOrders(oRes.data);
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    try {
      await api.post("/vehicles", newVeh);
      toast.success("Vehicle registered!");
      setNewVeh({ vehicle_type: "", vehicle_number: "", capacity: "", size: "", rate_per_km: 25, minimum_fare: 1500, status: "Available" });
      loadData();
    } catch { toast.error("Failed to add vehicle"); }
  };

  const updateStatus = async (bookingId, status) => {
    await api.patch(`/bookings/${bookingId}/status`, { status });
    toast.success(`Booking ${status}`);
    loadData();
  };

  return (
    <main className="page" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div className="page-intro compact">
        <div>
          <div className="eyebrow">TRANSPORTER FLEET PANEL</div>
          <h1>{user?.company_name || user?.name}</h1>
          <p>{user?.email} · {user?.phone}</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, borderBottom: "1px solid #e2e8f0", marginBottom: 20 }}>
        {["Orders", "My Fleet"].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 16px", background: "none", border: "none", borderBottom: tab === t ? "3px solid var(--blue)" : "3px solid transparent", fontWeight: tab === t ? "bold" : "normal", cursor: "pointer" }}>{t}</button>
        ))}
      </div>

      {tab === "Orders" && (
        <div>
          <h2>Incoming Booking Requests ({orders.length})</h2>
          <div className="booking-table" style={{ marginTop: 16 }}>
            <div className="table-head"><span>Order ID</span><span>Customer</span><span>Route</span><span>Vehicle</span><span>Amount</span><span>Status</span><span>Action</span></div>
            {orders.map((b) => (
              <div className="table-row" key={b.id || b.booking_id}>
                <span className="mono"><b>{b.booking_id}</b></span>
                <span>{b.customer_name} ({b.mobile})</span>
                <span>{b.pickup_city} → {b.delivery_city}</span>
                <span>{b.vehicle_type}</span>
                <span>{money(b.estimated_total)}</span>
                <Status value={b.status} />
                <span className="row-actions">
                  {b.status === "Pending Confirmation" && <button onClick={() => updateStatus(b.booking_id, "Confirmed")}>Accept</button>}
                  {b.status === "Confirmed" && <button onClick={() => updateStatus(b.booking_id, "Completed")}>Complete</button>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "My Fleet" && (
        <div>
          <form onSubmit={handleAddVehicle} style={{ background: "#f8f9fa", padding: 20, borderRadius: 8, marginBottom: 24, border: "1px solid #e2e8f0" }}>
            <h3>+ Register Vehicle</h3>
            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 12 }}>
              <div className="field"><label>VEHICLE TYPE</label><input placeholder="Tata Ace / Bolero" value={newVeh.vehicle_type} onChange={(e) => setNewVeh({ ...newVeh, vehicle_type: e.target.value })} required /></div>
              <div className="field"><label>PLATE NO.</label><input placeholder="GJ-02-XX-1234" value={newVeh.vehicle_number} onChange={(e) => setNewVeh({ ...newVeh, vehicle_number: e.target.value })} required /></div>
              <div className="field"><label>CAPACITY</label><input placeholder="1.5 Ton" value={newVeh.capacity} onChange={(e) => setNewVeh({ ...newVeh, capacity: e.target.value })} required /></div>
              <div className="field"><label>SIZE</label><input placeholder="8 × 4 ft" value={newVeh.size} onChange={(e) => setNewVeh({ ...newVeh, size: e.target.value })} /></div>
              <div className="field"><label>RATE / KM (₹)</label><input type="number" value={newVeh.rate_per_km} onChange={(e) => setNewVeh({ ...newVeh, rate_per_km: Number(e.target.value) })} required /></div>
              <div className="field"><label>BASE FARE (₹)</label><input type="number" value={newVeh.minimum_fare} onChange={(e) => setNewVeh({ ...newVeh, minimum_fare: Number(e.target.value) })} required /></div>
            </div>
            <button type="submit" className="button button-primary" style={{ marginTop: 14 }}><Plus size={16} /> Add Vehicle</button>
          </form>

          <h3>My Registered Fleet ({vehicles.length})</h3>
          <div className="booking-table" style={{ marginTop: 14 }}>
            <div className="table-head"><span>Vehicle</span><span>Plate Number</span><span>Capacity</span><span>Rate</span><span>Base Fare</span></div>
            {vehicles.map((v) => (
              <div className="table-row" key={v.id}>
                <span><b>{v.vehicle_type}</b></span>
                <span>{v.vehicle_number}</span>
                <span>{v.capacity} ({v.size})</span>
                <span>₹{v.rate_per_km}/km</span>
                <span>{money(v.minimum_fare)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function SuperAdminPanel({ user }) {
  const [data, setData] = useState({ users: [] });
  useEffect(() => {
    api.get("/admin/dashboard").then((r) => setData(r.data)).catch(() => {});
  }, []);

  return (
    <main className="page" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div className="page-intro compact">
        <div>
          <div className="eyebrow">PLATFORM OWNER DESK</div>
          <h1>Super Admin Overview</h1>
          <p>Master control for all Transporters, Customers & Platform Bookings</p>
        </div>
      </div>
      <div className="kpi-grid" style={{ marginTop: 20 }}>
        <div className="kpi"><span>Total Platform Users</span><strong>{data.total_users || 0}</strong></div>
        <div className="kpi"><span>Active Transporters</span><strong>{data.total_transporters || 0}</strong></div>
        <div className="kpi"><span>Registered Customers</span><strong>{data.total_customers || 0}</strong></div>
        <div className="kpi"><span>Marketplace Fleet</span><strong>{data.total_vehicles || 0}</strong></div>
      </div>
      <h2 style={{ marginTop: 30 }}>All Registered Platform Users</h2>
      <div className="booking-table" style={{ marginTop: 14 }}>
        <div className="table-head"><span>Name / Business</span><span>Email</span><span>Phone</span><span>Account Type</span></div>
        {(data.users || []).map((u) => (
          <div className="table-row" key={u.id}>
            <span><b>{u.name}</b> {u.company_name && <small>({u.company_name})</small>}</span>
            <span>{u.email}</span>
            <span>{u.phone || "—"}</span>
            <span style={{ textTransform: "uppercase", fontWeight: "bold", color: u.role === "transporter" ? "#0284c7" : "#16a34a" }}>{u.role}</span>
          </div>
        ))}
      </div>
    </main>
  );
}

function CustomerDashboard({ user }) {
  const [bookings, setBookings] = useState([]);
  useEffect(() => {
    api.get("/bookings").then((r) => { if (Array.isArray(r.data)) setBookings(r.data); }).catch(() => {});
  }, []);

  return (
    <main className="page" style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div className="page-intro compact">
        <div>
          <div className="eyebrow">CUSTOMER DASHBOARD</div>
          <h1>Hello, {user?.name}</h1>
          <p>{user?.email} · {user?.phone}</p>
        </div>
      </div>
      <h2 style={{ marginTop: 20 }}>My Booking Requests ({bookings.length})</h2>
      {bookings.length === 0 ? (
        <div style={{ padding: 30, textAlign: "center", background: "#f8f9fa", borderRadius: 8, marginTop: 12 }}>
          <p>No dispatch requests placed yet.</p>
          <Link to="/book" className="button button-primary" style={{ marginTop: 12, display: "inline-flex" }}>Book a Vehicle</Link>
        </div>
      ) : (
        <div className="booking-table" style={{ marginTop: 16 }}>
          <div className="table-head"><span>Booking ID</span><span>Route</span><span>Vehicle</span><span>Pickup Schedule</span><span>Estimate</span><span>Status</span></div>
          {bookings.map((b) => (
            <div className="table-row" key={b.id || b.booking_id}>
              <span className="mono"><b>{b.booking_id}</b></span>
              <span>{b.pickup_city} → {b.delivery_city}</span>
              <span>{b.vehicle_type}</span>
              <span>{b.pickup_date} ({b.pickup_time})</span>
              <span>{money(b.estimated_total)}</span>
              <Status value={b.status} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function Home({ vehicles = [] }) {
  const safe = Array.isArray(vehicles) ? vehicles : [];
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow hero-eyebrow"><span className="signal-dot"></span> Logistics Marketplace · Gujarat</div>
          <h1>Connect Fleet.<br /><em>Direct Dispatch.</em></h1>
          <p className="hero-lede">Open logistics platform connecting businesses with verified vehicle fleet owners.</p>
          <div className="hero-actions">
            <Link to="/book" className="button button-primary button-large">Book a Vehicle <ArrowRight size={18} /></Link>
            <Link to="/login" className="button button-outline button-large">Join as Transporter</Link>
          </div>
        </div>
      </section>
      <section className="section catalog-preview">
        <div className="section-heading"><div><div className="eyebrow">LIVE MARKETPLACE FLEET</div><h2>Available Fleet Vehicles</h2></div></div>
        <div className="vehicle-grid">
          {safe.length === 0 ? <p>Loading fleet...</p> : safe.slice(0, 6).map((v) => (
            <article className="vehicle-card" key={v.id}>
              <div className="vehicle-visual"><Truck size={52} /></div>
              <div className="vehicle-info">
                <div className="eyebrow">{v.size} · {v.capacity}</div>
                <h3>{v.vehicle_type}</h3>
                {v.transporter_name && <small style={{ color: "#64748b" }}>Owner: {v.transporter_name}</small>}
                <div className="vehicle-rate" style={{ marginTop: 8 }}>₹{v.rate_per_km}/km</div>
                <div className="card-actions">
                  <Link to={`/book?vehicle=${encodeURIComponent(v.vehicle_type || "")}`} className="button button-primary">Book now <ArrowRight size={15} /></Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function BookingPage({ vehicles = [], user }) {
  const safe = Array.isArray(vehicles) ? vehicles : [];
  const nav = useNavigate();

  const [form, setForm] = useState({
    vehicle_type: "",
    vehicle_id: "",
    pickup_date: new Date().toISOString().slice(0, 10),
    pickup_time: "09:00",
    pickup_city: "Mehsana",
    delivery_city: "Ahmedabad",
    approximate_km: 75,
    customer_name: user?.name || "",
    mobile: user?.phone || "",
    email: user?.email || ""
  });

  useEffect(() => {
    if (safe.length > 0 && !form.vehicle_id) {
      setForm((prev) => ({
        ...prev,
        vehicle_id: safe[0].id,
        vehicle_type: safe[0].vehicle_type,
        customer_name: user?.name || prev.customer_name,
        mobile: user?.phone || prev.mobile,
        email: user?.email || prev.email
      }));
    }
  }, [safe, user, form.vehicle_id]);

  const selectedVeh = safe.find((v) => v.id === form.vehicle_id) || safe[0] || {};
  const est = Math.max(Number(selectedVeh.minimum_fare || 0), Number(selectedVeh.rate_per_km || 0) * Number(form.approximate_km || 0));

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to place a booking");
      nav("/login");
      return;
    }
    try {
      await api.post("/bookings", {
        ...form,
        vehicle_id: form.vehicle_id || selectedVeh.id || "",
        vehicle_type: form.vehicle_type || selectedVeh.vehicle_type || "",
        customer_name: form.customer_name || user.name,
        email: form.email || user.email,
        mobile: form.mobile || user.phone,
        estimated_total: est
      });
      toast.success("Booking placed successfully!");
      nav("/customer-dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to place booking");
    }
  };

  return (
    <main className="page" style={{ maxWidth: 800, margin: "0 auto" }}>
      <h2>Book Transport Dispatch</h2>
      <form onSubmit={handleBooking} style={{ background: "#fff", padding: 24, borderRadius: 8, marginTop: 16, border: "1px solid #e2e8f0" }}>
        <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="field">
            <label>SELECT VEHICLE</label>
            <select
              value={form.vehicle_id}
              onChange={(e) => {
                const v = safe.find((x) => x.id === e.target.value);
                setForm({ ...form, vehicle_id: e.target.value, vehicle_type: v?.vehicle_type || "" });
              }}
            >
              {safe.map((v) => (
                <option key={v.id} value={v.id}>{v.vehicle_type} - ₹{v.rate_per_km}/km ({v.transporter_name || "Fleet"})</option>
              ))}
            </select>
          </div>
          <div className="field"><label>PICKUP DATE</label><input type="date" value={form.pickup_date} onChange={(e) => setForm({ ...form, pickup_date: e.target.value })} required /></div>
          <div className="field"><label>PICKUP CITY</label><input value={form.pickup_city} onChange={(e) => setForm({ ...form, pickup_city: e.target.value })} required /></div>
          <div className="field"><label>DELIVERY CITY</label><input value={form.delivery_city} onChange={(e) => setForm({ ...form, delivery_city: e.target.value })} required /></div>
          <div className="field"><label>APPROX DISTANCE (KM)</label><input type="number" value={form.approximate_km} onChange={(e) => setForm({ ...form, approximate_km: Number(e.target.value) })} required /></div>
          <div className="field"><label>ESTIMATED FARE</label><input value={money(est)} disabled style={{ fontWeight: "bold", background: "#f1f5f9" }} /></div>
        </div>
        <button type="submit" className="button button-primary" style={{ marginTop: 20, width: "100%", justifyContent: "center" }}>Confirm Booking</button>
      </form>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("transit_token");
    if (token) {
      api.get("/auth/me").then((r) => setUser(r.data)).catch(() => localStorage.removeItem("transit_token")).finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
    api.get("/vehicles").then((r) => { if (Array.isArray(r.data)) setVehicles(r.data); }).catch(() => {});
  }, []);

  if (checking) return <div className="loading-screen">Loading platform…</div>;

  return (
    <BrowserRouter>
      <Header user={user} setUser={setUser} />
      <Routes>
        <Route path="/" element={<Home vehicles={vehicles} />} />
        <Route path="/vehicles" element={<Home vehicles={vehicles} />} />
        <Route path="/book" element={<BookingPage vehicles={vehicles} user={user} />} />
        <Route path="/login" element={<Auth setUser={setUser} />} />
        <Route path="/customer-dashboard" element={user?.role === "customer" ? <CustomerDashboard user={user} /> : <Navigate to="/login" />} />
        <Route path="/transporter-dashboard" element={user?.role === "transporter" ? <TransporterDashboard user={user} /> : <Navigate to="/login" />} />
        <Route path="/admin" element={user?.role === "admin" ? <SuperAdminPanel user={user} /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}