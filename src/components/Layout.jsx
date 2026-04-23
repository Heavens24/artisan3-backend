import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import OfflineBanner from "./OfflineBanner"; // <-- ADDED #8

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-900 text-white">
      <OfflineBanner /> {/* <-- ADDED #8 */}

      {/* Sidebar for desktop */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-6 pb-20 md:pb-6 bg-gradient-to-br from-slate-900 to-slate-800 overflow-y-auto">
        {/* Notifications */}
        <div id="notifications-root" />
        {children}
      </main>

      {/* Bottom nav for mobile */}
      <BottomNav />
    </div>
  );
}