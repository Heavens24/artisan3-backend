import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function Tasks() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [dueDate, setDueDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");

  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  // 🔒 Prevent crash if user not ready
  if (!user) return <p style={{ padding: "20px" }}>Loading...</p>;

  // 🔄 FETCH TASKS
  useEffect(() => {
    try {
      const q = query(
        collection(db, "tasks"),
        where("userId", "==", user.uid)
      );

      const unsub = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTasks(data);
      });

      return () => unsub();
    } catch (err) {
      console.log("❌ Fetch error:", err.message);
    }
  }, [user]);

  // 🔔 SIMPLE REMINDER (SAFE FALLBACK)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();

      tasks.forEach((task) => {
        if (!task.reminderTime) return;

        if (now >= new Date(task.reminderTime)) {
          alert(`🔔 Reminder: ${task.title}`);
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [tasks]);

  // ➕ ADD TASK
  const addTask = async () => {
    if (!title) return alert("Enter task");

    try {
      await addDoc(collection(db, "tasks"), {
        title,
        priority,
        dueDate: dueDate || null,
        reminderTime: reminderTime || null,
        userId: user.uid,
        status: "pending",
        createdAt: new Date(),
      });

      setTitle("");
      setDueDate("");
      setReminderTime("");
    } catch (err) {
      console.log("❌ Add error:", err.message);
    }
  };

  // ✅ COMPLETE TASK
  const completeTask = async (id) => {
    try {
      await updateDoc(doc(db, "tasks", id), {
        status: "done",
      });
    } catch (err) {
      console.log("❌ Complete error:", err.message);
    }
  };

  // 🗑 DELETE TASK
  const deleteTask = async (id) => {
    if (!window.confirm("Delete this task?")) return;

    try {
      await deleteDoc(doc(db, "tasks", id));
    } catch (err) {
      console.log("❌ Delete error:", err.message);
    }
  };

  // ✏️ START EDIT
  const startEdit = (task) => {
    setEditingTask(task.id);
    setEditTitle(task.title);
  };

  // 💾 SAVE EDIT
  const saveEdit = async (id) => {
    try {
      await updateDoc(doc(db, "tasks", id), {
        title: editTitle,
      });

      setEditingTask(null);
      setEditTitle("");
    } catch (err) {
      console.log("❌ Edit error:", err.message);
    }
  };

  // 🔴 OVERDUE CHECK
  const isOverdue = (task) => {
    if (!task.dueDate) return false;
    return new Date() > new Date(task.dueDate) && task.status !== "done";
  };

  // 🔔 SEND TEST PUSH (AUTO USER)
  const sendTestNotification = async () => {
    try {
      await fetch("http://localhost:5000/notify-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          title: "🔥 Artisan3.0 Alert",
          body: "Auto notification is working 🚀",
        }),
      });

      alert("✅ Notification sent");
    } catch (err) {
      console.log(err);
      alert("❌ Failed to send");
    }
  };

  return (
    <div style={{ padding: "20px", color: "white" }}>
      <h2>✅ Tasks</h2>

      {/* ADD TASK */}
      <input
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
      >
        <option>Normal</option>
        <option>Urgent</option>
      </select>

      <br /><br />

      <input
        type="datetime-local"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />

      <br /><br />

      <input
        type="datetime-local"
        value={reminderTime}
        onChange={(e) => setReminderTime(e.target.value)}
      />

      <br /><br />

      <button onClick={addTask}>Add Task</button>

      <hr />

      {/* 🔔 TEST NOTIFICATION */}
      <h3>🔔 Test Push Notification</h3>
      <button onClick={sendTestNotification}>
        Send Notification 🚀
      </button>

      <hr />

      {/* TASK LIST */}
      <h3>Your Tasks</h3>

      {tasks.map((task) => (
        <div
          key={task.id}
          style={{
            padding: "10px",
            marginBottom: "10px",
            background:
              task.status === "done"
                ? "#065f46"
                : isOverdue(task)
                ? "#7f1d1d"
                : "#1e293b",
            borderRadius: "8px",
          }}
        >
          {editingTask === task.id ? (
            <>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <button onClick={() => saveEdit(task.id)}>Save</button>
            </>
          ) : (
            <p>
              <strong>{task.title}</strong> — {task.priority}
            </p>
          )}

          {task.dueDate && (
            <p>📅 {new Date(task.dueDate).toLocaleString()}</p>
          )}

          {task.reminderTime && (
            <p>🔔 {new Date(task.reminderTime).toLocaleString()}</p>
          )}

          {isOverdue(task) && (
            <p style={{ color: "red" }}>⚠️ Overdue</p>
          )}

          <div style={{ marginTop: "8px" }}>
            {task.status !== "done" && (
              <button onClick={() => completeTask(task.id)}>
                ✅ Done
              </button>
            )}

            <button onClick={() => startEdit(task)}>
              ✏️ Edit
            </button>

            <button onClick={() => deleteTask(task.id)}>
              🗑 Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}