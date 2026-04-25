import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-hot-toast";

export default function Settings() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    darkMode: false,
    pushNotifications: true,
    isPro: false,
  });

  const [installAvailable, setInstallAvailable] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchUser = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setForm({
          displayName: data.displayName || user.displayName || "",
          email: data.email || user.email || "",
          darkMode: data.darkMode || false,
          pushNotifications: data.pushNotifications ?? true,
          isPro: data.isPro || false,
        });
      }
      setLoading(false);
    };

    fetchUser();
  }, [user]);

  // ✅ Detect install availability
  useEffect(() => {
    if (window.deferredPrompt) {
      setInstallAvailable(true);
    }

    const handler = () => {
      if (window.deferredPrompt) {
        setInstallAvailable(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!window.deferredPrompt) {
      toast("Install not available yet. Try refreshing.");
      return;
    }

    window.deferredPrompt.prompt();
    const choice = await window.deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      toast.success("App installed 🎉");
      setInstallAvailable(false);
    }

    window.deferredPrompt = null;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: form.displayName,
        darkMode: form.darkMode,
        pushNotifications: form.pushNotifications,
      });
      toast.success("Settings saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading settings...</div>;

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Account */}
      <section className="mb-8 bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Account</h2>

        <label className="block mb-4">
          <span className="text-sm text-gray-300">Display Name</span>
          <input
            name="displayName"
            className="w-full bg-gray-700 border border-gray-600 rounded p-2 mt-1 text-white"
            value={form.displayName}
            onChange={handleChange}
          />
        </label>

        <label className="block mb-4">
          <span className="text-sm text-gray-300">Email</span>
          <input
            disabled
            className="w-full bg-gray-900 border border-gray-700 rounded p-2 mt-1 text-gray-400"
            value={form.email}
          />
        </label>

        <div className="text-sm">
          Plan:{" "}
          <span className={form.isPro ? "text-green-400" : "text-yellow-400"}>
            {form.isPro ? "Pro – R10/month" : "Free"}
          </span>
        </div>
      </section>

      {/* Preferences */}
      <section className="mb-8 bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Preferences</h2>

        <label className="flex items-center justify-between mb-4">
          <span>Dark Mode</span>
          <input
            type="checkbox"
            name="darkMode"
            checked={form.darkMode}
            onChange={handleChange}
            className="w-5 h-5"
          />
        </label>

        <label className="flex items-center justify-between">
          <span>Push Notifications</span>
          <input
            type="checkbox"
            name="pushNotifications"
            checked={form.pushNotifications}
            onChange={handleChange}
            className="w-5 h-5"
          />
        </label>
      </section>

      {/* 🔥 App Install Section */}
      <section className="mb-8 bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">App</h2>

        <button
          onClick={handleInstall}
          disabled={!installAvailable}
          className={`px-4 py-2 rounded text-white ${
            installAvailable
              ? "bg-teal-600 hover:bg-teal-700"
              : "bg-gray-600 cursor-not-allowed"
          }`}
        >
          {installAvailable ? "Install App" : "Install not available"}
        </button>

        <p className="text-xs text-gray-400 mt-2">
          Install Shimlah for a faster, app-like experience.
        </p>
      </section>

      {/* Danger Zone */}
      <section className="mb-8 bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4 text-red-400">
          Danger Zone
        </h2>

        <button
          onClick={logout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </section>

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}