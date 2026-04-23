import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  orderBy
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
      setNotifications(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    });
  }, [user]);

  const markAsRead = async (id) => {
    await updateDoc(doc(db, "notifications", id), {
      read: true,
    });
  };

  const getIcon = (type) => {
    switch (type) {
      case "job_match": return "🔥";
      case "application": return "📩";
      case "payment": return "💸";
      case "selection": return "✅";
      default: return "🔔";
    }
  };

  return (
    <div className="p-6 text-white">
      <h2 className="text-2xl font-bold mb-6">🔔 Notifications</h2>

      {notifications.map((n) => (
        <div
          key={n.id}
          onClick={() => markAsRead(n.id)}
          className={`p-4 mb-3 rounded-xl cursor-pointer ${
            n.read ? "bg-slate-800" : "bg-slate-700"
          }`}
        >
          <p>{getIcon(n.type)} {n.message}</p>

          <p className="text-xs text-gray-400 mt-1">
            {n.createdAt?.seconds
              ? new Date(n.createdAt.seconds * 1000).toLocaleString()
              : ""}
          </p>
        </div>
      ))}
    </div>
  );
}