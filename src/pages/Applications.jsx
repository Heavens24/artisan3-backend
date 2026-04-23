import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc
} from "firebase/firestore";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Applications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [apps, setApps] = useState([]);
  const [chatMap, setChatMap] = useState({});

  // 🔥 LOAD APPLICATIONS
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "applications"),
      where("artisanId", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      setApps(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    });

    return () => unsub();
  }, [user?.uid]);

  // 🔥 LOAD CHAT DATA – FIXED WITH ERROR HANDLING
  useEffect(() => {
    if (!apps.length ||!user?.uid) return;

    const unsubs = apps.map((app) => {
      const chatRef = doc(db, "chats", app.jobId);

      return onSnapshot(
        chatRef,
        (snap) => {
          if (snap.exists()) {
            setChatMap((prev) => ({
              ...prev,
              [app.jobId]: snap.data(),
            }));
          }
        },
        (err) => {
          // This fires if rules block you or chat doesn't exist yet
          // Don't spam console – it's expected before job is accepted
          if (err.code !== 'permission-denied') {
            console.warn("Chat listener error:", err.code, err.message);
          }
        }
      );
    });

    return () => unsubs.forEach((u) => u());
  }, [apps, user?.uid]);

  return (
    <div className="p-6 text-white">
      <h2 className="text-2xl mb-6 font-bold">
        📩 My Applications
      </h2>

      {apps.length === 0 && (
        <p className="text-gray-400">No applications yet</p>
      )}

      {apps.map((app) => {
        const chat = chatMap[app.jobId];

        return (
          <div key={app.id} className="bg-slate-800 p-4 mb-3 rounded">
            <p className="text-xs text-gray-400">
              Job ID: {app.jobId}
            </p>

            <p className="mt-1">
              Status:{" "}
              <span
                className={
                  app.status === "accepted"
                   ? "text-green-400"
                    : app.status === "rejected"
                   ? "text-red-400"
                    : "text-yellow-400"
                }
              >
                {app.status || "pending"}
              </span>

              {/* 🔥 UNREAD BADGE */}
              {chat && chat.seen && chat.seen[user.uid] === false && (
                <span className="ml-2 bg-red-500 text-xs px-2 py-1 rounded">
                  New
                </span>
              )}
            </p>

            {/* 🔥 CHAT BUTTON */}
            {app.status === "accepted" && (
              <button
                onClick={() => navigate(`/chat/${app.jobId}`)}
                className="bg-green-500 px-3 py-1 rounded mt-3 hover:bg-green-600 transition"
              >
                Open Chat 💬
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}