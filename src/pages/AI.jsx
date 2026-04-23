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
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function AI() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [result, setResult] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      setUserData(snap.data());
    });
    return () => unsub();
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const uploadImage = async () => {
    if (!imageFile) return "";
    const storageRef = ref(storage, `ai/${Date.now()}_${imageFile.name}`);
    await uploadBytes(storageRef, imageFile);
    return await getDownloadURL(storageRef);
  };

  const askAI = async () => {
    if (!prompt && !imageFile) {
      return alert("Add a description or image");
    }
    setLoading(true);
    setResult(null);
    try {
      const imageUrl = await uploadImage();
      const res = await fetch("http://localhost:5000/api/ai", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ prompt, imageUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data?.data) {
        throw new Error(data?.error || "AI failed");
      }
      setResult(data.data);
      await addDoc(collection(db, "maintenanceLogs"), {
        userId: user.uid,
        imageUrl,
        ...data.data,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
      alert("❌ Error contacting AI server");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🤖 AI Repair Assistant</h1>
      <p className="text-gray-400 mb-4">
        {userData?.isPro ? "💎 Pro Active" : "Free Plan"}
      </p>
      <input 
        type="file" 
        onChange={handleImageChange} 
        className="mb-4" 
      />
      {preview && (
        <img 
          src={preview} 
          className="w-48 rounded-xl mb-4" 
        />
      )}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full p-3 rounded-xl bg-white/5 border border-white/10 mb-4"
        placeholder="Describe the issue..."
      />
      <button 
        onClick={askAI} 
        className="bg-cyan-500 px-6 py-3 rounded-xl font-semibold"
      >
        {loading ? "Analyzing..." : "Analyze ⚡"}
      </button>
      {result && (
        <div className="mt-6 bg-white/5 p-6 rounded-2xl border border-white/10">
          <h3 className="font-semibold mb-2">Diagnosis</h3>
          <p><b>Problem:</b> {result.problem}</p>
          <p><b>Solution:</b> {result.solution}</p>
        </div>
      )}
    </div>
  );
}