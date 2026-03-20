export function getAvatarGradient(seed: string) {
  const hash = seed.replace(/^0x/, "").padStart(8, "0");
  const hue1 = parseInt(hash.slice(0, 2), 16) % 360;
  const hue2 = (hue1 + 60) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 65%, 52%), hsl(${hue2}, 65%, 52%))`;
}
