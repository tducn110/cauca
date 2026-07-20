export function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

