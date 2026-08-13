"use client";

import { useState } from "react";
import { BranchDetail, BranchSelector, KnowledgeGraph } from "@/components/KnowledgeGraph";
import { BRANCHES } from "@/lib/graph-data";

export default function KnowledgeGraphSection() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const branch = BRANCHES.find((item) => item.id === activeId) ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div className="space-y-3">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white card-shadow dark:border-slate-700 dark:bg-slate-800">
          <div className="hidden aspect-[10/7] lg:block">
            <KnowledgeGraph activeId={activeId} onActivate={setActiveId} />
          </div>
          <div className="p-4 lg:hidden">
            <div className="mb-4">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
                Recommended sequence
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Choose a track below. Each step connects the engineering workflow from code to production networking.
              </p>
            </div>
            <BranchSelector activeId={activeId} onActivate={setActiveId} />
          </div>
        </div>
        <div className="hidden rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 lg:block">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Select a track to inspect
            </p>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Arrows show recommended progression</span>
          </div>
          <BranchSelector activeId={activeId} onActivate={setActiveId} />
        </div>
      </div>
      <BranchDetail branch={branch} />
    </div>
  );
}
