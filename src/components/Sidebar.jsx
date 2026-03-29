import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const linkStyle = (path) => ({
    display: "block",
    padding: "10px",
    margin: "10px 0",
    borderRadius: "8px",
    textDecoration: "none",
    color: location.pathname === path ? "#000" : "#fff",
    background: location.pathname === path ? "#00ffcc" : "transparent"
  });

  return (
    <div
      style={{
        width: "220px",
        height: "100vh",
        background: "#0f172a",
        padding: "20px",
        position: "fixed",
        top: 0,
        left: 0,
      }}
    >
      {/* 🔥 BRANDING */}
      <h2 style={{ color: "#00ffcc" }}>🛠 Artisan3.0</h2>
      <p style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "20px" }}>
        Your Pocket Assistant
      </p>

      {/* 📊 NAV */}
      <Link to="/dashboard" style={linkStyle("/dashboard")}>Dashboard</Link>
      <Link to="/tasks" style={linkStyle("/tasks")}>Tasks</Link>
      <Link to="/tools" style={linkStyle("/tools")}>Tools</Link>
      <Link to="/logs" style={linkStyle("/logs")}>Job Logs</Link>
      <Link to="/knowledge" style={linkStyle("/knowledge")}>Knowledge</Link>

      {/* 🔧 AI TOOL */}
      <Link to="/ai" style={linkStyle("/ai")}>
        🔧 Instant Repair Assistant
      </Link>
    </div>
  );
}