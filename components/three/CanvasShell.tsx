"use client";

import { useRef, type ComponentProps, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { useInView } from "@/hooks/useInView";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  /** Upper DPR bound on desktop. Mobile is always capped at 1.5. */
  maxDpr?: number;
  /** Hold the render loop even while visible (e.g. until shaders are compiled). */
  paused?: boolean;
} & Pick<
  ComponentProps<typeof Canvas>,
  "camera" | "orthographic" | "gl" | "onCreated" | "flat"
>;

/**
 * Canvas wrapper shared by every scene: caps DPR and stops the render loop
 * whenever the canvas is scrolled off screen.
 */
export default function CanvasShell({
  children,
  className,
  maxDpr = 1.75,
  paused = false,
  ...canvas
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { rootMargin: "10% 0px" });
  const mobile = useIsMobile();

  return (
    <div ref={ref} className={cn("canvas-shell", className)} aria-hidden="true">
      <Canvas
        frameloop={visible && !paused ? "always" : "never"}
        dpr={[1, mobile ? 1.5 : maxDpr]}
        {...canvas}
      >
        {children}
      </Canvas>
    </div>
  );
}
