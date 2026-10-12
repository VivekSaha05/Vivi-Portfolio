import type Lenis from "lenis";
import type { SectionId } from "@/data/portfolio";
import { ScrollTrigger } from "@/lib/gsap";
import { appStore } from "@/lib/store";

let lenis: Lenis | null = null;

export const setLenis = (instance: Lenis | null) => {
  lenis = instance;
};

export const getLenis = () => lenis;

/**
 * Sections that are pinned or flipped can't be reached with a plain anchor:
 * they register the scroll position where they are "arrived at" here.
 */
const overrides = new Map<SectionId, () => number>();

export function setSectionTarget(id: SectionId, resolve: (() => number) | null) {
  if (resolve) overrides.set(id, resolve);
  else overrides.delete(id);
}

export function getSectionTarget(id: SectionId) {
  const override = overrides.get(id);
  if (override) return override();
  const el = document.getElementById(id);
  if (!el) return 0;
  return el.getBoundingClientRect().top + window.scrollY;
}

export function scrollToSection(id: SectionId) {
  scrollToY(id === "home" ? 0 : getSectionTarget(id) + 1);
}

export function scrollToY(y: number) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (lenis && !reduced) {
    lenis.scrollTo(y, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
  } else {
    window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
  }
}

/** Freezes page scroll (menu drawer, page transitions) and releases it again. */
export function lockScroll(locked: boolean) {
  document.documentElement.classList.toggle("is-locked", locked);
  if (locked) lenis?.stop();
  else if (appStore.get().ready) lenis?.start();
}

/** Moves the page instantly, without the smooth-scroll glide. */
export function jumpTo(y: number) {
  if (lenis) {
    // After a route change Lenis still holds the old page height, and would
    // clamp the jump to it.
    lenis.resize();
    lenis.scrollTo(y, { immediate: true, force: true });
  } else {
    window.scrollTo(0, y);
  }
  ScrollTrigger.update();
}
