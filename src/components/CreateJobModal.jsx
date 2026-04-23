import { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { autoMatchArtisan } from "../utils/autoMatch";
import { notifySuccess, notifyError } from "./NotificationProvider";
import { suggestPrice } from "../utils/pricing";

export default function CreateJobModal({ onClose }) {
  const { user } = useAuth();

  const [form, setForm] = useState({
    title: "",
    description: "",
    skill: "",
    budget: "",
    city: "",
  });

  const [loading, setLoading] = useState(false);

  // 🔥 AUTO PRICE (SAFE)
  useEffect(() => {
    if (form.skill) {
      setForm((prev) => ({
        ...prev,
        budget: suggestPrice(form.skill),
      }));
    }
  }, [form.skill]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // 🚀 CREATE JOB (FULL SAFE VERSION)
  const createJob = async () => {
    try {
      if (!user) return notifyError("Login required");

      const { title, description, skill, budget, city } = form;

      // 🔴 CRITICAL VALIDATION (FIXES YOUR CURRENT PROBLEM)
      if (!title || !description || !skill || !budget || !city) {
        return notifyError("Fill all fields");
      }

      setLoading(true);

      const jobData = {
        title: title.trim(),
        description: description.trim(),
        skill: skill.toLowerCase().trim(),
        budget: Number(budget),
        
        // 🔥 CRITICAL FIX (THIS POWERS MY JOBS)
        clientId: user.uid,

        // 🔁 BACKWARD COMPATIBILITY (KEEP THIS)
        createdBy: user.uid,

        status: "searching",
        paid: false,

        location: {
          city: city.trim(),
        },

        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "jobs"), jobData);

      // 🤖 AUTO MATCH (SAFE)
      try {
        await autoMatchArtisan({
          id: docRef.id,
          ...jobData,
        });
      } catch (err) {
        console.warn("Auto-match failed:", err.message);
      }

      notifySuccess("🚀 Job created successfully");
      onClose();

    } catch (err) {
      console.error(err);
      notifyError("Failed to create job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-md">

        <h2 className="text-xl font-bold mb-4">🛠 Create Job</h2>

        <input
          name="title"
          placeholder="Job title"
          value={form.title}
          onChange={handleChange}
          className="w-full mb-3 p-2 rounded bg-slate-800"
        />

        <textarea
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
          className="w-full mb-3 p-2 rounded bg-slate-800"
        />

        <input
          name="skill"
          placeholder="Skill (e.g plumbing)"
          value={form.skill}
          onChange={handleChange}
          className="w-full mb-3 p-2 rounded bg-slate-800"
        />

        <input
          name="budget"
          placeholder="Budget (R)"
          type="number"
          value={form.budget}
          onChange={handleChange}
          className="w-full mb-3 p-2 rounded bg-slate-800"
        />

        <input
          name="city"
          placeholder="City"
          value={form.city}
          onChange={handleChange}
          className="w-full mb-4 p-2 rounded bg-slate-800"
        />

        <div className="flex gap-2">
          <button
            onClick={createJob}
            disabled={loading}
            className="bg-green-500 px-4 py-2 rounded w-full hover:scale-[1.02] transition"
          >
            {loading ? "Creating..." : "Create Job"}
          </button>

          <button
            onClick={onClose}
            className="bg-gray-600 px-4 py-2 rounded w-full"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}