import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { BrowserRouter, Link, Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { ArrowRight, CircleUserRound, LogOut, Plus, Route as RouteIcon, Truck, Phone, Mail, MapPin, CheckCircle, ShieldCheck, KeyRound } from "lucide-react";
import { Toaster, toast } from "sonner";
import "./App.css";

const API = "https://transit-ulsq.onrender.com/api";
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
          <Link to="/login" className="button button-outline">Login with Mobile</Link>
        )}
        <Link to="/vehicles" className="button button-primary header-book">
          Book Vehicle <ArrowRight size={16} />
        </Link>
      </div>
    </header>
  );
}

function Status({ value }) {
  return <span className={`status status-${(value || "available").toLowerCase().replaceAll(" ", "-")}`}>{value}</span>;
}

function Auth({ setUser }) {
  const [step, setStep] = useState("enter_phone"); // "enter_phone" | "enter_otp"
  const [role, setRole] = useState("customer");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminMode, setIsAdminMode] = useState(false);
  const nav = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (phone.length < 10) return toast.error("૧૦ આંકડાનો સાચો મોબાઈલ નંબર નાખો");
    setLoading(true);
    try {
      const res = await api.post("/auth/send-otp", { phone });
      toast.success(res.data.message || "OTP Sent!");
      if (res.data.demo_otp) {
        toast.info(`તમારો OTP: ${res.data.demo_otp}`, { duration: 8000 });
        setOtp(res.data.demo_otp);
      }
      setStep("enter_otp");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-otp", { phone, otp, name, role, company_name: companyName });
      if (res.data?.token) localStorage.setItem("transit_token", res.data.token);
      setUser(res.data);
      toast.success("Mobile Verified Successfully!");
      if (res.data.role === "transporter") nav("/transporter-dashboard");
      else nav("/customer-dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { phone, password: adminPassword });
      if (res.data?.token) localStorage.setItem("transit_token", res.data.token);
      setUser(res.data);
      toast.success("Admin Logged in!");
      nav("/admin");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Admin login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-form" style={{ maxWidth: 420, margin: "40px auto", padding: 28, background: "#fff", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h2>{isAdminMode ? "Admin Login" : "Mobile OTP Login"}</h2>
          <p style={{ fontSize: 13, color: "#64748b" }}>{isAdminMode ? "Password login for Super Admin" : "Quick verification via OTP"}</p>
        </div>

        {isAdminMode ? (
          <form onSubmit={handleAdminLogin}>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>ADMIN MOBILE</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="9725506630" />
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>PASSWORD</label>
              <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required placeholder="Transit@2026!" />
            </div>
            <button type="submit" disabled={loading} className="button button-primary" style={{ width: "100%", justifyContent: "center" }}>
              {loading ? "Authenticating..." : "Admin Sign in"}
            </button>
            <button type="button" onClick={() => setIsAdminMode(false)} className="button button-quiet" style={{ width: "100%", marginTop: 10, fontSize: 13 }}>
              Back to Mobile OTP Login
            </button>
          </form>
        ) : step === "enter_phone" ? (
          <form onSubmit={handleSendOtp}>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>I AM A:</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="customer">Customer (મારે સામાન મોકલવો છે)</option>
                <option value="transporter">Transporter (હું વાહન માલિક છું)</option>
              </select>
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>{role === "transporter" ? "OWNER NAME" : "FULL NAME"}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="તમારું નામ" />
            </div>
            {role === "transporter" && (
              <div className="field" style={{ marginBottom: 12 }}>
                <label>TRANSPORT / FLEET NAME</label>
                <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Mahadev Transport" />
              </div>
            )}
            <div className="field" style={{ marginBottom: 16 }}>
              <label>MOBILE NUMBER</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="10-digit mobile number" maxLength={10} />
            </div>
            <button type="submit" disabled={loading} className="button button-primary" style={{ width: "100%", justifyContent: "center" }}>
              {loading ? "Sending OTP..." : "Get OTP Verification"}
            </button>
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <button type="button" onClick={() => setIsAdminMode(true)} style={{ background: "none", border: "none", color: "#64748b", fontSize: 12, cursor: "pointer" }}>
                Super Admin Login 👉
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>ENTER 4-DIGIT OTP SENT TO {phone}</label>
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} required placeholder="1234" style={{ fontSize: 20, textAlign: "center", letterSpacing: 4 }} />
            </div>
            <button type="submit" disabled={loading} className="button button-primary" style={{ width: "100%", justifyContent: "center" }}>
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>
            <button type="button" onClick={() => setStep("enter_phone")} className="button button-quiet" style={{ width: "100%", marginTop: 8, fontSize: 13 }}>
              Change Mobile Number
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

function FleetSearchPage({ vehicles = [] }) {
  const [selectedType, setSelectedType] = useState("All");

  const filtered = vehicles.filter((v) => {
    return selectedType === "All" || v.vehicle_type.toLowerCase().includes(selectedType.toLowerCase());
  });

  return (
    <main className="page" style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 5%" }}>
      <div className="page-intro" style={{ marginBottom: 30 }}>
        <h1>Search & Book Vehicles</h1>
        <p>Direct contact with Gujarat's verified fleet owners at direct rates.</p>
      </div>

      <div style={{ background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 24, maxWidth: 350 }}>
        <div className="field">
          <label>SELECT VEHICLE TYPE</label>
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
            <option value="All">All Commercial Vehicles</option>
            <option value="Tata Ace">Tata Ace / Chhota Hathi</option>
            <option value="Bolero">Bolero Pickup</option>
            <option value="Eicher">Eicher 14/19 Ft</option>
            <option value="Truck">Heavy Truck</option>
          </select>
        </div>
      </div>

      <div className="vehicle-grid">
        {filtered.length === 0 ? (
          <p>No vehicles found. Transporters can register vehicles to appear here.</p>
        ) : (
          filtered.map((v) => (
            <article className="vehicle-card" key={v.id}>
              <div className="vehicle-visual"><Truck size={52} /></div>
              <div className="vehicle-info">
                <div className="eyebrow">{v.size} · {v.capacity}</div>
                <h3>{v.vehicle_type}</h3>
                {v.transporter_name && <p style={{ fontSize: 13, color: "#475569" }}>Owner: <b>{v.transporter_name}</b></p>}
                <div className="vehicle-rate" style={{ marginTop: 8 }}>₹{v.rate_per_km}/km</div>
                <div className="card-actions" style={{ marginTop: 14 }}>
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
      toast.success("તમારું વાહન સફળતાપૂર્વક રજીસ્ટર થઈ ગયું!");
      loadData();
    } catch { toast.error("Failed to add vehicle"); }
  };

  return (
    <main className="page" style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 5%" }}>
      <div className="page-intro compact">
        <div>
          <div className="eyebrow">TRANSPORTER DASHBOARD</div>
          <h1>{user?.company_name || user?.name}</h1>
          <p>📱 {user?.phone} · ફક્ત તમારા ઓર્ડર અને વાહનો અહીં દેખાશે.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, borderBottom: "1px solid #e2e8f0", margin: "20px 0" }}>
        {["Orders", "My Fleet"].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 16px", background: "none", border: "none", borderBottom: tab === t ? "3px solid #2563eb" : "3px solid transparent", fontWeight: tab === t ? "bold" : "normal", cursor: "pointer" }}>{t}</button>
        ))}
      </div>

      {tab === "Orders" && (
        <div>
          <h2>તમને મળેલા ઓર્ડર્સ ({orders.length})</h2>
          {orders.length === 0 ? (
            <p style={{ marginTop: 14, color: "#64748b" }}>હાલમાં કોઈ નવો ઓર્ડર મળ્યો નથી.</p>
          ) : (
            <div className="booking-table" style={{ marginTop: 16 }}>
              <div className="table-head"><span>Order ID</span><span>Customer (Mobile)</span><span>Route</span><span>Fare</span><span>Payment</span><span>Status</span></div>
              {orders.map((b) => (
                <div className="table-row" key={b.booking_id}>
                  <span><b>{b.booking_id}</b></span>
                  <span>{b.customer_name}<br/><small>📱 {b.customer_phone}</small></span>
                  <span>{b.pickup_city} → {b.delivery_city}</span>
                  <span>{money(b.estimated_total)}</span>
                  <Status value={b.payment_status} />
                  <Status value={b.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "My Fleet" && (
        <div>
          <form onSubmit={handleAddVehicle} style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 24 }}>
            <h3>+ નવું વાહન રજીસ્ટર કરો</h3>
            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 12 }}>
              <div className="field"><label>VEHICLE TYPE</label><input placeholder="Tata Ace / Bolero" value={newVeh.vehicle_type} onChange={(e) => setNewVeh({ ...newVeh, vehicle_type: e.target.value })} required /></div>
              <div className="field"><label>PLATE NO.</label><input placeholder="GJ-02-XX-1234" value={newVeh.vehicle_number} onChange={(e) => setNewVeh({ ...newVeh, vehicle_number: e.target.value })} required /></div>
              <div className="field"><label>CAPACITY</label><input placeholder="1.5 Ton" value={newVeh.capacity} onChange={(e) => setNewVeh({ ...newVeh, capacity: e.target.value })} required /></div>
              <div className="field"><label>RATE / KM (₹)</label><input type="number" value={newVeh.rate_per_km} onChange={(e) => setNewVeh({ ...newVeh, rate_per_km: Number(e.target.value) })} required /></div>
            </div>
            <button type="submit" className="button button-primary" style={{ marginTop: 14 }}><Plus size={16} /> Save Vehicle</button>
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
        <h1>Super Admin Control Panel</h1>
        <p>Master overview of all customer loads, transporter assignments and payment gateway approvals.</p>
      </div>

      <h2 style={{ marginTop: 24 }}>All Platform Bookings ({data.bookings?.length || 0})</h2>
      <div className="booking-table" style={{ marginTop: 16 }}>
        <div className="table-head"><span>Order ID</span><span>Customer Contact</span><span>Transporter Contact</span><span>Amount</span><span>Payment</span><span>Action</span></div>
        {(data.bookings || []).map((b) => (
          <div className="table-row" key={b.booking_id}>
            <span><b>{b.booking_id}</b></span>
            <span>{b.customer_name}<br /><small style={{ color: "#2563eb", fontWeight: "bold" }}>📱 {b.customer_phone}</small></span>
            <span>{b.transporter_name}<br /><small style={{ color: "#16a34a", fontWeight: "bold" }}>📱 {b.transporter_phone || "Pending"}</small></span>
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
        <p>📱 {user?.phone} · My Load Bookings</p>
      </div>
      <h2 style={{ marginTop: 20 }}>My Dispatches ({bookings.length})</h2>
      <div className="booking-table" style={{ marginTop: 16 }}>
        <div className="table-head"><span>Booking ID</span><span>Route</span><span>Fare</span><span>Payment</span><span>Dispatch Status</span></div>
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
  const loc = useLocation();
  const nav = useNavigate();
  const searchParams = new URLSearchParams(loc.search);
  const targetId = searchParams.get("vehicle_id") || vehicles[0]?.id;

  const [form, setForm] = useState({ vehicle_id: targetId || "", pickup_city: "Mehsana", delivery_city: "Ahmedabad", approximate_km: 70 });

  useEffect(() => {
    if (targetId) setForm((prev) => ({ ...prev, vehicle_id: targetId }));
  }, [targetId]);

  const selectedVeh = vehicles.find((v) => v.id === form.vehicle_id) || vehicles[0] || {};
  const est = Math.max(Number(selectedVeh.minimum_fare || 1500), Number(selectedVeh.rate_per_km || 25) * Number(form.approximate_km || 70));

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!user) { toast.error("ઓર્ડર બુક કરવા માટે પહેલાં લૉગિન કરો"); nav("/login"); return; }
    try {
      await api.post("/bookings", { ...form, vehicle_type: selectedVeh.vehicle_type, estimated_total: est });
      toast.success("ઓર્ડર બુક થઈ ગયો! એડમિન પેમેન્ટ એપ્રૂવલની રાહ જુઓ.");
      nav("/customer-dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Booking failed");
    }
  };

  return (
    <main className="page" style={{ maxWidth: 700, margin: "0 auto", padding: "20px 5%" }}>
      <h2>Book Vehicle Dispatch</h2>
      <form onSubmit={handleBooking} style={{ background: "#fff", padding: 24, borderRadius: 12, marginTop: 16, border: "1px solid #e2e8f0" }}>
        <div className="field" style={{ marginBottom: 12 }}>
          <label>SELECTED VEHICLE</label>
          <select value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicle_type} (₹{v.rate_per_km}/km) - {v.transporter_name || "Transporter"}</option>)}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 12 }}><label>FROM CITY</label><input value={form.pickup_city} onChange={(e) => setForm({ ...form, pickup_city: e.target.value })} required /></div>
        <div className="field" style={{ marginBottom: 12 }}><label>TO CITY</label><input value={form.delivery_city} onChange={(e) => setForm({ ...form, delivery_city: e.target.value })} required /></div>
        <div className="field" style={{ marginBottom: 16 }}><label>ESTIMATED TOTAL (₹)</label><input value={money(est)} disabled style={{ fontWeight: "bold", background: "#f8fafc" }} /></div>
        <button type="submit" className="button button-primary" style={{ width: "100%", justifyContent: "center" }}>Confirm Dispatch Booking</button>
      </form>
    </main>
  );
}

function About() {
  return (
    <main className="page" style={{ maxWidth: 900, margin: "0 auto", padding: "40px 5%" }}>
      <h1>About Sachin Logistics</h1>
      <p style={{ marginTop: 16, fontSize: 16, color: "#475569" }}>Direct commercial vehicle connectivity across Gujarat with verified owners and guaranteed fair pricing.</p>
    </main>
  );
}

function Contact() {
  return (
    <main className="page" style={{ maxWidth: 700, margin: "0 auto", padding: "40px 5%" }}>
      <h1>Contact Us</h1>
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
        <Route path="/contact" element={<Contact />} />
        <Route path="/book" element={<BookingPage vehicles={vehicles} user={user} />} />
        <Route path="/login" element={<Auth setUser={setUser} />} />
        <Route path="/customer-dashboard" element={user?.role === "customer" ? <CustomerDashboard user={user} /> : <Navigate to="/login" />} />
        <Route path="/transporter-dashboard" element={user?.role === "transporter" ? <TransporterDashboard user={user} /> : <Navigate to="/login" />} />
        <Route path="/admin" element={user?.role === "admin" ? <SuperAdminPanel /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}