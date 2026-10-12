"use client";

import { useEffect, useRef } from "react";
import { MoonIcon, SunIcon } from "@/components/Icons";
import { useAppStore } from "@/hooks/useAppStore";
import { gsap, MQ } from "@/lib/gsap";
import { setTheme } from "@/lib/theme";

/** How far the knob travels inside the 22×40 track. */
const TRAVEL = 18;

/**
 * Dark/light switch: a small vertical track with a sliding knob (sun at the
 * top for light, moon at the bottom for dark). The knob springs across, the
 * track tint moves between violet and taupe, and the theme itself is revealed
 * through a circle growing from the switch. It is a native button with
 * role="switch", so Space and Enter work and it takes the normal focus ring.
 */
export default function ThemeToggle() {
  const theme = useAppStore((s) => s.theme);
  const light = theme === "light";
  const knob = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  useEffect(() => {
    const el = knob.current;
    if (!el) return;
    const y = light ? 0 : TRAVEL;
    if (first.current || window.matchMedia(MQ.reduced).matches) {
      first.current = false;
      gsap.set(el, { y });
      return;
    }
    gsap.to(el, { y, duration: 0.6, ease: "back.out(1.7)", overwrite: true });
  }, [light]);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={light}
      aria-label="Light theme"
      className="theme-switch"
      data-on={light}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTheme(light ? "dark" : "light", {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }}
    >
      <span className="theme-switch-ends" aria-hidden="true">
        <SunIcon width={9} height={9} />
        <MoonIcon width={9} height={9} />
      </span>
      <span ref={knob} className="theme-switch-knob" aria-hidden="true">
        {light ? <SunIcon width={11} height={11} /> : <MoonIcon width={11} height={11} />}
      </span>
    </button>
  );
}
