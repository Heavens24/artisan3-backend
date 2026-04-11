import { Toaster, toast } from "react-hot-toast";

export default function NotificationProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "#1f2937",
          color: "#fff",
          borderRadius: "12px",
        },
      }}
    />
  );
}

// 🔔 EXPORT HELPERS
export const notifySuccess = (msg) =>
  toast.success(msg);

export const notifyError = (msg) =>
  toast.error(msg);

export const notifyInfo = (msg) =>
  toast(msg);