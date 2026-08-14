"use client";

import NetworkingModuleHeader from "@/components/networking/NetworkingModuleHeader";
import NetworkingPanel from "@/components/networking/NetworkingPanel";
import NetworkingMetric from "@/components/networking/NetworkingMetric";
import NetworkingExample from "@/components/networking/NetworkingExample";
import NetworkingTable from "@/components/networking/NetworkingTable";
import { useState } from "react";

export default function Ipv6Section() {
  const [compressStep, setCompressStep] = useState<number>(0);

  const rawAddress = "2001:0db8:0000:0000:0000:0000:1428:57ab";
  const leadingZerosRemoved = "2001:db8:0:0:0:0:1428:57ab";
  const fullyCompressed = "2001:db8::1428:57ab";

  return (
    <section
      id="ipv6"
      className="networking-module scroll-mt-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Section Header */}
      <NetworkingModuleHeader
        anchor="#ipv6"
        icon={<span className="text-indigo-500 dark:text-indigo-400" aria-hidden="true">⑂</span>}
        title={<>10. IPv6 — The Next Generation</>}
        description={<>IPv6 replaces IPv4&apos;s 32-bit address space with a <strong className="text-slate-900 dark:text-slate-100">128-bit address space</strong> (about 3.4 × 10 to the 38th power total addresses). Its architecture supports hierarchical routing, SLAAC, and a simplified base header; IPsec is specified for IPv6 implementations, but IPv6 itself does not provide confidentiality or access control.</>}
      />
      <div className="module-content networking-module-content">

      {/* 128-Bit Hexadecimal Format Breakdown */}
      <NetworkingPanel className="mb-10">
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow mb-10">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
          IPv6 Address Anatomy: 8 Hextets (128 Bits)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Written as 8 groups of 4 hexadecimal digits (called hextets), separated by colons. Each hextet represents 16 bits (8 × 16 = 128 bits).
        </p>

        {/* Visual Hextet Breakdown */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 overflow-x-auto">
          <div className="flex flex-col gap-3 min-w-[600px]">
            <div className="grid grid-cols-8 gap-2 font-mono text-center">
              {["2001", "0db8", "85a3", "0000", "0000", "8a2e", "0370", "7334"].map((hextet, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-2.5 rounded-lg">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">Hextet {idx + 1}</div>
                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{hextet}</div>
                  <div className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-1">16 bits</div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs font-mono text-slate-500 dark:text-slate-400 pt-2 px-1 border-t border-slate-200 dark:border-slate-700">
              <span className="text-indigo-600 dark:text-indigo-400">← First 64 Bits: Network / Subnet Prefix →</span>
              <span className="text-emerald-600 dark:text-emerald-400">← Last 64 Bits: Interface ID (Host) →</span>
            </div>
          </div>
        </div>
      </div>
      </NetworkingPanel>

      {/* Interactive Zero Compression Rules */}
      <NetworkingPanel className="mb-10">
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Zero Compression Rules
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              RFC 5952 recommends a canonical text representation for IPv6 addresses. Other valid RFC 4291 representations remain valid input.
            </p>
          </div>

          {/* Interactive Step Switcher */}
          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            <button
              onClick={() => setCompressStep(0)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                compressStep === 0
                  ? "bg-indigo-600 text-slate-900 dark:text-slate-100 font-bold border-indigo-400"
                  : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
              }`}
            >
              1. Uncompressed
            </button>
            <button
              onClick={() => setCompressStep(1)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                compressStep === 1
                  ? "bg-[#ffa657] text-slate-900 dark:text-slate-100 font-bold border-amber-400"
                  : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
              }`}
            >
              2. Leading Zeros
            </button>
            <button
              onClick={() => setCompressStep(2)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                compressStep === 2
                  ? "bg-emerald-500 text-slate-900 dark:text-slate-100 font-bold border-emerald-400"
                  : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
              }`}
            >
              3. Fully Compressed (::)
            </button>
          </div>
        </div>

        {/* Live Compression Box */}
        <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-5 rounded-xl font-mono text-center mb-6">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
            {compressStep === 0 && "Step 1: Original Uncompressed IPv6 Address"}
            {compressStep === 1 && "Step 2: Rule 1 — Omit Leading Zeros in Each Hextet"}
            {compressStep === 2 && "Step 3: Rule 2 — Compress Consecutive Zero Hextets with ::"}
          </div>

          <div className="text-lg sm:text-2xl font-bold transition-all py-2 text-indigo-600 dark:text-indigo-400 break-all whitespace-normal">
            {compressStep === 0 && rawAddress}
            {compressStep === 1 && leadingZerosRemoved}
            {compressStep === 2 && fullyCompressed}
          </div>
        </div>

        {/* Rule Explanations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl space-y-2">
            <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <span>Rule 1: Omit Leading Zeros</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              In any hextet, leading zeros can be dropped. For example, <code className="text-slate-900 dark:text-slate-100">0db8</code> becomes <code className="text-amber-600 dark:text-amber-400">db8</code>, and <code className="text-slate-900 dark:text-slate-100">0000</code> becomes <code className="text-amber-600 dark:text-amber-400">0</code>.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl space-y-2">
            <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <span>Rule 2: Double Colon (::) Compression</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              A single contiguous sequence of all-zero hextets can be replaced with <code className="text-emerald-600 dark:text-emerald-400">::</code>. 
              <strong className="text-rose-600 dark:text-rose-400 block mt-1">Critical Constraint:</strong> <code className="text-emerald-600 dark:text-emerald-400">::</code> can only be used ONCE per address to prevent ambiguity when parsing.
            </p>
          </div>
        </div>
      </div>
      </NetworkingPanel>

      {/* IPv4 vs IPv6 Comparison Table */}
      <div className="mb-10">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
          IPv4 vs IPv6 Feature Matrix
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Architectural comparison between legacy IPv4 protocols and modern IPv6 standards.
        </p>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-700">
          <NetworkingTable>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-mono">
                <th className="p-3">Feature</th>
                <th className="p-3">IPv4 Standard</th>
                <th className="p-3">IPv6 Standard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d] text-slate-900 dark:text-slate-100">
              <tr className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-3 font-semibold text-slate-500 dark:text-slate-400">Address Size</td>
                <td className="p-3 font-mono text-rose-600 dark:text-rose-400">32 Bits (4 Bytes)</td>
                <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400">128 Bits (16 Bytes)</td>
              </tr>
              <tr className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-3 font-semibold text-slate-500 dark:text-slate-400">Total Address Count</td>
                <td className="p-3 font-mono text-slate-500 dark:text-slate-400">~4.3 Billion (4.3 × 10 to the 9th power)</td>
                <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400">~340 Undecillion (3.4 × 10 to the 38th power)</td>
              </tr>
              <tr className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-3 font-semibold text-slate-500 dark:text-slate-400">Format Notation</td>
                <td className="p-3 font-mono">Dotted Decimal (e.g. 192.168.1.1)</td>
                <td className="p-3 font-mono text-indigo-600 dark:text-indigo-400">Hexadecimal Colons (e.g. 2001:db8::1)</td>
              </tr>
              <tr className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-3 font-semibold text-slate-500 dark:text-slate-400">Prefix Length</td>
                <td className="p-3 font-mono text-amber-600 dark:text-amber-400">Variable prefixes (/0 to /32)</td>
                <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400">/64 is common for SLAAC subnets; other prefixes exist</td>
              </tr>
              <tr className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-3 font-semibold text-slate-500 dark:text-slate-400">Address Auto-Configuration</td>
                <td className="p-3">Static configuration or DHCPv4 are common options</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400">SLAAC can configure addresses; DHCPv6 can supply other parameters or addresses</td>
              </tr>
              <tr className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-3 font-semibold text-slate-500 dark:text-slate-400">NAT Use</td>
                <td className="p-3 text-rose-600 dark:text-rose-400">Commonly used to conserve public IPv4 space, but not required by IPv4</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400">Usually unnecessary for address conservation; filtering is still required</td>
              </tr>
            </tbody>
          </table>
          </NetworkingTable>
        </div>
      </div>

      {/* /64 Common Subnets Card */}
      <NetworkingExample title="Why IPv6 LANs Commonly Use /64" description={<>Many IPv6 LANs use <strong className="text-emerald-600 dark:text-emerald-400">/64</strong> subnets because SLAAC is designed around a 64-bit interface identifier. Point-to-point links, loopbacks, and infrastructure-specific designs may use other prefix lengths, so /64 is a convention rather than a universal rule.</>} tone="lime">
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold">
            /64 Common Subnet
          </span>
        </div>

        <NetworkingMetric label="Addresses per /64" value="2⁶⁴" detail="18.4 quintillion host addresses" tone="lime" className="mb-4" />
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 font-mono text-xs space-y-3">
          <div className="flex flex-col sm:flex-row justify-between text-slate-500 dark:text-slate-400">
            <span>IPv6 /64 Subnet Structure:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Total Host Addresses per /64 = 18.4 Quintillion (2 to the 64th power)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded bg-slate-50 dark:bg-slate-700 border border-indigo-300">
              <div className="text-indigo-600 dark:text-indigo-400 font-bold text-[11px] mb-1">Documentation Prefix (48 Bits)</div>
              <div className="text-slate-500 dark:text-slate-400">Reserved for examples (RFC 3849)</div>
              <div className="text-slate-900 dark:text-slate-100 font-bold mt-1">2001:0db8:85a3</div>
            </div>

            <div className="p-3 rounded bg-slate-50 dark:bg-slate-700 border border-amber-400/40">
              <div className="text-amber-600 dark:text-amber-400 font-bold text-[11px] mb-1">Subnet ID (16 Bits)</div>
              <div className="text-slate-500 dark:text-slate-400">Internal Subnet Allocation</div>
              <div className="text-slate-900 dark:text-slate-100 font-bold mt-1">:0001:</div>
            </div>

            <div className="p-3 rounded bg-slate-50 dark:bg-slate-700 border border-emerald-400/40">
              <div className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] mb-1">Interface ID (64 Bits)</div>
              <div className="text-slate-500 dark:text-slate-400">Host address (SLAAC, stable, or temporary)</div>
              <div className="text-slate-900 dark:text-slate-100 font-bold mt-1">:0000:0000:0000:0001</div>
            </div>
          </div>
        </div>
      </div>
      </NetworkingExample>
      </div>
    </section>
  );
}
