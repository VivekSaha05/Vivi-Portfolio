import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.defaults({ ease: "power3.out", duration: 0.8 });
  ScrollTrigger.config({ ignoreMobileResize: true });
}

/** Media conditions shared by every gsap.matchMedia() in the project. */
export const MQ = {
  /** Mouse-driven desktop with motion allowed: cursor, magnets, drag, glass, 3D extras. */
  full: "(hover: hover) and (pointer: fine) and (min-width: 768px) and (prefers-reduced-motion: no-preference)",
  /** Pinned choreography (stacked cards, horizontal Work, flip). Phones included. */
  pin: "(min-width: 360px) and (prefers-reduced-motion: no-preference)",
  /** Very narrow screens or reduced motion: no pins, Work becomes stacked cards. */
  stacked: "(max-width: 359px), (prefers-reduced-motion: reduce)",
  motion: "(prefers-reduced-motion: no-preference)",
  reduced: "(prefers-reduced-motion: reduce)",
  fine: "(hover: hover) and (pointer: fine)",
  touch: "(pointer: coarse)",
} as const;

export { gsap, ScrollTrigger, SplitText };
