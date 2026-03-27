import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function AI() {
  const { user } = useAuth();

  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);

  // 🔒 Load user data
  useEffect(() => {
    if (!user) return;

    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, (docSnap) => {
      setUserData(docSnap.data());
    });

    return () => unsub();
  }, [user]);

  if (!user) return <p>Loading...</p>;

  const suggestions = [
    "Motor overheating",
    "Pump not starting",
    "Electrical short circuit",
    "Machine vibrating excessively"
  ];

  const askAI = async () => {
    if (!prompt) return alert("Describe the problem first");

    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("http://localhost:5000/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt,
          userId: user.uid
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.includes("Daily free limit")) {
          setResponse("🚫 Daily limit reached. Upgrade to Pro or try again tomorrow.");
        } else {
          setResponse(data.error || "Something went wrong.");
        }
        return;
      }

      setResponse(data.reply);

    } catch (err) {
      console.error(err);
      setResponse("Error contacting assistant.");
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: "30px", color: "white" }}>
      <h2>🔧 Instant Repair Assistant</h2>
      <p style={{ color: "#94a3b8" }}>
        Fix problems in minutes
      </p>

      <p>
        {userData?.isPro
          ? "💎 Pro — Unlimited"
          : `Free Plan — ${userData?.usageCount || 0}/3 today`}
      </p>

      {/* 💡 SMART SUGGESTIONS */}
      <div style={{ marginTop: "10px" }}>
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => setPrompt(s)}
            style={{
              marginRight: "5px",
              marginBottom: "5px",
              padding: "5px",
              cursor: "pointer"
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your problem..."
        style={{ width: "100%", height: "120px", marginTop: "10px" }}
      />

      <button onClick={askAI} style={{ marginTop: "10px" }}>
        {loading ? "Getting solution..." : "Get Solution ⚡"}
      </button>

      {response && (
        <div style={{ marginTop: "20px" }}>
          <h4>🔧 Recommended Fix:</h4>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}