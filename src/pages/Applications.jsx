import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc
} from "firebase/firestore";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function Applications() {
  const { user } = useAuth();
  const [apps, setApps] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "applications"));

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setApps(list);
    });

    return () => unsub();
  }, []);

  // ✅ ACCEPT APPLICATION
  const accept = async (app) => {
    // Update application
    await updateDoc(doc(db, "applications", app.id), {
      status: "accepted"
    });

    // Assign job
    await updateDoc(doc(db, "jobs", app.jobId), {
      artisanId: app.artisanId,
      status: "assigned"
    });
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>📩 Applications</h2>

      {apps.map((app) => (
        <div key={app.id}>
          <p>Job: {app.jobId}</p>
          <p>Message: {app.message}</p>
          <p>Status: {app.status}</p>

          {app.status === "pending" && (
            <button onClick={() => accept(app)}>
              ✅ Accept
            </button>
          )}
        </div>
      ))}
    </div>
  );
}