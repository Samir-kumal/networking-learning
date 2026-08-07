"use client";

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
      className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold">
          #supernetting
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          10. Supernetting & CIDR Aggregation
        </h2>
      </div>

      <p className="text-slate-500 text-base leading-relaxed mb-8 max-w-4xl">
        <strong className="text-slate-900">Supernetting</strong> (also called <strong className="text-indigo-600">CIDR Route Aggregation</strong> or <strong className="text-emerald-600">Route Summarization</strong>) is the process of combining multiple contiguous smaller networks into a single, shorter-prefix network route. This dramatically reduces core routing table sizes and conserves memory on enterprise network backbones.
      </p>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-200 pb-4">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "overview"
              ? "bg-indigo-100 text-indigo-600 border border-indigo-300 font-semibold"
              : "bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200"
          }`}
        >
          Before vs. After Summarization
        </button>
        <button
          onClick={() => setActiveTab("binary")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "binary"
              ? "bg-emerald-500/20 text-emerald-600 border border-emerald-400/40 font-semibold"
              : "bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200"
          }`}
        >
          Binary Bitwise Analysis
        </button>
        <button
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "rules"
              ? "bg-[#ffa657]/20 text-amber-600 border border-amber-400/40 font-semibold"
              : "bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200"
          }`}
        >
          3 Rules of Supernetting
        </button>
      </div>

      {/* TAB 1: BEFORE VS AFTER ROUTE AGGREGATION */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Unsummarized Routes */}
            <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-rose-600 flex items-center gap-2">
                  <span>❌</span> Before Aggregation (4 Individual Routes)
                </h3>
                <span className="text-xs font-mono text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-400/20">
                  Bloated Routing Table
                </span>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Routers must store, query, and advertise four separate routing table entries for adjacent subnets:
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs text-slate-900 space-y-2">
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">S 192.168.0.0/24</span>
                  <span className="text-indigo-600">via 10.1.1.1</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5 pt-0.5">
                  <span className="text-slate-500">S 192.168.1.0/24</span>
                  <span className="text-indigo-600">via 10.1.1.1</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5 pt-0.5">
                  <span className="text-slate-500">S 192.168.2.0/24</span>
                  <span className="text-indigo-600">via 10.1.1.1</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-slate-500">S 192.168.3.0/24</span>
                  <span className="text-indigo-600">via 10.1.1.1</span>
                </div>
              </div>
            </div>

            {/* Aggregated Supernet Route */}
            <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-emerald-600 flex items-center gap-2">
                  <span>✅</span> After Aggregation (1 Supernet Route)
                </h3>
                <span className="text-xs font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-400/20">
                  75% Table Reduction
                </span>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                All 4 subnets are consolidated into a single summary prefix with a shorter network mask:
              </p>
              <div className="bg-slate-50 border border-emerald-400/40 rounded-lg p-4 font-mono text-xs text-slate-900 space-y-3">
                <div className="flex justify-between items-center text-sm font-bold text-emerald-600">
                  <span>S 192.168.0.0/22</span>
                  <span>via 10.1.1.1</span>
                </div>
                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                  Covers range: <code className="text-slate-900">192.168.0.0</code> to <code className="text-slate-900">192.168.3.255</code> (Total 1,024 IP addresses in 1 route entry).
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BINARY ANALYSIS */}
      {activeTab === "binary" && (
        <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Binary Matching: Finding the Common Prefix Length
            </h3>
            <p className="text-sm text-slate-500">
              To aggregate subnets, line up their network addresses in binary. The number of leading identical bits from left to right becomes the new supernet prefix length.
            </p>
          </div>

          <div className="space-y-3 font-mono text-xs sm:text-sm">
            {subnets.map((sub, idx) => (
              <div
                key={idx}
                className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <span className="text-indigo-600 font-semibold min-w-[140px]">{sub.name} ({sub.cidr}):</span>
                <div className="tracking-widest text-slate-900 overflow-x-auto">
                  {/* Highlight common 22 bits in Green */}
                  <span className="text-emerald-600 font-bold">{sub.binary.slice(0, 26)}</span>
                  <span className="text-rose-600">{sub.binary.slice(26)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 border border-emerald-400/40 p-4 rounded-lg text-xs font-mono space-y-2">
            <div className="flex justify-between text-emerald-600 font-bold text-sm">
              <span>Matching Bit Count: 22 bits</span>
              <span>Summarized Network: 192.168.0.0/22</span>
            </div>
            <p className="text-slate-500">
              Bits 1 to 22 (<code className="text-emerald-600">11000000.10101000.000000</code>) are 100% identical across all 4 subnets. The remaining 10 host bits are set to 0 to define the supernet network ID.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: THREE RULES OF SUPERNETTING */}
      {activeTab === "rules" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* RULE 1 */}
          <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow hover:card-shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center font-bold text-lg mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Contiguous Network Blocks
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                The subnets being aggregated must be strictly sequential with no missing IP address gaps in the middle of the block.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 text-xs font-mono text-indigo-600">
              Requirement: Sequential IP ranges
            </div>
          </div>

          {/* RULE 2 */}
          <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow hover:border-emerald-300 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold text-lg mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Natural Binary Boundary
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                The starting network IP address must be evenly divisible by the total number of combined IP addresses in the supernet block.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 text-xs font-mono text-emerald-600">
              Requirement: Aligned starting IP
            </div>
          </div>

          {/* RULE 3 */}
          <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow hover:border-amber-300 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold text-lg mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Power-of-2 Network Count
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                The total number of subnets being summarized must equal a power of 2 (e.g. 2, 4, 8, 16, 32 networks). You cannot summarize 3 or 5 subnets directly into one mask.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 text-xs font-mono text-amber-600">
              Requirement: 2ⁿ subnets combined
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
