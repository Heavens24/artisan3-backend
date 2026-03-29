const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");

// ✅ Prevent double initialization
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

module.exports = { admin, db };