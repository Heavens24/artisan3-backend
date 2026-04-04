import { useEffect, useState, useRef } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useParams } from "react-router-dom";

export default function PrivateChat() {
  const { user } = useAuth();
  const { chatId } = useParams();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserData, setOtherUserData] = useState(null);

  const typingTimeout = useRef(null);

  // 📩 Messages
  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [chatId]);

  // 🧠 Chat meta (typing + user)
  useEffect(() => {
    if (!chatId || !user) return;

    const unsub = onSnapshot(doc(db, "chats", chatId), snap => {
      const data = snap.data();

      const otherUser = data?.participants.find(p => p !== user.uid);

      if (data?.typing?.[otherUser]) {
        setIsTyping(true);
      } else {
        setIsTyping(false);
      }

      onSnapshot(doc(db, "users", otherUser), snap => {
        setOtherUserData(snap.data());
      });
    });

    return () => unsub();
  }, [chatId, user]);

  // ⌨️ Typing
  const handleTyping = async (val) => {
    setInput(val);

    await updateDoc(doc(db, "chats", chatId), {
      [`typing.${user.uid}`]: true,
    }).catch(() => {});

    clearTimeout(typingTimeout.current);

    typingTimeout.current = setTimeout(() => {
      updateDoc(doc(db, "chats", chatId), {
        [`typing.${user.uid}`]: false,
      }).catch(() => {});
    }, 1500);
  };

  // 📤 Send
  const sendMessage = async () => {
    if (!input.trim()) return;

    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: input,
      senderId: user.uid,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "chats", chatId), {
      lastMessage: input,
      lastMessageAt: serverTimestamp(),
      [`typing.${user.uid}`]: false,
    });

    setInput("");
  };

  return (
    <div style={{ color: "white" }}>
      <h3>
        {otherUserData?.online ? "🟢 Online" : "⚫ Offline"}
      </h3>

      {isTyping && <p>✍️ Typing...</p>}

      <div style={{ height: 400, overflowY: "auto" }}>
        {messages.map(msg => (
          <div key={msg.id}>
            {msg.text}
          </div>
        ))}
      </div>

      <input
        value={input}
        onChange={(e) => handleTyping(e.target.value)}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}