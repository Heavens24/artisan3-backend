import { useEffect, useState } from "react";
import {
  doc,
  onSnapshot,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function Wallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState({ balance: 0, pending: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const ref = doc(db, "wallets", user.uid);

    const unsub = onSnapshot(ref, async (snap) => {
      if (!snap.exists()) {
        await setDoc(ref, {
          balance: 0,
          pending: 0,
          createdAt: serverTimestamp(),
        });
      } else {
        setWallet(snap.data());
      }
    });

    return () => unsub();
  }, [user]);

  const handleWithdraw = async () => {
    if (!wallet.balance || wallet.balance <= 0) {
      return alert("❌ No funds available");
    }

    try {
      setLoading(true);

      const amount = wallet.balance;

      await updateDoc(doc(db, "wallets", user.uid), {
        balance: 0,
      });

      await addDoc(collection(db, "withdrawals"), {
        userId: user.uid,
        amount,
        status: "pending",
        createdAt: serverTimestamp(),
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
    <div className="min-h-screen text-white p-6">
      <h1 className="text-3xl font-bold mb-6">💰 My Wallet</h1>

      <div className="grid md:grid-cols-2 gap-6">

        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
          <p className="text-gray-400 text-sm">Available Balance</p>
          <h2 className="text-4xl font-bold text-green-400 mt-2">
            R {wallet.balance || 0}
          </h2>

          <button
            onClick={handleWithdraw}
            disabled={loading || wallet.balance <= 0}
            className="mt-4 w-full bg-green-500 py-3 rounded-xl hover:bg-green-600 transition disabled:bg-gray-600"
          >
            {loading ? "Processing..." : "💸 Withdraw"}
          </button>
        </div>

        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
          <p className="text-gray-400 text-sm">Pending Earnings</p>
          <h2 className="text-3xl font-semibold text-yellow-400 mt-2">
            R {wallet.pending || 0}
          </h2>
        </div>

      </div>
    </div>
  );
}