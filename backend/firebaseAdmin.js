const admin = require("firebase-admin");

let serviceAccount;

if (process.env.FIREBASE_KEY) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
    console.log("✅ Using FIREBASE_KEY from env");
  } catch (err) {
    console.error("🔥 Invalid FIREBASE_KEY JSON");
    process.exit(1);
  }
} else {
  serviceAccount = require("./serviceAccountKey.json");
  console.log("✅ Using local serviceAccountKey.json");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

module.exports = { admin, db };