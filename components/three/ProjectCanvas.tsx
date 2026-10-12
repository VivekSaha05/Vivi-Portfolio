"use client";

import { Suspense, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import CanvasShell from "@/components/three/CanvasShell";
import { damp, lerp } from "@/lib/utils";
import { projectFragment, projectVertex } from "@/shaders/projectImage";

/** Written by the card's DOM pointer handlers, read every frame by the shader. */
export type PlaneState = { hover: boolean; x: number; y: number };

type Props = { src: string; state: RefObject<PlaneState> };

function Plane({ src, state }: Props) {
  const texture = useTexture(src);
  const material = useRef<THREE.ShaderMaterial>(null);
  const viewport = useThree((s) => s.viewport);

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uCover: { value: new THREE.Vector2(1, 1) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uHover: { value: 0 },
      uTime: { value: 0 },
    }),
    [texture],
  );

  useFrame((frame, delta) => {
    const u = material.current?.uniforms;
    if (!u) return;
    const { hover, x, y } = state.current;
    u.uTime.value = frame.clock.elapsedTime;
    u.uHover.value = lerp(u.uHover.value, hover ? 1 : 0, damp(5, delta));
    const mouse = u.uMouse.value as THREE.Vector2;
    const k = damp(9, delta);
    mouse.set(lerp(mouse.x, x, k), lerp(mouse.y, 1 - y, k));

    // object-fit: cover, in uv space.
    const image = texture.image as { width: number; height: number };
    const planeAspect = frame.viewport.width / frame.viewport.height;
    const imageAspect = image.width / image.height;
    const cover = u.uCover.value as THREE.Vector2;
    if (planeAspect > imageAspect) cover.set(1, imageAspect / planeAspect);
    else cover.set(planeAspect / imageAspect, 1);
  });

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={projectVertex}
        fragmentShader={projectFragment}
        toneMapped={false}
      />
    </mesh>
  );
}

/** WebGL cover for a project card: RGB-shift + wave distortion on hover. */
export default function ProjectCanvas(props: Props) {
  return (
    <CanvasShell
      className="project-canvas"
      flat
      maxDpr={1.5}
      camera={{ position: [0, 0, 2], fov: 45 }}
      gl={{ antialias: false, powerPreference: "low-power" }}
    >
      <Suspense fallback={null}>
        <Plane {...props} />
      </Suspense>
    </CanvasShell>
  );
}
