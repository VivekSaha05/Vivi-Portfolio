"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { usePathname } from "next/navigation";
import EmailLink from "@/components/EmailLink";
import LiquidText from "@/components/LiquidText";
import { nav, type SectionId } from "@/data/portfolio";
import { useMagnetic } from "@/hooks/useMagnetic";
import { gsap, MQ } from "@/lib/gsap";
import { lockScroll, scrollToSection, scrollToY } from "@/lib/scroll";
import { scramble } from "@/lib/scramble";
import { navigate, originOf } from "@/lib/transition";

type Item =
  | { kind: "section"; id: SectionId; label: string }
  | { kind: "page"; href: string; label: string };

const ITEMS: Item[] = [
  ...nav.map((n) => ({ kind: "section" as const, id: n.id, label: n.label })),
  { kind: "page", href: "/projects", label: "ALL PROJECTS" },
];

const FOCUSABLE = "a[href], button:not([disabled])";

/**
 * MENU button (top right) and the drawer it opens: a full-width glass sheet
 * that unrolls from the top edge with a slanted leading edge. While open it
 * locks page scroll, traps focus, and closes on Esc, outside click or a link.
 */
export default function Menu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const onHome = pathname === "/";

  const button = useRef<HTMLButtonElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const drawer = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useMagnetic(button);

  // Open / close choreography.
  useEffect(() => {
    const sheet = drawer.current;
    if (!sheet) return;
    if (first.current) {
      first.current = false;
      return;
    }
    const reduced = window.matchMedia(MQ.reduced).matches;
    const links = sheet.querySelectorAll<HTMLElement>("[data-menu-in]");

    lockScroll(open);
    if (label.current && !reduced) {
      scramble(label.current, open ? "CLOSE" : "MENU", { duration: 0.5 });
    } else if (label.current) {
      label.current.textContent = open ? "CLOSE" : "MENU";
    }

    gsap.killTweensOf([sheet, links]);
    if (reduced) {
      gsap.set(sheet, { "--l": "100%", "--r": "100%" });
      gsap.set(links, { yPercent: 0, autoAlpha: 1 });
      gsap.to(sheet, { autoAlpha: open ? 1 : 0, duration: 0.25 });
    } else if (open) {
      // The two bottom corners of the clip travel on different beats, so the
      // sheet arrives with a tilted leading edge and then squares up.
      gsap.set(sheet, { autoAlpha: 1 });
      gsap.fromTo(sheet, { yPercent: -6 }, { yPercent: 0, duration: 0.9, ease: "expo.inOut" });
      gsap.fromTo(sheet, { "--r": "0%" }, { "--r": "100%", duration: 0.8, ease: "expo.inOut" });
      gsap.fromTo(
        sheet,
        { "--l": "0%" },
        { "--l": "100%", duration: 0.8, delay: 0.1, ease: "expo.inOut" },
      );
      gsap.fromTo(
        links,
        { yPercent: 110, autoAlpha: 0 },
        {
          yPercent: 0,
          autoAlpha: 1,
          duration: 0.9,
          ease: "expo.out",
          stagger: 0.05,
          delay: 0.35,
        },
      );
    } else {
      gsap.to(sheet, { "--l": "0%", duration: 0.7, ease: "expo.inOut" });
      gsap.to(sheet, { "--r": "0%", duration: 0.7, delay: 0.08, ease: "expo.inOut" });
      gsap.to(sheet, { yPercent: -6, duration: 0.8, ease: "expo.inOut" });
      gsap.set(sheet, { autoAlpha: 0, delay: 0.8 });
    }

    if (open) sheet.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
  }, [open]);

  // Esc, outside click and the focus trap only exist while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const sheet = drawer.current;
    const trigger = button.current;
    if (!sheet || !trigger) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const stops = [trigger, ...sheet.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const index = stops.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey
        ? (index <= 0 ? stops.length : index) - 1
        : (index + 1) % stops.length;
      e.preventDefault();
      stops[next].focus();
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!sheet.contains(target) && !trigger.contains(target)) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  // Never leave the page locked if the component goes away mid-open.
  useEffect(() => () => lockScroll(false), []);

  const follow = (item: Item) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const origin = originOf(e.currentTarget);
    setOpen(false);
    lockScroll(false);

    if (item.kind === "section") {
      if (onHome) scrollToSection(item.id);
      else navigate({ href: "/", kind: "collapse", section: item.id });
    } else if (pathname === item.href) {
      scrollToY(0);
    } else {
      navigate({ href: item.href, kind: "iris", origin });
    }
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        className="menu-btn magnetic liquid-glass liquid-glass--refract"
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        data-open={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span data-magnetic-label className="magnetic-label">
          <span ref={label} className="menu-btn-label">
            MENU
          </span>
          <span className="menu-btn-icon" aria-hidden="true">
            <span />
            <span />
          </span>
        </span>
      </button>

      <div
        ref={drawer}
        id="site-menu"
        className="menu liquid-glass"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        inert={!open}
        data-lenis-prevent
      >
        <nav aria-label="Menu" className="menu-nav shell">
          <ol>
            {ITEMS.map((item, i) => (
              <li key={item.label} className="menu-item">
                <a
                  href={item.kind === "section" ? `/#${item.id}` : item.href}
                  onClick={follow(item)}
                  className="menu-link display"
                >
                  {/* The inner span is what animates, so the link itself is focusable at once. */}
                  <span className="menu-link-inner" data-menu-in>
                    <span className="menu-index">{String(i + 1).padStart(2, "0")}</span>
                    <LiquidText text={item.label} />
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="menu-foot shell" data-menu-in>
          <EmailLink className="menu-email" />
        </div>
      </div>
    </>
  );
}
