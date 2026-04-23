import { useEffect, useRef } from "react";
import { collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const LOW_STOCK_THRESHOLD = 2;

export default function useNotificationTriggers(user, tools, logs) {
  const hasRun = useRef(false);

  useEffect(() => {
    if (!user?.uid || hasRun.current ||!tools.length) return;

    const checkAndNotify = async () => {
      const now = Date.now();
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD to prevent daily spam

      try {
        // 1. Check low stock tools
        const lowStock = tools.filter(t => t.quantity > 0 && t.quantity <= LOW_STOCK_THRESHOLD);

        for (const tool of lowStock) {
          const q = query(
            collection(db, "notifications"),
            where("userId", "==", user.uid),
            where("type", "==", "low_stock"),
            where("itemId", "==", tool.id),
            where("dateKey", "==", today)
          );
          const existing = await getDocs(q);
          if (existing.empty) {
            await addDoc(collection(db, "notifications"), {
              userId: user.uid,
              type: "low_stock",
              title: "Low Stock Alert",
              message: `${tool.name} is low: ${tool.quantity} left`,
              itemId: tool.id,
              dateKey: today,
              read: false,
              createdAt: serverTimestamp()
            });
          }
        }

        // 2. Check overdue logs
        const overdue = logs.filter(l => {
          if (l.status!== "pending") return false;
          const dueDate = (l.createdAt?.toMillis() || 0) + (l.intervalDays || 30) * 86400000;
          return dueDate < now;
        });

        for (const log of overdue) {
          const q = query(
            collection(db, "notifications"),
            where("userId", "==", user.uid),
            where("type", "==", "overdue_log"),
            where("itemId", "==", log.id),
            where("dateKey", "==", today)
          );
          const existing = await getDocs(q);
          if (existing.empty) {
            await addDoc(collection(db, "notifications"), {
              userId: user.uid,
              type: "overdue_log",
              title: "Task Overdue",
              message: `${log.title} was due`,
              itemId: log.id,
              dateKey: today,
              read: false,
              createdAt: serverTimestamp()
            });
          }
        }

        hasRun.current = true;
      } catch (err) {
        console.error("Notification trigger error:", err);
      }
    };

    checkAndNotify();
  }, [user?.uid, tools, logs]);
}