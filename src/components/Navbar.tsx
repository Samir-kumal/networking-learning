"use client";

import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { id: "basics", label: "Basics" },
  { id: "binary", label: "Binary" },
  { id: "cidr", label: "CIDR" },
  { id: "vlsm", label: "VLSM" },
  { id: "vlans", label: "VLANs" },
  { id: "ipv6", label: "IPv6" },
  { id: "ips", label: "IP Types" },
  { id: "calculator", label: "Calculator" },
  { id: "supernetting", label: "Supernetting" },
  { id: "cloud", label: "Cloud VPC" },
  { id: "create", label: "Creation" },
  { id: "firewall", label: "Firewall" },
  { id: "troubleshooting", label: "Troubleshoot" },
  { id: "routing", label: "Routing" },
  { id: "security", label: "Security" },
  { id: "dhcp", label: "DHCP & IPAM" },
  { id: "packets", label: "Packets" },
  { id: "containers", label: "Containers" },
  { id: "diagnostics", label: "Diagnostics" },
  { id: "wireless", label: "Wireless" },
  { id: "practice", label: "Practice" },
  { id: "cheatsheet", label: "Cheatsheet" },
  { id: "quiz", label: "Quiz" },
];

export default function Navbar() {
  const [activeId, setActiveId] = useState<string>("basics");
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 120;
      for (let i = NAV_ITEMS.length - 1; i >= 0; i--) {
        const item = NAV_ITEMS[i];
        const el = document.getElementById(item.id);
        if (el && el.offsetTop <= scrollPos) {
          setActiveId(item.id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setIsMobileOpen(false);
    const el = document.getElementById(id);
    if (el) {
      const top = el.offsetTop - 70;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-50/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a
            href="#"
            className="flex items-center gap-2 font-bold text-lg text-slate-900 hover:text-indigo-600 transition-colors"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600/15 text-indigo-600 border border-indigo-200 text-sm font-mono">
              ⚡
            </span>
            <span className="tracking-tight">
              Subnet<span className="text-indigo-600">Lab</span>
            </span>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-2 max-w-[calc(100%-200px)]">
            {NAV_ITEMS.map((item) => {
              const isActive = activeId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-indigo-600/15 text-indigo-600 border border-indigo-200 font-semibold"
                      : "text-slate-500 hover:text-slate-900 hover:bg-white"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Hamburger Menu Toggle for Mobile */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              type="button"
              className="p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-white focus:outline-none cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden border-b border-slate-200 bg-white/95 backdrop-blur-lg px-4 pt-2 pb-4 space-y-1 max-h-[80vh] overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-between cursor-pointer ${
                  isActive
                    ? "bg-indigo-600/15 text-indigo-600 border border-indigo-200 font-semibold"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span>{item.label}</span>
                <span className="text-xs text-slate-500 font-mono">#{item.id}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
