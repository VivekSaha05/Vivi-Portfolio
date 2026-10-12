"use client";

import { useRef } from "react";
import EmailLink from "@/components/EmailLink";
import { ArrowIcon } from "@/components/Icons";
import LiquidText from "@/components/LiquidText";
import Magnetic from "@/components/Magnetic";
import Quote from "@/components/Quote";
import ScrambleText from "@/components/ScrambleText";
import SectionDivider from "@/components/SectionDivider";
import { contact, isSet, linktree, site, socials } from "@/data/portfolio";

const LINKS = [
  { label: socials.github.label, detail: socials.github.handle, href: socials.github.href },
  { label: socials.linkedin.label, detail: socials.linkedin.handle, href: socials.linkedin.href },
  ...(isSet(linktree.href)
    ? [{ label: linktree.label, detail: "all links", href: linktree.href }]
    : []),
];

const HEADLINE = contact.headline.join(" ");
const HEADLINE_LABEL = HEADLINE.charAt(0) + HEADLINE.slice(1).toLowerCase();

export default function Contact() {
  const root = useRef<HTMLElement>(null);

  return (
    <section id="contact" ref={root} className="contact section" aria-labelledby="contact-title">
      <SectionDivider />
      <div className="shell">
        <p className="eyebrow">
          <ScrambleText text={contact.eyebrow} />
        </p>

        <h2
          id="contact-title"
          className="contact-headline display"
          aria-label={HEADLINE_LABEL}
        >
          {contact.headline.map((line, i) => (
            <span key={line} className="contact-line">
              <LiquidText text={line} decorative scramble="enter" delay={i * 0.2} />
              {i === contact.headline.length - 1 && (
                <span className="cursive" aria-hidden="true">
                  {contact.accent}
                </span>
              )}
            </span>
          ))}
        </h2>

        <div className="contact-grid">
          <div className="contact-block">
            <p className="label">say hello</p>
            <EmailLink />
          </div>

          <div className="contact-block">
            <p className="label">elsewhere</p>
            <ul className="contact-links">
              {LINKS.map((link) => (
                <li key={link.label}>
                  <Magnetic
                    href={link.href}
                    className="text-link"
                    aria-label={`${link.label}: ${link.detail} (opens in a new tab)`}
                  >
                    {link.label} <ArrowIcon />
                  </Magnetic>
                </li>
              ))}
              <li>
                <Magnetic href={site.resume} className="text-link" download>
                  Résumé PDF <ArrowIcon />
                </Magnetic>
              </li>
            </ul>
          </div>

          <div className="contact-block">
            <p className="label">education</p>
            <p className="education">{contact.education}</p>
          </div>
        </div>
      </div>

      {/* Closing easter egg. Original lettering only: no anime artwork or logos. */}
      <Quote />
    </section>
  );
}
