import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // 👈 loading state

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        // ❌ Not logged in
        if (!firebaseUser) {
          setUser(null);
          return;
        }

        // 🔍 Fetch user from Firestore
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        // 🆕 If user does NOT exist → create them
        if (!userSnap.exists()) {
          const newUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: "user", // 👈 default role
            createdAt: serverTimestamp(),
            online: true,
          };

          await setDoc(userRef, newUser);

          setUser(newUser);
        } else {
          // ✅ Existing user → merge Auth + Firestore
          const dbData = userSnap.data();

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: dbData.role || "user", // 🔥 ADMIN READY
            online: dbData.online || false,
            ...dbData,
          });
        }
      } catch (error) {
        console.error("Auth error:", error);
        setUser(null);
      }
    });

    return () => unsub();
  }, []);

  // 🚫 BLOCK APP UNTIL AUTH READY
  if (user === undefined) {
    return <p className="p-6 text-white">Loading authentication...</p>;
  }

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
}

// 🔥 HOOK
export const useAuth = () => useContext(AuthContext);