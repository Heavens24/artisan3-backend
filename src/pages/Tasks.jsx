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

  const [fcmToken, setFcmToken] = useState("");

  if (!user) return <p>Loading...</p>;

  // 🔄 FETCH TASKS
  useEffect(() => {
    const q = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    });

    return () => unsub();
  }, [user]);

  // 🔔 SIMPLE ALERT REMINDER (SAFE)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();

      tasks.forEach(task => {
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

    await addDoc(collection(db, "tasks"), {
      title,
      priority,
      dueDate: dueDate || null,
      reminderTime: reminderTime || null,
      userId: user.uid,
      status: "pending",
      createdAt: new Date()
    });

    setTitle("");
    setDueDate("");
    setReminderTime("");
  };

  // 🔔 SEND TEST PUSH
  const sendTestNotification = async () => {
    if (!fcmToken) {
      return alert("Paste your FCM token first");
    }

    await fetch("http://localhost:5000/send-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: fcmToken,
        title: "🔥 Artisan3.0 Alert",
        body: "Your task system is working perfectly!",
      }),
    });

    alert("Notification sent 🚀");
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

      {/* 🔔 PUSH TEST */}
      <h3>🔔 Test Push Notification</h3>

      <input
        placeholder="Paste FCM Token"
        value={fcmToken}
        onChange={(e) => setFcmToken(e.target.value)}
        style={{ width: "100%" }}
      />

      <br /><br />

      <button onClick={sendTestNotification}>
        Send Test Notification 🚀
      </button>

      <hr />

      {/* TASK LIST */}
      <h3>Your Tasks</h3>

      {tasks.map(task => (
        <div key={task.id}>
          <p>{task.title}</p>
        </div>
      ))}
    </div>
  );
}