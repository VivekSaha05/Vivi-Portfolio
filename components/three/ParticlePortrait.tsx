"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import CanvasShell from "@/components/three/CanvasShell";
import { useAppStore } from "@/hooks/useAppStore";
import { useThemeColors } from "@/hooks/useThemeColors";
import { pointer } from "@/lib/pointer";
import { appStore, motion } from "@/lib/store";
import { damp, lerp, mulberry32 } from "@/lib/utils";
import { portraitFragment, portraitVertex, TRAIL_LENGTH } from "@/shaders/portrait";

type Crop = { x: number; y: number; w: number; h: number };

type Sampled = {
  count: number;
  rows: number;
  positions: Float32Array;
  scatter: Float32Array;
  lum: Float32Array;
  alpha: Float32Array;
  seed: Float32Array;
  edge: Float32Array;
  ambient: Float32Array;
};

const CAMERA_Z = 5;
const FOV = 35;
const VISIBLE_HEIGHT = 2 * CAMERA_Z * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const PLANE_HEIGHT = 2.7;
/** The crop from the data file is widened by this much so the field has room to feather. */
const WIDEN = 1.55;
/** Share of extra particles that orbit the portrait instead of joining it. */
const AMBIENT = 0.2;
/** Face centre and the ellipse (plane units) inside which the portrait is solid. */
const FOCUS = { x: 0, y: 0.3, rx: 1.3, ry: 1.5 };

const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Turns the photo into a point field: one particle per sampled pixel, carrying
 * its luminance and its distance from the face centre. The flat studio
 * backdrop is detected (low saturation, mid luminance) and thinned out, and
 * everything is feathered by an ellipse so there is no rectangular edge.
 */
async function samplePortrait(src: string, crop: Crop, cols: number): Promise<Sampled> {
  const image = new Image();
  image.src = src;
  await image.decode();

  const cw = Math.min(1, crop.w * WIDEN);
  const cx = Math.min(1 - cw, Math.max(0, crop.x - (cw - crop.w) / 2));
  const sx = image.naturalWidth * cx;
  const sy = image.naturalHeight * crop.y;
  const sw = image.naturalWidth * cw;
  const sh = image.naturalHeight * crop.h;
  const aspect = sw / sh;
  const rows = Math.round(cols / aspect);

  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2D canvas unavailable");
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, cols, rows);
  const pixels = ctx.getImageData(0, 0, cols, rows).data;

  const max = Math.ceil(cols * rows * (1 + AMBIENT));
  const positions = new Float32Array(max * 3);
  const scatter = new Float32Array(max * 3);
  const lum = new Float32Array(max);
  const alpha = new Float32Array(max);
  const seed = new Float32Array(max);
  const edge = new Float32Array(max);
  const ambient = new Float32Array(max);
  const random = mulberry32(20260513);
  const width = PLANE_HEIGHT * aspect;
  let count = 0;

  const scatterTo = (i: number) => {
    scatter[i * 3] = (random() - 0.5) * 9;
    scatter[i * 3 + 1] = (random() - 0.5) * 6.5;
    scatter[i * 3 + 2] = (random() - 0.5) * 4;
  };

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const r = pixels[i] / 255;
      const g = pixels[i + 1] / 255;
      const b = pixels[i + 2] / 255;
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const hi = Math.max(r, g, b);
      const saturation = hi > 0 ? (hi - Math.min(r, g, b)) / hi : 0;

      // Skin is saturated, hair and shirt are very dark; the backdrop is neither.
      const subject = Math.max(
        smoothstep(0.1, 0.26, saturation),
        smoothstep(0.24, 0.1, luminance),
      );

      const px = ((x / (cols - 1)) * 2 - 1) * (width / 2);
      const py = (1 - (y / (rows - 1)) * 2) * (PLANE_HEIGHT / 2);
      const distance = Math.hypot((px - FOCUS.x) / FOCUS.rx, (py - FOCUS.y) / FOCUS.ry);
      const rim = smoothstep(0.5, 1, distance);

      const keep = random();
      // Past the ellipse nothing survives; toward it, fewer and fewer do.
      if (rim >= 1 || keep < rim * 0.75) continue;
      if (subject < 0.5 && keep < 0.55) continue;

      positions[count * 3] = px;
      positions[count * 3 + 1] = py;
      positions[count * 3 + 2] = 0;
      scatterTo(count);
      lum[count] = Math.pow(Math.min(1, Math.max(0, (luminance - 0.04) / 0.8)), 0.85);
      alpha[count] = lerp(0.16, 1, subject);
      seed[count] = random();
      edge[count] = rim;
      ambient[count] = 0;
      count++;
    }
  }

  // Ambient dust. `alpha` doubles as its orbit spread, `scatter.z` as its speed.
  const extra = Math.round(count * AMBIENT);
  for (let n = 0; n < extra; n++) {
    scatterTo(count);
    lum[count] = 0.5;
    alpha[count] = random();
    seed[count] = random();
    edge[count] = 0;
    ambient[count] = 1;
    count++;
  }

  return {
    count,
    rows,
    positions: positions.subarray(0, count * 3),
    scatter: scatter.subarray(0, count * 3),
    lum: lum.subarray(0, count),
    alpha: alpha.subarray(0, count),
    seed: seed.subarray(0, count),
    edge: edge.subarray(0, count),
    ambient: ambient.subarray(0, count),
  };
}

function Cloud({ data }: { data: Sampled }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const colors = useThemeColors();
  const theme = useAppStore((s) => s.theme);
  const cursor = useRef({ x: 99, y: 99, lastX: 99, lastY: 99, slot: 0 });

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
    g.setAttribute("aScatter", new THREE.BufferAttribute(data.scatter, 3));
    g.setAttribute("aLum", new THREE.BufferAttribute(data.lum, 1));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(data.alpha, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(data.seed, 1));
    g.setAttribute("aEdge", new THREE.BufferAttribute(data.edge, 1));
    g.setAttribute("aAmbient", new THREE.BufferAttribute(data.ambient, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);
    return g;
  }, [data]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uSize: { value: 20 },
      uPixelRatio: { value: 1 },
      // Starts on the right side so the first frame never shows the wrong mode.
      uTheme: { value: appStore.get().theme === "light" ? 1 : 0 },
      uTrail: {
        value: Array.from({ length: TRAIL_LENGTH }, () => new THREE.Vector3(99, 99, 0)),
      },
      // Dark ramp is dimmed a little: additive points overlap and would clip to white.
      uDarkLow: { value: new THREE.Color("#221F29") },
      uDarkHigh: { value: new THREE.Color("#B9B1A6") },
      uLightLow: { value: new THREE.Color("#B8AED6") },
      uLightHigh: { value: new THREE.Color("#1A1A1C") },
      uMid: { value: new THREE.Color() },
    }),
    [],
  );

  const tones = useMemo(
    () => ({
      // Violet mids, slightly held back in dark mode for the same additive reason.
      mid: new THREE.Color(colors.violet).multiplyScalar(theme === "dark" ? 0.72 : 1),
      theme: theme === "light" ? 1 : 0,
    }),
    [colors, theme],
  );

  useFrame((state, delta) => {
    const u = material.current?.uniforms;
    if (!u) return;
    u.uTime.value = state.clock.elapsedTime;
    u.uPixelRatio.value = state.viewport.dpr;
    u.uMid.value.lerp(tones.mid, damp(5, delta));
    // ~0.6s cross-over between the additive (dark) and ink (light) looks.
    u.uTheme.value = lerp(u.uTheme.value, tones.theme, damp(5.5, delta));
    // Size points to the sampling grid so they just touch at any canvas size.
    const spacing = (state.size.height * (PLANE_HEIGHT / VISIBLE_HEIGHT)) / data.rows;
    u.uSize.value = spacing * CAMERA_Z * 1.3;
    u.uProgress.value = lerp(u.uProgress.value, motion.portrait, damp(4, delta));

    // The canvas ignores pointer events (it overlaps the text beside it), so
    // the cursor is projected onto the portrait plane from its page position.
    const rect = state.gl.domElement.getBoundingClientRect();
    const visibleWidth = VISIBLE_HEIGHT * (rect.width / rect.height);
    const targetX = ((pointer.x - rect.left) / rect.width - 0.5) * visibleWidth;
    const targetY = (0.5 - (pointer.y - rect.top) / rect.height) * VISIBLE_HEIGHT;
    // The ripple follows a smoothed cursor, so it glides instead of snapping.
    const c = cursor.current;
    if (c.x > 50) {
      c.x = targetX;
      c.y = targetY;
    }
    c.x = lerp(c.x, targetX, 0.1);
    c.y = lerp(c.y, targetY, 0.1);
    const x = c.x;
    const y = c.y;

    // The wake: drop a fresh point whenever the cursor has moved far enough,
    // and let every point's strength decay so the particles drift back.
    const trail = u.uTrail.value as THREE.Vector3[];
    // Strength decays quickly: particles are back in place in well under a second.
    const fade = Math.exp(-delta * 3.6);
    for (const point of trail) point.z *= fade;
    if (pointer.active && Math.hypot(x - c.lastX, y - c.lastY) > 0.03) {
      trail[c.slot].set(x, y, 1);
      c.slot = (c.slot + 1) % TRAIL_LENGTH;
      c.lastX = x;
      c.lastY = y;
    }
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={portraitVertex}
        fragmentShader={portraitFragment}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.CustomBlending}
        blendSrc={THREE.OneFactor}
        blendDst={THREE.OneMinusSrcAlphaFactor}
        blendSrcAlpha={THREE.OneFactor}
        blendDstAlpha={THREE.OneMinusSrcAlphaFactor}
      />
    </points>
  );
}

export default function ParticlePortrait({ src, crop }: { src: string; crop: Crop }) {
  const [data, setData] = useState<Sampled | null>(null);

  useEffect(() => {
    let cancelled = false;
    // ~30k points on desktop, ~10k on phones (face + ambient). Read once here
    // rather than from a hook, so the photo is never sampled twice.
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    samplePortrait(src, crop, mobile ? 132 : 236)
      .then((sampled) => {
        if (!cancelled) setData(sampled);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [src, crop]);

  return (
    <CanvasShell
      className="portrait-canvas"
      flat
      camera={{ position: [0, 0, CAMERA_Z], fov: FOV, near: 0.1, far: 30 }}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
    >
      {data && <Cloud key={data.count} data={data} />}
    </CanvasShell>
  );
}
