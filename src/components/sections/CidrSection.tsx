"use client";

import NetworkingModuleHeader from "@/components/networking/NetworkingModuleHeader";
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
    { label: "/0", value: 0, tag: "Default Route" },
    { label: "/8", value: 8, tag: "Historic class boundary" },
    { label: "/16", value: 16, tag: "Historic class boundary" },
    { label: "/24", value: 24, tag: "Common LAN example" },
    { label: "/27", value: 27, tag: "30 Hosts" },
    { label: "/30", value: 30, tag: "Traditional P2P" },
    { label: "/31", value: 31, tag: "RFC 3021 P2P" },
    { label: "/32", value: 32, tag: "Host Route" },
  ];

  return (
    <section
      id="cidr"
      className="networking-module scroll-mt-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Section Header */}
      <NetworkingModuleHeader
        anchor="#cidr"
        icon={<span className="text-indigo-500 dark:text-indigo-400" aria-hidden="true">◈</span>}
        title={<>3. CIDR & Subnet Masks — Interactive</>}
        description={<><strong className="text-slate-900 dark:text-slate-100">CIDR (Classless Inter-Domain Routing)</strong> specifies how many leading bits in an IP address represent the network prefix. Adjust the slider or click any bit box below to interactively observe how changing prefix length affects subnet mask, bit allocation, total addresses, and usable host count.</>}
      />
      <div className="module-content networking-module-content">

      {/* Interactive Controls & 32-Bit Visual Bar */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow mb-10">
        {/* Preset Selector */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Subnet Mask Bit Allocator
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Selected Prefix: <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold text-sm">/{cidr}</span> ({cidr} Network Bits, {hostBits} Host Bits)
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.value}
                onClick={() => setCidr(p.value)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
                  cidr === p.value
                    ? "bg-indigo-600 border-indigo-400 text-slate-900 dark:text-slate-100 font-bold shadow-md shadow-[#58a6ff]/20"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300 hover:text-slate-900 dark:hover:text-slate-100"
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
          <div className="flex justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
            <span>/0 (Default Route)</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">/{cidr} Prefix</span>
            <span>/32 (1 Host Route)</span>
          </div>
          <input
            type="range"
            aria-label="CIDR prefix length"
            min={0}
            max={32}
            value={cidr}
            onChange={(e) => setCidr(parseInt(e.target.value, 10))}
            className="w-full h-2.5 bg-white dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#58a6ff] border border-slate-200 dark:border-slate-700"
          />
        </div>

        {/* 32 Interactive Bit Boxes */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs font-mono text-slate-500 dark:text-slate-400 px-1">
            <span className="text-indigo-600 dark:text-indigo-400">← {cidr} Blue Network Bits (1)</span>
            <span className="text-emerald-600 dark:text-emerald-400">{hostBits} Green Host Bits (0) →</span>
          </div>

          {/* Octet Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((oIdx) => (
              <div key={oIdx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg space-y-2">
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex justify-between">
                  <span>Octet {oIdx + 1}</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{maskArray[oIdx]}</span>
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
                            ? "bg-indigo-600 text-slate-900 dark:text-slate-100 hover:bg-indigo-600/80 shadow-sm"
                            : "bg-emerald-500/20 border border-emerald-400/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30"
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
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow p-5">
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase mb-1">
            Subnet Mask
          </div>
          <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
            {subnetMaskStr}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Equivalent to /{cidr} CIDR prefix
          </div>
        </div>

        {/* Total Addresses */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow p-5">
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase mb-1">
            Total IP Addresses
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {totalAddresses.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono">
            2<sup>{hostBits}</sup> addresses (32 minus {cidr} network bits)
          </div>
        </div>

        {/* Usable Hosts */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow p-5">
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase mb-1">
            Usable Host IPs
          </div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {usableHosts.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            {cidr === 31
              ? "Both addresses usable under RFC 3021"
              : cidr === 32
                ? "One address usable as a host route"
                : "Excludes network and broadcast addresses"}
          </div>
        </div>

        {/* Wildcard Mask */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow p-5">
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase mb-1">
            Wildcard Mask (ACL)
          </div>
          <div className="text-xl font-bold font-mono text-violet-600 dark:text-violet-400">
            {wildcardMaskStr}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Inverted subnet mask (255 minus each mask octet)
          </div>
        </div>
      </div>
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow">

      {/* Usable Hosts Formula Card */}
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
          {cidr === 31
            ? "Usable Hosts: both addresses are usable on an RFC 3021 point-to-point link"
            : cidr === 32
              ? "Usable Hosts: one address is usable for a host route"
              : <>Usable Hosts Calculation Formula: 2<sup>h</sup> - 2</>}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
          {cidr === 31
            ? <>An RFC 3021 <code className="text-emerald-600 dark:text-emerald-400">/31</code> point-to-point link has exactly two addresses, and both are usable. No network or broadcast address is reserved.</>
            : cidr === 32
              ? <>A <code className="text-emerald-600 dark:text-emerald-400">/32</code> is a host route containing one address, which is usable directly. No network or broadcast address is reserved.</>
              : <>For an IPv4 subnet, use <code className="text-emerald-600 dark:text-emerald-400">Usable Hosts = 2<sup>h</sup> - 2</code>, where <code className="text-indigo-600 dark:text-indigo-400">h = 32 - CIDR</code> is the number of host bits.</>}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cidr >= 31 ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
              <div className="text-xs font-mono text-amber-600 dark:text-amber-400 font-bold uppercase">
                Special prefix semantics
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {cidr === 31
                  ? "RFC 3021 reserves neither endpoint on a point-to-point link, so both addresses are usable."
                  : "A /32 identifies one host route. Its single address is usable directly, with no network or broadcast reservation."}
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
              <div className="text-xs font-mono text-amber-600 dark:text-amber-400 font-bold uppercase">
                Why subtract 2 addresses?
              </div>
              <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                  <strong className="text-indigo-600 dark:text-indigo-400 block mb-0.5">1. Network Address (All Host Bits = 0)</strong>
                  The first IP address in the range identifies the subnet block itself in routing tables and cannot be assigned to an interface.
                </div>
                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                  <strong className="text-rose-600 dark:text-rose-400 block mb-0.5">2. Directed Broadcast (All Host Bits = 1)</strong>
                  The last address in a conventional IPv4 subnet is the directed-broadcast address. Hosts and routers may filter directed broadcasts, so it is not a universal guarantee of delivery.
                </div>
              </div>
            </div>
          )}

          {/* Current Calculation Step-by-Step */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3 font-mono text-xs">
            <div className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">
              Step-by-Step for /{cidr}:
            </div>
            <div className="space-y-1.5 text-slate-500 dark:text-slate-400">
              <div>1. Host bits = 32 - {cidr} = {hostBits}</div>
              <div>2. Total addresses = 2<sup>{hostBits}</sup> = {totalAddresses.toLocaleString()}</div>
              {cidr >= 31 ? (
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-700 border border-emerald-400/40 text-emerald-600 dark:text-emerald-400 font-bold text-sm text-center mt-2">
                  {cidr === 31 ? "2 addresses = 2 usable point-to-point endpoints" : "1 address = 1 usable host-route endpoint"}
                </div>
              ) : (
                <>
                  <div>3. Reserve the network and broadcast addresses:</div>
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-700 border border-emerald-400/40 text-emerald-600 dark:text-emerald-400 font-bold text-sm text-center mt-2">
                    {totalAddresses} - 2 = {usableHosts.toLocaleString()} usable hosts
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
