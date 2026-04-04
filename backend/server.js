require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const OpenAI = require("openai");
const Paystack = require("paystack-api");
const axios = require("axios");

const { admin, db } = require("./firebaseAdmin");

const app = express();

// ============================================
// ✅ CORS
// ============================================
app.use(cors({ origin: ["http://localhost:5173", "https://yourdomain.com"] }));
app.use(bodyParser.json());

// ============================================
// 🤖 OPENAI
// ============================================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// 💰 PAYSTACK
// ============================================
const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);

// ============================================
// ⚙️ CONFIG
// ============================================
const COMMISSION_RATE = 0.1;
const MIN_WITHDRAWAL = 50;

// ============================================
// 💳 INIT PAYMENT
// ============================================
app.post("/pay", async (req, res) => {
  const { email, amount, userId } = req.body;

  try {
    const response = await paystack.transaction.initialize({
      email,
      amount: amount * 100,
      callback_url: "https://yourdomain.com/payment-success",
    });

    await db.collection("transactions").doc(response.data.reference).set({
      userId,
      amount,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ✅ VERIFY PAYMENT
// ============================================
app.get("/verify/:reference", async (req, res) => {
  try {
    const verify = await paystack.transaction.verify({
      reference: req.params.reference,
    });

    if (verify.data.status !== "success") {
      return res.status(400).json({ error: "Payment failed" });
    }

    await db.runTransaction(async (t) => {
      const txRef = db.collection("transactions").doc(req.params.reference);
      const txDoc = await t.get(txRef);

      if (!txDoc.exists) throw new Error("Transaction not found");

      const tx = txDoc.data();

      if (tx.status === "paid") {
        throw new Error("Already processed");
      }

      const total = verify.data.amount / 100;
      const commission = total * COMMISSION_RATE;
      const earnings = total - commission;

      const walletRef = db.collection("wallets").doc(tx.userId);
      const walletDoc = await t.get(walletRef);

      if (!walletDoc.exists) {
        t.set(walletRef, { balance: earnings });
      } else {
        t.update(walletRef, {
          balance: admin.firestore.FieldValue.increment(earnings),
        });
      }

      t.update(txRef, {
        status: "paid",
        commission,
        earnings,
      });
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// 💸 WITHDRAW REQUEST
// ============================================
app.post("/request-withdrawal", async (req, res) => {
  const { userId, amount } = req.body;

  if (amount < MIN_WITHDRAWAL) {
    return res.status(400).json({ error: "Minimum withdrawal is R50" });
  }

  try {
    const userDoc = await db.collection("users").doc(userId).get();
    const walletRef = db.collection("wallets").doc(userId);

    const user = userDoc.data();

    if (!user.recipientCode) {
      return res.status(400).json({ error: "Add bank details first" });
    }

    await db.runTransaction(async (t) => {
      const walletDoc = await t.get(walletRef);

      if (walletDoc.data().balance < amount) {
        throw new Error("Insufficient funds");
      }

      t.update(walletRef, {
        balance: admin.firestore.FieldValue.increment(-amount),
      });

      t.set(db.collection("withdrawals").doc(), {
        userId,
        amount,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// 🤖 AI
// ============================================
app.post("/api/ai", async (req, res) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: req.body.prompt || "Analyze issue",
        },
      ],
    });

    res.json({ result: response.choices[0].message.content });
  } catch {
    res.status(500).json({ error: "AI failed" });
  }
});

// ============================================
// 🚀 SERVER
// ============================================
app.get("/", (req, res) => {
  res.send("🔥 Artisan 3.0 Backend LIVE");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("🚀 Server running:", PORT));