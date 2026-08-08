"use client";

import { useState } from "react";
import { KnowledgeGraph, BranchDetail } from "@/components/KnowledgeGraph";
import { BRANCHES } from "@/lib/graph-data";

export default function KnowledgeGraphSection() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const branch = BRANCHES.find((b) => b.id === activeId) ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div className="rounded-2xl border border-slate-200 bg-white card-shadow overflow-hidden aspect-[10/7]">
        <KnowledgeGraph activeId={activeId} onActivate={setActiveId} />
      </div>
      <BranchDetail branch={branch} />
    </div>
  );
}
