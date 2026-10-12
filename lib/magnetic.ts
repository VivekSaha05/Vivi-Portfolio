import { gsap, MQ } from "@/lib/gsap";
import { pointer } from "@/lib/pointer";

const RADIUS = 80;
const STRENGTH = 0.35;
/** The label travels 1.5× as far as its button, which reads as depth. */
const LABEL_EXTRA = 0.5;

type Item = {
  el: HTMLElement;
  label: HTMLElement | null;
  pulled: boolean;
  radius: number;
  strength: number;
};

const items = new Set<Item>();
let running = false;

function release(item: Item) {
  item.pulled = false;
  const spring = {
    x: 0,
    y: 0,
    duration: 1,
    ease: "elastic.out(1, 0.4)",
    overwrite: true,
  };
  gsap.to(item.el, spring);
  if (item.label) gsap.to(item.label, spring);
}

function tick() {
  if (!pointer.active) return;

  // Find the single closest magnet in range: neighbours (stacked links, button
  // pairs) must not all lean toward the cursor at once.
  let nearest: Item | null = null;
  let nearestDistance = Infinity;
  let nearestDx = 0;
  let nearestDy = 0;

  for (const item of items) {
    const rect = item.el.getBoundingClientRect();
    // Remove the current pull so the hit area stays anchored to the layout box.
    const cx = rect.left + rect.width / 2 - (gsap.getProperty(item.el, "x") as number);
    const cy = rect.top + rect.height / 2 - (gsap.getProperty(item.el, "y") as number);
    const dx = pointer.x - cx;
    const dy = pointer.y - cy;
    // Distance from the element's edge, not its centre.
    const gapX = Math.max(0, Math.abs(dx) - rect.width / 2);
    const gapY = Math.max(0, Math.abs(dy) - rect.height / 2);
    const distance = Math.hypot(gapX, gapY);
    if (distance < item.radius && distance < nearestDistance) {
      nearest = item;
      nearestDistance = distance;
      nearestDx = dx;
      nearestDy = dy;
    }
  }

  for (const item of items) {
    if (item !== nearest && item.pulled) release(item);
  }
  if (!nearest) return;

  nearest.pulled = true;
  const pull = { duration: 0.5, ease: "power3.out", overwrite: true };
  const { strength } = nearest;
  gsap.to(nearest.el, { x: nearestDx * strength, y: nearestDy * strength, ...pull });
  if (nearest.label) {
    gsap.to(nearest.label, {
      x: nearestDx * strength * LABEL_EXTRA,
      y: nearestDy * strength * LABEL_EXTRA,
      ...pull,
    });
  }
}

/** Registers an element with the shared magnet loop. Returns an unregister fn. */
export function registerMagnet(el: HTMLElement) {
  if (!window.matchMedia(MQ.full).matches) return () => {};
  const item: Item = {
    el,
    label: el.querySelector<HTMLElement>("[data-magnetic-label]"),
    pulled: false,
    // data-magnet="soft": a short-range nudge for small icon buttons.
    radius: el.dataset.magnet === "soft" ? 26 : RADIUS,
    strength: el.dataset.magnet === "soft" ? 0.28 : STRENGTH,
  };
  items.add(item);
  if (!running) {
    running = true;
    gsap.ticker.add(tick);
  }
  return () => {
    items.delete(item);
    const nodes = item.label ? [item.el, item.label] : [item.el];
    gsap.killTweensOf(nodes);
    gsap.set(nodes, { clearProps: "transform" });
    if (items.size === 0) {
      gsap.ticker.remove(tick);
      running = false;
    }
  };
}
