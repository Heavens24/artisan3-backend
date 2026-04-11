import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";
import { getStorage } from "firebase/storage";

// 🔥 CONFIG (FIXED STORAGE BUCKET)
const firebaseConfig = {
  apiKey: "AIzaSyBmiOVCkHuxN7oNN2i1fGxfWUUHmnVzImo",
  authDomain: "artisan3-0.firebaseapp.com",
  projectId: "artisan3-0",
  storageBucket: "artisan3-0.appspot.com", // ✅ FIXED
  messagingSenderId: "824531230785",
  appId: "1:824531230785:web:662cc4c90c0077039926c0",
};

// 🔧 INIT
const app = initializeApp(firebaseConfig);

// ✅ AUTH
export const auth = getAuth(app);

// ✅ FIRESTORE (WITH STABILITY)
export const db = getFirestore(app);

// 🔥 OPTIONAL: Enable offline persistence safely
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("⚠️ Persistence failed: multiple tabs open");
  } else if (err.code === "unimplemented") {
    console.warn("⚠️ Persistence not supported");
  }
});

// ✅ STORAGE
export const storage = getStorage(app);

// ✅ MESSAGING (SAFE INIT 🔥)
let messaging = null;

isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
    console.log("✅ Messaging initialized");
  } else {
    console.warn("⚠️ Messaging not supported on this browser");
  }
});

export { messaging };