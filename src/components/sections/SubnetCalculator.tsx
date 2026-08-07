"use client";

import { useState } from "react";
import { calculateSubnet, SubnetResult } from "@/lib/subnet-utils";

export default function SubnetCalculator() {
  const [ipInput, setIpInput] = useState<string>("192.168.1.130");
  const [cidrInput, setCidrInput] = useState<number>(24);
  const [result, setResult] = useState<SubnetResult | null>(() =>
    calculateSubnet("192.168.1.130", 24)
  );
  const [hasError, setHasError] = useState<boolean>(false);

  const handleCalculate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const res = calculateSubnet(ipInput, cidrInput);
    if (!res) {
      setHasError(true);
      setResult(null);
    } else {
      setHasError(false);
      setResult(res);
    }
  };

  const quickReference = [
    { cidr: "/16", mask: "255.255.0.0", hosts: "65,534", use: "Large Enterprise / Cloud VPC" },
    { cidr: "/24", mask: "255.255.255.0", hosts: "254", use: "Standard Local Subnet (LAN / Office)" },
    { cidr: "/25", mask: "255.255.255.128", hosts: "126", use: "Medium Department (100+ devices)" },
    { cidr: "/26", mask: "255.255.255.192", hosts: "62", use: "Small Department / Server Rack" },
    { cidr: "/27", mask: "255.255.255.224", hosts: "30", use: "Branch Office / Small Workgroup" },
    { cidr: "/28", mask: "255.255.255.240", hosts: "14", use: "Management Network / DMZ Subnet" },
    { cidr: "/30", mask: "255.255.255.252", hosts: "2", use: "Point-to-Point Router Link" },
  ];

  return (
    <section
      id="calculator"
      className="scroll-mt-24 rounded-2xl bg-[#161b22] border border-[#30363d] p-6 sm:p-8 transition-colors hover:border-[#58a6ff]/40"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-md bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20 text-xs font-mono font-semibold">
          #calculator
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#e6edf3]">
          8. Subnet Calculator
        </h2>
      </div>

      <p className="text-[#8b949e] text-base leading-relaxed mb-8 max-w-4xl">
        Enter an IPv4 address and select a CIDR prefix length to calculate network boundaries, broadcast addresses, usable host ranges, and subnet masks in real time.
      </p>

      {/* Input Form */}
      <form onSubmit={handleCalculate} className="rounded-xl bg-[#0d1117] border border-[#30363d] p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-6 space-y-2">
            <label htmlFor="ip-input" className="block text-xs font-mono font-bold text-[#8b949e] uppercase">
              IPv4 Address
            </label>
            <input
              id="ip-input"
              type="text"
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              placeholder="e.g. 192.168.1.130"
              className="w-full px-4 py-2.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[#e6edf3] font-mono text-sm placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] transition-colors"
            />
          </div>

          <div className="md:col-span-3 space-y-2">
            <label htmlFor="cidr-select" className="block text-xs font-mono font-bold text-[#8b949e] uppercase">
              Subnet Mask (CIDR)
            </label>
            <select
              id="cidr-select"
              value={cidrInput}
              onChange={(e) => setCidrInput(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[#e6edf3] font-mono text-sm focus:outline-none focus:border-[#58a6ff] transition-colors cursor-pointer"
            >
              {Array.from({ length: 30 }, (_, i) => i + 1).map((c) => (
                <option key={c} value={c}>
                  /{c}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              className="w-full px-5 py-2.5 rounded-lg bg-[#58a6ff] hover:bg-[#58a6ff]/90 text-[#0d1117] font-bold text-sm font-mono transition-all shadow-md shadow-[#58a6ff]/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              Calculate ⚡
            </button>
          </div>
        </div>
      </form>

      {/* Validation Banner */}
      {hasError && (
        <div className="mb-8 p-4 rounded-xl bg-[#ff7b72]/10 border border-[#ff7b72]/30 text-[#ff7b72] text-sm font-mono flex items-center gap-2">
          <span>⚠️ Invalid IP address — use format like 192.168.1.130</span>
        </div>
      )}

      {/* Result Stat Grid */}
      {result && !hasError && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-5">
            <div className="text-xs font-mono text-[#8b949e] uppercase mb-1">
              Network Address
            </div>
            <div className="text-xl font-bold font-mono text-[#58a6ff]">
              {result.networkAddress}
            </div>
            <div className="text-[11px] text-[#8b949e] mt-2">
              Subnet identifier (All host bits = 0)
            </div>
          </div>

          <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-5">
            <div className="text-xs font-mono text-[#8b949e] uppercase mb-1">
              Broadcast Address
            </div>
            <div className="text-xl font-bold font-mono text-[#ff7b72]">
              {result.broadcastAddress}
            </div>
            <div className="text-[11px] text-[#8b949e] mt-2">
              Subnet broadcast target (All host bits = 1)
            </div>
          </div>

          <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-5">
            <div className="text-xs font-mono text-[#8b949e] uppercase mb-1">
              First Usable Host
            </div>
            <div className="text-xl font-bold font-mono text-[#7ee787]">
              {result.firstUsable}
            </div>
            <div className="text-[11px] text-[#8b949e] mt-2">
              First assignable host IP in range
            </div>
          </div>

          <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-5">
            <div className="text-xs font-mono text-[#8b949e] uppercase mb-1">
              Last Usable Host
            </div>
            <div className="text-xl font-bold font-mono text-[#7ee787]">
              {result.lastUsable}
            </div>
            <div className="text-[11px] text-[#8b949e] mt-2">
              Last assignable host IP in range
            </div>
          </div>

          <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-5">
            <div className="text-xs font-mono text-[#8b949e] uppercase mb-1">
              Subnet Mask
            </div>
            <div className="text-xl font-bold font-mono text-[#bc8cff]">
              {result.subnetMask}
            </div>
            <div className="text-[11px] text-[#8b949e] mt-2">
              Subnet mask in dotted-decimal format
            </div>
          </div>

          <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-5">
            <div className="text-xs font-mono text-[#8b949e] uppercase mb-1">
              Usable Hosts
            </div>
            <div className="text-xl font-bold font-mono text-[#ffa657]">
              {result.usableHosts}
            </div>
            <div className="text-[11px] text-[#8b949e] mt-2">
              Total assignable host IP addresses
            </div>
          </div>
        </div>
      )}

      {/* Quick Reference Table */}
      <div className="rounded-xl bg-[#0d1117] border border-[#30363d] p-6">
        <h3 className="text-lg font-bold text-[#e6edf3] mb-4">
          Common Subnet Quick Reference
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#30363d] text-xs font-mono text-[#8b949e] uppercase">
                <th className="py-3 px-4">CIDR</th>
                <th className="py-3 px-4">Subnet Mask</th>
                <th className="py-3 px-4">Usable Hosts</th>
                <th className="py-3 px-4">Typical Use</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d] text-sm font-mono">
              {quickReference.map((row) => (
                <tr
                  key={row.cidr}
                  onClick={() => {
                    const c = parseInt(row.cidr.replace("/", ""), 10);
                    setCidrInput(c);
                    const res = calculateSubnet(ipInput, c);
                    if (res) {
                      setResult(res);
                      setHasError(false);
                    }
                  }}
                  className="hover:bg-[#161b22] transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-bold text-[#58a6ff]">{row.cidr}</td>
                  <td className="py-3.5 px-4 text-[#e6edf3]">{row.mask}</td>
                  <td className="py-3.5 px-4 text-[#7ee787]">{row.hosts}</td>
                  <td className="py-3.5 px-4 text-[#8b949e] font-sans text-xs">{row.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
