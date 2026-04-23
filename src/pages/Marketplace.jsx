import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy
} from "firebase/firestore";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import JobStatus from "../components/JobStatus";
import LiveMap from "../components/LiveMap";

import { notifySuccess, notifyError } from "../components/NotificationProvider";
import { rankJobsAI } from "../utils/aiRanking";
import { useNavigate } from "react-router-dom";

export default function Marketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState(new Set());
  const [userData, setUserData] = useState(null);
  const [applying, setApplying] = useState(null);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, "users", user.uid), (snap) => {
      setUserData(snap.data());
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "applications"),
      where("artisanId", "==", user.uid)
    );

    return onSnapshot(q, (snap) => {
      const applied = new Set();
      snap.docs.forEach((d) => applied.add(d.data().jobId));
      setAppliedJobs(applied);
    });
  }, [user]);

  const applyToJob = async (job) => {
    if (appliedJobs.has(job.id)) {
      return notifyError("Already applied");
    }

    try {
      setApplying(job.id);

      await addDoc(collection(db, "applications"), {
        jobId: job.id,
        artisanId: user.uid,
        artisanEmail: user.email,
        artisanName: user.displayName || user.email,
        clientId: job.createdBy,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      notifySuccess("Applied 🚀");
    } catch (err) {
      console.error("APPLY ERROR:", err);
      notifyError("Failed to apply");
    } finally {
      setApplying(null);
    }
  };

  useEffect(() => {
    if (!user ||!userData) return;

    let q;

    if (userData.role === "artisan") {
      q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
    } else {
      q = query(
        collection(db, "jobs"),
        where("createdBy", "==", user.uid),
        orderBy("createdAt", "desc")
      );
    }

    return onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map((doc) => ({
        id: doc.id,
     ...doc.data(),
      }));

      data = data.filter((job) => job.status!== "completed");

      if (userData.role === "artisan") {
        data = data.filter((job) => job.status === "searching");
      }

      setJobs(rankJobsAI(data, userData));
    });
  }, [user, userData]);

  return (
    <div className="p-6 text-white">
      <h2 className="text-2xl font-bold mb-2">💼 Smart Marketplace</h2>
      <p className="text-sm text-gray-400 mb-6">Connect with clients/artisans. Payment handled directly between parties.</p>

      {jobs.length === 0 && (
        <p className="text-gray-400">No jobs available</p>
      )}

      {jobs.map((job) => (
        <div key={job.id} className="bg-slate-800 p-5 mb-4 rounded-xl">
          <h3 className="font-bold">{job.title}</h3>
          <p>{job.description}</p>
          <p className="text-cyan-400 font-semibold">Agreed Quote: R{job.budget}</p>
          <p className="text-xs text-gray-500">Payment handled directly between parties</p>
          <p className="text-sm text-gray-400">📍 {job.location?.city}</p>

          <JobStatus status={job.status} />

          {userData?.role === "artisan" && (
            <button
              onClick={() => applyToJob(job)}
              disabled={appliedJobs.has(job.id) || applying === job.id}
              className="mt-3 bg-blue-500 px-4 py-2 rounded disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-blue-600 transition"
            >
              {applying === job.id
            ? "Applying..."
                : appliedJobs.has(job.id)
            ? "Applied"
                : "Apply"}
            </button>
          )}

          {userData?.role === "client" && job.artisanLocation && (
            <LiveMap job={job} userData={userData} />
          )}
        </div>
      ))}
    </div>
  );
}