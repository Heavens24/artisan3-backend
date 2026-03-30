import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";

// 🔥 YOUR CONFIG (UNCHANGED)
const firebaseConfig = {
  apiKey: "AIzaSyBmiOVCkHuxN7oNN2i1fGxfWUUHmnVzImo",
  authDomain: "artisan3-0.firebaseapp.com",
  projectId: "artisan3-0",
  storageBucket: "artisan3-0.firebasestorage.app",
  messagingSenderId: "824531230785",
  appId: "1:824531230785:web:662cc4c90c0077039926c0",
};

// 🔧 INIT
const app = initializeApp(firebaseConfig);

// ✅ EXPORTS (IMPORTANT)
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app); // 🔥 THIS LINE FIXES EVERYTHING