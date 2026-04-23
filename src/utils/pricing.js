export function suggestPrice(skill) {
  const pricing = {
    plumbing: 500,
    electrical: 700,
    carpentry: 600,
    painting: 400,
  };

  return pricing[skill] || 300;
}