"use client";

import NetworkingModuleHeader from "@/components/networking/NetworkingModuleHeader";
import CopyButton from "@/components/CopyButton";

export default function BasicsSection() {
  return (
    <section
      id="basics"
      className="networking-module scroll-mt-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Header */}
      <NetworkingModuleHeader
        anchor="#basics"
        icon={<span className="text-indigo-500 dark:text-indigo-400" aria-hidden="true">⬡</span>}
        title={<>1. What is a Subnet?</>}
        description={<>A <strong className="text-slate-900 dark:text-slate-100">subnet (subnetwork)</strong> is a logical subdivision of an IP network. A prefix and mask define which addresses are on the local IP network and which destinations require a router. In common designs, each subnet is mapped to a VLAN or other Layer 2 segment, while routing and policy controls determine whether subnets can communicate.</>}
      />
      <div className="module-content networking-module-content">

      {/* 3 Benefit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Card 1: Performance */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow hover:card-shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg mb-4">
              ⚡
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Performance & Traffic Control
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Switches and VLANs define the Layer 2 broadcast domain. Subnet boundaries give hosts an IP-level on-link scope, so ARP and DHCP broadcasts normally stay within the associated segment.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-mono text-indigo-600 dark:text-indigo-400">
            <span>Broadcast Scope</span>
            <span>Normally Local</span>
          </div>
        </div>

        {/* Card 2: Security */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-lg mb-4">
              🛡️
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Enhanced Security Isolation
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Subnetting provides an addressing boundary; it does not enforce security by itself. Firewalls, ACLs, routing policy, and identity controls must explicitly restrict access between sensitive and less-trusted networks.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-mono text-emerald-600 dark:text-emerald-400">
            <span>Access Control</span>
            <span>L3 ACL / Firewall</span>
          </div>
        </div>

        {/* Card 3: Organization */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow hover:border-violet-300 transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold text-lg mb-4">
              📐
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Logical Addressing & Scale
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              A deliberate addressing hierarchy supports IPAM, route summarization, and predictable growth across buildings, sites, or cloud regions.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-mono text-violet-600 dark:text-violet-400">
            <span>IP Architecture</span>
            <span>Structured Hierarchy</span>
          </div>
        </div>
      </div>

      {/* Visual Home/Office Network 3-Subnet Diagram */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Network Topology Example: 192.168.1.0/24 Subnet Partitioning
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              A single private /24 CIDR block divided into 3 functional subnets with a central Layer 3 gateway router.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap self-start sm:self-auto">
            Total IPs: 256
          </span>
        </div>

        <div className="flex justify-center mb-8">
          <div className="relative group px-6 py-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-indigo-400 text-center shadow-lg shadow-[#58a6ff]/10">
            <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
              Core Gateway Router
            </div>
            <div className="space-y-1.5 text-left text-xs font-mono">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400">VLAN 10 gateway</span>
                <span className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                  192.168.1.1/26
                  <CopyButton text="192.168.1.1/26" label="" className="!px-1.5 !py-0.5" />
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400">VLAN 20 gateway</span>
                <span className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                  192.168.1.65/26
                  <CopyButton text="192.168.1.65/26" label="" className="!px-1.5 !py-0.5" />
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400">VLAN 30 gateway</span>
                <span className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                  192.168.1.129/25
                  <CopyButton text="192.168.1.129/25" label="" className="!px-1.5 !py-0.5" />
                </span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              One routed gateway interface per VLAN
            </div>
          </div>
        </div>

        {/* 3 Subnet Nodes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connection Lines styling representation */}
          
          {/* Subnet A */}
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-indigo-300 p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600" />
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-mono font-semibold">
                Subnet A
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">VLAN 10</span>
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              Management & Admin
            </h4>
            <div className="font-mono text-sm text-indigo-600 dark:text-indigo-400 font-semibold mb-3 flex items-center gap-1.5">
              192.168.1.0 / 26
              <CopyButton text="192.168.1.0/26" label="" className="!px-1.5 !py-0.5" />
            </div>
            
            <div className="space-y-2 text-xs font-mono bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mb-4">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Mask:</span>
                <span className="text-slate-900 dark:text-slate-100">255.255.255.192</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Usable IPs:</span>
                <span className="text-emerald-600 dark:text-emerald-400">.1 — .62 (62 hosts)</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Gateway:</span>
                <span className="text-indigo-600 dark:text-indigo-400">192.168.1.1</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                <span>Admin Workstation (192.168.1.10)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                <span>Core Switch Mgmt (192.168.1.2)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                <span>NAS Backup Vault (192.168.1.15)</span>
              </div>
            </div>
          </div>

          {/* Subnet B */}
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-emerald-400/40 p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-semibold">
                Subnet B
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">VLAN 20</span>
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              Staff Workstations
            </h4>
            <div className="font-mono text-sm text-emerald-600 dark:text-emerald-400 font-semibold mb-3 flex items-center gap-1.5">
              192.168.1.64 / 26
              <CopyButton text="192.168.1.64/26" label="" className="!px-1.5 !py-0.5" />
            </div>
            
            <div className="space-y-2 text-xs font-mono bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mb-4">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Mask:</span>
                <span className="text-slate-900 dark:text-slate-100">255.255.255.192</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Usable IPs:</span>
                <span className="text-emerald-600 dark:text-emerald-400">.65 — .126 (62 hosts)</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Gateway:</span>
                <span className="text-indigo-600 dark:text-indigo-400">192.168.1.65</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Office PC-01 (192.168.1.70)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Dev Laptop-04 (192.168.1.85)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>VoIP Desk Phone (192.168.1.90)</span>
              </div>
            </div>
          </div>

          {/* Subnet C */}
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-amber-400/40 p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#ffa657]" />
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded bg-[#ffa657]/20 text-amber-600 dark:text-amber-400 text-xs font-mono font-semibold">
                Subnet C
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">VLAN 30</span>
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              IoT & Guest Wi-Fi
            </h4>
            <div className="font-mono text-sm text-amber-600 dark:text-amber-400 font-semibold mb-3 flex items-center gap-1.5">
              192.168.1.128 / 25
              <CopyButton text="192.168.1.128/25" label="" className="!px-1.5 !py-0.5" />
            </div>
            
            <div className="space-y-2 text-xs font-mono bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mb-4">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Mask:</span>
                <span className="text-slate-900 dark:text-slate-100">255.255.255.128</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Usable IPs:</span>
                <span className="text-emerald-600 dark:text-emerald-400">.129 — .254 (126 hosts)</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Gateway:</span>
                <span className="text-indigo-600 dark:text-indigo-400">192.168.1.129</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffa657]" />
                <span>Smart TV (192.168.1.135)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffa657]" />
                <span>Guest Phone (192.168.1.142)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffa657]" />
                <span>IP Security Camera (192.168.1.200)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
