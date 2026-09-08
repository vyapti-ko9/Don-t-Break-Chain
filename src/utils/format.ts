export function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '-';
  const s = Math.floor(sec);
  const cs = Math.floor((sec - s) * 100);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  if (mm > 0) return `${mm}:${String(ss).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  return `${String(ss).padStart(2, '0')}.${String(cs).padStart(2, '0')}s`;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
