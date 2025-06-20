import React, { useState, useEffect } from "react";
import "./App.css";

// Route management using simple state (no react-router for minimal deps, but pattern allows for extension)
// Consider using React Router for production-scale projects.
function useHashRoute(defaultRoute = "/") {
  const [route, setRoute] = useState(window.location.hash.slice(1) || defaultRoute);
  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash.slice(1) || defaultRoute);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [defaultRoute]);
  const navigate = (to) => {
    if (window.location.hash.slice(1) !== to) window.location.hash = to;
  };
  return [route, navigate];
}

// Backend API base—set accordingly for local/prod
const API_BASE = ""; // Same-origin reverse proxy, or edit for cross-origin

// Helper: fetch with error JSON/text handling
async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// Ticket Form: Submission & Update (mode prop: "submit" | "update")
function TicketForm({ mode = "submit", existing = null, onSuccess }) {
  const [subject, setSubject] = useState(existing ? existing.subject : "");
  const [description, setDescription] = useState(existing ? existing.description : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const actionLabel = mode === "update" ? "Update Ticket" : "Submit Ticket";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "submit") {
        const body = { subject, description };
        const data = await fetchJSON(`${API_BASE}/tickets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        onSuccess && onSuccess(data);
      } else if (mode === "update" && existing && existing.id) {
        const body = { subject, description };
        const data = await fetchJSON(`${API_BASE}/tickets/${existing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        onSuccess && onSuccess(data);
      }
    } catch (err) {
      setError(err.message || "Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="ticket-form" onSubmit={handleSubmit} style={{ maxWidth: 400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
      <label>
        <strong>Subject:</strong>
        <input
          type="text"
          required
          value={subject}
          style={{ width: "100%", padding: 8, marginTop: 4 }}
          onChange={(e) => setSubject(e.target.value)}
          disabled={loading}
          placeholder="Brief subject for your ticket"
        />
      </label>
      <label>
        <strong>Description:</strong>
        <textarea
          required
          value={description}
          style={{ width: "100%", minHeight: 80, padding: 8, marginTop: 4, resize: "vertical" }}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
          placeholder="Describe your issue or request"
        />
      </label>
      <button className="btn btn-large" type="submit" disabled={loading}>
        {loading ? "Submitting..." : actionLabel}
      </button>
      {error && <div style={{ color: "#f44336", marginTop: 8 }}>{error}</div>}
    </form>
  );
}

// List all tickets
function TicketList({ navigate }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchJSON(`${API_BASE}/tickets`)
      .then((data) => mounted && setTickets(data))
      .catch((e) => mounted && setErr("Failed to load tickets"))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  return (
    <section className="container" style={{ paddingTop: 40, paddingBottom: 56 }}>
      <h2 style={{ marginBottom: 12 }}>All Submitted Tickets</h2>
      {loading && <div>Loading...</div>}
      {err && <div style={{ color: "#f44336" }}>{err}</div>}
      {!loading && !err && tickets.length === 0 && <div>No tickets yet.</div>}
      {!loading && !err && (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {tickets.map((t) => (
            <li
              key={t.id}
              className="ticket-list-item"
              style={{
                background: "rgba(66,128,255,0.06)",
                marginBottom: 10,
                padding: 16,
                borderRadius: 7,
                border: "1px solid var(--border-color)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}
            >
              <div>
                <b>#{t.id}:</b> {t.subject}
                <span style={{ color: "#1976d2", marginLeft: 8, fontWeight: 500, fontSize: "0.95em" }}>{t.status}</span>
              </div>
              <div>
                <button className="btn" style={{ fontSize: "0.94em", marginRight: 6 }} onClick={() => navigate(`/ticket/${t.id}`)}>View</button>
                <button className="btn" style={{ fontSize: "0.94em" }} onClick={() => navigate(`/ticket/${t.id}/update`)}>Edit</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Ticket Status Page
function TicketStatus({ ticketId, navigate }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchJSON(`${API_BASE}/tickets/${ticketId}`)
      .then((data) => mounted && setTicket(data))
      .catch(() => mounted && setErr("Ticket not found."))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [ticketId]);

  return (
    <section className="container" style={{ paddingTop: 40, paddingBottom: 56 }}>
      {loading && <div>Loading...</div>}
      {err && <div style={{ color: "#f44336" }}>{err}</div>}
      {ticket && (
        <div className="ticket-details" style={{ background: "rgba(50,50,90,0.14)", padding: 24, borderRadius: 8, border: "1px solid var(--border-color)", maxWidth: 600 }}>
          <h2>Ticket #{ticket.id}</h2>
          <div style={{ marginBottom: 20 }}>
            <strong>Status:</strong>{" "}
            <span style={{ color: "#ff9800", fontWeight: 600 }}>{ticket.status}</span>
          </div>
          <div style={{ marginBottom: 18 }}>
            <strong>Subject:</strong> {ticket.subject}
          </div>
          <div style={{ marginBottom: 18 }}>
            <strong>Description:</strong>
            <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{ticket.description}</div>
          </div>
          <div>
            <button className="btn" onClick={() => navigate(`/ticket/${ticketId}/update`)}>Update Ticket</button>
            <button className="btn" style={{ marginLeft: 10 }} onClick={() => navigate("/")}>Back to Tickets</button>
          </div>
        </div>
      )}
    </section>
  );
}

// Update Ticket Page
function UpdateTicket({ ticketId, navigate }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchJSON(`${API_BASE}/tickets/${ticketId}`)
      .then((data) => mounted && setTicket(data))
      .catch(() => mounted && setErr("Ticket not found."))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [ticketId]);

  const handleSuccess = (updated) => {
    setSubmitted(true);
    setTicket(updated);
  };

  return (
    <section className="container" style={{ paddingTop: 40, paddingBottom: 56 }}>
      {loading && <div>Loading...</div>}
      {err && <div style={{ color: "#f44336" }}>{err}</div>}
      {!loading && ticket && !submitted && (
        <>
          <h2>Update Ticket #{ticket.id}</h2>
          <TicketForm mode="update" existing={ticket} onSuccess={handleSuccess} />
        </>
      )}
      {submitted && (
        <div style={{ background: "#d2f1e5", color: "#093", padding: 18, borderRadius: 7, maxWidth: 400, margin: "30px auto 0 auto", textAlign: "center" }}>
          Ticket updated successfully.
          <div>
            <button className="btn" style={{ marginTop: 16 }} onClick={() => navigate(`/ticket/${ticket.id}`)}>View Ticket</button>
          </div>
        </div>
      )}
    </section>
  );
}

// Anonymous Ticket Submission (Homepage)
function SubmitTicketPage({ navigate }) {
  const [submitted, setSubmitted] = useState(null);
  const handleSuccess = (ticket) => setSubmitted(ticket);
  return (
    <section className="container" style={{ paddingTop: 48, paddingBottom: 56 }}>
      <div className="hero" style={{ paddingTop: 24, paddingBottom: 20 }}>
        <div className="subtitle">Anonymous Support Ticket</div>
        <h1 className="title" style={{ fontSize: "2.1rem" }}>Submit a Ticket</h1>
        <div className="description" style={{ marginBottom: 30 }}>
          Submit your support request anonymously. You will receive a ticket ID to check status and updates.
        </div>
        {!submitted ? (
          <TicketForm onSuccess={handleSuccess} />
        ) : (
          <div style={{ background: "#bbf1fa", color: "#035974", padding: 18, borderRadius: 7, maxWidth: 400, margin: "32px auto 0 auto", textAlign: "center" }}>
            Ticket submitted!<br />
            <div style={{ marginTop: 8 }}>
              <b>Ticket ID:</b> <span style={{ fontSize: "1.3em" }}>#{submitted.id}</span>
            </div>
            <button className="btn" style={{ marginTop: 18 }} onClick={() => navigate(`/ticket/${submitted.id}`)}>
              View Ticket Status
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// Find Ticket by ID form on homepage or navbar
function FindTicketBar({ navigate }) {
  const [id, setId] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (id) navigate(`/ticket/${id}`);
      }}
      style={{ display: "flex", alignItems: "center", gap: 8 }}
    >
      <input
        type="text"
        required
        placeholder="Enter ticket ID"
        value={id}
        style={{ border: "1px solid #e0e0e0", borderRadius: 4, padding: "6px 12px", fontSize: "1em", width: 110 }}
        onChange={(e) => setId(e.target.value.replace(/\D/g, ""))}
      />
      <button className="btn" style={{ fontSize: "1em", padding: "6px 14px" }} type="submit">
        Check
      </button>
    </form>
  );
}

// Minimal header and navigation (static)
function Navbar({ route, navigate }) {
  return (
    <nav className="navbar">
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          <div className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
            <span className="logo-symbol">&#9734;</span>{" "}Ticketing
          </div>
          <div style={{ display: "flex", gap: 15, alignItems: "center" }}>
            <button
              className="btn"
              style={{ backgroundColor: route === "/" ? "#1976d2" : undefined }}
              onClick={() => navigate("/")}
            >
              Submit Ticket
            </button>
            <button
              className="btn"
              style={{ backgroundColor: route === "/tickets" ? "#1976d2" : undefined }}
              onClick={() => navigate("/tickets")}
            >
              View All Tickets
            </button>
            <div>
              <FindTicketBar navigate={navigate} />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

// Minimal Footer
function Footer() {
  return (
    <footer style={{
      width: "100%",
      textAlign: "center",
      padding: "18px 0 10px 0",
      color: "var(--text-secondary)",
      background: "#fff",
      borderTop: "1px solid var(--border-color)",
      marginTop: "auto"
    }}>
      <span>© 2024 Ticketing System. Powered by React & FastAPI.</span>
    </footer>
  );
}

// Main Routing
function App() {
  const [route, navigate] = useHashRoute("/");
  // Route parsing
  // /              → Submit page
  // /tickets       → List
  // /ticket/:id    → Ticket status
  // /ticket/:id/update → Ticket update

  // Route matching
  let MainContent = null;
  const routeMatch = (() => {
    if (route === "/" || route === "") return { type: "submit" };
    if (route === "/tickets") return { type: "list" };
    if (/^\/ticket\/(\d+)$/.test(route)) return { type: "view", id: route.match(/^\/ticket\/(\d+)$/)[1] };
    if (/^\/ticket\/(\d+)\/update$/.test(route)) return { type: "update", id: route.match(/^\/ticket\/(\d+)\/update$/)[1] };
    return { type: "notfound" };
  })();

  if (routeMatch.type === "submit") {
    MainContent = <SubmitTicketPage navigate={navigate} />;
  } else if (routeMatch.type === "list") {
    MainContent = <TicketList navigate={navigate} />;
  } else if (routeMatch.type === "view") {
    MainContent = <TicketStatus ticketId={routeMatch.id} navigate={navigate} />;
  } else if (routeMatch.type === "update") {
    MainContent = <UpdateTicket ticketId={routeMatch.id} navigate={navigate} />;
  } else {
    MainContent = (
      <section className="container" style={{ paddingTop: 70 }}>
        <h2>Page Not Found</h2>
        <button className="btn" onClick={() => navigate("/")}>Back Home</button>
      </section>
    );
  }

  return (
    <div className="app" style={{ minHeight: "100vh", background: "#fafcff" }}>
      <Navbar route={route} navigate={navigate} />
      <main style={{ marginTop: 78, flex: "1 0 auto" }}>{MainContent}</main>
      <Footer />
    </div>
  );
}

export default App;
