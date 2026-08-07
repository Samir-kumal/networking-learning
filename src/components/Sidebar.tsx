"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  id: string;
  num: string;
  label: string;
  category: string;
  icon: string;
  path?: string;
}

export interface TrackItem {
  id: string;
  name: string;
  path: string;
  icon: string;
  badge?: string;
}

export const TRACKS: TrackItem[] = [
  { id: "hub",        name: "Central Hub",    path: "/",          icon: "⊞",  badge: "Overview"  },
  { id: "networking", name: "Networking Lab", path: "/networking",icon: "⬡",  badge: "23 Modules"},
  { id: "aws",        name: "AWS Cloud",      path: "/aws",       icon: "◈",  badge: "5 Modules" },
  { id: "security",   name: "Cybersecurity",  path: "/security",  icon: "◉",  badge: "14 Modules" },
  { id: "git-ops",    name: "Git & CI/CD",    path: "/git-ops",   icon: "⑂",  badge: "4 Modules" },
  { id: "docker-k8s", name: "Docker & K8s",   path: "/docker-k8s",icon: "⬡",  badge: "5 Modules" },
];

export const MODULE_ITEMS_BY_TRACK: Record<string, NavItem[]> = {
  hub: [
    { id: "tracks",       num: "H1", label: "Track Directory", category: "Hub", icon: "⊞", path: "/" },
    { id: "architecture", num: "H2", label: "System Map",      category: "Hub", icon: "◈", path: "/" },
    { id: "launchers",    num: "H3", label: "Tool Matrix",     category: "Hub", icon: "⚡", path: "/" },
  ],
  networking: [
    { id: "basics",          num: "01", label: "Subnet Basics",       category: "Foundations",  icon: "⬡" },
    { id: "binary",          num: "02", label: "IP & Binary",         category: "Foundations",  icon: "⊞" },
    { id: "cidr",            num: "03", label: "CIDR Visualizer",     category: "Foundations",  icon: "◈" },
    { id: "vlsm",            num: "04", label: "VLSM Design",         category: "Foundations",  icon: "◐" },
    { id: "vlans",           num: "05", label: "VLANs & Subnets",     category: "Foundations",  icon: "⬡" },
    { id: "ipv6",            num: "06", label: "IPv6 Next-Gen",       category: "Foundations",  icon: "⑂" },
    { id: "ips",             num: "07", label: "NAT & IP Types",      category: "Foundations",  icon: "⊕" },
    { id: "calculator",      num: "08", label: "Subnet Calculator",   category: "Tools",        icon: "◈" },
    { id: "create",          num: "09", label: "Local Creation",      category: "Tools",        icon: "⊞" },
    { id: "supernetting",    num: "10", label: "Supernetting",        category: "Tools",        icon: "⬡" },
    { id: "cloud",           num: "11", label: "Cloud VPCs",          category: "Tools",        icon: "◉" },
    { id: "firewall",        num: "12", label: "Firewall ACLs",       category: "Tools",        icon: "◐" },
    { id: "troubleshooting", num: "13", label: "Troubleshooting",     category: "Tools",        icon: "⊘" },
    { id: "routing",         num: "14", label: "Routing & Gateways",  category: "Advanced",     icon: "⑂" },
    { id: "security",        num: "15", label: "Security Control",    category: "Advanced",     icon: "◉" },
    { id: "dhcp",            num: "16", label: "DHCP & IPAM",         category: "Advanced",     icon: "⬡" },
    { id: "packets",         num: "17", label: "Packets & Wireshark", category: "Advanced",     icon: "◈" },
    { id: "containers",      num: "18", label: "Containers & K8s",    category: "Advanced",     icon: "⊞" },
    { id: "diagnostics",     num: "19", label: "CLI Diagnostics",     category: "Advanced",     icon: "◐" },
    { id: "wireless",        num: "20", label: "Wireless WLAN",       category: "Advanced",     icon: "⬡" },
    { id: "practice",        num: "21", label: "Practice Drills",     category: "Evaluation",   icon: "◈" },
    { id: "cheatsheet",      num: "22", label: "Cheat Sheet",         category: "Evaluation",   icon: "⊞" },
    { id: "quiz",            num: "23", label: "Knowledge Quiz",      category: "Evaluation",   icon: "◉" },
  ],
  aws: [
    { id: "aws-vpc",       num: "A1", label: "AWS VPC Subnetting",   category: "AWS Cloud", icon: "◈" },
    { id: "aws-iam",       num: "A2", label: "IAM Policy Simulator", category: "AWS Cloud", icon: "◉" },
    { id: "aws-s3",        num: "A3", label: "S3 Security Rules",    category: "AWS Cloud", icon: "⬡" },
    { id: "aws-compute",   num: "A4", label: "EC2 vs ECS vs EKS",   category: "AWS Cloud", icon: "⊞" },
    { id: "aws-serverless",num: "A5", label: "Lambda & CloudFront",  category: "AWS Cloud", icon: "⑂" },
  ],
  security: [
    { id: "sec-scanners", num: "S1", label: "Trivy & Snyk Scanners", category: "Security", icon: "◉" },
    { id: "sec-owasp",    num: "S2", label: "OWASP Top 10 Matrix",   category: "Security", icon: "⊘" },
    { id: "sec-vault",    num: "S3", label: "Secrets & Vault Flow",  category: "Security", icon: "◐" },
    { id: "sec-waf",      num: "S4", label: "WAF & TLS Hardening",   category: "Security", icon: "⬡" },
    { id: "sec-threat-model",        num: "S5",  label: "Threat Modeling & STRIDE",       category: "Security", icon: "◈" },
    { id: "sec-iam",                 num: "S6",  label: "IAM & Least Privilege",           category: "Security", icon: "◉" },
    { id: "sec-api-security",        num: "S7",  label: "API Security",                    category: "Security", icon: "⬡" },
    { id: "sec-zero-trust",          num: "S8",  label: "Zero Trust Segmentation",          category: "Security", icon: "⊘" },
    { id: "sec-incident-response",   num: "S9",  label: "Incident Response & SOC",          category: "Security", icon: "⚠" },
    { id: "sec-siem",                num: "S10", label: "SIEM Detection & Logs",             category: "Security", icon: "▤" },
    { id: "sec-supply-chain",        num: "S11", label: "Supply Chain & SBOM",               category: "Security", icon: "⑂" },
    { id: "sec-container-security",  num: "S12", label: "Container Security",                category: "Security", icon: "⬡" },
    { id: "sec-cloud-posture",       num: "S13", label: "Cloud Security Posture",            category: "Security", icon: "☁" },
    { id: "sec-privacy-compliance",  num: "S14", label: "Privacy & Compliance",              category: "Security", icon: "◐" },
  ],
  "git-ops": [
    { id: "git-branching", num: "G1", label: "Git Flow & Trunk",      category: "GitOps", icon: "⑂" },
    { id: "git-actions",   num: "G2", label: "GitHub Actions CI",     category: "GitOps", icon: "⊞" },
    { id: "git-semver",    num: "G3", label: "SemVer Calculator",     category: "GitOps", icon: "◈" },
    { id: "git-deploy",    num: "G4", label: "Blue/Green & Canary",   category: "GitOps", icon: "◉" },
  ],
  "docker-k8s": [
    { id: "k8s-dockerfile", num: "D1", label: "Multi-Stage Docker",   category: "Containers", icon: "⬡" },
    { id: "k8s-compose",    num: "D2", label: "Compose Generator",    category: "Containers", icon: "◈" },
    { id: "k8s-cluster",    num: "D3", label: "K8s Architecture",     category: "Containers", icon: "⊞" },
    { id: "k8s-helm",       num: "D4", label: "Helm Charts & Syntax", category: "Containers", icon: "◐" },
    { id: "k8s-argocd",     num: "D5", label: "ArgoCD GitOps Sync",   category: "Containers", icon: "⑂" },
  ],
};

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const [activeId, setActiveId]           = useState<string>("basics");
  const [isMobileOpen, setIsMobileOpen]   = useState<boolean>(false);
  const [searchQuery, setSearchQuery]     = useState<string>("");

  const currentTrackId = useMemo(() => {
    if (pathname === "/networking")  return "networking";
    if (pathname === "/aws")         return "aws";
    if (pathname === "/security")    return "security";
    if (pathname === "/git-ops")     return "git-ops";
    if (pathname === "/docker-k8s")  return "docker-k8s";
    return "hub";
  }, [pathname]);

  const currentTrack = TRACKS.find((t) => t.id === currentTrackId)!;
  const navItems     = MODULE_ITEMS_BY_TRACK[currentTrackId] ?? [];

  // Group items by category
  const grouped = useMemo(() => {
    const filtered = searchQuery.trim()
      ? navItems.filter((i) =>
          i.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : navItems;

    return filtered.reduce<Record<string, NavItem[]>>((acc, item) => {
      (acc[item.category] ??= []).push(item);
      return acc;
    }, {});
  }, [navItems, searchQuery]);

  // IntersectionObserver: track active section
  useEffect(() => {
    const ids = navItems.map((i) => i.id);
    const observers: IntersectionObserver[] = [];

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveId(id); },
        { rootMargin: "-30% 0px -65% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [navItems]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* ── Brand / Header ── */}
      <div className={`flex items-center justify-between px-4 py-4 border-b border-slate-200 ${isCollapsed ? "px-3" : ""}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              D
            </div>
            <div>
              <div className="text-[13px] font-semibold text-slate-900 leading-none">DevOps Hub</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Learning Portal</div>
            </div>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Toggle sidebar"
        >
          <svg className={`w-4 h-4 transition-transform ${isCollapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* ── Track Switcher ── */}
      <div className={`border-b border-slate-200 ${isCollapsed ? "py-2" : "p-3"}`}>
        {!isCollapsed && (
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
            Learning Tracks
          </p>
        )}
        <div className={`space-y-0.5 ${isCollapsed ? "px-2" : ""}`}>
          {TRACKS.map((track) => {
            const isActive = track.id === currentTrackId;
            return (
              <Link
                key={track.id}
                href={track.path}
                title={isCollapsed ? track.name : undefined}
                className={`flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-all ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className={`text-base flex-shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400"}`}>
                  {track.icon}
                </span>
                {!isCollapsed && (
                  <span className="flex-1 truncate text-[13px]">{track.name}</span>
                )}
                {!isCollapsed && track.badge && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {track.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Module Search ── */}
      {!isCollapsed && (
        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search modules…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-slate-50 border border-slate-200 rounded-md text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 transition"
            />
          </div>
        </div>
      )}

      {/* ── Module Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-4">
        {!isCollapsed && (
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-2 px-1">
            {currentTrack.name}
          </p>
        )}
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            {!isCollapsed && (
              <p className="text-[10px] font-medium text-slate-400 px-1 mb-1 mt-3">
                {category}
              </p>
            )}
            <div className="space-y-0.5">
              {items.map((item) => {
                const isActive = activeId === item.id;
                return (
                  <a
                    key={item.id}
                    href={item.path ? item.path : `#${item.id}`}
                    title={isCollapsed ? `${item.num} · ${item.label}` : undefined}
                    onClick={() => setActiveId(item.id)}
                    className={`group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-all ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700 font-medium"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {/* Active indicator pill */}
                    <span className={`flex-shrink-0 w-1 h-4 rounded-full transition-all ${
                      isActive ? "bg-indigo-500" : "bg-transparent group-hover:bg-slate-300"
                    }`} />

                    {isCollapsed ? (
                      <span className="text-[11px] font-mono font-semibold text-slate-500">{item.num}</span>
                    ) : (
                      <>
                        <span className={`font-mono text-[10px] flex-shrink-0 w-5 ${isActive ? "text-indigo-500" : "text-slate-400"}`}>
                          {item.num}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        ))}

        {searchQuery && Object.keys(grouped).length === 0 && (
          <div className="py-8 text-center text-[12px] text-slate-400">
            No modules match &ldquo;{searchQuery}&rdquo;
          </div>
        )}
      </nav>

      {/* ── Footer: Live Status ── */}
      <div className={`border-t border-slate-200 p-3 ${isCollapsed ? "px-2" : ""}`}>
        {!isCollapsed ? (
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-soft-pulse flex-shrink-0" />
            <span>Docker · Port <strong className="text-slate-700">3008</strong></span>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-soft-pulse" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile hamburger */}
      <button
        className="fixed top-3 left-3 z-50 lg:hidden p-2 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-600 hover:bg-slate-50 transition"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Open sidebar"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 shadow-xl transform transition-transform duration-200 lg:hidden ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 bg-white border-r border-slate-200 transition-all duration-200 ${isCollapsed ? "w-16" : "w-64"}`}>
        <SidebarContent />
      </aside>
    </>
  );
}
