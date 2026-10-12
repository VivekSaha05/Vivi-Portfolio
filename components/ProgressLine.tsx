"use client";

import { useEffect, useRef } from "react";
import { ScrollTrigger } from "@/lib/gsap";

/**
 * Standalone scroll-progress line. Desktop: a 1px vertical track on the left
 * edge whose violet fill grows with the page, with a dot riding its tip.
 * Under 768px it becomes a 2px bar across the very top.
 * ScrollTrigger reports progress, so it follows Lenis and native scroll alike.
 */
export default function ProgressLine() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const trigger = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => el.style.setProperty("--p", self.progress.toFixed(4)),
    });
    return () => trigger.kill();
  }, []);

  return (
    <div ref={root} className="progress" aria-hidden="true">
      <span className="progress-fill" />
      <span className="progress-dot" />
    </div>
  );
}
