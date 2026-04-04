import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function MaintenanceLogs() {
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [tool, setTool] = useState("");
  const [logs, setLogs] = useState([]);

  // 🔄 REAL-TIME LISTENER (NO INDEX NEEDED)
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "maintenance_logs"),
      where("userId", "==", user.uid)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));

        // 🔥 Sort manually (no Firestore index needed)
        data.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });

        setLogs(data);
      },
      (error) => {
        console.error("Snapshot error:", error);
      }
    );

    return () => unsub();
  }, [user]);

  // ➕ ADD LOG (WITH TOOL LINK)
  const addLog = async () => {
    if (!title.trim()) return alert("Enter log");

    try {
      await addDoc(collection(db, "maintenance_logs"), {
        title: title.trim(),
        tool: tool || "General",
        status: "pending",
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      setTitle("");
      setTool("");
    } catch (err) {
      console.error(err);
      alert("Failed to add log");
    }
  };

  // ✏️ EDIT
  const editLog = async (log) => {
    const newTitle = prompt("Edit log", log.title);
    if (!newTitle) return;

    try {
      await updateDoc(doc(db, "maintenance_logs", log.id), {
        title: newTitle.trim()
      });
    } catch (err) {
      console.error(err);
      alert("Edit failed");
    }
  };

  // ✅ MARK DONE
  const markDone = async (log) => {
    try {
      await updateDoc(doc(db, "maintenance_logs", log.id), {
        status: "done"
      });
    } catch (err) {
      console.error(err);
      alert("Update failed");
    }
  };

  // 🔁 UNDO
  const markPending = async (log) => {
    try {
      await updateDoc(doc(db, "maintenance_logs", log.id), {
        status: "pending"
      });
    } catch (err) {
      console.error(err);
    }
  };

  // 🗑 DELETE
  const deleteLog = async (id) => {
    if (!window.confirm("Delete log?")) return;

    try {
      await deleteDoc(doc(db, "maintenance_logs", id));
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  // 🕒 FORMAT TIME
  const formatDate = (ts) => {
    if (!ts?.seconds) return "Now";
    return new Date(ts.seconds * 1000).toLocaleString();
  };

  return (
    <div style={styles.container}>
      <h2>🛠 Maintenance Logs</h2>

      {/* ADD FORM */}
      <div style={styles.form}>
        <input
          placeholder="Task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={styles.input}
        />

        <input
          placeholder="Tool (optional)"
          value={tool}
          onChange={(e) => setTool(e.target.value)}
          style={styles.input}
        />

        <button onClick={addLog} style={styles.btn}>
          ➕ Add
        </button>
      </div>

      {/* LIST */}
      {logs.length === 0 && <p>No logs yet...</p>}

      {logs.map((log) => (
        <div key={log.id} style={styles.card}>
          <h3
            style={{
              textDecoration:
                log.status === "done" ? "line-through" : "none"
            }}
          >
            {log.title}
          </h3>

          <p>🧰 Tool: {log.tool || "General"}</p>
          <p>Status: {log.status}</p>
          <p>{formatDate(log.createdAt)}</p>

          <div style={styles.actions}>
            {log.status !== "done" ? (
              <button onClick={() => markDone(log)}>✅ Done</button>
            ) : (
              <button onClick={() => markPending(log)}>🔁 Undo</button>
            )}

            <button onClick={() => editLog(log)}>✏️</button>
            <button onClick={() => deleteLog(log.id)}>🗑</button>
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    color: "#fff",
    background: "#0f1115",
    minHeight: "100vh"
  },
  form: {
    display: "flex",
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
  btn: {
    background: "#3b82f6",
    border: "none",
    padding: "10px",
    borderRadius: "6px",
    color: "#fff"
  },
  card: {
    background: "#1a1a1a",
    padding: "15px",
    marginBottom: "10px",
    borderRadius: "8px"
  },
  actions: {
    marginTop: "10px",
    display: "flex",
    gap: "10px"
  }
};