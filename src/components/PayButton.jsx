import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { notifyError } from "../components/NotificationProvider";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function PayButton() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const payNow = async () => {
    try {
      if (!user?.email) return notifyError("Not authenticated");

      setLoading(true);

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
      if (!res.ok ||!data?.authorization_url) {
        throw new Error(data.error || "Payment failed");
      }

      window.location.href = data.authorization_url;
    } catch (err) {
      console.error(err);
      notifyError("Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={payNow}
      className="bg-cyan-500 px-6 py-3 rounded-xl hover:bg-cyan-600 transition disabled:opacity-50"
      disabled={loading}
    >
      {loading? "Processing..." : "Upgrade to Pro (R10/month)"}
    </button>
  );
}