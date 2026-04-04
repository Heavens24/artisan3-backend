import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function BecomeArtisan() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: "",
    trade: "",
    experience: "",
    rate: "",
    bio: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.name || !form.trade || !form.rate) {
      alert("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "artisans"), {
        uid: user.uid,
        email: user.email,
        name: form.name,
        trade: form.trade,
        experience: Number(form.experience) || 0,
        rate: Number(form.rate),
        bio: form.bio,
        rating: 0,
        verified: false,
        createdAt: serverTimestamp(),
      });

      setSuccess("✅ You are now an artisan!");
      setForm({
        name: "",
        trade: "",
        experience: "",
        rate: "",
        bio: "",
      });

    } catch (err) {
      console.error(err);
      alert("Error saving artisan profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", color: "white", maxWidth: "500px" }}>
      <h2>🛠 Become an Artisan</h2>

      {success && <p style={{ color: "#00ffcc" }}>{success}</p>}

      <input
        name="name"
        placeholder="Your Name"
        value={form.name}
        onChange={handleChange}
        style={inputStyle}
      />

      <input
        name="trade"
        placeholder="Trade (e.g. Electrician)"
        value={form.trade}
        onChange={handleChange}
        style={inputStyle}
      />

      <input
        name="experience"
        placeholder="Years of Experience"
        value={form.experience}
        onChange={handleChange}
        style={inputStyle}
      />

      <input
        name="rate"
        placeholder="Rate (e.g. 150)"
        value={form.rate}
        onChange={handleChange}
        style={inputStyle}
      />

      <textarea
        name="bio"
        placeholder="Short Bio"
        value={form.bio}
        onChange={handleChange}
        style={{ ...inputStyle, height: "80px" }}
      />

      <button onClick={handleSubmit} disabled={loading} style={btnStyle}>
        {loading ? "Saving..." : "Submit"}
      </button>
    </div>
  );
}

// 🎨 STYLES
const inputStyle = {
  display: "block",
  width: "100%",
  padding: "10px",
  margin: "10px 0",
  borderRadius: "6px",
  border: "none",
};

const btnStyle = {
  padding: "10px",
  width: "100%",
  background: "#00ffcc",
  border: "none",
  borderRadius: "6px",
  fontWeight: "bold",
};