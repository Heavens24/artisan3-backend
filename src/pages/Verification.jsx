import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db, storage } from "../firebase";
import { doc, updateDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { notifySuccess, notifyError } from "../components/NotificationProvider";
import { useNavigate } from "react-router-dom";

export default function Verification() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [idFile, setIdFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [idPreview, setIdPreview] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    return onSnapshot(doc(db, "users", user.uid), (snap) => {
      setUserData(snap.data() || {});
    });
  }, [user?.uid]);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return notifyError("File must be under 5MB");

    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === "id") {
        setIdFile(file);
        setIdPreview(e.target.result);
      } else {
        setSelfieFile(file);
        setSelfiePreview(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const submitVerification = async () => {
    if (!idFile ||!selfieFile) return notifyError("Upload both ID and selfie");
    setUploading(true);

    try {
      // Upload ID
      const idRef = ref(storage, `verification/${user.uid}/id_${Date.now()}.jpg`);
      await uploadBytes(idRef, idFile);
      const idUrl = await getDownloadURL(idRef);

      // Upload Selfie
      const selfieRef = ref(storage, `verification/${user.uid}/selfie_${Date.now()}.jpg`);
      await uploadBytes(selfieRef, selfieFile);
      const selfieUrl = await getDownloadURL(selfieRef);

      // For MVP: auto-verify. In prod, admin reviews first
      await updateDoc(doc(db, "users", user.uid), {
        idDocUrl: idUrl,
        selfieUrl: selfieUrl,
        verified: true, // set to false if you want manual review
        verifiedAt: serverTimestamp()
      });

      notifySuccess("Verification submitted! You're now verified 🚀");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      notifyError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  if (userData?.verified) {
    return (
      <div className="p-6 text-white max-w-2xl mx-auto">
        <div className="bg-green-500/10 border border-green-500/30 p-6 rounded-2xl text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-green-400">You’re Verified</h1>
          <p className="text-gray-300 mt-2">Your profile shows the verified badge. Clients trust you more.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-teal-500 px-6 py-3 rounded-xl mt-6 hover:bg-teal-600 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 text-white max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">🔒 Get Verified</h1>
      <p className="text-gray-400 mb-6">Verified artisans get 3x more jobs. Upload your ID + selfie.</p>

      <div className="bg-white/5 p-6 rounded-2xl space-y-6">
        {/* ID Upload */}
        <div>
          <label className="block text-sm font-semibold mb-2">ID Document</label>
          <p className="text-xs text-gray-400 mb-3">Driver’s license, passport, or national ID</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, "id")}
            className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-500 file:text-black hover:file:bg-teal-600"
          />
          {idPreview && <img src={idPreview} className="mt-3 rounded-lg max-h-40" />}
        </div>

        {/* Selfie Upload */}
        <div>
          <label className="block text-sm font-semibold mb-2">Selfie with ID</label>
          <p className="text-xs text-gray-400 mb-3">Hold your ID next to your face</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, "selfie")}
            className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-500 file:text-black hover:file:bg-teal-600"
          />
          {selfiePreview && <img src={selfiePreview} className="mt-3 rounded-lg max-h-40" />}
        </div>

        <button
          onClick={submitVerification}
          disabled={uploading ||!idFile ||!selfieFile}
          className="w-full bg-green-600 py-3 rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading? "Uploading..." : "Submit for Verification"}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Your documents are encrypted. We only use them to verify identity.
        </p>
      </div>
    </div>
  );
}