import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function Knowledge() {
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [knowledgeList, setKnowledgeList] = useState([]);

  // 🔄 LOAD KNOWLEDGE (GLOBAL READ)
  useEffect(() => {
    const q = query(collection(db, "knowledge"));

    const unsub = onSnapshot(q, (snapshot) => {
      setKnowledgeList(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }))
      );
    });

    return () => unsub();
  }, []);

  // ➕ ADD ARTICLE
  const addKnowledge = async () => {
    if (!user?.uid) return alert("Login required");
    if (!title.trim() || !content.trim())
      return alert("Fill all fields");

    await addDoc(collection(db, "knowledge"), {
      title: title.trim(),
      content: content.trim(),
      userId: user.uid,
      createdAt: serverTimestamp()
    });

    setTitle("");
    setContent("");
  };

  // ✏️ EDIT
  const editKnowledge = async (item) => {
    const newTitle = prompt("Edit title", item.title);
    const newContent = prompt("Edit content", item.content);

    if (!newTitle || !newContent) return;

    await updateDoc(doc(db, "knowledge", item.id), {
      title: newTitle,
      content: newContent
    });
  };

  // 🗑 DELETE
  const deleteKnowledge = async (id) => {
    await deleteDoc(doc(db, "knowledge", id));
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📚 Knowledge Hub</h2>

      {/* FORM */}
      <div style={styles.form}>
        <input
          style={styles.input}
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          style={styles.textarea}
          placeholder="Write knowledge..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <button style={styles.addBtn} onClick={addKnowledge}>
          ➕ Add
        </button>
      </div>

      {/* LIST */}
      <ul style={styles.list}>
        {knowledgeList.map((item) => (
          <li key={item.id} style={styles.card}>
            <h3>{item.title}</h3>
            <p style={styles.text}>{item.content}</p>

            <div style={styles.actions}>
              <button onClick={() => editKnowledge(item)}>✏️</button>
              <button onClick={() => deleteKnowledge(item.id)}>🗑</button>
            </div>
          </li>
        ))}
      </ul>
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
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "20px"
  },
  input: {
    padding: "10px",
    background: "#1f2229",
    border: "1px solid #333",
    color: "#fff",
    borderRadius: "6px"
  },
  textarea: {
    padding: "10px",
    background: "#1f2229",
    border: "1px solid #333",
    color: "#fff",
    borderRadius: "6px",
    minHeight: "100px"
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
  text: { color: "#ccc" },
  actions: { marginTop: "10px", display: "flex", gap: "10px" }
};