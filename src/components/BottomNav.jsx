import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { db } from "../firebase";

export default function BottomNav() {
  const { user } = useAuth();
  const [userData, setUserData] = useState({});
  const [tasks, setTasks] = useState([]);
  const [chats, setChats] = useState([]);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      setUserData(snap.data() || {});
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubs = [
      onSnapshot(
        query(collection(db, "tasks"), where("userId", "==", user.uid)),
        (snap) => setTasks(snap.docs.map((d) => d.data()))
      ),
      onSnapshot(
        query(collection(db, "chats"), where("participants", "array-contains", user.uid)),
        (snap) => setChats(snap.docs.map((d) => d.data()))
      ),
      onSnapshot(
        query(collection(db, "jobs"), where("artisanId", "==", user.uid)),
        (snap) => setJobs(snap.docs.map((d) => d.data()))
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [user?.uid]);

  const counts = useMemo(() => {
    const now = Date.now();
    return {
      overdueTasks: tasks.filter((t) => t.reminderTime?.toMillis?.() < now && t.status!== "completed").length,
      unreadChats: chats.filter((c) => c.seen?.[user?.uid] === false).length,
      activeJobs: jobs.filter((j) => j.status === "in_progress").length,
    };
  }, [tasks, chats, jobs, user?.uid]);

  if (!user) return null;

  const Tab = ({ to, icon, label, badge }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center flex-1 py-2 text-xs relative ${
          isActive? "text-teal-400" : "text-gray-400"
        }`
      }
    >
      <span className="text-xl mb-0.5">{icon}</span>
      <span>{label}</span>
      {badge > 0 && (
        <span className="absolute top-1 right-1/4 bg-red-500 text-white text-[10px] px-1.5 rounded-full min-w-[16px] text-center">
          {badge > 9? "9+" : badge}
        </span>
      )}
    </NavLink>
  );

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 z-40">
      <div className="flex">
        <Tab to="/dashboard" icon="📊" label="Home" />
        <Tab
          to="/tasks"
          icon="✅"
          label="Tasks"
          badge={counts.overdueTasks}
        />
        {userData?.isPro && (
          <Tab
            to="/my-jobs"
            icon="📦"
            label="Jobs"
            badge={counts.activeJobs}
          />
        )}
        {userData?.isPro && (
          <Tab
            to="/chat"
            icon="💬"
            label="Chat"
            badge={counts.unreadChats}
          />
        )}
        <Tab to="/settings" icon="⚙️" label="You" />
      </div>
    </nav>
  );
}