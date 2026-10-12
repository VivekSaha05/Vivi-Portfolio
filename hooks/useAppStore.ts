import { useSyncExternalStore } from "react";
import { appStore, serverState } from "@/lib/store";

type AppState = ReturnType<typeof appStore.get>;

export function useAppStore<T>(selector: (state: AppState) => T): T {
  return useSyncExternalStore(
    appStore.subscribe,
    () => selector(appStore.get()),
    () => selector(serverState),
  );
}
