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

export default function Tasks() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("Normal");

  // 🔥 PREVENT CRASH
  if (!user) return <p>Loading...</p>;

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

  const addTask = async () => {
    if (!title) return alert("Enter task");

    await addDoc(collection(db, "tasks"), {
      title,
      priority,
      userId: user.uid,
      createdAt: new Date()
    });

    setTitle("");
  };

  return (
    <div style={{ padding: "20px", color: "white" }}>
      <h2>✅ Tasks</h2>

      <input
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <select onChange={(e) => setPriority(e.target.value)}>
        <option>Normal</option>
        <option>Urgent</option>
      </select>

      <button onClick={addTask}>Add Task</button>

      <h3>Your Tasks</h3>

      {tasks.map((task) => (
        <div key={task.id}>
          <p>{task.title} — {task.priority}</p>
        </div>
      ))}
    </div>
  );
}