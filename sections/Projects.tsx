"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import LiquidText from "@/components/LiquidText";
import Magnetic from "@/components/Magnetic";
import ProjectCard from "@/components/ProjectCard";
import { projects } from "@/data/portfolio";
import { gsap, MQ } from "@/lib/gsap";
import { revealProjectCards } from "@/lib/reveal";
import { navigate, originOf } from "@/lib/transition";

const FEATURED = projects.items.filter((project) => project.featured);

export default function Projects() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia(el);

    mm.add(MQ.motion, () => revealProjectCards());

    return () => mm.revert();
  }, []);

  const viewAll = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate({ href: "/projects", kind: "iris", origin: originOf(e.currentTarget) });
  };

  return (
    <section id="projects" ref={root} className="projects" aria-labelledby="projects-title">
      <div className="projects-inner">
        <div className="shell projects-list">
          {FEATURED.map((project, i) => (
            <ProjectCard key={project.slug} project={project} index={i} />
          ))}
        </div>

        <div className="shell projects-more">
          <Magnetic href="/projects" className="btn-xl display" onClick={viewAll}>
            <LiquidText text={projects.viewAll} />
          </Magnetic>
        </div>
      </div>
    </section>
  );
}
