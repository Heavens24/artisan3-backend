const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🔐 FIREBASE ADMIN SETUP
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// 🚀 WEBHOOK ROUTE
app.post("/webhook", async (req, res) => {
  try {
    const event = req.body;

    console.log("🔥 Webhook received:", JSON.stringify(event, null, 2));

    // ✅ GET USER ID FROM LEMONSQUEEZY
    const userId =
      event?.meta?.custom_data?.user_id ||
      event?.data?.attributes?.custom_data?.user_id;

    if (!userId) {
      console.log("❌ No userId found in webhook");
      return res.sendStatus(400);
    }

    // ✅ UPGRADE USER IN FIRESTORE
    await db.collection("users").doc(userId).set(
      {
        isPro: true,
      },
      { merge: true }
    );

    console.log("✅ User upgraded to PRO:", userId);

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.sendStatus(500);
  }
});

// ✅ TEST ROUTE
app.get("/", (req, res) => {
  res.send("🚀 Backend is running");
});

// 🚀 START SERVER
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});