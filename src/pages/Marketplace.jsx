import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDoc
} from "firebase/firestore";
import { db } from "../firebase";
import PayButton from "../components/PayButton";

export default function Marketplace() {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "jobs"), (snapshot) => {
      setJobs(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }))
      );
    });

    return () => unsub();
  }, []);

  const releasePayment = async (job) => {
    try {
      const artisanRef = doc(db, "wallets", job.artisanId);
      const walletSnap = await getDoc(artisanRef);

      if (walletSnap.exists()) {
        const current = walletSnap.data();

        await updateDoc(artisanRef, {
          pending: Math.max(
            0,
            (current.pending || 0) - (job.artisanAmount || 0)
          ),
          balance:
            (current.balance || 0) + (job.artisanAmount || 0)
        });
      }

      await updateDoc(doc(db, "jobs", job.id), {
        status: "done",
        completedAt: new Date()
      });

      alert("💸 Payment released to artisan!");
    } catch (err) {
      console.error(err);
      alert("Error releasing payment");
    }
  };

  return (
    <div style={{ padding: "20px", color: "#fff" }}>
      <h2>Marketplace</h2>

      {jobs.map((job) => (
        <div
          key={job.id}
          style={{
            border: "1px solid #333",
            padding: "15px",
            marginBottom: "10px"
          }}
        >
          <h3>{job.title}</h3>
          <p>Budget: R{job.budget}</p>
          <p>Status: {job.status}</p>

          {/* 💳 Payment */}
          {job.status === "assigned" && !job.paid && (
            <PayButton job={job} />
          )}

          {/* 🚧 In Progress */}
          {job.status === "in_progress" && (
            <>
              <p>🚧 Work in progress...</p>
              <button onClick={() => releasePayment(job)}>
                💸 Release Payment
              </button>
            </>
          )}

          {/* ✅ Done */}
          {job.status === "done" && <p>✅ Completed</p>}
        </div>
      ))}
    </div>
  );
}