import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";

import Sidebar from "./components/Sidebar";

// Pages
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Tools from "./pages/Tools";
import Logs from "./pages/Logs";
import Knowledge from "./pages/Knowledge";
import AI from "./pages/AI"; // ✅ AI ADDED

import Login from "./pages/Login";
import Register from "./pages/Register";

// 🔐 Protected Route
function Protected({ children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;
  return children;
}

// Routes
function AppRoutes() {
  return (
    <>
      <Sidebar />

      <div style={{ marginLeft: "220px", padding: "20px" }}>
        <Routes>

          <Route path="/" element={<Navigate to="/dashboard" />} />

          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected */}
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/tasks" element={<Protected><Tasks /></Protected>} />
          <Route path="/tools" element={<Protected><Tools /></Protected>} />
          <Route path="/logs" element={<Protected><Logs /></Protected>} />
          <Route path="/knowledge" element={<Protected><Knowledge /></Protected>} />

          {/* ✅ AI ROUTE */}
          <Route path="/ai" element={<Protected><AI /></Protected>} />

        </Routes>
      </div>
    </>
  );
}

// App
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}