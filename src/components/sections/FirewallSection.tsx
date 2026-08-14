"use client";

import NetworkingModuleHeader from "@/components/networking/NetworkingModuleHeader";
import NetworkingPanel from "@/components/networking/NetworkingPanel";
import NetworkingExample from "@/components/networking/NetworkingExample";
import { useState } from "react";

export default function FirewallSection() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [checkedRules, setCheckedRules] = useState<Record<number, boolean>>({
    0: true,
    1: true,
  });

  const handleCopy = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Clipboard access may be unavailable or denied; do not report a false success.
    }
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

! 3. Explicitly DENY remaining Web-to-DB traffic and log attempts
access-list 100 remark --- Deny other Web to DB packets ---
access-list 100 deny ip 192.168.10.0 0.0.0.255 192.168.20.0 0.0.0.255 log

! 4. Apply ACL inbound on VLAN 10 Interface
interface GigabitEthernet0/0.10
 ip access-group 100 in`;

  const homeRouterTips = [
    {
      title: "Isolate Guest Wi-Fi Subnet",
      desc: "If the platform supports guest isolation, enable it and apply policy so guests (e.g. 192.168.2.0/24) cannot reach private NAS drives, PCs, or printers on 192.168.1.0/24.",
    },
    {
      title: "Segregate Smart Home IoT Devices",
      desc: "Place smart TVs, cameras, smart plugs, and voice assistants on an isolated IoT subnet (e.g. 192.168.50.0/24). Explicitly block or restrict traffic from that subnet to the main LAN.",
    },
    {
      title: "Review UPnP Across Trust Boundaries",
      desc: "Avoid allowing Universal Plug and Play (UPnP) port-mapping requests from less-trusted IoT or guest networks to create exposure into protected subnets; exact controls depend on the router.",
    },
    {
      title: "Use Stateful Firewall Engines Carefully",
      desc: "When policy and defaults allow outbound sessions, stateful firewall engines can permit matching return traffic without static inbound ports. Verify the product's defaults and rule direction.",
    },
  ];

  return (
    <section
      id="firewall"
      className="networking-module scroll-mt-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Section Header */}
      <NetworkingModuleHeader
        anchor="#firewall"
        icon={<span className="text-indigo-500 dark:text-indigo-400" aria-hidden="true">◐</span>}
        title={<>16. Firewall Rules Between Subnets</>}
        description={<>Subnets define addressing and broadcast boundaries, but inter-subnet communication also depends on routing. A router or Layer 3 switch may forward traffic when a route exists; firewalls and ACLs then apply the platform&apos;s configured policy to permit, deny, or log packets.</>}
      />
      <div className="module-content networking-module-content">

      {/* 3 Security Action Cards (Block, Allow, Log) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <NetworkingPanel variant="muted" className="mb-10">
        {/* CARD 1: BLOCK */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow hover:border-rose-300 transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-700 flex items-center justify-center font-bold text-lg mb-4">
              🚫
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Default-DENY (Block)
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              A default-deny policy drops traffic that does not match an explicit permit rule. The exact default depends on the device and rule direction, so verify it rather than assuming it.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 text-xs font-mono text-rose-600 dark:text-rose-400 flex justify-between">
            <span>Action: DROP / REJECT</span>
            <span>Default Guard</span>
          </div>
        </div>

        {/* CARD 2: ALLOW */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 flex items-center justify-center font-bold text-lg mb-4">
              ✅
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Granular PERMIT (Allow)
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Allows specific protocol, source CIDR, destination CIDR, and port combinations (e.g. Web Subnet to DB Subnet on TCP 5432).
            </p>
          </div>
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 text-xs font-mono text-emerald-600 dark:text-emerald-400 flex justify-between">
            <span>Action: ACCEPT</span>
            <span>Port Specific</span>
          </div>
        </div>

        {/* CARD 3: LOG */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow hover:border-amber-300 transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700 flex items-center justify-center font-bold text-lg mb-4">
              📊
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Stateful Audit & LOG
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Captures dropped connection attempts, port scans, and unauthorized inter-subnet packets to SIEM monitoring tools for incident analysis.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 text-xs font-mono text-amber-600 dark:text-amber-400 flex justify-between">
            <span>Action: AUDIT / SIEM</span>
            <span>Traffic Analytics</span>
          </div>
        </div>
        </NetworkingPanel>
      </div>

      {/* Cisco ACL Code Block Section */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow mb-10">
        <NetworkingExample title="Worked ACL Decision: Web to Database" description="An extended ACL permits only the required PostgreSQL flow, logs disallowed traffic, and leaves other traffic to the platform's configured policy." tone="amber">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Cisco IOS Inter-Subnet Access Control List (ACL 100)
          </h3>
          <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded border border-indigo-200 dark:border-indigo-700">
            Extended ACL Logic
          </span>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Extended ACLs filter based on source/destination IPs and TCP/UDP ports. Apply inbound on the router sub-interface closest to the source:
        </p>

        <div className="relative">
          <NetworkingPanel variant="console" className="p-0">
          <pre className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4 font-mono text-xs text-slate-900 dark:text-slate-100 overflow-x-auto leading-relaxed">
            {ciscoAclCode}
          </pre>
          </NetworkingPanel>
          <button
            onClick={() => handleCopy(ciscoAclCode, 1)}
            className="absolute top-3 right-3 px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] text-white dark:text-slate-100 hover:text-white rounded text-xs transition-colors border border-slate-200 dark:border-slate-700"
          >
            {copiedIndex === 1 ? "Copied!" : "Copy ACL"}
          </button>
        </div>
        </NetworkingExample>
      </div>

      {/* Home Router & Small Business Firewall Tips */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow">
        <NetworkingPanel className="space-y-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <span>🛡️</span> Home & Small Network Firewall Rule Best Practices
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {homeRouterTips.map((tip, idx) => (
            <div
              key={idx}
              onClick={() => toggleRule(idx)}
              className={`cursor-pointer p-4 rounded-lg border transition-all flex items-start gap-3 ${
                checkedRules[idx]
                  ? "bg-slate-50 dark:bg-slate-700 border-emerald-400/40 text-slate-900 dark:text-slate-100"
                  : "bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300"
              }`}
            >
              <input
                type="checkbox"
                checked={!!checkedRules[idx]}
                aria-label={`Mark ${tip.title} as complete`}
                onChange={() => toggleRule(idx)}
                className="mt-1 rounded border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 focus:ring-0 bg-white dark:bg-slate-800 cursor-pointer"
              />
              <div>
                <h4 className={`text-sm font-semibold mb-1 ${checkedRules[idx] ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-slate-100"}`}>
                  {tip.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
        </NetworkingPanel>
      </div>
      </div>
    </section>
  );
}
