require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const axios = require("axios");

const app = express();

// ✅ CORS
app.use(cors({
  origin: "http://localhost:5174"
}));

app.use(bodyParser.json());

// 🔐 Firebase setup
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();


// =====================================================
// 🤖 AI ROUTE (MONETIZED)
// =====================================================
app.post("/ai", async (req, res) => {
  const { prompt, userId } = req.body;

  if (!prompt || !userId) {
    return res.status(400).json({ error: "Prompt and userId required" });
  }

  try {
    console.log("📩 Prompt:", prompt);
    console.log("👤 User:", userId);

    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userSnap.data();

    const isPro = userData.isPro || false;

    // ⏱ DAILY LIMIT LOGIC
    const today = new Date().toISOString().split("T")[0];
    const lastUsedDate = userData.lastUsedDate || "";
    let usageCount = userData.usageCount || 0;

    if (lastUsedDate !== today) {
      usageCount = 0;
    }

    console.log("📊 Usage:", usageCount, "| Pro:", isPro);

    // 🚫 LIMIT FREE USERS
    if (!isPro && usageCount >= 3) {
      return res.status(403).json({
        error: "Daily free limit reached. Upgrade to Pro."
      });
    }

    // 🤖 CALL OPENAI
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: `You are a professional artisan assistant. Help step-by-step:\n\n${prompt}`
          }
        ]
      }),
    });

    const text = await response.text();
    console.log("📦 RAW RESPONSE:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({ error: "Invalid JSON from OpenAI" });
    }

    if (!response.ok) {
      console.error("❌ OpenAI error:", data);
      return res.status(500).json({
        error: data.error?.message || "AI failed"
      });
    }

    const reply =
      data?.output?.[0]?.content?.[0]?.text ||
      "No response from AI";

    // 📊 UPDATE USER DATA
    if (!isPro) {
      await userRef.set(
        {
          usageCount: usageCount + 1,
          lastUsedDate: today
        },
        { merge: true }
      );
    }

    // 📊 ANALYTICS
    await userRef.set(
      {
        totalUsage: admin.firestore.FieldValue.increment(1)
      },
      { merge: true }
    );

    // 💾 SAVE HISTORY
    await db.collection("history").add({
      userId,
      prompt,
      reply,
      createdAt: new Date()
    });

    res.json({ reply });

  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// =====================================================
// 💰 PAYSTACK VERIFY PAYMENT (CRITICAL)
// =====================================================
app.post("/verify-payment", async (req, res) => {
  const { reference, userId } = req.body;

  if (!reference || !userId) {
    return res.status(400).json({ error: "Missing reference or userId" });
  }

  try {
    console.log("💳 Verifying payment:", reference);

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = response.data;

    console.log("📦 Paystack response:", data);

    // ✅ CHECK SUCCESS
    if (data.data.status === "success") {
      const userRef = db.collection("users").doc(userId);

      await userRef.set(
        {
          isPro: true,
          paidAt: new Date(),
          paymentRef: reference
        },
        { merge: true }
      );

      console.log("✅ USER UPGRADED TO PRO:", userId);

      return res.json({ success: true });
    } else {
      return res.status(400).json({ error: "Payment not successful" });
    }

  } catch (err) {
    console.error("❌ Payment verification error:", err.response?.data || err.message);
    res.status(500).json({ error: "Payment verification failed" });
  }
});


// =====================================================
// ✅ TEST ROUTE
// =====================================================
app.get("/", (req, res) => {
  res.send("Backend running");
});


// =====================================================
// 🚀 START SERVER
// =====================================================
app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});