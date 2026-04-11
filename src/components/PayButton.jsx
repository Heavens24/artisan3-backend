import { useState } from "react";

const API_URL = "http://localhost:5000";

const PayButton = ({ job, user }) => {
  const [loading, setLoading] = useState(false);

  const payNow = async () => {
    try {
      if (!user?.email || !user?.uid) {
        alert("User not authenticated");
        return;
      }

      setLoading(true);

      const res = await fetch(`${API_URL}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: user.email,
          amount: job?.budget || 100,
          userId: user.uid
        })
      });

      const data = await res.json();

      const paymentUrl = data?.authorization_url;

      if (!paymentUrl) throw new Error("Payment init failed");

      localStorage.setItem("paymentJobId", job?.id || "unknown");

      window.location.href = paymentUrl;

    } catch (err) {
      console.error(err);
      alert("Payment error ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={payNow}
      disabled={loading}
      className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg transition"
    >
      {loading ? "Processing..." : "💰 Pay & Start Job"}
    </button>
  );
};

export default PayButton;