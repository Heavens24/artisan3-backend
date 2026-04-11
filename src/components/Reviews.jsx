export default function Reviews() {
  const reviews = [
    { name: "Thabo", rating: 5, text: "🔥 This app changed how I manage jobs!" },
    { name: "Lerato", rating: 4, text: "Very useful, especially the AI assistant!" },
  ];

  return (
    <div className="bg-white/5 p-6 rounded-xl mt-6">
      <h2 className="text-xl font-bold mb-4">⭐ Artisan Reviews</h2>

      {reviews.map((r, i) => (
        <div key={i} className="mb-3 border-b border-white/10 pb-2">
          <p className="font-semibold">{r.name}</p>
          <p>{"⭐".repeat(r.rating)}</p>
          <p className="text-sm opacity-80">{r.text}</p>
        </div>
      ))}
    </div>
  );
}