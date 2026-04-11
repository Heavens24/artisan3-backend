export default function Profile() {
  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">👤 My Professional Profile</h1>

      <div className="bg-white/5 p-4 rounded-xl mb-4">
        <h2 className="font-semibold">📁 Projects</h2>
        <p className="text-sm opacity-70">Showcase your completed work</p>
      </div>

      <div className="bg-white/5 p-4 rounded-xl mb-4">
        <h2 className="font-semibold">📜 Certifications</h2>
        <p className="text-sm opacity-70">Upload proof of skills</p>
      </div>

      <div className="bg-white/5 p-4 rounded-xl">
        <h2 className="font-semibold">🤝 Endorsements</h2>
        <p className="text-sm opacity-70">Get trusted by clients</p>
      </div>
    </div>
  );
}