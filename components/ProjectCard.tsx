"use client";

import { useRef, type PointerEvent, type RefObject } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ArrowIcon } from "@/components/Icons";
import LiquidText from "@/components/LiquidText";
import Magnetic from "@/components/Magnetic";
import SplitReveal from "@/components/SplitReveal";
import SceneBoundary from "@/components/three/SceneBoundary";
import type { PlaneState } from "@/components/three/ProjectCanvas";
import { isSet, type Contributor, type Project } from "@/data/portfolio";
import { useInView } from "@/hooks/useInView";
import { useFullMotion } from "@/hooks/useMediaQuery";
import { useWebGL } from "@/hooks/useWebGL";

const ProjectCanvas = dynamic(() => import("@/components/three/ProjectCanvas"), {
  ssr: false,
});

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function ContributorChip({ person }: { person: Contributor }) {
  const face = (
    <>
      <span className="contributor-avatar">
        <span aria-hidden="true">{initials(person.name)}</span>
        {isSet(person.avatar) && (
          <Image
            src={person.avatar}
            alt=""
            fill
            sizes="32px"
            unoptimized
            style={{ objectFit: "cover" }}
            onError={(e) => {
              // No photo yet: fall back to the initials underneath.
              e.currentTarget.style.display = "none";
            }}
          />
        )}
      </span>
      <span className="contributor-name">{person.name}</span>
    </>
  );

  if (!isSet(person.linkedin)) return <span className="contributor">{face}</span>;

  return (
    <a
      href={person.linkedin}
      target="_blank"
      rel="noopener noreferrer"
      className="contributor"
      aria-label={`${person.name} — view LinkedIn (opens in a new tab)`}
    >
      {face}
      <span className="contributor-tip" aria-hidden="true">
        View LinkedIn ↗
      </span>
    </a>
  );
}

/**
 * One project: WebGL cover (RGB shift + wave on hover), a glass info panel
 * with stack pills, GitHub / Live buttons and optional contributors.
 * Shared by the home page and /projects.
 */
export default function ProjectCard({
  project,
  index,
  heading: Heading = "h3",
}: {
  project: Project;
  index: number;
  /** Heading level for the title: h3 under a section title, h2 directly under a page title. */
  heading?: "h2" | "h3";
}) {
  const media = useRef<HTMLElement>(null);
  const plane = useRef<PlaneState>({ hover: false, x: 0.5, y: 0.5 });
  const near = useInView(media, { rootMargin: "60% 0px", once: true });
  const full = useFullMotion();
  const webgl = useWebGL();

  const live = isSet(project.liveUrl) ? project.liveUrl : null;
  const github = isSet(project.githubUrl) ? project.githubUrl : null;
  const contributors = (project.contributors ?? []).filter((c) => isSet(c.name));
  const stack = project.stack.filter((tech) => isSet(tech));
  const cover = live ?? github;

  const track = (e: PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    plane.current.x = (e.clientX - rect.left) / rect.width;
    plane.current.y = (e.clientY - rect.top) / rect.height;
  };

  // Without any link yet, the cover is a plain frame rather than a dead link.
  const Media = cover ? "a" : "div";
  const link = cover
    ? {
        href: cover,
        target: "_blank",
        rel: "noopener noreferrer",
        "data-cursor": "view",
        "aria-label": `View ${project.title} ${live ? "live" : "on GitHub"} (opens in a new tab)`,
      }
    : null;

  return (
    <article className="project-card" data-flip={index % 2 === 1}>
      <Media
        ref={media as RefObject<HTMLAnchorElement & HTMLDivElement>}
        className="project-media"
        {...link}
        onPointerEnter={(e: PointerEvent<HTMLElement>) => {
          plane.current.hover = true;
          track(e);
        }}
        onPointerMove={track}
        onPointerLeave={() => {
          plane.current.hover = false;
        }}
      >
        <span className="project-media-inner">
          {/* Always-present image: alt text and the no-WebGL fallback. */}
          <Image
            src={project.image}
            alt={project.imageAlt}
            fill
            unoptimized
            sizes="(max-width: 767px) 100vw, 70vw"
            style={{ objectFit: "cover" }}
          />
          {full && webgl && near && (
            <SceneBoundary>
              <ProjectCanvas src={project.image} state={plane} />
            </SceneBoundary>
          )}
        </span>
      </Media>

      <div className="project-info liquid-glass liquid-glass--refract">
        <p className="eyebrow">
          {String(index + 1).padStart(2, "0")}
          {isSet(project.date) && ` · ${project.date}`}
        </p>
        <Heading className="project-name display">
          <LiquidText text={project.title} />
        </Heading>
        <SplitReveal className="project-summary">{project.description}</SplitReveal>
        {stack.length > 0 && (
          <ul className="pills" aria-label="Tech stack">
            {stack.map((tech) => (
              <li key={tech} className="pill">
                {tech}
              </li>
            ))}
          </ul>
        )}

        {contributors.length > 0 && (
          <div className="contributors">
            <span className="label">with</span>
            {contributors.map((person) => (
              <ContributorChip key={person.name} person={person} />
            ))}
          </div>
        )}

        <div className="project-actions">
          {github && (
            <Magnetic
              href={github}
              className="btn"
              aria-label={`GitHub — ${project.title} (opens in a new tab)`}
            >
              GitHub <ArrowIcon />
            </Magnetic>
          )}
          {live && (
            <Magnetic
              href={live}
              className="btn btn--solid"
              aria-label={`Live — ${project.title} (opens in a new tab)`}
            >
              Live ↗
            </Magnetic>
          )}
        </div>
      </div>
    </article>
  );
}
