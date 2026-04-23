import { useEffect, useState, useRef } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

// 🔔 SOUND
const playSound = () => {
  const audio = new Audio("/message.mp3");
  audio.volume = 0.5;
  audio.play().catch(() => {});
};

export default function ChatList() {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const navigate = useNavigate();

  const lastMessagesRef = useRef({});

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const newChats = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 🔔 PLAY SOUND ON NEW MESSAGE
      newChats.forEach((chat) => {
        const prev = lastMessagesRef.current[chat.id];

        if (
          prev &&
          prev !== chat.lastMessage &&
          chat.lastMessage &&
          chat.seen?.[user.uid] === false
        ) {
          playSound();
        }

        lastMessagesRef.current[chat.id] = chat.lastMessage;
      });

      setChats(newChats);
    });

    return () => unsub();
  }, [user]);

  return (
    <div className="p-6 text-white">
      <h2 className="text-2xl font-bold mb-6">💬 Chats</h2>

      {chats.length === 0 && (
        <p className="text-gray-400">No conversations yet</p>
      )}

      {chats.map((chat) => {
        const otherUserId = chat.participants?.find(
          (p) => p !== user.uid
        );

        return (
          <ChatItem
            key={chat.id}
            chat={chat}
            otherUserId={otherUserId}
            userId={user.uid}
            navigate={navigate}
          />
        );
      })}
    </div>
  );
}

function ChatItem({ chat, otherUserId, userId, navigate }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (!otherUserId) return;

    const unsub = onSnapshot(doc(db, "users", otherUserId), (snap) => {
      setUserData(snap.data());
    });

    return () => unsub();
  }, [otherUserId]);

  const isUnread = !chat.seen?.[userId];

  return (
    <div
      onClick={() => navigate(`/chat/${chat.id}`)}
      className="bg-slate-800 p-4 mb-3 rounded-xl cursor-pointer hover:bg-slate-700 transition flex justify-between items-center"
    >
      <div>
        <h3 className="font-semibold">
          {userData?.email || "User"}
        </h3>

        <p className="text-xs text-gray-400">
          {userData?.online ? "🟢 Online" : "⚫ Offline"}
        </p>

        <p className="text-sm mt-2 text-gray-300 truncate">
          {chat.lastMessage || "Start chatting..."}
        </p>
      </div>

      {isUnread && (
        <span className="bg-red-500 text-xs px-2 py-1 rounded-full">
          New
        </span>
      )}
    </div>
  );
}