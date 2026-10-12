import type { SectionId } from "@/data/portfolio";

export type TransitionRequest = {
  href: string;
  /** "iris": circle from the click point + panel wipe. "collapse": tile flip. */
  kind: "iris" | "collapse";
  /** Viewport point the iris grows from (the clicked control). */
  origin?: { x: number; y: number };
  /** Home section to land on once the new page is in. */
  section?: SectionId;
};

type Handler = (request: TransitionRequest) => void;

let handler: Handler | null = null;

/** Registered once by <TransitionOverlay />, which lives in the root layout. */
export const setTransitionHandler = (next: Handler | null) => {
  handler = next;
};

/** Changes route through the transition overlay. */
export function navigate(request: TransitionRequest) {
  if (handler) handler(request);
  else window.location.assign(request.href);
}

/** Centre of an element in viewport coordinates, for use as an iris origin. */
export function originOf(el: Element) {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}
