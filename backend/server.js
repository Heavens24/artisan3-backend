require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");

const app = express();

// ✅ CORS (IMPORTANT)
app.use(cors({
  origin: "http://localhost:5173"
}));

app.use(bodyParser.json());

// 🔐 Firebase Admin Setup
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ============================================
// 🔔 MANUAL NOTIFICATION ROUTE (TEST BUTTON)
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
        title: "🔔 Artisan Alert",
        body: message || "Test notification",
      },
      token: fcmToken,
    });

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// 🔥 AUTO ALERT SYSTEM (MAIN FEATURE)
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

        // 🔔 SEND NOTIFICATION
        await admin.messaging().send({
          notification: {
            title: "⏰ Task Reminder",
            body: task.title,
          },
          token: fcmToken,
        });

        console.log("🔔 Auto alert sent:", task.title);

        // ✅ MARK AS NOTIFIED
        await db.collection("tasks").doc(docSnap.id).update({
          notified: true,
        });
      }
    }

  } catch (err) {
    console.log("❌ Auto alert error:", err.message);
  }
}, 30000); // every 30 seconds

// ============================================
// 🚀 START SERVER
// ============================================
const PORT = 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});