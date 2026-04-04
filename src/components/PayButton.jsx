import { useState } from "react";

const PayButton = ({ job, user }) => {
  const [loading, setLoading] = useState(false);

  const payNow = async () => {
    try {
      setLoading(true);

      const res = await fetch("http://localhost:5000/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: user.email,
          amount: job.budget
        })
      });

      const data = await res.json();

      console.log("💰 PAYSTACK INIT:", data);

      if (data?.authorization_url) {
        // 🔥 SAVE JOB + USER
        localStorage.setItem("paymentJobId", job.id);

        // 🚀 REDIRECT
        window.location.href = data.authorization_url;
      } else {
        alert("Payment failed to start");
      }

    } catch (err) {
      console.error(err);
      alert("Payment error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={payNow} disabled={loading}>
      {loading ? "Processing..." : "💰 Pay & Start Job"}
    </button>
  );
};

export default PayButton;