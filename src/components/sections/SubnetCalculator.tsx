"use client";

import NetworkingModuleHeader from "@/components/networking/NetworkingModuleHeader";
import NetworkingPanel from "@/components/networking/NetworkingPanel";
import NetworkingMetric from "@/components/networking/NetworkingMetric";
import NetworkingTable from "@/components/networking/NetworkingTable";
import { useState } from "react";
import CopyButton from "@/components/CopyButton";
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
  const resultCidr = result ? Number(result.networkAddress.split("/")[1]) : cidrInput;
  const resultIsRfc3021 = resultCidr === 31;
  const resultIsHostRoute = resultCidr === 32;

  const quickReference = [
    { cidr: "/16", mask: "255.255.0.0", hosts: "65,534", use: "Large Enterprise / Cloud VPC" },
    { cidr: "/24", mask: "255.255.255.0", hosts: "254", use: "Standard Local Subnet (LAN / Office)" },
    { cidr: "/25", mask: "255.255.255.128", hosts: "126", use: "Medium Department (100+ devices)" },
    { cidr: "/26", mask: "255.255.255.192", hosts: "62", use: "Small Department / Server Rack" },
    { cidr: "/27", mask: "255.255.255.224", hosts: "30", use: "Branch Office / Small Workgroup" },
    { cidr: "/28", mask: "255.255.255.240", hosts: "14", use: "Management Network / DMZ Subnet" },
    { cidr: "/30", mask: "255.255.255.252", hosts: "2", use: "Point-to-Point Router Link" },
    { cidr: "/31", mask: "255.255.255.254", hosts: "2", use: "RFC 3021 Point-to-Point Link (both endpoints usable)" },
    { cidr: "/32", mask: "255.255.255.255", hosts: "1", use: "Host Route (one endpoint)" },
  ];

  return (
    <section
      id="calculator"
      className="networking-module scroll-mt-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Section Header */}
      <NetworkingModuleHeader
        anchor="#calculator"
        icon={<span className="text-indigo-500 dark:text-indigo-400" aria-hidden="true">◈</span>}
        title={<>4. Subnet Calculator</>}
        description={<>Enter an IPv4 address and select a CIDR prefix length to calculate subnet or route boundaries, usable address ranges, and subnet masks in real time.</>}
      />
      <div className="module-content networking-module-content">
      <NetworkingPanel className="mb-8">

      {/* Input Form */}
      <form onSubmit={handleCalculate} className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow mb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-6 space-y-2">
            <label htmlFor="ip-input" className="block text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">
              IPv4 Address
            </label>
            <input
              id="ip-input"
              type="text"
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              placeholder="e.g. 192.168.1.130"
              className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono text-sm placeholder-[#484f58] focus:outline-none focus:border-indigo-400 transition-colors"
            />
          </div>

          <div className="md:col-span-3 space-y-2">
            <label htmlFor="cidr-select" className="block text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">
              Subnet Mask (CIDR)
            </label>
            <select
              id="cidr-select"
              value={cidrInput}
              onChange={(e) => setCidrInput(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:border-indigo-400 transition-colors cursor-pointer"
            >
              {Array.from({ length: 32 }, (_, i) => i + 1).map((c) => (
                <option key={c} value={c}>
                  /{c}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              className="w-full px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-600/90 text-slate-900 dark:text-slate-100 font-bold text-sm font-mono transition-all shadow-md shadow-[#58a6ff]/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              Calculate ⚡
            </button>
          </div>
        </div>
      </form>

      {/* Validation Banner */}
      {hasError && (
        <div className="mb-8 p-4 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700 text-rose-600 dark:text-rose-400 text-sm font-mono flex items-center gap-2">
          <span>⚠️ Invalid IP address — use format like 192.168.1.130</span>
        </div>
      )}
      {result && !hasError && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          <NetworkingMetric
            label={resultIsRfc3021 || resultIsHostRoute ? "Route Prefix" : "Network Address"}
            value={<span className="flex items-center gap-1.5">{result.networkAddress}<CopyButton text={result.networkAddress} label="" className="!px-1.5 !py-0.5" /></span>}
            detail={resultIsHostRoute ? "Single host route address (all host bits = 0)" : resultIsRfc3021 ? "Point-to-point prefix base address" : "Subnet identifier (all host bits = 0)"}
            tone="cyan"
          />
          <NetworkingMetric
            label={resultIsRfc3021 || resultIsHostRoute ? "No Broadcast Address" : "Broadcast Address"}
            value={<span className="flex items-center gap-1.5">{result.broadcastAddress}{!resultIsRfc3021 && !resultIsHostRoute && <CopyButton text={result.broadcastAddress} label="" className="!px-1.5 !py-0.5" />}</span>}
            detail={resultIsRfc3021 ? "Both addresses are usable endpoints under RFC 3021; no broadcast address" : resultIsHostRoute ? "Host routes have no broadcast address" : "Subnet broadcast target (all host bits = 1)"}
            tone="amber"
          />
          <NetworkingMetric
            label={resultIsRfc3021 ? "First Usable Endpoint" : resultIsHostRoute ? "Host Route Address" : "First Usable Host"}
            value={<span className="flex items-center gap-1.5">{result.firstUsable}<CopyButton text={result.firstUsable} label="" className="!px-1.5 !py-0.5" /></span>}
            detail={resultIsRfc3021 ? "Lower point-to-point endpoint" : resultIsHostRoute ? "Single assignable route endpoint" : "First assignable host IP in range"}
            tone="lime"
          />
          <NetworkingMetric
            label={resultIsRfc3021 ? "Last Usable Endpoint" : resultIsHostRoute ? "Host Route Address" : "Last Usable Host"}
            value={<span className="flex items-center gap-1.5">{result.lastUsable}<CopyButton text={result.lastUsable} label="" className="!px-1.5 !py-0.5" /></span>}
            detail={resultIsRfc3021 ? "Upper point-to-point endpoint" : resultIsHostRoute ? "Single assignable route endpoint" : "Last assignable host IP in range"}
            tone="lime"
          />
          <NetworkingMetric
            label="Subnet Mask"
            value={<span className="flex items-center gap-1.5">{result.subnetMask}<CopyButton text={result.subnetMask} label="" className="!px-1.5 !py-0.5" /></span>}
            detail="Subnet mask in dotted-decimal format"
            tone="violet"
          />
          <NetworkingMetric label="Usable Hosts" value={result.usableHosts} detail={resultIsRfc3021 ? "Two assignable point-to-point endpoint addresses" : resultIsHostRoute ? "One assignable host-route address" : "Total assignable host IP addresses"} tone="amber" />
        </div>
      )}
      </NetworkingPanel>

      {/* Quick Reference Table */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
          Common Subnet Quick Reference
        </h3>
        <div className="overflow-x-auto">
          <NetworkingTable>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-500 dark:text-slate-400 uppercase">
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
                  className="hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-bold text-indigo-600 dark:text-indigo-400">{row.cidr}</td>
                  <td className="py-3.5 px-4 text-slate-900 dark:text-slate-100">{row.mask}</td>
                  <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400">{row.hosts}</td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-sans text-xs">{row.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </NetworkingTable>
        </div>
      </div>
      </div>
    </section>
  );
}
