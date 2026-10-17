"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Glyph } from "@/components/Icons";
import LiquidChip from "@/components/LiquidChip";
import LiquidText from "@/components/LiquidText";
import Magnetic from "@/components/Magnetic";
import ScrambleText from "@/components/ScrambleText";
import SceneBoundary from "@/components/three/SceneBoundary";
import { about, isSet, type AboutSegment } from "@/data/portfolio";
import { useInView } from "@/hooks/useInView";
import { useReducedMotion } from "@/hooks/useMediaQuery";
import { useWebGL } from "@/hooks/useWebGL";
import { gsap, MQ, ScrollTrigger } from "@/lib/gsap";
import { scramble, scrambleCount } from "@/lib/scramble";
import { getLenis } from "@/lib/scroll";
import { motion } from "@/lib/store";

/** Widened, so every segment kind stays renderable whatever the copy uses today. */
const LEAD: AboutSegment[] = about.paragraph;

/** The belief, split so the accent's last word can carry the drawn underline. */
const BELIEF = (() => {
  const words = about.belief.accent.split(" ");
  return {
    before: about.belief.before.trim(),
    lead: words.slice(0, -1).join(" "),
    last: words[words.length - 1],
  };
})();

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
        sizes="(max-width: 767px) 50vw, 20vw"
        style={{ objectFit: "cover", objectPosition: "50% 30%" }}
      />
    </div>
  );
}

const MORE_ID = "about-more-panel";
const MORE_LABEL = { closed: "know more about me", open: "show less" };

/** The page got taller or shorter: re-measure Lenis and everything pinned below. */
function remeasure() {
  getLenis()?.resize();
  ScrollTrigger.refresh();
}

/**
 * Quick facts, education, beyond work and let's talk: hidden until the
 * "know more about me" button opens them with a height tween.
 */
function MoreAboutMe() {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLSpanElement>(null);
  const shown = useRef(false);

  useEffect(() => {
    const el = panel.current;
    if (!el || shown.current === open) return;
    shown.current = open;

    const reduced = window.matchMedia(MQ.reduced).matches;
    const duration = reduced ? 0 : 0.6;
    const blocks = el.querySelectorAll(".about-block");
    const tl = gsap.timeline({
      defaults: { ease: "power3.inOut" },
      onComplete: remeasure,
    });

    // + turns 45° into ×, and back.
    tl.to(mark.current, { rotation: open ? 45 : 0, duration }, 0);
    if (open) {
      tl.to(el, { height: "auto", duration }, 0);
      tl.fromTo(
        blocks,
        { autoAlpha: 0, y: 10 },
        {
          autoAlpha: 1,
          y: 0,
          duration: reduced ? 0 : 0.5,
          ease: "power2.out",
          stagger: reduced ? 0 : 0.08,
        },
        reduced ? 0 : 0.15,
      );
    } else {
      // The reverse: the blocks leave last-first, then the panel folds shut.
      tl.to(
        blocks,
        {
          autoAlpha: 0,
          y: 10,
          duration: reduced ? 0 : 0.25,
          ease: "power2.in",
          stagger: reduced ? 0 : { each: 0.05, from: "end" },
        },
        0,
      );
      tl.to(el, { height: 0, duration }, reduced ? 0 : 0.15);
    }

    // React has already written the new label; decode into it (both the
    // outline and the fill copy of the liquid text, so they stay in sync).
    if (!reduced && button.current) {
      const layers = [...button.current.querySelectorAll(".lt-outline, .lt-fill")];
      if (layers.length) scramble(layers, open ? MORE_LABEL.open : MORE_LABEL.closed, { duration: 0.6 });
    }

    // A click mid-tween stops this one where it is; the next starts from there.
    return () => {
      tl.kill();
    };
  }, [open]);

  return (
    <div className="about-more">
      <div ref={button} className="about-more-trigger">
        <Magnetic
          className="text-link about-more-btn"
          aria-expanded={open}
          aria-controls={MORE_ID}
          onClick={() => setOpen((v) => !v)}
        >
          <LiquidText
            text={open ? MORE_LABEL.open : MORE_LABEL.closed}
            variant="solid"
          />
          <span ref={mark} className="about-more-mark" aria-hidden="true">
            +
          </span>
        </Magnetic>
      </div>

      {/* Closed: zero height, and inert so nothing inside can be tabbed into. */}
      <div ref={panel} id={MORE_ID} className="about-more-panel" inert={!open}>
        <div className="about-details">
          <section className="about-block" aria-labelledby="about-facts">
            <h3 id="about-facts" className="eyebrow about-block-title">
              {about.factsLabel}
            </h3>
            <dl className="facts">
              {about.facts.map((fact) => (
                <div key={fact.label} className="fact">
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="about-block" aria-labelledby="about-education">
            <h3 id="about-education" className="eyebrow about-block-title">
              {about.educationLabel}
            </h3>
            <ol className="edu">
              {about.education.map((item) => (
                <li key={item.period} className="edu-item">
                  <span className="edu-period">{item.period}</span>
                  <span className="edu-title">{item.title}</span>
                  <span className="edu-school">{item.school}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="about-block" aria-labelledby="about-activities">
            <h3 id="about-activities" className="eyebrow about-block-title">
              {about.activitiesLabel}
            </h3>
            <ul className="activities">
              {about.activities.map((item) => (
                <li key={item.label}>
                  <LiquidChip
                    className="activity"
                    href={isSet(item.href) ? item.href : undefined}
                  >
                    <Glyph name={item.icon} className="activity-icon" />
                    <span className="activity-label">{item.label}</span>
                    {item.meta && <span className="activity-meta">{item.meta}</span>}
                  </LiquidChip>
                </li>
              ))}
            </ul>
          </section>

          <section className="about-block" aria-labelledby="about-connect">
            <h3 id="about-connect" className="eyebrow about-block-title">
              {about.connectLabel}
            </h3>
            <ul className="about-connect">
              {about.connect.map((link) => (
                <li key={link.href}>
                  <Magnetic href={link.href} className="text-link" soft>
                    {link.label}
                  </Magnetic>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
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
      // Headline tags drop in one after another.
      gsap.from(".about-tags li", {
        autoAlpha: 0,
        y: 14,
        duration: 0.8,
        ease: "expo.out",
        stagger: 0.06,
        scrollTrigger: { trigger: ".about-tags", start: "top 90%", once: true },
      });

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

      // The belief: the outlined line rises out of its mask, the cursive line
      // fades up as its tracking tightens, then the underline draws. Once.
      gsap
        .timeline({ scrollTrigger: { trigger: ".belief", start: "top 75%", once: true } })
        .from(".belief-line-inner", { yPercent: 110, duration: 0.9, ease: "expo.out" })
        .from(
          ".belief-accent",
          { autoAlpha: 0, y: 18, letterSpacing: "0.06em", duration: 0.9, ease: "power3.out" },
          "-=0.45",
        )
        .fromTo(
          ".belief-underline path",
          { strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut" },
          "-=0.3",
        );

      // Chaos → face, played once when the portrait first scrolls in. It is
      // deliberately not scrubbed: scrolling back must never scatter (and so
      // visually inflate) the portrait again.
      ScrollTrigger.create({
        trigger: ".about-portrait",
        start: "top 80%",
        once: true,
        onEnter: () => {
          gsap.to(motion, { portrait: 1, duration: 2.4, ease: "power2.inOut" });
        },
      });

      return () => {
        gsap.killTweensOf(motion);
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
          <p className="eyebrow about-eyebrow">
            <ScrambleText text={about.eyebrow} />
          </p>
          <h2 id="about-title" className="section-title display">
            <LiquidText text={about.title} scramble="enter" />{" "}
            <span className="cursive">{about.accent}</span>
          </h2>
          <ul className="about-tags" aria-label="At a glance">
            {about.tags.map((tag) => (
              <li key={tag}>
                <LiquidChip>{tag}</LiquidChip>
              </li>
            ))}
          </ul>
        </header>

        <div className="about-grid">
          <div className="about-copy">
            <p className="about-text">
              {LEAD.map((segment, s) => {
                const glue =
                  s > 0 && !(segment.type === "text" && /^[.,;:!?]/.test(segment.value));
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
          </div>

          <div
            ref={portrait}
            className="about-portrait"
            {...(particles ? { role: "img", "aria-label": about.portrait.alt } : null)}
          >
            {particles ? (
              near && (
                <SceneBoundary fallback={<PortraitFallback />}>
                  <ParticlePortrait
                    src={about.portrait.src}
                    crop={about.portrait.crop}
                    anchor={portrait}
                  />
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

        <figure className="belief">
          <span className="belief-mark belief-mark--open" aria-hidden="true">
            “
          </span>
          <span className="belief-mark belief-mark--close" aria-hidden="true">
            ”
          </span>
          <blockquote className="belief-quote">
            <p>
              <span className="belief-line">
                <span className="belief-line-inner">
                  <LiquidText text={BELIEF.before} variant="outline-violet" />
                </span>
              </span>
              <em className="belief-accent cursive">
                {BELIEF.lead}{" "}
                <span className="belief-underlined">
                  {BELIEF.last}
                  <svg
                    className="belief-underline"
                    viewBox="0 0 200 20"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 13 C 38 6, 70 15, 104 10 S 168 4, 197 9"
                      pathLength={1}
                    />
                  </svg>
                </span>
                {about.belief.after}
              </em>
            </p>
          </blockquote>
          <figcaption className="belief-by">{about.belief.attribution}</figcaption>
        </figure>

        <MoreAboutMe />
      </div>
    </section>
  );
}
