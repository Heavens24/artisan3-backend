import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"; // <-- FIXED: removed Suspense, lazy
import { useEffect, useState, Suspense, lazy } from "react"; // <-- ADDED Suspense, lazy HERE
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

// LAZY PAGES - #9 Code Split: only load when visited
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

// Keep Login/Register eager - needed immediately for auth
import Login from "./pages/Login";
import Register from "./pages/Register";

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

// Loading fallback for lazy routes
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="text-gray-400">Loading...</div>
  </div>
);

function AppRoutes() {
  const { user } = useAuth();

  // 🔔 GLOBAL CHAT SOUND
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
  }, );

  return (
    <Suspense fallback={<PageLoader />}> {/* <-- WRAP ALL ROUTES #9 */}
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* PAYMENT CALLBACK - No auth needed, Paystack redirects here */}
        <Route path="/payment-success" element={<PaymentSuccess />} />

        {/* PUBLIC JOB BOARD - SEO + No Auth */}
        <Route path="/jobs" element={<PublicJobs />} />
        <Route path="/jobs/:jobId" element={<PublicJobs />} />

        {/* FREE ROUTES */}
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

        {/* PRO ROUTES - R10/month required */}
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