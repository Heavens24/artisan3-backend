import { useEffect, useRef, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function Chat() {
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef(null);

  // 🔄 REAL-TIME MESSAGES (FIXED + SAFE)
  useEffect(() => {
    const q = query(
      collection(db, "chats"), // ✅ unified collection
      orderBy("createdAt", "desc"), // ✅ prevents missing messages
      limit(100) // ✅ performance safe
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setMessages(msgs);
    });

    return () => unsub();
  }, []);

  // ⬇️ AUTO SCROLL (AFTER RENDER)
  useEffect(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [messages]);

  // 📩 SEND MESSAGE (FULLY SAFE)
  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    try {
      setSending(true);

      await addDoc(collection(db, "chats"), {
        text: input.trim(),
        email: user?.email || "Anonymous",
        uid: user?.uid || null,
        createdAt: serverTimestamp(), // ✅ always use server time
      });

      setInput("");
    } catch (err) {
      console.error("Send error:", err);
    } finally {
      setSending(false);
    }
  };

  // ⌨️ ENTER TO SEND
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ padding: "20px", color: "white" }}>
      <h2>💬 Artisan Chat</h2>

      {/* 🧾 MESSAGES */}
      <div
        style={{
          height: "500px",
          overflowY: "auto",
          background: "#1e293b",
          padding: "15px",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ✅ REVERSED FOR CORRECT ORDER */}
        {[...messages].reverse().map((msg) => {
          const isMe = msg.uid === user?.uid;

          return (
            <div
              key={msg.id}
              style={{
                alignSelf: isMe ? "flex-end" : "flex-start",
                background: isMe ? "#00ffcc" : "#334155",
                color: isMe ? "#000" : "#fff",
                padding: "10px 14px",
                borderRadius: "12px",
                marginBottom: "10px",
                maxWidth: "70%",
                wordBreak: "break-word",
              }}
            >
              {/* 👤 USER */}
              <div style={{ fontSize: "11px", opacity: 0.7 }}>
                {msg.email}
              </div>

              {/* 💬 TEXT */}
              <div style={{ marginTop: "2px" }}>{msg.text}</div>

              {/* ⏱ TIME (SAFE RENDER) */}
              <div style={{ fontSize: "10px", opacity: 0.6, marginTop: "4px" }}>
                {msg.createdAt?.toDate
                  ? new Date(msg.createdAt.toDate()).toLocaleTimeString()
                  : "sending..."}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* ✍️ INPUT */}
      <div style={{ marginTop: "10px", display: "flex" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={sending}
          style={{
            padding: "12px",
            flex: 1,
            borderRadius: "8px",
            border: "none",
            outline: "none",
          }}
        />

        <button
          onClick={sendMessage}
          disabled={sending}
          style={{
            padding: "12px 16px",
            marginLeft: "10px",
            background: sending ? "#64748b" : "#00ffcc",
            border: "none",
            borderRadius: "8px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {sending ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}