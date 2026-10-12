import type { Metadata, Viewport } from "next";
import { DM_Mono, Fira_Code, Instrument_Serif } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import Cursor from "@/components/Cursor";
import CursorTrail from "@/components/CursorTrail";
import Dock from "@/components/Dock";
import GlassFilters from "@/components/GlassFilters";
import Grain from "@/components/Grain";
import Menu from "@/components/Menu";
import ProgressLine from "@/components/ProgressLine";
import SmoothScroll from "@/components/SmoothScroll";
import TransitionOverlay from "@/components/TransitionOverlay";
import { site, socials } from "@/data/portfolio";
import { themeScript } from "@/lib/theme";

const dmMono = DM_Mono({
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: "italic",
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
});

// Set NEXT_PUBLIC_SITE_URL for a custom domain; on Vercel the production URL is picked up automatically.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: site.title,
  description: site.description,
  applicationName: `${site.name} — Portfolio`,
  authors: [{ name: site.name, url: socials.github.href }],
  creator: site.name,
  keywords: [
    site.name,
    site.alias,
    "Frontend Software Engineer",
    "React",
    "Next.js",
    "TypeScript",
    "Three.js",
    "GSAP",
    "Bengaluru",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: site.name,
    title: site.title,
    description: site.description,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#161618" },
    { media: "(prefers-color-scheme: light)", color: "#161618" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${dmMono.variable} ${firaCode.variable} ${instrumentSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies a stored theme before first paint, so light never flashes dark. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <noscript>
          <style>{`.loader{display:none}`}</style>
        </noscript>
      </head>
      <body>
        {/* Site-wide chrome. It lives here so it persists across route changes,
            which is what lets the transition overlay animate a navigation. */}
        <GlassFilters />
        <SmoothScroll />
        <Cursor />
        <CursorTrail />
        <Grain />
        <Menu />
        <ProgressLine />
        <Dock />
        {children}
        <TransitionOverlay />
      </body>
    </html>
  );
}
