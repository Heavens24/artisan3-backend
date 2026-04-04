import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";

import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";

import {
  requestPermission,
  listenNotifications,
} from "./firebase-messaging";

import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

// Pages
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Tools from "./pages/Tools";
import MaintenanceLogs from "./pages/MaintenanceLogs";
import Knowledge from "./pages/Knowledge";
import AI from "./pages/AI";
import ChatList from "./pages/ChatList";
import PrivateChat from "./pages/PrivateChat";
import BecomeArtisan from "./pages/BecomeArtisan";
import Marketplace from "./pages/Marketplace";
import Applications from "./pages/Applications";
import PaymentSuccess from "./pages/PaymentSuccess";
import Wallet from "./pages/Wallet"; // 💰 NEW

import Login from "./pages/Login";
import Register from "./pages/Register";

// 🔐 Protected Route
function Protected({ children }) {
  const { user } = useAuth();

  if (user === undefined) {
    return <p style={{ padding: "20px" }}>Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// 🚀 Routes
function AppRoutes() {
  const { user } = useAuth();

  // 🔔 Notifications
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        if (!user) return;
        await requestPermission();
        if (isMounted) listenNotifications();
      } catch (err) {
        console.log("Notification error:", err);
      }
    };

    init();
    return () => (isMounted = false);
  }, [user]);

  // 🟢 Online Presence
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    const goOnline = () =>
      updateDoc(userRef, {
        online: true,
        lastSeen: serverTimestamp(),
      }).catch(() => {});

    const goOffline = () =>
      updateDoc(userRef, {
        online: false,
        lastSeen: serverTimestamp(),
      }).catch(() => {});

    goOnline();
    window.addEventListener("beforeunload", goOffline);

    return () => {
      goOffline();
      window.removeEventListener("beforeunload", goOffline);
    };
  }, [user]);

  if (user === undefined) {
    return <p style={{ padding: "20px" }}>Loading app...</p>;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {user && <Sidebar />}

      <div
        style={{
          flex: 1,
          padding: "20px",
          marginLeft: user ? "240px" : "0",
        }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/tasks" element={<Protected><Tasks /></Protected>} />
          <Route path="/tools" element={<Protected><Tools /></Protected>} />
          <Route path="/logs" element={<Protected><MaintenanceLogs /></Protected>} />
          <Route path="/knowledge" element={<Protected><Knowledge /></Protected>} />
          <Route path="/ai" element={<Protected><AI /></Protected>} />

          {/* 💬 CHAT */}
          <Route path="/chat" element={<Protected><ChatList /></Protected>} />
          <Route path="/chat/:chatId" element={<Protected><PrivateChat /></Protected>} />

          {/* 🧑‍🔧 MARKETPLACE */}
          <Route path="/marketplace" element={<Protected><Marketplace /></Protected>} />
          <Route path="/applications" element={<Protected><Applications /></Protected>} />

          {/* 💰 WALLET */}
          <Route path="/wallet" element={<Protected><Wallet /></Protected>} />

          {/* 💳 PAYMENT */}
          <Route path="/payment-success" element={<PaymentSuccess />} />

          <Route path="/become-artisan" element={<Protected><BecomeArtisan /></Protected>} />
        </Routes>
      </div>
    </div>
  );
}

// 🌍 ROOT
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}