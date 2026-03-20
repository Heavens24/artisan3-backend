import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // While checking auth
  if (user === undefined) {
    return <p>Loading...</p>;
  }

  // If not logged in
  if (!user) {
    return <Navigate to="/login" />;
  }

  // If logged in
  return children;
}