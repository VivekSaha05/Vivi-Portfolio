"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Line,
  MeshTransmissionMaterial,
  useProgress,
  useTexture,
} from "@react-three/drei";
import { ChromaticAberration, EffectComposer } from "@react-three/postprocessing";
import type { ChromaticAberrationEffect } from "postprocessing";
import CanvasShell from "@/components/three/CanvasShell";
import { projects } from "@/data/portfolio";
import { useAppStore } from "@/hooks/useAppStore";
import { useFullMotion, useReducedMotion } from "@/hooks/useMediaQuery";
import { useThemeColors } from "@/hooks/useThemeColors";
import { gsap } from "@/lib/gsap";
import { pointer } from "@/lib/pointer";
import { loading, motion } from "@/lib/store";
import { clamp, damp, lerp, mulberry32 } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Geometry helpers: everything in the scene is drawn from polylines.         */
/* -------------------------------------------------------------------------- */

type P3 = [number, number, number];
type Tone = "violet" | "taupe" | "text" | "muted" | "line";

function rect(w: number, h: number, r = 0, cx = 0, cy = 0): P3[] {
  const x = w / 2;
  const y = h / 2;
  if (r === 0) {
    return [
      [cx - x, cy - y, 0],
      [cx + x, cy - y, 0],
      [cx + x, cy + y, 0],
      [cx - x, cy + y, 0],
      [cx - x, cy - y, 0],
    ];
  }
  const pts: P3[] = [];
  const corners: [number, number, number][] = [
    [x - r, y - r, 0],
    [-(x - r), y - r, Math.PI / 2],
    [-(x - r), -(y - r), Math.PI],
    [x - r, -(y - r), Math.PI * 1.5],
  ];
  for (const [ox, oy, start] of corners) {
    for (let i = 0; i <= 6; i++) {
      const a = start + (i / 6) * (Math.PI / 2);
      pts.push([cx + ox + Math.cos(a) * r, cy + oy + Math.sin(a) * r, 0]);
    }
  }
  pts.push(pts[0]);
  return pts;
}

function circle(r: number, cx = 0, cy = 0, n = 28): P3[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0] as P3;
  });
}

const path = (pts: [number, number][]): P3[] => pts.map(([x, y]) => [x, y, 0]);

function brace(side: 1 | -1, x: number): P3[] {
  const curve = new THREE.CatmullRomCurve3(
    (
      [
        [0.16, 0.52],
        [0.03, 0.46],
        [0, 0.3],
        [0, 0.12],
        [-0.13, 0],
        [0, -0.12],
        [0, -0.3],
        [0.03, -0.46],
        [0.16, -0.52],
      ] as [number, number][]
    ).map(([px, py]) => new THREE.Vector3(x + px * side, py, 0)),
  );
  return curve.getPoints(40).map((p) => [p.x, p.y, 0] as P3);
}

/** Rounded slab used for the glass panes. */
function panelGeometry(w: number, h: number, r: number, depth: number) {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 3,
    curveSegments: 8,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

/* Static line work, built once at module load. */
const WIN_W = 4.8;
const WIN_H = 3.3;
const SHAPES = {
  window: rect(WIN_W, WIN_H, 0.14),
  titleBar: path([
    [-WIN_W / 2, WIN_H / 2 - 0.4],
    [WIN_W / 2, WIN_H / 2 - 0.4],
  ]),
  dots: [-2.12, -1.95, -1.78].map((x) => circle(0.045, x, WIN_H / 2 - 0.2, 14)),
  url: rect(1.9, 0.17, 0.085, 0.25, WIN_H / 2 - 0.2),
  list: rect(0.86, 2.5, 0.06),
  listRows: [0.9, 0.55, 0.2, -0.15, -0.5].map((y, i) =>
    path([
      [-0.28, y],
      [-0.28 + [0.5, 0.36, 0.44, 0.3, 0.4][i], y],
    ]),
  ),
  card: rect(1.45, 1.5, 0.1),
  cardImage: rect(1.21, 0.7, 0.05, 0, 0.28),
  mountain: path([
    [-0.6, -0.07],
    [-0.28, 0.3],
    [-0.08, 0.1],
    [0.18, 0.44],
    [0.6, -0.07],
  ]),
  sun: circle(0.07, 0.38, 0.47, 16),
  cardText: [
    path([
      [-0.6, -0.3],
      [0.3, -0.3],
    ]),
    path([
      [-0.6, -0.5],
      [0.05, -0.5],
    ]),
  ],
  chartBase: path([
    [-0.55, -0.5],
    [0.55, -0.5],
  ]),
  chartBars: [0.35, 0.62, 0.48, 0.9, 0.7].map((h, i) =>
    path([
      [-0.44 + i * 0.22, -0.5],
      [-0.44 + i * 0.22, -0.5 + h],
    ]),
  ),
  chartTitle: path([
    [-0.55, 0.55],
    [-0.05, 0.55],
  ]),
  button: rect(1.12, 0.38, 0.19),
  buttonLabel: path([
    [-0.28, 0],
    [0.28, 0],
  ]),
  sliderTrack: path([
    [-0.7, 0],
    [0.7, 0],
  ]),
  sliderFill: path([
    [-0.7, 0],
    [0.1, 0],
  ]),
  knob: circle(0.09, 0, 0, 20),
  arrow: path([
    [0, 0],
    [0, -0.46],
    [0.115, -0.35],
    [0.2, -0.54],
    [0.275, -0.505],
    [0.19, -0.32],
    [0.34, -0.31],
    [0, 0],
  ]),
  tag: [
    path([
      [-0.42, 0.3],
      [-0.72, 0],
      [-0.42, -0.3],
    ]),
    path([
      [-0.12, -0.36],
      [0.12, 0.36],
    ]),
    path([
      [0.42, 0.3],
      [0.72, 0],
      [0.42, -0.3],
    ]),
  ],
  braces: [brace(1, -0.3), brace(-1, 0.3)],
  chip: rect(1.3, 0.8, 0.1),
  chipRows: [
    path([
      [-0.42, 0.14],
      [0.2, 0.14],
    ]),
    path([
      [-0.42, -0.1],
      [0.42, -0.1],
    ]),
  ],
  chipDot: circle(0.05, 0.42, 0.16, 14),
  // Segment pairs, drawn as a single LineSegments2 (one draw call for all 13).
  guides: Array.from({ length: 13 }, (_, i) => {
    const x = -WIN_W / 2 + (i / 12) * WIN_W;
    return path([
      [x, -2.35],
      [x, 2.35],
    ]);
  }).flat(),
};

/* -------------------------------------------------------------------------- */
/*  Shared scene state                                                         */
/* -------------------------------------------------------------------------- */

const BASE_Z = 9;
const BASE_FOV = 38;
const FRAGMENT_TRAVEL = 1.5;
const FRAGMENT_STAGGER = 0.085;
const FRAGMENTS = 11;
const ASSEMBLY_TOTAL = FRAGMENT_TRAVEL + FRAGMENT_STAGGER * FRAGMENTS + 0.6;

/** Seconds since the fragments were released; driven by one GSAP tween. */
const assembly = { t: 0 };

const flyIn = gsap.parseEase("expo.inOut");
const snap = gsap.parseEase("back.out(1.6)");

type ScenePalette = Record<Tone, string> & { bg: THREE.Color; glass: THREE.Color };
const PaletteContext = createContext<ScenePalette | null>(null);

function usePalette() {
  const palette = useContext(PaletteContext);
  if (!palette) throw new Error("PaletteContext is missing");
  return palette;
}

/* -------------------------------------------------------------------------- */
/*  Building blocks                                                            */
/* -------------------------------------------------------------------------- */

function Stroke({
  points,
  tone = "violet",
  width = 1.25,
  opacity = 1,
  segments = false,
}: {
  points: P3[];
  tone?: Tone;
  width?: number;
  opacity?: number;
  /** Treat the points as independent pairs instead of one polyline. */
  segments?: boolean;
}) {
  const palette = usePalette();
  // Line2 + LineMaterial: width is in screen pixels and resolution-aware, so
  // strokes stay crisp at any DPR (unlike 1px gl.LINES).
  return (
    <Line
      points={points}
      color={palette[tone]}
      lineWidth={width}
      worldUnits={false}
      segments={segments}
      transparent
      opacity={opacity}
      depthWrite={false}
    />
  );
}

/**
 * One UI primitive. It starts scattered (position + rotation derived from its
 * index), flies in on its own beat, overshoots slightly and locks onto the
 * layout grid, then keeps a faint idle drift.
 */
function Fragment({
  index,
  position,
  rotation = [0, 0, 0],
  children,
}: {
  index: number;
  position: P3;
  rotation?: P3;
  children: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const [px, py, pz] = position;
  const [rx, ry, rz] = rotation;

  const data = useMemo(() => {
    const random = mulberry32(index * 977 + 13);
    const direction = new THREE.Vector3(
      random() * 2 - 1,
      random() * 2 - 1,
      random() * 2 - 1,
    ).normalize();
    return {
      start: direction.multiplyScalar(5 + random() * 5).add(new THREE.Vector3(0, 0, -3)),
      end: new THREE.Vector3(px, py, pz),
      startQ: new THREE.Quaternion().setFromEuler(
        new THREE.Euler((random() - 0.5) * 4, (random() - 0.5) * 4, (random() - 0.5) * 3),
      ),
      endQ: new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      phase: random() * Math.PI * 2,
      delay: index * FRAGMENT_STAGGER,
    };
  }, [index, px, py, pz, rx, ry, rz]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const raw = clamp((assembly.t - data.delay) / FRAGMENT_TRAVEL, 0, 1);
    const p = snap(flyIn(raw));
    g.position.lerpVectors(data.start, data.end, p);
    g.quaternion.slerpQuaternions(data.startQ, data.endQ, Math.min(p, 1));

    const t = clock.elapsedTime;
    const settled = raw * raw;
    g.position.y += Math.sin(t * 0.6 + data.phase) * 0.035 * settled;
    g.position.z += Math.cos(t * 0.5 + data.phase) * 0.06 * settled;
    g.visible = raw > 0.001;
  });

  return (
    <group ref={group} visible={false}>
      {children}
    </group>
  );
}

function GlassPane({
  size,
  radius,
  real,
}: {
  size: [number, number];
  radius: number;
  real: boolean;
}) {
  const palette = usePalette();
  const [w, h] = size;
  const geometry = useMemo(() => panelGeometry(w, h, radius, 0.05), [w, h, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry}>
      {real ? (
        <MeshTransmissionMaterial
          samples={10}
          resolution={1024}
          transmission={1}
          thickness={0.22}
          roughness={0.05}
          ior={1.1}
          chromaticAberration={0.02}
          distortion={0}
          temporalDistortion={0}
          color={palette.glass}
          background={palette.bg}
        />
      ) : (
        <meshBasicMaterial
          color={palette.violet}
          transparent
          opacity={0.07}
          depthWrite={false}
        />
      )}
    </mesh>
  );
}

/** Column guides that flash when the layout locks, then stay as a whisper. */
function Guides() {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const lock = clamp((assembly.t - (ASSEMBLY_TOTAL - 1.3)) / 0.5, 0, 1);
    const settle = clamp((assembly.t - (ASSEMBLY_TOTAL - 0.8)) / 0.8, 0, 1);
    const opacity = lock * lerp(0.34, 0.07, settle);
    g.visible = opacity > 0.001;
    g.scale.y = lerp(0.2, 1, lock);
    for (const child of g.children) {
      const material = (child as THREE.Mesh).material as THREE.Material;
      material.opacity = opacity;
    }
  });

  return (
    <group ref={group} position={[0, 0.3, -0.7]} visible={false}>
      <Stroke points={SHAPES.guides} tone="violet" width={1} opacity={0} segments />
    </group>
  );
}

function SliderKnob() {
  const knob = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (knob.current) knob.current.position.x = 0.1 + Math.sin(clock.elapsedTime * 0.9) * 0.22;
  });
  return (
    <group ref={knob}>
      <Stroke points={SHAPES.knob} tone="violet" width={1.4} />
    </group>
  );
}

/** Mouse parallax/tilt on the whole layout, plus the scroll-driven dolly back. */
function Rig({ children }: { children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const size = useThree((s) => s.size);

  const visibleHeight = 2 * BASE_Z * Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2));
  const visibleWidth = visibleHeight * (size.width / size.height);
  const portrait = visibleWidth < visibleHeight;
  const scale = portrait ? visibleWidth / 5.6 : clamp(visibleWidth / 12.6, 0.55, 1.1);
  const baseX = portrait ? 0 : visibleWidth * 0.17;
  const baseY = portrait ? visibleHeight * 0.2 : 0.05;

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const k = damp(3.2, delta);
    g.rotation.y = lerp(g.rotation.y, -0.2 + pointer.nx * 0.16, k);
    g.rotation.x = lerp(g.rotation.x, 0.06 - pointer.ny * 0.1, k);
    g.position.x = lerp(g.position.x, baseX + pointer.nx * 0.14, k);
    g.position.y = lerp(g.position.y, baseY + pointer.ny * 0.1, k);

    // As the About card slides over the hero, the camera eases straight back:
    // the scene recedes in depth while the DOM headline holds its place.
    state.camera.position.z = lerp(BASE_Z, BASE_Z + 1.8, motion.dolly);
  });

  return (
    <group ref={group} position={[baseX, baseY, 0]} scale={scale}>
      {children}
    </group>
  );
}

/** Lens fringing only while the scene recedes: exactly zero (crisp) at rest. */
function Aberration() {
  const effect = useRef<ChromaticAberrationEffect>(null);
  useFrame(() => {
    effect.current?.offset.setScalar(motion.dolly * 0.0016);
  });
  return <ChromaticAberration ref={effect} radialModulation modulationOffset={0.25} />;
}

/**
 * Compiles every shader in the scene before the first frame is drawn, using
 * the driver's parallel compile path. The glass material alone can take over a
 * second to compile; done synchronously that would freeze the loader.
 */
function Precompile({ offscreen, onDone }: { offscreen: boolean; onDone: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    let live = true;
    const finish = () => {
      if (live) onDone();
    };
    // Three keys each program on the colour space of the target it renders to.
    // With post-processing the scene is drawn into linear buffers, so compile
    // against one; otherwise the first real frame would recompile everything.
    const target = offscreen
      ? new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType })
      : null;
    if (target) gl.setRenderTarget(target);
    const pending = gl.compileAsync(scene, camera);
    if (target) gl.setRenderTarget(null);
    pending.then(finish, finish).finally(() => target?.dispose());
    // Never leave the scene blank if the driver doesn't report completion.
    const fallback = window.setTimeout(finish, 5000);
    return () => {
      live = false;
      window.clearTimeout(fallback);
    };
  }, [gl, scene, camera, offscreen, onDone]);

  return null;
}

/** Reports the first rendered frame and Three's own asset loading to the loader. */
function LoadReporter() {
  const { progress, total } = useProgress();
  const reported = useRef(false);

  useEffect(() => {
    if (total > 0) loading.report("textures", progress / 100);
  }, [progress, total]);

  useFrame(() => {
    if (reported.current) return;
    reported.current = true;
    loading.report("scene", 1);
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/*  The scene                                                                  */
/* -------------------------------------------------------------------------- */

function Layout({ glass }: { glass: boolean }) {
  return (
    <>
      <Guides />

      {/* Browser window: the frame everything else resolves into. */}
      <Fragment index={0} position={[0, 0.3, 0]}>
        <GlassPane size={[WIN_W, WIN_H]} radius={0.14} real={glass} />
        <Stroke points={SHAPES.window} tone="violet" width={1.4} />
        <Stroke points={SHAPES.titleBar} tone="line" />
        {SHAPES.dots.map((points, i) => (
          <Stroke key={i} points={points} tone="taupe" />
        ))}
        <Stroke points={SHAPES.url} tone="muted" opacity={0.7} />
      </Fragment>

      {/* Sidebar list */}
      <Fragment index={1} position={[-1.85, 0.05, 0.3]}>
        <Stroke points={SHAPES.list} tone="line" />
        {SHAPES.listRows.map((points, i) => (
          <Stroke
            key={i}
            points={points}
            tone={i === 1 ? "violet" : "muted"}
            width={i === 1 ? 1.6 : 1.1}
            opacity={i === 1 ? 1 : 0.7}
          />
        ))}
      </Fragment>

      {/* Media card */}
      <Fragment index={2} position={[-0.5, 0.45, 0.55]}>
        <Stroke points={SHAPES.card} tone="violet" />
        <Stroke points={SHAPES.cardImage} tone="line" />
        <Stroke points={SHAPES.mountain} tone="taupe" />
        <Stroke points={SHAPES.sun} tone="taupe" />
        {SHAPES.cardText.map((points, i) => (
          <Stroke key={i} points={points} tone="muted" opacity={0.75} />
        ))}
      </Fragment>

      {/* Chart card */}
      <Fragment index={3} position={[1.2, 0.45, 0.4]}>
        <Stroke points={SHAPES.card} tone="line" />
        <Stroke points={SHAPES.chartTitle} tone="muted" opacity={0.75} />
        <Stroke points={SHAPES.chartBase} tone="muted" opacity={0.6} />
        {SHAPES.chartBars.map((points, i) => (
          <Stroke key={i} points={points} tone="violet" width={i === 3 ? 2.2 : 1.6} />
        ))}
      </Fragment>

      {/* Button */}
      <Fragment index={4} position={[-0.68, -0.9, 0.75]}>
        <Stroke points={SHAPES.button} tone="violet" width={1.5} />
        <Stroke points={SHAPES.buttonLabel} tone="text" width={1.6} />
      </Fragment>

      {/* Slider */}
      <Fragment index={5} position={[1.2, -0.9, 0.6]}>
        <Stroke points={SHAPES.sliderTrack} tone="line" />
        <Stroke points={SHAPES.sliderFill} tone="violet" width={1.6} />
        <SliderKnob />
      </Fragment>

      {/* Cursor arrow, hovering over the button */}
      <Fragment index={6} position={[-0.32, -0.98, 1.2]} rotation={[0, 0, 0.05]}>
        <Stroke points={SHAPES.arrow} tone="text" width={1.5} />
      </Fragment>

      {/* < /> */}
      <Fragment index={7} position={[-3.05, 2.1, 0.95]} rotation={[0, 0.25, -0.08]}>
        {SHAPES.tag.map((points, i) => (
          <Stroke key={i} points={points} tone="taupe" width={1.6} />
        ))}
      </Fragment>

      {/* { } */}
      <Fragment index={8} position={[3.05, -1.5, 0.9]} rotation={[0, -0.3, 0.06]}>
        {SHAPES.braces.map((points, i) => (
          <Stroke key={i} points={points} tone="violet" width={1.6} />
        ))}
      </Fragment>

      {/* Floating glass chip (a toast / tooltip) */}
      <Fragment index={9} position={[2.5, 1.75, 1.3]} rotation={[0.05, -0.28, 0.04]}>
        {/* Tinted, not refractive: two transmission panes that overlap sample each
            other's stale buffer and leave a dark patch. */}
        <GlassPane size={[1.3, 0.8]} radius={0.1} real={false} />
        <Stroke points={SHAPES.chip} tone="taupe" />
        {SHAPES.chipRows.map((points, i) => (
          <Stroke key={i} points={points} tone="muted" opacity={0.8} />
        ))}
        <Stroke points={SHAPES.chipDot} tone="violet" />
      </Fragment>

      {/* A second, smaller window peeking out behind the main one */}
      <Fragment index={10} position={[-2.75, -1.35, -0.9]} rotation={[0, 0.3, 0]}>
        <Stroke points={SHAPES.card} tone="line" />
        <Stroke points={SHAPES.cardText[0]} tone="muted" opacity={0.6} />
        <Stroke points={SHAPES.chartTitle} tone="violet" opacity={0.8} />
      </Fragment>
    </>
  );
}

export default function HeroScene() {
  const colors = useThemeColors();
  const theme = useAppStore((s) => s.theme);
  // Released when the loader lifts, and again each time a page transition
  // uncovers the home page: the layout "recompiles" on return.
  const ready = useAppStore((s) => s.ready && !s.covered);
  const full = useFullMotion();
  const reduced = useReducedMotion();
  const [compiled, setCompiled] = useState(false);
  const markCompiled = useCallback(() => setCompiled(true), []);

  const palette = useMemo<ScenePalette>(
    () => ({
      violet: colors.violet,
      taupe: colors.taupe,
      text: colors.text,
      muted: colors.muted,
      line: theme === "dark" ? "#4A4852" : "#B9B2A8",
      bg: new THREE.Color(colors.bg),
      glass: new THREE.Color(theme === "dark" ? "#F1EEFA" : "#FFFFFF"),
    }),
    [colors, theme],
  );

  useEffect(() => {
    // The chunk is in: half of the "scene" task. The first frame is the rest.
    loading.report("scene", 0.5);
    // Warm the project covers through Three's loading manager so the loader's
    // progress reflects them and the cards never pop in.
    useTexture.preload(projects.items.map((p) => p.image));
  }, []);

  // Release the fragments the moment the loader starts to lift.
  useEffect(() => {
    if (!ready) return;
    if (reduced) {
      assembly.t = ASSEMBLY_TOTAL;
      return;
    }
    const tween = gsap.fromTo(
      assembly,
      { t: 0 },
      { t: ASSEMBLY_TOTAL, duration: ASSEMBLY_TOTAL, ease: "none", delay: 0.1 },
    );
    return () => {
      tween.kill();
    };
  }, [ready, reduced]);

  return (
    <CanvasShell
      className="hero-canvas"
      paused={!compiled}
      maxDpr={2}
      flat
      camera={{ position: [0, 0, BASE_Z], fov: BASE_FOV, near: 0.1, far: 60 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={[colors.bg]} />
      <LoadReporter />

      <PaletteContext value={palette}>
        <Rig>
          <Layout glass={full} />
        </Rig>
      </PaletteContext>

      {full && (
        <>
          {/* Plain lights give the glass its highlights. An environment map looks
              marginally richer but costs ~0.4s of blocking PMREM setup at load. */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[2, 4, 6]} intensity={2.4} />
          <pointLight position={[-4, 0.5, 3]} color={colors.violet} intensity={28} />
          <pointLight position={[5, -2, 2.5]} color={colors.taupe} intensity={14} />

          {/* Full-resolution, 8× MSAA. No bloom or blur: nothing here may soften a line. */}
          <EffectComposer multisampling={8} enableNormalPass={false}>
            <Aberration />
          </EffectComposer>
        </>
      )}

      {/* Last, so its effect runs once everything above is in the scene graph. */}
      {!compiled && <Precompile offscreen={full} onDone={markCompiled} />}
    </CanvasShell>
  );
}
