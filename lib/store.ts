import type { StackCategory } from "@/data/portfolio";

export type Theme = "dark" | "light";

type AppState = {
  /** Flips to true the moment the loader starts wiping away. */
  ready: boolean;
  theme: Theme;
  /** 0–100, real asset progress reported by the loader tasks. */
  progress: number;
  stackHover: StackCategory | null;
  /** True while the page-transition overlay hides the page underneath. */
  covered: boolean;
};

let state: AppState = {
  ready: false,
  theme: "dark",
  progress: 0,
  stackHover: null,
  covered: false,
};

export const serverState: AppState = { ...state };

const listeners = new Set<() => void>();

export const appStore = {
  get: () => state,
  set(patch: Partial<AppState>) {
    let changed = false;
    for (const key in patch) {
      const k = key as keyof AppState;
      if (state[k] !== patch[k]) changed = true;
    }
    if (!changed) return;
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/**
 * Per-frame values written by ScrollTrigger and read inside render loops.
 * Kept outside React on purpose: nothing here should cause a re-render.
 */
export const motion = {
  /**
   * Particle portrait assembly progress, 0 (chaos) → 1 (face). Played once by
   * About when the portrait first scrolls in; never scrubbed back.
   */
  portrait: 0,
};

/** Weighted loading tasks; the loader shows their combined completion. */
const tasks = new Map<string, { weight: number; value: number }>([
  ["fonts", { weight: 2, value: 0 }],
  ["images", { weight: 2, value: 0 }],
]);

export type LoadingTask = "fonts" | "images";

export const loading = {
  /** Forces every task to done; the loader's safety net if an asset stalls. */
  finish() {
    tasks.forEach((t) => (t.value = 1));
    appStore.set({ progress: 100 });
  },
  report(id: LoadingTask, value: number) {
    const task = tasks.get(id);
    if (!task) return;
    task.value = Math.max(task.value, Math.min(1, value));
    let total = 0;
    let done = 0;
    tasks.forEach((t) => {
      total += t.weight;
      done += t.weight * t.value;
    });
    appStore.set({ progress: total ? Math.round((done / total) * 100) : 0 });
  },
};
