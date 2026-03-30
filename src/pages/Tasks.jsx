import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [dueDate, setDueDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");

  const auth = getAuth();
  const user = auth.currentUser;

  // ============================================
  // 📥 LOAD TASKS
  // ============================================
  const fetchTasks = async () => {
    try {
      if (!user) return;

      const q = query(
        collection(db, "tasks"),
        where("userId", "==", user.uid)
      );

      const snapshot = await getDocs(q);

      const taskList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setTasks(taskList);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  // ============================================
  // ➕ ADD TASK (AUTO ALERT READY)
  // ============================================
  const addTask = async () => {
    try {
      if (!title) {
        alert("Task title required");
        return;
      }

      await addDoc(collection(db, "tasks"), {
        title,
        priority,
        dueDate: dueDate || null,
        reminderTime: reminderTime || null,
        userId: user.uid,
        status: "pending",
        notified: false, // 🔥 REQUIRED
        createdAt: new Date(),
      });

      // 🔄 RESET INPUTS
      setTitle("");
      setPriority("Normal");
      setDueDate("");
      setReminderTime("");

      fetchTasks();

      alert("Task added!");
    } catch (err) {
      console.error(err);
      alert("Failed to add task");
    }
  };

  // ============================================
  // ❌ DELETE TASK
  // ============================================
  const deleteTask = async (id) => {
    try {
      await deleteDoc(doc(db, "tasks", id));
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  // ============================================
  // 🔔 TEST NOTIFICATION BUTTON
  // ============================================
  const sendNotification = async () => {
    try {
      const res = await fetch("http://localhost:5000/notify-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          message: "🔥 Test notification from Artisan3.0",
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("Notification sent!");
      } else {
        alert("Failed to send");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to send");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>📋 Tasks</h2>

      {/* ================= FORM ================= */}
      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option>Low</option>
          <option>Normal</option>
          <option>High</option>
        </select>

        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <input
          type="datetime-local"
          value={reminderTime}
          onChange={(e) => setReminderTime(e.target.value)}
        />

        <button onClick={addTask}>Add Task</button>
      </div>

      {/* ================= NOTIFICATION TEST ================= */}
      <div style={{ marginBottom: "20px" }}>
        <h3>🔔 Test Push Notification</h3>
        <button onClick={sendNotification}>
          Send Notification 🚀
        </button>
      </div>

      {/* ================= TASK LIST ================= */}
      <h3>Your Tasks</h3>

      {tasks.length === 0 ? (
        <p>No tasks yet</p>
      ) : (
        tasks.map((task) => (
          <div
            key={task.id}
            style={{
              background: "#0f5132",
              color: "white",
              padding: "15px",
              marginBottom: "10px",
              borderRadius: "8px",
            }}
          >
            <h4>
              {task.title} — {task.priority}
            </h4>

            {task.dueDate && (
              <p>📅 Due: {task.dueDate}</p>
            )}

            {task.reminderTime && (
              <p>⏰ Reminder: {task.reminderTime}</p>
            )}

            <button onClick={() => deleteTask(task.id)}>
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default Tasks;