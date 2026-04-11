import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-900 text-white">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-6 bg-gradient-to-br from-slate-900 to-slate-800">
        {/* Notifications */}
        <div id="notifications-root" />

        {children}
      </main>
    </div>
  );
}