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
  getDoc,
  setDoc
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useParams, useNavigate } from "react-router-dom";
import { notifyError } from "../components/NotificationProvider";

export default function PrivateChat() {
  const { user } = useAuth();
  const { chatId } = useParams(); // chatId === jobId in your app
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [chatExists, setChatExists] = useState(false);
  const [loading, setLoading] = useState(true);

  const bottomRef = useRef();
  const lastPlayedRef = useRef(null);

  // ✅ 1. VALIDATE CHAT + ENSURE YOU'RE A PARTICIPANT
  useEffect(() => {
    if (!chatId ||!user?.uid) return;

    const checkChat = async () => {
      try {
        const chatRef = doc(db, "chats", chatId);
        const snap = await getDoc(chatRef);

        if (!snap.exists()) {
          // Chat doesn't exist yet. Try to create it from job data.
          const jobSnap = await getDoc(doc(db, "jobs", chatId));
          if (!jobSnap.exists()) {
            notifyError("Job not found");
            navigate("/my-jobs");
            return;
          }

          const job = jobSnap.data();
          const clientId = job.createdBy;
          const artisanId = job.artisanId;

          if (!clientId ||!artisanId) {
            notifyError("Job not assigned to an artisan yet");
            setLoading(false);
            return;
          }

          if (![clientId, artisanId].includes(user.uid)) {
            notifyError("You’re not part of this chat");
            navigate("/my-jobs");
            return;
          }

          // Create the chat now – rules allow this because you’re in participants
          await setDoc(chatRef, {
            jobId: chatId,
            participants: [clientId, artisanId],
            createdAt: serverTimestamp(),
            lastMessage: "",
            lastMessageAt: null,
            typing: {},
            seen: { [clientId]: false, [artisanId]: false }
          });
        } else {
          const data = snap.data();
          if (!data.participants?.includes(user.uid)) {
            notifyError("You don’t have access to this chat");
            navigate("/my-jobs");
            return;
          }
        }

        setChatExists(true);
      } catch (err) {
        console.error("Chat validation error:", err);
        notifyError("Could not load chat");
      } finally {
        setLoading(false);
      }
    };

    checkChat();
  }, [chatId, user?.uid, navigate]);

  // ✅ 2. REAL-TIME MESSAGES - only run if chatExists
  useEffect(() => {
    if (!chatId ||!user?.uid ||!chatExists) return;

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({
        id: d.id,
       ...d.data(),
      }));

      setMessages(msgs);

      // 🔔 SOUND
      msgs.forEach((msg) => {
        if (
          msg.senderId!== user.uid &&
          msg.status === "sent" &&
          lastPlayedRef.current!== msg.id
        ) {
          lastPlayedRef.current = msg.id;
          new Audio("/message.mp3").play().catch(() => {});
        }
      });

      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, (err) => {
      console.error("Messages listener error:", err);
      notifyError("Lost connection to chat");
    });

    return () => unsub();
  }, [chatId, user?.uid, chatExists]);

  // ✅ 3. SEND MESSAGE - now safe because chat exists
  const sendMessage = async () => {
    if (!input.trim() ||!user?.uid ||!chatExists) return;

    const tempInput = input.trim();
    setInput(""); // clear immediately for better UX

    try {
      console.log("SENDING MESSAGE", {
        chatId,
        userId: user.uid
      });

      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: tempInput,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        status: "sent",
      });

      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: tempInput,
        lastMessageAt: serverTimestamp(),
        [`typing.${user.uid}`]: false,
        [`seen.${user.uid}`]: true
      });

    } catch (err) {
      console.error("❌ SEND ERROR:", err);
      notifyError(err.code === 'permission-denied'
       ? "You don’t have permission to send here"
        : "Failed to send message");
      setInput(tempInput); // restore text if failed
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" &&!e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return <div className="p-6 text-white">Loading chat...</div>;
  }

  if (!chatExists) {
    return <div className="p-6 text-white">Cannot open chat. Job must be accepted first.</div>;
  }

  return (
    <div className="flex flex-col h-[90vh] text-white">
      <div className="p-4 border-b border-white/10">
        <h2 className="font-semibold">Chat</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.senderId === user.uid;
          return (
            <div
              key={msg.id}
              className={`flex ${isMe? "justify-end" : "justify-start"}`}
            >
              <div className={`px-3 py-2 rounded max-w-[70%] break-words ${
                isMe? "bg-blue-500" : "bg-slate-700"
              }`}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-white/10 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 p-2 rounded bg-slate-800 outline-none"
        />
        <button
          onClick={sendMessage}
          className="bg-green-500 px-5 rounded hover:bg-green-600 transition"
        >
          ➤
        </button>
      </div>
    </div>
  );
}