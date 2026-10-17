"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import CanvasShell from "@/components/three/CanvasShell";
import { useAppStore } from "@/hooks/useAppStore";
import { useThemeColors } from "@/hooks/useThemeColors";
import { pointer } from "@/lib/pointer";
import { appStore, motion } from "@/lib/store";
import { damp, lerp, mulberry32 } from "@/lib/utils";
import { portraitFragment, portraitVertex } from "@/shaders/portrait";

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

const FOV = 35;
/** Camera distance per unit of visible height, for the FOV above. */
const Z_PER_HEIGHT = 1 / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
const PLANE_HEIGHT = 2.7;
/**
 * The head on the portrait plane (plane units): hair top to just under the
 * chin, and its width. The camera is fitted to the portrait column so the
 * head fills it; the shoulders and the halo run off into the radial mask.
 */
const FACE = { top: 1.35, bottom: -0.55, width: 1.6 };
const FACE_CENTRE = (FACE.top + FACE.bottom) / 2;
const FACE_HEIGHT = FACE.top - FACE.bottom;
/**
 * Head size against the portrait column: its share of the column's height,
 * capped at a share of the canvas width (desktop / phone).
 */
const FILL = { desktop: 1, mobile: 0.8 };
const FILL_WIDTH = { desktop: 0.57, mobile: 0.95 };
/**
 * The crop from the data file is widened by this much (to nearly the whole
 * photo) so the halo has room to spread across the canvas.
 */
const WIDEN = 1.9;
/** Ambient particles, as a share of the portrait's: they orbit outside the face. */
const AMBIENT = 0.35;
/** Face centre and the ellipse (plane units) inside which the portrait is solid. */
const FOCUS = { x: 0, y: 0.3, rx: 1.3, ry: 1.5 };
/**
 * Ellipse distance (1 = the ellipse above) where the halo ends. Between 0.55
 * and this, particles thin out and loosen, drifting outward with a feathered
 * falloff instead of stopping at an edge.
 */
const HALO = 1.75;
/**
 * The shader's radial mask (plane units, around the face centre): solid to
 * 60% of these radii, gone at 100%. Wider than tall, so the halo drifts out
 * behind the text on the left.
 */
const MASK = { rx: 2.1, ry: 1.65 };
/** The ellipse (plane units) whose luminance range sets the contrast levels. */
const LEVELS_AREA = { x: 0, y: 0.35, rx: 0.75, ry: 0.9 };
/**
 * Base point diameter as a share of the sampling grid spacing; the shader
 * scales it by 0.4 → 1.3 with luminance, so highlights are big and shadows
 * small, and the sprite's soft rim keeps every dot distinct.
 */
const POINT_SCALE = 1.5;
/**
 * Sampling jitter, as a share of the grid step: barely any in the face (so
 * features stay crisp), rising to a full step in the scattered halo.
 */
const JITTER = { face: 0.25, halo: 1 };
/** Unsharp-mask strength applied to the downsampled photo before sampling. */
const SHARPEN = 0.7;
/** Hover radius as a share of the head's width. */
const HOVER_RADIUS = 0.08;
/** Largest hover displacement, CSS px: enough to feel, never enough to blur the face. */
const HOVER_SHIFT = 10;

const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Turns the photo into a point field: one particle per sampled pixel, carrying
 * its luminance and its distance from the face centre. The photo is
 * sharpened and contrast-curved first so eyes, brows, nose, lips and beard
 * stay defined. The flat studio backdrop is detected (low saturation, mid
 * luminance) and thinned out, and everything is feathered by an ellipse.
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

  const width = PLANE_HEIGHT * aspect;
  const stepX = width / (cols - 1);
  const stepY = PLANE_HEIGHT / (rows - 1);
  const planeX = (x: number) => ((x / (cols - 1)) * 2 - 1) * (width / 2);
  const planeY = (y: number) => (1 - (y / (rows - 1)) * 2) * (PLANE_HEIGHT / 2);

  // Luminance and saturation per pixel.
  const total = cols * rows;
  const luma = new Float32Array(total);
  const sat = new Float32Array(total);
  for (let n = 0; n < total; n++) {
    const r = pixels[n * 4] / 255;
    const g = pixels[n * 4 + 1] / 255;
    const b = pixels[n * 4 + 2] / 255;
    luma[n] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const hi = Math.max(r, g, b);
    sat[n] = hi > 0 ? (hi - Math.min(r, g, b)) / hi : 0;
  }

  // Unsharp mask (3×3 box blur): crisper eyes, brows and mouth edges.
  const sharp = new Float32Array(total);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let sum = 0;
      for (let j = -1; j <= 1; j++) {
        const yy = Math.min(rows - 1, Math.max(0, y + j));
        for (let k = -1; k <= 1; k++) {
          sum += luma[yy * cols + Math.min(cols - 1, Math.max(0, x + k))];
        }
      }
      const n = y * cols + x;
      sharp[n] = clamp01(luma[n] + SHARPEN * (luma[n] - sum / 9));
    }
  }

  // Levels from the face itself (3rd → 98th percentile), so the full tonal
  // range lands on the features rather than on the backdrop.
  const faceTones: number[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const d = Math.hypot(
        (planeX(x) - LEVELS_AREA.x) / LEVELS_AREA.rx,
        (planeY(y) - LEVELS_AREA.y) / LEVELS_AREA.ry,
      );
      if (d < 1) faceTones.push(sharp[y * cols + x]);
    }
  }
  faceTones.sort((a, b) => a - b);
  const black = faceTones[Math.floor(faceTones.length * 0.03)] ?? 0;
  const white = faceTones[Math.floor(faceTones.length * 0.98)] ?? 1;
  const range = Math.max(0.05, white - black);
  // Normalise, clamp levels to 0.08–0.92, then a contrast curve.
  const curve = (v: number) =>
    Math.pow(clamp01(((v - black) / range - 0.08) / 0.84), 1.4);

  const max = Math.ceil(total * (1 + AMBIENT));
  const positions = new Float32Array(max * 3);
  const scatter = new Float32Array(max * 3);
  const lum = new Float32Array(max);
  const alpha = new Float32Array(max);
  const seed = new Float32Array(max);
  const edge = new Float32Array(max);
  const ambient = new Float32Array(max);
  const random = mulberry32(20260513);
  let count = 0;

  const scatterTo = (i: number) => {
    scatter[i * 3] = (random() - 0.5) * 9;
    scatter[i * 3 + 1] = (random() - 0.5) * 6.5;
    scatter[i * 3 + 2] = (random() - 0.5) * 4;
  };

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const n = y * cols + x;
      // Skin is saturated, hair and shirt are very dark; the backdrop is neither.
      const subject = Math.max(
        smoothstep(0.1, 0.26, sat[n]),
        smoothstep(0.24, 0.1, luma[n]),
      );

      const gx = planeX(x);
      const gy = planeY(y);
      const distance = Math.hypot((gx - FOCUS.x) / FOCUS.rx, (gy - FOCUS.y) / FOCUS.ry);
      if (distance >= HALO) continue;
      // The hair touches the top of the photo: loosen that strip so it
      // dissolves upward into the halo instead of ending on the photo's edge.
      const fringe = smoothstep(PLANE_HEIGHT / 2 - 0.3, PLANE_HEIGHT / 2, gy);
      // 0 in the face, rising to 1 at the end of the halo: how loose and faint
      // a particle is, and how far the shader throws it outward.
      const rim = Math.max(smoothstep(0.5, HALO, distance), fringe * 0.75);

      const keep = random();
      // Solid inside the ellipse; past it, fewer and fewer survive.
      if (keep < smoothstep(0.55, HALO, distance) * 0.86) continue;
      if (keep < fringe * 0.5) continue;
      if (subject < 0.5 && keep < 0.55) continue;

      // Nudged off the grid: a quarter step in the face, a full step in the halo.
      const jitter = lerp(JITTER.face, JITTER.halo, smoothstep(0, 0.6, rim));
      positions[count * 3] = gx + (random() - 0.5) * jitter * stepX;
      positions[count * 3 + 1] = gy + (random() - 0.5) * jitter * stepY;
      positions[count * 3 + 2] = 0;
      scatterTo(count);
      lum[count] = curve(sharp[n]);
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

function Cloud({ data, anchor }: { data: Sampled; anchor: RefObject<HTMLElement | null> }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const colors = useThemeColors();
  const theme = useAppStore((s) => s.theme);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const cursor = useRef({ x: 99, y: 99 });
  /** Canvas size ("WxH") the camera and size uniforms were last fitted for. */
  const sizedFor = useRef("");
  /** World units visible from the canvas's top edge to its bottom edge. */
  const view = useRef(FACE_HEIGHT);

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
      uSize: { value: 0 },
      // Read once: a pixel ratio that changed at runtime would resize every point.
      // gl_PointSize is in drawing-buffer pixels, so this is the renderer's own
      // ratio: min(devicePixelRatio, 2) on desktop (CanvasShell caps phones at 1.5).
      uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
      // Starts on the right side so the first frame never shows the wrong mode.
      uTheme: { value: appStore.get().theme === "light" ? 1 : 0 },
      uMouse: { value: new THREE.Vector2(99, 99) },
      uRadius: { value: HOVER_RADIUS * FACE.width },
      uMaxShift: { value: 0.01 },
      uHover: { value: 0 },
      uMaskCentre: { value: new THREE.Vector2(0, FACE_CENTRE) },
      uMaskRadius: { value: new THREE.Vector2(MASK.rx, MASK.ry) },
      // Dark ramp is held a touch under white: additive points overlap and would clip.
      uDarkLow: { value: new THREE.Color("#221F29") },
      uDarkHigh: { value: new THREE.Color("#D9D2C7") },
      uLightLow: { value: new THREE.Color("#B8AED6") },
      uLightHigh: { value: new THREE.Color("#1A1A1C") },
      uMid: { value: new THREE.Color() },
      uViolet: { value: new THREE.Color(colors.violet) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- built once; colours are eased in useFrame
    [gl],
  );

  const tones = useMemo(
    () => ({
      // Violet mids, slightly held back in dark mode for the same additive reason.
      mid: new THREE.Color(colors.violet).multiplyScalar(theme === "dark" ? 0.72 : 1),
      violet: new THREE.Color(colors.violet),
      theme: theme === "light" ? 1 : 0,
    }),
    [colors, theme],
  );

  useFrame((state, delta) => {
    const u = material.current?.uniforms;
    if (!u) return;
    u.uTime.value = state.clock.elapsedTime;
    u.uMid.value.lerp(tones.mid, damp(5, delta));
    u.uViolet.value.lerp(tones.violet, damp(5, delta));
    // ~0.6s cross-over between the additive (dark) and ink (light) looks.
    u.uTheme.value = lerp(u.uTheme.value, tones.theme, damp(5.5, delta));
    u.uProgress.value = lerp(u.uProgress.value, motion.portrait, damp(4, delta));

    // Fit the camera: the head fills the portrait column (capped by the
    // canvas width) and sits over the column's centre, wherever that is in
    // the full-width canvas. This only reruns when the canvas really changes
    // size (its height is in svh, so a phone's address bar never moves it),
    // never per frame or on scroll. The camera's aspect follows the canvas,
    // so the photo is never stretched. offset* ignore the About card's
    // tilt-in transform, so it can't skew the fit.
    const { width, height } = state.size;
    const size = `${width}x${height}`;
    if (size !== sizedFor.current && height > 0) {
      sizedFor.current = size;
      const mobile = width < 768;
      const slot = anchor.current;
      const shell = gl.domElement.closest<HTMLElement>(".canvas-shell");
      const slotHeight = slot?.offsetHeight || height / 2;
      const pxPerUnit = Math.min(
        ((mobile ? FILL.mobile : FILL.desktop) * slotHeight) / FACE_HEIGHT,
        ((mobile ? FILL_WIDTH.mobile : FILL_WIDTH.desktop) * width) / FACE.width,
      );
      // Where the column's centre sits relative to the canvas's centre, px.
      let dx = 0;
      let dy = 0;
      if (slot && shell) {
        dx = slot.offsetLeft + slot.offsetWidth / 2 - (shell.offsetLeft + shell.offsetWidth / 2);
        dy = slot.offsetTop + slot.offsetHeight / 2 - (shell.offsetTop + shell.offsetHeight / 2);
      }
      const visible = height / pxPerUnit;
      view.current = visible;
      camera.position.set(-dx / pxPerUnit, FACE_CENTRE + dy / pxPerUnit, visible * Z_PER_HEIGHT);
      camera.updateProjectionMatrix();
      const spacing = pxPerUnit * (PLANE_HEIGHT / (data.rows - 1));
      u.uSize.value = spacing * POINT_SCALE;
      u.uMaxShift.value = HOVER_SHIFT / pxPerUnit;
    }

    // The canvas ignores pointer events (it lies under the text), so the
    // cursor is projected onto the portrait plane from its page position.
    const rect = state.gl.domElement.getBoundingClientRect();
    const visibleWidth = view.current * (rect.width / rect.height);
    const targetX =
      camera.position.x + ((pointer.x - rect.left) / rect.width - 0.5) * visibleWidth;
    const targetY =
      camera.position.y + (0.5 - (pointer.y - rect.top) / rect.height) * view.current;
    const over =
      pointer.active &&
      Math.abs(targetX - FOCUS.x) < FOCUS.rx * 1.6 &&
      Math.abs(targetY - FOCUS.y) < FOCUS.ry * 1.4;

    // The swirl follows a smoothed cursor, so it glides instead of snapping.
    const c = cursor.current;
    if (u.uHover.value < 0.01) {
      c.x = targetX;
      c.y = targetY;
    }
    c.x = lerp(c.x, targetX, 0.1);
    c.y = lerp(c.y, targetY, 0.1);
    u.uMouse.value.set(c.x, c.y);
    // Soft in, and a slower ease back so the particles settle rather than snap.
    u.uHover.value = lerp(u.uHover.value, over ? 1 : 0, damp(over ? 5 : 3, delta));
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

export default function ParticlePortrait({
  src,
  crop,
  anchor,
}: {
  src: string;
  crop: Crop;
  /** The layout slot the face is centred on and sized to. */
  anchor: RefObject<HTMLElement | null>;
}) {
  const [data, setData] = useState<Sampled | null>(null);

  useEffect(() => {
    let cancelled = false;
    // A dense grid so the features stay defined: ~5px between points across
    // the face on desktop (~45k points with halo and dust), ~25k on phones.
    // Read once here rather than from a hook, so the photo is never sampled twice.
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    samplePortrait(src, crop, mobile ? 220 : 320)
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
      // Fitted to the portrait column on the first frame (see Cloud).
      camera={{
        position: [0, FACE_CENTRE, FACE_HEIGHT * 2 * Z_PER_HEIGHT],
        fov: FOV,
        near: 0.1,
        far: 30,
      }}
      maxDpr={2}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      /* ResizeObserver on the container, debounced; scrolling never re-measures.
         offsetSize: layout size, not the on-screen rect, which the About card's
         tilt-in transform would inflate while it mounts. */
      resize={{ debounce: 200, scroll: false, offsetSize: true }}
    >
      {data && <Cloud key={data.count} data={data} anchor={anchor} />}
    </CanvasShell>
  );
}
