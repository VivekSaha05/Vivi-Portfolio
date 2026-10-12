"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type PointerEvent,
} from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import CanvasShell from "@/components/three/CanvasShell";
import type { StackCategory } from "@/data/portfolio";
import { useAppStore } from "@/hooks/useAppStore";
import { useThemeColors } from "@/hooks/useThemeColors";
import { gsap } from "@/lib/gsap";
import { pointer } from "@/lib/pointer";
import { scramble } from "@/lib/scramble";
import { getLenis } from "@/lib/scroll";
import { appStore } from "@/lib/store";
import { clamp, damp, lerp } from "@/lib/utils";
import { vertexPointFragment, vertexPointVertex } from "@/shaders/tesseract";

/* ---- The hypercube: 16 vertices at (±1, ±1, ±1, ±1), 32 edges. ---- */

type V4 = [number, number, number, number];

const VERTICES: V4[] = Array.from({ length: 16 }, (_, i) => [
  i & 1 ? 1 : -1,
  i & 2 ? 1 : -1,
  i & 4 ? 1 : -1,
  i & 8 ? 1 : -1,
]);

/** Two vertices share an edge when exactly one coordinate differs. */
const EDGES: [number, number][] = [];
for (let a = 0; a < 16; a++) {
  for (let bit = 0; bit < 4; bit++) {
    const b = a ^ (1 << bit);
    if (a < b) EDGES.push([a, b]);
  }
}

/** Distance of the 4D "camera" along w for the 4D → 3D perspective divide. */
const W_DISTANCE = 2.5;
const SCALE = 0.6;
/** While annotated, the 4D rotation runs at this share of its speed. */
const READING_SPEED = 0.4;

/** Rotation speed (rad/s) in each 4D plane, and how far edges lean to taupe. */
type Mode = { xw: number; yw: number; zw: number; tint: number };

const IDLE: Mode = { xw: 0.32, yw: 0.18, zw: 0.1, tint: 0 };

/** Each skill group turns the cube through a different plane. */
const MODES: Record<StackCategory, Mode> = {
  Frontend: { xw: 0.9, yw: 0.1, zw: 0.05, tint: 0 },
  Backend: { xw: 0.05, yw: 0.9, zw: 0.1, tint: 0.35 },
  Databases: { xw: 0.1, yw: 0.05, zw: 0.9, tint: 0.7 },
  Testing: { xw: 0.55, yw: 0.55, zw: 0, tint: 0.2 },
  DevOps: { xw: 0.7, yw: 0, zw: 0.7, tint: 0.5 },
  Concepts: { xw: 0.45, yw: 0.45, zw: 0.45, tint: 1 },
};

const FACTS = [
  "16 vertices · 32 edges · 24 faces · 8 cubes",
  "a tesseract is to a cube what a cube is to a square",
  "what you see is its 3D shadow, projected from 4D",
  "the inner cube isn't inside — it's the far side in the 4th dimension",
  'term "tesseract" coined by C. H. Hinton in 1888',
  "each vertex connects to 4 edges — one per dimension",
  "rotating in the XW plane turns it inside-out",
];

/** Label slots in the corners of the frame. Fixed, so labels never overlap each other or the model. */
const SLOTS = [
  { side: "left", style: { left: 0, top: 0 } },
  { side: "right", style: { right: 0, bottom: 0 } },
  { side: "left", style: { left: 0, bottom: 0 } },
] as const;

/** Per-frame scratch space: projected vertices, their w depth, and the line buffers. */
const SCRATCH = {
  projected: new Float32Array(16 * 3),
  depth: new Float32Array(16),
  segments: new Float32Array(EDGES.length * 6),
  segmentColors: new Float32Array(EDGES.length * 6),
};

/** Where each vertex lands on screen (canvas px), for the annotation overlay. */
const SCREEN = new Float32Array(16 * 2);
const tmp = new THREE.Vector3();

/** Pointer state, written by the DOM wrapper and read in the render loop. */
const view = { dragging: false, x: 0, y: 0, lastX: 0, lastY: 0, annotated: false };

function rotate(v: number[], a: number, b: number, angle: number) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const va = v[a];
  v[a] = va * c - v[b] * s;
  v[b] = va * s + v[b] * c;
}

function Hypercube() {
  const group = useRef<THREE.Group>(null);
  const lines = useRef<ComponentRef<typeof Line>>(null);
  const dots = useRef<THREE.Points>(null);
  const dotMaterial = useRef<THREE.ShaderMaterial>(null);
  const colors = useThemeColors();
  const theme = useAppStore((s) => s.theme);

  const live = useRef({
    ...IDLE,
    axw: 0,
    ayw: 0,
    azw: 0,
    boost: 1,
    pace: 1,
    lastY: 0,
    tiltX: 0,
    tiltY: 0,
  });

  const palette = useMemo(
    () => ({
      near: new THREE.Color(colors.violet),
      far: new THREE.Color(colors.taupe),
      // Vertices: light on dark, ink on light.
      dot: new THREE.Color(theme === "dark" ? colors.text : colors.violet),
      glow: theme === "dark" ? 1 : 0,
    }),
    [colors, theme],
  );

  const dotGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(16 * 3), 3));
    g.setAttribute("aDepth", new THREE.BufferAttribute(new Float32Array(16), 1));
    return g;
  }, []);
  useEffect(() => () => dotGeometry.dispose(), [dotGeometry]);

  const dotUniforms = useMemo(
    () => ({
      uSize: { value: 70 },
      uPixelRatio: { value: 1 },
      uNear: { value: new THREE.Color() },
      uFar: { value: new THREE.Color() },
      uGlow: { value: 1 },
    }),
    [],
  );

  // Placeholder geometry for <Line>; real positions are written every frame.
  const initial = useMemo(
    () => ({
      points: EDGES.flatMap(() => [
        [0, 0, 0],
        [0, 0, 0.001],
      ]) as [number, number, number][],
      colors: EDGES.flatMap(() => [
        [1, 1, 1],
        [1, 1, 1],
      ]) as [number, number, number][],
    }),
    [],
  );

  useFrame((frame, delta) => {
    const state = live.current;
    const target = MODES[appStore.get().stackHover as StackCategory] ?? IDLE;
    const k = damp(3, delta);
    state.xw = lerp(state.xw, target.xw, k);
    state.yw = lerp(state.yw, target.yw, k);
    state.zw = lerp(state.zw, target.zw, k);
    state.tint = lerp(state.tint, target.tint, k);

    // Scrolling winds the 4D rotation up; it eases back when the page rests.
    const y = window.scrollY;
    const velocity = Math.abs(getLenis()?.velocity ?? y - state.lastY);
    state.lastY = y;
    state.boost = lerp(state.boost, 1 + clamp(velocity * 0.12, 0, 5), damp(4, delta));
    // Slow right down while the annotations are up, so they can be read.
    state.pace = lerp(state.pace, view.annotated ? READING_SPEED : 1, damp(4, delta));

    const step = delta * state.boost * state.pace;
    state.axw += state.xw * step;
    state.ayw += state.yw * step;
    state.azw += state.zw * step;

    // 3D view: leans toward the cursor, and turns freely while dragged.
    const g = group.current;
    if (g) {
      state.tiltX = lerp(state.tiltX, -pointer.ny * 0.35, damp(3, delta));
      state.tiltY = lerp(state.tiltY, pointer.nx * 0.45, damp(3, delta));
      g.rotation.x = 0.35 + state.tiltX + view.y;
      g.rotation.y = 0.5 + state.tiltY + view.x;
      g.updateMatrixWorld();
    }

    const { projected, depth, segments, segmentColors } = SCRATCH;
    const v = [0, 0, 0, 0];
    for (let i = 0; i < 16; i++) {
      v[0] = VERTICES[i][0];
      v[1] = VERTICES[i][1];
      v[2] = VERTICES[i][2];
      v[3] = VERTICES[i][3];
      // Rotations through w are what turn the inner cube inside-out.
      rotate(v, 0, 3, state.axw);
      rotate(v, 1, 3, state.ayw);
      rotate(v, 2, 3, state.azw);
      const perspective = (W_DISTANCE / (W_DISTANCE - v[3])) * SCALE;
      projected[i * 3] = v[0] * perspective;
      projected[i * 3 + 1] = v[1] * perspective;
      projected[i * 3 + 2] = v[2] * perspective;
      // 0 = deep in w (the small inner cube), 1 = nearest (the outer cube).
      depth[i] = clamp((v[3] + 1.6) / 3.2, 0, 1);

      // Screen position of this vertex, for the leader lines to hold on to.
      if (g) {
        tmp
          .set(projected[i * 3], projected[i * 3 + 1], projected[i * 3 + 2])
          .applyMatrix4(g.matrixWorld)
          .project(frame.camera);
        SCREEN[i * 2] = (tmp.x * 0.5 + 0.5) * frame.size.width;
        SCREEN[i * 2 + 1] = (-tmp.y * 0.5 + 0.5) * frame.size.height;
      }
    }

    const { near, far } = palette;
    for (let e = 0; e < EDGES.length; e++) {
      for (let end = 0; end < 2; end++) {
        const index = EDGES[e][end];
        const o = e * 6 + end * 3;
        segments[o] = projected[index * 3];
        segments[o + 1] = projected[index * 3 + 1];
        segments[o + 2] = projected[index * 3 + 2];
        // Violet up close, fading toward taupe with w depth (and with the mode tint).
        const t = clamp(depth[index] * (1 - state.tint * 0.8), 0, 1);
        segmentColors[o] = lerp(far.r, near.r, t);
        segmentColors[o + 1] = lerp(far.g, near.g, t);
        segmentColors[o + 2] = lerp(far.b, near.b, t);
      }
    }
    lines.current?.geometry.setPositions(segments);
    lines.current?.geometry.setColors(segmentColors);

    const points = dots.current;
    if (points) {
      const position = points.geometry.getAttribute("position") as THREE.BufferAttribute;
      const aDepth = points.geometry.getAttribute("aDepth") as THREE.BufferAttribute;
      (position.array as Float32Array).set(projected);
      (aDepth.array as Float32Array).set(depth);
      position.needsUpdate = true;
      aDepth.needsUpdate = true;
    }
    const u = dotMaterial.current?.uniforms;
    if (u) {
      u.uPixelRatio.value = frame.viewport.dpr;
      u.uNear.value.copy(palette.dot);
      u.uFar.value.copy(far);
      u.uGlow.value = palette.glow;
    }
  });

  return (
    <group ref={group}>
      <Line
        ref={lines}
        points={initial.points}
        vertexColors={initial.colors}
        segments
        lineWidth={1.5}
        worldUnits={false}
        transparent
        depthWrite={false}
      />
      <points ref={dots} geometry={dotGeometry} frustumCulled={false}>
        <shaderMaterial
          ref={dotMaterial}
          uniforms={dotUniforms}
          vertexShader={vertexPointVertex}
          fragmentShader={vertexPointFragment}
          transparent
          depthWrite={false}
        />
      </points>
    </group>
  );
}

/**
 * Blueprint-style annotations. Each label sits in a fixed slot; a leader line
 * runs from it to a vertex and is re-aimed every frame from SCREEN, so it
 * stays attached while the model turns. A new set of facts cycles in every
 * three seconds for as long as `active` is true.
 */
function Notes({ active }: { active: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const primed = useRef(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const count = window.matchMedia("(max-width: 767px)").matches ? 2 : SLOTS.length;
    const pick = <T extends Element>(selector: string) =>
      Array.from(el.querySelectorAll<T>(selector)).slice(0, count);
    const labels = pick<HTMLElement>(".note");
    const texts = pick<HTMLElement>(".note-text");
    const leaders = pick<SVGLineElement>(".note-line");
    const rings = pick<SVGCircleElement>(".note-ring");
    const coords = pick<SVGTextElement>(".note-coord");

    const targets = labels.map(() => 0);
    const anchors = labels.map(() => ({ x: 0, y: 0 }));
    let round = 0;
    let shown = false;

    /** Each slot takes the vertex currently furthest toward its own side. */
    const assign = () => {
      const taken = new Set<number>();
      labels.forEach((_, slot) => {
        const left = SLOTS[slot].side === "left";
        let best = 0;
        let bestX = left ? Infinity : -Infinity;
        for (let i = 0; i < 16; i++) {
          if (taken.has(i)) continue;
          const x = SCREEN[i * 2];
          if (left ? x < bestX : x > bestX) {
            best = i;
            bestX = x;
          }
        }
        taken.add(best);
        targets[slot] = best;
      });
    };

    const aim = () => {
      if (!shown) return;
      labels.forEach((_, slot) => {
        const i = targets[slot];
        const x = SCREEN[i * 2];
        const y = SCREEN[i * 2 + 1];
        const leader = leaders[slot];
        leader.setAttribute("x1", x.toFixed(1));
        leader.setAttribute("y1", y.toFixed(1));
        leader.setAttribute("x2", anchors[slot].x.toFixed(1));
        leader.setAttribute("y2", anchors[slot].y.toFixed(1));
        rings[slot].setAttribute("cx", x.toFixed(1));
        rings[slot].setAttribute("cy", y.toFixed(1));
        coords[slot].setAttribute("x", (x + 9).toFixed(1));
        coords[slot].setAttribute("y", (y - 9).toFixed(1));
      });
    };

    const show = () => {
      assign();
      labels.forEach((label, slot) => {
        const fact = FACTS[(round * count + slot) % FACTS.length];
        texts[slot].textContent = fact;
        coords[slot].textContent = `(${VERTICES[targets[slot]].join(",")})`;
        // The line meets the label at its inner edge, mid-height.
        const left = SLOTS[slot].side === "left";
        anchors[slot].x = left ? label.offsetLeft + label.offsetWidth + 8 : label.offsetLeft - 8;
        anchors[slot].y = label.offsetTop + label.offsetHeight / 2;
        scramble(texts[slot], fact, { duration: 0.7, delay: slot * 0.12 });
      });
      shown = true;
      aim();
      gsap.killTweensOf([labels, leaders, rings, coords]);
      gsap.to(leaders, { strokeDashoffset: 0, duration: 0.6, ease: "power2.out", stagger: 0.12 });
      gsap.to([...rings, ...coords], { autoAlpha: 1, duration: 0.3, stagger: 0.04 });
      gsap.to(labels, { autoAlpha: 1, duration: 0.4, stagger: 0.12 });
    };

    const hide = (then?: () => void) => {
      gsap.killTweensOf([labels, leaders, rings, coords]);
      gsap.to(labels, { autoAlpha: 0, duration: 0.25 });
      gsap.to([...rings, ...coords], { autoAlpha: 0, duration: 0.25 });
      // Lines retract back into the label they came from.
      gsap.to(leaders, {
        strokeDashoffset: 1,
        duration: 0.35,
        ease: "power2.in",
        onComplete: () => {
          shown = false;
          then?.();
        },
      });
    };

    if (!primed.current) {
      primed.current = true;
      gsap.set(leaders, { strokeDashoffset: 1 });
      gsap.set([...labels, ...rings, ...coords], { autoAlpha: 0 });
    }
    if (!active) return;

    gsap.ticker.add(aim);
    show();
    const cycle = window.setInterval(() => {
      hide(() => {
        round++;
        show();
      });
    }, 3000);

    return () => {
      window.clearInterval(cycle);
      hide(() => gsap.ticker.remove(aim));
    };
  }, [active]);

  return (
    <div ref={root} className="notes" aria-hidden="true">
      <svg className="notes-lines" focusable="false">
        {SLOTS.map((slot, i) => (
          <g key={i}>
            <line className="note-line" pathLength={1} />
            <circle className="note-ring" r={5} />
            <text className="note-coord" />
          </g>
        ))}
      </svg>
      {SLOTS.map((slot, i) => (
        <p key={i} className="note" data-side={slot.side} style={slot.style}>
          <span className="note-slash">{"//"}</span> <span className="note-text" />
        </p>
      ))}
    </div>
  );
}

/**
 * A tesseract: rotated in the XW / YW / ZW planes every frame, perspective-
 * projected 4D → 3D, and drawn as crisp lines with glowing vertices. The
 * inner cube continuously passes through the outer one. It tilts toward the
 * cursor, can be dragged, spins faster with scroll velocity, and changes
 * rotation plane and tint with the hovered skill group. Hovering it (or
 * tapping, on touch) slows it down and brings up the annotations.
 */
export default function Tesseract() {
  const [annotated, setAnnotated] = useState(false);
  const moved = useRef(0);

  const annotate = (on: boolean) => {
    view.annotated = on;
    setAnnotated(on);
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    view.dragging = true;
    view.lastX = e.clientX;
    view.lastY = e.clientY;
    moved.current = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!view.dragging) return;
    const dx = e.clientX - view.lastX;
    const dy = e.clientY - view.lastY;
    moved.current += Math.abs(dx) + Math.abs(dy);
    view.x += dx * 0.008;
    view.y = clamp(view.y + dy * 0.008, -1.2, 1.2);
    view.lastX = e.clientX;
    view.lastY = e.clientY;
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    view.dragging = false;
    // Touch has no hover: a tap (not a drag) toggles the annotations.
    if (e.pointerType !== "mouse" && moved.current < 8) annotate(!view.annotated);
  };

  useEffect(
    () => () => {
      view.annotated = false;
    },
    [],
  );

  return (
    <div
      className="tesseract"
      onPointerEnter={(e) => e.pointerType === "mouse" && annotate(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && annotate(false)}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={() => {
        view.dragging = false;
      }}
    >
      <CanvasShell
        className="tesseract-canvas"
        flat
        maxDpr={2}
        camera={{ position: [0, 0, 6.2], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <Hypercube />
      </CanvasShell>
      <Notes active={annotated} />
    </div>
  );
}
