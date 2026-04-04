import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db, storage } from "../firebase";
import {
  doc,
  onSnapshot,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

export default function AI() {
  const { user } = useAuth();

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [result, setResult] = useState(null);

  // 🖼️ IMAGE STATES
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [preview, setPreview] = useState("");

  // 🔒 Load user
  useEffect(() => {
    if (!user) return;

    const refDoc = doc(db, "users", user.uid);
    const unsub = onSnapshot(refDoc, (snap) => {
      setUserData(snap.data());
    });

    return () => unsub();
  }, [user]);

  if (!user) return <p>Loading...</p>;

  // 📸 HANDLE IMAGE SELECT
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  // ☁️ UPLOAD IMAGE TO FIREBASE
  const uploadImage = async () => {
    if (!imageFile) return "";

    const storageRef = ref(storage, `maintenance/${Date.now()}_${imageFile.name}`);
    await uploadBytes(storageRef, imageFile);
    const url = await getDownloadURL(storageRef);

    setImageUrl(url);
    return url;
  };

  // 🚀 AI REQUEST
  const askAI = async () => {
    if (!prompt && !imageFile)
      return alert("Add a description or image");

    setLoading(true);
    setResult(null);

    try {
      let uploadedUrl = imageUrl;

      // Upload image if not uploaded yet
      if (imageFile && !imageUrl) {
        uploadedUrl = await uploadImage();
      }

      const res = await fetch("http://localhost:5000/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          imageUrl: uploadedUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "AI failed");
        return;
      }

      const parsed = data.data;

      setResult(parsed);

      // 💾 SAVE
      await addDoc(collection(db, "maintenance_logs"), {
        userId: user.uid,
        imageUrl: uploadedUrl || "",
        problem: parsed.problem,
        solution: parsed.solution,
        tools: parsed.tools || [],
        severity: parsed.severity,
        estimatedCost: parsed.estimatedCost,
        nextMaintenanceDate: parsed.nextMaintenanceDate,
        createdAt: serverTimestamp(),
      });

    } catch (err) {
      console.error(err);
      alert("Error contacting AI");
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: "30px", color: "white" }}>
      <h2>🔧 AI Repair Assistant</h2>

      {/* 💎 PLAN */}
      <p>
        {userData?.isPro
          ? "💎 Pro — Unlimited"
          : `Free — ${userData?.usageCount || 0}/3`}
      </p>

      {/* 📸 IMAGE UPLOAD */}
      <input type="file" accept="image/*" onChange={handleImageChange} />

      {preview && (
        <div style={{ marginTop: "10px" }}>
          <img
            src={preview}
            alt="preview"
            style={{
              width: "200px",
              borderRadius: "10px",
              marginTop: "10px",
            }}
          />
        </div>
      )}

      {/* ✍️ TEXT INPUT */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the issue (optional if image provided)..."
        style={{
          width: "100%",
          height: "100px",
          marginTop: "10px",
          borderRadius: "8px",
          padding: "10px",
        }}
      />

      {/* 🚀 BUTTON */}
      <button
        onClick={askAI}
        style={{
          marginTop: "10px",
          padding: "10px 15px",
          borderRadius: "8px",
          background: "#00ffcc",
          border: "none",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        {loading ? "Analyzing..." : "Analyze Problem ⚡"}
      </button>

      {/* 🧠 RESULT */}
      {result && (
        <div
          style={{
            marginTop: "25px",
            background: "#1e293b",
            padding: "15px",
            borderRadius: "10px",
          }}
        >
          <h3>🧠 Diagnosis</h3>

          <p><strong>Problem:</strong> {result.problem}</p>
          <p><strong>Severity:</strong> {result.severity}</p>

          <p><strong>Solution:</strong></p>
          <p>{result.solution}</p>

          <p><strong>Tools:</strong></p>
          <ul>
            {result.tools?.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>

          <p><strong>Estimated Cost:</strong> {result.estimatedCost}</p>

          <p style={{ marginTop: "10px", color: "#94a3b8" }}>
            ✅ Saved to maintenance history
          </p>
        </div>
      )}
    </div>
  );
}