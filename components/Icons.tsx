import type { ReactNode, SVGProps } from "react";
import type { GlyphName } from "@/data/portfolio";

const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
} as const;

export function GitHubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export function LinkedInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

/** Generic "all my links" mark: a small branching tree, not a brand logo. */
export function LinksIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 22V9M12 9 7 4M12 9l5-5M12 15l-6-5M12 15l6-5" />
    </svg>
  );
}

export function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width={12} height={12} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

export function MoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width={12} height={12} {...props}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export function ArrowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width={14} height={14} {...props}>
      <path d="M7 7h10v10M7 17 17 7" />
    </svg>
  );
}

/** Small line icons for the About and Experience lists, picked by name from the data file. */
const GLYPHS: Record<GlyphName, ReactNode> = {
  // Play button in a rounded screen.
  play: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="4" />
      <path d="m10 9.2 5 2.8-5 2.8z" />
    </>
  ),
  code: <path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16" />,
  // Rosette badge.
  badge: (
    <>
      <circle cx="12" cy="9" r="5.5" />
      <path d="m8.5 13.5-1.5 7 5-2.5 5 2.5-1.5-7" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v3M8 21h8M9.5 17h5v4h-5z" />
    </>
  ),
  // Stacked building blocks.
  blocks: (
    <>
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
      <rect x="8" y="3" width="8" height="8" rx="1.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.4-4.4" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
    </>
  ),
  smile: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01" />
    </>
  ),
};

export function Glyph({ name, ...props }: { name: GlyphName } & SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      {GLYPHS[name]}
    </svg>
  );
}
