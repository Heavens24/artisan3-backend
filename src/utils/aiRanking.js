export function scoreJob(job, user) {
  let score = 0;

  // 🎯 Skill match
  if (job.skill === user.skill) score += 50;

  // 💰 Budget weight
  score += Math.min((job.budget || 0) / 10, 30);

  // ⏱ Fresh jobs
  if (job.createdAt?.seconds) {
    const ageHours =
      (Date.now() - job.createdAt.seconds * 1000) / (1000 * 60 * 60);

    score += Math.max(0, 20 - ageHours);
  }

  // 📍 Distance bonus (if exists)
  if (job.distance) {
    score += Math.max(0, 20 - job.distance);
  }

  return score;
}

export function rankJobsAI(jobs, user) {
  return jobs
    .map((job) => ({
      ...job,
      aiScore: scoreJob(job, user),
    }))
    .sort((a, b) => b.aiScore - a.aiScore);
}