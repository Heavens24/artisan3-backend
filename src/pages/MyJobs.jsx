import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  getDoc,
  writeBatch,
  addDoc
} from "firebase/firestore";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { notifySuccess, notifyError } from "../components/NotificationProvider";
import { useNavigate } from "react-router-dom";

export default function MyJobs() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [chatMap, setChatMap] = useState({});

  // ✅ LOAD JOBS
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "jobs"),
      where("createdBy", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
       ...d.data(),
      }));
      setJobs(data);
    });

    return () => unsub();
  }, [user?.uid]);

  // ✅ AUTO-HEAL: CREATE CHAT IF MISSING FOR IN_PROGRESS JOBS
  useEffect(() => {
    if (!jobs.length ||!user?.uid) return;

    jobs.forEach(async (job) => {
      if (job.status!== "in_progress" ||!job.artisanId) return;

      const chatRef = doc(db, "chats", job.id);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        console.log("Auto-creating missing chat for job:", job.id);
        await setDoc(chatRef, {
          jobId: job.id,
          participants: [job.createdBy, job.artisanId],
          createdAt: serverTimestamp(),
          lastMessage: "",
          lastMessageAt: null,
          typing: {},
          seen: {
            [job.createdBy]: true,
            [job.artisanId]: true
          }
        }, { merge: true });
      }
    });
  }, [jobs, user?.uid]);

  // ✅ LOAD CHAT DATA
  useEffect(() => {
    if (!jobs.length ||!user?.uid) return;

    const unsubs = jobs.map((job) => {
      const chatRef = doc(db, "chats", job.id);

      return onSnapshot(
        chatRef,
        (snap) => {
          if (snap.exists()) {
            setChatMap((prev) => ({
             ...prev,
              [job.id]: snap.data(),
            }));
          }
        },
        (err) => {
          if (err.code!== 'permission-denied') {
            console.warn("Chat listener error:", err.code, err.message);
          }
        }
      );
    });

    return () => unsubs.forEach((u) => u());
  }, [jobs, user?.uid]);

  // 🔥 FINAL ACCEPT LOGIC
  const acceptArtisan = async (job, app) => {
    try {
      const clientId = job.createdBy;
      const artisanId = app.artisanId;

      if (job.status === "in_progress") {
        notifySuccess("Already accepted — opening chat");
        navigate(`/chat/${job.id}`);
        return;
      }

      if (!clientId ||!artisanId) {
        throw new Error("Missing clientId or artisanId");
      }

      const batch = writeBatch(db);

      // 1. UPDATE JOB
      const jobRef = doc(db, "jobs", job.id);
      batch.update(jobRef, {
        artisanId,
        status: "in_progress",
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

      // 4. CREATE CHAT
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
      }, { merge: true });

      notifySuccess("Artisan accepted & chat ready 🚀");
      navigate(`/chat/${job.id}`);

    } catch (err) {
      console.error("🔥 ACCEPT ERROR FULL:", err);
      notifyError(err.code === 'permission-denied'
      ? "Permission denied. Check your Firestore rules."
        : err.message || "Failed to accept artisan");
    }
  };

  return (
    <div className="p-6 text-white">
      <h2 className="text-2xl mb-6 font-bold">📦 My Jobs</h2>

      {jobs.length === 0 && (
        <p className="text-gray-400">No jobs yet</p>
      )}

      {jobs.map((job) => {
        const chat = chatMap[job.id];

        return (
          <div key={job.id} className="bg-slate-800 p-5 rounded mb-4">
            <h3 className="font-semibold text-lg">{job.title}</h3>
            <p className="text-sm text-gray-300">{job.description}</p>

            <p className="mt-2 text-sm">
              Status: <span className="text-teal-400">{job.status}</span>
              {chat && chat.seen[user.uid] === false && (
                <span className="ml-2 bg-red-500 text-xs px-2 py-1 rounded">
                  New
                </span>
              )}
            </p>

            {job.toolCost > 0 && (
              <p className="text-xs text-yellow-400 mt-1">
                Tool cost: R{job.toolCost.toFixed(2)}
              </p>
            )}

            {(job.status === "in_progress") && (
              <button
                onClick={() => navigate(`/chat/${job.id}`)}
                className="bg-blue-500 px-3 py-1 rounded mt-3 hover:bg-blue-600 transition"
              >
                Open Chat 💬
              </button>
            )}

            <ApplicationsList
              job={job}
              onAccept={(app) => acceptArtisan(job, app)}
            />
          </div>
        );
      })}
    </div>
  );
}

// 🔥 APPLICATION LIST – now handles tool selection for artisans
function ApplicationsList({ job, onAccept }) {
  const [apps, setApps] = useState([]);
  const { user } = useAuth();
  const [myTools, setMyTools] = useState([]);
  const [selectedTools, setSelectedTools] = useState({}); // {appId: [toolId1, toolId2]}

  useEffect(() => {
    const q = query(
      collection(db, "applications"),
      where("jobId", "==", job.id)
    );

    const unsub = onSnapshot(q, (snap) => {
      setApps(
        snap.docs.map((d) => ({
          id: d.id,
         ...d.data(),
        }))
      );
    });

    return () => unsub();
  }, [job.id]);

  // Load artisan's tools if they have an app
  useEffect(() => {
    if (!user?.uid) return;
    const myApp = apps.find(a => a.artisanId === user.uid);
    if (!myApp) return;

    const q = query(collection(db, "tools"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, snap => {
      setMyTools(snap.docs.map(d => ({id: d.id,...d.data()})));
    });
    return () => unsub();
  }, [apps, user?.uid]);

  const completeJobWithTools = async (jobToComplete) => {
    try {
      if (jobToComplete.artisanId!== user.uid) return notifyError("Not your job");

      const jobRef = doc(db, "jobs", jobToComplete.id);
      const jobSnap = await getDoc(jobRef);
      const jobData = jobSnap.data();

      let totalToolCost = 0;
      const toolUpdates = [];

      for (const toolId of jobData.toolsUsed || []) {
        const toolRef = doc(db, "tools", toolId);
        const toolSnap = await getDoc(toolRef);
        if (!toolSnap.exists()) continue;

        const tool = toolSnap.data();
        if (tool.userId!== user.uid) continue;
        if (tool.quantity < 1) continue;

        const newUses = (tool.totalUses || 0) + 1;
        let newCondition = tool.condition;

        if (newUses >= 100 && tool.condition === "fair") newCondition = "poor";
        else if (newUses >= 50 && tool.condition === "good") newCondition = "fair";

        toolUpdates.push(
          updateDoc(toolRef, {
            quantity: tool.quantity - 1,
            totalUses: newUses,
            condition: newCondition,
            lastUsed: serverTimestamp()
          })
        );

        toolUpdates.push(
          addDoc(collection(db, "maintenance_logs"), {
            title: `Used ${tool.name} on job: ${jobData.title}`,
            tool: tool.name,
            toolId: toolId,
            jobId: jobToComplete.id,
            type: "job",
            status: "done",
            userId: user.uid,
            createdAt: serverTimestamp()
          })
        );

        totalToolCost += Number(tool.purchasePrice || 0) * 0.02;
      }

      await Promise.all([
       ...toolUpdates,
        updateDoc(jobRef, {
          status: "completed",
          completedAt: serverTimestamp(),
          toolCost: totalToolCost
        })
      ]);

      notifySuccess(`Job complete. Tool cost: R${totalToolCost.toFixed(2)}`);
    } catch (err) {
      console.error(err);
      notifyError("Failed to complete job");
    }
  };

  const saveToolsToJob = async (appId) => {
    try {
      await updateDoc(doc(db, "jobs", job.id), {
        toolsUsed: selectedTools[appId] || []
      });
      notifySuccess("Tools linked to job");
    } catch (err) {
      notifyError("Could not save tools");
    }
  };

  return (
    <div className="mt-4">
      <h4 className="text-sm text-gray-400 mb-2">Applications:</h4>

      {apps.length === 0 && (
        <p className="text-xs text-gray-500">No applications yet</p>
      )}

      {apps.map((app) => (
        <div key={app.id} className="bg-slate-700 p-3 rounded mb-2">
          <p className="text-sm">{app.artisanEmail || "Unknown artisan"}</p>
          <p className="text-xs text-gray-400">Status: {app.status || "pending"}</p>

          {job.status === "searching" && app.status!== "accepted" && (
            <button
              onClick={() => onAccept(app)}
              className="bg-green-500 px-3 py-1 mt-2 rounded text-sm hover:bg-green-600 transition"
            >
              Accept
            </button>
          )}

          {app.status === "accepted" && app.artisanId === user?.uid && job.status === "in_progress" && (
            <div className="mt-3 p-2 bg-slate-600 rounded">
              <p className="text-xs text-teal-300 mb-2">Select tools for this job:</p>
              {myTools.map(t => (
                <label key={t.id} className="flex items-center gap-2 text-xs mb-1">
                  <input
                    type="checkbox"
                    checked={(selectedTools[app.id] || []).includes(t.id)}
                    onChange={e => {
                      setSelectedTools(prev => ({
                       ...prev,
                        [app.id]: e.target.checked
                         ? [...(prev[app.id] || []), t.id]
                          : (prev[app.id] || []).filter(id => id!== t.id)
                      }));
                    }}
                  />
                  {t.name} - Qty: {t.quantity}
                </label>
              ))}
              <div className="flex gap-2 mt-2">
                <button onClick={() => saveToolsToJob(app.id)} className="text-xs bg-blue-600 px-2 py-1 rounded">
                  Save Tools
                </button>
                <button onClick={() => completeJobWithTools(job)} className="text-xs bg-green-600 px-2 py-1 rounded">
                  Mark Complete
                </button>
              </div>
            </div>
          )}

          {app.status === "accepted" && (
            <p className="text-green-400 text-xs mt-1">✅ Accepted</p>
          )}

          {app.status === "rejected" && (
            <p className="text-red-400 text-xs mt-1">❌ Rejected</p>
          )}
        </div>
      ))}
    </div>
  );
}