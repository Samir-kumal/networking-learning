"use client";

import { create } from "zustand";
import type { ProgressMap, SectionStatus } from "@/lib/ml/progress/service";

interface ProgressStoreState {
  /** "<chapterSlug>/<sectionSlug>" -> status. Empty until hydrate() runs. */
  map: ProgressMap;
  hydrated: boolean;
  hydrate: (map: ProgressMap) => void;
  /** Optimistic local update — e.g. right after a quiz pass, before the next server render confirms it. */
  setStatus: (sectionId: string, status: SectionStatus) => void;
}

/**
 * Cross-tree client cache of the current profile's section progress. The
 * /ml/[chapter]/[section] server pages own the source of truth (the DB); this
 * store exists so the global Sidebar (rendered outside the /ml route subtree, in
 * AppShell) can reflect lock/unlock/complete state without a full navigation.
 * Hydrated by <ProgressHydrator> in src/app/ml/layout.tsx.
 */
export const useProgressStore = create<ProgressStoreState>((set) => ({
  map: {},
  hydrated: false,
  hydrate: (map) => set({ map, hydrated: true }),
  setStatus: (sectionId, status) =>
    set((state) => ({ map: { ...state.map, [sectionId]: status } })),
}));
