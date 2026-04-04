import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { doc, updateDoc, getDoc, setDoc, increment } from "firebase/firestore";
import { db } from "../firebase";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("Verifying payment...");
  const hasVerified = useRef(false);

  useEffect(() => {
    const verifyPayment = async () => {
      if (hasVerified.current) return;
      hasVerified.current = true;

      const reference = searchParams.get("reference");

      if (!reference) {
        setStatus("❌ No payment reference found.");
        return;
      }

      try {
        const res = await fetch(
          `http://localhost:5000/verify/${reference}`
        );
        const data = await res.json();

        if (data.status === "success") {
          const jobId = localStorage.getItem("paymentJobId");

          if (!jobId) {
            setStatus("⚠️ No job linked to payment.");
            return;
          }

          const jobRef = doc(db, "jobs", jobId);
          const jobSnap = await getDoc(jobRef);

          if (!jobSnap.exists()) {
            setStatus("❌ Job not found.");
            return;
          }

          const job = jobSnap.data();

          const total = Number(job.budget || 0);
          const commission = total * 0.1;
          const artisanAmount = total - commission;

          // ✅ Update Job
          await updateDoc(jobRef, {
            status: "in_progress",
            paid: true,
            commission,
            artisanAmount,
            updatedAt: new Date()
          });

          // 💰 Update Artisan Wallet (PENDING)
          const artisanRef = doc(db, "wallets", job.artisanId);
          const walletSnap = await getDoc(artisanRef);

          if (walletSnap.exists()) {
            await updateDoc(artisanRef, {
              pending: increment(artisanAmount)
            });
          } else {
            await setDoc(artisanRef, {
              balance: 0,
              pending: artisanAmount,
              createdAt: new Date()
            });
          }

          // 💼 Track Platform Revenue
          const platformRef = doc(db, "platform", "revenue");

          await setDoc(
            platformRef,
            {
              total: increment(commission)
            },
            { merge: true }
          );

          localStorage.removeItem("paymentJobId");

          setStatus("✅ Payment successful! Escrow funded 🚀");
        } else {
          setStatus("❌ Payment verification failed.");
        }
      } catch (err) {
        console.error(err);
        setStatus("❌ Error verifying payment.");
      }
    };

    verifyPayment();
  }, [searchParams]);

  return (
    <div style={{ padding: "40px", color: "#fff" }}>
      <h2>{status}</h2>
    </div>
  );
}