import { useEffect, useState } from "react";
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

export default function ChatList() {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setChats(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsub();
  }, [user]);

  return (
    <div style={{ color: "white" }}>
      <h2>💬 Chats</h2>

      {chats.map(chat => {
        const otherUser = chat.participants.find(p => p !== user.uid);
        return (
          <ChatItem
            key={chat.id}
            chat={chat}
            otherUserId={otherUser}
            navigate={navigate}
          />
        );
      })}
    </div>
  );
}

function ChatItem({ chat, otherUserId, navigate }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (!otherUserId) return;

    const unsub = onSnapshot(doc(db, "users", otherUserId), (snap) => {
      setUserData(snap.data());
    });

    return () => unsub();
  }, [otherUserId]);

  return (
    <div
      onClick={() => navigate(`/chat/${chat.id}`)}
      style={{
        padding: 12,
        background: "#1e293b",
        marginBottom: 10,
        borderRadius: 10,
        cursor: "pointer",
      }}
    >
      <div>{chat.lastMessage || "Start chatting..."}</div>

      <small>
        {userData?.online ? "🟢 Online" : "⚫ Offline"}
      </small>
    </div>
  );
}