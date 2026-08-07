"use client";

import { useState } from "react";
import Link from "next/link";

interface QuickTool {
  name: string;
  category: string;
  path: string;
  badge: string;
  color: string;
}

const QUICK_TOOLS: QuickTool[] = [
  { name: "Subnet Calculator", category: "Networking", path: "/networking#calculator", badge: "Live Tool", color: "#00f0ff" },
  { name: "Wireshark PCAP Inspector", category: "Networking", path: "/networking#packets", badge: "Interactive", color: "#00ff9d" },
  { name: "AWS VPC Subnet Planner", category: "AWS Cloud", path: "/aws#aws-vpc", badge: "Cloud", color: "#ffb700" },
  { name: "Trivy & Snyk Scanner", category: "Cybersecurity", path: "/security#sec-scanners", badge: "AppSec", color: "#ff3860" },
  { name: "GitHub Actions CI Builder", category: "Git & CI/CD", path: "/git-ops#git-actions", badge: "Automation", color: "#a855f7" },
  { name: "K8s Cluster Inspector", category: "Containers", path: "/docker-k8s#k8s-cluster", badge: "DevOps", color: "#00f0ff" },
];

export default function HubHero() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTools = QUICK_TOOLS.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section className="relative py-12 md:py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center overflow-hidden">
      {/* Background Ambient Radial Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-[#00f0ff]/15 via-[#a855f7]/10 to-transparent blur-3xl rounded-full pointer-events-none -z-10" />

      {/* Cyber Status Pill Badge */}
      <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-[#0e1420] border border-[#00f0ff]/30 text-xs font-mono text-[#00f0ff] mb-8 shadow-[0_0_20px_rgba(0,240,255,0.15)]">
        <span className="w-2 h-2 rounded-full bg-[#00ff9d] animate-pulse" />
        <span className="font-bold tracking-wider">SYSTEM STATUS: ONLINE</span>
        <span className="text-[#8b949e]">|</span>
        <span className="text-[#8b949e]">23 NETWORKING + 18 DEVOPS MODULES</span>
      </div>

      {/* Hero Title */}
      <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 text-[#f0f6fc]">
        DevOps, Cloud &{" "}
        <span className="bg-gradient-to-r from-[#00f0ff] via-[#00ff9d] to-[#a855f7] bg-clip-text text-transparent text-glow-cyan">
          Security Terminal
        </span>
      </h1>

      {/* Subtitle */}
      <p className="max-w-3xl mx-auto text-base sm:text-xl text-[#8b949e] leading-relaxed mb-10 font-sans">
        Master production network subnetting, AWS cloud architecture, container orchestration, CI/CD automation, and application threat security through hands-on interactive engineering simulators.
      </p>

      {/* Interactive Command Search Matrix */}
      <div className="max-w-2xl mx-auto mb-10">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#00f0ff] via-[#00ff9d] to-[#a855f7] rounded-2xl blur-md opacity-30 group-hover:opacity-75 transition duration-500" />
          <div className="relative bg-[#0e1420] border border-[#202c40] rounded-xl p-2 flex items-center gap-3">
            <span className="text-base font-mono text-[#00f0ff] pl-3">⚡</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools, protocols, or modules (e.g. Subnet Calculator, Wireshark, AWS, K8s)..."
              className="w-full bg-transparent text-sm font-mono text-[#f0f6fc] placeholder-[#8b949e] focus:outline-none py-2"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs font-mono text-[#8b949e] hover:text-[#00f0ff] px-3 py-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Search Matches Preview */}
        {searchQuery && (
          <div className="mt-3 p-3 bg-[#0e1420] border border-[#00f0ff]/40 rounded-xl font-mono text-xs text-left max-h-48 overflow-y-auto space-y-2 shadow-2xl animate-fade-in">
            <div className="text-[10px] text-[#8b949e] font-bold uppercase tracking-wider border-b border-[#202c40] pb-1">
              Matching Tools & Simulators ({filteredTools.length})
            </div>
            {filteredTools.length > 0 ? (
              filteredTools.map((tool) => (
                <Link
                  key={tool.name}
                  href={tool.path}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#141c2c] hover:bg-[#00f0ff]/15 border border-[#202c40] hover:border-[#00f0ff]/50 transition group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[#00f0ff]">⚡</span>
                    <span className="text-[#f0f6fc] group-hover:text-[#00f0ff] font-bold">{tool.name}</span>
                    <span className="text-[10px] text-[#8b949e]">({tool.category})</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#0e1420] text-[#00ff9d] border border-[#00ff9d]/30 font-bold">
                    {tool.badge}
                  </span>
                </Link>
              ))
            ) : (
              <div className="text-center py-4 text-[#8b949e]">No matching engineering tools found</div>
            )}
          </div>
        )}
      </div>

      {/* Quick Launch Tool Shortcuts */}
      <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto mb-12">
        <span className="text-xs font-mono text-[#8b949e] self-center mr-2">Quick Launch:</span>
        {QUICK_TOOLS.map((tool) => (
          <Link
            key={tool.name}
            href={tool.path}
            className="px-3 py-1.5 rounded-lg bg-[#0e1420] border border-[#202c40] hover:border-[#00f0ff]/60 text-xs font-mono text-[#8b949e] hover:text-[#f0f6fc] transition-all flex items-center gap-2 group hover:shadow-[0_0_12px_rgba(0,240,255,0.15)]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] group-hover:scale-125 transition" />
            <span>{tool.name}</span>
          </Link>
        ))}
      </div>

      {/* Live System Metric Ticker Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto p-4 rounded-2xl bg-[#0e1420]/80 border border-[#202c40]">
        <div className="p-3 text-center border-r border-[#202c40] last:border-r-0">
          <div className="text-xs font-mono text-[#8b949e]">Total Modules</div>
          <div className="text-2xl font-mono font-bold text-[#00f0ff] text-glow-cyan mt-1">41</div>
        </div>
        <div className="p-3 text-center border-r border-[#202c40] last:border-r-0">
          <div className="text-xs font-mono text-[#8b949e]">Engineering Tracks</div>
          <div className="text-2xl font-mono font-bold text-[#00ff9d] text-glow-green mt-1">5</div>
        </div>
        <div className="p-3 text-center border-r border-[#202c40] last:border-r-0">
          <div className="text-xs font-mono text-[#8b949e]">Interactive Tools</div>
          <div className="text-2xl font-mono font-bold text-[#ffb700] mt-1">20+</div>
        </div>
        <div className="p-3 text-center">
          <div className="text-xs font-mono text-[#8b949e]">Execution Mode</div>
          <div className="text-2xl font-mono font-bold text-[#a855f7] mt-1">Docker</div>
        </div>
      </div>
    </section>
  );
}
