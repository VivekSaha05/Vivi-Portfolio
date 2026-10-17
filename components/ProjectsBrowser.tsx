"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { useSearchParams } from "next/navigation";
import Magnetic from "@/components/Magnetic";
import ProjectCard from "@/components/ProjectCard";
import ScrambleText from "@/components/ScrambleText";
import { projects, type Project, type ProjectCategory } from "@/data/portfolio";
import { gsap, MQ, ScrollTrigger } from "@/lib/gsap";
import { enterProjectCards, exitProjectCards, revealProjectCards } from "@/lib/reveal";
import { getLenis } from "@/lib/scroll";
import { cn } from "@/lib/utils";

const CATEGORIES = projects.categories;
export const DEFAULT_CATEGORY: ProjectCategory = CATEGORIES[0].id;

const PANEL_ID = "projects-panel";

/** Typed as Project[] so unassigned (`{{…}}`) categories still compare cleanly. */
const ALL: Project[] = projects.items;

const itemsIn = (category: ProjectCategory) =>
  ALL.filter((project) => project.category === category);

const pad = (n: number) => String(n).padStart(2, "0");

const isCategory = (value: string | null): value is ProjectCategory =>
  CATEGORIES.some((c) => c.id === value);

const prefersReducedMotion = () => window.matchMedia(MQ.reduced).matches;

/**
 * The /projects list with its PROFESSIONAL / PERSONAL switch.
 *
 * `category` is what is selected (it drives the toggle immediately); `shown`
 * is what the list is displaying. On a switch the current cards wipe out,
 * then `shown` catches up and the new cards rise in. Because the list follows
 * `category` (not the click), browser back/forward animates the same way.
 */
export function ProjectsBrowser({
  category,
  onSelect,
}: {
  category: ProjectCategory;
  onSelect?: (category: ProjectCategory) => void;
}) {
  const [shown, setShown] = useState(category);
  const tablist = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const firstShow = useRef(true);
  const placed = useRef(false);

  // The violet pill slides under the selected tab with a springy settle.
  useLayoutEffect(() => {
    const bar = tablist.current;
    const pill = indicator.current;
    if (!bar || !pill) return;
    const place = (animate: boolean) => {
      const tab = bar.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!tab) return;
      const to = { x: tab.offsetLeft, width: tab.offsetWidth };
      if (animate && !prefersReducedMotion()) {
        gsap.to(pill, { ...to, duration: 0.75, ease: "elastic.out(1, 0.75)", overwrite: true });
      } else {
        gsap.set(pill, to);
      }
    };
    place(placed.current);
    placed.current = true;
    const onResize = () => place(false);
    window.addEventListener("resize", onResize);
    document.fonts?.ready.then(onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [category]);

  // Selection changed: wipe the current cards out, glide to the list, swap.
  useEffect(() => {
    if (category === shown) return;
    const el = list.current;
    const top = el ? el.getBoundingClientRect().top + window.scrollY - 140 : 0;
    const lenis = getLenis();
    const reduced = prefersReducedMotion();
    if (window.scrollY > top) {
      if (lenis && !reduced) lenis.scrollTo(top, { duration: 0.9 });
      else window.scrollTo({ top });
    }

    const current = el ? Array.from(el.children) : [];
    if (reduced || current.length === 0) {
      setShown(category);
      return;
    }
    const tween = exitProjectCards(current, () => setShown(category));
    return () => {
      tween.kill();
    };
  }, [category, shown]);

  // New cards in: the regular scroll reveal the first time, a staggered rise
  // after a switch.
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    const mm = gsap.matchMedia(el);
    const first = firstShow.current;
    firstShow.current = false;
    mm.add(MQ.motion, () => {
      if (first) revealProjectCards();
      else enterProjectCards();
    });
    if (!first) ScrollTrigger.refresh();
    return () => mm.revert();
  }, [shown]);

  const select = (next: ProjectCategory) => {
    if (next !== category) onSelect?.(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = CATEGORIES.findIndex((c) => c.id === category);
    let next = index;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % CATEGORIES.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (index - 1 + CATEGORIES.length) % CATEGORIES.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = CATEGORIES.length - 1;
    else return;
    e.preventDefault();
    select(CATEGORIES[next].id);
    tablist.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
  };

  const items = itemsIn(shown);

  return (
    <>
      <div className="shell all-toggle-wrap" data-all-in>
        <div
          ref={tablist}
          className="all-toggle liquid-glass liquid-glass--refract"
          role="tablist"
          aria-label="Project type"
          onKeyDown={onKeyDown}
        >
          <span ref={indicator} className="all-toggle-pill" aria-hidden="true" />
          {CATEGORIES.map((c) => {
            const selected = c.id === category;
            return (
              <Magnetic
                key={c.id}
                soft
                role="tab"
                id={`tab-${c.id}`}
                aria-selected={selected}
                aria-controls={PANEL_ID}
                tabIndex={selected ? 0 : -1}
                className={cn("all-toggle-tab", selected && "is-active")}
                onClick={() => select(c.id)}
              >
                {c.label} ({pad(itemsIn(c.id).length)})
              </Magnetic>
            );
          })}
        </div>
      </div>

      <div
        ref={list}
        id={PANEL_ID}
        role="tabpanel"
        aria-labelledby={`tab-${shown}`}
        className="shell projects-list all-list"
      >
        {items.length > 0 ? (
          items.map((project, i) => (
            <ProjectCard key={project.slug} project={project} index={i} heading="h2" />
          ))
        ) : (
          // Keyed by category: the previous one was wiped out with inline styles.
          <p key={shown} className="projects-empty">
            <ScrambleText text={projects.empty} />
          </p>
        )}
      </div>
    </>
  );
}

/**
 * The browser bound to `?type=`. Switching pushes a history entry with the
 * native History API (Next.js keeps useSearchParams in sync with it), so the
 * URL is shareable and back/forward step through the selections.
 */
export default function ProjectsBrowserFromUrl() {
  const params = useSearchParams();
  const type = params.get("type");
  const category = isCategory(type) ? type : DEFAULT_CATEGORY;

  return (
    <ProjectsBrowser
      category={category}
      onSelect={(next) => {
        const url = new URL(window.location.href);
        url.searchParams.set("type", next);
        window.history.pushState(null, "", url);
      }}
    />
  );
}
