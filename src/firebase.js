import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBmiOVCkHuxN7oNN2i1fGxfWUUHmnVzImo",
  authDomain: "artisan3-0.firebaseapp.com",
  projectId: "artisan3-0",
  storageBucket: "artisan3-0.firebasestorage.app",
  messagingSenderId: "824531230785",
  appId: "1:824531230785:web:662cc4c90c0077039926c0",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);