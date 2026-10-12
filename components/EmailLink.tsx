"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Magnetic from "@/components/Magnetic";
import { contact, site } from "@/data/portfolio";
import { MQ } from "@/lib/gsap";
import { scramble } from "@/lib/scramble";
import { cn } from "@/lib/utils";

/**
 * The email address as a magnetic link. Clicking copies it and the label
 * scrambles to "copied ✓" and back; without clipboard access it falls through
 * to the mailto: link. Used in Contact and in the menu drawer.
 */
export default function EmailLink({ className }: { className?: string }) {
  const label = useRef<HTMLSpanElement>(null);
  const reset = useRef<number | undefined>(undefined);
  const [announce, setAnnounce] = useState("");

  useEffect(() => () => window.clearTimeout(reset.current), []);

  const copy = async (e: MouseEvent<HTMLAnchorElement>) => {
    if (!navigator.clipboard) return;
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(site.email);
    } catch {
      window.location.href = `mailto:${site.email}`;
      return;
    }
    const el = label.current;
    if (!el) return;
    const reduced = window.matchMedia(MQ.reduced).matches;
    const show = (text: string) => {
      if (reduced) el.textContent = text;
      else scramble(el, text, { duration: 0.6 });
    };

    setAnnounce("Email address copied to clipboard");
    show(contact.copied);
    window.clearTimeout(reset.current);
    reset.current = window.setTimeout(() => {
      show(site.email);
      setAnnounce("");
    }, 1800);
  };

  return (
    <>
      <Magnetic
        href={`mailto:${site.email}`}
        className={cn("email-link", className)}
        onClick={copy}
        aria-label={`${site.email} — copy email address`}
      >
        <span ref={label}>{site.email}</span>
      </Magnetic>
      <span className="sr-only" role="status">
        {announce}
      </span>
    </>
  );
}
