import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function Tasks() {
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  // LOAD TASKS
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      setTasks(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // ADD / UPDATE
  const handleSaveTask = async () => {
    if (!user?.uid) return alert("User not ready");
    if (!title.trim()) return alert("Enter task title");
    if (!date) return alert("Select date");

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return alert("Invalid date");

    try {
      if (editingId) {
        await updateDoc(doc(db, "tasks", editingId), {
          title: title.trim(),
          priority,
          reminderTime: parsedDate.toISOString()
        });
      } else {
        await addDoc(collection(db, "tasks"), {
          userId: user.uid,
          title: title.trim(),
          priority,
          reminderTime: parsedDate.toISOString(),
          status: "pending",
          notified: false,
          createdAt: serverTimestamp()
        });
      }

      setTitle("");
      setDate("");
      setPriority("medium");
      setEditingId(null);

    } catch (err) {
      console.error(err);
    }
  };

  // DELETE
  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "tasks", id));
  };

  // TOGGLE COMPLETE
  const toggleComplete = async (task) => {
    await updateDoc(doc(db, "tasks", task.id), {
      status: task.status === "completed" ? "pending" : "completed"
    });
  };

  // EDIT
  const handleEdit = (task) => {
    setTitle(task.title);
    setPriority(task.priority);

    if (task.reminderTime) {
      const d = new Date(task.reminderTime);
      setDate(d.toISOString().slice(0, 16));
    }

    setEditingId(task.id);
  };

  // FORMAT DATE
  const formatDate = (time) => {
    const d = new Date(time);
    if (isNaN(d.getTime())) return "No valid date";
    return d.toLocaleString();
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📋 Task Manager</h2>

      {/* FORM */}
      <div style={styles.form}>
        <input
          style={styles.input}
          type="text"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          style={styles.input}
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <select
          style={styles.input}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <button style={styles.addBtn} onClick={handleSaveTask}>
          {editingId ? "💾 Update Task" : "➕ Add Task"}
        </button>
      </div>

      {/* LIST */}
      {loading ? (
        <p style={styles.text}>Loading...</p>
      ) : tasks.length === 0 ? (
        <p style={styles.text}>No tasks yet</p>
      ) : (
        <ul style={styles.list}>
          {tasks.map((task) => (
            <li
              key={task.id}
              style={{
                ...styles.card,
                background:
                  task.status === "completed" ? "#1e4620" : "#1a1a1a"
              }}
            >
              <strong
                style={{
                  ...styles.taskTitle,
                  textDecoration:
                    task.status === "completed" ? "line-through" : "none"
                }}
              >
                {task.title}
              </strong>

              <p style={styles.text}>Priority: {task.priority}</p>
              <p style={styles.text}>Time: {formatDate(task.reminderTime)}</p>
              <p style={styles.text}>Status: {task.status}</p>

              <div style={styles.actions}>
                <button
                  style={styles.completeBtn}
                  onClick={() => toggleComplete(task)}
                >
                  ✅
                </button>

                <button
                  style={styles.editBtn}
                  onClick={() => handleEdit(task)}
                >
                  ✏️
                </button>

                <button
                  style={styles.deleteBtn}
                  onClick={() => handleDelete(task.id)}
                >
                  🗑
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// 🎨 DARK UI STYLES
const styles = {
  container: {
    padding: "20px",
    background: "#0f1115",
    minHeight: "100vh",
    color: "#fff"
  },
  title: {
    marginBottom: "20px"
  },
  form: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "20px"
  },
  input: {
    padding: "10px",
    background: "#1f2229",
    border: "1px solid #333",
    color: "#fff",
    borderRadius: "6px"
  },
  addBtn: {
    padding: "10px 15px",
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  },
  list: {
    listStyle: "none",
    padding: 0
  },
  card: {
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "15px",
    border: "1px solid #333"
  },
  taskTitle: {
    fontSize: "16px"
  },
  text: {
    margin: "5px 0",
    color: "#ccc"
  },
  actions: {
    marginTop: "10px",
    display: "flex",
    gap: "10px"
  },
  completeBtn: {
    background: "#22c55e",
    border: "none",
    padding: "8px",
    borderRadius: "6px",
    cursor: "pointer"
  },
  editBtn: {
    background: "#facc15",
    border: "none",
    padding: "8px",
    borderRadius: "6px",
    cursor: "pointer"
  },
  deleteBtn: {
    background: "#ef4444",
    border: "none",
    padding: "8px",
    borderRadius: "6px",
    cursor: "pointer"
  }
};