import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  updateDoc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import Reviews from "../components/Reviews";
import CreateJobModal from "../components/CreateJobModal";
import { notifySuccess, notifyError } from "../components/NotificationProvider";
import useNotificationTriggers from "../hooks/useNotificationTriggers";
import { getUserCurrency, getProPrice, formatPrice } from "../utils/currency";

const LOW_STOCK_THRESHOLD = 2;

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [userData, setUserData] = useState(null);
  const [tools, setTools] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [userCurrency, setUserCurrency] = useState('ZAR');

  useEffect(() => {
    getUserCurrency().then(setUserCurrency);
  }, []);

  const switchRole = async () => {
    try {
      setSwitching(true);
      const newRole = userData?.role === "client"? "artisan" : "client";
      await updateDoc(doc(db, "users", user.uid), { role: newRole });
      notifySuccess(`Switched to ${newRole}`);
    } catch (err) {
      console.error("Role switch failed:", err.message);
      notifyError(err.code === 'permission-denied'
       ? "Can't switch roles right now"
        : "Role switch failed");
    } finally {
      setSwitching(false);
    }
  };

  // User + Tools + Logs listeners
  useEffect(() => {
    if (!user?.uid) return;

    const unsubUser = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        setUserData(snap.data() || {});
        setLoading(false);
      },
      (err) => {
        console.error("User listener error:", err);
        setLoading(false);
      }
    );

    const unsubTools = onSnapshot(
      query(collection(db, "tools"), where("userId", "==", user.uid)),
      (snap) => {
        if (snap.metadata.hasPendingWrites &&!snap.metadata.fromCache) return;
        const data = snap.docs.map((d) => ({ id: d.id,...d.data() }))
         .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setTools(data);
      },
      (err) => {
        console.error("Tools listener error:", err);
        setTools([]);
      }
    );

    const unsubLogs = onSnapshot(
      query(collection(db, "maintenance_logs"), where("userId", "==", user.uid)),
      (snap) => {
        if (snap.metadata.hasPendingWrites &&!snap.metadata.fromCache) return;
        const data = snap.docs.map((d) => ({ id: d.id,...d.data() }))
         .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setLogs(data);
      },
      (err) => {
        console.error("Logs listener error:", err);
        setLogs([]);
      }
    );

    return () => {
      unsubUser();
      unsubTools();
      unsubLogs();
    };
  }, [user?.uid]);

  // Jobs listener – reacts to role change
  useEffect(() => {
    if (!user?.uid ||!userData?.role) return;

    const jobsQ = userData.role === "artisan"
     ? query(collection(db, "jobs"), where("artisanId", "==", user.uid))
      : query(collection(db, "jobs"), where("createdBy", "==", user.uid));

    const unsubJobs = onSnapshot(
      jobsQ,
      (snap) => setJobs(snap.docs.map((d) => ({ id: d.id,...d.data() }))),
      (err) => {
        console.error("Jobs listener error:", err);
        setJobs([]);
      }
    );

    return () => unsubJobs();
  }, [user?.uid, userData?.role]);

  // SMART KPIs – uses tools + logs + jobs
  const stats = useMemo(() => {
    const now = Date.now();

    // Tools
    const toolsValue = tools.reduce((sum, t) => sum + (Number(t.purchasePrice || 0) * t.quantity), 0);
    const lowStockTools = tools.filter(t => t.quantity > 0 && t.quantity <= LOW_STOCK_THRESHOLD);
    const outOfStockTools = tools.filter(t => t.quantity <= 0);
    const poorTools = tools.filter(t => t.condition === "poor");

    // Logs
    const pendingLogs = logs.filter(l => l.status === "pending");
    const overdueLogs = pendingLogs.filter(l => {
      const dueDate = (l.createdAt?.toMillis() || 0) + (l.intervalDays || 30) * 86400000;
      return dueDate < now;
    });

    // Jobs
    const completed = jobs.filter(j => j.status === "completed");
    const totalIncome = completed.reduce((sum, j) => sum + Number(j.paymentAmount || 0), 0);
    const totalToolCost = completed.reduce((sum, j) => sum + Number(j.toolCost || 0), 0);
    const profit = totalIncome - totalToolCost;

    return {
      toolsCount: tools.length,
      toolsValue,
      lowStock: lowStockTools.length,
      outOfStock: outOfStockTools.length,
      poorTools: poorTools.length,
      jobsCount: jobs.length,
      completed: completed.length,
      pending: jobs.filter(j => j.status!== "completed").length,
      profit,
      pendingLogs: pendingLogs.length,
      overdueLogs: overdueLogs.length,
      lowStockTools,
      overdueLogsList: overdueLogs,
      poorToolsList: poorTools
    };
  }, [jobs, tools, logs]);

  // PHASE 2: Fire notification checks for low stock + overdue
  useNotificationTriggers(user, tools, logs);

  const logout = async () => await signOut(auth);

  const handlePayment = async () => {
    try {
      if (!user?.email) return notifyError("User not authenticated");
      setPaying(true);

      const amount = getProPrice(userCurrency);
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

      const res = await fetch(`${API_URL}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          amount,
          userId: user.uid,
          jobId: "subscription",
          currency: userCurrency
        }),
      });
      const data = await res.json();
      if (!res.ok ||!data?.authorization_url) {
        throw new Error(data.error || "Payment failed");
      }
      window.location.href = data.authorization_url;
    } catch (err) {
      console.error("Payment error:", err.message);
      notifyError(err.message);
      setPaying(false);
    }
  };

  const kpiCards = [
    {
      label: "Asset Value",
      value: `R${stats.toolsValue.toFixed(0)}`,
      onClick: () => navigate("/tools"),
      color: "text-cyan-400"
    },
    {
      label: "Low Stock",
      value: stats.lowStock,
      onClick: () => navigate("/tools"),
      color: stats.lowStock > 0? "text-yellow-400" : "text-gray-400",
      alert: stats.lowStock > 0
    },
    {
      label: "Needs Repair",
      value: stats.poorTools,
      onClick: () => navigate("/tools"),
      color: stats.poorTools > 0? "text-orange-400" : "text-gray-400",
      alert: stats.poorTools > 0
    },
    {
      label: "Overdue Tasks",
      value: stats.overdueLogs,
      onClick: () => navigate("/logs"),
      color: stats.overdueLogs > 0? "text-red-400" : "text-gray-400",
      alert: stats.overdueLogs > 0
    },
    {
      label: "Jobs Completed",
      value: stats.completed,
      onClick: () => navigate(userData?.role === "artisan"? "/my-jobs" : "/marketplace")
    },
    {
      label: "Agreed Quotes",
      value: `R${stats.profit.toFixed(0)}`,
      color: "text-green-400"
    }
  ];

  if (!user || loading) {
    return <div className="p-6 text-white">Loading dashboard...</div>;
  }

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-7xl mx-auto p-6">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">⚡ Live System Insights</h1>
            <p className="text-gray-400 text-sm">{user.email}</p>
            <p className="text-xs mt-1 text-teal-400">Role: {userData?.role || "client"}</p>
            <p className="text-xs mt-1 text-yellow-400">
              Plan: {userData?.isPro? "Pro 🚀" : "Free"}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={switchRole}
              disabled={switching}
              className="bg-purple-500 px-4 py-2 rounded-lg hover:scale-[1.05] transition disabled:opacity-50"
            >
              {switching? "Switching..." : `Switch to ${userData?.role === "client"? "Artisan" : "Client"}`}
            </button>

            <button
              onClick={logout}
              className="bg-red-500 px-4 py-2 rounded-lg hover:scale-[1.05] transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* CLIENT ACTION */}
        {userData?.role === "client" && (
          <div className="mb-6">
            <button
              onClick={() => userData?.isPro? setShowModal(true) : notifyError("Upgrade to Pro to post jobs")}
              className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-xl font-semibold transition hover:scale-[1.03]"
            >
              ⚡ Find Artisan Now
            </button>
          </div>
        )}

        {/* ALERTS */}
        {(stats.overdueLogs > 0 || stats.lowStock > 0 || stats.poorTools > 0) && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl mb-6">
            <p className="font-semibold text-red-400 mb-2">⚠️ Action Required</p>
            <div className="text-sm space-y-1">
              {stats.overdueLogs > 0 && <p>• {stats.overdueLogs} maintenance task{stats.overdueLogs > 1? 's' : ''} overdue</p>}
              {stats.lowStock > 0 && <p>• {stats.lowStock} tool{stats.lowStock > 1? 's' : ''} low on stock</p>}
              {stats.poorTools > 0 && <p>• {stats.poorTools} tool{stats.poorTools > 1? 's' : ''} need repair</p>}
            </div>
          </div>
        )}

        {/* KPI CARDS – CLICKABLE */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {kpiCards.map((card, i) => (
            <div
              key={i}
              onClick={card.onClick}
              className={`bg-white/5 p-4 rounded-2xl text-center transition hover:scale-[1.02] ${
                card.onClick? 'cursor-pointer hover:bg-white/10' : ''
              } ${card.alert? 'ring-2 ring-red-500/50' : ''}`}
            >
              <p className="text-gray-400 text-sm">{card.label}</p>
              <h2 className={`text-2xl font-bold mt-1 ${card.color || ""}`}>{card.value}</h2>
            </div>
          ))}
        </div>

        {/* SUBSCRIPTION */}
        <div className="bg-white/5 p-6 rounded-2xl mb-8">
          <p className="text-lg font-semibold">
            {userData?.isPro? "✅ Pro Plan Active" : "🆓 Free Plan"}
          </p>
          {!userData?.isPro && (
            <>
              <p className="text-sm text-gray-400 mt-2">
                Upgrade to access Marketplace, Jobs, Applications, and Chat with clients/artisans.
              </p>
              <button
                onClick={handlePayment}
                disabled={paying}
                className="bg-cyan-500 px-6 py-3 rounded-xl mt-4 hover:bg-cyan-600 transition hover:scale-[1.03] disabled:opacity-50"
              >
                {paying? "Processing..." : `Upgrade to Pro (${formatPrice(getProPrice(userCurrency), userCurrency)}/month)`}
              </button>
            </>
          )}
        </div>

        {/* REVIEWS */}
        <Reviews />

        {/* JOB MODAL */}
        {showModal && <CreateJobModal onClose={() => setShowModal(false)} />}
      </div>
    </div>
  );
}