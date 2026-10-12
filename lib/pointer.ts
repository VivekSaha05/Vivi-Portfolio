/**
 * One shared pointer tracker. Everything that follows the mouse (cursor, trail,
 * magnets, 3D parallax) reads from here instead of adding its own listener.
 */
export const pointer = {
  x: -1000,
  y: -1000,
  /** Normalised to -1…1 with +y up, as Three.js expects. */
  nx: 0,
  ny: 0,
  /** False until the first real mouse move, so nothing jumps from (0,0). */
  active: false,
  /** performance.now() of the last move. */
  movedAt: 0,
};

let started = false;

export function startPointer() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType === "touch") return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ny = -((e.clientY / window.innerHeight) * 2 - 1);
      pointer.active = true;
      pointer.movedAt = performance.now();
    },
    { passive: true },
  );
}
