import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where
} from "firebase/firestore";

import PayButton from "../components/PayButton";

// 📊 CHARTS
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

export default function Dashboard() {
  const { user } = useAuth();

  const [userData, setUserData] = useState(null);
  const [tools, setTools] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔄 USER DATA
  useEffect(() => {
    if (!user) return;

    const ref = doc(db, "users", user.uid);
    return onSnapshot(ref, (docSnap) => {
      setUserData(docSnap.data());
      setLoading(false);
    });
  }, [user]);

  // 🔄 TOOLS
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "tools"),
      where("userId", "==", user.uid)
    );

    return onSnapshot(q, (snapshot) => {
      setTools(snapshot.docs.map(doc => doc.data()));
    });
  }, [user]);

  // 🔄 LOGS
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "maintenanceLogs"),
      where("userId", "==", user.uid)
    );

    return onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => doc.data()));
    });
  }, [user]);

  // 💰 PAYMENT VERIFY (UNCHANGED)
  useEffect(() => {
    if (!user) return;

    const verifyPayment = async () => {
      const ref = localStorage.getItem("paymentReference");
      const uid = localStorage.getItem("paymentUserId");

      if (!ref || !uid) return;

      try {
        const res = await fetch("http://localhost:5000/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: ref, userId: uid }),
        });

        const data = await res.json();

        if (data.success) {
          alert("🎉 You are now PRO!");
          localStorage.clear();
          window.location.reload();
        }
      } catch (err) {
        console.error(err);
      }
    };

    verifyPayment();
  }, [user]);

  // 📊 ANALYTICS DATA
  const completed = logs.filter(l => l.status === "completed").length;
  const pending = logs.length - completed;

  const jobData = [
    { name: "Completed", value: completed },
    { name: "Pending", value: pending }
  ];

  const toolData = tools.map(t => ({
    name: t.name,
    uses: t.totalUses || 0
  }));

  // 🔐 LOGOUT
  const logout = async () => {
    await signOut(auth);
  };

  if (!user || loading) {
    return <p style={{ padding: 30, color: "white" }}>Loading...</p>;
  }

  return (
    <div style={{ padding: 30, color: "white" }}>

      <h1>👋 Welcome</h1>
      <p>{user.email}</p>

      {/* 💎 SUB */}
      <div style={card}>
        <h3>💎 Subscription</h3>

        <p>
          {userData?.isPro
            ? "💎 Pro Plan — Unlimited"
            : "Free Plan"}
        </p>

        {!userData?.isPro && (
          <PayButton email={user.email} userId={user.uid} amount={50} />
        )}
      </div>

      {/* 📊 CHARTS */}
      <h2 style={{ marginTop: 30 }}>📊 Analytics</h2>

      {/* 🟦 TOOL USAGE BAR */}
      <div style={card}>
        <h3>🧰 Tool Usage</h3>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={toolData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="uses" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 🟣 JOB STATUS PIE */}
      <div style={{ ...card, marginTop: 20 }}>
        <h3>📋 Job Status</h3>

        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={jobData}
              dataKey="value"
              nameKey="name"
              outerRadius={100}
              label
            >
              {jobData.map((entry, index) => (
                <Cell key={index} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 🔧 FEATURE LOCK */}
      <div style={{ ...card, marginTop: 20 }}>
        <h3>🔧 Instant Repair Assistant</h3>

        <p>
          {userData?.isPro
            ? "✅ Unlimited"
            : "🔒 Upgrade to unlock"}
        </p>

        {!userData?.isPro && (
          <PayButton email={user.email} userId={user.uid} amount={50} />
        )}
      </div>

      <button onClick={logout} style={logoutBtn}>
        Logout
      </button>
    </div>
  );
}

// 🎨 STYLES
const card = {
  background: "#1e293b",
  padding: "20px",
  borderRadius: "10px",
  marginTop: "20px"
};

const logoutBtn = {
  marginTop: "30px",
  padding: "10px",
  background: "red",
  border: "none",
  borderRadius: "6px",
  color: "white",
  cursor: "pointer"
};