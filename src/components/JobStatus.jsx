import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDocs
} from "firebase/firestore";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function MyJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "jobs"),
      where("clientId", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setJobs(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    });

    return () => unsub();
  }, [user]);

  // 🔥 FIXED ACCEPT FLOW
  const acceptArtisan = async (jobId, artisanId) => {
    // update job
    await updateDoc(doc(db, "jobs", jobId), {
      acceptedArtisanId: artisanId,
      status: "in_progress"
    });

    // update applications
    const q = query(
      collection(db, "applications"),
      where("jobId", "==", jobId)
    );

    const snap = await getDocs(q);

    snap.forEach(async (docSnap) => {
      const app = docSnap.data();

      await updateDoc(doc(db, "applications", docSnap.id), {
        status: app.artisanId === artisanId ? "accepted" : "rejected"
      });
    });
  };

  return (
    <div className="p-6 text-white">
      <h2 className="text-2xl mb-6 font-bold">📦 My Jobs</h2>

      {jobs.map(job => (
        <div key={job.id} className="bg-slate-800 p-4 rounded mb-4">

          <h3 className="font-semibold">{job.title}</h3>

          <p>Status: {job.status}</p>

          {job.status === "in_progress" && (
            <p className="text-green-400">✅ Artisan Assigned</p>
          )}

          <ApplicationsList job={job} onAccept={acceptArtisan} />

        </div>
      ))}
    </div>
  );
}

function ApplicationsList({ job, onAccept }) {
  const [apps, setApps] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "applications"),
      where("jobId", "==", job.id)
    );

    const unsub = onSnapshot(q, snap => {
      setApps(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
    });

    return () => unsub();
  }, [job.id]);

  return (
    <div className="mt-3">
      <h4 className="text-sm text-gray-400 mb-2">Applications:</h4>

      {apps.map(app => (
        <div key={app.id} className="bg-slate-700 p-3 rounded mb-2">

          <p>{app.artisanEmail}</p>
          <p className="text-sm">Status: {app.status}</p>

          {job.status === "searching" && (
            <button
              onClick={() => onAccept(job.id, app.artisanId)}
              className="bg-green-500 px-3 py-1 mt-2 rounded"
            >
              Accept
            </button>
          )}

        </div>
      ))}
    </div>
  );
}