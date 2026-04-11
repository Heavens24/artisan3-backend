import { useState } from "react";
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch {
      setMessage("❌ Login failed. Check your details.");
    }
  };

  const handleReset = async () => {
    if (!email) {
      return setMessage("⚠️ Enter your email first");
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("📩 Password reset email sent!");
    } catch {
      setMessage("❌ Failed to send reset email");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">

      <div className="bg-white/5 backdrop-blur-lg p-8 rounded-2xl border border-white/10 shadow-xl w-[350px]">

        <h2 className="text-2xl font-bold text-center mb-6">
          🔐 Welcome Back
        </h2>

        <input
          placeholder="Email"
          className="w-full mb-3 p-3 rounded bg-white/10 outline-none"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full mb-2 p-3 rounded bg-white/10 outline-none"
          onChange={(e) => setPassword(e.target.value)}
        />

        <div
          onClick={handleReset}
          className="text-sm text-blue-400 cursor-pointer mb-4 hover:underline"
        >
          Forgot password?
        </div>

        <button
          onClick={login}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 py-2 rounded-lg font-semibold hover:opacity-90"
        >
          Login
        </button>

        <p className="text-sm text-center mt-4">
          No account?{" "}
          <Link to="/register" className="text-cyan-400">
            Register
          </Link>
        </p>

        {message && (
          <p className="text-center mt-3 text-sm text-yellow-400">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}