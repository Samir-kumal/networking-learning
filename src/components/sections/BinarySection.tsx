"use client";

import NetworkingModuleHeader from "@/components/networking/NetworkingModuleHeader";
import NetworkingPanel from "@/components/networking/NetworkingPanel";
import NetworkingTable from "@/components/networking/NetworkingTable";
import { useState } from "react";

function toBinaryString(num: number): string {
  const clamped = Math.max(0, Math.min(255, isNaN(num) ? 0 : num));
  return clamped.toString(2).padStart(8, "0");
}

export default function BinarySection() {
  const [octets, setOctets] = useState<[number, number, number, number]>([192, 168, 1, 100]);

  const handleOctetChange = (index: number, val: string) => {
    const parsed = parseInt(val, 10);
    const updated = [...octets] as [number, number, number, number];
    updated[index] = isNaN(parsed) ? 0 : Math.max(0, Math.min(255, parsed));
    setOctets(updated);
  };

  const binaryStrings = octets.map(toBinaryString);
  const bitWeights = [128, 64, 32, 16, 8, 4, 2, 1];

  return (
    <section
      id="binary"
      className="networking-module scroll-mt-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Section Header */}
      <NetworkingModuleHeader
        anchor="#binary"
        icon={<span className="text-indigo-500 dark:text-indigo-400" aria-hidden="true">⊞</span>}
        title={<>2. IP Addresses & Binary</>}
        description={<>Every IPv4 address is a 32-bit binary number represented in 4 decimal octets separated by dots.
        Understanding bit values, positional binary weights (128, 64, 32, 16, 8, 4, 2, 1), and bitwise operations is fundamental to networking.</>}
      />
      <div className="module-content networking-module-content">
      <NetworkingPanel className="mb-10">

      {/* Interactive Live 4-Octet Converter */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Live 4-Octet Decimal to Binary Converter
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter values from 0 to 255 for each octet to visualize their 8-bit binary representation in real time.
            </p>
          </div>
          <div className="font-mono text-sm px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 font-bold">
            {octets.join(".")}
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {octets.map((oct, idx) => (
            <div key={idx} className="space-y-1.5">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 flex justify-between" htmlFor={`binary-octet-${idx}`}>
                <span>Octet {idx + 1}</span>
                <span className="text-indigo-600 dark:text-indigo-400">8 bits</span>
              </label>
              <input
                id={`binary-octet-${idx}`}
                type="number"
                min={0}
                max={255}
                value={oct}
                onChange={(e) => handleOctetChange(idx, e.target.value)}
                aria-label={`IPv4 octet ${idx + 1}, value from 0 to 255`}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-400 focus:outline-none text-slate-900 dark:text-slate-100 font-mono text-center font-bold px-3 py-2 rounded-lg text-lg transition-colors"
              />
            </div>
          ))}
        </div>

        {/* Live Binary Display Grid with Weights */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {binaryStrings.map((binStr, oIdx) => (
            <div key={oIdx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400 text-center mb-2 pb-1 border-b border-slate-200 dark:border-slate-700">
                Octet {oIdx + 1}: <span className="text-slate-900 dark:text-slate-100 font-bold">{octets[oIdx]}</span>
              </div>
              
              {/* Bit Boxes with Weights */}
              <div className="grid grid-cols-8 gap-1 text-center font-mono">
                {bitWeights.map((w, bIdx) => {
                  const isOne = binStr[bIdx] === "1";
                  return (
                    <div key={bIdx} className="flex flex-col items-center">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 mb-1">{w}</span>
                      <div
                        className={`w-full py-1.5 rounded text-xs font-bold transition-all ${
                          isOne
                            ? "bg-indigo-600 text-slate-900 dark:text-slate-100 shadow-sm shadow-[#58a6ff]/30"
                            : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {binStr[bIdx]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Combined 32-Bit String */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <span className="text-slate-500 dark:text-slate-400">Full 32-Bit Binary Representation:</span>
          <span className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 font-bold tracking-wider text-center sm:text-left">
            {binaryStrings.join(" . ")}
          </span>
        </div>
      </div>
      </NetworkingPanel>
      <NetworkingPanel className="mb-10">

      {/* Address Structure & Network vs Host Breakdown */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow mb-10">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
          IPv4 Address Anatomy: Network ID vs Host ID
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
          A subnet mask divides an IPv4 address into a network prefix and host portion. Hosts use this relationship to decide whether a destination is on-link; routers use destination prefixes during route lookup to choose a next hop.
        </p>

        {/* Code block style diagram */}
        <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-4 overflow-x-auto font-mono text-xs text-slate-900 dark:text-slate-100">
          <div className="flex flex-col gap-2 min-w-[550px]">
            <div className="flex justify-between text-slate-500 dark:text-slate-400 px-1">
              <span>Bit 1</span>
              <span>← Network Prefix Bits (1s in Mask) →</span>
              <span>← Host Suffix Bits (0s in Mask) →</span>
              <span>Bit 32</span>
            </div>

            {/* 32-bit bar representation for /24 */}
            <div className="grid grid-cols-32 gap-0.5 h-8 rounded bg-white dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="bg-indigo-600 rounded-sm flex items-center justify-center text-[9px] text-slate-900 dark:text-slate-100 font-bold" title={`Network bit ${i + 1}`}>
                  1
                </div>
              ))}
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-emerald-500/20 border border-emerald-400/40 rounded-sm flex items-center justify-center text-[9px] text-emerald-600 dark:text-emerald-400 font-bold" title={`Host bit ${i + 25}`}>
                  0
                </div>
              ))}
            </div>

            <div className="flex justify-between text-xs pt-1 px-1">
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">24 Network Bits (e.g. /24 Subnet)</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">8 Host Bits (2 to the 8th power minus 2 equals 254 hosts)</span>
            </div>
          </div>
        </div>
      </div>
      </NetworkingPanel>

      {/* RFC 1918 Private Ranges Table */}
      <div className="mb-10">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          RFC 1918 Private IPv4 Ranges
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          RFC 1918 designates three IPv4 blocks for private internets. The addresses may be reused by different organizations, and routing information for them should not cross inter-enterprise links.
        </p>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-700">
          <NetworkingTable>
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="p-3">Class</th>
                <th className="p-3">CIDR Block</th>
                <th className="p-3">IP Address Range</th>
                <th className="p-3">Total Addresses</th>
                <th className="p-3">Typical Application</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d] text-slate-900 dark:text-slate-100">
              <tr className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">10/8 block</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400">10.0.0.0 / 8</td>
                <td className="p-3">10.0.0.0 — 10.255.255.255</td>
                <td className="p-3">16,777,216</td>
                <td className="p-3 text-slate-500 dark:text-slate-400">Enterprise networks and cloud VPCs</td>
              </tr>
              <tr className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-3 font-bold text-violet-600 dark:text-violet-400">172.16/12 block</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400">172.16.0.0 / 12</td>
                <td className="p-3">172.16.0.0 — 172.31.255.255</td>
                <td className="p-3">1,048,576</td>
                <td className="p-3 text-slate-500 dark:text-slate-400">Enterprise networks and container bridges</td>
              </tr>
              <tr className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-3 font-bold text-amber-600 dark:text-amber-400">192.168/16 block</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400">192.168.0.0 / 16</td>
                <td className="p-3">192.168.0.0 — 192.168.255.255</td>
                <td className="p-3">65,536</td>
                <td className="p-3 text-slate-500 dark:text-slate-400">Home, SOHO, and local networks</td>
              </tr>
            </tbody>
          </table>
          </NetworkingTable>
        </div>
      </div>

      {/* Classful vs CIDR Table */}
      <div className="mb-10">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
          Classful vs CIDR Addressing
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Historical Classful routing forced rigid network boundaries, leading to rapid IP address exhaustion. CIDR (Classless Inter-Domain Routing) introduced variable-length prefix masks.
        </p>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-700">
          <NetworkingTable>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-mono">
                <th className="p-3">Feature</th>
                <th className="p-3">Legacy Classful Routing (Historical)</th>
                <th className="p-3">Modern CIDR (RFC 1519)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d] text-slate-900 dark:text-slate-100">
              <tr className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-3 font-semibold text-slate-500 dark:text-slate-400">Mask Allocation</td>
                <td className="p-3 text-rose-600 dark:text-rose-400">Fixed class boundaries (/8, /16, /24)</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400">Any prefix from /0 to /32</td>
              </tr>
              <tr className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-3 font-semibold text-slate-500 dark:text-slate-400">Routing Protocol Support</td>
                <td className="p-3">RIPv1 and IGRP used classful updates (historical)</td>
                <td className="p-3 text-indigo-600 dark:text-indigo-400">OSPF, BGP4, RIPv2, and IS-IS carry prefix information</td>
              </tr>
              <tr className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-3 font-semibold text-slate-500 dark:text-slate-400">IP Utilization Efficiency</td>
                <td className="p-3 text-rose-600 dark:text-rose-400">Often wasteful for networks smaller than a class boundary</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400">VLSM enables subnet sizing to match requirements</td>
              </tr>
              <tr className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-3 font-semibold text-slate-500 dark:text-slate-400">Route Table Aggregation</td>
                <td className="p-3">Limited to classful boundaries</td>
                <td className="p-3 text-violet-600 dark:text-violet-400">Supports arbitrary aligned CIDR summaries</td>
              </tr>
            </tbody>
          </table>
          </NetworkingTable>
        </div>
      </div>
      
      {/* Special Addresses Cards (Loopback & APIPA) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded bg-[#bc8cff]/20 text-violet-600 dark:text-violet-400 text-xs font-mono font-bold">
              127.0.0.0 / 8
            </span>
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Loopback Address Space</h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
            Reserved for host-internal network stack testing (<code className="text-violet-600 dark:text-violet-400">127.0.0.1</code> / localhost). Traffic sent to loopback is handled by the host and does not reach a physical interface or switch port.
          </p>
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-700">
            ping 127.0.0.1 → Tests local TCP/IP protocol stack functionality
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded bg-[#ffa657]/20 text-amber-600 dark:text-amber-400 text-xs font-mono font-bold">
              169.254.0.0 / 16
            </span>
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">IPv4 Link-Local (APIPA)</h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
            A host may self-configure an IPv4 link-local address when no routable configuration is available. RFC 3927 limits communication to the same physical or logical link; it is not an Internet-routable fallback.
          </p>
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-700">
            Usable selection space: 169.254.1.0 — 169.254.254.255 (excluding the first and last /24 portions)
          </div>
        </div>
      </div>
      <NetworkingPanel>
      
      {/* Bitwise AND Visual Block */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
          Bitwise AND Operation: Calculating Network Address
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          A bitwise <code className="text-indigo-600 dark:text-indigo-400">AND</code> between an IPv4 address and its subnet mask produces the address of the containing subnet. Hosts and routing software use this calculation when determining local scope and route matches.
        </p>

        {/* Calculation Visual */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 font-mono text-xs space-y-4">
          {/* IP Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
            <span className="sm:col-span-3 text-slate-500 dark:text-slate-400">Host IP (192.168.1.100):</span>
            <span className="sm:col-span-9 text-indigo-600 dark:text-indigo-400 font-bold bg-slate-50 dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-700 tracking-wider">
              11000000 . 10101000 . 00000001 . 01100100
            </span>
          </div>

          {/* Mask Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
            <span className="sm:col-span-3 text-slate-500 dark:text-slate-400">Subnet Mask (255.255.255.0):</span>
            <span className="sm:col-span-9 text-emerald-600 dark:text-emerald-400 font-bold bg-slate-50 dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-700 tracking-wider">
              11111111 . 11111111 . 11111111 . 00000000
            </span>
          </div>

          {/* Operator Indicator */}
          <div className="border-t border-b border-slate-200 dark:border-slate-700 py-1 text-center text-amber-600 dark:text-amber-400 font-bold tracking-widest text-[11px]">
            AND OPERATOR (1 AND 1 = 1, ALL OTHER COMBINATIONS = 0)
          </div>

          {/* Result Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
            <span className="sm:col-span-3 text-slate-900 dark:text-slate-100 font-bold">Network ID (192.168.1.0):</span>
            <span className="sm:col-span-9 text-violet-600 dark:text-violet-400 font-bold bg-slate-50 dark:bg-slate-700 p-2 rounded border border-violet-400/40 tracking-wider">
              11000000 . 10101000 . 00000001 . 00000000
            </span>
          </div>
        </div>
      </div>
      </NetworkingPanel>
      </div>
    </section>
  );
}
