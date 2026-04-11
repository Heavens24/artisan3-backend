import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useRef } from "react";

import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import NotificationProvider, {
  notifyInfo,
} from "./components/NotificationProvider";

import {
  requestPermission,
  listenNotifications,
} from "./firebase-messaging";

import {
  doc,
  updateDoc,
  serverTimestamp,
  collection,
  onSnapshot,
} from "firebase/firestore";

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
import Wallet from "./pages/Wallet";
import Admin from "./pages/Admin"; // 🧑‍💼 NEW

import Login from "./pages/Login";
import Register from "./pages/Register";

// 🔊 SOUND
const playSound = () => {
  const audio = new Audio("/notify.mp3");
  audio.play().catch(() => {});
};

// 🔐 NORMAL PROTECTED
function Protected({ children }) {
  const { user } = useAuth();

  if (user === undefined) {
    return <p className="p-6 text-white">Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// 🧑‍💼 ADMIN PROTECTED (NEW 🔥)
function AdminProtected({ children }) {
  const { user } = useAuth();

  if (user === undefined) {
    return <p className="p-6 text-white">Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ⚠️ Safe fallback
  if (!user.role || user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// 🚀 ROUTES
function AppRoutes() {
  const { user } = useAuth();
  const triggeredReminders = useRef(new Set());

  // 🔔 PUSH NOTIFICATIONS
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

  // 🟢 ONLINE PRESENCE
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

  // 🔥 SMART REMINDERS
  useEffect(() => {
    if (!user) return;

    const q = collection(db, "maintenance_logs");

    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docs.forEach((docItem) => {
        const log = docItem.data();

        if (!log.nextMaintenance) return;

        const id = docItem.id;

        const next = new Date(
          log.nextMaintenance.seconds * 1000
        );

        const diff =
          (next - new Date()) / (1000 * 60 * 60 * 24);

        if (diff <= 1 && diff > 0 && !triggeredReminders.current.has(id)) {
          triggeredReminders.current.add(id);

          notifyInfo(`🔧 Maintenance due: ${log.title}`);
          playSound();
        }
      });
    });

    return () => unsub();
  }, [user]);

  if (user === undefined) {
    return <p className="p-6 text-white">Loading app...</p>;
  }

  return (
    <Routes>
      {/* DEFAULT */}
      <Route path="/" element={<Navigate to="/dashboard" />} />

      {/* AUTH */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* PROTECTED ROUTES */}
      {[
        ["/dashboard", <Dashboard />],
        ["/tasks", <Tasks />],
        ["/tools", <Tools />],
        ["/logs", <MaintenanceLogs />],
        ["/knowledge", <Knowledge />],
        ["/ai", <AI />],
        ["/chat", <ChatList />],
        ["/chat/:chatId", <PrivateChat />],
        ["/marketplace", <Marketplace />],
        ["/applications", <Applications />],
        ["/wallet", <Wallet />],
        ["/become-artisan", <BecomeArtisan />],
      ].map(([path, component]) => (
        <Route
          key={path}
          path={path}
          element={
            <Protected>
              <Layout>{component}</Layout>
            </Protected>
          }
        />
      ))}

      {/* 🧑‍💼 ADMIN ROUTE (NEW 🔥) */}
      <Route
        path="/admin"
        element={
          <AdminProtected>
            <Layout>
              <Admin />
            </Layout>
          </AdminProtected>
        }
      />

      {/* 💳 PAYMENT */}
      <Route path="/payment-success" element={<PaymentSuccess />} />
    </Routes>
  );
}

// 🌍 ROOT
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NotificationProvider />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}