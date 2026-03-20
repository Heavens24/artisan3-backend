import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  doc,
} from "firebase/firestore";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [task, setTask] = useState("");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState("");
  const [tasks, setTasks] = useState([]);

  // 🔗 PUT YOUR REAL CHECKOUT LINK HERE
  const CHECKOUT_URL = "https://politehub.lemonsqueezy.com/checkout/buy/29904543-a23c-495d-9b8c-5d777d6d9ecd";

  // ✅ AUTH + DATA LISTENERS
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (!u) return;

      setUser(u);

      // 🔥 PRO STATUS (FIXED — DIRECT DOC)
      const userRef = doc(db, "users", u.uid);

      const unsubUser = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          setIsPro(docSnap.data().isPro || false);
        } else {
          setIsPro(false);
        }
      });

      // 🔥 TASKS LISTENER
      const taskQuery = query(
        collection(db, "tasks"),
        where("userId", "==", u.uid)
      );

      const unsubTasks = onSnapshot(taskQuery, (snapshot) => {
        const list = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setTasks(list);
      });

      return () => {
        unsubUser();
        unsubTasks();
      };
    });

    return () => unsubscribe();
  }, []);

  // ✅ ADD TASK
  const addTask = async () => {
    if (!task || !dueDate) {
      alert("Please fill all fields");
      return;
    }

    await addDoc(collection(db, "tasks"), {
      title: task,
      priority,
      dueDate,
      userId: user.uid,
    });

    setTask("");
    setPriority("normal");
    setDueDate("");
  };

  // ✅ LOGOUT
  const handleLogout = async () => {
    await signOut(auth);
  };

  if (!user) return <p style={{ color: "white" }}>Loading...</p>;

  return (
    <div
      style={{
        padding: "20px",
        background: "#0f172a",
        minHeight: "100vh",
        color: "white",
      }}
    >
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h1>🚀 Artisan3.0</h1>
          <p>{user.email}</p>

          {/* 💎 PRO / UPGRADE */}
          {isPro ? (
            <div style={{ marginTop: "10px" }}>
              <p style={{ color: "#22c55e", marginBottom: "8px" }}>
                💎 You are a Pro user
              </p>

              <button
                onClick={() =>
                  alert("Manage billing coming soon 🚀")
                }
                style={{
                  padding: "8px 12px",
                  background: "#334155",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Manage Subscription ⚙️
              </button>
            </div>
          ) : (
            <a
              href={`${CHECKOUT_URL}?checkout[custom][user_id]=${user.uid}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                marginTop: "10px",
                padding: "10px 14px",
                background: "#facc15",
                borderRadius: "8px",
                color: "black",
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              Upgrade to Pro 💎
            </a>
          )}
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: "#ef4444",
            border: "none",
            padding: "10px",
            borderRadius: "8px",
            color: "white",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      {/* ADD TASK */}
      <div
        style={{
          marginTop: "30px",
          padding: "20px",
          background: "#1e293b",
          borderRadius: "10px",
        }}
      >
        <h2>Add Task</h2>

        <input
          placeholder="Task title..."
          value={task}
          onChange={(e) => setTask(e.target.value)}
          style={inputStyle}
        />

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          style={inputStyle}
        >
          <option value="normal">Normal</option>
          <option value="urgent">Urgent</option>
        </select>

        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={inputStyle}
        />

        <button onClick={addTask} style={addBtn}>
          Add Task
        </button>
      </div>

      {/* TASK LIST */}
      <div style={{ marginTop: "30px" }}>
        <h2>Your Tasks</h2>

        {tasks.length === 0 && <p>No tasks yet...</p>}

        {tasks.map((t) => (
          <div
            key={t.id}
            style={{
              background: "#1e293b",
              padding: "15px",
              marginTop: "10px",
              borderRadius: "8px",
              borderLeft:
                t.priority === "urgent"
                  ? "4px solid red"
                  : "4px solid green",
            }}
          >
            <h3>{t.title}</h3>
            <p>Priority: {t.priority}</p>
            <p>Due: {t.dueDate}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 🎨 STYLES
const inputStyle = {
  display: "block",
  width: "100%",
  marginTop: "10px",
  padding: "10px",
  borderRadius: "6px",
  border: "none",
};

const addBtn = {
  marginTop: "10px",
  padding: "10px",
  background: "#22c55e",
  border: "none",
  borderRadius: "6px",
  color: "white",
  cursor: "pointer",
};