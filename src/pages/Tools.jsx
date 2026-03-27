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

export default function Tools() {
  const { user } = useAuth();

  const [tools, setTools] = useState([]);
  const [name, setName] = useState("");
  const [condition, setCondition] = useState("Good");

  // 🔥 PREVENT CRASH
  if (!user) return <p>Loading...</p>;

  useEffect(() => {
    const q = query(
      collection(db, "tools"),
      where("userId", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setTools(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    });

    return () => unsub();
  }, [user]);

  const addTool = async () => {
    if (!name) return alert("Enter tool name");

    await addDoc(collection(db, "tools"), {
      name,
      condition,
      userId: user.uid,
      createdAt: new Date()
    });

    setName("");
  };

  return (
    <div style={{ padding: "20px", color: "white" }}>
      <h2>🧰 Tool Tracking</h2>

      <input
        placeholder="Tool name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <select onChange={(e) => setCondition(e.target.value)}>
        <option>Good</option>
        <option>Needs Repair</option>
        <option>Broken</option>
      </select>

      <button onClick={addTool}>Add Tool</button>

      <h3>Your Tools</h3>

      {tools.map((tool) => (
        <div key={tool.id}>
          <p>{tool.name} — {tool.condition}</p>
        </div>
      ))}
    </div>
  );
}