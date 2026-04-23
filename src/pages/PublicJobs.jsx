import { useEffect, useState, useRef } from "react";
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "../firebase";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toPng } from "html-to-image";

export default function PublicJobs() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [singleJob, setSingleJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef(null);

  useEffect(() => {
    if (jobId) {
      const fetchJob = async () => {
        const snap = await getDoc(doc(db, "jobs", jobId));
        if (snap.exists() && snap.data().status === "searching") {
          const jobData = { id: snap.id,...snap.data() };
          setSingleJob(jobData);
          // Track view
          updateDoc(doc(db, "jobs", jobId), { views: increment(1) }).catch(() => {});
        }
        setLoading(false);
      };
      fetchJob();
    } else {
      const q = query(
        collection(db, "jobs"),
        where("status", "==", "searching")
      );
      const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id,...d.data() }))
       .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
       .slice(0, 20);
        setJobs(data);
        setLoading(false);
      });
      return () => unsub();
    }
  }, [jobId]);

  const generateShareImage = async (job) => {
    if (!cardRef.current) return null;
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#0f172a'
      });
      return dataUrl;
    } catch (err) {
      console.error("Image gen failed:", err);
      return null;
    }
  };

  const shareJob = async (job) => {
    const url = `${window.location.origin}/jobs/${job.id}`;
    const text = `🚨 ${job.title}\n💰 R${job.budget} | 📍 ${job.location?.city || 'SA'}\n\nApply on Shimlah – Free to join!`;

    // Try native share with image
    if (navigator.share && navigator.canShare) {
      try {
        const imageDataUrl = await generateShareImage(job);
        if (imageDataUrl) {
          const blob = await (await fetch(imageDataUrl)).blob();
          const file = new File([blob], 'job.png', { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `${job.title} - R${job.budget}`,
              text,
              url,
              files: [file]
            });
            return;
          }
        }
      } catch (err) {
        console.log("Share with image failed, fallback to text");
      }
    }

    // Fallback: text only
    if (navigator.share) {
      try {
        await navigator.share({ title: job.title, text, url });
        return;
      } catch {}
    }

    // Final fallback: copy
    navigator.clipboard.writeText(`${text}\n${url}`);
    alert("Link copied! Paste it on WhatsApp Status 🔥");
  };

  if (loading) return <div className="p-6 text-white">Loading jobs...</div>;

  // Single Job View
  if (jobId && singleJob) {
    const ogImage = `https://api.dicebear.com/7.x/shapes/svg?seed=${singleJob.id}`; // fallback OG image

    return (
      <>
        <Helmet>
          <title>{singleJob.title} - R{singleJob.budget} | Shimlah</title>
          <meta name="description" content={`${singleJob.description.slice(0, 150)}... Apply now on Shimlah.`} />
          <meta property="og:title" content={`${singleJob.title} - R${singleJob.budget}`} />
          <meta property="og:description" content={singleJob.description} />
          <meta property="og:image" content={ogImage} />
          <meta property="og:url" content={`${window.location.origin}/jobs/${singleJob.id}`} />
          <meta name="twitter:card" content="summary_large_image" />
        </Helmet>

        {/* Hidden div for generating share image */}
        <div ref={cardRef} className="fixed -left-[9999px] w-[600px] bg-slate-900 text-white p-8 rounded-2xl">
          <div className="text-teal-400 font-bold text-2xl mb-4">🛠 Shimlah</div>
          <h1 className="text-3xl font-bold mb-2">{singleJob.title}</h1>
          <p className="text-4xl text-cyan-400 font-bold mb-4">R{singleJob.budget}</p>
          <p className="text-gray-300 mb-4">{singleJob.description.slice(0, 120)}...</p>
          <p className="text-lg">📍 {singleJob.location?.city || "South Africa"}</p>
          <div className="mt-6 text-sm text-gray-400">Apply now at shimlah.app</div>
        </div>

        <div className="min-h-screen bg-slate-900 text-white p-6">
          <div className="max-w-3xl mx-auto">
            <Link to="/jobs" className="text-teal-400 text-sm">← All Jobs</Link>
            <div className="bg-white/5 p-6 rounded-2xl mt-4">
              <h1 className="text-3xl font-bold mb-2">{singleJob.title}</h1>
              <p className="text-2xl text-cyan-400 font-semibold mb-4">R{singleJob.budget}</p>
              <p className="text-gray-300 mb-4">{singleJob.description}</p>
              <p className="text-sm text-gray-400 mb-2">📍 {singleJob.location?.city || "Location TBD"}</p>
              <p className="text-xs text-gray-500 mb-6">👁️ {singleJob.views || 0} views</p>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate("/register")}
                  className="flex-1 bg-green-600 py-3 rounded-xl font-semibold hover:bg-green-700 transition"
                >
                  Apply Now - Sign Up Free
                </button>
                <button
                  onClick={() => shareJob(singleJob)}
                  className="bg-blue-600 px-6 py-3 rounded-xl hover:bg-blue-700 transition"
                >
                  Share to WhatsApp
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Payment handled directly between parties. Shimlah connects you.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Job List View
  return (
    <>
      <Helmet>
        <title>Find Artisan Jobs Near You | Shimlah</title>
        <meta name="description" content="Browse live artisan jobs in South Africa. Plumbers, electricians, carpenters needed. Join Shimlah to apply." />
        <meta property="og:title" content="Live Artisan Jobs - Shimlah" />
        <meta property="og:description" content="Find work today. Plumbers, electricians, builders needed across SA." />
        <meta property="og:image" content="https://api.dicebear.com/7.x/shapes/svg?seed=shimlah" />
      </Helmet>

      <div className="min-h-screen bg-slate-900 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">🛠 Live Jobs on Shimlah</h1>
            <p className="text-gray-400">Join for free. Upgrade to Pro for R10/month to apply.</p>
            <button
              onClick={() => navigate("/register")}
              className="bg-teal-500 px-8 py-3 rounded-xl mt-4 hover:bg-teal-600 transition font-semibold"
            >
              Create Free Account
            </button>
          </div>

          {jobs.length === 0? (
            <p className="text-center text-gray-400">No jobs posted yet. Check back soon.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map(job => (
                <div key={job.id} className="bg-white/5 p-5 rounded-2xl hover:bg-white/10 transition">
                  <h3 className="font-bold text-lg mb-2">{job.title}</h3>
                  <p className="text-cyan-400 font-semibold mb-2">R{job.budget}</p>
                  <p className="text-sm text-gray-300 mb-3 line-clamp-2">{job.description}</p>
                  <p className="text-xs text-gray-500 mb-4">📍 {job.location?.city || "TBD"} • 👁️ {job.views || 0}</p>

                  <div className="flex gap-2">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="flex-1 bg-slate-700 py-2 rounded-lg text-center text-sm hover:bg-slate-600 transition"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => shareJob(job)}
                      className="bg-blue-600 px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
                    >
                      Share
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}