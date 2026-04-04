import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path) => location.pathname.startsWith(path);

  const linkStyle = (path) => ({
    display: "block",
    padding: "10px 14px",
    margin: "6px 0",
    borderRadius: "10px",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "500",
    color: isActive(path) ? "#000" : "#cbd5f5",
    background: isActive(path) ? "#00ffcc" : "transparent",
    boxShadow: isActive(path)
      ? "0 0 10px rgba(0,255,204,0.4)"
      : "none",
    transition: "all 0.2s ease"
  });

  const sectionTitle = {
    fontSize: "11px",
    color: "#64748b",
    marginTop: "18px",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "1px"
  };

  return (
    <div
      style={{
        width: "240px",
        height: "100vh",
        background: "#0f172a",
        position: "fixed",
        top: 0,
        left: 0,
        borderRight: "1px solid #1e293b",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000
      }}
    >
      {/* 🔝 HEADER */}
      <div style={{ padding: "20px", borderBottom: "1px solid #1e293b" }}>
        <h2 style={{ color: "#00ffcc", marginBottom: "5px" }}>
          🛠 Artisan3.0
        </h2>

        <p style={{ color: "#94a3b8", fontSize: "12px" }}>
          Smart Pocket System
        </p>
      </div>

      {/* 🔽 MENU */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "15px"
        }}
      >
        <nav>

          {/* CORE */}
          <p style={sectionTitle}>Core</p>

          <Link to="/dashboard" style={linkStyle("/dashboard")}>
            📊 Dashboard
          </Link>

          <Link to="/tasks" style={linkStyle("/tasks")}>
            ✅ Tasks
          </Link>

          <Link to="/tools" style={linkStyle("/tools")}>
            🧰 Tools
          </Link>

          <Link to="/logs" style={linkStyle("/logs")}>
            📋 Maintenance Logs
          </Link>

          {/* COMMUNICATION */}
          <p style={sectionTitle}>Communication</p>

          <Link to="/chat" style={linkStyle("/chat")}>
            💬 Chats
          </Link>

          {/* MARKETPLACE */}
          <p style={sectionTitle}>Marketplace</p>

          <Link to="/marketplace" style={linkStyle("/marketplace")}>
            🧑‍🔧 Browse Jobs
          </Link>

          <Link to="/applications" style={linkStyle("/applications")}>
            📩 Applications
          </Link>

          <Link to="/become-artisan" style={linkStyle("/become-artisan")}>
            🛠 Become Artisan
          </Link>

          {/* 💰 WALLET */}
          <p style={sectionTitle}>Finance</p>

          <Link to="/wallet" style={linkStyle("/wallet")}>
            💰 Wallet
          </Link>

          {/* AI */}
          <p style={sectionTitle}>AI Tools</p>

          <Link to="/ai" style={linkStyle("/ai")}>
            🤖 Instant Repair Assistant
          </Link>

        </nav>
      </div>
    </div>
  );
}