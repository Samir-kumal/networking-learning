"use client";

import NetworkingModuleHeader from "@/components/networking/NetworkingModuleHeader";
import NetworkingPanel from "@/components/networking/NetworkingPanel";
import { useState } from "react";

export default function TroubleshootingSection() {
  const [activeProblem, setActiveProblem] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({
    0: true,
    1: true,
  });

  const toggleStep = (idx: number) => {
    setCompletedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const problems = [
    {
      title: "1. Misconfigured Subnet Mask (Off-by-One CIDR)",
      badge: "Mask Mismatch",
      symptom: "Host A (192.168.1.50/24) cannot reach Host B (192.168.1.200/25). Host B incorrectly treats Host A as external and sends packets to Gateway.",
      solution: "Verify netmask uniformity across all hosts in the subnet block.",
      cliSnippet: `# Windows: Inspect IPv4 Subnet Mask
ipconfig /all

# Linux: Verify assigned IP & Prefix length
ip -4 addr show dev eth0`,
    },
    {
      title: "2. Incorrect or Missing Default Gateway",
      badge: "Routing Isolation",
      symptom: "Host communicates fine with local subnet neighbors (192.168.1.0/24) but fails to reach any external subnets or public Internet.",
      solution: "Inspect local route table and add missing default gateway (0.0.0.0/0) route.",
      cliSnippet: `# Windows: Display IPv4 Routing Table
route print -4

# Linux: View default route interface & gateway IP
ip route show default`,
    },
    {
      title: "3. Duplicate IP Address Conflict",
      badge: "IP Collision",
      symptom: "Intermittent connection drops, session resets, ARP cache poisoning errors, and flapping switch MAC address tables.",
      solution: "Release current DHCP lease, clear local ARP cache, and re-acquire unique IP address.",
      cliSnippet: `:: Windows: Release & Renew DHCP Address
ipconfig /release
ipconfig /renew

:: Clear local ARP cache and view MAC bindings
arp -d *
arp -a`,
    },
    {
      title: "4. Assigned Reserved Network or Broadcast IP",
      badge: "Invalid Host IP",
      symptom: "Host assigned .0 or .255 in a /24 network cannot transmit packets or causes broadcast storms.",
      solution: "Re-assign valid usable host address strictly within valid host range (.1 through .254).",
      cliSnippet: `# Linux: Remove invalid network IP & assign valid host IP
sudo ip addr del 192.168.10.0/24 dev eth0
sudo ip addr add 192.168.10.15/24 dev eth0`,
    },
    {
      title: "5. VLAN Tagging / 802.1Q Trunking Mismatch",
      badge: "Layer 2 Mismatch",
      symptom: "Host IP/mask are valid, but switch drops all frames because switchport VLAN ID is wrong or 802.1Q trunk native VLAN differs.",
      solution: "Inspect switchport access VLANs and verify 802.1Q trunk tagging.",
      cliSnippet: `! Cisco Switch CLI: Inspect VLAN status & Trunk links
show interfaces status
show interfaces trunk
show vlan brief`,
    },
    {
      title: "6. Firewall / ACL Blocking Inter-Subnet Traffic",
      badge: "Gateway ACL Drop",
      symptom: "Subnet routing works, but TCP/UDP connection attempts time out when traversing subnet gateway.",
      solution: "Test specific port reachability and audit gateway Access Control Lists (ACLs).",
      cliSnippet: `# Windows PowerShell: Test TCP Port Reachability
Test-NetConnection -ComputerName 192.168.20.10 -Port 443

# Linux: Test TCP Port connection with Netcat
nc -zv 192.168.20.10 5432`,
    },
  ];

  const diagnosticChecklist = [
    {
      step: "Step 1",
      title: "Verify Local IP Address & Subnet Mask",
      desc: "Ensure host has a valid IP address (not 0.0.0.0 or APIPA 169.254.x.x) and correct netmask matching network plan.",
      cmd: "ipconfig /all  |  ip addr",
    },
    {
      step: "Step 2",
      title: "Test Local Loopback & Interface",
      desc: "Ping 127.0.0.1 and local host IP to verify local TCP/IP protocol stack and NIC driver functionality.",
      cmd: "ping 127.0.0.1",
    },
    {
      step: "Step 3",
      title: "Ping Default Gateway IP",
      desc: "Test ICMP reachability to local subnet router interface (e.g. 192.168.10.1) to confirm Layer 2 switch connectivity.",
      cmd: "ping 192.168.10.1",
    },
    {
      step: "Step 4",
      title: "Trace Route Path to Target Destination",
      desc: "Execute traceroute to locate exact router hop where inter-subnet packet forwarding fails or times out.",
      cmd: "tracert 192.168.20.50",
    },
    {
      step: "Step 5",
      title: "Test DNS & Targeted TCP/UDP Ports",
      desc: "Verify whether issue is pure IP layer routing or higher-layer DNS resolution / firewall port blocking.",
      cmd: "nslookup domain.com  |  nc -zv IP PORT",
    },
    {
      step: "Step 6",
      title: "Audit Switch VLANs & Firewall ACL Rules",
      desc: "Check switchport VLAN assignments, 802.1Q trunk tags, stateful firewall rules, and router ACL drop counters.",
      cmd: "show vlan brief  |  show access-lists",
    },
  ];

  return (
    <section
      id="troubleshooting"
      className="networking-module scroll-mt-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Section Header */}
      <NetworkingModuleHeader
        anchor="#troubleshooting"
        icon={<span className="text-indigo-500 dark:text-indigo-400" aria-hidden="true">⊘</span>}
        title={<>19. Troubleshooting Subnet Issues</>}
        description={<>Subnetting issues can lead to subtle network failures, including host isolation, asymmetric routing, IP conflicts, and cross-subnet packet drops. Master these 6 diagnostic scenarios and follow the 6-step troubleshooting workflow.</>}
      />
      <div className="module-content networking-module-content">

      {/* 6 Problem / Solution Cards */}
        <NetworkingPanel variant="muted" className="space-y-6">
      <div className="mb-10">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
          6 Common Subnet Misconfigurations & Solutions
        </h3>

        {/* Problem Selector Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-6">
          {problems.map((prob, idx) => (
            <button
              key={idx}
              onClick={() => setActiveProblem(idx)}
              className={`p-2.5 rounded-lg text-xs font-mono font-medium transition-all text-center border ${
                activeProblem === idx
                  ? "bg-indigo-100 text-indigo-600 dark:text-indigo-400 border-indigo-300 font-bold"
                  : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:text-slate-100"
              }`}
            >
              Scenario 0{idx + 1}
            </button>
          ))}
        </div>

        {/* Active Problem Card */}
          <NetworkingPanel variant="muted" className="space-y-6">
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {problems[activeProblem].title}
            </h4>
            <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-400/20 w-fit">
              {problems[activeProblem].badge}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-4 rounded-lg">
              <span className="text-xs font-mono text-rose-600 dark:text-rose-400 block mb-1">⚠️ Symptom / Impact</span>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {problems[activeProblem].symptom}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-4 rounded-lg">
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 block mb-1">💡 Resolution Strategy</span>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {problems[activeProblem].solution}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">Diagnostic CLI Commands</span>
            <NetworkingPanel variant="console" className="p-0">
            <pre className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4 font-mono text-xs text-slate-900 dark:text-slate-100 overflow-x-auto leading-relaxed">
              {problems[activeProblem].cliSnippet}
            </pre>
            </NetworkingPanel>
          </div>
        </div>
          </NetworkingPanel>
      </div>
        </NetworkingPanel>

      {/* 6-Step Subnet Diagnostic Checklist */}
        <NetworkingPanel className="space-y-6">
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <span>🩺</span> 6-Step Subnet Diagnostic Workflow
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {diagnosticChecklist.map((item, idx) => (
            <div
              key={idx}
              onClick={() => toggleStep(idx)}
              className={`cursor-pointer p-4 rounded-lg border transition-all flex items-start gap-3 ${
                completedSteps[idx]
                  ? "bg-slate-50 dark:bg-slate-700 border-emerald-400/40 text-slate-900 dark:text-slate-100"
                  : "bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300"
              }`}
            >
              <input
                type="checkbox"
                checked={!!completedSteps[idx]}
                aria-label={`Mark ${item.title} as complete`}
                onChange={() => toggleStep(idx)}
                className="mt-1 rounded border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 focus:ring-0 bg-white dark:bg-slate-800 cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-mono ${completedSteps[idx] ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400"}`}>
                    {item.step}
                  </span>
                  <code className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {item.cmd}
                  </code>
                </div>
                <h4 className={`text-sm font-semibold mb-1 ${completedSteps[idx] ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-slate-100"}`}>
                  {item.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
        </NetworkingPanel>
      </div>
    </section>
  );
}
