import { useEffect, type RefObject } from "react";
import { registerMagnet } from "@/lib/magnetic";

/** Makes the element pull toward the cursor within ~80px (mouse only). */
export function useMagnetic(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!ref.current) return;
    return registerMagnet(ref.current);
  }, [ref]);
}
