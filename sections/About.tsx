"use client";

import { Fragment, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import LiquidText from "@/components/LiquidText";
import ScrambleText from "@/components/ScrambleText";
import SceneBoundary from "@/components/three/SceneBoundary";
import { about } from "@/data/portfolio";
import { useInView } from "@/hooks/useInView";
import { useReducedMotion } from "@/hooks/useMediaQuery";
import { useWebGL } from "@/hooks/useWebGL";
import { gsap, MQ, ScrollTrigger } from "@/lib/gsap";
import { scrambleCount } from "@/lib/scramble";
import { motion } from "@/lib/store";

const ParticlePortrait = dynamic(
  () => import("@/components/three/ParticlePortrait"),
  { ssr: false },
);

/** The photo in a capsule frame; rippled by an SVG displacement filter on hover. */
function PortraitFallback() {
  return (
    <div className="portrait-fallback">
      <Image
        src={about.portrait.src}
        alt={about.portrait.alt}
        fill
        sizes="(max-width: 767px) 70vw, 30vw"
        style={{ objectFit: "cover", objectPosition: "50% 30%" }}
      />
    </div>
  );
}

export default function About() {
  const root = useRef<HTMLElement>(null);
  const portrait = useRef<HTMLDivElement>(null);
  const near = useInView(portrait, { rootMargin: "60% 0px", once: true });
  const webgl = useWebGL();
  const reduced = useReducedMotion();
  const particles = webgl && !reduced;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia(el);

    mm.add(MQ.motion, () => {
      // Words light up one after another as the paragraph crosses the viewport.
      gsap.to(".word", {
        "--w": 1,
        ease: "none",
        stagger: 0.12,
        scrollTrigger: {
          trigger: ".about-text",
          start: "top 82%",
          end: "bottom 48%",
          scrub: true,
        },
      });

      gsap.utils.toArray<HTMLElement>(".capsule").forEach((capsule) => {
        gsap.fromTo(
          capsule,
          { clipPath: "inset(0% 100% 0% 0% round 999px)" },
          {
            clipPath: "inset(0% 0% 0% 0% round 999px)",
            duration: 1.1,
            ease: "expo.out",
            scrollTrigger: { trigger: capsule, start: "top 88%", once: true },
          },
        );
      });

      // Chaos → face, tied to scroll position.
      gsap.to(motion, {
        portrait: 1,
        ease: "none",
        scrollTrigger: {
          trigger: ".about-portrait",
          start: "top 92%",
          end: "top 28%",
          scrub: true,
        },
      });

      return () => {
        motion.portrait = 0;
      };
    });

    mm.add(MQ.reduced, () => {
      motion.portrait = 1;
    });

    // The card rises over the hero leaning back, and settles flat as it lands.
    mm.add(MQ.pin, () => {
      gsap.fromTo(
        el,
        { rotateX: 8, transformPerspective: 1400, transformOrigin: "50% 0%" },
        {
          rotateX: 0,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "top 12%", scrub: true },
        },
      );
    });

    const stats = ScrollTrigger.create({
      trigger: ".stats",
      start: "top 88%",
      once: true,
      onEnter: () => {
        if (window.matchMedia(MQ.reduced).matches) return;
        el.querySelectorAll<HTMLElement>("[data-stat]").forEach((node, i) => {
          const stat = about.stats[i];
          scrambleCount(node, stat.value, {
            prefix: stat.prefix,
            suffix: stat.suffix,
            delay: i * 0.12,
          });
        });
      },
    });

    return () => {
      stats.kill();
      mm.revert();
    };
  }, []);

  return (
    <section id="about" ref={root} className="about section card-over" aria-labelledby="about-title">
      <div className="shell">
        <header className="section-head">
          <p className="eyebrow">
            <ScrambleText text={about.eyebrow} />
          </p>
          <h2 id="about-title" className="section-title display">
            <LiquidText text={about.title} scramble="enter" />{" "}
            <span className="cursive">{about.accent}</span>
          </h2>
        </header>

        <div className="about-grid">
          <p className="about-text">
            {about.paragraph.map((segment, s) => {
              const glue = s > 0 && !(segment.type === "text" && /^[.,;:!?]/.test(segment.value));
              return (
                <Fragment key={s}>
                  {glue && " "}
                  {segment.type === "capsule" ? (
                    <span className="capsule">
                      <Image
                        src={segment.src}
                        alt={segment.alt}
                        fill
                        sizes="200px"
                        unoptimized={segment.src.endsWith(".svg")}
                        style={{
                          objectFit: "cover",
                          objectPosition: segment.position ?? "50% 50%",
                        }}
                      />
                    </span>
                  ) : segment.type === "accent" ? (
                    <em className="word cursive">{segment.value}</em>
                  ) : (
                    segment.value.split(" ").map((word, w) => (
                      <Fragment key={w}>
                        {w > 0 && " "}
                        <span className="word">{word}</span>
                      </Fragment>
                    ))
                  )}
                </Fragment>
              );
            })}
          </p>

          <div
            ref={portrait}
            className="about-portrait"
            {...(particles ? { role: "img", "aria-label": about.portrait.alt } : null)}
          >
            {particles ? (
              near && (
                <SceneBoundary fallback={<PortraitFallback />}>
                  <ParticlePortrait src={about.portrait.src} crop={about.portrait.crop} />
                </SceneBoundary>
              )
            ) : (
              <PortraitFallback />
            )}
          </div>
        </div>

        <ul className="stats">
          {about.stats.map((stat) => {
            const value = `${stat.prefix}${stat.value}${stat.suffix}`;
            return (
              <li key={stat.label} className="stat">
                <span className="sr-only">{`${value} ${stat.label}`}</span>
                <span className="stat-value" data-stat aria-hidden="true">
                  {value}
                </span>
                <span className="stat-label" aria-hidden="true">
                  {stat.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
