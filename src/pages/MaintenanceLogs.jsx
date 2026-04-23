import { useState, useEffect, useMemo } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp
} from "firebase/firestore";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { notifySuccess, notifyError } from "../components/NotificationProvider";

const ONE_DAY = 86400000;

export default function MaintenanceLogs() {
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [toolId, setToolId] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("preventative");
  const [intervalDays, setIntervalDays] = useState(30);
  const [logs, setLogs] = useState([]);
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showDone, setShowDone] = useState(false);

  // Load tools for dropdown
  useEffect(() => {
    if (!user?.uid) {
      setTools([]);
      return;
    }

    const q = query(collection(db, "tools"), where("userId", "==", user.uid));

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.metadata.hasPendingWrites &&!snap.metadata.fromCache) return;
        setTools(snap.docs.map(d => ({ id: d.id,...d.data() })));
      },
      (err) => {
        console.error("Tools error:", err.code, err.message);
        setTools([]);
        notifyError("Failed to load tools");
      }
    );

    return () => unsub();
  }, [user?.uid]);

  // Load logs – calculate status client-side to avoid composite index
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      setLogs([]);
      return;
    }

    const q = query(
      collection(db, "maintenance_logs"),
      where("userId", "==", user.uid)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.metadata.hasPendingWrites &&!snap.metadata.fromCache) return;

        const now = Date.now();
        const data = snap.docs.map(doc => {
          const log = { id: doc.id,...doc.data() };
          
          // Auto-calc status if nextDueAt exists
          if (log.nextDueAt && log.status !== "done") {
            log.status = log.nextDueAt.toMillis() < now? "overdue" : "pending";
            log.daysUntilDue = Math.ceil((log.nextDueAt.toMillis() - now) / ONE_DAY);
          }
          return log;
        }).sort((a, b) => {
          // Sort: overdue first, then by nextDueAt asc
          if (a.status === "overdue" && b.status !== "overdue") return -1;
          if (b.status === "overdue" && a.status !== "overdue") return 1;
          return (a.nextDueAt?.toMillis() || 0) - (b.nextDueAt?.toMillis() || 0);
        });

        setLogs(data);
        setLoading(false);
      },
      (err) => {
        console.error("Logs error:", err.code, err.message);
        setLogs([]);
        setLoading(false);
        if (err.code === 'permission-denied') {
          notifyError("Permission denied. Check your rules.");
        } else {
          notifyError("Failed to load logs");
        }
      }
    );

    return () => unsub();
  }, [user?.uid]);

  // Smart grouping + search
  const groupedLogs = useMemo(() => {
    const filtered = logs.filter(log => {
      if (!showDone && log.status === "done") return false;
      const toolName = tools.find(t => t.id === log.toolId)?.name || log.toolName || "";
      const searchMatch =
        log.title?.toLowerCase().includes(search.toLowerCase()) ||
        toolName.toLowerCase().includes(search.toLowerCase()) ||
        log.location?.toLowerCase().includes(search.toLowerCase());
      return searchMatch;
    });

    const now = Date.now();
    const weekFromNow = now + 7 * ONE_DAY;

    return {
      overdue: filtered.filter(l => l.status === "overdue"),
      dueSoon: filtered.filter(l => 
        l.status === "pending" && 
        l.nextDueAt?.toMillis() <= weekFromNow
      ),
      upcoming: filtered.filter(l => 
        l.status === "pending" && 
        l.nextDueAt?.toMillis() > weekFromNow
      ),
      done: filtered.filter(l => l.status === "done")
    };
  }, [logs, tools, search, showDone]);

  const addLog = async () => {
    if (!title.trim()) return notifyError("Enter a task title");
    if (!user?.uid) return notifyError("Not logged in");

    try {
      setSaving(true);
      const tool = tools.find(t => t.id === toolId);
      const now = new Date();
      const nextDue = new Date(now.getTime() + Number(intervalDays) * ONE_DAY);

      await addDoc(collection(db, "maintenance_logs"), {
        title: title.trim(),
        toolId: toolId || null,
        toolName: tool?.name || "",
        location: location.trim(),
        type,
        intervalDays: Number(intervalDays) || 30,
        status: "pending",
        lastDoneAt: null,
        nextDueAt: Timestamp.fromDate(nextDue),
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      notifySuccess("Maintenance task added");
      setTitle("");
      setToolId("");
      setLocation("");
      setIntervalDays(30);
    } catch (err) {
      console.error(err);
      notifyError(err.code === 'permission-denied'? "No permission to add log" : "Failed to add log");
    } finally {
      setSaving(false);
    }
  };

  const markDone = async (log) => {
    try {
      const now = new Date();
      const nextDue = new Date(now.getTime() + log.intervalDays * ONE_DAY);
      
      await updateDoc(doc(db, "maintenance_logs", log.id), {
        status: "pending",
        lastDoneAt: Timestamp.fromDate(now),
        nextDueAt: Timestamp.fromDate(nextDue),
        completedAt: serverTimestamp()
      });

      notifySuccess(`Done. Next due ${nextDue.toLocaleDateString()}`);
    } catch (err) {
      console.error(err);
      notifyError(err.code === 'permission-denied'? "No permission to update" : "Update failed");
    }
  };

  const snooze = async (log, days) => {
    try {
      const newDue = new Date(log.nextDueAt.toMillis() + days * ONE_DAY);
      await updateDoc(doc(db, "maintenance_logs", log.id), {
        nextDueAt: Timestamp.fromDate(newDue),
        status: newDue < new Date()? "overdue" : "pending"
      });
      notifySuccess(`Snoozed ${days} days`);
    } catch (err) {
      console.error(err);
      notifyError("Snooze failed");
    }
  };

  const deleteLog = async (id) => {
    if (!window.confirm("Delete this log?")) return;
    try {
      await deleteDoc(doc(db, "maintenance_logs", id));
      notifySuccess("Deleted");
    } catch (err) {
      console.error(err);
      notifyError(err.code === 'permission-denied'? "No permission to delete" : "Delete failed");
    }
  };

  const LogCard = ({ log }) => {
    const isOverdue = log.status === "overdue";
    const daysOverdue = isOverdue? Math.abs(log.daysUntilDue) : null;
    
    return (
      <div className={`bg-white/5 p-4 rounded-xl border-l-4 ${isOverdue? 'border-red-500' : 'border-yellow-500'}`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="font-semibold">{log.title}</p>
            <p className="text-xs text-gray-400 mt-1">
              {log.toolName || 'No tool'} • {log.location || 'No location'} • {log.type}
            </p>
            <p className={`text-xs font-semibold mt-1 ${isOverdue? 'text-red-400' : 'text-yellow-400'}`}>
              {isOverdue
               ? `${daysOverdue}d OVERDUE`
                : `Due ${log.nextDueAt?.toDate().toLocaleDateString()}`
              } • Every {log.intervalDays}d
            </p>
          </div>
          <span className={`text-xs px-2 py-1 rounded ${isOverdue? 'bg-red-500' : 'bg-yellow-500 text-black'}`}>
            {log.status}
          </span>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            onClick={() => markDone(log)}
            className="text-xs bg-green-600 px-3 py-1 rounded hover:bg-green-700 transition"
          >
            Mark Done
          </button>
          <button
            onClick={() => snooze(log, 3)}
            className="text-xs bg-gray-600 px-3 py-1 rounded hover:bg-gray-700 transition"
          >
            Snooze 3d
          </button>
          {log.toolId && (
            <button
              onClick={() => notifyError("View tool coming soon")}
              className="text-xs bg-blue-600 px-3 py-1 rounded hover:bg-blue-700 transition"
            >
              View Tool
            </button>
          )}
          <button
            onClick={() => deleteLog(log.id)}
            className="text-xs bg-red-600 px-3 py-1 rounded hover:bg-red-700 transition ml-auto"
          >
            Delete
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 text-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">📋 Maintenance Logs</h2>
        <p className="text-xs text-gray-600">UID: {user?.uid?.slice(0,8)}...</p>
      </div>

      <div className="bg-white/5 p-4 rounded-2xl mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="p-2 bg-slate-800 rounded outline-none focus:ring-2 focus:ring-blue-500 lg:col-span-2"
          />
          <select
            value={toolId}
            onChange={(e) => setToolId(e.target.value)}
            className="p-2 bg-slate-800 rounded outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No tool</option>
            {tools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className="p-2 bg-slate-800 rounded outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="p-2 bg-slate-800 rounded outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="preventative">Preventative</option>
            <option value="repair">Repair</option>
            <option value="inspection">Inspection</option>
          </select>
          <input
            type="number"
            min="1"
            value={intervalDays}
            onChange={(e) => setIntervalDays(e.target.value)}
            placeholder="Days"
            className="p-2 bg-slate-800 rounded outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addLog}
            disabled={saving}
            className="bg-blue-600 px-4 rounded hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving? "Adding..." : "Add"}
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search logs..."
          className="p-2 bg-slate-800 rounded flex-1 min-w-[200px] outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => setShowDone(!showDone)}
          className={`px-4 rounded text-sm ${showDone? 'bg-teal-600' : 'bg-gray-600'}`}
        >
          {showDone? 'Hide Done' : 'Show Done'}
        </button>
      </div>

      {loading? (
        <p>Loading...</p>
      ) : Object.values(groupedLogs).every(arr => arr.length === 0)? (
        <p className="text-gray-400">No logs yet. Add one above.</p>
      ) : (
        <div className="space-y-6">
          {groupedLogs.overdue.length > 0 && (
            <div>
              <h3 className="text-sm font-bold mb-3 text-red-400">🔴 Overdue [{groupedLogs.overdue.length}]</h3>
              <div className="space-y-2">{groupedLogs.overdue.map(log => <LogCard key={log.id} log={log} />)}</div>
            </div>
          )}
          {groupedLogs.dueSoon.length > 0 && (
            <div>
              <h3 className="text-sm font-bold mb-3 text-yellow-400">🟡 Due This Week [{groupedLogs.dueSoon.length}]</h3>
              <div className="space-y-2">{groupedLogs.dueSoon.map(log => <LogCard key={log.id} log={log} />)}</div>
            </div>
          )}
          {groupedLogs.upcoming.length > 0 && (
            <div>
              <h3 className="text-sm font-bold mb-3 text-gray-400">⚪ Upcoming [{groupedLogs.upcoming.length}]</h3>
              <div className="space-y-2">{groupedLogs.upcoming.map(log => <LogCard key={log.id} log={log} />)}</div>
            </div>
          )}
          {showDone && groupedLogs.done.length > 0 && (
            <div>
              <h3 className="text-sm font-bold mb-3 text-green-400">✅ Completed [{groupedLogs.done.length}]</h3>
              <div className="space-y-2">{groupedLogs.done.slice(0, 10).map(log => <LogCard key={log.id} log={log} />)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}