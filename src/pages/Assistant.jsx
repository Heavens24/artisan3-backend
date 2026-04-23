import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit
} from "firebase/firestore";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { notifyError } from "../components/NotificationProvider";

export default function Assistant() {
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  const [tools, setTools] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  // Load user role first
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), snap => {
      setUserData(snap.data() || {});
    });
    return () => unsub();
  }, [user?.uid]);

  // Load all data – FIXED: error handling + proper loading
  useEffect(() => {
    if (!user?.uid || !userData?.role) return;

    let loadedCount = 0;
    const totalQueries = 3;
    const checkDone = () => {
      loadedCount++;
      if (loadedCount === totalQueries) setLoading(false);
    };

    const unsubs = [
      onSnapshot(
        query(collection(db, "tools"), where("userId", "==", user.uid)),
        snap => {
          setTools(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          checkDone();
        },
        err => {
          console.error("Tools error:", err);
          notifyError("Could not load tools");
          checkDone();
        }
      ),

      onSnapshot(
        query(
          collection(db, "jobs"),
          userData.role === "artisan" 
            ? where("artisanId", "==", user.uid) 
            : where("createdBy", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(20)
        ),
        snap => {
          setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          checkDone();
        },
        err => {
          console.error("Jobs error:", err);
          notifyError("Could not load jobs");
          checkDone();
        }
      ),

      onSnapshot(
        query(
          collection(db, "maintenance_logs"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc") // FIXED: add orderBy so we get newest first
        ),
        snap => {
          setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          checkDone();
        },
        err => {
          console.error("Logs error:", err);
          notifyError("Could not load logs"); // FIXED: now you'll see the real error
          checkDone();
        }
      )
    ];

    return () => unsubs.forEach(u => u());
  }, [user?.uid, userData?.role]);

  // Smart daily briefing generator
  const briefing = useMemo(() => {
    if (loading) return [];
    if (!tools.length && !logs.length && !jobs.length) return [];

    const insights = [];
    const now = new Date();

    // 1. Overdue maintenance
    logs.forEach(log => {
      if (log.status !== "pending") return;
      const lastDate = log.completedAt?.toDate() || log.createdAt?.toDate() || now;
      const dueDate = new Date(lastDate);
      dueDate.setDate(dueDate.getDate() + (log.intervalDays || 30));
      const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        insights.push({
          type: "overdue",
          text: `${log.tool || log.title} is ${Math.abs(diffDays)} days overdue for ${log.type}`,
          priority: 1
        });
      } else if (diffDays <= 3) {
        insights.push({
          type: "due",
          text: `${log.tool || log.title} due in ${diffDays} days`,
          priority: 2
        });
      }
    });

    // 2. Low stock
    tools.forEach(tool => {
      if (tool.quantity <= 0) {
        insights.push({
          type: "stock",
          text: `${tool.name} is out of stock`,
          priority: 1
        });
      } else if (tool.quantity <= 2) {
        insights.push({
          type: "stock",
          text: `${tool.name} low: only ${tool.quantity} left`,
          priority: 2
        });
      }
    });

    // 3. Poor condition tools
    tools.forEach(tool => {
      if (tool.condition === "poor") {
        insights.push({
          type: "condition",
          text: `${tool.name} needs repair or replacement`,
          priority: 2
        });
      }
    });

    // 4. Job profit leaks
    jobs.filter(j => j.status === "completed" && j.toolCost > 0).forEach(job => {
      const profit = (job.paymentAmount || 0) - (job.toolCost || 0);
      if (profit < (job.paymentAmount || 0) * 0.2) {
        insights.push({
          type: "profit",
          text: `Job "${job.title}": R${profit.toFixed(0)} profit after R${job.toolCost.toFixed(0)} tool wear`,
          priority: 3
        });
      }
    });

    // 5. Tool ROI
    tools.forEach(tool => {
      const uses = tool.totalUses || 0;
      const cost = Number(tool.purchasePrice || 0);
      if (cost > 0 && uses > 20) {
        const costPerUse = cost / uses;
        if (costPerUse < 5) {
          insights.push({
            type: "roi",
            text: `${tool.name}: R${costPerUse.toFixed(2)}/use. Great ROI`,
            priority: 4
          });
        }
      }
    });

    return insights
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 5)
      .map(i => i.text);

  }, [tools, jobs, logs, loading]);

  const handleAsk = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: "user", text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    let reply = "I can help with tools, jobs, and maintenance. Try asking 'what needs repair?'";
    
    const q = input.toLowerCase();
    if (q.includes("overdue") || q.includes("maintenance")) {
      const overdue = logs.filter(l => {
        if (l.status !== "pending") return false;
        const lastDate = l.completedAt?.toDate() || l.createdAt?.toDate() || new Date();
        const dueDate = new Date(lastDate);
        dueDate.setDate(dueDate.getDate() + (l.intervalDays || 30));
        return dueDate < new Date();
      });
      reply = overdue.length 
        ? `Overdue: ${overdue.map(l => l.tool || l.title).join(", ")}`
        : "Nothing overdue. You're on top of it.";
    }
    
    else if (q.includes("low stock") || q.includes("buy")) {
      const low = tools.filter(t => t.quantity <= 2);
      reply = low.length
        ? `Low stock: ${low.map(t => `${t.name} (${t.quantity})`).join(", ")}`
        : "All tools well stocked.";
    }
    
    else if (q.includes("profit") || q.includes("money")) {
      const completed = jobs.filter(j => j.status === "completed");
      const totalProfit = completed.reduce((sum, j) => sum + (j.paymentAmount || 0) - (j.toolCost || 0), 0);
      reply = `Net profit from ${completed.length} jobs: R${totalProfit.toFixed(2)}`;
    }

    setTimeout(() => {
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    }, 400);
  };

  return (
    <div className="p-6 text-white max-w-4xl mx-auto">
      <h2 className="text-2xl mb-4 font-bold">🤖 Assistant</h2>

      {/* Daily Briefing */}
      <div className="bg-white/5 p-5 rounded-2xl mb-6">
        <h3 className="text-lg font-semibold mb-3">📋 Daily Briefing</h3>
        {loading ? (
          <p className="text-gray-400">Analyzing your data...</p>
        ) : briefing.length === 0 ? (
          <p className="text-green-400">All clear. No urgent actions.</p>
        ) : (
          <ul className="space-y-2">
            {briefing.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-yellow-400">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Chat */}
      <div className="bg-white/5 p-5 rounded-2xl">
        <h3 className="text-lg font-semibold mb-3">Ask about your business</h3>
        
        <div className="h-64 overflow-y-auto mb-3 space-y-3 bg-slate-900/50 p-3 rounded">
          {messages.length === 0 && (
            <p className="text-gray-500 text-sm">Try: "what needs repair?" or "show low stock"</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <span className={`inline-block px-3 py-2 rounded-lg text-sm ${
                m.role === "user" ? "bg-blue-600" : "bg-slate-700"
              }`}>
                {m.text}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            placeholder="Ask about tools, jobs, profit..."
            className="flex-1 p-2 bg-slate-800 rounded outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAsk}
            className="bg-blue-600 px-4 rounded hover:bg-blue-700 transition"
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}