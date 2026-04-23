import { useState } from "react";
import {
  addDoc,
  collection,
  doc,
  updateDoc,
  serverTimestamp,
  addDoc as notify
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function SubmitReview({ jobId, artisanId }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");

  const submit = async () => {
    await addDoc(collection(db, "reviews"), {
      jobId,
      artisanId,
      reviewerId: user.uid,
      rating,
      review,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "jobs", jobId), {
      status: "completed",
      updatedAt: serverTimestamp(),
    });

    await notify(collection(db, "notifications"), {
      userId: artisanId,
      message: "⭐ You received a review!",
      jobId,
      read: false,
      createdAt: serverTimestamp(),
    });

    alert("Review submitted");
  };

  return (
    <div className="mt-4">
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        className="w-full p-2 text-black"
      />
      <button onClick={submit} className="bg-green-500 px-4 py-2 mt-2">
        Submit Review
      </button>
    </div>
  );
}