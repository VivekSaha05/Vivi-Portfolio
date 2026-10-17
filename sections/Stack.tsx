"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import dynamic from "next/dynamic";
import LiquidText from "@/components/LiquidText";
import ScrambleText from "@/components/ScrambleText";
import { GroupIcon, TechIcon } from "@/components/TechIcon";
import SceneBoundary from "@/components/three/SceneBoundary";
import { stack } from "@/data/portfolio";
import { useInView } from "@/hooks/useInView";
import { useReducedMotion } from "@/hooks/useMediaQuery";
import { useWebGL } from "@/hooks/useWebGL";
import { gsap, MQ } from "@/lib/gsap";
import { getLenis } from "@/lib/scroll";
import { appStore } from "@/lib/store";
import { clamp, lerp } from "@/lib/utils";

const Tesseract = dynamic(() => import("@/components/three/Tesseract"), {
  ssr: false,
});

/** px per second each row drifts when the page is still. */
const DRIFT = 110;

/** Where the pointer crossed a tech capsule: its soft fill floods from (and drains to) there. */
function aim(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty("--x", `${e.clientX - rect.left}px`);
  el.style.setProperty("--y", `${e.clientY - rect.top}px`);
}

export default function Stack() {
  const root = useRef<HTMLElement>(null);
  const marquee = useRef<HTMLDivElement>(null);
  const cube = useRef<HTMLDivElement>(null);
  /** How many words in each row are currently hovered (a hovered row pauses). */
  const hovering = useRef(stack.marquee.map(() => 0));
  const visible = useInView(marquee, { rootMargin: "20% 0px" });
  const nearCube = useInView(cube, { rootMargin: "80% 0px", once: true });
  const reduced = useReducedMotion();
  const webgl = useWebGL();

  // Velocity-reactive marquee: rows run in opposite directions (row 1 left,
  // row 2 right), speed up (or reverse) with the scroll, lean into it with a
  // skew, and ease to a stop while one of their words is hovered.
  useEffect(() => {
    const el = marquee.current;
    if (!el || !visible || window.matchMedia(MQ.reduced).matches) return;

    const rows = Array.from(el.querySelectorAll<HTMLElement>(".marquee-row")).map(
      (row, i) => ({
        row,
        track: row.querySelector<HTMLElement>(".marquee-track")!,
        copy: row.querySelector<HTMLElement>(".marquee-copy")!,
        dir: i % 2 === 0 ? -1 : 1,
        x: 0,
        width: 0,
        flow: 1,
      }),
    );
    const measure = () => rows.forEach((r) => (r.width = r.copy.offsetWidth));
    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);

    let lastY = window.scrollY;
    let velocity = 0;
    let skew = 0;

    const tick = (_time: number, deltaMs: number) => {
      const dt = Math.min(deltaMs, 50) / 1000;
      const y = window.scrollY;
      const raw = getLenis()?.velocity ?? y - lastY;
      lastY = y;
      velocity = lerp(velocity, raw, 0.12);
      skew = lerp(skew, clamp(velocity * 0.32, -9, 9), 0.1);

      rows.forEach((r, i) => {
        if (!r.width) return;
        r.flow = lerp(r.flow, hovering.current[i] > 0 ? 0 : 1, 0.08);
        r.x += r.dir * (DRIFT * dt + velocity * 0.55) * r.flow;
        // Wrap into (-width, 0] so the duplicate copy always covers the gap.
        r.x = ((r.x % r.width) - r.width) % r.width;
        r.track.style.transform = `translate3d(${r.x.toFixed(2)}px,0,0)`;
        r.row.style.transform = `skewX(${(skew * -r.dir * r.flow).toFixed(2)}deg)`;
      });
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", measure);
    };
  }, [visible]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia(el);
    mm.add(MQ.motion, () => {
      gsap.from(".stack-group", {
        autoAlpha: 0,
        y: 36,
        duration: 1,
        ease: "expo.out",
        stagger: 0.07,
        scrollTrigger: { trigger: ".stack-grid", start: "top 85%", once: true },
      });
    });
    return () => mm.revert();
  }, []);

  const hover = (name: (typeof stack.groups)[number]["name"] | null) => () =>
    appStore.set({ stackHover: name });

  return (
    <section id="stack" ref={root} className="stack section" aria-labelledby="stack-title">
      {/* Drawn across the screen by ProjectsStack while the two sections trade places. */}
      <span className="duo-line" aria-hidden="true" />

      <header className="shell section-head">
        <p className="eyebrow">
          <ScrambleText text={stack.eyebrow} />
        </p>
        <h2 id="stack-title" className="section-title display">
          <LiquidText text={stack.title} scramble="enter" />{" "}
          <span className="cursive">{stack.accent}</span>
        </h2>
      </header>

      <div ref={marquee} className="marquee">
        {stack.marquee.map((row, r) => (
          <div key={row.label} className="marquee-row">
            <div className="marquee-track">
              {[0, 1].map((copy) => (
                <ul key={copy} className="marquee-copy" aria-hidden={copy === 1}>
                  <li className="marquee-label" aria-hidden="true">
                    {row.label}
                  </li>
                  {row.items.map((skill) => (
                    <li key={skill} className="marquee-item display">
                      <LiquidText
                        text={skill}
                        decorative={copy === 1}
                        onHoverChange={(on) => {
                          hovering.current[r] = Math.max(0, hovering.current[r] + (on ? 1 : -1));
                        }}
                      />
                      <span className="marquee-sep" aria-hidden="true">
                        ✦
                      </span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="shell stack-body">
        <div className="stack-grid">
          {stack.groups.map((group) => (
            <div
              key={group.name}
              className="stack-group"
              onPointerEnter={hover(group.name)}
              onPointerLeave={hover(null)}
            >
              <h3 className="stack-group-title">
                <GroupIcon name={group.name} />
                <ScrambleText text={group.name} trigger="hover" />
              </h3>
              <ul className="pills">
                {group.items.map((item) => (
                  <li key={item} className="pill pill--tech" onPointerEnter={aim} onPointerLeave={aim}>
                    <TechIcon name={item} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div ref={cube} className="stack-cube">
          {webgl && !reduced && nearCube && (
            <SceneBoundary>
              <Tesseract />
            </SceneBoundary>
          )}
        </div>
      </div>
    </section>
  );
}
