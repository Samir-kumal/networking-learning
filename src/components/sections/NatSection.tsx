"use client";

import { useState } from "react";

export default function NatSection() {
  const [natStep, setNatStep] = useState<number>(1);

  const natSteps = [
    {
      step: 1,
      title: "Outbound Request Sent by Private Host",
      description: "Client (192.168.1.50) sends a packet to Web Server (93.184.216.34:80) via ephemeral port 51234.",
      src: "192.168.1.50 : 51234",
      dst: "93.184.216.34 : 80",
      activeLocation: "lan",
      tableState: "Creating translation state...",
    },
    {
      step: 2,
      title: "NAT Gateway Rewrites Source IP & Port",
      description: "Router replaces private IP/Port with public WAN IP (203.0.113.5) and assigned NAT port 10050.",
      src: "203.0.113.5 : 10050",
      dst: "93.184.216.34 : 80",
      activeLocation: "router",
      tableState: "192.168.1.50:51234 ↔ 203.0.113.5:10050",
    },
    {
      step: 3,
      title: "Server Receives Packet & Replies",
      description: "Web Server (93.184.216.34) processes request and sends response back to public IP (203.0.113.5:10050).",
      src: "93.184.216.34 : 80",
      dst: "203.0.113.5 : 10050",
      activeLocation: "wan",
      tableState: "192.168.1.50:51234 ↔ 203.0.113.5:10050",
    },
    {
      step: 4,
      title: "NAT Gateway Delivers Response to Private Host",
      description: "Router receives WAN packet, looks up NAT Table, rewrites destination back to 192.168.1.50:51234, and delivers to LAN client.",
      src: "93.184.216.34 : 80",
      dst: "192.168.1.50 : 51234",
      activeLocation: "lan",
      tableState: "Translation session complete",
    },
  ];

  const currentStep = natSteps[natStep - 1];

  return (
    <section
      id="ips"
      className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold">
          #ips
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          7. Public vs Private IPs & NAT
        </h2>
      </div>

      <p className="text-slate-500 text-base leading-relaxed mb-8 max-w-4xl">
        IP addresses are split into globally routable <strong className="text-indigo-600">Public IPs</strong> and localized <strong className="text-emerald-600">Private IPs</strong>. Because IPv4 addresses are scarce, <strong className="text-amber-600">Network Address Translation (NAT)</strong> allows hundreds of devices on a private LAN to share a single public IP address when communicating over the internet.
      </p>

      {/* Routability Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Public IP Card */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow hover:card-shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 rounded bg-indigo-100 text-indigo-600 font-mono text-xs font-bold">
                Public IP Addresses
              </span>
              <span className="text-xs font-mono text-slate-500">Globally Routable</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">
              Internet-Facing Infrastructure
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              Globally unique addresses assigned by ICANN/IANA through Regional Internet Registries (ARIN, RIPE, APNIC) and ISPs. Directly accessible over the public internet.
            </p>
            <div className="space-y-2 text-xs font-mono bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-500">
              <div className="flex justify-between">
                <span>Routability:</span>
                <span className="text-emerald-600">Global Public Internet</span>
              </div>
              <div className="flex justify-between">
                <span>Uniqueness:</span>
                <span className="text-indigo-600">Worldwide Unique</span>
              </div>
              <div className="flex justify-between">
                <span>Examples:</span>
                <span className="text-slate-900">8.8.8.8 (Google), 1.1.1.1 (Cloudflare)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Private IP Card */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-600 font-mono text-xs font-bold">
                Private IP Addresses
              </span>
              <span className="text-xs font-mono text-slate-500">RFC 1918 Local LAN</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">
              Internal LAN & Cloud VPCs
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              Reserved for internal use inside homes, offices, and cloud VPC networks. ISP routers automatically drop private IP packets attempting to cross the public internet.
            </p>
            <div className="space-y-2 text-xs font-mono bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-500">
              <div className="flex justify-between">
                <span>Routability:</span>
                <span className="text-rose-600">Non-Routable on Internet</span>
              </div>
              <div className="flex justify-between">
                <span>Uniqueness:</span>
                <span className="text-amber-600">Local Network Only</span>
              </div>
              <div className="flex justify-between">
                <span>Examples:</span>
                <span className="text-slate-900">192.168.1.1, 10.0.0.1, 172.16.0.1</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NAT Packet Translation Visual Diagram */}
      <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Interactive NAT / PAT (Port Address Translation) Flow
            </h3>
            <p className="text-xs text-slate-500">
              Step-by-step walkthrough showing how a NAT Gateway translates private sockets to public sockets.
            </p>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((stepNum) => (
              <button
                key={stepNum}
                onClick={() => setNatStep(stepNum)}
                className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition-all ${
                  natStep === stepNum
                    ? "bg-indigo-600 text-slate-900 shadow-md shadow-[#58a6ff]/20"
                    : "bg-white text-slate-500 border border-slate-200 hover:border-indigo-300"
                }`}
              >
                {stepNum}
              </button>
            ))}
          </div>
        </div>

        {/* Step Explanation Banner */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 font-mono text-xs font-bold">
              Step {currentStep.step} of 4
            </span>
            <h4 className="text-base font-bold text-slate-900">
              {currentStep.title}
            </h4>
          </div>
          <p className="text-xs text-slate-500">
            {currentStep.description}
          </p>
        </div>

        {/* Diagram Architecture Box */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative mb-6">
          {/* Node 1: Private LAN Client */}
          <div className={`rounded-xl border p-5 transition-all ${
            currentStep.activeLocation === "lan"
              ? "bg-white border-indigo-400 shadow-lg shadow-[#58a6ff]/10"
              : "bg-slate-50 border-slate-200"
          }`}>
            <div className="text-xs font-mono text-indigo-600 uppercase mb-1">
              Private LAN Client
            </div>
            <div className="text-sm font-mono font-bold text-slate-900">
              192.168.1.50
            </div>
            <div className="text-xs text-slate-500 mt-2">
              Private Network (RFC 1918)
            </div>
          </div>

          {/* Node 2: NAT Gateway Router */}
          <div className={`rounded-xl border p-5 transition-all ${
            currentStep.activeLocation === "router"
              ? "bg-white border-amber-400 shadow-lg shadow-[#ffa657]/10"
              : "bg-slate-50 border-slate-200"
          }`}>
            <div className="text-xs font-mono text-amber-600 uppercase mb-1">
              NAT Gateway Router
            </div>
            <div className="text-xs font-mono font-bold text-slate-900">
              LAN: 192.168.1.1
            </div>
            <div className="text-xs font-mono font-bold text-indigo-600">
              WAN Public: 203.0.113.5
            </div>
            <div className="text-[11px] text-slate-500 mt-2">
              Rewrites Packet Headers
            </div>
          </div>

          {/* Node 3: Public Web Server */}
          <div className={`rounded-xl border p-5 transition-all ${
            currentStep.activeLocation === "wan"
              ? "bg-white border-emerald-400 shadow-lg shadow-[#7ee787]/10"
              : "bg-slate-50 border-slate-200"
          }`}>
            <div className="text-xs font-mono text-emerald-600 uppercase mb-1">
              Public Web Server
            </div>
            <div className="text-sm font-mono font-bold text-slate-900">
              93.184.216.34:80
            </div>
            <div className="text-xs text-slate-500 mt-2">
              Global Public Internet
            </div>
          </div>
        </div>

        {/* Packet Info & NAT Translation Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Live Packet */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 font-mono text-xs">
            <div className="text-amber-600 font-bold uppercase mb-2">
              Active Packet Header State:
            </div>
            <div className="space-y-1.5 bg-slate-50 p-3 rounded border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Source Socket:</span>
                <span className="text-indigo-600 font-bold">{currentStep.src}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Destination Socket:</span>
                <span className="text-emerald-600 font-bold">{currentStep.dst}</span>
              </div>
            </div>
          </div>

          {/* NAT Translation Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 font-mono text-xs">
            <div className="text-violet-600 font-bold uppercase mb-2">
              Router NAT Translation Table:
            </div>
            <div className="bg-slate-50 p-3 rounded border border-slate-200 text-slate-900">
              <div className="text-slate-500 text-[10px] flex justify-between border-b border-slate-200 pb-1 mb-1">
                <span>Private Socket</span>
                <span>Public NAT Socket</span>
              </div>
              <div className="text-center py-1 text-violet-600 font-bold">
                {currentStep.tableState}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
