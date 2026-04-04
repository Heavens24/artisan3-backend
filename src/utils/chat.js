import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

export const getOrCreateChat = async (db, userId, otherUserId) => {
  const q = query(
    collection(db, "chats"),
    where("participants", "array-contains", userId)
  );

  const snapshot = await getDocs(q);

  let existing = null;

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.participants.includes(otherUserId)) {
      existing = doc.id;
    }
  });

  if (existing) return existing;

  const docRef = await addDoc(collection(db, "chats"), {
    participants: [userId, otherUserId],
    createdAt: serverTimestamp(),
    lastMessage: "",
    lastMessageAt: serverTimestamp(),
  });

  return docRef.id;
};