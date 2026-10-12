"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import LiquidText from "@/components/LiquidText";
import Magnetic from "@/components/Magnetic";
import ProjectCard from "@/components/ProjectCard";
import { projects } from "@/data/portfolio";
import { useAppStore } from "@/hooks/useAppStore";
import { gsap, MQ, ScrollTrigger } from "@/lib/gsap";
import { revealProjectCards } from "@/lib/reveal";
import { appStore } from "@/lib/store";
import { navigate } from "@/lib/transition";

const COUNT = `(${String(projects.items.length).padStart(2, "0")})`;

/** /projects: every project, one large card each, in a plain vertical scroll. */
export default function AllProjects() {
  const root = useRef<HTMLElement>(null);
  const covered = useAppStore((s) => s.covered);

  useEffect(() => {
    // Arriving here directly there is no loader to wait for.
    appStore.set({ ready: true });

    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia(el);
    mm.add(MQ.motion, () => {
      revealProjectCards();
      gsap.from("[data-all-in]", {
        autoAlpha: 0,
        y: 24,
        duration: 1,
        ease: "expo.out",
        stagger: 0.1,
        delay: 0.5,
      });
    });
    ScrollTrigger.refresh();
    return () => mm.revert();
  }, []);

  const back = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate({ href: "/", kind: "collapse", section: "projects" });
  };

  return (
    <main id="all-projects" ref={root} className="all-projects">
      <Magnetic
        href="/"
        onClick={back}
        className="back-btn liquid-glass liquid-glass--refract"
      >
        ← BACK<span className="sr-only"> to the home page</span>
      </Magnetic>

      <header className="shell all-head">
        <p className="eyebrow" data-all-in>
          {projects.eyebrow}
        </p>
        <h1 className="all-title display" aria-label={`All projects ${COUNT}`}>
          {/* Decodes once the page transition has uncovered it. */}
          <LiquidText text={projects.allTitle} decorative scramble="enter" play={!covered} />
          <span className="all-count cursive" aria-hidden="true" data-all-in>
            {COUNT}
          </span>
        </h1>
      </header>

      <div className="shell projects-list all-list">
        {projects.items.map((project, i) => (
          <ProjectCard key={project.slug} project={project} index={i} heading="h2" />
        ))}
      </div>
    </main>
  );
}
