"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { gsap, MQ, ScrollTrigger } from "@/lib/gsap";
import { GLYPHS } from "@/lib/scramble";
import { getSectionTarget, jumpTo, lockScroll } from "@/lib/scroll";
import { appStore } from "@/lib/store";
import { setTransitionHandler, type TransitionRequest } from "@/lib/transition";

const COLS = 12;
const ROWS = 8;
const TILES = Array.from({ length: COLS * ROWS }, (_, i) => i);

const frames = (count: number) =>
  new Promise<void>((resolve) => {
    const step = () => (count-- <= 0 ? resolve() : requestAnimationFrame(step));
    step();
  });

/**
 * Persistent page-transition layer (it lives in the root layout, so it
 * survives the route change it is animating).
 *
 *  iris     — Home → /projects. A violet circle grows from the clicked control
 *             until it fills the screen, a grain-textured panel rises over it,
 *             the route swaps underneath, and the panel wipes up off the page.
 *  collapse — /projects → Home. A 12×8 grid of tiles flips shut in a diagonal
 *             wave from the back-button corner, the route swaps, and the tiles
 *             flip away again on the same wave, each flashing a glyph mid-turn.
 *
 * With reduced motion both become a plain crossfade.
 */
export default function TransitionOverlay() {
  const router = useRouter();
  const pathname = usePathname();

  const root = useRef<HTMLDivElement>(null);
  const iris = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);

  const current = useRef(pathname);
  const arrived = useRef<(() => void) | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    current.current = pathname;
    if (arrived.current) {
      arrived.current();
      arrived.current = null;
    } else if (!busy.current) {
      // Browser back/forward: no overlay, just start the page from the top.
      jumpTo(0);
      ScrollTrigger.refresh();
    }
  }, [pathname]);

  useEffect(() => {
    router.prefetch("/projects");

    const go = (href: string) =>
      new Promise<void>((resolve) => {
        if (current.current === href) return resolve();
        const timer = window.setTimeout(resolve, 5000);
        arrived.current = () => {
          window.clearTimeout(timer);
          resolve();
        };
        router.push(href, { scroll: false });
      });

    /** Lets the new page mount and measure, then puts the scroll where it belongs. */
    const land = async (section?: TransitionRequest["section"]) => {
      await frames(2);
      ScrollTrigger.refresh();
      jumpTo(section && section !== "home" ? getSectionTarget(section) + 1 : 0);
      await frames(1);
    };

    const crossfade = async (request: TransitionRequest, section?: TransitionRequest["section"]) => {
      const el = panel.current;
      if (!el) return;
      gsap.set(el, { yPercent: 0, autoAlpha: 0 });
      await gsap.to(el, { autoAlpha: 1, duration: 0.25 });
      appStore.set({ covered: true });
      await go(request.href);
      await land(section);
      appStore.set({ covered: false });
      await gsap.to(el, { autoAlpha: 0, duration: 0.3 });
    };

    const playIris = async (request: TransitionRequest) => {
      const circle = iris.current;
      const sheet = panel.current;
      if (!circle || !sheet) return;
      const x = request.origin?.x ?? window.innerWidth / 2;
      const y = request.origin?.y ?? window.innerHeight / 2;
      const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );

      gsap.set(circle, { autoAlpha: 1, clipPath: `circle(0px at ${x}px ${y}px)` });
      gsap.set(sheet, { autoAlpha: 1, yPercent: 100 });

      const cover = gsap.timeline();
      cover.to(circle, {
        clipPath: `circle(${radius}px at ${x}px ${y}px)`,
        duration: 0.6,
        ease: "expo.inOut",
      });
      cover.to(sheet, { yPercent: 0, duration: 0.5, ease: "expo.inOut" }, 0.32);
      await cover;

      appStore.set({ covered: true });
      await go(request.href);
      await land(request.section);

      gsap.set(circle, { autoAlpha: 0 });
      appStore.set({ covered: false });
      await gsap.to(sheet, { yPercent: -100, duration: 0.75, ease: "expo.inOut" });
      gsap.set(sheet, { autoAlpha: 0 });
    };

    const playCollapse = async (request: TransitionRequest) => {
      const wall = grid.current;
      if (!wall) return;
      const tiles = Array.from(wall.children) as HTMLElement[];
      const glyphs = tiles.map((tile) => tile.firstElementChild as HTMLElement);
      glyphs.forEach((glyph) => {
        glyph.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      });
      // Diagonal wave out of the top-left corner, where the back button sits.
      const wave = (amount: number) => ({ grid: [ROWS, COLS] as [number, number], from: 0, amount });

      gsap.set(wall, { autoAlpha: 1 });
      gsap.set(tiles, { rotateY: 90, autoAlpha: 1 });
      gsap.set(glyphs, { opacity: 1 });
      await gsap.to(tiles, {
        rotateY: 0,
        duration: 0.22,
        ease: "power2.out",
        stagger: wave(0.22),
      });

      appStore.set({ covered: true });
      await go(request.href);
      await land(request.section ?? "projects");
      appStore.set({ covered: false });

      gsap.set(glyphs, { opacity: 0 });
      gsap.to(glyphs, {
        keyframes: [
          { opacity: 1, duration: 0.14 },
          { opacity: 0, duration: 0.2 },
        ],
        stagger: wave(0.4),
      });
      await gsap.to(tiles, {
        rotateY: -90,
        duration: 0.38,
        ease: "power2.in",
        stagger: wave(0.4),
      });
      gsap.set(wall, { autoAlpha: 0 });
    };

    const run = async (request: TransitionRequest) => {
      if (busy.current || !root.current) return;
      busy.current = true;
      lockScroll(true);
      try {
        if (window.matchMedia(MQ.reduced).matches) {
          await crossfade(request, request.section ?? (request.href === "/" ? "projects" : undefined));
        } else if (request.kind === "iris") {
          await playIris(request);
        } else {
          await playCollapse(request);
        }
      } finally {
        appStore.set({ covered: false });
        lockScroll(false);
        busy.current = false;
      }
    };

    setTransitionHandler(run);
    return () => setTransitionHandler(null);
  }, [router]);

  return (
    <div ref={root} className="transition" aria-hidden="true">
      <div ref={iris} className="transition-iris" />
      <div ref={panel} className="transition-panel" />
      <div ref={grid} className="transition-grid">
        {TILES.map((i) => (
          <div key={i} className="transition-tile">
            <span />
          </div>
        ))}
      </div>
    </div>
  );
}
