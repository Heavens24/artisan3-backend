import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { notifyError } from "./NotificationProvider";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function UpgradeModal({ isOpen, onClose, feature = "this feature" }) {
  const { user } = useAuth();
  const [paying, setPaying] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    try {
      if (!user?.email) return notifyError("User not authenticated");
      setPaying(true);
      const res = await fetch(`${API_URL}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          amount: 10,
          userId: user.uid,
          jobId: "subscription"
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.authorization_url) {
        throw new Error(data.error || "Payment failed");
      }
      window.location.href = data.authorization_url;
    } catch (err) {
      console.error("Payment error:", err.message);
      notifyError(err.message);
      setPaying(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-cyan-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-2xl font-bold mb-2">Unlock Pro</h2>
          <p className="text-gray-400 mb-6">
            Upgrade to access {feature} and connect with clients & artisans.
          </p>

          <div className="bg-white/5 p-4 rounded-xl mb-6 text-left">
            <p className="font-semibold text-cyan-400 mb-2">Pro includes:</p>
            <ul className="text-sm space-y-1 text-gray-300">
              <li>✅ Post & apply to jobs</li>
              <li>✅ Direct chat with clients/artisans</li>
              <li>✅ Manage applications</li>
              <li>✅ Build your reputation</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-600 px-4 py-3 rounded-xl hover:bg-gray-700 transition"
            >
              Maybe Later
            </button>
            <button
              onClick={handleUpgrade}
              disabled={paying}
              className="flex-1 bg-cyan-500 px-4 py-3 rounded-xl hover:bg-cyan-600 transition disabled:opacity-50 font-semibold"
            >
              {paying ? "Processing..." : "Upgrade R10/mo"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">Cancel anytime</p>
        </div>
      </div>
    </div>
  );
}