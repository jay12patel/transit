import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { BrowserRouter, Link, Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { ArrowRight, CalendarDays, Check, CircleUserRound, ClipboardList, Gauge, KeyRound, LogOut, MapPin, Menu, Phone, Plus, Route as RouteIcon, ShieldCheck, Trash2, Truck, UserRound, X } from "lucide-react";
import { Toaster, toast } from "sonner";
import "@/App.css";
/* eslint-disable react/no-unstable-nested-components, no-empty */

const API = `${process.env.REACT_APP_BACKEND_URL || "https://transit-1-l2b5.onrender.com"}/api`;
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const api = axios.create({ baseURL: API, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function Header({ user, setUser }) {
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const links = ["Vehicles", "Availability", "Book Vehicle", "Track Order", "Contact"];

  const handleLogout = async () => {
    localStorage.removeItem("token");
    try { await api.post("/auth/logout"); } catch {}
    setUser(null);
    toast.success("Signed out successfully");
    nav("/");
  };

  return (
    <header className="site-header">
      <Link to="/" className="brand" data-testid="brand-home-link">
        <span className="brand-mark"><RouteIcon size={20} /></span>
        <span>SACHIN<span>LOGISTICS</span></span>
      </Link>
      <nav className="desktop-nav">
        {links.map((x) => (
          <Link
            key={x}
            className={loc.pathname.toLowerCase().includes(x.split(" ")[0].toLowerCase()) ? "active" : ""}
            to={x === "Vehicles" ? "/vehicles" : x === "Availability" ? "/availability" : x === "Book Vehicle" ? "/book" : x === "Track Order" ? "/lookup" : "/#contact"}
          >
            {x}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link to={user.role === "admin" ? "/admin" : "/customer-dashboard"} className="text-link" style={{ fontWeight: 600 }}>
              <CircleUserRound size={16} style={{ verticalAlign: "middle", marginRight: 4 }} />
              {user.name}
            </Link>
            <button onClick={handleLogout} className="button button-quiet" style={{ padding: "6px 10px", fontSize: 13 }}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        ) : (
          <Link to="/login" className="text-link">Login / Register</Link>
        )}
        <Link to="/book" className="button button-primary header-book">
          Book a vehicle <ArrowRight size={16} />
        </Link>
        <button className="icon-button mobile-menu" onClick={() => setOpen(!open)}>
          <Menu />
        </button>
      </div>
      {open && (
        <div className="mobile-nav">
          {links.map((x) => (
            <Link
              onClick={() => setOpen(false)}
              key={x}
              to={x === "Vehicles" ? "/vehicles" : x === "Availability" ? "/availability" : x === "Book Vehicle" ? "/book" : x === "Track Order" ? "/lookup" : "/#contact"}
            >
              {x}<ArrowRight size={15} />
            </Link>
          ))}
          {user && (
            <Link onClick={() => { setOpen(false); handleLogout(); }} to="#">
              Logout <LogOut size={15} />
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer" style={{ background: "var(--blue)", color: "var(--paper)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20, padding: "32px max(24px, calc((100vw - 1200px)/2))", fontSize: 13 }}>
      <div className="brand" style={{ marginRight: "auto" }}>
        <span className="brand-mark"><RouteIcon size={19} /></span>
        <span>SACHIN<span>LOGISTICS</span></span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <MapPin size={16} />
        <span>Fatepura Bypass, Mehsana, Gujarat</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Phone size={16} />
        <a href="tel:+919725506630" style={{ color: "inherit", textDecoration: "none", fontWeight: "bold" }}>+91 97255 06630</a>
      </div>
      <span className="footer-copy" style={{ width: "100%", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 12, marginTop: 8 }}>
        © 2026 Sachin Logistics · All Rights Reserved
      </span>
    </footer>
  );
}

function Shell({ children, user, setUser }) {
  return (
    <>
      <Header user={user} setUser={setUser} />
      {children}
      <Footer />
      <Toaster position="top-right" richColors />
    </>
  );
}

function Status({ value }) {
  return <span className={`status status-${(value || "available").toLowerCase().replaceAll(" ", "-")}`}>{value}</span>;
}

function VehicleCard({ v }) {
  if (!v) return null;
  return (
    <article className="vehicle-card">
      <div className="vehicle-visual">
        <Truck size={52} />
        <span className="vehicle-code">{v.vehicle_number || "FLEET · OPEN"}</span>
      </div>
      <div className="vehicle-info">
        <div className="eyebrow">{v.size} · {v.capacity}</div>
        <h3>{v.vehicle_type}</h3>
        <div className="vehicle-meta">
          <Status value={v.status || "Available"} />
          <span>from <strong>{money(v.minimum_fare)}</strong></span>
        </div>
        <div className="vehicle-rate">₹{v.rate_per_km}/km <span>· transparent route pricing</span></div>
        <div className="card-actions">
          <Link to={`/book?vehicle=${encodeURIComponent(v.vehicle_type || "")}`} className="button button-primary">
            Book now <ArrowRight size={15} />
          </Link>
          <Link to="/availability" className="button button-quiet">
            Check availability
          </Link>
        </div>
      </div>
    </article>
  );
}

function Home({ vehicles = [] }) {
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow hero-eyebrow"><span className="signal-dot"></span> Sachin Logistics · Mehsana</div>
          <h1>Move more.<br /><em>Worry less.</em></h1>
          <p className="hero-lede">Reliable commercial transport and goods dispatch service across Mehsana and all Gujarat routes.</p>
          <div className="hero-actions">
            <Link to="/book" className="button button-primary button-large">Book a vehicle <ArrowRight size={18} /></Link>
            <Link to="/availability" className="button button-outline button-large">Check availability</Link>
          </div>
          <div className="hero-proof"><ShieldCheck size={18} /><span><strong>Verified Fleet.</strong> Upfront & genuine rates.</span></div>
        </div>
        <div className="hero-panel">
          <div className="panel-stamp">SACHIN / 01 · ROUTE DESK</div>
          <h2>Mehsana Dispatch<br /><span>Fleet Index.</span></h2>
          <div className="route-line">
            <div><small>BASE HUB</small><strong>Fatepura Bypass, Mehsana</strong></div>
            <ArrowRight size={18} />
            <div><small>SERVICE</small><strong>All Gujarat Routes</strong></div>
          </div>
          <Link to="/book" className="panel-link">Get an estimate <ArrowRight size={16} /></Link>
        </div>
      </section>
      <section className="trust-strip">
        <div><span className="trust-number">01</span><span><b>Live Fleet.</b><br />Direct Dispatch.</span></div>
        <div><span className="trust-number">02</span><span><b>Upfront rates.</b><br />Transparent Fare.</span></div>
        <div><span className="trust-number">03</span><span><b>Quick Support.</b><br />Direct Call Facility.</span></div>
      </section>
      <section className="section catalog-preview">
        <div className="section-heading">
          <div><div className="eyebrow">01 / FLEET INDEX</div><h2>The right vehicle<br /><em>for your load.</em></h2></div>
          <Link to="/vehicles" className="arrow-link">View all vehicles <ArrowRight size={16} /></Link>
        </div>
        <div className="vehicle-grid">
          {safeVehicles.length === 0 ? <p>Loading fleet details...</p> : safeVehicles.slice(0, 3).map((v) => (
            <VehicleCard key={v.id || v.vehicle_type} v={v} />
          ))}
        </div>
      </section>
      <section className="contact-band" id="contact">
        <div>
          <div className="eyebrow">SACHIN LOGISTICS</div>
          <h2>Contact Dispatch Office</h2>
          <p style={{ margin: "6px 0 0", opacity: 0.85 }}>Fatepura Bypass, Mehsana, Gujarat</p>
        </div>
        <a href="tel:+919725506630" className="contact-number">
          <Phone size={20} /> +91 97255 06630
        </a>
      </section>
    </main>
  );
}

function Vehicles({ vehicles = [] }) {
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
  return (
    <main className="page">
      <div className="page-intro">
        <div><div className="eyebrow">ACTIVE FLEET / {safeVehicles.length} VEHICLES</div><h1>Sachin Logistics<br /><em>Fleet.</em></h1></div>
        <p>Choose an available vehicle configured by our dispatch team for your specific load.</p>
      </div>
      <div className="vehicle-list">
        {safeVehicles.length === 0 ? <p>Loading fleet...</p> : safeVehicles.map((v) => <VehicleCard key={v.id || v.vehicle_type} v={v} />)}
      </div>
    </main>
  );
}

function Availability({ vehicles = [] }) {
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState(safeVehicles);

  const check = async () => {
    try {
      const res = await api.get(`/availability?date=${date}`);
      if (Array.isArray(res.data)) setItems(res.data);
    } catch {
      toast.error("Availability check failed");
    }
  };

  useEffect(() => {
    if (Array.isArray(vehicles)) setItems(vehicles);
  }, [vehicles]);

  const safeItems = Array.isArray(items) ? items : [];

  return (
    <main className="page">
      <div className="page-intro compact">
        <div><div className="eyebrow">LIVE VEHICLE STATUS</div><h1>Check Fleet<br /><em>Availability.</em></h1></div>
      </div>
      <section className="availability-search">
        <div className="field">
          <label htmlFor="availability-date">PICKUP DATE</label>
          <input id="availability-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button className="button button-primary" onClick={check}>
          Check availability <ArrowRight size={16} />
        </button>
      </section>
      <div className="availability-grid" style={{ marginTop: 24 }}>
        {safeItems.length === 0 ? <p>Checking fleet availability...</p> : safeItems.map((v) => (
          <div className="availability-row" key={v.id || v.vehicle_type}>
            <div className="availability-icon"><Truck size={25} /></div>
            <div><strong>{v.vehicle_type}</strong><small>{v.capacity} · {v.size} ({v.vehicle_number || "Open Fleet"})</small></div>
            <Status value={v.availability || v.status} />
            <Link to={`/book?vehicle=${encodeURIComponent(v.vehicle_type || "")}`} className="button button-quiet">
              Select <ArrowRight size={15} />
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}

function Booking({ vehicles = [], user }) {
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
  const params = new URLSearchParams(window.location.search);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(null);
  const [form, setForm] = useState({
    vehicle_type: params.get("vehicle") || safeVehicles[0]?.vehicle_type || "",
    vehicle_id: safeVehicles.find((v) => v.vehicle_type === params.get("vehicle"))?.id || safeVehicles[0]?.id || "",
    pickup_date: new Date().toISOString().slice(0, 10),
    pickup_time: "09:00",
    trip_type: "One Way",
    payment_method: "Pay Later",
    approximate_km: 50,
    loading_charge: 0,
    waiting_charge: 0,
    other_charges: 0,
    gst: 0,
    customer_name: user?.name || "",
    mobile: user?.phone || "",
    email: user?.email || "",
    company_name: "",
    pickup_address: "",
    pickup_city: "Mehsana",
    delivery_address: "",
    delivery_city: "",
    goods_type: "",
    weight: "",
    instructions: ""
  });

  useEffect(() => {
    if (safeVehicles.length > 0 && !form.vehicle_type) {
      setForm((prev) => ({
        ...prev,
        vehicle_type: params.get("vehicle") || safeVehicles[0].vehicle_type,
        vehicle_id: safeVehicles.find((v) => v.vehicle_type === params.get("vehicle"))?.id || safeVehicles[0].id
      }));
    }
  }, [safeVehicles, params]);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));
  const vehicle = safeVehicles.find((v) => v.vehicle_type === form.vehicle_type) || safeVehicles[0] || {};
  const estimate = Math.max(Number(vehicle.minimum_fare || 0), Number(vehicle.rate_per_km || 0) * Number(form.approximate_km || 0)) + Number(form.loading_charge || 0) + Number(form.waiting_charge || 0) + Number(form.other_charges || 0);

  const submit = async () => {
    try {
      const res = await api.post("/bookings", { ...form, vehicle_id: vehicle.id || "", estimated_total: estimate });
      setSubmitted(res.data);
      toast.success("Booking placed successfully!");
    } catch (e) {
      const detail = e.response?.data?.detail;
      let msg = "We could not place this booking";
      if (typeof detail === "string") {
        msg = detail;
      } else if (Array.isArray(detail)) {
        msg = detail.map((d) => (typeof d === "object" ? d.msg || JSON.stringify(d) : String(d))).join(", ");
      } else if (typeof detail === "object" && detail !== null) {
        msg = detail.msg || JSON.stringify(detail);
      }
      toast.error(msg);
    }
  };

  if (submitted) {
    return (
      <main className="confirmation page">
        <div className="confirm-mark"><Check size={32} /></div>
        <div className="eyebrow">BOOKING RECEIVED</div>
        <h1>You’re on the<br /><em>route list.</em></h1>
        <p>Thanks, {submitted.customer_name}. Sachin Logistics dispatch team will confirm your vehicle shortly.</p>
        <div className="booking-ticket">
          <span className="eyebrow">BOOKING ID</span>
          <strong>{submitted.booking_id}</strong>
          <div className="ticket-grid">
            <span>Vehicle <b>{submitted.vehicle_type}</b></span>
            <span>Route <b>{submitted.pickup_city} → {submitted.delivery_city}</b></span>
            <span>Date & time <b>{submitted.pickup_date} · {submitted.pickup_time}</b></span>
            <span>Estimate <b>{money(submitted.estimated_total)}</b></span>
          </div>
          <Status value={submitted.status} />
        </div>
        <Link to="/customer-dashboard" className="button button-primary">
          View in My Dashboard <ArrowRight size={16} />
        </Link>
      </main>
    );
  }

  const FormField = ({ label, k, type = "text", placeholder }) => (
    <div className="field">
      <label>{label}</label>
      <input type={type} placeholder={placeholder} value={form[k]} onChange={(e) => set(k, e.target.value)} />
    </div>
  );

  return (
    <main className="booking-page">
      <div className="booking-title">
        <div><div className="eyebrow">BOOK A VEHICLE / STEP {step} OF 3</div><h1>Book Confirmed<br /><em>Fleet.</em></h1></div>
      </div>
      <div className="booking-layout">
        <section className="booking-form">
          {step === 1 && (
            <>
              <h2>Trip & Vehicle</h2>
              <div className="form-grid">
                <div className="field">
                  <label>SELECT VEHICLE</label>
                  <select value={form.vehicle_type} onChange={(e) => {
                    const sel = safeVehicles.find((v) => v.vehicle_type === e.target.value);
                    setForm((prev) => ({ ...prev, vehicle_type: e.target.value, vehicle_id: sel?.id || "" }));
                  }}>
                    {safeVehicles.map((v) => <option key={v.id || v.vehicle_type} value={v.vehicle_type}>{v.vehicle_type} (₹{v.rate_per_km}/km)</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>TRIP TYPE</label>
                  <select value={form.trip_type} onChange={(e) => set("trip_type", e.target.value)}>
                    <option>One Way</option>
                    <option>Round Trip</option>
                  </select>
                </div>
                <FormField label="PICKUP DATE" k="pickup_date" type="date" />
                <FormField label="PICKUP TIME" k="pickup_time" type="time" />
                <FormField label="PICKUP CITY" k="pickup_city" placeholder="e.g. Mehsana" />
                <FormField label="DELIVERY CITY" k="delivery_city" placeholder="e.g. Ahmedabad / Surat" />
                <FormField label="APPROX. KM" k="approximate_km" type="number" />
                <FormField label="GOODS TYPE" k="goods_type" placeholder="e.g. Industrial / Commercial Goods" />
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2>Contact Details</h2>
              <div className="form-grid">
                <FormField label="CUSTOMER NAME" k="customer_name" />
                <FormField label="MOBILE NUMBER" k="mobile" />
                <FormField label="EMAIL" k="email" type="email" />
                <FormField label="COMPANY NAME" k="company_name" />
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <h2>Review & Submit</h2>
              <div className="review-list">
                <div><span>Vehicle</span><strong>{form.vehicle_type}</strong></div>
                <div><span>Route</span><strong>{form.pickup_city || "—"} → {form.delivery_city || "—"}</strong></div>
                <div><span>Customer</span><strong>{form.customer_name || "—"} · {form.mobile || "—"}</strong></div>
              </div>
            </>
          )}
          <div className="form-actions">
            {step > 1 && <button className="button button-quiet" onClick={() => setStep(step - 1)}>Back</button>}
            <button className="button button-primary" onClick={() => (step < 3 ? setStep(step + 1) : submit())}>
              {step < 3 ? "Continue" : "Submit booking"} <ArrowRight size={16} />
            </button>
          </div>
        </section>
        <aside className="estimate">
          <div className="eyebrow">ESTIMATED RATE</div>
          <strong>{money(estimate)}</strong>
          <span>Base Fare: {money(vehicle.minimum_fare || 0)}</span>
          <div className="estimate-lines">
            <div><span>Rate per KM</span><b>₹{vehicle.rate_per_km || 0}/km</b></div>
            <div><span>Est. Distance</span><b>{form.approximate_km || 0} km</b></div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function CustomerDashboard({ user }) {
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState("My Bookings");
  const [passForm, setPassForm] = useState({ old_password: "", new_password: "" });

  const load = useCallback(async () => {
    try {
      const res = await api.get("/customer/bookings");
      if (Array.isArray(res.data)) setBookings(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/change-password", passForm);
      toast.success("Password changed successfully!");
      setPassForm({ old_password: "", new_password: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to change password");
    }
  };

  const safeBookings = Array.isArray(bookings) ? bookings : [];

  return (
    <main className="page" style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div className="page-intro compact">
        <div>
          <div className="eyebrow">CUSTOMER ACCOUNT</div>
          <h1>Hello, {user?.name}</h1>
          <p>{user?.email} · {user?.phone || "Customer"}</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, borderBottom: "1px solid #e2e8f0", marginBottom: 20 }}>
        {["My Bookings", "Change Password"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "10px 16px",
              background: "none",
              border: "none",
              borderBottom: tab === t ? "3px solid var(--blue)" : "3px solid transparent",
              fontWeight: tab === t ? "bold" : "normal",
              cursor: "pointer"
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "My Bookings" && (
        <div>
          <h2>Your Orders ({safeBookings.length})</h2>
          {safeBookings.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", background: "#f8f9fa", borderRadius: 8, marginTop: 12 }}>
              <p>You haven't placed any bookings yet.</p>
              <Link to="/book" className="button button-primary" style={{ marginTop: 12, display: "inline-flex" }}>Book a Vehicle</Link>
            </div>
          ) : (
            <div className="booking-table" style={{ marginTop: 16 }}>
              <div className="table-head">
                <span>Booking ID</span>
                <span>Route</span>
                <span>Vehicle</span>
                <span>Pickup Date</span>
                <span>Total Amount</span>
                <span>Status</span>
              </div>
              {safeBookings.map((b) => (
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
        </div>
      )}

      {tab === "Change Password" && (
        <div style={{ maxWidth: 450, background: "#f8f9fa", padding: 24, borderRadius: 8, border: "1px solid #e2e8f0" }}>
          <h3>Change Your Password</h3>
          <form onSubmit={handlePasswordChange} style={{ marginTop: 14 }}>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>CURRENT PASSWORD</label>
              <input type="password" value={passForm.old_password} onChange={(e) => setPassForm({ ...passForm, old_password: e.target.value })} required />
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>NEW PASSWORD</label>
              <input type="password" value={passForm.new_password} onChange={(e) => setPassForm({ ...passForm, new_password: e.target.value })} required />
            </div>
            <button type="submit" className="button button-primary">Update Password</button>
          </form>
        </div>
      )}
    </main>
  );
}

function Lookup() {
  const [id, setId] = useState("");
  const [booking, setBooking] = useState(null);
  const search = async () => {
    try {
      const res = await api.get(`/bookings/lookup/${id.trim()}`);
      setBooking(res.data);
    } catch {
      toast.error("Booking ID not found");
    }
  };
  return (
    <main className="page lookup">
      <div className="page-intro compact">
        <div><div className="eyebrow">TRACK BOOKING</div><h1>Track Order Status</h1></div>
      </div>
      <div className="lookup-form">
        <div className="field">
          <label>ENTER BOOKING ID</label>
          <input value={id} onChange={(e) => setId(e.target.value.toUpperCase())} placeholder="TRN-2026-00001" />
        </div>
        <button className="button button-primary" onClick={search}>
          Find booking <ArrowRight size={16} />
        </button>
      </div>
      {booking && (
        <div className="booking-ticket lookup-ticket">
          <div>
            <span className="eyebrow">{booking.booking_id}</span>
            <h2>{booking.vehicle_type}</h2>
            <Status value={booking.status} />
          </div>
          <div className="ticket-grid">
            <span>Customer <b>{booking.customer_name}</b></span>
            <span>Route <b>{booking.pickup_city} → {booking.delivery_city}</b></span>
            <span>Schedule <b>{booking.pickup_date} · {booking.pickup_time}</b></span>
            <span>Estimate <b>{money(booking.estimated_total)}</b></span>
          </div>
        </div>
      )}
    </main>
  );
}

function Auth({ setUser }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/auth/${mode}`, mode === "login" ? { email, password } : { name, email, password, phone });
      if (res.data.token) localStorage.setItem("token", res.data.token);
      setUser(res.data);
      nav(res.data.role === "admin" ? "/admin" : "/customer-dashboard");
      toast.success("Welcome back");
    } catch (err) {
      const detail = err.response?.data?.detail;
      let msg = "Invalid credentials";
      if (typeof detail === "string") {
        msg = detail;
      } else if (Array.isArray(detail)) {
        msg = detail.map((d) => (typeof d === "object" ? d.msg || JSON.stringify(d) : String(d))).join(", ");
      }
      toast.error(msg);
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={submit}>
        <div className="form-tabs" style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <button type="button" className={mode === "login" ? "button button-primary" : "button button-quiet"} onClick={() => setMode("login")}>Sign in</button>
          <button type="button" className={mode === "register" ? "button button-primary" : "button button-quiet"} onClick={() => setMode("register")}>Register</button>
        </div>
        <h2>{mode === "login" ? "Sign in to Account" : "Create Customer Account"}</h2>
        {mode === "register" && (
          <>
            <div className="field">
              <label>FULL NAME</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label>MOBILE NUMBER</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit number" />
            </div>
          </>
        )}
        <div className="field">
          <label>EMAIL</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>PASSWORD</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="button button-primary full-button" style={{ marginTop: 12 }}>
          {mode === "login" ? "Sign in" : "Create Account"}
        </button>
      </form>
    </main>
  );
}

function Admin({ user, setUser, onFleetUpdate }) {
  const [stats, setStats] = useState({});
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [tab, setTab] = useState("Bookings");

  const [passForm, setPassForm] = useState({ old_password: "", new_password: "" });

  const [newVeh, setNewVeh] = useState({
    vehicle_type: "",
    vehicle_number: "",
    capacity: "",
    size: "",
    rate_per_km: 25,
    minimum_fare: 1500,
    status: "Available"
  });

  const load = useCallback(async () => {
    try {
      const [s, b, v] = await Promise.all([api.get("/dashboard"), api.get("/bookings"), api.get("/vehicles")]);
      setStats(s.data || {});
      if (Array.isArray(b.data)) setBookings(b.data);
      if (Array.isArray(v.data)) {
        setVehicles(v.data);
        if (onFleetUpdate) onFleetUpdate(v.data);
      }
    } catch {}
  }, [onFleetUpdate]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const updateBookingStatus = async (id, status) => {
    await api.patch(`/bookings/${id}/status`, { status });
    toast.success(`Booking ${status.toLowerCase()}`);
    load();
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    if (!newVeh.vehicle_type || !newVeh.capacity) {
      toast.error("Please fill required fields");
      return;
    }
    try {
      await api.post("/vehicles", newVeh);
      toast.success("New vehicle added to live fleet!");
      setNewVeh({
        vehicle_type: "",
        vehicle_number: "",
        capacity: "",
        size: "",
        rate_per_km: 25,
        minimum_fare: 1500,
        status: "Available"
      });
      load();
    } catch {
      toast.error("Failed to add vehicle");
    }
  };

  const handleDeleteVehicle = async (id) => {
    if (window.confirm("Remove this vehicle from fleet?")) {
      await api.delete(`/vehicles/${id}`);
      toast.success("Vehicle deleted");
      load();
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/change-password", passForm);
      toast.success("Password changed successfully!");
      setPassForm({ old_password: "", new_password: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to change password");
    }
  };

  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];

  return (
    <main className="admin-page">
      <aside className="admin-rail">
        <Link to="/" className="brand">
          <span className="brand-mark"><RouteIcon size={19} /></span>
          <span>SACHIN<span>ADMIN</span></span>
        </Link>
        <div className="rail-label">MANAGEMENT</div>
        {["Bookings", "Vehicles", "Settings"].map((x) => (
          <button className={tab === x ? "rail-link active" : "rail-link"} onClick={() => setTab(x)} key={x}>
            {x === "Bookings" ? <ClipboardList size={17} /> : x === "Vehicles" ? <Truck size={17} /> : <KeyRound size={17} />} {x}
          </button>
        ))}
        <div className="rail-bottom">
          <span className="admin-user">
            <CircleUserRound size={18} />
            <span><b>{user?.name}</b><small>Administrator</small></span>
          </span>
          <button className="rail-link" onClick={async () => {
            localStorage.removeItem("token");
            await api.post("/auth/logout");
            setUser(null);
            window.location.href = "/";
          }}>
            <X size={17} /> Sign out
          </button>
        </div>
      </aside>

      <section className="admin-content">
        <div className="admin-top">
          <div>
            <div className="eyebrow">CONTROL DESK / {tab.toUpperCase()}</div>
            <h1>{tab === "Bookings" ? "Live Orders & Routes" : tab === "Vehicles" ? "Manage Fleet & Rates" : "Account Settings"}</h1>
          </div>
          <span className="admin-date"><CalendarDays size={16} /> {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
        </div>

        {tab === "Bookings" && (
          <>
            <div className="kpi-grid">
              {[
                ["Today’s bookings", stats.today || 0],
                ["Pending confirmation", stats.pending || 0],
                ["Running trips", stats.running || 0],
                ["Completed", stats.completed || 0],
                ["Available fleet", stats.available_vehicles || 0]
              ].map(([a, b]) => (
                <div className="kpi" key={a}>
                  <span>{a}</span>
                  <strong>{b}</strong>
                </div>
              ))}
            </div>
            <div className="admin-section-heading" style={{ marginTop: 24 }}>
              <h2>Recent Customer Orders</h2>
              <button className="button button-outline" onClick={load}>Refresh <Gauge size={15} /></button>
            </div>
            <div className="booking-table">
              <div className="table-head">
                <span>Booking ID</span>
                <span>Customer & Route</span>
                <span>Vehicle</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Action</span>
              </div>
              {safeBookings.length === 0 && <div className="empty-row">No orders received yet.</div>}
              {safeBookings.map((b) => (
                <div className="table-row" key={b.id || b.booking_id}>
                  <span className="mono"><b>{b.booking_id}</b><small>{b.pickup_date}</small></span>
                  <span><b>{b.customer_name}</b><small>{b.pickup_city} → {b.delivery_city}</small></span>
                  <span>{b.vehicle_type}</span>
                  <span>{money(b.estimated_total)}</span>
                  <Status value={b.status} />
                  <span className="row-actions">
                    {b.status === "Pending Confirmation" && (
                      <button onClick={() => updateBookingStatus(b.booking_id, "Confirmed")}>Confirm</button>
                    )}
                    {b.status === "Confirmed" && (
                      <button onClick={() => updateBookingStatus(b.booking_id, "Completed")}>Complete</button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "Vehicles" && (
          <div className="vehicle-manager">
            <form onSubmit={handleAddVehicle} style={{ background: "#f8f9fa", padding: 20, borderRadius: 8, marginBottom: 24, border: "1px solid #e2e8f0" }}>
              <h3 style={{ marginBottom: 14 }}>+ Add New Vehicle / Set Rate</h3>
              <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <div className="field">
                  <label>VEHICLE NAME / TYPE</label>
                  <input placeholder="e.g. Bolero Maxi Truck" value={newVeh.vehicle_type} onChange={(e) => setNewVeh({ ...newVeh, vehicle_type: e.target.value })} required />
                </div>
                <div className="field">
                  <label>NUMBER PLATE</label>
                  <input placeholder="GJ-02-XX-1234" value={newVeh.vehicle_number} onChange={(e) => setNewVeh({ ...newVeh, vehicle_number: e.target.value })} />
                </div>
                <div className="field">
                  <label>CAPACITY</label>
                  <input placeholder="e.g. 2.5 Ton" value={newVeh.capacity} onChange={(e) => setNewVeh({ ...newVeh, capacity: e.target.value })} required />
                </div>
                <div className="field">
                  <label>SIZE / BODY</label>
                  <input placeholder="e.g. 12 × 6 ft" value={newVeh.size} onChange={(e) => setNewVeh({ ...newVeh, size: e.target.value })} />
                </div>
                <div className="field">
                  <label>RATE PER KM (₹)</label>
                  <input type="number" value={newVeh.rate_per_km} onChange={(e) => setNewVeh({ ...newVeh, rate_per_km: Number(e.target.value) })} required />
                </div>
                <div className="field">
                  <label>MINIMUM BASE FARE (₹)</label>
                  <input type="number" value={newVeh.minimum_fare} onChange={(e) => setNewVeh({ ...newVeh, minimum_fare: Number(e.target.value) })} required />
                </div>
                <div className="field">
                  <label>STATUS</label>
                  <select value={newVeh.status} onChange={(e) => setNewVeh({ ...newVeh, status: e.target.value })}>
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="button button-primary" style={{ marginTop: 14 }}>
                <Plus size={16} /> Save Vehicle to Live Fleet
              </button>
            </form>

            <div className="admin-section-heading">
              <h2>Configured Fleet ({safeVehicles.length})</h2>
            </div>
            <div className="booking-table">
              <div className="table-head">
                <span>Vehicle</span>
                <span>Capacity / Body</span>
                <span>Rate / KM</span>
                <span>Base Fare</span>
                <span>Status</span>
                <span>Action</span>
              </div>
              {safeVehicles.map((v) => (
                <div className="table-row" key={v.id}>
                  <span><b>{v.vehicle_type}</b><small>{v.vehicle_number || "Open"}</small></span>
                  <span>{v.capacity} · {v.size}</span>
                  <span>₹{v.rate_per_km}/km</span>
                  <span>{money(v.minimum_fare)}</span>
                  <Status value={v.status} />
                  <span>
                    <button style={{ background: "#fee2e2", color: "#dc2626", border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer" }} onClick={() => handleDeleteVehicle(v.id)}>
                      <Trash2 size={14} /> Remove
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "Settings" && (
          <div style={{ maxWidth: 500 }}>
            <form onSubmit={handlePasswordChange} style={{ background: "#f8f9fa", padding: 24, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <h3 style={{ marginBottom: 16 }}>Change Admin Password</h3>
              <div className="field" style={{ marginBottom: 14 }}>
                <label>CURRENT (OLD) PASSWORD</label>
                <input 
                  type="password" 
                  value={passForm.old_password} 
                  onChange={(e) => setPassForm({ ...passForm, old_password: e.target.value })} 
                  required 
                />
              </div>
              <div className="field" style={{ marginBottom: 18 }}>
                <label>NEW PASSWORD</label>
                <input 
                  type="password" 
                  value={passForm.new_password} 
                  onChange={(e) => setPassForm({ ...passForm, new_password: e.target.value })} 
                  required 
                />
              </div>
              <button type="submit" className="button button-primary">
                Update Password
              </button>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [vehicles, setVehicles] = useState([]);

  const loadVehicles = useCallback(() => {
    api.get("/vehicles")
      .then((r) => {
        if (Array.isArray(r.data)) setVehicles(r.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    api.get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => {})
      .finally(() => setChecking(false));

    loadVehicles();
  }, [loadVehicles]);

  if (checking) return <div className="loading-screen"><RouteIcon size={25} /> Loading route desk…</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/admin" 
          element={
            user?.role === "admin" ? (
              <Admin user={user} setUser={setUser} onFleetUpdate={setVehicles} />
            ) : user ? (
              <Navigate to="/customer-dashboard" replace />
            ) : (
              <Auth setUser={setUser} />
            )
          } 
        />
        <Route path="/login" element={<Auth setUser={setUser} />} />
        <Route path="/customer-dashboard" element={<Shell user={user} setUser={setUser}><CustomerDashboard user={user} setUser={setUser} /></Shell>} />
        <Route path="/vehicles" element={<Shell user={user} setUser={setUser}><Vehicles vehicles={vehicles} /></Shell>} />
        <Route path="/availability" element={<Shell user={user} setUser={setUser}><Availability vehicles={vehicles} /></Shell>} />
        <Route path="/book" element={<Shell user={user} setUser={setUser}><Booking vehicles={vehicles} user={user} /></Shell>} />
        <Route path="/lookup" element={<Shell user={user} setUser={setUser}><Lookup /></Shell>} />
        <Route path="*" element={<Shell user={user} setUser={setUser}><Home vehicles={vehicles} /></Shell>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;