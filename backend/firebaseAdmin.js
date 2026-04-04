const admin = require("firebase-admin");

if (!process.env.FIREBASE_KEY) {
  throw new Error("❌ FIREBASE_KEY missing");
}

let serviceAccount;

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
} catch (err) {
  throw new Error("❌ Invalid FIREBASE_KEY JSON");
}

// ✅ Prevent double init
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

module.exports = { admin, db };