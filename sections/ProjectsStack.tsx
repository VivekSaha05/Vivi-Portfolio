"use client";

import { useEffect, useRef } from "react";
import { gsap, MQ } from "@/lib/gsap";
import { setSectionTarget } from "@/lib/scroll";
import Projects from "@/sections/Projects";
import Stack from "@/sections/Stack";

/**
 * Projects → Stack, as a horizontal handoff that runs the opposite way to the
 * Work section: Work travels right-to-left, this one slides left-to-right.
 *
 * Stack is pulled up by one viewport (CSS) so its first screen shares the same
 * scroll position as the last screen of Projects, and starts parked off the
 * left edge. When that position is reached the pair is pinned, and scrolling
 * slides Stack in from the left while Projects leaves to the right, so the two
 * read as one track laid out [ STACK | PROJECTS ]. Then the pin releases and
 * the rest of Stack scrolls vertically as usual.
 *
 * With reduced motion (or under 360px) there is no pin and no overlap: Stack
 * simply follows Projects and fades in.
 */
export default function ProjectsStack() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia(el);

    mm.add(MQ.pin, () => {
      const timeline = gsap.timeline({
        defaults: { ease: "none", duration: 1 },
        scrollTrigger: {
          trigger: ".stack",
          start: "top top",
          end: "+=125%",
          pin: el,
          anticipatePin: 1,
          scrub: 1,
          invalidateOnRefresh: true,
          refreshPriority: 10,
        },
      });

      timeline
        .fromTo(".stack", { xPercent: -100 }, { xPercent: 0 }, 0)
        .fromTo(".projects-inner", { xPercent: 0 }, { xPercent: 100 }, 0)
        // Depth: the cards lag (0.8× the track), the Stack heading runs ahead.
        .fromTo(
          ".projects-list, .projects-more",
          { x: 0 },
          { x: () => -window.innerWidth * 0.2 },
          0,
        )
        .fromTo(".stack .section-head", { x: () => -window.innerWidth * 0.14 }, { x: 0 }, 0)
        // The line is inside Stack; countering Stack's travel holds it still on
        // screen, so it simply draws across while the two sections trade places.
        .fromTo(".duo-line", { xPercent: 100, scaleX: 0 }, { xPercent: 0, scaleX: 1 }, 0)
        // Its job is done once Stack has landed.
        .to(".duo-line", { autoAlpha: 0, duration: 0.1 }, 0.9);

      setSectionTarget("stack", () => timeline.scrollTrigger?.end ?? 0);
      return () => setSectionTarget("stack", null);
    });

    mm.add(MQ.stacked, () => {
      gsap.fromTo(
        ".stack",
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          ease: "none",
          scrollTrigger: { trigger: ".stack", start: "top 85%", end: "top 45%", scrub: true },
        },
      );
    });

    return () => mm.revert();
  }, []);

  return (
    <div ref={root} className="duo">
      <Projects />
      <Stack />
    </div>
  );
}
