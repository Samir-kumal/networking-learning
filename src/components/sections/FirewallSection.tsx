"use client";

import { useState } from "react";

export default function FirewallSection() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [checkedRules, setCheckedRules] = useState<Record<number, boolean>>({
    0: true,
    1: true,
  });

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleRule = (idx: number) => {
    setCheckedRules((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const ciscoAclCode = `! Cisco Extended Access Control List (ACL 100)
! 1. Allow Web Subnet (VLAN 10) to access Database Subnet (VLAN 20) on PostgreSQL port 5432
access-list 100 remark --- Permit Web to DB Postgres ---
access-list 100 permit tcp 192.168.10.0 0.0.0.255 192.168.20.0 0.0.0.255 eq 5432

! 2. Allow Web Subnet (VLAN 10) to access Shared HTTPS Services (VLAN 30)
access-list 100 remark --- Permit Web to Shared HTTPS ---
access-list 100 permit tcp 192.168.10.0 0.0.0.255 192.168.30.0 0.0.0.255 eq 443

! 3. Explicitly DENY all remaining inter-subnet traffic & log violation attempts
access-list 100 remark --- Deny & Log all other cross-subnet packets ---
access-list 100 deny ip 192.168.10.0 0.0.0.255 192.168.20.0 0.0.0.255 log

! 4. Apply ACL inbound on VLAN 10 Interface
interface GigabitEthernet0/0.10
 ip access-group 100 in`;

  const homeRouterTips = [
    {
      title: "Isolate Guest Wi-Fi Subnet Completely",
      desc: "Enable 'Guest Network Isolation' on your Wi-Fi router so guests (e.g. 192.168.2.0/24) cannot scan or connect to private NAS drives, PCs, or printers on 192.168.1.0/24.",
    },
    {
      title: "Segregate Smart Home IoT Devices into a Dedicated VLAN",
      desc: "Place smart TVs, cameras, smart plugs, and voice assistants on an isolated IoT subnet (e.g. 192.168.50.0/24). Block inbound requests from the IoT subnet to your main LAN.",
    },
    {
      title: "Disable UPnP Across Inter-Subnet Boundaries",
      desc: "Universal Plug and Play (UPnP) should be strictly disabled between subnets to prevent malicious IoT software from dynamically requesting open router port forwards.",
    },
    {
      title: "Utilize Stateful Firewall Engines (pfSense / OPNsense / UniFi)",
      desc: "Deploy stateful firewall rules that automatically permit return traffic for outbound requests initiated by trusted LAN hosts without opening static inbound ports.",
    },
  ];

  return (
    <section
      id="firewall"
      className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold">
          #firewall
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          12. Firewall Rules Between Subnets
        </h2>
      </div>

      <p className="text-slate-500 text-base leading-relaxed mb-8 max-w-4xl">
        Subnetting divides physical networks into isolated broadcast domains, but routers forward traffic between subnets by default. <strong className="text-rose-600">Firewalls & Access Control Lists (ACLs)</strong> enforce Zero-Trust boundaries by inspecting and filtering packet headers at subnet gateways.
      </p>

      {/* 3 Security Action Cards (Block, Allow, Log) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* CARD 1: BLOCK */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow hover:border-rose-300 transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-bold text-lg mb-4">
              🚫
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Default-DENY (Block)
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              Enforces Zero-Trust isolation. Inter-subnet traffic is implicitly or explicitly dropped unless an explicit permit rule allows it.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-200 text-xs font-mono text-rose-600 flex justify-between">
            <span>Action: DROP / REJECT</span>
            <span>Default Guard</span>
          </div>
        </div>

        {/* CARD 2: ALLOW */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold text-lg mb-4">
              ✅
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Granular PERMIT (Allow)
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              Allows specific protocol, source CIDR, destination CIDR, and port combinations (e.g. Web Subnet to DB Subnet on TCP 5432).
            </p>
          </div>
          <div className="pt-3 border-t border-slate-200 text-xs font-mono text-emerald-600 flex justify-between">
            <span>Action: ACCEPT</span>
            <span>Port Specific</span>
          </div>
        </div>

        {/* CARD 3: LOG */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow hover:border-amber-300 transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold text-lg mb-4">
              📊
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Stateful Audit & LOG
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              Captures dropped connection attempts, port scans, and unauthorized inter-subnet packets to SIEM monitoring tools for incident analysis.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-200 text-xs font-mono text-amber-600 flex justify-between">
            <span>Action: AUDIT / SIEM</span>
            <span>Traffic Analytics</span>
          </div>
        </div>
      </div>

      {/* Cisco ACL Code Block Section */}
      <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h3 className="text-lg font-bold text-slate-900">
            Cisco IOS Inter-Subnet Access Control List (ACL 100)
          </h3>
          <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200">
            Extended ACL Logic
          </span>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          Extended ACLs filter based on source/destination IPs and TCP/UDP ports. Apply inbound on the router sub-interface closest to the source:
        </p>

        <div className="relative">
          <pre className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs text-slate-900 overflow-x-auto leading-relaxed">
            {ciscoAclCode}
          </pre>
          <button
            onClick={() => handleCopy(ciscoAclCode, 1)}
            className="absolute top-3 right-3 px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] text-slate-500 hover:text-slate-900 rounded text-xs transition-colors border border-slate-200"
          >
            {copiedIndex === 1 ? "Copied!" : "Copy ACL"}
          </button>
        </div>
      </div>

      {/* Home Router & Small Business Firewall Tips */}
      <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span>🛡️</span> Home & Small Network Firewall Rule Best Practices
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {homeRouterTips.map((tip, idx) => (
            <div
              key={idx}
              onClick={() => toggleRule(idx)}
              className={`cursor-pointer p-4 rounded-lg border transition-all flex items-start gap-3 ${
                checkedRules[idx]
                  ? "bg-slate-50 border-emerald-400/40 text-slate-900"
                  : "bg-slate-50/50 border-slate-200 text-slate-500 hover:border-indigo-300"
              }`}
            >
              <input
                type="checkbox"
                checked={!!checkedRules[idx]}
                onChange={() => toggleRule(idx)}
                className="mt-1 rounded border-slate-200 text-emerald-600 focus:ring-0 bg-white cursor-pointer"
              />
              <div>
                <h4 className={`text-sm font-semibold mb-1 ${checkedRules[idx] ? "text-emerald-600" : "text-slate-900"}`}>
                  {tip.title}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
