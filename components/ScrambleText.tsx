"use client";

import { useEffect, useRef } from "react";
import { scramble } from "@/lib/scramble";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  className?: string;
  trigger?: "enter" | "hover" | "both";
  delay?: number;
  duration?: number;
};

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Plain text that decodes from glyph noise when it enters view and/or on hover. */
export default function ScrambleText({
  text,
  className,
  trigger = "enter",
  delay = 0,
  duration = 0.8,
}: Props) {
  const root = useRef<HTMLSpanElement>(null);
  const visual = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (trigger === "hover" || prefersReducedMotion()) return;
    const el = root.current;
    const target = visual.current;
    if (!el || !target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        scramble(target, text, { duration, delay });
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [trigger, delay, duration, text]);

  const onHover =
    trigger === "enter"
      ? undefined
      : (e: React.PointerEvent) => {
          if (e.pointerType !== "mouse" || !visual.current) return;
          if (prefersReducedMotion()) return;
          scramble(visual.current, text, { duration: Math.min(duration, 0.6) });
        };

  return (
    <span ref={root} className={cn("inline-block", className)} onPointerEnter={onHover}>
      <span className="sr-only">{text}</span>
      <span ref={visual} aria-hidden="true">
        {text}
      </span>
    </span>
  );
}
