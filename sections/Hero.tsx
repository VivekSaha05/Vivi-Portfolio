"use client";

import { useEffect, useRef } from "react";
import DotGrid from "@/components/DotGrid";
import LiquidText from "@/components/LiquidText";
import Magnetic from "@/components/Magnetic";
import { hero, site } from "@/data/portfolio";
import { useAppStore } from "@/hooks/useAppStore";
import { gsap, MQ } from "@/lib/gsap";
import { scrollToSection } from "@/lib/scroll";

/** `<Developer stack="…" />`, split into syntax-coloured tokens for typing. */
const TAG_TOKENS: { text: string; kind: "punct" | "name" | "attr" | "string" }[] = [
  { text: "<", kind: "punct" },
  { text: hero.tag.component, kind: "name" },
  { text: " ", kind: "punct" },
  { text: hero.tag.prop, kind: "attr" },
  { text: "=", kind: "punct" },
  { text: `"${hero.tag.value}"`, kind: "string" },
  { text: " />", kind: "punct" },
];
const TAG_TEXT = TAG_TOKENS.map((t) => t.text).join("");

/** Where the caret sits before each character; measured once per typing run. */
let caretStops: { x: number; y: number }[] | null = null;
let typedSoFar = -1;

/**
 * Shows the first `count` characters of the tag and parks the caret after them.
 * Characters are faded rather than removed, so typing never shifts the layout,
 * and positions are read once up front: reading layout on every keystroke
 * would force a full-page reflow per frame.
 */
function typeTag(root: HTMLElement, count: number) {
  const chars = root.querySelectorAll<HTMLElement>(".tag-char");
  const caret = root.querySelector<HTMLElement>(".hero-tag .caret");
  if (count === 0 || !caretStops || caretStops.length !== chars.length) {
    caretStops = Array.from(chars, (char) => ({ x: char.offsetLeft, y: char.offsetTop }));
    typedSoFar = -1;
  }
  if (count === typedSoFar) return;
  typedSoFar = count;

  chars.forEach((char, i) => {
    const opacity = i < count ? "1" : "0";
    if (char.style.opacity !== opacity) char.style.opacity = opacity;
  });
  if (!caret) return;
  const stop = caretStops[count];
  if (!stop) {
    // Done: the caret drops back into the flow, right after the last character.
    caret.style.cssText = "";
    caretStops = null;
    return;
  }
  caret.style.position = "absolute";
  caret.style.left = "0";
  caret.style.top = "0";
  caret.style.margin = "0";
  caret.style.transform = `translate(${stop.x}px, ${stop.y}px)`;
}

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const ready = useAppStore((s) => s.ready);
  const covered = useAppStore((s) => s.covered);
  // The intro waits for the loader, and for a page transition to uncover it.
  const live = ready && !covered;

  // Intro: plays as the loader wipes away, so there is never an empty frame.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const reduced = window.matchMedia(MQ.reduced).matches;
      const reveals = gsap.utils.toArray<HTMLElement>("[data-hero-in]");

      if (reduced) {
        gsap.set(reveals, { autoAlpha: live ? 1 : 0 });
        return;
      }
      // Hidden while the loader is up; the same starting pose the intro plays from.
      gsap.set(reveals, { autoAlpha: 0, y: 18 });
      typeTag(el, 0);
      if (!live) return;

      const typed = { count: 0 };
      gsap
        .timeline({ delay: 0.35 })
        .to(reveals[0], { autoAlpha: 1, y: 0, duration: 0.9 })
        .to(
          typed,
          {
            count: TAG_TEXT.length,
            duration: TAG_TEXT.length * 0.032,
            ease: "none",
            onUpdate: () => typeTag(el, Math.round(typed.count)),
          },
          0.9,
        )
        .to(
          reveals.slice(1),
          { autoAlpha: 1, y: 0, duration: 1, stagger: 0.12, ease: "expo.out" },
          1.6,
        );
    }, el);
    return () => {
      ctx.revert();
      typeTag(el, TAG_TEXT.length);
    };
  }, [live]);

  // Scroll-out: the hero is pinned with no spacer, so the About card (next in
  // the flow, stacked above) slides over it. Meanwhile the hero steps back:
  // it shrinks slightly, and the dot grid and small type dim and soften. The
  // name only dims, so it stays sharp until covered.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia(el);

    mm.add(MQ.pin, () => {
      gsap
        .timeline({
          defaults: { ease: "none", duration: 1 },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "+=100%",
            pin: true,
            pinSpacing: false,
            anticipatePin: 1,
            scrub: true,
            refreshPriority: 30,
          },
        })
        .to(".hero-inner", { scale: 0.92 }, 0)
        .fromTo(
          ".hero-recede",
          { filter: "brightness(1) blur(0px)" },
          { filter: "brightness(0.4) blur(4px)" },
          0,
        )
        .fromTo(
          ".hero-name-wrap",
          { filter: "brightness(1)" },
          { filter: "brightness(0.55)" },
          0,
        );
    });

    return () => mm.revert();
  }, []);

  return (
    <section id="home" ref={root} className="hero" aria-label="Introduction">
      <div className="hero-inner">
        {/* Background sits last in the visual order: faint, and under the grain. */}
        <div className="hero-stage hero-recede">
          <DotGrid className="hero-dots" />
        </div>

        <div className="hero-content shell">
          <div className="hero-recede">
            <p className="hero-label eyebrow" data-hero-in>
              {hero.label}
            </p>
          </div>

          <div className="hero-name-wrap">
            <h1 className="hero-name display" aria-label={site.name}>
              {hero.name.map((word, i) => (
                <LiquidText
                  key={word}
                  text={word}
                  decorative
                  variant="solid"
                  scramble="both"
                  play={live}
                  delay={0.55 + i * 0.18}
                />
              ))}
            </h1>
          </div>

          <div className="hero-recede hero-meta">
            <p className="hero-tag">
              <span className="sr-only">{TAG_TEXT}</span>
              <span className="hero-tag-visual" aria-hidden="true">
                {TAG_TOKENS.map((token, t) =>
                  Array.from(token.text).map((char, c) => (
                    <span key={`${t}-${c}`} className={`tag-char tag-${token.kind}`}>
                      {char}
                    </span>
                  )),
                )}
                <span className="caret" />
              </span>
            </p>

            <p className="hero-tagline cursive" data-hero-in>
              {hero.tagline}
            </p>

            <div className="hero-cta" data-hero-in>
              <Magnetic
                className="btn btn--solid"
                onClick={() => scrollToSection(hero.primaryCta.target)}
              >
                {hero.primaryCta.label}
              </Magnetic>
              <Magnetic className="btn" href={hero.secondaryCta.href} download>
                {hero.secondaryCta.label}
              </Magnetic>
            </div>
          </div>
        </div>

        <div className="hero-scroll hero-recede" aria-hidden="true">
          <span className="hero-scroll-line" />
          <span data-hero-in>scroll ↓</span>
        </div>
      </div>
    </section>
  );
}
