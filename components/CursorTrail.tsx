"use client";

import { useEffect, useRef } from "react";
import { useFullMotion } from "@/hooks/useMediaQuery";
import { useThemeColors } from "@/hooks/useThemeColors";
import { gsap } from "@/lib/gsap";
import { pointer } from "@/lib/pointer";

const LINES = 4;
const POINTS = 26;
/** ms without movement before the ribbons start to fade. */
const IDLE = 140;

type Ribbon = {
  xs: Float32Array;
  ys: Float32Array;
  vx: number;
  vy: number;
  stiffness: number;
  damping: number;
  follow: number;
  phase: number;
  sway: number;
};

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};

/**
 * A few thin ribbons that chase the cursor on springs of different stiffness,
 * so they braid apart in motion and collapse (and fade) when it stops.
 * Stroke runs violet → taupe → transparent from head to tail.
 */
export default function CursorTrail() {
  const enabled = useFullMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const colors = useThemeColors();
  const palette = useRef(colors);

  useEffect(() => {
    palette.current = colors;
  }, [colors]);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!enabled || !el || !ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      el.width = width * dpr;
      el.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const ribbons: Ribbon[] = Array.from({ length: LINES }, (_, i) => ({
      xs: new Float32Array(POINTS),
      ys: new Float32Array(POINTS),
      vx: 0,
      vy: 0,
      stiffness: 0.085 + i * 0.03,
      damping: 0.74 - i * 0.045,
      follow: 0.42 - i * 0.035,
      phase: i * 1.7,
      sway: 5 + i * 3.5,
    }));

    let seeded = false;
    let alpha = 0;
    let dirty = false;

    const draw = (time: number) => {
      if (!pointer.active) return;
      if (!seeded) {
        seeded = true;
        for (const r of ribbons) {
          r.xs.fill(pointer.x);
          r.ys.fill(pointer.y);
        }
      }

      const moving = performance.now() - pointer.movedAt < IDLE;
      alpha += ((moving ? 1 : 0) - alpha) * (moving ? 0.2 : 0.06);

      if (alpha < 0.004) {
        if (dirty) {
          ctx.clearRect(0, 0, width, height);
          dirty = false;
        }
        // Keep the springs parked on the cursor so the next move starts clean.
        for (const r of ribbons) {
          r.xs.fill(pointer.x);
          r.ys.fill(pointer.y);
          r.vx = r.vy = 0;
        }
        return;
      }

      ctx.clearRect(0, 0, width, height);
      dirty = true;
      ctx.lineCap = "round";
      const head = hexToRgb(palette.current.violet);
      const tail = hexToRgb(palette.current.taupe);

      for (const r of ribbons) {
        // Head: spring toward the cursor with a small perpendicular sway.
        const tx = pointer.x + Math.sin(time * 2.2 + r.phase) * r.sway * alpha;
        const ty = pointer.y + Math.cos(time * 1.9 + r.phase) * r.sway * alpha;
        r.vx = (r.vx + (tx - r.xs[0]) * r.stiffness) * r.damping;
        r.vy = (r.vy + (ty - r.ys[0]) * r.stiffness) * r.damping;
        r.xs[0] += r.vx;
        r.ys[0] += r.vy;
        // Body: each point eases toward the one ahead of it.
        for (let i = 1; i < POINTS; i++) {
          r.xs[i] += (r.xs[i - 1] - r.xs[i]) * r.follow;
          r.ys[i] += (r.ys[i - 1] - r.ys[i]) * r.follow;
        }

        for (let i = 1; i < POINTS - 1; i++) {
          const t = i / (POINTS - 1);
          const mix = Math.min(1, t * 1.6);
          const red = head[0] + (tail[0] - head[0]) * mix;
          const green = head[1] + (tail[1] - head[1]) * mix;
          const blue = head[2] + (tail[2] - head[2]) * mix;
          const fade = (1 - t) * (1 - t) * alpha * 0.85;

          ctx.strokeStyle = `rgba(${red | 0},${green | 0},${blue | 0},${fade.toFixed(3)})`;
          ctx.lineWidth = 1.35 - t * 0.9;
          ctx.beginPath();
          // Midpoint-to-midpoint quadratics keep the ribbon smooth.
          ctx.moveTo((r.xs[i - 1] + r.xs[i]) / 2, (r.ys[i - 1] + r.ys[i]) / 2);
          ctx.quadraticCurveTo(
            r.xs[i],
            r.ys[i],
            (r.xs[i] + r.xs[i + 1]) / 2,
            (r.ys[i] + r.ys[i + 1]) / 2,
          );
          ctx.stroke();
        }
      }
    };

    gsap.ticker.add(draw);
    return () => {
      gsap.ticker.remove(draw);
      window.removeEventListener("resize", resize);
      ctx.clearRect(0, 0, width, height);
    };
  }, [enabled]);

  if (!enabled) return null;
  return <canvas ref={canvas} className="cursor-trail" aria-hidden="true" />;
}
