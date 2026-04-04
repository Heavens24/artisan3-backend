import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function Tools() {
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState("good");
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔄 LOAD TOOLS
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "tools"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));

        setTools(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // ➕ ADD TOOL + CREATE LOG
  const addTool = async () => {
    if (!user?.uid) return alert("User not ready");
    if (!name.trim()) return alert("Enter tool name");

    try {
      await addDoc(collection(db, "tools"), {
        userId: user.uid,
        name: name.trim(),
        quantity: Number(quantity),
        condition,
        totalUses: 0,
        lastUsed: null,
        createdAt: serverTimestamp()
      });

      // 🔥 CREATE MAINTENANCE LOG
      await addDoc(collection(db, "maintenance_logs"), {
        title: `Tool added: ${name}`,
        tool: name,
        status: "pending",
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      setName("");
      setQuantity(1);
      setCondition("good");
    } catch (err) {
      console.error(err);
      alert("Failed to add tool");
    }
  };

  // 🔧 USE TOOL + CREATE LOG
  const useTool = async (tool) => {
    try {
      const ref = doc(db, "tools", tool.id);

      await updateDoc(ref, {
        quantity: Math.max((tool.quantity || 0) - 1, 0),
        totalUses: (tool.totalUses || 0) + 1,
        lastUsed: serverTimestamp()
      });

      // 🔥 LOG USAGE
      await addDoc(collection(db, "maintenance_logs"), {
        title: `Used tool: ${tool.name}`,
        tool: tool.name,
        status: "done",
        userId: user.uid,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  // ✏️ EDIT TOOL
  const editTool = async (tool) => {
    const newName = prompt("Edit tool name", tool.name);
    if (!newName) return;

    try {
      await updateDoc(doc(db, "tools", tool.id), {
        name: newName.trim()
      });
    } catch (err) {
      console.error(err);
    }
  };

  // 🗑 DELETE TOOL + LOG
  const deleteTool = async (tool) => {
    if (!window.confirm("Delete tool?")) return;

    try {
      await deleteDoc(doc(db, "tools", tool.id));

      // 🔥 LOG DELETE
      await addDoc(collection(db, "maintenance_logs"), {
        title: `Deleted tool: ${tool.name}`,
        tool: tool.name,
        status: "pending",
        userId: user.uid,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  // 🕒 FORMAT TIME
  const formatDate = (ts) => {
    if (!ts?.seconds) return "Now";
    return new Date(ts.seconds * 1000).toLocaleString();
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🧰 Tools Intelligence</h2>

      {/* FORM */}
      <div style={styles.form}>
        <input
          style={styles.input}
          placeholder="Tool name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          style={styles.input}
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />

        <select
          style={styles.input}
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
        >
          <option value="new">New</option>
          <option value="good">Good</option>
          <option value="worn">Worn</option>
        </select>

        <button style={styles.addBtn} onClick={addTool}>
          ➕ Add Tool
        </button>
      </div>

      {/* LIST */}
      {loading ? (
        <p>Loading...</p>
      ) : tools.length === 0 ? (
        <p>No tools yet</p>
      ) : (
        <ul style={styles.list}>
          {tools.map((tool) => (
            <li key={tool.id} style={styles.card}>
              <strong>{tool.name}</strong>

              <p>Qty: {tool.quantity}</p>
              <p>Condition: {tool.condition}</p>
              <p>Uses: {tool.totalUses || 0}</p>
              <p>Last Used: {formatDate(tool.lastUsed)}</p>

              {tool.quantity <= 2 && (
                <p style={styles.warning}>⚠️ Low Stock</p>
              )}

              <div style={styles.actions}>
                <button onClick={() => useTool(tool)}>🔧 Use</button>
                <button onClick={() => editTool(tool)}>✏️</button>
                <button onClick={() => deleteTool(tool)}>🗑</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    background: "#0f1115",
    minHeight: "100vh",
    color: "#fff"
  },
  title: { marginBottom: "20px" },
  form: { display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" },
  input: {
    padding: "10px",
    background: "#1f2229",
    border: "1px solid #333",
    color: "#fff",
    borderRadius: "6px"
  },
  addBtn: {
    padding: "10px",
    background: "#3b82f6",
    border: "none",
    borderRadius: "6px",
    color: "#fff"
  },
  list: { listStyle: "none", padding: 0 },
  card: {
    padding: "15px",
    background: "#1a1a1a",
    marginBottom: "10px",
    borderRadius: "8px"
  },
  warning: { color: "#facc15", fontWeight: "bold" },
  actions: { marginTop: "10px", display: "flex", gap: "10px" }
};