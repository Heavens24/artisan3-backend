import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("🔄 Verifying payment...");
  const [loading, setLoading] = useState(true);

  const hasVerified = useRef(false);
  const redirectTimer = useRef(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (hasVerified.current) return;
      hasVerified.current = true;

      // 🔥 Support BOTH Paystack params
      const reference =
        searchParams.get("reference") || searchParams.get("trxref");

      if (!reference) {
        setStatus("❌ No payment reference found.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `http://localhost:5000/verify/${reference}`
        );

        // ✅ SAFE PARSE
        const text = await res.text();
        let data;

        try {
          data = JSON.parse(text);
        } catch {
          console.error("❌ Non-JSON response:", text);
          throw new Error("Invalid server response");
        }

        if (!res.ok || !data.success) {
          console.error("❌ Verification failed:", data);
          throw new Error(data.error || "Verification failed");
        }

        console.log("✅ VERIFIED:", data);

        // 🔗 GET JOB ID (backend OR localStorage fallback)
        const jobId =
          data.jobId || localStorage.getItem("paymentJobId");

        if (jobId) {
          try {
            const jobRef = doc(db, "jobs", jobId);
            const jobSnap = await getDoc(jobRef);

            if (!jobSnap.exists()) {
              console.warn("⚠️ Job not found in Firestore");
            } else {
              const jobData = jobSnap.data();

              // 🛑 PREVENT DOUBLE PAYMENT UPDATE
              if (jobData.paid === true) {
                console.log("⚠️ Job already marked as paid");
              } else {
                // ✅ STRICT SAFE UPDATE (matches Firestore rules)
                await updateDoc(jobRef, {
                  paid: true,
                  status: "in_progress",
                  updatedAt: serverTimestamp(),
                });

                console.log("✅ Job updated successfully");
              }
            }
          } catch (firestoreError) {
            console.error(
              "❌ Firestore update failed:",
              firestoreError.message
            );
          }
        } else {
          console.warn("⚠️ No jobId found");
        }

        // 🧹 CLEANUP
        localStorage.removeItem("paymentJobId");

        setStatus("✅ Payment successful! 🚀");
        setLoading(false);

        // 🚀 AUTO REDIRECT
        redirectTimer.current = setTimeout(() => {
          navigate("/dashboard");
        }, 3000);

      } catch (err) {
        console.error("❌ ERROR:", err.message);
        setStatus("❌ Payment verification failed.");
        setLoading(false);
      }
    };

    verifyPayment();

    // 🧼 CLEANUP TIMER (IMPORTANT)
    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
    };
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-white bg-slate-900">
      <div className="bg-white/5 p-8 rounded-2xl border border-white/10 text-center w-[90%] max-w-md">

        <h2 className="text-xl font-semibold">{status}</h2>

        {/* 🔄 LOADING */}
        {loading && (
          <p className="text-sm mt-3 opacity-70">
            Please wait while we confirm your payment...
          </p>
        )}

        {/* 🔘 FALLBACK BUTTON */}
        {!loading && (
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-5 px-5 py-2 bg-blue-500 hover:bg-blue-600 transition rounded-lg"
          >
            Go to Dashboard
          </button>
        )}
      </div>
    </div>
  );
}