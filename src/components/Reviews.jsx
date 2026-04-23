import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

export default function Reviews() {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "reviews"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setReviews(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    });

    return () => unsub();
  }, []);

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-4">⭐ Artisan Reviews</h3>

      {reviews.length === 0 && (
        <p className="text-gray-400">No reviews yet</p>
      )}

      {reviews.map((r) => (
        <div
          key={r.id}
          className="bg-white/5 p-4 rounded-xl mb-3 border border-white/10"
        >
          <p className="font-semibold">
            ⭐ {r.rating}/5
          </p>

          <p className="text-sm mt-1">
            {r.review || "No comment"}
          </p>
        </div>
      ))}
    </div>
  );
}