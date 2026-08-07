"use client";

import { useState } from "react";
import { maskFromCIDR } from "@/lib/subnet-utils";

export default function CidrSection() {
  const [cidr, setCidr] = useState<number>(24);

  const maskArray = maskFromCIDR(cidr);
  const subnetMaskStr = maskArray.join(".");

  // Calculate wildcard mask
  const wildcardArray = maskArray.map((octet) => 255 - octet);
  const wildcardMaskStr = wildcardArray.join(".");

  const hostBits = 32 - cidr;
  const totalAddresses = Math.pow(2, hostBits);
  const usableHosts = cidr >= 31 ? (cidr === 31 ? 2 : 1) : Math.max(0, totalAddresses - 2);

  const presets = [
    { label: "/8", value: 8, tag: "Class A" },
    { label: "/16", value: 16, tag: "Class B" },
    { label: "/24", value: 24, tag: "Class C" },
    { label: "/27", value: 27, tag: "30 Hosts" },
    { label: "/30", value: 30, tag: "P2P Link" },
  ];

  return (
    <section
      id="cidr"
      className="scroll-mt-24 rounded-2xl bg-[#161b22] border border-[#30363d] p-6 sm:p-8 transition-colors hover:border-[#58a6ff]/40"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-md bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20 text-xs font-mono font-semibold">
          #cidr
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#e6edf3]">
          3. CIDR & Subnet Masks — Interactive
        </h2>
      </div>

      <p className="text-[#8b949e] text-base leading-relaxed mb-8 max-w-4xl">
        <strong className="text-[#e6edf3]">CIDR (Classless Inter-Domain Routing)</strong> specifies how many leading bits in an IP address represent the network prefix. Adjust the slider or click any bit box below to interactively observe how changing prefix length affects subnet mask, bit allocation, total addresses, and usable host count.
      </p>

      {/* Interactive Controls & 32-Bit Visual Bar */}
      <div className="rounded-xl bg-[#0d1117] border border-[#30363d] p-6 mb-10">
        {/* Preset Selector */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-[#30363d]">
          <div>
            <h3 className="text-lg font-bold text-[#e6edf3]">
              Subnet Mask Bit Allocator
            </h3>
            <p className="text-xs text-[#8b949e]">
              Selected Prefix: <span className="font-mono text-[#58a6ff] font-bold text-sm">/{cidr}</span> ({cidr} Network Bits, {hostBits} Host Bits)
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.value}
                onClick={() => setCidr(p.value)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
                  cidr === p.value
                    ? "bg-[#58a6ff] border-[#58a6ff] text-[#0d1117] font-bold shadow-md shadow-[#58a6ff]/20"
                    : "bg-[#161b22] border-[#30363d] text-[#8b949e] hover:border-[#58a6ff]/50 hover:text-[#e6edf3]"
                }`}
              >
                <span>{p.label}</span>
                <span className="text-[10px] opacity-75">({p.tag})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Range Slider */}
        <div className="space-y-2 mb-8">
          <div className="flex justify-between text-xs font-mono text-[#8b949e]">
            <span>/1 (Half the Internet)</span>
            <span className="text-[#58a6ff] font-bold text-sm">/{cidr} Prefix</span>
            <span>/30 (2 Usable Hosts)</span>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            value={cidr}
            onChange={(e) => setCidr(parseInt(e.target.value, 10))}
            className="w-full h-2.5 bg-[#161b22] rounded-lg appearance-none cursor-pointer accent-[#58a6ff] border border-[#30363d]"
          />
        </div>

        {/* 32 Interactive Bit Boxes */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs font-mono text-[#8b949e] px-1">
            <span className="text-[#58a6ff]">← {cidr} Blue Network Bits (1)</span>
            <span className="text-[#7ee787]">{hostBits} Green Host Bits (0) →</span>
          </div>

          {/* Octet Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((oIdx) => (
              <div key={oIdx} className="bg-[#161b22] border border-[#30363d] p-2.5 rounded-lg space-y-2">
                <div className="text-[11px] font-mono text-[#8b949e] flex justify-between">
                  <span>Octet {oIdx + 1}</span>
                  <span className="font-bold text-[#e6edf3]">{maskArray[oIdx]}</span>
                </div>
                
                <div className="grid grid-cols-8 gap-1">
                  {Array.from({ length: 8 }).map((_, bIdx) => {
                    const globalBitIndex = oIdx * 8 + bIdx + 1;
                    const isNetwork = globalBitIndex <= cidr;
                    return (
                      <button
                        key={bIdx}
                        onClick={() => setCidr(globalBitIndex)}
                        title={`Click to set CIDR to /${globalBitIndex}`}
                        className={`py-2 rounded font-mono text-xs font-bold transition-all ${
                          isNetwork
                            ? "bg-[#58a6ff] text-[#0d1117] hover:bg-[#58a6ff]/80 shadow-sm"
                            : "bg-[#7ee787]/20 border border-[#7ee787]/40 text-[#7ee787] hover:bg-[#7ee787]/30"
                        }`}
                      >
                        {isNetwork ? "1" : "0"}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* Subnet Mask */}
        <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-5">
          <div className="text-xs font-mono text-[#8b949e] uppercase mb-1">
            Subnet Mask
          </div>
          <div className="text-xl font-bold font-mono text-[#58a6ff]">
            {subnetMaskStr}
          </div>
          <div className="text-[11px] text-[#8b949e] mt-2">
            Equivalent to /{cidr} CIDR prefix
          </div>
        </div>

        {/* Total Addresses */}
        <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-5">
          <div className="text-xs font-mono text-[#8b949e] uppercase mb-1">
            Total IP Addresses
          </div>
          <div className="text-xl font-bold font-mono text-[#e6edf3]">
            {totalAddresses.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#8b949e] mt-2 font-mono">
            $2^{"{32 - " + cidr + "}"} = 2^{"{ " + hostBits + " }"}$
          </div>
        </div>

        {/* Usable Hosts */}
        <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-5">
          <div className="text-xs font-mono text-[#8b949e] uppercase mb-1">
            Usable Host IPs
          </div>
          <div className="text-xl font-bold font-mono text-[#7ee787]">
            {usableHosts.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#8b949e] mt-2">
            Excludes Network & Broadcast
          </div>
        </div>

        {/* Wildcard Mask */}
        <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-5">
          <div className="text-xs font-mono text-[#8b949e] uppercase mb-1">
            Wildcard Mask (ACL)
          </div>
          <div className="text-xl font-bold font-mono text-[#bc8cff]">
            {wildcardMaskStr}
          </div>
          <div className="text-[11px] text-[#8b949e] mt-2">
            Inverted subnet mask ($255 - \text{"{Mask}"}$)
          </div>
        </div>
      </div>

      {/* Usable Hosts Formula Card */}
      <div className="rounded-xl bg-[#0d1117] border border-[#30363d] p-6">
        <h3 className="text-lg font-bold text-[#e6edf3] mb-3">
          Usable Hosts Calculation Formula: $2^h - 2$
        </h3>
        <p className="text-sm text-[#8b949e] leading-relaxed mb-6">
          To calculate the number of hosts that can be assigned to devices on a IPv4 subnet, use the formula <code className="text-[#7ee787]">Usable Hosts = 2^h - 2</code>, where <code className="text-[#58a6ff]">h = 32 - CIDR</code> is the number of remaining host bits.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reason for Subtracting 2 */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-3">
            <div className="text-xs font-mono text-[#ffa657] font-bold uppercase">
              Why subtract 2 addresses?
            </div>
            <div className="space-y-2 text-xs text-[#8b949e]">
              <div className="p-2.5 rounded bg-[#0d1117] border border-[#30363d]">
                <strong className="text-[#58a6ff] block mb-0.5">1. Network Address (All Host Bits = 0)</strong>
                The first IP address in the range identifies the subnet block itself in routing tables and cannot be assigned to an interface.
              </div>
              <div className="p-2.5 rounded bg-[#0d1117] border border-[#30363d]">
                <strong className="text-[#ff7b72] block mb-0.5">2. Broadcast Address (All Host Bits = 1)</strong>
                The last IP address in the range is used to broadcast frames to all active devices on the subnet simultaneously.
              </div>
            </div>
          </div>

          {/* Current Calculation Step-by-Step */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-3 font-mono text-xs">
            <div className="text-[#7ee787] font-bold uppercase">
              Step-by-Step for /{cidr}:
            </div>
            <div className="space-y-1.5 text-[#8b949e]">
              <div>1. Host bits $h = 32 - {cidr} = \mathbf{"{ " + hostBits + " }"}$</div>
              <div>2. Total addresses $2^{"{ " + hostBits + " }"} = \mathbf{"{ " + totalAddresses.toLocaleString() + " }"}$</div>
              <div>3. Subtract Network & Broadcast:</div>
              <div className="p-2 rounded bg-[#0d1117] border border-[#7ee787]/40 text-[#7ee787] font-bold text-sm text-center mt-2">
                {totalAddresses} - 2 = {usableHosts.toLocaleString()} Usable Hosts
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
