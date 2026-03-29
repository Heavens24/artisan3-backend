require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");

const { admin, db } = require("./firebaseAdmin");

const app = express();

// ✅ CORS
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(bodyParser.json());

// ✅ TEST ROUTE
app.get("/", (req, res) => {
  res.send("🚀 Artisan3.0 Backend Running");
});


// 💳 PAYSTACK INIT
app.post("/pay", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: 5000 * 100,
          currency: "ZAR",
          callback_url: "http://localhost:5173/dashboard",
          metadata: { userId: email },
        }),
      }
    );

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error("❌ Pay error:", error);
    res.status(500).json({ error: "Payment failed" });
  }
});


// 🔍 VERIFY PAYMENT
app.post("/verify-payment", async (req, res) => {
  const { reference, userId } = req.body;

  if (!reference || !userId) {
    return res.status(400).json({ error: "Missing data" });
  }

  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (data?.data?.status === "success") {
      await db.collection("users").doc(userId).set(
        { isPro: true },
        { merge: true }
      );

      return res.json({ success: true });
    }

    return res.json({ success: false });
  } catch (error) {
    console.error("❌ Verify error:", error);
    res.status(500).json({ error: "Verification failed" });
  }
});


// 🔔 SEND NOTIFICATION
app.post("/send-notification", async (req, res) => {
  const { token, title, body } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Missing token" });
  }

  try {
    const message = {
      notification: { title, body },
      token,
    };

    await admin.messaging().send(message);

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Notification error:", error);
    res.status(500).json({ error: error.message });
  }
});


// 🚀 START SERVER
const PORT = 5000;

app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
});