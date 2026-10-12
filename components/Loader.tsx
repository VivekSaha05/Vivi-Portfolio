"use client";

import { useEffect, useRef, useState } from "react";
import { about, loader, projects, site } from "@/data/portfolio";
import { useAppStore } from "@/hooks/useAppStore";
import { gsap } from "@/lib/gsap";
import { scramble } from "@/lib/scramble";
import { appStore, loading } from "@/lib/store";

const IMAGES = [
  about.portrait.src,
  ...projects.items.map((p) => p.image),
  ...about.paragraph.flatMap((s) => (s.type === "capsule" ? [s.src] : [])),
];

/** If something never reports back, the site still opens after this long. */
const SAFETY_MS = 9000;

/**
 * Full-screen loader showing real progress: web fonts, images, the hero's 3D
 * chunk + first rendered frame, and Three.js textures (drei useProgress, bridged
 * from inside the lazy scene). It hands straight off to the hero: `ready` flips
 * as the wipe begins, so the hero intro plays underneath it.
 */
export default function Loader() {
  const progress = useAppStore((s) => s.progress);
  // Coming back from another route the site is already loaded: skip straight past.
  const [gone, setGone] = useState(() => appStore.get().ready);

  const root = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const command = useRef<HTMLSpanElement>(null);
  const success = useRef<HTMLParagraphElement>(null);
  const shown = useRef({ value: 0 });
  const typed = useRef(false);
  const leaving = useRef(false);

  // Kick off the tasks the loader itself owns.
  useEffect(() => {
    const fonts = document.fonts?.ready ?? Promise.resolve();
    fonts.then(() => loading.report("fonts", 1));

    let done = 0;
    const settle = () => loading.report("images", ++done / IMAGES.length);
    IMAGES.forEach((src) => {
      const img = new Image();
      img.onload = img.onerror = settle;
      img.src = src;
    });

    const safety = window.setTimeout(() => loading.finish(), SAFETY_MS);
    return () => window.clearTimeout(safety);
  }, []);

  // Type the build command once.
  useEffect(() => {
    const el = command.current;
    if (!el) return;
    const text = loader.command;
    const state = { n: 0 };
    const tween = gsap.to(state, {
      n: text.length,
      duration: text.length * 0.045,
      delay: 0.25,
      ease: "none",
      onUpdate: () => {
        el.textContent = text.slice(0, Math.round(state.n));
      },
      onComplete: () => {
        typed.current = true;
      },
    });
    return () => {
      tween.kill();
    };
  }, []);

  // Ease the visible counter toward real progress, then leave.
  useEffect(() => {
    const leave = () => {
      if (leaving.current || !root.current || !counter.current) return;
      leaving.current = true;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const tl = gsap.timeline({ onComplete: () => setGone(true) });
      tl.to(success.current, { autoAlpha: 1, y: 0, duration: 0.35 });
      if (reduced) {
        tl.call(() => appStore.set({ ready: true }), undefined, "+=0.2");
        tl.to(root.current, { autoAlpha: 0, duration: 0.5 });
        return;
      }
      tl.add(scramble(counter.current, site.alias, { duration: 0.6, from: "100" }), "+=0.1");
      tl.call(() => appStore.set({ ready: true }), undefined, "+=0.15");
      tl.to(inner.current, { yPercent: -18, duration: 1.1, ease: "expo.inOut" }, "<");
      tl.to(
        root.current,
        { clipPath: "inset(0% 0% 100% 0%)", duration: 1.1, ease: "expo.inOut" },
        "<",
      );
    };

    const tween = gsap.to(shown.current, {
      value: progress,
      duration: 0.7,
      ease: "power2.out",
      onUpdate: () => {
        if (counter.current && !leaving.current) {
          counter.current.textContent = String(
            Math.round(shown.current.value),
          ).padStart(3, "0");
        }
      },
      onComplete: () => {
        if (progress < 100) return;
        if (typed.current) leave();
        else gsap.delayedCall(loader.command.length * 0.045, leave);
      },
    });
    return () => {
      tween.kill();
    };
  }, [progress]);

  if (gone) return null;

  return (
    <div
      ref={root}
      className="loader"
      role="status"
      aria-live="polite"
      aria-label={`Loading ${site.name}'s portfolio`}
    >
      <div ref={inner} className="loader-inner">
        <p className="loader-mark" aria-hidden="true">
          {site.mark}
        </p>
        <div className="loader-terminal" aria-hidden="true">
          <p>
            <span ref={command} />
            <span className="caret" />
          </p>
          <p ref={success} className="loader-success">
            {loader.success}
          </p>
        </div>
        <span ref={counter} className="loader-counter" aria-hidden="true">
          000
        </span>
      </div>
    </div>
  );
}
