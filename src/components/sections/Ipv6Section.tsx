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
      className="scroll-mt-24 rounded-2xl bg-[#161b22] border border-[#30363d] p-6 sm:p-8 transition-colors hover:border-[#58a6ff]/40"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-md bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20 text-xs font-mono font-semibold">
          #ipv6
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#e6edf3]">
          6. IPv6 — The Next Generation
        </h2>
      </div>

      <p className="text-[#8b949e] text-base leading-relaxed mb-8 max-w-4xl">
        IPv6 replaces IPv4's 32-bit address space with a massive <strong className="text-[#e6edf3]">128-bit address space</strong> ($3.4 \times 10^{38}$ total addresses). Designed to eliminate NAT workarounds, IPv6 provides end-to-end global connectivity, built-in IPsec security, stateless auto-configuration (SLAAC), and simplified router headers.
      </p>

      {/* 128-Bit Hexadecimal Format Breakdown */}
      <div className="rounded-xl bg-[#0d1117] border border-[#30363d] p-6 mb-10">
        <h3 className="text-lg font-bold text-[#e6edf3] mb-2">
          IPv6 Address Anatomy: 8 Hextets (128 Bits)
        </h3>
        <p className="text-xs text-[#8b949e] mb-6">
          Written as 8 groups of 4 hexadecimal digits (called hextets), separated by colons. Each hextet represents 16 bits ($8 \times 16 = 128$ bits).
        </p>

        {/* Visual Hextet Breakdown */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 overflow-x-auto">
          <div className="flex flex-col gap-3 min-w-[600px]">
            <div className="grid grid-cols-8 gap-2 font-mono text-center">
              {["2001", "0db8", "85a3", "0000", "0000", "8a2e", "0370", "7334"].map((hextet, idx) => (
                <div key={idx} className="bg-[#0d1117] border border-[#30363d] p-2.5 rounded-lg">
                  <div className="text-[10px] text-[#8b949e] mb-1">Hextet {idx + 1}</div>
                  <div className="text-xs font-bold text-[#58a6ff]">{hextet}</div>
                  <div className="text-[9px] text-[#7ee787] mt-1">16 bits</div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs font-mono text-[#8b949e] pt-2 px-1 border-t border-[#30363d]">
              <span className="text-[#58a6ff]">← First 64 Bits: Network / Subnet Prefix →</span>
              <span className="text-[#7ee787]">← Last 64 Bits: Interface ID (Host) →</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Zero Compression Rules */}
      <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-6 mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#30363d]">
          <div>
            <h3 className="text-lg font-bold text-[#e6edf3]">
              Zero Compression Rules
            </h3>
            <p className="text-xs text-[#8b949e]">
              To make long IPv6 addresses human-readable, RFC 5952 establishes two mandatory compression rules.
            </p>
          </div>

          {/* Interactive Step Switcher */}
          <div className="flex gap-2">
            <button
              onClick={() => setCompressStep(0)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                compressStep === 0
                  ? "bg-[#58a6ff] text-[#0d1117] font-bold border-[#58a6ff]"
                  : "bg-[#161b22] text-[#8b949e] border-[#30363d]"
              }`}
            >
              1. Uncompressed
            </button>
            <button
              onClick={() => setCompressStep(1)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                compressStep === 1
                  ? "bg-[#ffa657] text-[#0d1117] font-bold border-[#ffa657]"
                  : "bg-[#161b22] text-[#8b949e] border-[#30363d]"
              }`}
            >
              2. Leading Zeros
            </button>
            <button
              onClick={() => setCompressStep(2)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                compressStep === 2
                  ? "bg-[#7ee787] text-[#0d1117] font-bold border-[#7ee787]"
                  : "bg-[#161b22] text-[#8b949e] border-[#30363d]"
              }`}
            >
              3. Fully Compressed (::)
            </button>
          </div>
        </div>

        {/* Live Compression Box */}
        <div className="bg-[#0d1117] border border-[#30363d] p-5 rounded-xl font-mono text-center mb-6">
          <div className="text-xs text-[#8b949e] mb-2 uppercase tracking-wider">
            {compressStep === 0 && "Step 1: Original Uncompressed IPv6 Address"}
            {compressStep === 1 && "Step 2: Rule 1 — Omit Leading Zeros in Each Hextet"}
            {compressStep === 2 && "Step 3: Rule 2 — Compress Consecutive Zero Hextets with ::"}
          </div>

          <div className="text-lg sm:text-2xl font-bold transition-all py-2 text-[#58a6ff]">
            {compressStep === 0 && rawAddress}
            {compressStep === 1 && leadingZerosRemoved}
            {compressStep === 2 && fullyCompressed}
          </div>
        </div>

        {/* Rule Explanations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-xl space-y-2">
            <div className="font-bold text-[#ffa657] flex items-center gap-2">
              <span>Rule 1: Omit Leading Zeros</span>
            </div>
            <p className="text-[#8b949e] leading-relaxed">
              In any hextet, leading zeros can be dropped. For example, <code className="text-[#e6edf3]">0db8</code> becomes <code className="text-[#ffa657]">db8</code>, and <code className="text-[#e6edf3]">0000</code> becomes <code className="text-[#ffa657]">0</code>.
            </p>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-xl space-y-2">
            <div className="font-bold text-[#7ee787] flex items-center gap-2">
              <span>Rule 2: Double Colon (::) Compression</span>
            </div>
            <p className="text-[#8b949e] leading-relaxed">
              A single contiguous sequence of all-zero hextets can be replaced with <code className="text-[#7ee787]">::</code>. 
              <strong className="text-[#ff7b72] block mt-1">Critical Constraint:</strong> <code className="text-[#7ee787]">::</code> can only be used ONCE per address to prevent ambiguity when parsing.
            </p>
          </div>
        </div>
      </div>

      {/* IPv4 vs IPv6 Comparison Table */}
      <div className="mb-10">
        <h3 className="text-lg font-bold text-[#e6edf3] mb-2">
          IPv4 vs IPv6 Feature Matrix
        </h3>
        <p className="text-sm text-[#8b949e] mb-4">
          Architectural comparison between legacy IPv4 protocols and modern IPv6 standards.
        </p>

        <div className="overflow-x-auto border border-[#30363d] rounded-xl bg-[#0d1117]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#161b22] text-[#8b949e] border-b border-[#30363d] font-mono">
                <th className="p-3">Feature</th>
                <th className="p-3">IPv4 Standard</th>
                <th className="p-3">IPv6 Standard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d] text-[#e6edf3]">
              <tr className="hover:bg-[#161b22]/50 transition-colors">
                <td className="p-3 font-semibold text-[#8b949e]">Address Size</td>
                <td className="p-3 font-mono text-[#ff7b72]">32 Bits (4 Bytes)</td>
                <td className="p-3 font-mono text-[#7ee787]">128 Bits (16 Bytes)</td>
              </tr>
              <tr className="hover:bg-[#161b22]/50 transition-colors">
                <td className="p-3 font-semibold text-[#8b949e]">Total Address Count</td>
                <td className="p-3 font-mono text-[#8b949e]">~4.3 Billion ($4.3 \times 10^9$)</td>
                <td className="p-3 font-mono text-[#7ee787]">~340 Undecillion ($3.4 \times 10^{38}$)</td>
              </tr>
              <tr className="hover:bg-[#161b22]/50 transition-colors">
                <td className="p-3 font-semibold text-[#8b949e]">Format Notation</td>
                <td className="p-3 font-mono">Dotted Decimal (e.g. 192.168.1.1)</td>
                <td className="p-3 font-mono text-[#58a6ff]">Hexadecimal Colons (e.g. 2001:db8::1)</td>
              </tr>
              <tr className="hover:bg-[#161b22]/50 transition-colors">
                <td className="p-3 font-semibold text-[#8b949e]">Standard Subnet Mask</td>
                <td className="p-3 font-mono text-[#ffa657]">Variable Prefixes (/8 to /32)</td>
                <td className="p-3 font-mono text-[#7ee787]">Standard /64 Interface Prefix</td>
              </tr>
              <tr className="hover:bg-[#161b22]/50 transition-colors">
                <td className="p-3 font-semibold text-[#8b949e]">Address Auto-Configuration</td>
                <td className="p-3">Stateful DHCP required</td>
                <td className="p-3 text-[#7ee787]">Stateless SLAAC & Stateful DHCPv6</td>
              </tr>
              <tr className="hover:bg-[#161b22]/50 transition-colors">
                <td className="p-3 font-semibold text-[#8b949e]">NAT Requirement</td>
                <td className="p-3 text-[#ff7b72]">Mandatory (address space exhaustion)</td>
                <td className="p-3 text-[#7ee787]">Obsolete (Every host receives public IP)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* /64 Standard Subnets Card */}
      <div className="rounded-xl bg-[#0d1117] border border-[#30363d] p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2.5 py-1 rounded bg-[#7ee787]/20 text-[#7ee787] text-xs font-mono font-bold">
            /64 Standard Subnet
          </span>
          <h3 className="text-lg font-bold text-[#e6edf3]">
            The Universal IPv6 /64 Subnet Prefix
          </h3>
        </div>
        <p className="text-sm text-[#8b949e] leading-relaxed mb-6">
          Unlike IPv4 where subnets vary in size, the standard subnet size in IPv6 is almost universally <strong className="text-[#7ee787]">/64</strong>. This leaves 64 bits for the Interface ID, allowing SLAAC (Stateless Address Autoconfiguration) to automatically generate unique host addresses.
        </p>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 font-mono text-xs space-y-3">
          <div className="flex flex-col sm:flex-row justify-between text-[#8b949e]">
            <span>IPv6 /64 Subnet Structure:</span>
            <span className="text-[#7ee787] font-bold">Total Host Addresses per /64 = 18.4 Quintillion ($2^{64}$)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded bg-[#0d1117] border border-[#58a6ff]/40">
              <div className="text-[#58a6ff] font-bold text-[11px] mb-1">Global Routing Prefix (48 Bits)</div>
              <div className="text-[#8b949e]">Assigned by ISP / RIR</div>
              <div className="text-[#e6edf3] font-bold mt-1">2001:0db8:85a3</div>
            </div>

            <div className="p-3 rounded bg-[#0d1117] border border-[#ffa657]/40">
              <div className="text-[#ffa657] font-bold text-[11px] mb-1">Subnet ID (16 Bits)</div>
              <div className="text-[#8b949e]">Internal Subnet Allocation</div>
              <div className="text-[#e6edf3] font-bold mt-1">:0001:</div>
            </div>

            <div className="p-3 rounded bg-[#0d1117] border border-[#7ee787]/40">
              <div className="text-[#7ee787] font-bold text-[11px] mb-1">Interface ID (64 Bits)</div>
              <div className="text-[#8b949e]">Host Address (SLAAC / EUI-64)</div>
              <div className="text-[#e6edf3] font-bold mt-1">:0000:0000:0000:0001</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
