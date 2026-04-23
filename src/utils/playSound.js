export const playMessageSound = () => {
  const audio = new Audio("/message.mp3"); // put file in /public
  audio.volume = 0.5;
  audio.play().catch(() => {});
};