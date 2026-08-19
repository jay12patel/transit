import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { BrowserRouter, Link, Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { ArrowRight, CircleUserRound, LogOut, Plus, Route as RouteIcon, Truck, Phone, Mail, MapPin, CheckCircle, ShieldCheck, Search, Filter } from "lucide-react";
import { Toaster, toast } from "sonner";
import "./App.css";

const API = "https://transit-1-l2b5.onrender.com/api";
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("transit_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function Header({ user, setUser }) {
  const nav = useNavigate();
  const loc = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("transit_token");
    setUser(null);
    toast.success("Signed out successfully");
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
        <Link className={loc.pathname === "/vehicles" ? "active" : ""} to="/vehicles">Available Fleet</Link>
        <Link className={loc.pathname === "/about" ? "active" : ""} to="/about">About Us</Link>
        <Link className={loc.pathname === "/services" ? "active" : ""} to="/services">Services</Link>
        <Link className={loc.pathname === "/contact" ? "active" : ""} to="/contact">Contact Us</Link>
      </nav>
      <div className="header-actions">
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link to={getDashboardLink()} className="button button-outline" style={{ padding: "6px 12px", fontSize: 13 }}>
              <CircleUserRound size={16} /> {user.name} ({user.role})
            </Link>
            <button onClick={handleLogout} className="button button-quiet" style={{ padding: "6px 10px", fontSize: 13 }}>
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <Link to="/login" className="button button-outline">Login / Register</Link>
        )}
        <Link to="/vehicles" className="button button-primary header-book">
          Book Vehicle <ArrowRight size={16} />
        </Link>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer style={{ background: "#0f172a", color: "#94a3b8", padding: "40px 5%", marginTop: 80, borderTop: "1px solid #1e293b" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 30 }}>
        <div>
          <h3 style={{ color: "#fff", marginBottom: 12 }}>SACHIN LOGISTICS</h3>
          <p style={{ fontSize: 14 }}>Gujarat's leading open logistics network directly connecting local fleet owners with business load requirements.</p>
        </div>
        <div>
          <h4 style={{ color: "#fff", marginBottom: 12 }}>Quick Links</h4>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
            <li><Link to="/" style={{ color: "#94a3b8", textDecoration: "none" }}>Home</Link></li>
            <li><Link to="/about" style={{ color: "#94a3b8", textDecoration: "none" }}>About Us</Link></li>
            <li><Link to="/services" style={{ color: "#94a3b8", textDecoration: "none" }}>Our Services</Link></li>
            <li><Link to="/contact" style={{ color: "#94a3b8", textDecoration: "none" }}>Contact Support</Link></li>
          </ul>
        </div>
        <div>
          <h4 style={{ color: "#fff", marginBottom: 12 }}>Direct Contact</h4>
          <p style={{ fontSize: 14, marginBottom: 6 }}><Phone size={14} style={{ verticalAlign: "middle", marginRight: 6 }} /> +91 97255 06630</p>
          <p style={{ fontSize: 14, marginBottom: 6 }}><Mail size={14} style={{ verticalAlign: "middle", marginRight: 6 }} /> admin@transitroute.in</p>
          <p style={{ fontSize: 14 }}><MapPin size={14} style={{ verticalAlign: "middle", marginRight: 6 }} /> Ahmedabad - Mehsana Highway, Gujarat</p>
        </div>
      </div>
      <div style={{ textAlign: "center", borderTop: "1px solid #1e293b", marginTop: 30, paddingTop: 20, fontSize: 13 }}>
        © 2026 Sachin Logistics Platform. All Rights Reserved.
      </div>
    </footer>
  );
}

function Status({ value }) {
  return <span className={`status status-${(value || "available").toLowerCase().replaceAll(" ", "-")}`}>{value}</span>;
}

function Auth({ setUser }) {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("customer");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const payload = mode === "login" ? { phone, password } : { name, phone, password, role, company_name: companyName };
      const res = await api.post(endpoint, payload);
      
      if (res.data?.token) localStorage.setItem("transit_token", res.data.token);
      setUser(res.data);
      toast.success(mode === "login" ? "Logged in successfully!" : "Account created successfully!");
      
      if (res.data.role === "admin") nav("/admin");
      else if (res.data.role === "transporter") nav("/transporter-dashboard");
      else nav("/customer-dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-form" style={{ maxWidth: 440, margin: "40px auto", padding: 24, background: "#fff", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button type="button" className={`button ${mode === "login" ? "button-primary" : "button-quiet"}`} style={{ flex: 1 }} onClick={() => setMode("login")}>Sign in</button>
          <button type="button" className={`button ${mode === "register" ? "button-primary" : "button-quiet"}`} style={{ flex: 1 }} onClick={() => setMode("register")}>Register</button>
        </div>

        <h2>{mode === "login" ? "Mobile Login" : "Create Account"}</h2>
        
        <form onSubmit={handleAuth} style={{ marginTop: 16 }}>
          {mode === "register" && (
            <>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>I AM A:</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="customer">Customer (મારે સામાન મોકલવો છે)</option>
                  <option value="transporter">Transporter (હું વાહન માલિક છું)</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>{role === "transporter" ? "OWNER NAME" : "FULL NAME"}</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Enter full name" />
              </div>
              {role === "transporter" && (
                <div className="field" style={{ marginBottom: 12 }}>
                  <label>TRANSPORT / FLEET NAME</label>
                  <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Mahadev Roadways" />
                </div>
              )}
            </>
          )}
          <div className="field" style={{ marginBottom: 12 }}>
            <label>MOBILE NUMBER</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="10-digit mobile number" maxLength={10} />
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label>PASSWORD</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} className="button button-primary" style={{ width: "100%", padding: "12px", justifyContent: "center" }}>
            {loading ? "Processing..." : mode === "login" ? "Sign in with Mobile" : "Create Account"}
          </button>
        </form>
      </div>
    </main>
  );
}

function FleetSearchPage({ vehicles = [] }) {
  const [searchCity, setSearchCity] = useState("");
  const [selectedType, setSelectedType] = useState("All");

  const filtered = vehicles.filter((v) => {
    const matchType = selectedType === "All" || v.vehicle_type.toLowerCase().includes(selectedType.toLowerCase());
    return matchType;
  });

  return (
    <main className="page" style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 5%" }}>
      <div className="page-intro" style={{ marginBottom: 30 }}>
        <h1>Search & Book Vehicles</h1>
        <p>Find available commercial vehicles across Gujarat with direct rates.</p>
      </div>

      {/* Filter Box */}
      <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 30 }}>
        <div className="field">
          <label>VEHICLE CATEGORY</label>
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
            <option value="All">All Types (બધા વાહનો)</option>
            <option value="Tata Ace">Tata Ace / Chhota Hathi</option>
            <option value="Bolero">Bolero Pickup</option>
            <option value="Eicher">Eicher 14/19 Ft</option>
            <option value="Truck">Heavy Truck / Trailer</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="vehicle-grid">
        {filtered.length === 0 ? (
          <p>No vehicles found matching your criteria.</p>
        ) : (
          filtered.map((v) => (
            <article className="vehicle-card" key={v.id}>
              <div className="vehicle-visual"><Truck size={52} /></div>
              <div className="vehicle-info">
                <div className="eyebrow">{v.size} · {v.capacity}</div>
                <h3>{v.vehicle_type}</h3>
                {v.transporter_name && <small style={{ color: "#64748b" }}>Owner: {v.transporter_name}</small>}
                <div className="vehicle-rate" style={{ marginTop: 8 }}>₹{v.rate_per_km}/km</div>
                <div className="card-actions" style={{ marginTop: 12 }}>
                  <Link to={`/book?vehicle_id=${v.id}`} className="button button-primary" style={{ width: "100%", justifyContent: "center" }}>
                    Book Vehicle <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </main>
  );
}

function TransporterDashboard({ user }) {
  const [vehicles, setVehicles] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("Orders");
  const [newVeh, setNewVeh] = useState({ vehicle_type: "Tata Ace", vehicle_number: "", capacity: "1.5 Ton", size: "8x4 ft", rate_per_km: 25, minimum_fare: 1500 });

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
      loadData();
    } catch { toast.error("Failed to add vehicle"); }
  };

  return (
    <main className="page" style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 5%" }}>
      <div className="page-intro compact">
        <div>
          <div className="eyebrow">TRANSPORTER FLEET PANEL</div>
          <h1>{user?.company_name || user?.name}</h1>
          <p>Phone: {user?.phone} · Only your orders and vehicles are visible here.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, borderBottom: "1px solid #e2e8f0", margin: "20px 0" }}>
        {["Orders", "My Fleet"].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 16px", background: "none", border: "none", borderBottom: tab === t ? "3px solid #2563eb" : "3px solid transparent", fontWeight: tab === t ? "bold" : "normal", cursor: "pointer" }}>{t}</button>
        ))}
      </div>

      {tab === "Orders" && (
        <div>
          <h2>My Assigned Orders ({orders.length})</h2>
          <div className="booking-table" style={{ marginTop: 16 }}>
            <div className="table-head"><span>Order ID</span><span>Customer</span><span>Route</span><span>Fare</span><span>Payment</span><span>Status</span></div>
            {orders.map((b) => (
              <div className="table-row" key={b.booking_id}>
                <span><b>{b.booking_id}</b></span>
                <span>{b.customer_name} ({b.customer_phone})</span>
                <span>{b.pickup_city} → {b.delivery_city}</span>
                <span>{money(b.estimated_total)}</span>
                <Status value={b.payment_status} />
                <Status value={b.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "My Fleet" && (
        <div>
          <form onSubmit={handleAddVehicle} style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 24 }}>
            <h3>+ Register Vehicle</h3>
            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 12 }}>
              <div className="field"><label>VEHICLE TYPE</label><input placeholder="e.g. Tata Ace / Bolero" value={newVeh.vehicle_type} onChange={(e) => setNewVeh({ ...newVeh, vehicle_type: e.target.value })} required /></div>
              <div className="field"><label>PLATE NO.</label><input placeholder="GJ-02-XX-1234" value={newVeh.vehicle_number} onChange={(e) => setNewVeh({ ...newVeh, vehicle_number: e.target.value })} required /></div>
              <div className="field"><label>CAPACITY</label><input placeholder="1.5 Ton" value={newVeh.capacity} onChange={(e) => setNewVeh({ ...newVeh, capacity: e.target.value })} required /></div>
              <div className="field"><label>RATE / KM (₹)</label><input type="number" value={newVeh.rate_per_km} onChange={(e) => setNewVeh({ ...newVeh, rate_per_km: Number(e.target.value) })} required /></div>
            </div>
            <button type="submit" className="button button-primary" style={{ marginTop: 14 }}><Plus size={16} /> Add Vehicle</button>
          </form>
          <div className="booking-table">
            <div className="table-head"><span>Type</span><span>Number</span><span>Capacity</span><span>Rate</span></div>
            {vehicles.map((v) => (
              <div className="table-row" key={v.id}>
                <span><b>{v.vehicle_type}</b></span>
                <span>{v.vehicle_number}</span>
                <span>{v.capacity}</span>
                <span>₹{v.rate_per_km}/km</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function SuperAdminPanel() {
  const [data, setData] = useState({ users: [], bookings: [] });
  const loadAdmin = () => api.get("/admin/dashboard").then((r) => setData(r.data)).catch(() => {});
  useEffect(() => { loadAdmin(); }, []);

  const handleApprovePayment = async (bid, status) => {
    await api.patch(`/admin/bookings/${bid}/payment`, { payment_status: status });
    toast.success(`Payment ${status}!`);
    loadAdmin();
  };

  return (
    <main className="page" style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 5%" }}>
      <div className="page-intro compact">
        <div>
          <div className="eyebrow">PLATFORM OWNER DESK</div>
          <h1>Super Admin Control</h1>
          <p>Manage all orders, verify customer/transporter direct numbers & approve payments.</p>
        </div>
      </div>

      <h2 style={{ marginTop: 24 }}>All Platform Bookings & Payment Gateway Approvals</h2>
      <div className="booking-table" style={{ marginTop: 16 }}>
        <div className="table-head"><span>Order ID</span><span>Customer (Phone)</span><span>Transporter (Phone)</span><span>Amount</span><span>Payment</span><span>Action</span></div>
        {(data.bookings || []).map((b) => (
          <div className="table-row" key={b.booking_id}>
            <span><b>{b.booking_id}</b></span>
            <span>{b.customer_name}<br /><small style={{ color: "#2563eb" }}>📱 {b.customer_phone}</small></span>
            <span>{b.transporter_name}<br /><small style={{ color: "#16a34a" }}>📱 {b.transporter_phone || "Not Assigned"}</small></span>
            <span>{money(b.estimated_total)}</span>
            <Status value={b.payment_status} />
            <span className="row-actions">
              {b.payment_status !== "Approved" && (
                <button className="button button-primary" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => handleApprovePayment(b.booking_id, "Approved")}>
                  Approve Payment
                </button>
              )}
            </span>
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
    <main className="page" style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 5%" }}>
      <div className="page-intro compact">
        <h1>Welcome, {user?.name}</h1>
        <p>📱 {user?.phone} · Customer Load Panel</p>
      </div>
      <h2 style={{ marginTop: 20 }}>My Booking Status</h2>
      <div className="booking-table" style={{ marginTop: 16 }}>
        <div className="table-head"><span>Booking ID</span><span>Route</span><span>Fare</span><span>Payment Approval</span><span>Dispatch Status</span></div>
        {bookings.map((b) => (
          <div className="table-row" key={b.booking_id}>
            <span><b>{b.booking_id}</b></span>
            <span>{b.pickup_city} → {b.delivery_city}</span>
            <span>{money(b.estimated_total)}</span>
            <Status value={b.payment_status} />
            <Status value={b.status} />
          </div>
        ))}
      </div>
    </main>
  );
}

function BookingPage({ vehicles = [], user }) {
  const [form, setForm] = useState({ vehicle_id: vehicles[0]?.id || "", pickup_city: "Mehsana", delivery_city: "Ahmedabad", approximate_km: 70 });
  const nav = useNavigate();
  const selectedVeh = vehicles.find((v) => v.id === form.vehicle_id) || vehicles[0] || {};
  const est = Math.max(Number(selectedVeh.minimum_fare || 1500), Number(selectedVeh.rate_per_km || 25) * Number(form.approximate_km || 70));

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!user) { toast.error("Please login first"); nav("/login"); return; }
    try {
      await api.post("/bookings", { ...form, vehicle_type: selectedVeh.vehicle_type, estimated_total: est });
      toast.success("Order Placed! Waiting for Admin Payment Approval.");
      nav("/customer-dashboard");
    } catch { toast.error("Booking failed"); }
  };

  return (
    <main className="page" style={{ maxWidth: 700, margin: "0 auto", padding: "20px 5%" }}>
      <h2>Confirm Vehicle Dispatch</h2>
      <form onSubmit={handleBooking} style={{ background: "#fff", padding: 24, borderRadius: 12, marginTop: 16, border: "1px solid #e2e8f0" }}>
        <div className="field" style={{ marginBottom: 12 }}>
          <label>VEHICLE</label>
          <select value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicle_type} (₹{v.rate_per_km}/km) - {v.transporter_name}</option>)}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 12 }}><label>FROM CITY</label><input value={form.pickup_city} onChange={(e) => setForm({ ...form, pickup_city: e.target.value })} required /></div>
        <div className="field" style={{ marginBottom: 12 }}><label>TO CITY</label><input value={form.delivery_city} onChange={(e) => setForm({ ...form, delivery_city: e.target.value })} required /></div>
        <div className="field" style={{ marginBottom: 16 }}><label>TOTAL ESTIMATE</label><input value={money(est)} disabled style={{ fontWeight: "bold", background: "#f8fafc" }} /></div>
        <button type="submit" className="button button-primary" style={{ width: "100%", justifyContent: "center" }}>Send Booking Request</button>
      </form>
    </main>
  );
}

function About() {
  return (
    <main className="page" style={{ maxWidth: 900, margin: "0 auto", padding: "40px 5%" }}>
      <h1>About Sachin Logistics</h1>
      <p style={{ marginTop: 16, fontSize: 16, color: "#475569" }}>
        Sachin Logistics is Gujarat’s premier technology-driven open logistics network. We bridge the gap between verified commercial vehicle owners and industrial/agricultural cargo customers.
      </p>
    </main>
  );
}

function Contact() {
  return (
    <main className="page" style={{ maxWidth: 700, margin: "0 auto", padding: "40px 5%" }}>
      <h1>Contact Us</h1>
      <p style={{ marginTop: 8, color: "#64748b" }}>Direct Dispatch & Admin Helpline</p>
      <div style={{ background: "#fff", padding: 24, borderRadius: 12, marginTop: 20, border: "1px solid #e2e8f0" }}>
        <p><strong>Phone:</strong> +91 97255 06630</p>
        <p style={{ marginTop: 8 }}><strong>Email:</strong> admin@transitroute.in</p>
        <p style={{ marginTop: 8 }}><strong>Address:</strong> Ahmedabad - Mehsana Highway, Gujarat</p>
      </div>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("transit_token");
    if (token) {
      api.get("/auth/me").then((r) => setUser(r.data)).catch(() => localStorage.removeItem("transit_token"));
    }
    api.get("/vehicles").then((r) => { if (Array.isArray(r.data)) setVehicles(r.data); }).catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <Header user={user} setUser={setUser} />
      <Routes>
        <Route path="/" element={<FleetSearchPage vehicles={vehicles} />} />
        <Route path="/vehicles" element={<FleetSearchPage vehicles={vehicles} />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/book" element={<BookingPage vehicles={vehicles} user={user} />} />
        <Route path="/login" element={<Auth setUser={setUser} />} />
        <Route path="/customer-dashboard" element={user?.role === "customer" ? <CustomerDashboard user={user} /> : <Navigate to="/login" />} />
        <Route path="/transporter-dashboard" element={user?.role === "transporter" ? <TransporterDashboard user={user} /> : <Navigate to="/login" />} />
        <Route path="/admin" element={user?.role === "admin" ? <SuperAdminPanel /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Footer />
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}