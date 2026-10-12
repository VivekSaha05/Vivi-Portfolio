"use client";

import { useEffect, useRef } from "react";
import { contact } from "@/data/portfolio";
import { gsap, MQ } from "@/lib/gsap";
import { GLYPHS } from "@/lib/scramble";
import { clamp } from "@/lib/utils";

const ROMAJI = Array.from(`“${contact.quote.text}”`);
const KANJI = Array.from(`“${contact.quote.japanese}”`);
const DASH = 7;
const GAP = 8;

const glyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

/**
 * The closing line and its signature hover. One `on` flag drives everything,
 * and nothing is timed: it stays in its hovered state until the pointer leaves
 * (or, on touch, until it is tapped again).
 *
 *  - language flip: the romaji decodes, character by character, into Japanese
 *  - sea motion:    each character rides a travelling sine wave
 *  - treasure trail: a dashed line draws from the start of the quote to the
 *                    flag and ends in a hand-drawn ✕
 *  - the flag waves, and the attribution spreads its letter-spacing
 *
 * The characters are plain spans managed here (not by React), because their
 * count changes as one script turns into the other.
 */
export default function Quote() {
  const root = useRef<HTMLElement>(null);
  const line = useRef<HTMLSpanElement>(null);
  const trail = useRef<SVGPathElement>(null);
  const cross = useRef<SVGGElement>(null);
  const by = useRef<HTMLSpanElement>(null);
  const flag = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    const host = line.current;
    const path = trail.current;
    const mark = cross.current;
    const byline = by.current;
    const flagEl = flag.current;
    if (!el || !host || !path || !mark || !byline || !flagEl) return;

    const reduced = window.matchMedia(MQ.reduced).matches;
    /** scroll.reveal: letter reveal on scroll. flip: romaji → kanji. wave: swell height. draw: trail length. */
    const scroll = { reveal: reduced ? 1 : 0 };
    const state = { flip: 0, wave: 0, draw: 0 };
    const spans: HTMLSpanElement[] = [];
    let noise: string[] = [];
    let on = false;
    let visible = false;
    let frame = 0;
    let lastFlip = -1;
    let trailLength = 0;

    const sync = (length: number) => {
      while (spans.length < length) {
        const span = document.createElement("span");
        span.className = "quote-char";
        host.appendChild(span);
        spans.push(span);
      }
      while (spans.length > length) spans.pop()?.remove();
    };

    const write = () => {
      const p = state.flip;
      const length = Math.round(ROMAJI.length + (KANJI.length - ROMAJI.length) * p);
      sync(length);
      if (frame % 3 === 0 || noise.length !== length) {
        noise = Array.from({ length }, glyph);
      }
      // Japanese resolves from the left; whatever is still in between is noise.
      const resolved = p * (length + 2);
      for (let i = 0; i < length; i++) {
        const char =
          p <= 0 ? ROMAJI[i] : p >= 1 ? KANJI[i] : i < resolved - 2 ? KANJI[i] : noise[i];
        if (spans[i].textContent !== char) spans[i].textContent = char ?? "";
      }
      host.style.color = `color-mix(in srgb, var(--violet) ${Math.round(p * 100)}%, var(--taupe))`;
    };

    const tick = (time: number) => {
      if (!visible) return;
      frame++;
      const flipping = state.flip > 0 && state.flip < 1;
      if (state.flip !== lastFlip || flipping) {
        write();
        lastFlip = state.flip;
      }
      const count = spans.length;
      const shown = state.flip > 0 || on;
      for (let i = 0; i < count; i++) {
        const style = spans[i].style;
        style.opacity = shown
          ? "1"
          : (0.06 + 0.94 * clamp(scroll.reveal * (count + 5) - i, 0, 1)).toFixed(2);
        if (state.wave > 0.002) {
          // A swell travelling left to right: each letter lags the one before it.
          const phase = time * 2.4 - i * 0.55;
          const y = Math.sin(phase) * 0.1 * state.wave;
          const tilt = Math.cos(phase) * 3.5 * state.wave;
          style.transform = `translateY(${y.toFixed(3)}em) rotate(${tilt.toFixed(2)}deg)`;
        } else if (style.transform) {
          style.transform = "";
        }
      }
      if (on && state.draw < 1) route();
      // Dashes are laid down one by one up to the drawn length.
      if (trailLength) {
        const drawn = state.draw * trailLength;
        const dashes = Math.floor(drawn / (DASH + GAP));
        const rest = Math.min(DASH, drawn - dashes * (DASH + GAP));
        path.style.strokeDasharray =
          `${DASH} ${GAP} `.repeat(dashes) + `${rest.toFixed(1)} ${trailLength + 100}`;
      }
    };

    /** Routes the treasure trail from the start of the quote to just beside the flag. */
    const route = () => {
      const frameRect = el.getBoundingClientRect();
      const q = host.getBoundingClientRect();
      const f = flagEl.getBoundingClientRect();
      const sx = q.left - frameRect.left + 8;
      const sy = q.bottom - frameRect.top + 10;
      const ex = f.left - frameRect.left - 16;
      const ey = f.top - frameRect.top + f.height / 2;
      const w = ex - sx;
      path.setAttribute(
        "d",
        `M${sx} ${sy} C${sx + w * 0.2} ${sy + 46}, ${sx + w * 0.34} ${sy + 8}, ${sx + w * 0.5} ${ey + 58} S${ex - 30} ${ey + 62}, ${ex} ${ey + 4}`,
      );
      trailLength = path.getTotalLength();
      gsap.set(mark, { x: ex, y: ey });
    };

    const set = (next: boolean) => {
      if (next === on) return;
      on = next;
      el.classList.toggle("is-on", on);
      gsap.killTweensOf([state, mark, byline]);

      if (reduced) {
        state.flip = on ? 1 : 0;
        state.draw = on ? 1 : 0;
        route();
        gsap.set(mark, { scale: on ? 1 : 0 });
        return;
      }
      if (on) {
        route();
        gsap.to(state, { flip: 1, duration: 0.9, ease: "none" });
        gsap.to(state, { wave: 1, duration: 1.2, ease: "power2.out" });
        gsap.to(state, { draw: 1, duration: 1.3, ease: "power2.inOut" });
        gsap.to(mark, { scale: 1, duration: 0.5, ease: "back.out(3)", delay: 1.15 });
        gsap.fromTo(
          byline,
          { x: -10 },
          { x: 0, letterSpacing: "0.24em", duration: 0.8, ease: "expo.out" },
        );
      } else {
        gsap.to(state, { flip: 0, duration: 0.7, ease: "none" });
        gsap.to(state, { wave: 0, duration: 0.7, ease: "power2.inOut" });
        gsap.to(state, { draw: 0, duration: 0.5, ease: "power2.in" });
        gsap.to(mark, { scale: 0, duration: 0.2 });
        gsap.to(byline, { letterSpacing: "0.06em", duration: 0.6, ease: "power2.out" });
      }
    };

    const onEnter = (e: PointerEvent) => e.pointerType === "mouse" && set(true);
    const onLeave = (e: PointerEvent) => e.pointerType === "mouse" && set(false);
    const onTap = (e: PointerEvent) => e.pointerType !== "mouse" && set(!on);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerup", onTap);

    const ctx = gsap.context(() => {
      gsap.set(mark, { scale: 0, transformOrigin: "50% 50%" });
      if (reduced) return;
      // The line surfaces one letter at a time as it rises through the viewport.
      gsap.to(scroll, {
        reveal: 1,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top 95%", end: "top 62%", scrub: true },
      });
      gsap.from(".quote-by", {
        autoAlpha: 0,
        duration: 1,
        scrollTrigger: { trigger: el, start: "top 70%", once: true },
      });
    }, el);

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(el);
    write();
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      observer.disconnect();
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerup", onTap);
      gsap.killTweensOf([state, mark, byline]);
      ctx.revert();
      spans.forEach((span) => span.remove());
    };
  }, []);

  return (
    <figure ref={root} className="quote">
      <svg className="quote-trail" aria-hidden="true" focusable="false">
        <path ref={trail} className="quote-trail-path" />
        <g ref={cross} className="quote-trail-x">
          {/* Two uneven strokes, so the ✕ reads as drawn by hand. */}
          <path d="M-7 -6 Q0 1 7 7M6 -7 Q-1 0 -7 6" />
        </g>
      </svg>

      <blockquote className="quote-text cursive">
        <span className="sr-only" lang="ja-Latn">{`“${contact.quote.text}”`}</span>
        <span ref={line} className="quote-line" aria-hidden="true" />
      </blockquote>

      <figcaption className="quote-by">
        <span ref={by} className="quote-by-name">
          {contact.quote.attribution}
        </span>{" "}
        <span ref={flag} className="flag" role="img" aria-label="pirate flag">
          {contact.quote.flag}
        </span>
      </figcaption>
    </figure>
  );
}
