"use client";

import type { PointerEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  /** With a link the chip renders as an anchor (external links open in a new tab). */
  href?: string;
};

/** Records where the pointer came in, so the fill floods out from that point. */
function aim(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty("--x", `${e.clientX - rect.left}px`);
  el.style.setProperty("--y", `${e.clientY - rect.top}px`);
}

/**
 * A small outlined capsule (or row) that floods with ink from wherever the
 * cursor enters: the CSS (`.chip`) grows a clip-path circle from --x/--y and
 * drains it again on leave. Keyboard focus floods it from the centre.
 */
export default function LiquidChip({ children, className, href }: Props) {
  if (href) {
    const external = /^https?:/.test(href);
    return (
      <a
        href={href}
        className={cn("chip", className)}
        onPointerEnter={aim}
        onPointerLeave={aim}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : null)}
      >
        <span className="chip-inner">{children}</span>
      </a>
    );
  }
  return (
    <span className={cn("chip", className)} onPointerEnter={aim} onPointerLeave={aim}>
      <span className="chip-inner">{children}</span>
    </span>
  );
}
