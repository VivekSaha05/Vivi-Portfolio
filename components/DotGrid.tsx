"use client";

import { useEffect, useRef } from "react";
import { appStore } from "@/lib/store";
import { palettes } from "@/lib/theme";
import { pointer } from "@/lib/pointer";

/** CSS px between dots. */
const SPACING = 34;
/** Dot radius in CSS px (2.5px across). */
const RADIUS = 1.25;
/** Resting opacity per theme: barely there. */
const BASE_ALPHA = { dark: 0.09, light: 0.1 } as const;
/** Opacity a dot reaches right under the cursor. */
const HOT_ALPHA = 0.3;
/** Cursor influence radius, CSS px. */
const REACH = 120;
/** How far a dot is nudged away from the cursor at full influence, CSS px. */
const NUDGE = 1.8;
/** Ambient drift: a few px around a slow loop. */
const DRIFT = { x: 4, y: 3, period: 20 };
/** Per-frame easing of each dot's influence toward its target. */
const EASE = 0.12;

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};

/**
 * The hero's background: a calm grid of tiny dots.
 *
 * The resting grid is one pre-rendered tile filled as a pattern, so the frame
 * cost is a single fillRect however large the screen. Only the few dots near
 * the cursor are drawn individually: each one's original dot is punched out
 * and redrawn brighter, tinted toward violet and nudged a pixel or two away.
 * Each dot eases its influence in and out, so the effect never snaps.
 *
 * Canvas pixels are device pixels (DPR capped at 2) and the grid spacing is
 * rounded in device pixels, so the pattern and the individually drawn dots
 * always land on exactly the same lattice. The loop stops while the hero is
 * off screen, and with reduced motion the grid is drawn once and left static.
 */
export default function DotGrid({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = reducedQuery.matches;

    let dpr = 1;
    let width = 0;
    let height = 0;
    /** Grid spacing in device px (integer, so the tile repeats exactly). */
    let step = SPACING;
    let cols = 0;
    let rows = 0;
    let pattern: CanvasPattern | null = null;
    /** Eased cursor influence per lattice point, 0 → 1. */
    let heat = new Float32Array(0);
    /** Lattice points that are currently warm, so the frame never scans the whole grid. */
    const warm = new Set<number>();

    let base: readonly [number, number, number] = [0, 0, 0];
    let hot: readonly [number, number, number] = [0, 0, 0];
    let baseAlpha: number = BASE_ALPHA.dark;

    const readTheme = () => {
      const theme = appStore.get().theme;
      const palette = palettes[theme];
      base = hexToRgb(palette.text);
      hot = hexToRgb(palette.violet);
      baseAlpha = BASE_ALPHA[theme];
    };

    const buildPattern = () => {
      const tile = document.createElement("canvas");
      tile.width = step;
      tile.height = step;
      const t = tile.getContext("2d");
      if (!t) return;
      t.fillStyle = `rgba(${base[0]},${base[1]},${base[2]},${baseAlpha})`;
      t.beginPath();
      t.arc(step / 2, step / 2, RADIUS * dpr, 0, Math.PI * 2);
      t.fill();
      pattern = ctx.createPattern(tile, "repeat");
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.round(rect.width * dpr));
      height = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = width;
      canvas.height = height;
      step = Math.max(1, Math.round(SPACING * dpr));
      // One spare row/column on each side, so drift never exposes an empty edge.
      cols = Math.ceil(width / step) + 2;
      rows = Math.ceil(height / step) + 2;
      heat = new Float32Array(cols * rows);
      warm.clear();
      buildPattern();
    };

    /** Drift offset in device px at time `t` (seconds). */
    const drift = (t: number) => {
      if (reduced) return { x: 0, y: 0 };
      const a = (t / DRIFT.period) * Math.PI * 2;
      return { x: Math.sin(a) * DRIFT.x * dpr, y: Math.cos(a * 0.8) * DRIFT.y * dpr };
    };

    const draw = (time: number) => {
      const { x: ox, y: oy } = drift(time / 1000);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      if (!pattern) return;

      // Resting grid. The pattern is anchored to the origin, so shifting the
      // transform shifts the whole lattice.
      ctx.setTransform(1, 0, 0, 1, ox, oy);
      ctx.fillStyle = pattern;
      ctx.fillRect(-ox - step, -oy - step, width + step * 2, height + step * 2);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      if (reduced) return;

      // Cursor, in canvas device px. Inactive (touch, or never moved) = far away.
      const rect = canvas.getBoundingClientRect();
      const inside =
        pointer.active &&
        pointer.x >= rect.left - REACH &&
        pointer.x <= rect.right + REACH &&
        pointer.y >= rect.top - REACH &&
        pointer.y <= rect.bottom + REACH;
      const mx = (pointer.x - rect.left) * dpr;
      const my = (pointer.y - rect.top) * dpr;
      const reach = REACH * dpr;

      // Lattice point (i, j) sits at ((i - 1) * step + step / 2 + ox, …).
      const toX = (i: number) => (i - 1) * step + step / 2 + ox;
      const toY = (j: number) => (j - 1) * step + step / 2 + oy;

      if (inside) {
        const i0 = Math.max(0, Math.floor((mx - ox - reach) / step));
        const i1 = Math.min(cols - 1, Math.ceil((mx - ox + reach) / step) + 1);
        const j0 = Math.max(0, Math.floor((my - oy - reach) / step));
        const j1 = Math.min(rows - 1, Math.ceil((my - oy + reach) / step) + 1);
        for (let j = j0; j <= j1; j++) {
          for (let i = i0; i <= i1; i++) {
            const d = Math.hypot(toX(i) - mx, toY(j) - my);
            if (d < reach) warm.add(j * cols + i);
          }
        }
      }

      if (warm.size === 0) return;

      const r = RADIUS * dpr;
      const cut = r + 0.75;
      warm.forEach((index) => {
        const i = index % cols;
        const j = (index - i) / cols;
        const x = toX(i);
        const y = toY(j);
        const dx = x - mx;
        const dy = y - my;
        const d = Math.hypot(dx, dy);
        // Smoothstep falloff: full at the cursor, nothing at the edge of reach.
        const t = inside ? Math.max(0, 1 - d / reach) : 0;
        const target = t * t * (3 - 2 * t);
        const h = heat[index] + (target - heat[index]) * EASE;
        heat[index] = h;
        if (h < 0.004 && target === 0) {
          heat[index] = 0;
          warm.delete(index);
          return;
        }

        const push = (NUDGE * dpr * h) / Math.max(d, 1);
        const px = x + dx * push;
        const py = y + dy * push;

        // Lift the resting dot out, then draw the warmed one in its place.
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(x, y, cut, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";

        const red = Math.round(base[0] + (hot[0] - base[0]) * h);
        const green = Math.round(base[1] + (hot[1] - base[1]) * h);
        const blue = Math.round(base[2] + (hot[2] - base[2]) * h);
        const alpha = baseAlpha + (HOT_ALPHA - baseAlpha) * h;
        ctx.fillStyle = `rgba(${red},${green},${blue},${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, r * (1 + h * 0.15), 0, Math.PI * 2);
        ctx.fill();
      });
    };

    // ---- Loop: only while on screen, and only when motion is allowed. ----

    let frame = 0;
    let visible = false;

    const loop = (time: number) => {
      draw(time);
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (frame || reduced || !visible) return;
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const redraw = () => draw(performance.now());

    readTheme();
    resize();
    redraw();

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    observer.observe(canvas);

    // Debounced, and only when the box really changed size.
    let resizeTimer = 0;
    let lastW = canvas.clientWidth;
    let lastH = canvas.clientHeight;
    const sizeObserver = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (canvas.clientWidth === lastW && canvas.clientHeight === lastH) return;
        lastW = canvas.clientWidth;
        lastH = canvas.clientHeight;
        resize();
        redraw();
      }, 150);
    });
    sizeObserver.observe(canvas);

    let theme = appStore.get().theme;
    const unsubscribe = appStore.subscribe(() => {
      if (appStore.get().theme === theme) return;
      theme = appStore.get().theme;
      readTheme();
      buildPattern();
      redraw();
    });

    const onMotionChange = () => {
      reduced = reducedQuery.matches;
      if (reduced) stop();
      else start();
      redraw();
    };
    reducedQuery.addEventListener("change", onMotionChange);

    return () => {
      stop();
      observer.disconnect();
      sizeObserver.disconnect();
      window.clearTimeout(resizeTimer);
      unsubscribe();
      reducedQuery.removeEventListener("change", onMotionChange);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
