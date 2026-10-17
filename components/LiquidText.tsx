"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { gsap } from "@/lib/gsap";
import { scramble as runScramble } from "@/lib/scramble";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  className?: string;
  /** When the glyph decode plays. "enter" = first time it scrolls into view. */
  scramble?: "none" | "enter" | "hover" | "both";
  /** Drive the enter decode manually (e.g. from the loader) instead of on scroll. */
  play?: boolean;
  delay?: number;
  /** Hide the text from assistive tech when a parent already labels it. */
  decorative?: boolean;
  /** Told whenever the hover state flips (the marquee uses it to pause a row). */
  onHoverChange?: (hovered: boolean) => void;
  /**
   * "outline" (default): stroked text that floods with ink on hover.
   * "solid": solid ink at rest that floods violet on hover (the hero name).
   * "outline-violet": stroked text that floods violet: the hero name's wash
   *   over an outline at rest.
   */
  variant?: "outline" | "solid" | "outline-violet";
};

const EDGE_FILTER = "url(#liquid-edge)";
const FLOOD = 0.9;
const DRAIN = 0.65;

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Display text that floods with colour from wherever the cursor enters, and
 * stays flooded for as long as the cursor is on it. Outline → ink by default;
 * the "solid" and "outline-violet" variants run the same wash in violet.
 *
 * One `hovered` flag is the whole state machine:
 *   enter → flood from the entry point, keep the rippling edge filter on
 *   leave → drain to the outline, then switch the filter off
 * Every transition kills the tween before it, so rapid in/out never stacks.
 * Nothing is timed: the fill only ever ends because the pointer left.
 */
export default function LiquidText({
  text,
  className,
  scramble = "none",
  play,
  delay = 0,
  decorative = false,
  onHoverChange,
  variant = "outline",
}: Props) {
  const root = useRef<HTMLSpanElement>(null);
  const outline = useRef<HTMLSpanElement>(null);
  const wrap = useRef<HTMLSpanElement>(null);
  const fill = useRef<HTMLSpanElement>(null);

  const hovered = useRef(false);
  const enteredAt = useRef(0);
  const unwatch = useRef<(() => void) | null>(null);
  const notify = useRef(onHoverChange);

  useEffect(() => {
    notify.current = onHoverChange;
  }, [onHoverChange]);

  // Leaving the page (or a route change) must not strand a listener or a tween.
  useEffect(() => {
    const layer = fill.current;
    return () => {
      unwatch.current?.();
      if (layer) gsap.killTweensOf(layer);
      if (hovered.current) notify.current?.(false);
    };
  }, []);

  const onEnterScramble = scramble === "enter" || scramble === "both";
  const controlled = play !== undefined;

  useEffect(() => {
    if (!onEnterScramble || prefersReducedMotion()) return;
    const targets = [outline.current, fill.current].filter(
      (el): el is HTMLSpanElement => el !== null,
    );
    if (controlled) {
      if (play) runScramble(targets, text, { duration: 0.9, delay });
      return;
    }
    const el = root.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        runScramble(targets, text, { duration: 0.85, delay });
        observer.disconnect();
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onEnterScramble, controlled, play, delay, text]);

  /** Pointer position inside the element, and the radius that covers it from there. */
  const point = (clientX: number, clientY: number) => {
    const rect = root.current?.getBoundingClientRect() ?? new DOMRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const reach =
      Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y)) + 32;
    return { x, y, reach };
  };

  const leave = (clientX: number, clientY: number) => {
    if (!hovered.current) return;
    hovered.current = false;
    unwatch.current?.();
    notify.current?.(false);

    const layer = fill.current;
    const shell = wrap.current;
    if (!layer || !shell) return;
    gsap.killTweensOf(layer);

    if (prefersReducedMotion()) {
      gsap.to(layer, { opacity: 0, duration: 0.25 });
      return;
    }

    // Once fully flooded, drain toward the point the cursor left from.
    if (performance.now() - enteredAt.current > FLOOD * 1000) {
      const { x, y, reach } = point(clientX, clientY);
      gsap.set(layer, { "--x": `${x}px`, "--y": `${y}px`, "--r": `${reach}px` });
    }
    gsap.to(layer, {
      "--r": "0px",
      duration: DRAIN,
      ease: "power2.inOut",
      onComplete: () => {
        // Only tidy up if the cursor has not come back in the meantime.
        if (!hovered.current) shell.style.filter = "none";
      },
    });
  };

  const enter = (e: PointerEvent<HTMLSpanElement>) => {
    if (e.pointerType !== "mouse" || hovered.current) return;
    const layer = fill.current;
    const shell = wrap.current;
    if (!layer || !shell) return;

    hovered.current = true;
    enteredAt.current = performance.now();
    notify.current?.(true);

    // pointerleave can be skipped when the cursor jumps straight onto a
    // neighbour, so also watch where the pointer actually is.
    unwatch.current?.();
    const watch = (event: globalThis.PointerEvent) => {
      if (root.current?.contains(event.target as Node)) return;
      leave(event.clientX, event.clientY);
    };
    window.addEventListener("pointermove", watch, { passive: true });
    unwatch.current = () => {
      window.removeEventListener("pointermove", watch);
      unwatch.current = null;
    };

    gsap.killTweensOf(layer);

    if (prefersReducedMotion()) {
      gsap.set(layer, { "--r": "200vmax" });
      gsap.to(layer, { opacity: 1, duration: 0.25 });
      return;
    }

    const { x, y, reach } = point(e.clientX, e.clientY);
    // The filter stays on for the whole hover: its turbulence keeps animating,
    // so the filled edge keeps moving instead of freezing.
    shell.style.filter = EDGE_FILTER;
    gsap.set(layer, { "--x": `${x}px`, "--y": `${y}px`, opacity: 1 });
    gsap.to(layer, { "--r": `${reach}px`, duration: FLOOD, ease: "power2.out" });

    // One decode per enter; scramble() cancels any decode still running.
    if ((scramble === "hover" || scramble === "both") && outline.current) {
      runScramble([outline.current, layer], text, { duration: 0.6 });
    }
  };

  return (
    <span
      ref={root}
      className={cn(
        "lt",
        variant === "solid" && "lt--solid",
        variant !== "outline" && "lt--violet",
        className,
      )}
      onPointerEnter={enter}
      onPointerLeave={(e) => e.pointerType === "mouse" && leave(e.clientX, e.clientY)}
    >
      {!decorative && <span className="sr-only">{text}</span>}
      <span ref={outline} className="lt-outline" aria-hidden="true">
        {text}
      </span>
      <span ref={wrap} className="lt-wrap" aria-hidden="true">
        <span ref={fill} className="lt-fill">
          {text}
        </span>
      </span>
    </span>
  );
}
