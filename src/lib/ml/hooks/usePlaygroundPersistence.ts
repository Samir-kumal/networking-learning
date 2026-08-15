"use client";

import { useEffect, useRef } from "react";
import { savePlaygroundState } from "@/app/ml/actions";

/**
 * Debounce-syncs a playground's local parameter state to the server. Optional —
 * only playgrounds worth resuming (expensive-to-recreate configurations) need it.
 */
export function usePlaygroundPersistence(
  playgroundKey: string,
  state: Record<string, unknown>,
  debounceMs = 800,
): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    clearTimeout(timerRef.current ?? undefined);
    timerRef.current = setTimeout(() => {
      void savePlaygroundState({ playgroundKey, state });
    }, debounceMs);
    return () => clearTimeout(timerRef.current ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playgroundKey, JSON.stringify(state), debounceMs]);
}
