import { gsap } from "@/lib/gsap";

export const GLYPHS = "!<>-_\\/[]{}—=+*^?#01";

const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

const running = new WeakMap<Element, gsap.core.Tween>();

/**
 * Writes into the element's existing text node. Replacing the node (as
 * `textContent =` does) under a hovering cursor can make the browser skip the
 * element's pointerleave, which strands hover effects.
 */
function setText(el: Element, value: string) {
  const node = el.firstChild;
  if (node && node.nodeType === Node.TEXT_NODE && !node.nextSibling) node.nodeValue = value;
  else el.textContent = value;
}

type ScrambleOptions = {
  /** Seconds. The brief asks for 600–900ms. */
  duration?: number;
  delay?: number;
  /** Text shown before the decode starts; defaults to pure glyph noise. */
  from?: string;
  onComplete?: () => void;
};

/**
 * Decodes `text` left to right out of random glyphs.
 * Several targets can be passed to keep stacked copies (outline + fill) in sync.
 */
export function scramble(
  target: Element | Element[],
  text: string,
  { duration = 0.8, delay = 0, from, onComplete }: ScrambleOptions = {},
) {
  const targets = Array.isArray(target) ? target : [target];
  const key = targets[0];
  running.get(key)?.kill();

  const chars = Array.from(text);
  const origin = from ? Array.from(from) : [];
  const noise = chars.map(() => randomGlyph());
  const state = { p: 0 };
  let tick = 0;

  const write = () => {
    // Refresh the unresolved glyphs every third frame so they read as
    // deliberate flicker instead of per-frame static.
    if (tick++ % 3 === 0) {
      for (let i = 0; i < noise.length; i++) noise[i] = randomGlyph();
    }
    const resolved = state.p * (chars.length + 4) - 4;
    let out = "";
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      if (i <= resolved || c === " " || c === " ") out += c;
      else if (state.p === 0 && origin[i]) out += origin[i];
      else out += noise[i];
    }
    for (const el of targets) setText(el, out);
  };

  const tween = gsap.to(state, {
    p: 1,
    duration,
    delay,
    ease: "none",
    onStart: write,
    onUpdate: write,
    onComplete: () => {
      for (const el of targets) setText(el, text);
      running.delete(key);
      onComplete?.();
    },
  });
  running.set(key, tween);
  return tween;
}

type CountOptions = {
  prefix?: string;
  suffix?: string;
  duration?: number;
  delay?: number;
};

/** Counts up to `value` while the surrounding characters decode. */
export function scrambleCount(
  el: Element,
  value: number,
  { prefix = "", suffix = "", duration = 0.9, delay = 0 }: CountOptions = {},
) {
  running.get(el)?.kill();
  const digits = String(value).length;
  const state = { p: 0 };
  let tick = 0;
  let noise = "";

  const tween = gsap.to(state, {
    p: 1,
    duration,
    delay,
    ease: "power2.out",
    onUpdate: () => {
      if (tick++ % 3 === 0) {
        noise = Array.from(prefix + suffix, () => randomGlyph()).join("");
      }
      const n = String(Math.round(value * state.p)).padStart(digits, "0");
      const settled = state.p > 0.75;
      const pre = settled ? prefix : noise.slice(0, prefix.length);
      const suf = settled ? suffix : noise.slice(prefix.length);
      setText(el, pre + n + suf);
    },
    onComplete: () => {
      setText(el, prefix + value + suffix);
      running.delete(el);
    },
  });
  running.set(el, tween);
  return tween;
}
