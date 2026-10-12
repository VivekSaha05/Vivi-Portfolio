"use client";

import { useEffect, useRef } from "react";
import { useFinePointer } from "@/hooks/useMediaQuery";
import { gsap } from "@/lib/gsap";

type CursorState = "default" | "link" | "view" | "drag";

const LABELS: Record<CursorState, string> = {
  default: "",
  link: "",
  view: "VIEW →",
  drag: "DRAG ⟷",
};

const INTERACTIVE = "[data-cursor], a, button, [role='button'], [role='switch'], label";

/**
 * Dot + lagging ring. The ring reads its state from whatever is under it:
 * links/buttons → enlarged, difference-blended; [data-cursor="view"|"drag"]
 * → a labelled pill. Not rendered on touch devices.
 */
export default function Cursor() {
  const fine = useFinePointer();
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const dotEl = dot.current;
    const ringEl = ring.current;
    const labelEl = label.current;
    if (!fine || !dotEl || !ringEl || !labelEl) return;

    const root = document.documentElement;
    root.classList.add("has-cursor");
    gsap.set([dotEl, ringEl], { autoAlpha: 0 });

    const dotX = gsap.quickTo(dotEl, "x", { duration: 0.12, ease: "power3" });
    const dotY = gsap.quickTo(dotEl, "y", { duration: 0.12, ease: "power3" });
    const ringX = gsap.quickTo(ringEl, "x", { duration: 0.55, ease: "power3" });
    const ringY = gsap.quickTo(ringEl, "y", { duration: 0.55, ease: "power3" });

    let shown = false;
    let state: CursorState = "default";

    const setState = (next: CursorState) => {
      if (next === state) return;
      state = next;
      ringEl.dataset.state = next;
      labelEl.textContent = LABELS[next];
      gsap.to(ringEl, { scale: next === "link" ? 1.7 : 1, duration: 0.45 });
      gsap.to(dotEl, { scale: next === "default" ? 1 : 0, duration: 0.3 });
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (!shown) {
        shown = true;
        gsap.set([dotEl, ringEl], { x: e.clientX, y: e.clientY });
        gsap.to([dotEl, ringEl], { autoAlpha: 1, duration: 0.4 });
      }
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
    };

    const onOver = (e: PointerEvent) => {
      const hit = (e.target as Element | null)?.closest?.<HTMLElement>(INTERACTIVE);
      const custom = hit?.dataset.cursor;
      if (custom === "view" || custom === "drag") setState(custom);
      else setState(hit ? "link" : "default");
    };

    const onDown = () => gsap.to(ringEl, { scale: "*=0.85", duration: 0.2 });
    const onUp = () =>
      gsap.to(ringEl, { scale: state === "link" ? 1.7 : 1, duration: 0.4 });
    const onLeave = () => {
      shown = false;
      gsap.to([dotEl, ringEl], { autoAlpha: 0, duration: 0.3 });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    root.addEventListener("mouseleave", onLeave);

    return () => {
      root.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      root.removeEventListener("mouseleave", onLeave);
      gsap.killTweensOf([dotEl, ringEl]);
    };
  }, [fine]);

  if (!fine) return null;

  return (
    <div aria-hidden="true">
      <div ref={ring} className="cursor-ring" data-state="default">
        <span ref={label} className="cursor-label" />
      </div>
      <div ref={dot} className="cursor-dot" />
    </div>
  );
}
