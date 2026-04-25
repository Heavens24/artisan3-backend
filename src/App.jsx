import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, Suspense, lazy } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import NotificationProvider from "./components/NotificationProvider";
import { HelmetProvider } from "react-helmet-async";

import {
  collection,
  onSnapshot,
  query,
  where,
  doc
} from "firebase/firestore";

import { db } from "./firebase";

// LAZY PAGES
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Tools = lazy(() => import("./pages/Tools"));
const MaintenanceLogs = lazy(() => import("./pages/MaintenanceLogs"));
const AI = lazy(() => import("./pages/AI"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Verification = lazy(() => import("./pages/Verification"));
const PublicJobs = lazy(() => import("./pages/PublicJobs"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const Settings = lazy(() => import("./pages/Settings"));
const ChatList = lazy(() => import("./pages/ChatList"));
const PrivateChat = lazy(() => import("./pages/PrivateChat"));
const MyJobs = lazy(() => import("./pages/MyJobs"));
const Applications = lazy(() => import("./pages/Applications"));
const Marketplace = lazy(() => import("./pages/Marketplace"));

import Login from "./pages/Login";
import Register from "./pages/Register";

// 🔥 INSTALL BUTTON COMPONENT
function InstallButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.deferredPrompt) {
      setVisible(true);
    }

    const handler = () => {
      if (window.deferredPrompt) setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!window.deferredPrompt) return;

    window.deferredPrompt.prompt();
    const choice = await window.deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      console.log("✅ App installed");
      setVisible(false);
    }

    window.deferredPrompt = null;
  };

  if (!visible) return null;

  return (
    <button
      onClick={handleInstall}
      className="fixed bottom-20 right-4 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg shadow-lg z-50"
    >
      Install App
    </button>
  );
}

function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return children;
}

function ProProtected({ children }) {
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      setUserData(snap.data() || {});
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  if (loading) return <div className="p-6 text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!userData?.isPro) return <Navigate to="/dashboard" />;
  return children;
}

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="text-gray-400">Loading...</div>
  </div>
);

function AppRoutes() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      snap.docs.forEach((docSnap) => {
        const chat = docSnap.data();
        if (chat.lastMessage && chat.seen?.[user.uid] === false) {
          const audio = new Audio("/message.mp3");
          audio.volume = 0.5;
          audio.play().catch(() => {});
        }
      });
    });

    return () => unsub();
  }, [user?.uid]);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/jobs" element={<PublicJobs />} />
        <Route path="/jobs/:jobId" element={<PublicJobs />} />

        {[
          ["/dashboard", <Dashboard />],
          ["/tasks", <Tasks />],
          ["/tools", <Tools />],
          ["/logs", <MaintenanceLogs />],
          ["/ai", <AI />],
          ["/notifications", <Notifications />],
          ["/verification", <Verification />],
          ["/settings", <Settings />],
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

        {[
          ["/marketplace", <Marketplace />],
          ["/my-jobs", <MyJobs />],
          ["/applications", <Applications />],
          ["/chat", <ChatList />],
          ["/chat/:chatId", <PrivateChat />],
        ].map(([path, component]) => (
          <Route
            key={path}
            path={path}
            element={
              <Protected>
                <ProProtected>
                  <Layout>{component}</Layout>
                </ProProtected>
              </Protected>
            }
          />
        ))}
      </Routes>

      {/* 🔥 INSTALL BUTTON */}
      <InstallButton />
    </Suspense>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <BrowserRouter>
          <NotificationProvider />
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </HelmetProvider>
  );
}