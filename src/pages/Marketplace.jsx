import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import PayButton from "../components/PayButton";
import { notifySuccess, notifyError } from "../components/NotificationProvider";

export default function Marketplace() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);

  // 🔥 LIVE JOBS
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "jobs"), (snapshot) => {
      setJobs(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    });

    return () => unsub();
  }, []);

  // 🧑‍🔧 APPLY FOR JOB
  const applyForJob = async (job) => {
    try {
      await addDoc(collection(db, "applications"), {
        jobId: job.id,
        artisanId: user.uid,
        status: "pending",
        createdAt: new Date(),
      });

      notifySuccess("Applied successfully 🚀");
    } catch (err) {
      notifyError("Application failed");
    }
  };

  // 💸 RELEASE PAYMENT
  const releasePayment = async (job) => {
    try {
      const artisanRef = doc(db, "wallets", job.artisanId);
      const walletSnap = await getDoc(artisanRef);

      if (walletSnap.exists()) {
        const data = walletSnap.data();

        await updateDoc(artisanRef, {
          pending: Math.max(0, (data.pending || 0) - job.artisanAmount),
          balance: (data.balance || 0) + job.artisanAmount,
        });
      }

      await updateDoc(doc(db, "jobs", job.id), {
        status: "done",
        paid: true,
      });

      notifySuccess("Payment released 💸");
    } catch (err) {
      notifyError("Payment failed");
    }
  };

  return (
    <div className="p-6 text-white">
      <h2 className="text-2xl font-bold mb-6">💼 Marketplace</h2>

      {jobs.length === 0 && <p>No jobs available</p>}

      {jobs.map((job) => (
        <div
          key={job.id}
          className="bg-slate-800 p-5 mb-4 rounded-xl shadow"
        >
          <h3 className="font-bold text-lg">{job.title}</h3>

          <p className="text-sm opacity-80 mt-1">
            {job.description || "No description"}
          </p>

          <div className="mt-3 space-y-1">
            <p>💰 Budget: R{job.budget}</p>
            <p>📌 Type: {job.type}</p>
            <p>📍 Location: {job.location || "N/A"}</p>
            <p>
              Status:{" "}
              <span className="font-semibold">{job.status}</span>
            </p>
          </div>

          {/* 🟢 APPLY */}
          {job.status === "open" && (
            <button
              onClick={() => applyForJob(job)}
              className="mt-3 bg-green-600 px-4 py-2 rounded hover:bg-green-700"
            >
              Apply
            </button>
          )}

          {/* 💳 PAYMENT */}
          {job.status === "assigned" && !job.paid && (
            <div className="mt-3">
              <PayButton job={job} />
            </div>
          )}

          {/* 🛠 IN PROGRESS */}
          {job.status === "in_progress" && (
            <button
              onClick={() => releasePayment(job)}
              className="mt-3 bg-yellow-500 px-4 py-2 rounded"
            >
              Release Payment
            </button>
          )}

          {/* ✅ DONE */}
          {job.status === "done" && (
            <p className="mt-3 text-green-400 font-semibold">
              ✅ Completed
            </p>
          )}
        </div>
      ))}
    </div>
  );
}