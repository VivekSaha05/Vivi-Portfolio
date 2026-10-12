import { appStore, type Theme } from "@/lib/store";

export const THEME_KEY = "theme";

/** Mirrors the CSS variables in app/globals.css for WebGL and canvas code. */
export const palettes = {
  dark: {
    bg: "#161618",
    elev: "#1E1E21",
    text: "#F4F2EF",
    muted: "#8A8790",
    violet: "#8E80B8",
    taupe: "#A8978A",
    line: "#2A2A2E",
  },
  light: {
    bg: "#ECE8E3",
    elev: "#F6F3EF",
    text: "#1A1A1C",
    muted: "#615D66",
    violet: "#6E5FA0",
    taupe: "#8C7A6B",
    line: "#D6D0C8",
  },
} as const satisfies Record<Theme, Record<string, string>>;

export type Palette = (typeof palettes)[Theme];

/** Runs in <head> before first paint so a stored light theme never flashes dark. */
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export function readTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

function apply(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage can be blocked; the theme still applies for this visit.
  }
  appStore.set({ theme });
}

/**
 * Switches theme. With an origin point the new theme is revealed through an
 * expanding circle (View Transitions API); otherwise it swaps instantly.
 */
export function setTheme(theme: Theme, origin?: { x: number; y: number }) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!origin || reduced || typeof document.startViewTransition !== "function") {
    apply(theme);
    return;
  }

  const { x, y } = origin;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  const root = document.documentElement;
  root.classList.add("theme-switching");

  const transition = document.startViewTransition(() => apply(theme));
  transition.ready
    .then(() => {
      root.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 800,
          easing: "cubic-bezier(0.76, 0, 0.24, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {});
  transition.finished.finally(() => root.classList.remove("theme-switching"));
}
