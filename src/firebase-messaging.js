import { messaging, db } from "./firebase";
import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// 🔔 REQUEST + AUTO SAVE TOKEN
export const requestPermission = async () => {
  try {
    if (!("Notification" in window)) return;

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("❌ Permission denied");
      return;
    }

    console.log("✅ Permission granted");

    const token = await getToken(messaging, {
      vapidKey: "YOUR_VAPID_KEY_HERE",
    });

    if (!token) return;

    console.log("🔥 FCM TOKEN:", token);

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      console.log("⚠️ User not ready");
      return;
    }

    await setDoc(
      doc(db, "users", user.uid),
      {
        fcmToken: token,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    console.log("✅ Token saved to Firestore");
  } catch (err) {
    console.log("❌ FCM error:", err.message);
  }
};

// 🔔 FOREGROUND LISTENER
export const listenNotifications = () => {
  try {
    onMessage(messaging, (payload) => {
      console.log("🔔 Foreground:", payload);

      if (payload?.notification) {
        alert(
          `${payload.notification.title}\n${payload.notification.body}`
        );
      }
    });
  } catch (err) {
    console.log("⚠️ Listener error:", err.message);
  }
};