import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import PayButton from "../components/PayButton";

export default function Dashboard() {
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔄 REAL-TIME USER DATA
  useEffect(() => {
    if (!user) return;

    const ref = doc(db, "users", user.uid);

    const unsub = onSnapshot(ref, (docSnap) => {
      setUserData(docSnap.data());
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  // 🔐 LOGOUT
  const logout = async () => {
    await signOut(auth);
  };

  if (!user || loading) {
    return <p style={{ padding: "30px", color: "white" }}>Loading...</p>;
  }

  return (
    <div style={{ padding: "30px", color: "white" }}>
      
      {/* 👋 HEADER */}
      <h1>👋 Welcome</h1>
      <p>{user.email}</p>

      {/* 💎 SUBSCRIPTION CARD */}
      <div
        style={{
          marginTop: "20px",
          padding: "20px",
          background: "#1e293b",
          borderRadius: "10px",
        }}
      >
        <h3>💎 Subscription</h3>

        <p>
          {userData?.isPro
            ? "💎 Pro Plan — Unlimited Access"
            : "Free Plan"}
        </p>

        {/* 📊 USAGE DISPLAY */}
        <p style={{ marginTop: "10px" }}>
          AI Usage:{" "}
          {userData?.isPro
            ? "Unlimited ♾️"
            : `${userData?.usageCount || 0}/3 used`}
        </p>

        {/* 💳 PAYSTACK BUTTON */}
        {!userData?.isPro && (
          <div style={{ marginTop: "15px" }}>
            <PayButton
              email={user.email}
              amount={50}
              userId={user.uid} // ✅ FIXED
            />
          </div>
        )}
      </div>

      {/* 🔧 CORE FEATURE */}
      <div
        style={{
          marginTop: "20px",
          padding: "20px",
          background: "#0f172a",
          borderRadius: "10px",
        }}
      >
        <h3>🔧 Instant Repair Assistant</h3>
        <p style={{ color: "#94a3b8" }}>
          Fix problems in minutes using AI-powered diagnostics
        </p>

        <p style={{ marginTop: "10px" }}>
          Status:{" "}
          {userData?.isPro
            ? "✅ Unlimited Access"
            : (userData?.usageCount || 0) < 3
              ? "🟡 Limited Free Access"
              : "🔒 Locked (Upgrade Required)"}
        </p>

        {!userData?.isPro && (
          <div style={{ marginTop: "10px" }}>
            <PayButton
              email={user.email}
              amount={50}
              userId={user.uid} // ✅ FIXED
            />
          </div>
        )}
      </div>

      {/* 📊 FEATURES STATUS */}
      <div style={{ marginTop: "20px" }}>
        <h3>🧠 Features Status</h3>

        <p>
          Tasks:{" "}
          {userData?.isPro
            ? "Unlimited"
            : "3 Free Requests"}
        </p>

        <p>
          Priority Support:{" "}
          {userData?.isPro
            ? "Enabled ⚡"
            : "Standard"}
        </p>

        <p>
          Instant Repair Assistant:{" "}
          {userData?.isPro
            ? "Unlimited Access ✅"
            : (userData?.usageCount || 0) < 3
              ? "Available (Limited) 🟡"
              : "Locked 🔒"}
        </p>
      </div>

      {/* 🚪 LOGOUT */}
      <button
        onClick={logout}
        style={{
          marginTop: "30px",
          padding: "10px",
          background: "red",
          border: "none",
          borderRadius: "6px",
          color: "white",
          cursor: "pointer"
        }}
      >
        Logout
      </button>
    </div>
  );
}