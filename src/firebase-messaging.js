import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { app } from "./firebase";

let messaging = null;

// ✅ Prevent crash on unsupported browsers
export const initMessaging = async () => {
  const supported = await isSupported();
  if (!supported) {
    console.log("❌ FCM not supported on this browser");
    return null;
  }

  messaging = getMessaging(app);
  return messaging;
};

// 🔔 REQUEST PERMISSION
export const requestPermission = async () => {
  try {
    if (!messaging) await initMessaging();

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: "BD_z_ra8Xhp8zVLd1PzMfwUn-_NcPhBHTMc4tLpziiok08K5shAJT2h0bGAPxOC_PhfJIALT36z2EcMZ9Hm0L40",
      });

      console.log("🔥 FCM TOKEN:", token);
    } else {
      console.log("❌ Notification permission denied");
    }
  } catch (error) {
    console.error("❌ Error getting permission:", error);
  }
};

// 📩 FOREGROUND MESSAGES
export const listenNotifications = async () => {
  if (!messaging) await initMessaging();

  onMessage(messaging, (payload) => {
    console.log("🔔 Message received:", payload);

    alert(payload?.notification?.title || "New Notification");
  });
};