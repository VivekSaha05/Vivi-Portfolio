"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { useAppStore } from "@/hooks/useAppStore";
import { useIsomorphicLayoutEffect } from "@/hooks/useIsomorphicLayoutEffect";
import { useMediaQuery, useReducedMotion } from "@/hooks/useMediaQuery";
import { gsap, MQ, ScrollTrigger } from "@/lib/gsap";
import { startPointer } from "@/lib/pointer";
import { getLenis, setLenis } from "@/lib/scroll";
import { appStore } from "@/lib/store";
import { readTheme } from "@/lib/theme";

/**
 * Owns the scroll pipeline.
 *  - Mouse/trackpad: Lenis, driven by GSAP's ticker and feeding ScrollTrigger,
 *    so smooth scroll and scrubbed animation share one clock.
 *  - Touch: no Lenis. ScrollTrigger.normalizeScroll() takes the scroll onto
 *    the JS thread instead, which keeps pinned sections from jumping when the
 *    mobile address bar shows and hides.
 *  - Reduced motion: plain native scrolling.
 */
export default function SmoothScroll() {
  const ready = useAppStore((s) => s.ready);
  const reduced = useReducedMotion();
  const touch = useMediaQuery(MQ.touch);

  // The inline <head> script already set data-theme; mirror it into the store
  // (and re-apply it after React's dev-only remount clears the attribute).
  useIsomorphicLayoutEffect(() => {
    const theme = readTheme();
    document.documentElement.setAttribute("data-theme", theme);
    appStore.set({ theme });
  }, []);

  useEffect(() => {
    // The page always opens at the top (loader → hero handoff on the home page).
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    startPointer();

    // Pin distances depend on text metrics, so measure again once fonts are in.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, []);

  useEffect(() => {
    if (reduced) return;

    if (touch) {
      ScrollTrigger.normalizeScroll(true);
      return () => {
        ScrollTrigger.normalizeScroll(false);
      };
    }

    const lenis = new Lenis({ lerp: 0.08, autoRaf: false });
    setLenis(lenis);
    lenis.on("scroll", ScrollTrigger.update);
    if (!appStore.get().ready) lenis.stop();

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      setLenis(null);
    };
  }, [reduced, touch]);

  useEffect(() => {
    document.documentElement.classList.toggle("is-loading", !ready);
    if (!ready) return;
    getLenis()?.start();
    ScrollTrigger.refresh();
  }, [ready]);

  return null;
}
