require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");

const app = express();

// ============================================
// ✅ CORS
// ============================================
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174"
  ]
}));

app.use(bodyParser.json());

// ============================================
// 🔐 FIREBASE ADMIN SETUP (ENV SAFE)
// ============================================

if (!process.env.FIREBASE_KEY) {
  console.error("❌ FIREBASE_KEY is missing");
  process.exit(1);
}

let serviceAccount;

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
} catch (err) {
  console.error("❌ Invalid FIREBASE_KEY JSON");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ============================================
// 🔔 MANUAL NOTIFICATION ROUTE
// ============================================
app.post("/notify-user", async (req, res) => {
  try {
    const { userId, message } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const { fcmToken } = userDoc.data();

    if (!fcmToken) {
      return res.status(400).json({ error: "No FCM token" });
    }

    await admin.messaging().send({
      notification: {
        title: "🔔 Artisan3.0 Alert",
        body: message || "Test notification",
      },
      token: fcmToken,
    });

    res.json({ success: true });

  } catch (err) {
    console.error("❌ Notify error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// 🔥 AUTO ALERT SYSTEM
// ============================================
setInterval(async () => {
  try {
    const now = new Date();

    const snapshot = await db.collection("tasks").get();

    for (const docSnap of snapshot.docs) {
      const task = docSnap.data();

      if (!task.reminderTime || task.notified) continue;

      const reminderTime = new Date(task.reminderTime);

      if (now >= reminderTime) {
        const userDoc = await db
          .collection("users")
          .doc(task.userId)
          .get();

        if (!userDoc.exists) continue;

        const { fcmToken } = userDoc.data();

        if (!fcmToken) continue;

        await admin.messaging().send({
          notification: {
            title: "⏰ Task Reminder",
            body: task.title,
          },
          token: fcmToken,
        });

        console.log("🔔 Auto alert sent:", task.title);

        await db.collection("tasks").doc(docSnap.id).update({
          notified: true,
        });
      }
    }

  } catch (err) {
    console.error("❌ Auto alert error:", err.message);
  }
}, 30000);

// ============================================
// 🧪 HEALTH CHECK
// ============================================
app.get("/", (req, res) => {
  res.send("🚀 Artisan3.0 Backend Running");
});

// ============================================
// 🚀 START SERVER
// ============================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Artisan3.0 server running on port ${PORT}`);
});