// ============================================
// 🔐 LOAD ENV (BULLETPROOF)
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
// ✅ GLOBAL SAFETY (NO CRASHES EVER 🔥)
// ============================================
process.on("uncaughtException", (err) => {
  console.error("💥 UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("💥 UNHANDLED REJECTION:", err);
});

// ============================================
// ✅ MIDDLEWARE
// ============================================
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// ============================================
// 🔍 ENV DEBUG
// ============================================
console.log("🧪 ENV TEST:", process.env.PAYSTACK_SECRET_KEY);

if (!process.env.PAYSTACK_SECRET_KEY) {
  console.error("❌ PAYSTACK_SECRET_KEY NOT FOUND");
} else {
  console.log(
    "🔑 PAYSTACK KEY LOADED:",
    process.env.PAYSTACK_SECRET_KEY.slice(0, 10) + "..."
  );
}

// ============================================
// 🧪 TEST ROUTE
// ============================================
app.get("/test", (req, res) => {
  res.json({ message: "Backend working ✅" });
});

// ============================================
// 💳 PAYMENT ROUTE
// ============================================
app.post("/pay", async (req, res) => {
  try {
    console.log("🚀 Incoming payment request:", req.body);

    const { email, amount, userId, jobId } = req.body;

    // ✅ VALIDATION
    if (!email || !amount || !userId) {
      return res.status(400).json({
        status: false,
        error: "Missing required fields",
      });
    }

    // ✅ PAYSTACK CALL
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
          amount: Number(amount) * 100,
          callback_url: "http://localhost:5173/payment-success",
          metadata: {
            userId,
            jobId: jobId || "subscription",
          },
        }),
      }
    );

    const data = await paystackRes.json();

    console.log("💳 PAYSTACK INIT:", data.status);

    if (!data.status) {
      return res.status(400).json({
        status: false,
        error: data.message,
      });
    }

    const { authorization_url, reference } = data.data;

    // ✅ SAVE TRANSACTION
    await db.collection("transactions").doc(reference).set({
      userId,
      email,
      amount,
      reference,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("✅ Transaction saved:", reference);

    return res.json({
      status: true,
      authorization_url,
      reference,
    });
  } catch (err) {
    console.error("💥 PAY ERROR:", err.message);

    return res.status(500).json({
      status: false,
      error: "Internal server error",
    });
  }
});

// ============================================
// 🔍 VERIFY ROUTE (🔥 CRITICAL)
// ============================================
app.get("/verify/:reference", async (req, res) => {
  try {
    const { reference } = req.params;

    console.log("🔍 VERIFY HIT:", reference);

    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY.trim()}`,
        },
      }
    );

    const data = await verifyRes.json();

    console.log("🔍 PAYSTACK VERIFY:", JSON.stringify(data, null, 2));

    // ❌ FAILED PAYMENT
    if (!data.status || data.data.status !== "success") {
      return res.status(400).json({
        success: false,
        error: "Payment not successful",
        details: data,
      });
    }

    const userId = data.data.metadata?.userId;
    const jobId = data.data.metadata?.jobId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "Missing userId in metadata",
      });
    }

    // ✅ UPDATE USER
    await db.collection("users").doc(userId).update({
      isPro: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ✅ UPDATE TRANSACTION
    await db.collection("transactions").doc(reference).update({
      status: "success",
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("✅ PAYMENT VERIFIED:", reference);

    return res.json({
      success: true,
      reference,
      userId,
      jobId,
    });
  } catch (err) {
    console.error("❌ VERIFY ERROR:", err.message);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ============================================
// 🏁 HEALTH CHECK
// ============================================
app.get("/", (req, res) => {
  res.send("🔥 Artisan 3.0 Backend LIVE");
});

// ============================================
// 🚀 START SERVER (🔥 PORT SAFE)
// ============================================
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// 🔥 HANDLE PORT IN USE (NO CRASH)
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log("⚠️ Port already in use → Server already running ✅");
  } else {
    console.error("💥 SERVER ERROR:", err);
  }
});