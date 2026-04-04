import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function Wallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState({ balance: 0, pending: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const ref = doc(db, "wallets", user.uid);

    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setWallet(snap.data());
      }
    });

    return () => unsub();
  }, [user]);

  const handleWithdraw = async () => {
    if (!wallet.balance || wallet.balance <= 0) {
      return alert("❌ No funds available");
    }

    const amount = wallet.balance;

    try {
      setLoading(true);

      // 🔒 LOCK FUNDS (important)
      await updateDoc(doc(db, "wallets", user.uid), {
        balance: 0
      });

      // 🧾 CREATE WITHDRAWAL REQUEST
      await addDoc(collection(db, "withdrawals"), {
        userId: user.uid,
        amount,
        status: "pending",
        createdAt: serverTimestamp()
      });

      alert("💸 Withdrawal request submitted!");
    } catch (err) {
      console.error(err);
      alert("Error processing withdrawal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2>💰 My Wallet</h2>

      <div style={styles.card}>
        <h3>Available Balance</h3>
        <p>R{wallet.balance || 0}</p>
      </div>

      <div style={styles.card}>
        <h3>Pending Earnings</h3>
        <p>R{wallet.pending || 0}</p>
      </div>

      <button
        onClick={handleWithdraw}
        disabled={loading}
        style={styles.button}
      >
        {loading ? "Processing..." : "💸 Withdraw"}
      </button>
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    color: "#fff"
  },
  card: {
    background: "#1a1a1a",
    padding: "20px",
    marginBottom: "10px",
    borderRadius: "10px"
  },
  button: {
    padding: "12px",
    background: "#00ffcc",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold"
  }
};