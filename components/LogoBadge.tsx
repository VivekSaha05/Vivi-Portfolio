"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  /** Files to try in order; each that fails to load falls through to the next. */
  sources: string[];
  company: string;
  initials: string;
};

const noop = () => () => {};

/**
 * A company logo in a 48px liquid-glass badge. Monochrome at rest; the panel's
 * hover brings the brand colour back (CSS: `.xp-panel:hover .logo-img`).
 *
 * The initials capsule is always there underneath and the logo fades in over
 * it once it has actually loaded, so a missing file simply leaves the
 * initials showing. The image is only requested after hydration: an image
 * that 404s before React attaches would never report its error.
 */
export default function LogoBadge({ sources, company, initials }: Props) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const src = sources[attempt];

  return (
    <span className="logo-badge liquid-glass">
      <span
        className={cn("logo-initials", loaded && "is-hidden")}
        {...(loaded
          ? { "aria-hidden": true }
          : { role: "img", "aria-label": `${company} logo` })}
      >
        {initials}
      </span>
      {hydrated && src && (
        <Image
          key={src}
          src={src}
          alt={`${company} logo`}
          aria-hidden={!loaded}
          width={30}
          height={30}
          unoptimized
          className={cn("logo-img", loaded && "is-loaded")}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            setAttempt((n) => n + 1);
          }}
        />
      )}
    </span>
  );
}
