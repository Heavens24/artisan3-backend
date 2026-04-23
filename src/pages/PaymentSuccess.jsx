import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("🔄 Verifying payment...");
  const [loading, setLoading] = useState(true);
  const verified = useRef(false);

  useEffect(() => {
    const verify = async () => {
      if (verified.current) return;
      verified.current = true;

      const reference =
        searchParams.get("reference") || searchParams.get("trxref");

      if (!reference) {
        setStatus("❌ No reference found");
        setLoading(false);
        return;
      }

      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_URL}/verify/${reference}`);

        const data = await res.json();

        if (!data.success) throw new Error(data.error || "Verification failed");

        setStatus("✅ Subscription Activated 🚀");

        setTimeout(() => {
          navigate("/dashboard");
        }, 2500);

      } catch (err) {
        console.error("Verify error:", err);
        setStatus("❌ Verification failed. Contact support if charged.");
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-white bg-slate-900">
      <div className="bg-white/5 p-8 rounded-2xl text-center max-w-md">
        <h2 className="text-xl font-bold">{status}</h2>

        {loading && <p className="mt-3 text-gray-400">Please wait...</p>}

        {!loading && (
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-5 px-5 py-2 bg-blue-500 rounded hover:bg-blue-600 transition"
          >
            Go to Dashboard
          </button>
        )}
      </div>
    </div>
  );
}