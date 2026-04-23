import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";

export const autoMatchArtisan = async (job) => {
  try {
    const q = query(
      collection(db, "users"),
      where("role", "==", "artisan"),
      where("skill", "==", job.skill),
      where("city", "==", job.location?.city)
    );

    const snapshot = await getDocs(q);

    const artisans = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 🔥 SIMPLE RANKING (can expand later)
    artisans.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    // 🔥 Notify top 5 artisans
    const top = artisans.slice(0, 5);

    for (const artisan of top) {
      await addDoc(collection(db, "notifications"), {
        userId: artisan.id,
        message: `🔥 New ${job.skill} job near you`,
        type: "job_match",
        jobId: job.id,
        read: false,
        createdAt: serverTimestamp(),
      });
    }

    return top;

  } catch (err) {
    console.error("Auto match error:", err);
  }
};