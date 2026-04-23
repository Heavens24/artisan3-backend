export const rankJobs = (jobs = []) => {
  return [...jobs].sort((a, b) => {
    const scoreA =
      (a.budget || 0) +
      (a.priority || 0) +
      new Date(a.createdAt?.seconds * 1000 || 0).getTime();

    const scoreB =
      (b.budget || 0) +
      (b.priority || 0) +
      new Date(b.createdAt?.seconds * 1000 || 0).getTime();

    return scoreB - scoreA;
  });
};