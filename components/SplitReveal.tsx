"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, MQ, SplitText } from "@/lib/gsap";

type Props = {
  children: ReactNode;
  as?: "p" | "h3" | "div";
  className?: string;
  delay?: number;
};

/** Splits copy into lines and slides each one up from behind a mask on enter. */
export default function SplitReveal({
  children,
  as: Tag = "p",
  className,
  delay = 0,
}: Props) {
  const ref = useRef<HTMLParagraphElement & HTMLHeadingElement & HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add(MQ.motion, () => {
      // autoSplit re-splits when fonts load or the width changes; returning the
      // tween from onSplit lets SplitText carry its progress across re-splits.
      SplitText.create(el, {
        type: "lines",
        mask: "lines",
        autoSplit: true,
        // The lines stay readable as plain text, so no aria-label is needed
        // (and one is not allowed on a paragraph).
        aria: "none",
        onSplit: (self: SplitText) =>
          gsap.from(self.lines, {
            yPercent: 110,
            duration: 1.1,
            ease: "expo.out",
            stagger: 0.08,
            delay,
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          }),
      });
    });
    return () => mm.revert();
  }, [delay]);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
