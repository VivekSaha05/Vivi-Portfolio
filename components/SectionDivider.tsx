"use client";

import { useEffect, useRef } from "react";
import { gsap, MQ } from "@/lib/gsap";

/** A thin violet rule that draws itself across the screen as it scrolls in. */
export default function SectionDivider() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add(MQ.motion, () => {
      gsap.fromTo(
        el,
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top 96%", end: "top 55%", scrub: true },
        },
      );
    });
    return () => mm.revert();
  }, []);

  return <div ref={ref} className="divider" aria-hidden="true" />;
}
