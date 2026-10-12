export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Frame-rate independent damping factor for `lerp(current, target, damp(λ, dt))`. */
export const damp = (lambda: number, dt: number) => 1 - Math.exp(-lambda * dt);

/** Small deterministic PRNG so "random" layouts are stable between renders. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Whether the browser exposes WebGL at all. Deliberately does not create a
 * context: that is expensive on the main thread, and a real failure to get
 * one is caught by SceneBoundary, which swaps in the non-3D fallback.
 */
export function hasWebGL() {
  return (
    typeof window !== "undefined" &&
    (typeof WebGL2RenderingContext !== "undefined" ||
      typeof WebGLRenderingContext !== "undefined")
  );
}
