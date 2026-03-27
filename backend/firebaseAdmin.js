const admin = require("firebase-admin");
const serviceAccount = require("./firebase-adminsdk.json"); // rename your file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

module.exports = { admin, db };