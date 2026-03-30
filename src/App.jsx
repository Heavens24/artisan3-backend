import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";

import { AuthProvider, useAuth } from "./context/AuthContext";

import Sidebar from "./components/Sidebar";

// 🔔 FCM
import {
  requestPermission,
  listenNotifications,
} from "./firebase-messaging";

// Pages
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Tools from "./pages/Tools";
import Logs from "./pages/Logs";
import Knowledge from "./pages/Knowledge";
import AI from "./pages/AI";

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

// 🚀 Routes Component
function AppRoutes() {
  const { user } = useAuth();

  // 🔔 SAFE FCM INIT (ULTRA STABLE)
  useEffect(() => {
    let isMounted = true;

    const initFCM = async () => {
      try {
        // ✅ Only run in browser
        if (typeof window === "undefined") return;

        // ✅ Check support
        if (!("Notification" in window)) {
          console.log("❌ Notifications not supported");
          return;
        }

        // ⚠️ IMPORTANT: Wait for user to exist
        if (!user) {
          console.log("⏳ Waiting for user before FCM...");
          return;
        }

        // 🔔 Request + Save Token
        await requestPermission();

        // 🔔 Listen for messages
        if (isMounted) {
          listenNotifications();
        }

      } catch (err) {
        console.log("⚠️ FCM skipped safely:", err.message);
      }
    };

    initFCM();

    return () => {
      isMounted = false;
    };
  }, [user]); // ✅ IMPORTANT FIX (runs when user is ready)

  // 🛑 Prevent white screen
  if (user === undefined) {
    return <p style={{ padding: "20px" }}>Loading app...</p>;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      {user && <Sidebar />}

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          padding: "20px",
          marginLeft: user ? "220px" : "0",
        }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected */}
          <Route
            path="/dashboard"
            element={<Protected><Dashboard /></Protected>}
          />

          <Route
            path="/tasks"
            element={<Protected><Tasks /></Protected>}
          />

          <Route
            path="/tools"
            element={<Protected><Tools /></Protected>}
          />

          <Route
            path="/logs"
            element={<Protected><Logs /></Protected>}
          />

          <Route
            path="/knowledge"
            element={<Protected><Knowledge /></Protected>}
          />

          <Route
            path="/ai"
            element={<Protected><AI /></Protected>}
          />
        </Routes>
      </div>
    </div>
  );
}

// 🌍 App Root
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}