"use client";

import { useEffect } from "react";
import { useProgressStore } from "@/lib/ml/store/progressStore";
import type { ProgressMap } from "@/lib/ml/progress/service";

/**
 * Invisible bridge: pushes the server-computed progress map (read fresh on every
 * /ml/* server render) into the client-side Zustand store the global Sidebar reads.
 * Rendered once from src/app/ml/layout.tsx.
 */
export default function ProgressHydrator({ initialMap }: { initialMap: ProgressMap }) {
  const hydrate = useProgressStore((state) => state.hydrate);

  useEffect(() => {
    hydrate(initialMap);
  }, [hydrate, initialMap]);

  return null;
}
