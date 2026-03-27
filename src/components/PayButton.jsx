import React, { useState } from "react";

const PayButton = ({ email, amount, userId }) => {
  const [loading, setLoading] = useState(false);

  const payNow = () => {
    console.log("🟢 Button clicked");

    if (!window.PaystackPop) {
      console.error("❌ Paystack NOT loaded");
      alert("Payment system not ready. Refresh page.");
      return;
    }

    try {
      const handler = window.PaystackPop.setup({
        key: "pk_test_d641f1fa38436a739a32c4226c84be9ce2f70dec",
        email: email,
        amount: amount * 100,
        currency: "ZAR",

        callback: async function (response) {
          console.log("✅ PAYMENT SUCCESS:", response);

          try {
            const res = await fetch("http://localhost:5000/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                reference: response.reference,
                userId: userId,
              }),
            });

            const data = await res.json();

            if (data.success) {
              alert("🎉 You are now PRO!");
            } else {
              alert("⚠️ Verification failed");
            }

          } catch (err) {
            console.error("❌ Verify error:", err);
            alert("Server verification failed");
          }

          setLoading(false);
        },

        onClose: function () {
          console.log("❌ Payment closed");
          setLoading(false);
        },
      });

      handler.openIframe();
      setLoading(true); // ✅ moved AFTER open

    } catch (err) {
      console.error("❌ Paystack error:", err);
      alert("Payment failed to start.");
      setLoading(false);
    }
  };

  return (
    <button
      onClick={payNow}
      disabled={loading}
      style={{
        padding: "12px 20px",
        background: loading ? "#6b7280" : "#16a34a",
        color: "white",
        border: "none",
        borderRadius: "6px",
        cursor: loading ? "not-allowed" : "pointer",
      }}
    >
      {loading ? "Processing..." : "Upgrade to Pro 💳"}
    </button>
  );
};

export default PayButton;