"use client";

import NetworkingModuleHeader from "@/components/networking/NetworkingModuleHeader";
import NetworkingPanel from "@/components/networking/NetworkingPanel";
import NetworkingExample from "@/components/networking/NetworkingExample";
import { useState } from "react";

export default function SupernetSection() {
  const [activeTab, setActiveTab] = useState<"overview" | "binary" | "rules">("overview");

  const subnets = [
    { name: "Subnet A", cidr: "192.168.0.0/24", binary: "11000000.10101000.00000000.00000000" },
    { name: "Subnet B", cidr: "192.168.1.0/24", binary: "11000000.10101000.00000001.00000000" },
    { name: "Subnet C", cidr: "192.168.2.0/24", binary: "11000000.10101000.00000010.00000000" },
    { name: "Subnet D", cidr: "192.168.3.0/24", binary: "11000000.10101000.00000011.00000000" },
  ];

  return (
    <section
      id="supernetting"
      className="networking-module scroll-mt-24 rounded-2xl border p-6 sm:p-8 transition-colors"
    >
      {/* Section Header */}
      <NetworkingModuleHeader
        anchor="#supernetting"
        icon={<span className="text-indigo-500 dark:text-indigo-400" aria-hidden="true">⬡</span>}
        title={<>7. Supernetting & CIDR Aggregation</>}
        description={<><strong className="text-slate-900 dark:text-slate-100">Supernetting</strong> (also called <strong className="text-indigo-600 dark:text-indigo-400">CIDR Route Aggregation</strong> or <strong className="text-emerald-600 dark:text-emerald-400">Route Summarization</strong>) is the process of combining multiple contiguous smaller networks into a single, shorter-prefix network route. This dramatically reduces core routing table sizes and conserves memory on enterprise network backbones.</>}
      />
      <div className="module-content networking-module-content">

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-[color:var(--border-l1)] pb-4">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            activeTab === "overview"
              ? "bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-800 font-semibold shadow-sm"
              : "bg-[color:var(--surface-l1)] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-[color:var(--border-l1)]"
          }`}
        >
          Before vs. After Summarization
        </button>
        <button
          onClick={() => setActiveTab("binary")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            activeTab === "binary"
              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 font-semibold shadow-sm"
              : "bg-[color:var(--surface-l1)] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-[color:var(--border-l1)]"
          }`}
        >
          Binary Bitwise Analysis
        </button>
        <button
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            activeTab === "rules"
              ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800 font-semibold shadow-sm"
              : "bg-[color:var(--surface-l1)] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-[color:var(--border-l1)]"
          }`}
        >
          3 Rules of Supernetting
        </button>
      </div>

      {/* TAB 1: BEFORE VS AFTER ROUTE AGGREGATION */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <NetworkingPanel className="h-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Unsummarized Routes */}
            <div className="rounded-xl bg-[color:var(--surface-l2)] border border-[color:var(--border-l2)] p-6 card-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <span>❌</span> Before Aggregation (4 Individual Routes)
                </h3>
                <span className="text-xs font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded border border-rose-400/20">
                  Bloated Routing Table
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Routers must store, query, and advertise four separate routing table entries for adjacent subnets:
              </p>
              <div className="bg-[color:var(--surface-l3)] border border-[color:var(--border-l3)] rounded-lg p-4 font-mono text-xs text-slate-100 space-y-2">
                <div className="flex justify-between border-b border-[color:var(--border-l3)] pb-1.5">
                  <span className="text-slate-500 dark:text-slate-400">S 192.168.0.0/24</span>
                  <span className="text-indigo-600 dark:text-indigo-400">via 10.1.1.1</span>
                </div>
                <div className="flex justify-between border-b border-[color:var(--border-l3)] pb-1.5 pt-0.5">
                  <span className="text-slate-400">S 192.168.1.0/24</span>
                  <span className="text-indigo-600 dark:text-indigo-400">via 10.1.1.1</span>
                </div>
                <div className="flex justify-between border-b border-[color:var(--border-l3)] pb-1.5 pt-0.5">
                  <span className="text-slate-400">S 192.168.2.0/24</span>
                  <span className="text-indigo-600 dark:text-indigo-400">via 10.1.1.1</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-slate-500 dark:text-slate-400">S 192.168.3.0/24</span>
                  <span className="text-indigo-600 dark:text-indigo-400">via 10.1.1.1</span>
                </div>
              </div>
            </div>

            {/* Aggregated Supernet Route */}
            <div className="rounded-xl bg-[color:var(--surface-l2)] border border-[color:var(--border-l2)] p-6 card-shadow hover:border-emerald-400 transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <span>✅</span> After Aggregation (1 Supernet Route)
                </h3>
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-400/20">
                  75% Table Reduction
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                All 4 subnets are consolidated into a single summary prefix with a shorter network mask:
              </p>
              <div className="bg-[color:var(--surface-l3)] border border-emerald-500/40 rounded-lg p-4 font-mono text-xs text-slate-100 space-y-3">
                <div className="flex justify-between items-center text-sm font-bold text-emerald-400">
                  <span>S 192.168.0.0/22</span>
                  <span>via 10.1.1.1</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                  Covers range: <code className="text-slate-900 dark:text-slate-100">192.168.0.0</code> to <code className="text-slate-900 dark:text-slate-100">192.168.3.255</code> (Total 1,024 IP addresses in 1 route entry).
                </div>
              </div>
            </div>
          </div>
          </NetworkingPanel>
        </div>
      )}

      {/* TAB 2: BINARY ANALYSIS */}
      {activeTab === "binary" && (
        <NetworkingExample title="Binary Matching: Finding the Common Prefix Length" description="To aggregate subnets, line up their network addresses in binary. The number of leading identical bits from left to right becomes the new supernet prefix length." tone="cyan">
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow space-y-6">

          <div className="space-y-3 font-mono text-xs sm:text-sm">
            {subnets.map((sub, idx) => (
              <div
                key={idx}
                className="bg-[color:var(--surface-l3)] border border-[color:var(--border-l3)] p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <span className="text-cyan-400 font-semibold min-w-[140px]">{sub.name} ({sub.cidr}):</span>
                <div className="tracking-widest text-slate-900 dark:text-slate-100 overflow-x-auto">
                  {/* Highlight the common 22 bits in green: 22 bits span 24 characters (8 + dot + 8 + dot + 6) */}
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{sub.binary.slice(0, 24)}</span>
                  <span className="text-rose-600 dark:text-rose-400">{sub.binary.slice(24)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[color:var(--surface-l3)] border border-emerald-400/40 p-4 rounded-lg text-xs font-mono space-y-2">
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              <span>Matching Bit Count: 22 bits</span>
              <span>Summarized Network: 192.168.0.0/22</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              Bits 1 to 22 (<code className="text-emerald-600 dark:text-emerald-400">11000000.10101000.000000</code>) are 100% identical across all 4 subnets. The remaining 10 host bits are set to 0 to define the supernet network ID.
            </p>
          </div>
        </div>
        </NetworkingExample>
      )}

      {/* TAB 3: THREE RULES OF SUPERNETTING */}
      {activeTab === "rules" && (
        <NetworkingPanel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* RULE 1 */}
          <div className="rounded-xl bg-[color:var(--surface-l2)] border border-[color:var(--border-l2)] p-6 card-shadow hover:border-cyan-400 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 flex items-center justify-center font-bold text-lg mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                Contiguous Network Blocks
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                The subnets being aggregated must be strictly sequential with no missing IP address gaps in the middle of the block.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs font-mono text-indigo-600 dark:text-indigo-400">
              Requirement: Sequential IP ranges
            </div>
          </div>

          {/* RULE 2 */}
          <div className="rounded-xl bg-[color:var(--surface-l2)] border border-[color:var(--border-l2)] p-6 card-shadow hover:border-emerald-400 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 flex items-center justify-center font-bold text-lg mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                Natural Binary Boundary
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                The starting network IP address must be evenly divisible by the total number of combined IP addresses in the supernet block.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs font-mono text-emerald-600 dark:text-emerald-400">
              Requirement: Aligned starting IP
            </div>
          </div>

          {/* RULE 3 */}
          <div className="rounded-xl bg-[color:var(--surface-l2)] border border-[color:var(--border-l2)] p-6 card-shadow hover:border-amber-400 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700 flex items-center justify-center font-bold text-lg mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                Power-of-2 Network Count
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                The total number of subnets being summarized must equal a power of 2 (e.g. 2, 4, 8, 16, 32 networks). You cannot summarize 3 or 5 subnets directly into one mask.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs font-mono text-amber-600 dark:text-amber-400">
              Requirement: 2ⁿ subnets combined
            </div>
          </div>
        </div>
        </NetworkingPanel>
      )}
      </div>
    </section>
  );
}
