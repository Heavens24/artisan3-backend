import { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const register = async () => {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", userCred.user.uid), {
      uid: userCred.user.uid,
      email,
      isPro: false
    });

    navigate("/dashboard");
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>Register</h2>

      <input placeholder="Email" onChange={e => setEmail(e.target.value)} /><br />
      <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} /><br />

      <button onClick={register}>Register</button>

      <p>Already have an account? <Link to="/login">Login</Link></p>
    </div>
  );
}