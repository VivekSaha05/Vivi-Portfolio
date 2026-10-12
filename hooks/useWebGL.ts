import { useSyncExternalStore } from "react";
import { hasWebGL } from "@/lib/utils";

const subscribe = () => () => {};

/** Whether 3D scenes can run here. False during SSR and hydration. */
export function useWebGL() {
  return useSyncExternalStore(subscribe, hasWebGL, () => false);
}
