import { useState } from "react";
import { db, auth } from "../firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
} from "firebase/firestore";

export default function Task({ tasks, fetchTasks, isPro }) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState("");

  const user = auth.currentUser;

  const handleAddTask = async () => {
    if (!title) return;

    // 🔒 FREE LIMIT
    if (!isPro && tasks.length >= 3) {
      alert("Upgrade to Artisan Pro to add more than 3 tasks 💎");
      return;
    }

    await addDoc(collection(db, "tasks"), {
      title,
      priority,
      dueDate,
      userId: user.uid,
    });

    setTitle("");
    setPriority("normal");
    setDueDate("");
    fetchTasks();
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "tasks", id));
    fetchTasks();
  };

  return (
    <div>
      {/* ADD TASK */}
      <div
        style={{
          background: "#1e293b",
          padding: "20px",
          borderRadius: "12px",
          marginBottom: "30px",
        }}
      >
        <h2>Add Task</h2>

        <input
          placeholder="Task title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "10px",
            borderRadius: "8px",
            border: "none",
            background: "#0f172a",
            color: "white",
          }}
        />

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "10px",
            borderRadius: "8px",
            border: "none",
            background: "#0f172a",
            color: "white",
          }}
        >
          <option value="normal">Normal</option>
          <option value="urgent">Urgent</option>
        </select>

        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "10px",
            borderRadius: "8px",
            border: "none",
            background: "#0f172a",
            color: "white",
          }}
        />

        <button
          onClick={handleAddTask}
          style={{
            width: "100%",
            padding: "12px",
            background: "#22c55e",
            border: "none",
            borderRadius: "8px",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Add Task
        </button>
      </div>

      {/* TASK LIST */}
      <div>
        <h2>Your Tasks</h2>

        {tasks.length === 0 && (
          <p style={{ color: "#94a3b8" }}>No tasks yet...</p>
        )}

        {tasks.map((t) => (
          <div
            key={t.id}
            style={{
              background: "#1e293b",
              padding: "15px",
              borderRadius: "12px",
              marginBottom: "12px",
              borderLeft:
                t.priority === "urgent"
                  ? "5px solid #ef4444"
                  : "5px solid #22c55e",
            }}
          >
            <h3 style={{ margin: "0 0 5px 0" }}>{t.title}</h3>
            <p style={{ margin: 0 }}>Priority: {t.priority}</p>
            <p style={{ margin: 0 }}>
              Due: {t.dueDate || "No date"}
            </p>

            <button
              onClick={() => handleDelete(t.id)}
              style={{
                marginTop: "10px",
                background: "#ef4444",
                border: "none",
                padding: "8px 12px",
                borderRadius: "6px",
                color: "white",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}