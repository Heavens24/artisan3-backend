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
  const [type, setType] = useState("preventative");
  const [intervalDays, setIntervalDays] = useState(30);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "maintenance_logs"),
      where("userId", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setLogs(data);
    });

    return () => unsub();
  }, [user]);

  const calculateNextDate = () => {
    const now = new Date();
    now.setDate(now.getDate() + Number(intervalDays || 0));
    return now;
  };

  const addLog = async () => {
    if (!title.trim()) return;

    await addDoc(collection(db, "maintenance_logs"), {
      title,
      tool: tool || "General",
      type,
      intervalDays: type === "preventative" ? intervalDays : null,
      nextMaintenance: type === "preventative" ? calculateNextDate() : null,
      status: "pending",
      userId: user.uid,
      createdAt: serverTimestamp()
    });

    setTitle("");
    setTool("");
  };

  const markDone = async (log) => {
    const nextDate =
      log.type === "preventative"
        ? new Date(new Date().setDate(new Date().getDate() + log.intervalDays))
        : null;

    await updateDoc(doc(db, "maintenance_logs", log.id), {
      status: "done",
      completedAt: new Date(),
      nextMaintenance: nextDate
    });
  };

  const deleteLog = async (id) => {
    if (!window.confirm("Delete log?")) return;
    await deleteDoc(doc(db, "maintenance_logs", id));
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date.seconds ? date.seconds * 1000 : date).toLocaleDateString();
  };

  const isDueSoon = (date) => {
    if (!date) return false;
    const d = new Date(date.seconds ? date.seconds * 1000 : date);
    const diff = (d - new Date()) / (1000 * 60 * 60 * 24);
    return diff <= 3;
  };

  return (
    <div className="p-6 text-white">
      <h2 className="text-2xl font-bold mb-4">🛠 Maintenance Logs</h2>

      {/* FORM */}
      <div className="grid md:grid-cols-5 gap-2 mb-6">
        <input
          placeholder="Task"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="p-2 bg-slate-800 rounded"
        />

        <input
          placeholder="Tool"
          value={tool}
          onChange={(e) => setTool(e.target.value)}
          className="p-2 bg-slate-800 rounded"
        />

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="p-2 bg-slate-800 rounded"
        >
          <option value="preventative">Preventative</option>
          <option value="breakdown">Breakdown</option>
        </select>

        {type === "preventative" && (
          <input
            type="number"
            placeholder="Days"
            value={intervalDays}
            onChange={(e) => setIntervalDays(e.target.value)}
            className="p-2 bg-slate-800 rounded"
          />
        )}

        <button onClick={addLog} className="bg-blue-600 rounded p-2">
          Add
        </button>
      </div>

      {/* LOGS */}
      {logs.map((log) => (
        <div
          key={log.id}
          className="bg-slate-800 p-4 mb-3 rounded-lg border border-slate-700"
        >
          <h3 className="font-semibold">{log.title}</h3>

          <p>🧰 {log.tool}</p>
          <p>📌 Type: {log.type}</p>
          <p>Status: {log.status}</p>

          <p>
            📅 Next:{" "}
            <span className={isDueSoon(log.nextMaintenance) ? "text-red-400" : ""}>
              {formatDate(log.nextMaintenance)}
            </span>
          </p>

          <div className="flex gap-2 mt-2">
            <button onClick={() => markDone(log)}>✅ Done</button>
            <button onClick={() => deleteLog(log.id)}>🗑</button>
          </div>
        </div>
      ))}
    </div>
  );
}