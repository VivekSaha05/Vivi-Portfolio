"use client";

import { useEffect, useRef } from "react";
import { useFinePointer, useReducedMotion } from "@/hooks/useMediaQuery";
import { gsap } from "@/lib/gsap";

const REST = { scale: 26, freq: 0.006 };
const HOVER = { scale: 46, freq: 0.0085 };

/**
 * Shared SVG filters:
 *  - #lg-refract  refraction for liquid-glass surfaces (via backdrop-filter)
 *  - #liquid-edge rippling boundary for the liquid text fill
 *  - #ocean       slow swell on the closing quote
 *  - #shimmer     faster water shimmer while the quote is hovered
 *  - #ripple      displacement for the portrait fallback
 * Also tracks the cursor over glass so its highlight and refraction follow it.
 */
export default function GlassFilters() {
  const turbulence = useRef<SVGFETurbulenceElement>(null);
  const displacement = useRef<SVGFEDisplacementMapElement>(null);
  const fine = useFinePointer();
  const reduced = useReducedMotion();

  useEffect(() => {
    // Only Chromium applies SVG filters inside backdrop-filter. Elsewhere the
    // glass keeps its blur + highlight and simply skips the refraction.
    const isChromium =
      "chrome" in window || /Chrom(e|ium)\//.test(navigator.userAgent);
    document.documentElement.classList.toggle("refract", isChromium);
  }, []);

  useEffect(() => {
    if (!fine || reduced) return;
    const state = { ...REST };
    let hovered: HTMLElement | null = null;

    const write = () => {
      displacement.current?.setAttribute("scale", state.scale.toFixed(2));
      turbulence.current?.setAttribute(
        "baseFrequency",
        `${state.freq.toFixed(5)} ${(state.freq * 2).toFixed(5)}`,
      );
    };

    const onMove = (e: PointerEvent) => {
      const glass =
        (e.target as Element | null)?.closest?.<HTMLElement>(".liquid-glass") ??
        null;
      if (glass) {
        const rect = glass.getBoundingClientRect();
        glass.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        glass.style.setProperty("--my", `${e.clientY - rect.top}px`);
      }
      if (glass === hovered) return;
      hovered?.style.setProperty("--glow", "0");
      hovered = glass;
      hovered?.style.setProperty("--glow", "1");
      // Swell toward the cursor on enter, wobble back to rest on leave.
      gsap.to(state, {
        ...(hovered ? HOVER : REST),
        duration: hovered ? 0.7 : 1.4,
        ease: hovered ? "power2.out" : "elastic.out(1, 0.35)",
        overwrite: true,
        onUpdate: write,
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      gsap.killTweensOf(state);
    };
  }, [fine, reduced]);

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute", pointerEvents: "none" }}
    >
      <defs>
        <filter
          id="lg-refract"
          x="0"
          y="0"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            ref={turbulence}
            type="fractalNoise"
            baseFrequency={`${REST.freq} ${REST.freq * 2}`}
            numOctaves="2"
            seed="11"
            result="noise"
          />
          <feDisplacementMap
            ref={displacement}
            in="SourceGraphic"
            in2="noise"
            scale={REST.scale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        <filter
          id="liquid-edge"
          x="-10%"
          y="-20%"
          width="120%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.011 0.017"
            numOctaves="2"
            seed="4"
            result="noise"
          >
            {!reduced && (
              <animate
                attributeName="baseFrequency"
                dur="5s"
                values="0.011 0.017;0.017 0.011;0.011 0.017"
                repeatCount="indefinite"
              />
            )}
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="9"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        <filter
          id="ocean"
          x="-5%"
          y="-30%"
          width="110%"
          height="160%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.004 0.022"
            numOctaves="1"
            seed="2"
            result="swell"
          >
            {!reduced && (
              <animate
                attributeName="baseFrequency"
                dur="9s"
                values="0.004 0.022;0.007 0.03;0.004 0.022"
                repeatCount="indefinite"
              />
            )}
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="swell"
            scale="10"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        <filter
          id="shimmer"
          x="-5%"
          y="-40%"
          width="110%"
          height="180%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.08"
            numOctaves="2"
            seed="5"
            result="water"
          >
            {!reduced && (
              <animate
                attributeName="baseFrequency"
                dur="3.5s"
                values="0.012 0.08;0.02 0.11;0.012 0.08"
                repeatCount="indefinite"
              />
            )}
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="water"
            scale="6"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        <filter id="ripple" colorInterpolationFilters="sRGB">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.02"
            numOctaves="2"
            seed="8"
            result="noise"
          >
            {!reduced && (
              <animate
                attributeName="baseFrequency"
                dur="6s"
                values="0.012 0.02;0.02 0.012;0.012 0.02"
                repeatCount="indefinite"
              />
            )}
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="22"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
