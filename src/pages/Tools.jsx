import { useState, useEffect, useMemo } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { notifySuccess, notifyError } from "../components/NotificationProvider";

const LOW_STOCK_THRESHOLD = 2;
const WEAR_THRESHOLD = 50;

export default function Tools() {
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState("good");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      setTools([]);
      return;
    }

    const q = query(
      collection(db, "tools"),
      where("userId", "==", user.uid)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.metadata.hasPendingWrites &&!snap.metadata.fromCache) return;

        const data = snap.docs.map((d) => ({
          id: d.id,
        ...d.data()
        }))
      .sort((a, b) => {
          const aTime = a.createdAt?.toMillis() || 0;
          const bTime = b.createdAt?.toMillis() || 0;
          return bTime - aTime;
        });

        setTools(data);
        setLoading(false);
      },
      (err) => {
        console.error("Tools listener error:", err.code, err.message);
        setTools([]);
        setLoading(false);
        if (err.code === 'permission-denied') {
          notifyError("Permission denied. Check your rules.");
        } else if (err.code === 'failed-precondition') {
          notifyError("Index building. Wait 1 min and refresh.");
        } else {
          notifyError("Could not load tools");
        }
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const filteredTools = useMemo(() => {
    return tools.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter =
        filter === "all" ||
        (filter === "low" && t.quantity <= LOW_STOCK_THRESHOLD) ||
        (filter === "poor" && t.condition === "poor");
      return matchesSearch && matchesFilter;
    });
  }, [tools, search, filter]);

  const totalValue = useMemo(() =>
    tools.reduce((sum, t) => sum + (Number(t.purchasePrice || 0) * t.quantity), 0), [tools]
  );

  const addTool = async () => {
    if (!name.trim()) return notifyError("Enter a tool name");
    if (Number(quantity) < 1) return notifyError("Quantity must be at least 1");
    if (!user?.uid) return notifyError("Not logged in");

    try {
      setSaving(true);
      await addDoc(collection(db, "tools"), {
        userId: user.uid,
        name: name.trim(),
        quantity: Number(quantity),
        condition,
        purchasePrice: Number(purchasePrice) || 0,
        totalUses: 0,
        createdAt: serverTimestamp()
      });

      notifySuccess("Tool added");
      setName("");
      setQuantity(1);
      setCondition("good");
      setPurchasePrice("");
    } catch (err) {
      console.error(err);
      notifyError(err.code === 'permission-denied'? "No permission to add tool" : "Failed to add tool");
    } finally {
      setSaving(false);
    }
  };

  const useTool = async (tool) => {
    if (tool.quantity < 1) return notifyError("None left to use");
    try {
      const newUses = (tool.totalUses || 0) + 1;
      let newCondition = tool.condition;
      if (newUses >= WEAR_THRESHOLD * 2 && tool.condition === "fair") newCondition = "poor";
      else if (newUses >= WEAR_THRESHOLD && tool.condition === "good") newCondition = "fair";

      await updateDoc(doc(db, "tools", tool.id), {
        quantity: tool.quantity - 1,
        totalUses: newUses,
        condition: newCondition,
        lastUsed: serverTimestamp()
      });

      if (newUses === WEAR_THRESHOLD) notifyError(`${tool.name} needs maintenance soon`);
      if (tool.quantity - 1 === LOW_STOCK_THRESHOLD) notifyError(`${tool.name} is running low`);
    } catch (err) {
      console.error(err);
      notifyError(err.code === 'permission-denied'? "No permission to use tool" : "Could not use tool");
    }
  };

  const deleteTool = async (tool) => {
    if (!window.confirm(`Delete ${tool.name}?`)) return;
    try {
      await deleteDoc(doc(db, "tools", tool.id));
      notifySuccess("Tool deleted");
    } catch (err) {
      console.error(err);
      notifyError(err.code === 'permission-denied'? "No permission to delete" : "Could not delete tool");
    }
  };

  const getToolStatus = (tool) => {
    if (tool.quantity <= 0) return { text: "Out of stock", color: "text-red-400" };
    if (tool.quantity <= LOW_STOCK_THRESHOLD) return { text: "Low stock", color: "text-yellow-400" };
    if (tool.condition === "poor") return { text: "Needs repair", color: "text-orange-400" };
    return { text: "Ready", color: "text-green-400" };
  };

  return (
    <div className="p-2 md:p-6 text-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl">🧰 Tools</h2>
        <div className="text-right">
          <p className="text-sm text-gray-400">Total Value: R{totalValue.toFixed(2)}</p>
          <p className="text-xs text-gray-600">UID: {user?.uid?.slice(0,8)}...</p>
        </div>
      </div>

      <div className="bg-white/5 p-4 rounded-2xl mb-6">
        <div className="flex gap-2 flex-wrap">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tool name"
            className="p-2 bg-slate-800 rounded flex-1 min-w-[150px] outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Qty"
            className="p-2 bg-slate-800 rounded w-20 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            min="0"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            placeholder="Price R"
            className="p-2 bg-slate-800 rounded w-24 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="p-2 bg-slate-800 rounded outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="good">good</option>
            <option value="fair">fair</option>
            <option value="poor">poor</option>
          </select>
          <button
            onClick={addTool}
            disabled={saving}
            className="bg-blue-600 px-4 rounded hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving? "Adding..." : "Add"}
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tools..."
          className="p-2 bg-slate-800 rounded flex-1 min-w-[200px] outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="p-2 bg-slate-800 rounded outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Tools</option>
          <option value="low">Low Stock</option>
          <option value="poor">Needs Repair</option>
        </select>
      </div>

      {loading? (
        <p>Loading...</p>
      ) : filteredTools.length === 0 && tools.length === 0? (
        <div className="text-center py-16 bg-slate-800/50 rounded-2xl">
          <div className="text-6xl mb-4">🧰</div>
          <h3 className="text-xl font-bold mb-2">No tools logged yet</h3>
          <p className="text-gray-400 mb-6 max-w-sm mx-auto">Add your spanners, grinders, and meters here. Stop losing tools, stop buying twice. Track everything Transnet gives you and your own gear.</p>
          <button
            onClick={() => document.querySelector('input[placeholder="Tool name"]').focus()}
            className="bg-teal-500 text-black px-6 py-2 rounded-lg font-semibold hover:bg-teal-400 transition"
          >
            Add First Tool
          </button>
        </div>
      ) : filteredTools.length === 0? (
        <p className="text-gray-400 text-center py-8">No tools match your search.</p>
      ) : (
        <div className="grid gap-2">
          {filteredTools.map(tool => {
            const status = getToolStatus(tool);
            return (
              <div key={tool.id} className="bg-slate-800 p-4 rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-semibold text-lg">{tool.name}</p>
                  <p className="text-sm text-gray-400">
                    Qty: {tool.quantity} • {tool.condition} • Used: {tool.totalUses || 0}
                  </p>
                  <p className={`text-xs font-semibold ${status.color}`}>{status.text}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => useTool(tool)}
                    disabled={tool.quantity < 1}
                    className="bg-green-600 px-3 py-2 rounded hover:bg-green-700 transition disabled:opacity-50"
                  >
                    Use
                  </button>
                  <button
                    onClick={() => deleteTool(tool)}
                    className="bg-red-600 px-3 py-2 rounded hover:bg-red-700 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 