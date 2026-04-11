import { createContext, useContext, useState } from "react";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (msg) => {
    const id = Date.now();

    setNotifications(prev => [...prev, { id, msg }]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}

      {/* UI */}
      <div className="fixed top-5 right-5 space-y-2 z-50">
        {notifications.map(n => (
          <div
            key={n.id}
            className="bg-white text-black px-4 py-2 rounded-lg shadow-lg animate-bounce"
          >
            {n.msg}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export const useNotify = () => useContext(NotificationContext);