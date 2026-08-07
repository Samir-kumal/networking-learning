"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
  { id: "hub", name: "Central Hub", path: "/", icon: "🏠", badge: "Overview" },
  { id: "networking", name: "Networking Lab", path: "/networking", icon: "🌐", badge: "23 Modules" },
  { id: "aws", name: "AWS Cloud", path: "/aws", icon: "☁️", badge: "5 Modules" },
  { id: "security", name: "Cybersecurity", path: "/security", icon: "🛡️", badge: "4 Modules" },
  { id: "git-ops", name: "Git & CI/CD", path: "/git-ops", icon: "🔀", badge: "4 Modules" },
  { id: "docker-k8s", name: "Docker & K8s", path: "/docker-k8s", icon: "🐳", badge: "5 Modules" },
];

export const MODULE_ITEMS_BY_TRACK: Record<string, NavItem[]> = {
  hub: [
    { id: "tracks", num: "H1", label: "Track Directory", category: "Hub", icon: "🚀", path: "/" },
    { id: "architecture", num: "H2", label: "System Map", category: "Hub", icon: "🗺️", path: "/" },
    { id: "launchers", num: "H3", label: "Tool Matrix", category: "Hub", icon: "⚡", path: "/" },
  ],
  networking: [
    { id: "basics", num: "1", label: "Subnet Basics", category: "Foundations", icon: "🌐" },
    { id: "binary", num: "2", label: "IP & Binary", category: "Foundations", icon: "🔢" },
    { id: "cidr", num: "3", label: "CIDR Visualizer", category: "Foundations", icon: "📊" },
    { id: "vlsm", num: "4", label: "VLSM Design", category: "Foundations", icon: "📐" },
    { id: "vlans", num: "5", label: "VLANs & Subnets", category: "Foundations", icon: "📡" },
    { id: "ipv6", num: "6", label: "IPv6 Next-Gen", category: "Foundations", icon: "⚡" },
    { id: "ips", num: "7", label: "NAT & IP Types", category: "Foundations", icon: "🏠" },
    { id: "calculator", num: "8", label: "Subnet Calculator", category: "Tools & Guides", icon: "🧮" },
    { id: "create", num: "9", label: "Local Creation", category: "Tools & Guides", icon: "🛠️" },
    { id: "supernetting", num: "10", label: "Supernetting", category: "Tools & Guides", icon: "🔄" },
    { id: "cloud", num: "11", label: "Cloud VPCs", category: "Tools & Guides", icon: "☁️" },
    { id: "firewall", num: "12", label: "Firewall ACLs", category: "Tools & Guides", icon: "🛡️" },
    { id: "troubleshooting", num: "13", label: "Troubleshooting", category: "Tools & Guides", icon: "❌" },
    { id: "routing", num: "14", label: "Routing & Gateways", category: "Advanced Infra", icon: "🗺️" },
    { id: "security", num: "15", label: "Security Control", category: "Advanced Infra", icon: "🔒" },
    { id: "dhcp", num: "16", label: "DHCP & IPAM", category: "Advanced Infra", icon: "🔄" },
    { id: "packets", num: "17", label: "Packets & Wireshark", category: "Advanced Infra", icon: "📦" },
    { id: "containers", num: "18", label: "Containers & K8s", category: "Advanced Infra", icon: "☸️" },
    { id: "diagnostics", num: "19", label: "CLI Diagnostics", category: "Advanced Infra", icon: "💻" },
    { id: "wireless", num: "20", label: "Wireless WLAN", category: "Advanced Infra", icon: "📶" },
    { id: "practice", num: "21", label: "Practice Drills", category: "Evaluation", icon: "📝" },
    { id: "cheatsheet", num: "22", label: "Cheat Sheet", category: "Evaluation", icon: "📋" },
    { id: "quiz", num: "23", label: "Knowledge Quiz", category: "Evaluation", icon: "🎯" },
  ],
  aws: [
    { id: "aws-vpc", num: "A1", label: "AWS VPC Subnetting", category: "AWS Cloud", icon: "☁️" },
    { id: "aws-iam", num: "A2", label: "IAM Policy Simulator", category: "AWS Cloud", icon: "🔑" },
    { id: "aws-s3", num: "A3", label: "S3 Security Rules", category: "AWS Cloud", icon: "🪣" },
    { id: "aws-compute", num: "A4", label: "EC2 vs ECS vs EKS", category: "AWS Cloud", icon: "🖥️" },
    { id: "aws-[#00f0ff]less", num: "A5", label: "Lambda & CloudFront", category: "AWS Cloud", icon: "⚡" },
  ],
  security: [
    { id: "sec-scanners", num: "S1", label: "Trivy & Snyk Scanners", category: "Cybersecurity", icon: "🛡️" },
    { id: "sec-owasp", num: "S2", label: "OWASP Top 10 Matrix", category: "Cybersecurity", icon: "⚠️" },
    { id: "sec-vault", num: "S3", label: "Secrets & Vault Flow", category: "Cybersecurity", icon: "🔒" },
    { id: "sec-waf", num: "S4", label: "WAF & TLS Hardening", category: "Cybersecurity", icon: "🌐" },
  ],
  "git-ops": [
    { id: "git-branching", num: "G1", label: "Git Flow & Trunk", category: "Git & CI/CD", icon: "🔀" },
    { id: "git-actions", num: "G2", label: "GitHub Actions CI", category: "Git & CI/CD", icon: "⚡" },
    { id: "git-semver", num: "G3", label: "SemVer Calculator", category: "Git & CI/CD", icon: "🏷️" },
    { id: "git-deploy", num: "G4", label: "Blue/Green & Canary", category: "Git & CI/CD", icon: "🚀" },
  ],
  "docker-k8s": [
    { id: "k8s-dockerfile", num: "D1", label: "Multi-Stage Docker", category: "Docker & K8s", icon: "🐳" },
    { id: "k8s-compose", num: "D2", label: "Compose Generator", category: "Docker & K8s", icon: "📦" },
    { id: "k8s-cluster", num: "D3", label: "K8s Architecture", category: "Docker & K8s", icon: "☸️" },
    { id: "k8s-helm", num: "D4", label: "Helm Charts & Syntax", category: "Docker & K8s", icon: "⚓" },
    { id: "k8s-argocd", num: "D5", label: "ArgoCD GitOps Sync", category: "Docker & K8s", icon: "🔄" },
  ],
};

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeId, setActiveId] = useState<string>("basics");
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);

  // Identify current track from pathname
  const currentTrackId = useMemo(() => {
    if (pathname === "/networking") return "networking";
    if (pathname === "/aws") return "aws";
    if (pathname === "/security") return "security";
    if (pathname === "/git-ops") return "git-ops";
    if (pathname === "/docker-k8s") return "docker-k8s";
    return "hub";
  }, [pathname]);

  const activeNavItems = useMemo(() => {
    return MODULE_ITEMS_BY_TRACK[currentTrackId] || MODULE_ITEMS_BY_TRACK.hub;
  }, [currentTrackId]);

  // Active section tracking on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 140;
      const sections = activeNavItems.map((item) => document.getElementById(item.id)).filter(Boolean);

      let current = activeNavItems[0]?.id || "basics";
      for (const section of sections) {
        if (section && scrollPosition >= section.offsetTop) {
          current = section.id;
        }
      }
      setActiveId(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeNavItems]);

  const scrollTo = (id: string, path?: string) => {
    setIsMobileOpen(false);
    if (path && path !== pathname) {
      router.push(`${path}#${id}`);
      return;
    }

    const el = document.getElementById(id);
    if (el) {
      const offsetTop = el.offsetTop - 30;
      window.scrollTo({
        top: Math.max(0, offsetTop),
        behavior: "smooth",
      });
    }
  };

  return (
    <>
      {/* Mobile Drawer Trigger */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-3 rounded-xl bg-[#0e1420] border border-[#00f0ff]/40 text-[#00f0ff] shadow-xl hover:bg-[#00f0ff]/10 transition-all"
        aria-label="Toggle Navigation Drawer"
      >
        <span className="text-base font-mono">{isMobileOpen ? "✕" : "☰ SYS_NAV"}</span>
      </button>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-md transition-opacity"
        />
      )}

      {/* Cyberpunk Command Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 bg-[#080c14]/95 backdrop-blur-2xl border-r border-[#202c40] flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-16" : "w-64"
        } ${
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header / Brand Badge */}
        <div className="p-4 border-b border-[#202c40] flex items-center justify-between min-h-[68px]">
          <Link
            href="/"
            onClick={() => setIsMobileOpen(false)}
            className="flex items-center gap-3 group overflow-hidden"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0e1420] border border-[#00f0ff]/40 flex items-center justify-center text-lg flex-shrink-0 shadow-[0_0_15px_rgba(0,240,255,0.25)] group-hover:border-[#00f0ff] transition-all">
              ⚡
            </div>
            {!isCollapsed && (
              <div className="flex flex-col whitespace-nowrap">
                <span className="font-mono font-bold text-sm text-[#f0f6fc] group-hover:text-[#00f0ff] transition-colors flex items-center gap-1">
                  DEVOPS<span className="text-[#00ff9d]">HUB</span>
                </span>
                <span className="text-[10px] font-mono text-[#00f0ff] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] animate-pulse" /> PORT 3008
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Toggle Button */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg bg-[#0e1420] border border-[#202c40] text-[#8b949e] hover:text-[#00f0ff] hover:border-[#00f0ff] transition-all"
            title={isCollapsed ? "Expand Command Rail" : "Collapse Command Rail"}
          >
            <span className="text-xs font-mono">{isCollapsed ? "▶" : "◀"}</span>
          </button>
        </div>

        {/* Central Hub Home Button */}
        <div className="p-2 border-b border-[#202c40]/60">
          <Link
            href="/"
            onClick={() => setIsMobileOpen(false)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-mono transition-all ${
              pathname === "/"
                ? "bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/40 font-bold shadow-[0_0_12px_rgba(0,240,255,0.15)]"
                : "text-[#8b949e] hover:bg-[#0e1420] hover:text-[#f0f6fc] border border-transparent"
            }`}
          >
            <span className="text-sm">🏠</span>
            {!isCollapsed && <span>Central Hub</span>}
          </Link>
        </div>

        {/* Learning Tracks Quick Selector */}
        {!isCollapsed && (
          <div className="px-3 pt-3 pb-1 text-[10px] font-mono font-bold text-[#00f0ff] uppercase tracking-wider">
            TRACK SELECTOR
          </div>
        )}

        <div className="p-2 space-y-1 border-b border-[#202c40]/60">
          {TRACKS.filter((t) => t.id !== "hub").map((track) => {
            const isTrackActive = pathname === track.path;
            return (
              <div
                key={track.id}
                className="relative group"
                onMouseEnter={() => setHoveredTooltip(track.id)}
                onMouseLeave={() => setHoveredTooltip(null)}
              >
                <Link
                  href={track.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                    isTrackActive
                      ? "bg-[#0e1420] text-[#00ff9d] border border-[#00ff9d]/40 font-bold"
                      : "text-[#8b949e] hover:bg-[#0e1420]/60 hover:text-[#f0f6fc] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="text-xs">{track.icon}</span>
                    {!isCollapsed && <span className="truncate">{track.name}</span>}
                  </div>
                  {!isCollapsed && track.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                        isTrackActive
                          ? "bg-[#00ff9d]/20 text-[#00ff9d]"
                          : "bg-[#0e1420] text-[#8b949e]"
                      }`}
                    >
                      {track.badge}
                    </span>
                  )}
                </Link>

                {/* Collapsed Tooltip */}
                {isCollapsed && hoveredTooltip === track.id && (
                  <div className="hidden lg:block absolute left-16 top-1/2 -translate-y-1/2 z-50 px-3 py-1.5 bg-[#0e1420] border border-[#00f0ff]/40 text-[#f0f6fc] text-xs font-mono rounded-lg shadow-2xl whitespace-nowrap pointer-events-none">
                    <span className="text-[#00f0ff] font-bold">{track.name}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Track Active Module Navigation Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-2 custom-scrollbar">
          {!isCollapsed && (
            <div className="px-3 pt-2 pb-1 text-[10px] font-mono font-bold text-[#8b949e] uppercase tracking-wider flex justify-between items-center">
              <span>{TRACKS.find((t) => t.path === pathname)?.name || "MODULES"}</span>
              <span className="text-[#00f0ff] text-[9px]">{activeNavItems.length} ITEMS</span>
            </div>
          )}

          {activeNavItems.map((item) => {
            const isActive = activeId === item.id;
            return (
              <div
                key={item.id}
                className="relative group"
                onMouseEnter={() => setHoveredTooltip(item.id)}
                onMouseLeave={() => setHoveredTooltip(null)}
              >
                <button
                  onClick={() => scrollTo(item.id, item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-xl text-xs font-mono transition-all relative ${
                    isActive
                      ? "bg-[#141c2c] text-[#00f0ff] border border-[#00f0ff]/40 font-bold shadow-[0_0_12px_rgba(0,240,255,0.15)]"
                      : "text-[#8b949e] hover:bg-[#0e1420] hover:text-[#f0f6fc] border border-transparent"
                  }`}
                >
                  {/* Glowing Active Indicator Line */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#00f0ff] rounded-r shadow-[0_0_8px_#00f0ff]" />
                  )}

                  {/* Icon */}
                  <span className="text-xs flex-shrink-0">{item.icon}</span>

                  {/* Expanded Mode: Module Number & Label */}
                  {!isCollapsed && (
                    <div className="flex items-center justify-between w-full overflow-hidden text-left">
                      <span className="truncate">{item.label}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                          isActive
                            ? "bg-[#00f0ff]/20 text-[#00f0ff]"
                            : "bg-[#0e1420] text-[#8b949e]"
                        }`}
                      >
                        #{item.num}
                      </span>
                    </div>
                  )}
                </button>

                {/* Collapsed Tooltip */}
                {isCollapsed && hoveredTooltip === item.id && (
                  <div className="hidden lg:block absolute left-16 top-1/2 -translate-y-1/2 z-50 px-3 py-1.5 bg-[#0e1420] border border-[#00f0ff]/40 text-[#f0f6fc] text-xs font-mono rounded-lg shadow-2xl whitespace-nowrap pointer-events-none">
                    <span className="text-[#00f0ff] font-bold">#{item.num}</span> {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Area */}
        <div className="p-3 border-t border-[#202c40] bg-[#0e1420]/80 text-center">
          {!isCollapsed ? (
            <div className="flex items-center justify-between text-[10px] font-mono text-[#8b949e]">
              <span className="text-[#00f0ff]">Next.js 16.3</span>
              <span className="text-[#00ff9d] flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] animate-pulse" /> RUNNING
              </span>
            </div>
          ) : (
            <div className="w-2 h-2 mx-auto rounded-full bg-[#00ff9d] animate-pulse" title="Engine Active" />
          )}
        </div>
      </aside>
    </>
  );
}
