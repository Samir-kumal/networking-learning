"use client";

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
      className="scroll-mt-24 rounded-2xl bg-[#161b22] border border-[#30363d] p-6 sm:p-8 transition-colors hover:border-[#58a6ff]/40"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-md bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20 text-xs font-mono font-semibold">
          #binary
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#e6edf3]">
          2. IP Addresses & Binary
        </h2>
      </div>

      <p className="text-[#8b949e] text-base leading-relaxed mb-8 max-w-4xl">
        Every IPv4 address is a 32-bit binary number represented in 4 decimal octets separated by dots. 
        Understanding bit values, positional binary weights ($128, 64, 32, 16, 8, 4, 2, 1$), and bitwise operations is fundamental to networking.
      </p>

      {/* Interactive Live 4-Octet Converter */}
      <div className="rounded-xl bg-[#0d1117] border border-[#30363d] p-6 mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-[#30363d]">
          <div>
            <h3 className="text-lg font-bold text-[#e6edf3]">
              Live 4-Octet Decimal to Binary Converter
            </h3>
            <p className="text-xs text-[#8b949e]">
              Enter values from 0 to 255 for each octet to visualize their 8-bit binary representation in real time.
            </p>
          </div>
          <div className="font-mono text-sm px-3 py-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[#58a6ff] font-bold">
            {octets.join(".")}
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {octets.map((oct, idx) => (
            <div key={idx} className="space-y-1.5">
              <label className="text-xs font-mono text-[#8b949e] flex justify-between">
                <span>Octet {idx + 1}</span>
                <span className="text-[#58a6ff]">8 bits</span>
              </label>
              <input
                type="number"
                min={0}
                max={255}
                value={oct}
                onChange={(e) => handleOctetChange(idx, e.target.value)}
                className="w-full bg-[#161b22] border border-[#30363d] focus:border-[#58a6ff] focus:outline-none text-[#e6edf3] font-mono text-center font-bold px-3 py-2 rounded-lg text-lg transition-colors"
              />
            </div>
          ))}
        </div>

        {/* Live Binary Display Grid with Weights */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {binaryStrings.map((binStr, oIdx) => (
            <div key={oIdx} className="bg-[#161b22] border border-[#30363d] rounded-lg p-3">
              <div className="text-xs font-mono text-[#8b949e] text-center mb-2 pb-1 border-b border-[#30363d]">
                Octet {oIdx + 1}: <span className="text-[#e6edf3] font-bold">{octets[oIdx]}</span>
              </div>
              
              {/* Bit Boxes with Weights */}
              <div className="grid grid-cols-8 gap-1 text-center font-mono">
                {bitWeights.map((w, bIdx) => {
                  const isOne = binStr[bIdx] === "1";
                  return (
                    <div key={bIdx} className="flex flex-col items-center">
                      <span className="text-[9px] text-[#8b949e] mb-1">{w}</span>
                      <div
                        className={`w-full py-1.5 rounded text-xs font-bold transition-all ${
                          isOne
                            ? "bg-[#58a6ff] text-[#0d1117] shadow-sm shadow-[#58a6ff]/30"
                            : "bg-[#0d1117] text-[#8b949e] border border-[#30363d]"
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
        <div className="mt-6 pt-4 border-t border-[#30363d] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <span className="text-[#8b949e]">Full 32-Bit Binary Representation:</span>
          <span className="px-4 py-2 rounded-lg bg-[#161b22] border border-[#30363d] text-[#7ee787] font-bold tracking-wider text-center sm:text-left">
            {binaryStrings.join(" . ")}
          </span>
        </div>
      </div>

      {/* Address Structure & Network vs Host Breakdown */}
      <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-6 mb-10">
        <h3 className="text-lg font-bold text-[#e6edf3] mb-3">
          IPv4 Address Anatomy: Network ID vs Host ID
        </h3>
        <p className="text-[#8b949e] text-sm leading-relaxed mb-6">
          Every IP address is divided into two logical sections by its subnet mask: the <strong className="text-[#58a6ff]">Network Portion (Prefix)</strong> which identifies the specific network, and the <strong className="text-[#7ee787]">Host Portion (Suffix)</strong> which identifies the unique device interface on that network.
        </p>

        {/* Code block style diagram */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 overflow-x-auto font-mono text-xs text-[#e6edf3]">
          <div className="flex flex-col gap-2 min-w-[550px]">
            <div className="flex justify-between text-[#8b949e] px-1">
              <span>Bit 1</span>
              <span>← Network Prefix Bits (1s in Mask) →</span>
              <span>← Host Suffix Bits (0s in Mask) →</span>
              <span>Bit 32</span>
            </div>

            {/* 32-bit bar representation for /24 */}
            <div className="grid grid-cols-32 gap-0.5 h-8 rounded bg-[#161b22] p-1 border border-[#30363d]">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="bg-[#58a6ff] rounded-sm flex items-center justify-center text-[9px] text-[#0d1117] font-bold" title={`Network bit ${i + 1}`}>
                  1
                </div>
              ))}
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-[#7ee787]/20 border border-[#7ee787]/40 rounded-sm flex items-center justify-center text-[9px] text-[#7ee787] font-bold" title={`Host bit ${i + 25}`}>
                  0
                </div>
              ))}
            </div>

            <div className="flex justify-between text-xs pt-1 px-1">
              <span className="text-[#58a6ff] font-bold">24 Network Bits (e.g. /24 Subnet)</span>
              <span className="text-[#7ee787] font-bold">8 Host Bits ($2^8 - 2 = 254$ Hosts)</span>
            </div>
          </div>
        </div>
      </div>

      {/* RFC 1918 Private Ranges Table */}
      <div className="mb-10">
        <h3 className="text-lg font-bold text-[#e6edf3] mb-2">
          RFC 1918 Private IP Address Ranges
        </h3>
        <p className="text-sm text-[#8b949e] mb-4">
          RFC 1918 designates three IP address ranges reserved exclusively for private internal networks. These IPs are non-routable on the public internet.
        </p>

        <div className="overflow-x-auto border border-[#30363d] rounded-xl bg-[#0d1117]">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-[#161b22] text-[#8b949e] border-b border-[#30363d]">
                <th className="p-3">Class</th>
                <th className="p-3">CIDR Block</th>
                <th className="p-3">IP Address Range</th>
                <th className="p-3">Total Addresses</th>
                <th className="p-3">Typical Application</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d] text-[#e6edf3]">
              <tr className="hover:bg-[#161b22]/50 transition-colors">
                <td className="p-3 font-bold text-[#58a6ff]">Class A</td>
                <td className="p-3 text-[#7ee787]">10.0.0.0 / 8</td>
                <td className="p-3">10.0.0.0 — 10.255.255.255</td>
                <td className="p-3">16,777,216</td>
                <td className="p-3 text-[#8b949e]">Enterprise corporate networks, cloud VPCs</td>
              </tr>
              <tr className="hover:bg-[#161b22]/50 transition-colors">
                <td className="p-3 font-bold text-[#bc8cff]">Class B</td>
                <td className="p-3 text-[#7ee787]">172.16.0.0 / 12</td>
                <td className="p-3">172.16.0.0 — 172.31.255.255</td>
                <td className="p-3">1,048,576</td>
                <td className="p-3 text-[#8b949e]">Medium corporate LANs, Docker internal bridges</td>
              </tr>
              <tr className="hover:bg-[#161b22]/50 transition-colors">
                <td className="p-3 font-bold text-[#ffa657]">Class C</td>
                <td className="p-3 text-[#7ee787]">192.168.0.0 / 16</td>
                <td className="p-3">192.168.0.0 — 192.168.255.255</td>
                <td className="p-3">65,536</td>
                <td className="p-3 text-[#8b949e]">Home routers, SOHO local networks, Wi-Fi hotspots</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Classful vs CIDR Table */}
      <div className="mb-10">
        <h3 className="text-lg font-bold text-[#e6edf3] mb-2">
          Classful vs CIDR Addressing
        </h3>
        <p className="text-sm text-[#8b949e] mb-4">
          Historical Classful routing forced rigid network boundaries, leading to rapid IP address exhaustion. CIDR (Classless Inter-Domain Routing) introduced variable-length prefix masks.
        </p>

        <div className="overflow-x-auto border border-[#30363d] rounded-xl bg-[#0d1117]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#161b22] text-[#8b949e] border-b border-[#30363d] font-mono">
                <th className="p-3">Feature</th>
                <th className="p-3">Legacy Classful (RFC 791)</th>
                <th className="p-3">Modern CIDR (RFC 1519)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d] text-[#e6edf3]">
              <tr className="hover:bg-[#161b22]/50 transition-colors">
                <td className="p-3 font-semibold text-[#8b949e]">Mask Allocation</td>
                <td className="p-3 text-[#ff7b72]">Fixed octet boundaries (/8, /16, /24)</td>
                <td className="p-3 text-[#7ee787]">Arbitrary bit boundaries (/1 to /32)</td>
              </tr>
              <tr className="hover:bg-[#161b22]/50 transition-colors">
                <td className="p-3 font-semibold text-[#8b949e]">Routing Protocol Support</td>
                <td className="p-3">RIPv1, IGRP (No subnet mask sent in updates)</td>
                <td className="p-3 text-[#58a6ff]">OSPF, BGP4, RIPv2, IS-IS (Subnet mask explicitly sent)</td>
              </tr>
              <tr className="hover:bg-[#161b22]/50 transition-colors">
                <td className="p-3 font-semibold text-[#8b949e]">IP Utilization Efficiency</td>
                <td className="p-3 text-[#ff7b72]">Very Poor (Extreme address wastage)</td>
                <td className="p-3 text-[#7ee787]">High (Optimal subnet sizing via VLSM)</td>
              </tr>
              <tr className="hover:bg-[#161b22]/50 transition-colors">
                <td className="p-3 font-semibold text-[#8b949e]">Route Table Aggregation</td>
                <td className="p-3">Impossible (Unaggregated full routing tables)</td>
                <td className="p-3 text-[#bc8cff]">Supernetting & BGP Prefix Aggregation enabled</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Special Addresses Cards (Loopback & APIPA) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded bg-[#bc8cff]/20 text-[#bc8cff] text-xs font-mono font-bold">
              127.0.0.0 / 8
            </span>
            <h4 className="text-base font-bold text-[#e6edf3]">Loopback Address Space</h4>
          </div>
          <p className="text-xs text-[#8b949e] leading-relaxed mb-3">
            Reserved for host-internal network stack testing (<code className="text-[#bc8cff]">127.0.0.1</code> / localhost). Traffic sent to loopback never hits physical network interfaces or switch ports.
          </p>
          <div className="text-[11px] font-mono text-[#8b949e] bg-[#0d1117] p-2 rounded border border-[#30363d]">
            ping 127.0.0.1 → Tests local TCP/IP protocol stack functionality
          </div>
        </div>

        <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded bg-[#ffa657]/20 text-[#ffa657] text-xs font-mono font-bold">
              169.254.0.0 / 16
            </span>
            <h4 className="text-base font-bold text-[#e6edf3]">APIPA (Link-Local)</h4>
          </div>
          <p className="text-xs text-[#8b949e] leading-relaxed mb-3">
            Automatic Private IP Addressing (RFC 3927). Self-assigned by operating systems when a DHCP server fails to respond. Non-routable across routers.
          </p>
          <div className="text-[11px] font-mono text-[#8b949e] bg-[#0d1117] p-2 rounded border border-[#30363d]">
            IP range: 169.254.0.1 — 169.254.255.254 (Used for direct peer connection)
          </div>
        </div>
      </div>

      {/* Bitwise AND Visual Block */}
      <div className="rounded-xl bg-[#0d1117] border border-[#30363d] p-6">
        <h3 className="text-lg font-bold text-[#e6edf3] mb-2">
          Bitwise AND Operation: Calculating Network Address
        </h3>
        <p className="text-sm text-[#8b949e] mb-6">
          When a router evaluates an incoming packet, it performs a bitwise <code className="text-[#58a6ff]">AND</code> operation between the Destination IP Address and the Subnet Mask to determine the target Network Address.
        </p>

        {/* Calculation Visual */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 font-mono text-xs space-y-4">
          {/* IP Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
            <span className="sm:col-span-3 text-[#8b949e]">Host IP (192.168.1.100):</span>
            <span className="sm:col-span-9 text-[#58a6ff] font-bold bg-[#0d1117] p-2 rounded border border-[#30363d] tracking-wider">
              11000000 . 10101000 . 00000001 . 01100100
            </span>
          </div>

          {/* Mask Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
            <span className="sm:col-span-3 text-[#8b949e]">Subnet Mask (255.255.255.0):</span>
            <span className="sm:col-span-9 text-[#7ee787] font-bold bg-[#0d1117] p-2 rounded border border-[#30363d] tracking-wider">
              11111111 . 11111111 . 11111111 . 00000000
            </span>
          </div>

          {/* Operator Indicator */}
          <div className="border-t border-b border-[#30363d] py-1 text-center text-[#ffa657] font-bold tracking-widest text-[11px]">
            AND OPERATOR (1 AND 1 = 1, ALL OTHER COMBINATIONS = 0)
          </div>

          {/* Result Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
            <span className="sm:col-span-3 text-[#e6edf3] font-bold">Network ID (192.168.1.0):</span>
            <span className="sm:col-span-9 text-[#bc8cff] font-bold bg-[#0d1117] p-2 rounded border border-[#bc8cff]/40 tracking-wider">
              11000000 . 10101000 . 00000001 . 00000000
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
