"use client";

import { useState } from "react";

export default function Ipv6Section() {
  const [compressStep, setCompressStep] = useState<number>(0);

  const rawAddress = "2001:0db8:0000:0000:0000:0000:1428:57ab";
  const leadingZerosRemoved = "2001:db8:0:0:0:0:1428:57ab";
  const fullyCompressed = "2001:db8::1428:57ab";

  return (
    <section
      id="ipv6"
      className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold">
          #ipv6
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          6. IPv6 — The Next Generation
        </h2>
      </div>

      <p className="text-slate-500 text-base leading-relaxed mb-8 max-w-4xl">
        IPv6 replaces IPv4's 32-bit address space with a massive <strong className="text-slate-900">128-bit address space</strong> ($3.4 \times 10^{38}$ total addresses). Designed to eliminate NAT workarounds, IPv6 provides end-to-end global connectivity, built-in IPsec security, stateless auto-configuration (SLAAC), and simplified router headers.
      </p>

      {/* 128-Bit Hexadecimal Format Breakdown */}
      <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow mb-10">
        <h3 className="text-lg font-bold text-slate-900 mb-2">
          IPv6 Address Anatomy: 8 Hextets (128 Bits)
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Written as 8 groups of 4 hexadecimal digits (called hextets), separated by colons. Each hextet represents 16 bits ($8 \times 16 = 128$ bits).
        </p>

        {/* Visual Hextet Breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 overflow-x-auto">
          <div className="flex flex-col gap-3 min-w-[600px]">
            <div className="grid grid-cols-8 gap-2 font-mono text-center">
              {["2001", "0db8", "85a3", "0000", "0000", "8a2e", "0370", "7334"].map((hextet, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                  <div className="text-[10px] text-slate-500 mb-1">Hextet {idx + 1}</div>
                  <div className="text-xs font-bold text-indigo-600">{hextet}</div>
                  <div className="text-[9px] text-emerald-600 mt-1">16 bits</div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs font-mono text-slate-500 pt-2 px-1 border-t border-slate-200">
              <span className="text-indigo-600">← First 64 Bits: Network / Subnet Prefix →</span>
              <span className="text-emerald-600">← Last 64 Bits: Interface ID (Host) →</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Zero Compression Rules */}
      <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Zero Compression Rules
            </h3>
            <p className="text-xs text-slate-500">
              To make long IPv6 addresses human-readable, RFC 5952 establishes two mandatory compression rules.
            </p>
          </div>

          {/* Interactive Step Switcher */}
          <div className="flex gap-2">
            <button
              onClick={() => setCompressStep(0)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                compressStep === 0
                  ? "bg-indigo-600 text-slate-900 font-bold border-indigo-400"
                  : "bg-white text-slate-500 border-slate-200"
              }`}
            >
              1. Uncompressed
            </button>
            <button
              onClick={() => setCompressStep(1)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                compressStep === 1
                  ? "bg-[#ffa657] text-slate-900 font-bold border-amber-400"
                  : "bg-white text-slate-500 border-slate-200"
              }`}
            >
              2. Leading Zeros
            </button>
            <button
              onClick={() => setCompressStep(2)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                compressStep === 2
                  ? "bg-emerald-500 text-slate-900 font-bold border-emerald-400"
                  : "bg-white text-slate-500 border-slate-200"
              }`}
            >
              3. Fully Compressed (::)
            </button>
          </div>
        </div>

        {/* Live Compression Box */}
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl font-mono text-center mb-6">
          <div className="text-xs text-slate-500 mb-2 uppercase tracking-wider">
            {compressStep === 0 && "Step 1: Original Uncompressed IPv6 Address"}
            {compressStep === 1 && "Step 2: Rule 1 — Omit Leading Zeros in Each Hextet"}
            {compressStep === 2 && "Step 3: Rule 2 — Compress Consecutive Zero Hextets with ::"}
          </div>

          <div className="text-lg sm:text-2xl font-bold transition-all py-2 text-indigo-600">
            {compressStep === 0 && rawAddress}
            {compressStep === 1 && leadingZerosRemoved}
            {compressStep === 2 && fullyCompressed}
          </div>
        </div>

        {/* Rule Explanations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-2">
            <div className="font-bold text-amber-600 flex items-center gap-2">
              <span>Rule 1: Omit Leading Zeros</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              In any hextet, leading zeros can be dropped. For example, <code className="text-slate-900">0db8</code> becomes <code className="text-amber-600">db8</code>, and <code className="text-slate-900">0000</code> becomes <code className="text-amber-600">0</code>.
            </p>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-2">
            <div className="font-bold text-emerald-600 flex items-center gap-2">
              <span>Rule 2: Double Colon (::) Compression</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              A single contiguous sequence of all-zero hextets can be replaced with <code className="text-emerald-600">::</code>. 
              <strong className="text-rose-600 block mt-1">Critical Constraint:</strong> <code className="text-emerald-600">::</code> can only be used ONCE per address to prevent ambiguity when parsing.
            </p>
          </div>
        </div>
      </div>

      {/* IPv4 vs IPv6 Comparison Table */}
      <div className="mb-10">
        <h3 className="text-lg font-bold text-slate-900 mb-2">
          IPv4 vs IPv6 Feature Matrix
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Architectural comparison between legacy IPv4 protocols and modern IPv6 standards.
        </p>

        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-slate-50">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white text-slate-500 border-b border-slate-200 font-mono">
                <th className="p-3">Feature</th>
                <th className="p-3">IPv4 Standard</th>
                <th className="p-3">IPv6 Standard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d] text-slate-900">
              <tr className="hover:bg-white/50 transition-colors">
                <td className="p-3 font-semibold text-slate-500">Address Size</td>
                <td className="p-3 font-mono text-rose-600">32 Bits (4 Bytes)</td>
                <td className="p-3 font-mono text-emerald-600">128 Bits (16 Bytes)</td>
              </tr>
              <tr className="hover:bg-white/50 transition-colors">
                <td className="p-3 font-semibold text-slate-500">Total Address Count</td>
                <td className="p-3 font-mono text-slate-500">~4.3 Billion ($4.3 \times 10^9$)</td>
                <td className="p-3 font-mono text-emerald-600">~340 Undecillion ($3.4 \times 10^{38}$)</td>
              </tr>
              <tr className="hover:bg-white/50 transition-colors">
                <td className="p-3 font-semibold text-slate-500">Format Notation</td>
                <td className="p-3 font-mono">Dotted Decimal (e.g. 192.168.1.1)</td>
                <td className="p-3 font-mono text-indigo-600">Hexadecimal Colons (e.g. 2001:db8::1)</td>
              </tr>
              <tr className="hover:bg-white/50 transition-colors">
                <td className="p-3 font-semibold text-slate-500">Standard Subnet Mask</td>
                <td className="p-3 font-mono text-amber-600">Variable Prefixes (/8 to /32)</td>
                <td className="p-3 font-mono text-emerald-600">Standard /64 Interface Prefix</td>
              </tr>
              <tr className="hover:bg-white/50 transition-colors">
                <td className="p-3 font-semibold text-slate-500">Address Auto-Configuration</td>
                <td className="p-3">Stateful DHCP required</td>
                <td className="p-3 text-emerald-600">Stateless SLAAC & Stateful DHCPv6</td>
              </tr>
              <tr className="hover:bg-white/50 transition-colors">
                <td className="p-3 font-semibold text-slate-500">NAT Requirement</td>
                <td className="p-3 text-rose-600">Mandatory (address space exhaustion)</td>
                <td className="p-3 text-emerald-600">Obsolete (Every host receives public IP)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* /64 Standard Subnets Card */}
      <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-600 text-xs font-mono font-bold">
            /64 Standard Subnet
          </span>
          <h3 className="text-lg font-bold text-slate-900">
            The Universal IPv6 /64 Subnet Prefix
          </h3>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          Unlike IPv4 where subnets vary in size, the standard subnet size in IPv6 is almost universally <strong className="text-emerald-600">/64</strong>. This leaves 64 bits for the Interface ID, allowing SLAAC (Stateless Address Autoconfiguration) to automatically generate unique host addresses.
        </p>

        <div className="bg-white border border-slate-200 rounded-xl p-4 font-mono text-xs space-y-3">
          <div className="flex flex-col sm:flex-row justify-between text-slate-500">
            <span>IPv6 /64 Subnet Structure:</span>
            <span className="text-emerald-600 font-bold">Total Host Addresses per /64 = 18.4 Quintillion ($2^{64}$)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded bg-slate-50 border border-indigo-300">
              <div className="text-indigo-600 font-bold text-[11px] mb-1">Global Routing Prefix (48 Bits)</div>
              <div className="text-slate-500">Assigned by ISP / RIR</div>
              <div className="text-slate-900 font-bold mt-1">2001:0db8:85a3</div>
            </div>

            <div className="p-3 rounded bg-slate-50 border border-amber-400/40">
              <div className="text-amber-600 font-bold text-[11px] mb-1">Subnet ID (16 Bits)</div>
              <div className="text-slate-500">Internal Subnet Allocation</div>
              <div className="text-slate-900 font-bold mt-1">:0001:</div>
            </div>

            <div className="p-3 rounded bg-slate-50 border border-emerald-400/40">
              <div className="text-emerald-600 font-bold text-[11px] mb-1">Interface ID (64 Bits)</div>
              <div className="text-slate-500">Host Address (SLAAC / EUI-64)</div>
              <div className="text-slate-900 font-bold mt-1">:0000:0000:0000:0001</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
