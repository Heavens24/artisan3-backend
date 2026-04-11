import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const isActive = (path) => location.pathname.startsWith(path);

  const section = (title) => (
    <p className="text-xs text-gray-400 mt-6 mb-2 uppercase tracking-wider">
      {title}
    </p>
  );

  const linkClass = (path) =>
    `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition ${
      isActive(path)
        ? "bg-teal-400 text-black shadow-lg"
        : "text-gray-300 hover:bg-white/5"
    }`;

  const menu = (
    <>
      {section("Core")}
      <Link to="/dashboard" className={linkClass("/dashboard")}>📊 Dashboard</Link>
      <Link to="/tasks" className={linkClass("/tasks")}>✅ Tasks</Link>
      <Link to="/tools" className={linkClass("/tools")}>🧰 Tools</Link>
      <Link to="/logs" className={linkClass("/logs")}>📋 Maintenance Logs</Link>

      {section("Communication")}
      <Link to="/chat" className={linkClass("/chat")}>💬 Chats</Link>

      {section("Marketplace")}
      <Link to="/marketplace" className={linkClass("/marketplace")}>🧑‍🔧 Browse Jobs</Link>
      <Link to="/applications" className={linkClass("/applications")}>📩 Applications</Link>
      <Link to="/become-artisan" className={linkClass("/become-artisan")}>🛠 Become Artisan</Link>

      {section("Finance")}
      <Link to="/wallet" className={linkClass("/wallet")}>💰 Wallet</Link>

      {section("AI Tools")}
      <Link to="/ai" className={linkClass("/ai")}>🤖 Instant Repair Assistant</Link>
    </>
  );

  return (
    <>
      {/* 📱 MOBILE TOP BAR */}
      <div className="md:hidden flex justify-between items-center p-4 bg-slate-900 border-b border-white/10">
        <h1 className="font-semibold text-teal-400">🛠 Artisan3.0</h1>
        <button onClick={() => setOpen(true)}>☰</button>
      </div>

      {/* 📱 MOBILE SIDEBAR */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden">
          <div className="w-64 bg-slate-900 h-full p-5 overflow-y-auto">
            <button
              onClick={() => setOpen(false)}
              className="mb-4 text-right w-full"
            >
              ❌
            </button>
            {menu}
          </div>
        </div>
      )}

      {/* 💻 DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed top-0 left-0 bg-slate-900 p-5 border-r border-white/10">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-teal-400">
            🛠 Artisan3.0
          </h2>
          <p className="text-xs text-gray-400">
            Smart Pocket System
          </p>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto pr-1">
          {menu}
        </nav>

        {/* User */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-gray-400 truncate">
            {user.email}
          </p>
        </div>
      </aside>
    </>
  );
}