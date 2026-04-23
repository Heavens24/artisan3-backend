import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  writeBatch,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { notifySuccess, notifyError } from "../components/NotificationProvider";

export default function JobApplications({ job }) {
  const [applications, setApplications] = useState([]);

  // 🔄 LOAD APPLICATIONS
  useEffect(() => {
    if (!job?.id) return;

    const q = query(
      collection(db, "applications"),
      where("jobId", "==", job.id)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
       ...d.data()
      }));
      setApplications(list);
    });

    return () => unsub();
  }, [job?.id]);

  // ✅ ACCEPT ARTISAN – FIXED TO MATCH MyJobs.jsx
  const acceptArtisan = async (app) => {
    try {
      const clientId = job.createdBy;
      const artisanId = app.artisanId; // MUST BE UID, not email

      console.log("ACCEPT DEBUG", { jobId: job.id, clientId, artisanId });

      if (job.status === "in_progress" || job.status === "assigned") {
        notifySuccess("Already accepted");
        return;
      }

      if (!clientId ||!artisanId) {
        throw new Error("Missing clientId or artisanId");
      }

      const batch = writeBatch(db);

      // 1. UPDATE JOB – use same fields as MyJobs.jsx
      const jobRef = doc(db, "jobs", job.id);
      batch.update(jobRef, {
        artisanId, // not assignedArtisanId
        status: "in_progress", // not "assigned"
        updatedAt: serverTimestamp()
      });

      // 2. ACCEPT THIS APPLICATION
      const appRef = doc(db, "applications", app.id);
      batch.update(appRef, {
        status: "accepted"
      });

      // 3. REJECT OTHERS
      const q = query(
        collection(db, "applications"),
        where("jobId", "==", job.id)
      );

      const snap = await getDocs(q);
      snap.docs.forEach((d) => {
        if (d.id!== app.id) {
          batch.update(doc(db, "applications", d.id), {
            status: "rejected"
          });
        }
      });

      await batch.commit();

      // 4. CREATE CHAT DOC – this is what was missing
      const chatRef = doc(db, "chats", job.id);
      await setDoc(chatRef, {
        jobId: job.id,
        participants: [clientId, artisanId],
        createdAt: serverTimestamp(),
        lastMessage: "",
        lastMessageAt: null,
        typing: {},
        seen: {
          [clientId]: true,
          [artisanId]: true
        }
      }, { merge: true }); // merge: true means it won't crash if it exists

      notifySuccess("Artisan assigned & chat ready 🚀");

    } catch (err) {
      console.error("ACCEPT ERROR:", err);
      notifyError(err.code === 'permission-denied'
      ? "Permission denied. Check rules or artisanId is wrong."
        : err.message || "Failed to assign artisan");
    }
  };

  // ❌ REJECT
  const rejectArtisan = async (app) => {
    try {
      await updateDoc(doc(db, "applications", app.id), {
        status: "rejected"
      });
      notifySuccess("Application rejected");
    } catch (err) {
      console.error(err);
      notifyError("Failed to reject");
    }
  };

  return (
    <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
      <h3 className="text-lg font-semibold mb-3">
        📩 Applications for: {job.title}
      </h3>

      {applications.length === 0? (
        <p>No applications yet</p>
      ) : (
        applications.map((app) => (
          <div
            key={app.id}
            className="bg-slate-800 p-3 mb-3 rounded border border-slate-700"
          >
            <p className="font-semibold">{app.artisanName || app.artisanEmail}</p>
            <p className="text-sm text-gray-400">{app.message}</p>
            <p className="text-xs mt-1 text-gray-500">UID: {app.artisanId}</p>

            <p className="text-xs mt-1">
              Status:{" "}
              <span
                className={
                  app.status === "accepted"
                  ? "text-green-400"
                    : app.status === "rejected"
                  ? "text-red-400"
                    : "text-yellow-400"
                }
              >
                {app.status}
              </span>
            </p>

            {app.status === "pending" && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => acceptArtisan(app)}
                  className="bg-green-600 px-3 py-1 rounded hover:bg-green-700 transition"
                >
                  ✅ Accept
                </button>

                <button
                  onClick={() => rejectArtisan(app)}
                  className="bg-red-600 px-3 py-1 rounded hover:bg-red-700 transition"
                >
                  ❌ Reject
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}