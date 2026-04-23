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
import { notifySuccess, notifyError } from "../components/NotificationProvider";

export default function Tasks() {
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [tasks, setTasks] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
         ...doc.data()
        }));
        setTasks(list);
        setLoading(false);
      },
      (err) => {
        console.error("Tasks listener error:", err);
        notifyError("Could not load tasks");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const handleSaveTask = async () => {
    if (!title.trim() ||!date) return notifyError("Fill all fields");
    if (!user?.uid) return notifyError("Not logged in");

    try {
      setSaving(true);
      const reminder = new Date(date);

      if (editingId) {
        await updateDoc(doc(db, "tasks", editingId), {
          title: title.trim(),
          priority,
          reminderTime: reminder,
          updatedAt: serverTimestamp()
        });
        notifySuccess("Task updated");
      } else {
        await addDoc(collection(db, "tasks"), {
          userId: user.uid,
          title: title.trim(),
          priority,
          reminderTime: reminder,
          status: "pending",
          notified: false,
          createdAt: serverTimestamp()
        });
        notifySuccess("Task added");
      }

      setTitle("");
      setDate("");
      setPriority("medium");
      setEditingId(null);
    } catch (err) {
      console.error(err);
      notifyError(err.code === 'permission-denied'
       ? "No permission to save task"
        : "Failed to save task");
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = async (task) => {
    try {
      await updateDoc(doc(db, "tasks", task.id), {
        status: task.status === "completed"? "pending" : "completed"
      });
    } catch (err) {
      console.error(err);
      notifyError("Could not update task");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await deleteDoc(doc(db, "tasks", id));
      notifySuccess("Task deleted");
    } catch (err) {
      console.error(err);
      notifyError("Could not delete task");
    }
  };

  const toLocalDateTimeString = (t) => {
    if (!t) return "";
    const d = new Date(t.seconds? t.seconds * 1000 : t);
    if (isNaN(d)) return "";
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 16);
  };

  const handleEdit = (task) => {
    setTitle(task.title);
    setPriority(task.priority);
    setDate(toLocalDateTimeString(task.reminderTime));
    setEditingId(task.id);
  };

  const formatDate = (t) => {
    if (!t) return "-";
    const d = new Date(t.seconds? t.seconds * 1000 : t);
    return isNaN(d)? "-" : d.toLocaleString();
  };

  return (
    <div className="p-2 md:p-6 text-white">
      <h2 className="text-2xl mb-4">📋 Tasks</h2>

      <div className="flex gap-2 flex-wrap mb-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task"
          className="p-2 bg-slate-800 rounded outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-[150px]"
        />

        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="p-2 bg-slate-800 rounded outline-none focus:ring-2 focus:ring-blue-500"
        />

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="p-2 bg-slate-800 rounded outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
        </select>

        <button
          onClick={handleSaveTask}
          disabled={saving}
          className="bg-blue-600 px-4 rounded hover:bg-blue-700 transition disabled:opacity-50"
        >
          {saving? "Saving..." : editingId? "Update" : "Add"}
        </button>

        {editingId && (
          <button
            onClick={() => {
              setEditingId(null);
              setTitle("");
              setDate("");
              setPriority("medium");
            }}
            className="bg-gray-600 px-4 rounded hover:bg-gray-700 transition"
          >
            Cancel
          </button>
        )}
      </div>

      {loading? (
        <p>Loading...</p>
      ) : tasks.length === 0? (
        <div className="text-center py-16 bg-slate-800/50 rounded-2xl">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-bold mb-2">No tasks yet</h3>
          <p className="text-gray-400 mb-6 max-w-sm mx-auto">Track what Transnet wants done + your weekend side jobs in one place. Never forget a deadline.</p>
          <button
            onClick={() => document.querySelector('input[placeholder="Task"]').focus()}
            className="bg-teal-500 text-black px-6 py-2 rounded-lg font-semibold hover:bg-teal-400 transition"
          >
            Add First Task
          </button>
        </div>
      ) : (
        tasks.map((t) => (
          <div key={t.id} className="bg-slate-800 p-3 mb-2 rounded flex justify-between items-start">
            <div>
              <p className={`font-semibold ${t.status === "completed"? "line-through text-gray-400" : ""}`}>
                {t.title}
              </p>
              <p className="text-sm text-gray-400">
                {t.priority} • {formatDate(t.reminderTime)}
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => toggleComplete(t)} className="hover:scale-110 transition">
                {t.status === "completed"? "↩️" : "✅"}
              </button>
              <button onClick={() => handleEdit(t)} className="hover:scale-110 transition">✏️</button>
              <button onClick={() => handleDelete(t.id)} className="hover:scale-110 transition">🗑</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}