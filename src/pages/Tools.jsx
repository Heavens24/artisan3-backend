import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  orderBy
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function Tools() {
  const { user } = useAuth();

  const [tools, setTools] = useState([]);
  const [name, setName] = useState("");
  const [condition, setCondition] = useState("Good");

  // 🔥 Prevent crash if user is not loaded yet
  if (!user) return <p>Loading...</p>;

  useEffect(() => {
    // Firestore query: get tools for this user, ordered by creation time
    const q = query(
      collection(db, "tools"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setTools(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }))
      );
    });

    // Cleanup subscription on unmount
    return () => unsub();
  }, [user]);

  const addTool = async () => {
    if (!name.trim()) return alert("Enter a tool name");

    try {
      await addDoc(collection(db, "tools"), {
        name: name.trim(),
        condition,
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      // Reset inputs after adding
      setName("");
      setCondition("Good");
    } catch (error) {
      console.error("Error adding tool:", error);
      alert("Failed to add tool. Try again.");
    }
  };

  return (
    <div style={{ padding: "20px", color: "white" }}>
      <h2>🧰 Tool Tracking</h2>

      <div style={{ marginBottom: "10px" }}>
        <input
          placeholder="Tool name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ marginRight: "10px", padding: "5px" }}
        />

        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          style={{ marginRight: "10px", padding: "5px" }}
        >
          <option>Good</option>
          <option>Needs Repair</option>
          <option>Broken</option>
        </select>

        <button onClick={addTool} style={{ padding: "5px 10px" }}>
          Add Tool
        </button>
      </div>

      <h3>Your Tools</h3>
      {tools.length === 0 && <p>No tools yet.</p>}
      {tools.map((tool) => (
        <div key={tool.id} style={{ marginBottom: "5px" }}>
          <strong>{tool.name}</strong> — {tool.condition}
        </div>
      ))}
    </div>
  );
}