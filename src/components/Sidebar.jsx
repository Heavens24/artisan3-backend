import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div style={{
      width: "200px",
      background: "#111",
      height: "100vh",
      position: "fixed",
      padding: "20px"
    }}>
      <h3>🛠 Artisan3.0</h3>

      <Link to="/dashboard">Dashboard</Link><br />
      <Link to="/tools">Tools</Link>
    </div>
  );
}