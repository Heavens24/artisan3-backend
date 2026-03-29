import { useState } from "react";

const PayButton = ({ email, userId }) => {
  const [loading, setLoading] = useState(false);

  const payNow = async () => {
    try {
      setLoading(true);

      const res = await fetch("http://localhost:5000/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      console.log("💰 PAYSTACK INIT:", data);

      if (data?.data?.authorization_url) {
        // ✅ SAVE REFERENCE LOCALLY
        localStorage.setItem("paymentReference", data.data.reference);
        localStorage.setItem("paymentUserId", userId);

        // ✅ REDIRECT
        window.location.href = data.data.authorization_url;
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
      {loading ? "Processing..." : "Upgrade to Pro 💳"}
    </button>
  );
};

export default PayButton;