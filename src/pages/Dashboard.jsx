import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
} from "firebase/firestore";

import Reviews from "../components/Reviews";

export default function Dashboard() {
  const { user } = useAuth();

  const [userData, setUserData] = useState(null);
  const [tools, setTools] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false); // 🔥 prevent spam clicks

  // 🔥 SAFE DATA LOADING
  useEffect(() => {
    if (!user) return;

    console.log("✅ AUTH READY:", user.uid);

    const unsubUser = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        setUserData(snap.data() || {});
        setLoading(false);
      },
      (err) => {
        console.warn("⚠️ User listener:", err.message);
        setLoading(false);
      }
    );

    const toolsQuery = query(
      collection(db, "tools"),
      where("userId", "==", user.uid)
    );

    const unsubTools = onSnapshot(
      toolsQuery,
      (snap) => {
        setTools(snap.docs.map((d) => d.data()));
      },
      (err) => {
        console.warn("⚠️ Tools blocked:", err.message);
        setTools([]);
      }
    );

    const logsQuery = query(
      collection(db, "maintenance_logs"),
      where("userId", "==", user.uid)
    );

    const unsubLogs = onSnapshot(
      logsQuery,
      (snap) => {
        setLogs(snap.docs.map((d) => d.data()));
      },
      (err) => {
        console.warn("⚠️ Logs blocked:", err.message);
        setLogs([]);
      }
    );

    return () => {
      unsubUser();
      unsubTools();
      unsubLogs();
    };
  }, [user]);

  const completed = logs.filter((l) => l.status === "completed").length;
  const pending = logs.length - completed;

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  // 💳 FINAL PAYMENT HANDLER (FIXED 🔥)
  const handlePayment = async () => {
    try {
      if (!user?.email || !user?.uid) {
        alert("User not authenticated");
        return;
      }

      setPaying(true);
      console.log("🚀 Starting payment...");

      const res = await fetch("http://127.0.0.1:5000/pay", { // 🔥 FIXED HERE
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount: 100,
          userId: user.uid,
          jobId: "subscription",
        }),
      });

      const data = await res.json();

      console.log("💳 FULL PAYMENT RESPONSE:", data);

      if (!res.ok) {
        throw new Error(data.error || "Payment failed");
      }

      if (!data?.authorization_url) {
        throw new Error("No payment URL returned");
      }

      // ✅ REDIRECT TO PAYSTACK
      window.location.href = data.authorization_url;

    } catch (err) {
      console.error("❌ PAYMENT ERROR:", err.message);
      alert(err.message || "Payment failed ❌");
      setPaying(false);
    }
  };

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
          </div>

          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg"
          >
            Logout
          </button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: "Tools Managed", value: tools.length },
            { label: "Jobs Tracked", value: logs.length },
            { label: "Completed", value: completed },
            { label: "Pending", value: pending },
          ].map((card, i) => (
            <div
              key={i}
              className="bg-white/5 p-6 rounded-2xl border text-center hover:scale-[1.02] transition"
            >
              <p className="text-gray-400">{card.label}</p>
              <h2 className="text-3xl font-bold mt-2">{card.value}</h2>
            </div>
          ))}
        </div>

        {/* SUBSCRIPTION */}
        <div className="bg-white/5 p-6 rounded-2xl border mb-8">
          <h3 className="mb-2">💎 Subscription</h3>
          <p className="mb-4">
            {userData?.isPro ? "Pro Plan Active" : "Free Plan"}
          </p>

          {!userData?.isPro && (
            <button
              onClick={handlePayment}
              disabled={paying}
              className="bg-cyan-500 hover:bg-cyan-600 px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {paying ? "Processing..." : "Upgrade Now"}
            </button>
          )}
        </div>

        <Reviews />
      </div>
    </div>
  );
}