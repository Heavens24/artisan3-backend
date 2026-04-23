import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useMemo } from "react";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import UpgradeModal from "./UpgradeModal";

const LOW_STOCK_THRESHOLD = 2;

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [lockedFeature, setLockedFeature] = useState("");

  // Live data for badges
  const [tools, setTools] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [chats, setChats] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [collapsed, setCollapsed] = useState(() => {
    return JSON.parse(localStorage.getItem("shimlah_nav_collapsed") || "{}");
  });

  // User doc listener
  useEffect(() => {
    if (!user?.uid) return;
    return onSnapshot(doc(db, "users", user.uid), (snap) => {
      setUserData(snap.data() || {});
    });
  }, [user?.uid]);

  // Badge listeners – only when user exists
  useEffect(() => {
    if (!user?.uid) return;

    const unsubs = [
      onSnapshot(
        query(collection(db, "tools"), where("userId", "==", user.uid)),
        (snap) => setTools(snap.docs.map((d) => ({ id: d.id,...d.data() })))
      ),
      onSnapshot(
        query(collection(db, "tasks"), where("userId", "==", user.uid)),
        (snap) => setTasks(snap.docs.map((d) => ({ id: d.id,...d.data() })))
      ),
      onSnapshot(
        query(collection(db, "jobs"), where("artisanId", "==", user.uid)),
        (snap) => setJobs(snap.docs.map((d) => ({ id: d.id,...d.data() })))
      ),
      onSnapshot(
        query(collection(db, "applications"), where("artisanId", "==", user.uid)),
        (snap) => setApplications(snap.docs.map((d) => ({ id: d.id,...d.data() })))
      ),
      onSnapshot(
        query(collection(db, "chats"), where("participants", "array-contains", user.uid)),
        (snap) => setChats(snap.docs.map((d) => ({ id: d.id,...d.data() })))
      ),
      onSnapshot(
        query(collection(db, "notifications"), where("userId", "==", user.uid)),
        (snap) => setNotifications(snap.docs.map((d) => ({ id: d.id,...d.data() })))
      ),
    ];

    return () => unsubs.forEach((u) => u());
  }, [user?.uid]);

  // Smart badge counts
  const counts = useMemo(() => {
    const now = Date.now();
    return {
      lowStock: tools.filter((t) => t.quantity > 0 && t.quantity <= LOW_STOCK_THRESHOLD).length,
      overdueTasks: tasks.filter((t) => t.dueDate < now &&!t.done).length,
      activeJobs: jobs.filter((j) => j.status === "in_progress").length,
      newJobs: jobs.filter((j) => j.status === "searching").length, // For artisans
      pendingApps: applications.filter((a) => a.status === "pending").length,
      unreadChats: chats.filter((c) => c.seen?.[user?.uid] === false).length,
      unreadNotifs: notifications.filter((n) =>!n.read).length,
    };
  }, [tools, tasks, jobs, applications, chats, notifications, user?.uid]);

  if (!user) return null;

  const isActive = (path) => location.pathname.startsWith(path);

  const toggleCollapse = (section) => {
    const newState = {...collapsed, [section]:!collapsed[section] };
    setCollapsed(newState);
    localStorage.setItem("shimlah_nav_collapsed", JSON.stringify(newState));
  };

  const Badge = ({ count, type = "info" }) => {
    if (!count) return null;
    const colors = {
      danger: "bg-red-500",
      warn: "bg-yellow-500 text-black",
      info: "bg-cyan-500 text-black",
    };
    return (
      <span className={`${colors[type]} text-xs px-2 py-0.5 rounded-full font-semibold ml-auto`}>
        {count > 9? "9+" : count}
      </span>
    );
  };

  const NavItem = ({ to, icon, label, badge, badgeType, proFeature }) => {
    const active = isActive(to);
    const isLocked = proFeature &&!userData?.isPro;

    const className = `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition ${
      active? "bg-teal-400 text-black" : "text-gray-300 hover:bg-white/5"
    } ${isLocked? "opacity-50" : ""}`;

    const content = (
      <>
        <span className="text-lg">{icon}</span>
        <span className="flex-1">{label}</span>
        {badge > 0 && <Badge count={badge} type={badgeType} />}
        {isLocked && <span className="text-xs">🔒</span>}
      </>
    );

    if (isLocked) {
      return (
        <button
          onClick={() => {
            setLockedFeature(proFeature);
            setShowUpgrade(true);
          }}
          className={`w-full text-left ${className}`}
        >
          {content}
        </button>
      );
    }

    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  };

  const Section = ({ title, children, collapsible = false }) => {
    const isCol = collapsible && collapsed[title];
    return (
      <div className="mt-6">
        <button
          onClick={() => collapsible && toggleCollapse(title)}
          className="w-full flex items-center justify-between text-xs text-gray-400 mb-2 uppercase"
        >
          {title}
          {collapsible && <span className="text-xs">{isCol? "▶" : "▼"}</span>}
        </button>
        {!isCol && <div className="space-y-1">{children}</div>}
      </div>
    );
  };

  const proDaysLeft = userData?.proExpiresAt
   ? Math.max(0, Math.ceil((userData.proExpiresAt.toMillis() - Date.now()) / 86400000))
    : 0;

  const displayName = userData?.displayName || user?.displayName || "Shimlah";

  const menu = (
    <>
      {/* Header - matches your spec */}
      <div className="mb-6">
        <h1 className="text-teal-400 font-bold text-xl flex items-center gap-1">
          🛠 {displayName}
        </h1>
        <p className="text-xs text-gray-400 mt-1 truncate">{user.email}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs px-2 py-0.5 rounded ${userData?.isPro? "bg-teal-500 text-black" : "bg-gray-600"}`}>
            {userData?.isPro? "Pro 🚀" : "Free"}
          </span>
          {userData?.isPro && proDaysLeft > 0 && (
            <span className="text-xs text-gray-400">{proDaysLeft}d left</span>
          )}
        </div>
        {userData?.verified && <p className="text-green-400 text-xs mt-1">✓ Verified</p>}
      </div>

      <Section title="Command Center">
        <NavItem to="/dashboard" icon="📊" label="Dashboard" />
        <NavItem
          to="/verification"
          icon="🔒"
          label={userData?.verified? "Verified" : "Get Verified"}
          badge={!userData?.verified? "!" : null}
          badgeType="warn"
        />
      </Section>

      {userData?.isPro && (
        <Section title="Work" collapsible>
          {userData?.role === "artisan"? (
            <>
              <NavItem
                to="/marketplace"
                icon="🧑‍🔧"
                label="Browse Jobs"
                badge={counts.newJobs}
                badgeType="info"
                proFeature="Marketplace"
              />
              <NavItem
                to="/my-jobs"
                icon="📦"
                label="My Jobs"
                badge={counts.activeJobs}
                proFeature="My Jobs"
              />
              <NavItem
                to="/applications"
                icon="📩"
                label="Applications"
                badge={counts.pendingApps}
                proFeature="Applications"
              />
            </>
          ) : (
            <>
              <NavItem to="/post-job" icon="📝" label="Post Job" proFeature="Post Job" />
              <NavItem to="/my-jobs" icon="👷" label="My Requests" proFeature="My Jobs" />
            </>
          )}
        </Section>
      )}

      <Section title="Workshop" collapsible>
        <NavItem
          to="/tools"
          icon="🧰"
          label="Tools"
          badge={counts.lowStock}
          badgeType="warn"
        />
        <NavItem
          to="/tasks"
          icon="✅"
          label="Tasks"
          badge={counts.overdueTasks}
          badgeType="danger"
        />
        <NavItem to="/logs" icon="📋" label="Logs" />
      </Section>

      {userData?.isPro && (
        <Section title="Connect" collapsible>
          <NavItem
            to="/chat"
            icon="💬"
            label="Chats"
            badge={counts.unreadChats}
            badgeType="info"
            proFeature="Chat"
          />
          <NavItem
            to="/notifications"
            icon="🔔"
            label="Notifications"
            badge={counts.unreadNotifs}
          />
        </Section>
      )}

      <Section title="AI">
        <NavItem
          to="/ai"
          icon="🤖"
          label="AI Assistant"
          proFeature="AI Assistant"
        />
      </Section>

      {/* Footer */}
      <div className="mt-auto pt-6 space-y-1">
        <NavItem to="/settings" icon="⚙️" label="Settings" />
        <button
          onClick={() => auth.signOut()}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-300 hover:bg-white/5 w-full"
        >
          <span className="text-lg">🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex justify-between items-center p-4 bg-slate-900 border-b border-white/10">
        <h1 className="text-teal-400 font-bold">🛠 Shimlah</h1>
        <button onClick={() => setOpen(true)} className="text-xl">☰</button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setOpen(false)}>
          <div
            className="w-72 bg-slate-900 h-full p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setOpen(false)} className="mb-4 text-xl">❌</button>
            {menu}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-72 h-screen fixed bg-slate-900 p-5 overflow-y-auto border-r border-white/10">
        {menu}
      </aside>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature={lockedFeature}
      />
    </>
  );
}