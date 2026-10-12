import { useCallback, useSyncExternalStore } from "react";
import { MQ } from "@/lib/gsap";

/** Subscribes to a media query. Always false on the server and first paint. */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const useReducedMotion = () => useMediaQuery(MQ.reduced);
export const useFinePointer = () => useMediaQuery(MQ.fine);
/** Desktop mouse with motion allowed: the tier that gets pins and 3D extras. */
export const useFullMotion = () => useMediaQuery(MQ.full);
export const useIsMobile = () => useMediaQuery("(max-width: 767px)");
