import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot
} from "firebase/firestore";

import { useAuth } from "../context/AuthContext";

export default function Logs() {
  const { user } = useAuth();

  const [logs, setLogs] = useState([]);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");

  // 🔥 PREVENT CRASH
  if (!user) return <p>Loading...</p>;

  useEffect(() => {
    const q = query(
      collection(db, "logs"),
      where("userId", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    });

    return () => unsub();
  }, [user]);

  const addLog = async () => {
    if (!title) return alert("Enter title");

    await addDoc(collection(db, "logs"), {
      title,
      details,
      userId: user.uid,
      createdAt: new Date()
    });

    setTitle("");
    setDetails("");
  };

  return (
    <div style={{ padding: "20px", color: "white" }}>
      <h2>📒 Job Logs</h2>

      <input
        placeholder="Job title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        placeholder="Details"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
      />

      <button onClick={addLog}>Add Log</button>

      <h3>Your Logs</h3>

      {logs.map((log) => (
        <div key={log.id}>
          <p><b>{log.title}</b></p>
          <p>{log.details}</p>
        </div>
      ))}
    </div>
  );
}