import { useAppStore } from "@/hooks/useAppStore";
import { palettes } from "@/lib/theme";

/** The active palette as hex strings, for canvases that can't read CSS variables. */
export function useThemeColors() {
  const theme = useAppStore((s) => s.theme);
  return palettes[theme];
}
