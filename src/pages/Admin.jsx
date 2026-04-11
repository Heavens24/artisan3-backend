import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

    const unsubJobs = onSnapshot(
      collection(db, "jobs"),
      (snap) => {
        setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

    return () => {
      unsubUsers();
      unsubJobs();
    };
  }, []);

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>

      <h2 className="mt-4 font-semibold">Users</h2>
      {users.map((u) => (
        <div key={u.id}>{u.email}</div>
      ))}

      <h2 className="mt-6 font-semibold">Jobs</h2>
      {jobs.map((j) => (
        <div key={j.id}>{j.title}</div>
      ))}
    </div>
  );
}