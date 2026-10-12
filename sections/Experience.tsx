"use client";

import { useEffect, useRef, useState } from "react";
import LiquidText from "@/components/LiquidText";
import ScrambleText from "@/components/ScrambleText";
import { experience, projects } from "@/data/portfolio";
import { useFullMotion, useMediaQuery } from "@/hooks/useMediaQuery";
import { gsap, MQ, ScrollTrigger } from "@/lib/gsap";
import { getLenis, setSectionTarget } from "@/lib/scroll";
import { clamp } from "@/lib/utils";

/**
 * Experience + the handoff into Projects, as one pinned "stage".
 *
 * Desktop and phones: the stage pins. Vertical scroll (or swipe) first drives
 * the role panels sideways, then keeps the pin a little longer while the whole
 * experience layer rotates 180° on X like a page turning over, revealing the
 * Projects title that was lying underneath it. With a mouse it is also
 * draggable.
 *
 * Under 360px wide, or with reduced motion: no pin. The panels become plain
 * stacked cards and the Projects title follows in normal flow.
 */
export default function Experience() {
  const stage = useRef<HTMLDivElement>(null);
  const over = useRef<HTMLElement>(null);
  const under = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const full = useFullMotion();
  const pinned = useMediaQuery(MQ.pin);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const stageEl = stage.current;
    const overEl = over.current;
    const underEl = under.current;
    const trackEl = track.current;
    if (!stageEl || !overEl || !underEl || !trackEl) return;

    const mm = gsap.matchMedia(stageEl);

    mm.add(MQ.pin, () => {
      const travel = () => Math.max(0, trackEl.scrollWidth - window.innerWidth);
      const flipLength = () => window.innerHeight * 1.1;

      const pin = ScrollTrigger.create({
        trigger: stageEl,
        start: "top top",
        end: () => `+=${travel() + flipLength()}`,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        refreshPriority: 20,
      });

      // 1 — vertical scroll → horizontal travel.
      const horizontal = gsap.to(trackEl, {
        x: () => -travel(),
        ease: "none",
        scrollTrigger: {
          start: () => pin.start,
          end: () => pin.start + travel(),
          scrub: true,
          invalidateOnRefresh: true,
          refreshPriority: 19,
        },
      });

      // The violet timeline draws itself across every panel.
      gsap.fromTo(
        ".xp-line",
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            start: () => pin.start,
            end: () => pin.start + travel(),
            scrub: true,
            refreshPriority: 19,
          },
        },
      );

      gsap.to(".xp-backdrop", {
        xPercent: -28,
        ease: "none",
        scrollTrigger: {
          start: () => pin.start,
          end: () => pin.start + travel(),
          scrub: true,
          refreshPriority: 19,
        },
      });

      // Inner parallax: each tagged element drifts at its own rate relative to
      // its panel, measured against the horizontal tween (containerAnimation).
      // (Mouse devices only: on phones the panels already fill the screen.)
      const parallax = window.matchMedia(MQ.fine).matches
        ? gsap.utils.toArray<HTMLElement>("[data-speed]")
        : [];
      parallax.forEach((el) => {
        const speed = Number(el.dataset.speed);
        gsap.fromTo(
          el,
          { x: 70 * speed },
          {
            x: -70 * speed,
            ease: "none",
            scrollTrigger: {
              trigger: el.closest<HTMLElement>(".xp-panel") ?? el,
              containerAnimation: horizontal,
              start: "left right",
              end: "right left",
              scrub: true,
            },
          },
        );
      });

      // 2 — the page turns over.
      gsap
        .timeline({
          scrollTrigger: {
            start: () => pin.start + travel(),
            end: () => pin.start + travel() + flipLength(),
            scrub: true,
            invalidateOnRefresh: true,
            refreshPriority: 18,
            onUpdate: (self) => {
              if (self.progress > 0.5) setFlipped(true);
            },
          },
        })
        .fromTo(overEl, { rotateX: 0 }, { rotateX: 180, ease: "power1.inOut", duration: 1 }, 0)
        .fromTo(overEl, { scale: 1 }, { scale: 0.8, ease: "power2.out", duration: 0.5 }, 0)
        .set(overEl, { visibility: "hidden" }, 0.5)
        .fromTo(
          underEl,
          { autoAlpha: 0, scale: 0.88 },
          { autoAlpha: 1, scale: 1, ease: "power2.out", duration: 0.6 },
          0.4,
        );

      setSectionTarget("work", () => pin.start);
      setSectionTarget("projects", () => pin.end);

      // Drag to scrub: the pointer moves the page scroll, so drag, wheel and
      // keyboard all stay on the same timeline.
      let dragging = false;
      let startX = 0;
      let startScroll = 0;

      const onDown = (e: PointerEvent) => {
        if (e.pointerType !== "mouse" || e.button !== 0) return;
        if ((e.target as Element).closest("a, button")) return;
        const y = window.scrollY;
        if (y < pin.start - 1 || y > pin.start + travel() + 1) return;
        dragging = true;
        startX = e.clientX;
        startScroll = y;
      };
      const onMove = (e: PointerEvent) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        if (Math.abs(dx) > 4) overEl.classList.add("is-dragging");
        const target = clamp(startScroll - dx * 1.35, pin.start, pin.start + travel());
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(target, { lerp: 0.2 });
        else window.scrollTo(0, target);
      };
      const onUp = () => {
        dragging = false;
        overEl.classList.remove("is-dragging");
      };

      overEl.addEventListener("pointerdown", onDown);
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);

      return () => {
        overEl.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        setSectionTarget("work", null);
        setSectionTarget("projects", null);
      };
    });

    mm.add(MQ.stacked, () => {
      setSectionTarget(
        "projects",
        () => underEl.getBoundingClientRect().top + window.scrollY,
      );

      if (window.matchMedia(MQ.motion).matches) {
        gsap.from(".xp-panel", {
          autoAlpha: 0,
          y: 40,
          duration: 1,
          stagger: 0.12,
          scrollTrigger: { trigger: trackEl, start: "top 80%", once: true },
        });
        gsap.fromTo(
          ".xp-line",
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: "none",
            scrollTrigger: { trigger: trackEl, start: "top 85%", end: "top 30%", scrub: true },
          },
        );
      }

      return () => setSectionTarget("projects", null);
    });

    return () => mm.revert();
  }, []);

  return (
    <div ref={stage} className="stage">
      <section
        id="work"
        ref={over}
        className="stage-over"
        aria-labelledby="work-title"
        data-cursor={full ? "drag" : undefined}
      >
        <p className="xp-backdrop display" aria-hidden="true">
          {experience.backdrop}
        </p>

        <div ref={track} className="xp-track">
          <header className="xp-intro">
            <p className="eyebrow">
              <ScrambleText text={experience.eyebrow} />
            </p>
            <h2 id="work-title" className="section-title display">
              <LiquidText text={experience.title} scramble="enter" />{" "}
              <span className="cursive">{experience.accent}</span>
            </h2>
            <p className="xp-hint" aria-hidden="true">
              <span className="xp-hint-full">scroll or drag</span>
              <span className="xp-hint-lite">keep scrolling</span> ⟶
            </p>
          </header>

          {experience.roles.map((role, i) => (
            <article key={role.company} className="xp-panel liquid-glass">
              <span className="xp-node" aria-hidden="true" />
              <div className="xp-panel-head" data-speed="0.5">
                <p className="eyebrow">
                  {role.period} · {role.meta}
                </p>
                <h3 className="xp-company display">
                  <LiquidText text={role.short} decorative />
                  <span className="sr-only">{role.company}</span>
                </h3>
                <p className="xp-role">
                  <span aria-hidden="true">{role.company} — </span>
                  {role.title}
                </p>
              </div>

              <ul className="xp-points" data-speed="-0.35">
                {role.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>

              <ul className="pills xp-stack" data-speed="0.9" aria-label="Focus areas">
                {role.stack.map((item) => (
                  <li key={item} className="pill">
                    {item}
                  </li>
                ))}
              </ul>

              <span className="xp-index display" data-speed="1.7" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
            </article>
          ))}

          <span className="xp-line" aria-hidden="true" />
        </div>
      </section>

      <div ref={under} id="projects-intro" className="stage-under">
        <div className="shell">
          <p className="eyebrow">
            <ScrambleText text={projects.eyebrow} trigger="hover" />
          </p>
          <h2 id="projects-title" className="section-title section-title--xl display">
            <LiquidText
              text={projects.title}
              scramble="enter"
              play={pinned ? flipped : undefined}
            />{" "}
            <span className="cursive">{projects.accent}</span>
          </h2>
        </div>
      </div>
    </div>
  );
}
