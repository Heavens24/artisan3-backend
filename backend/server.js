// ============================================
// 🔐 LOAD ENV
// ============================================
require("dotenv").config({
  path: require("path").resolve(__dirname, ".env"),
});

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const { admin, db } = require("./firebaseAdmin");

const app = express();

// ============================================
// 🛡 GLOBAL SAFETY
// ============================================
process.on("uncaughtException", (err) => {
  console.error("💥 UNCAUGHT:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("💥 REJECTION:", err);
});

// ============================================
// ✅ MIDDLEWARE
// ============================================
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// ============================================
// 🧪 TEST
// ============================================
app.get("/test", (req, res) => {
  res.json({ message: "Backend working ✅" });
});

// ============================================
// 💳 INIT PAYMENT (SUBSCRIPTION) – MULTI-CURRENCY
// ============================================
app.post("/pay", async (req, res) => {
  try {
    const { email, amount, userId, jobId = "subscription", currency = "ZAR" } = req.body;

    if (!email ||!amount ||!userId) {
      return res.status(400).json({
        status: false,
        error: "Missing required fields",
      });
    }

    const supported = ["ZAR", "USD", "GBP", "NGN", "KES", "GHS"];
    if (!supported.includes(currency)) {
      return res.status(400).json({
        status: false,
        error: `Currency ${currency} not supported`,
      });
    }

    const paystackRes = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: Math.round(Number(amount) * 100), // kobo/cents
          currency,
          callback_url: `${process.env.CLIENT_URL}/payment-success`,
          metadata: {
            userId,
            jobId,
            type: "subscription",
            currency,
          },
        }),
      }
    );

    const data = await paystackRes.json();

    if (!data.status) {
      return res.status(400).json({
        status: false,
        error: data.message,
      });
    }

    const { authorization_url, reference } = data.data;

    await db.collection("transactions").doc(reference).set({
      userId,
      email,
      amount: Number(amount),
      currency,
      reference,
      status: "pending",
      type: "subscription",
      jobId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({
      status: true,
      authorization_url,
      reference,
    });

  } catch (err) {
    console.error("💥 PAY ERROR:", err.message);

    res.status(500).json({
      status: false,
      error: "Internal server error",
    });
  }
});

// ============================================
// 🔍 VERIFY PAYMENT
// ============================================
app.get("/verify/:reference", async (req, res) => {
  try {
    const { reference } = req.params;

    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY.trim()}`,
        },
      }
    );

    const data = await verifyRes.json();

    if (!data.status || data.data.status!== "success") {
      return res.status(400).json({
        success: false,
        error: "Payment not successful",
        details: data,
      });
    }

    const userId = data.data.metadata?.userId;
    const currency = data.data.currency;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "Missing userId",
      });
    }

    await db.collection("users").doc(userId).update({
      isPro: true,
      proExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      proCurrency: currency,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection("transactions").doc(reference).update({
      status: "success",
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      reference,
      userId,
    });

  } catch (err) {
    console.error("❌ VERIFY ERROR:", err.message);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ============================================
// 🚀 START SERVER
// ============================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});