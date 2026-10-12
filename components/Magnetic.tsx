"use client";

import { useRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { useMagnetic } from "@/hooks/useMagnetic";
import { cn } from "@/lib/utils";

type Shared = {
  children: ReactNode;
  className?: string;
  /** A short-range nudge instead of the full pull: for small icon buttons. */
  soft?: boolean;
};
type AnchorProps = Shared &
  Omit<ComponentPropsWithoutRef<"a">, "children" | "className"> & { href: string };
type ButtonProps = Shared &
  Omit<ComponentPropsWithoutRef<"button">, "children" | "className"> & {
    href?: undefined;
  };

/** A link (with `href`) or button that is pulled toward the cursor. */
export default function Magnetic(props: AnchorProps | ButtonProps) {
  const anchor = useRef<HTMLAnchorElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useMagnetic(props.href !== undefined ? anchor : button);

  const inner = (
    <span data-magnetic-label className="magnetic-label">
      {props.children}
    </span>
  );
  const magnet = props.soft ? "soft" : undefined;

  if (props.href !== undefined) {
    const { children: _children, className, soft: _soft, ...rest } = props;
    void _children;
    void _soft;
    const external = /^https?:/.test(rest.href);
    return (
      <a
        ref={anchor}
        className={cn("magnetic", className)}
        data-magnet={magnet}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : null)}
        {...rest}
      >
        {inner}
      </a>
    );
  }

  const { children: _children, className, soft: _soft, ...rest } = props;
  void _children;
  void _soft;
  return (
    <button
      ref={button}
      type="button"
      className={cn("magnetic", className)}
      data-magnet={magnet}
      {...rest}
    >
      {inner}
    </button>
  );
}
