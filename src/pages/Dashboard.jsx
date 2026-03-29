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

  // 💰 ✅ SMART PAYMENT VERIFY (LOCALSTORAGE BASED — FIXED)
  useEffect(() => {
    if (!user) return;

    const verifyPayment = async () => {
      const storedRef = localStorage.getItem("paymentReference");
      const storedUser = localStorage.getItem("paymentUserId");

      if (!storedRef || !storedUser) return;

      console.log("🔍 Verifying stored payment...");

      try {
        const res = await fetch("http://localhost:5000/verify-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reference: storedRef,
            userId: storedUser,
          }),
        });

        const data = await res.json();

        if (data.success) {
          alert("🎉 You are now PRO!");

          // ✅ CLEAN STORAGE
          localStorage.removeItem("paymentReference");
          localStorage.removeItem("paymentUserId");

          window.location.reload();
        } else {
          console.log("⚠️ Payment not verified yet");
        }

      } catch (err) {
        console.error("❌ Verify error:", err);
      }
    };

    verifyPayment();
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

      {/* 💎 SUBSCRIPTION */}
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

        <p style={{ marginTop: "10px" }}>
          AI Usage:{" "}
          {userData?.isPro
            ? "Unlimited ♾️"
            : `${userData?.usageCount || 0}/3 used`}
        </p>

        {!userData?.isPro && (
          <div style={{ marginTop: "15px" }}>
            {/* ✅ FIXED: PASS userId */}
            <PayButton email={user.email} userId={user.uid} />
          </div>
        )}
      </div>

      {/* 🔧 FEATURE */}
      <div
        style={{
          marginTop: "20px",
          padding: "20px",
          background: "#0f172a",
          borderRadius: "10px",
        }}
      >
        <h3>🔧 Instant Repair Assistant</h3>

        <p>
          Status:{" "}
          {userData?.isPro
            ? "✅ Unlimited Access"
            : (userData?.usageCount || 0) < 3
              ? "🟡 Limited Free Access"
              : "🔒 Locked"}
        </p>

        {!userData?.isPro && (
          <div style={{ marginTop: "10px" }}>
            {/* ✅ FIXED HERE TOO */}
            <PayButton email={user.email} userId={user.uid} />
          </div>
        )}
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
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </div>
  );
}