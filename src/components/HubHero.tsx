"use client";

import { useState } from "react";
import Link from "next/link";

interface QuickTool {
  name: string;
  href: string;
  tag: string;
  color: string;
}

const QUICK_TOOLS: QuickTool[] = [
  { name: "Subnet Calculator",  href: "/networking#calculator", tag: "Networking",   color: "bg-indigo-50 text-indigo-700 border-indigo-200"   },
  { name: "AWS VPC Planner",    href: "/aws#aws-vpc",           tag: "AWS",          color: "bg-amber-50 text-amber-700 border-amber-200"       },
  { name: "IAM Simulator",      href: "/aws#aws-iam",           tag: "AWS",          color: "bg-amber-50 text-amber-700 border-amber-200"       },
  { name: "Trivy Scanner",      href: "/security#sec-scanners", tag: "Security",     color: "bg-rose-50 text-rose-700 border-rose-200"         },
  { name: "Git Branching Sim",  href: "/git-ops#git-branching", tag: "GitOps",       color: "bg-violet-50 text-violet-700 border-violet-200"   },
  { name: "Compose Generator",  href: "/docker-k8s#k8s-compose",tag: "Docker",       color: "bg-sky-50 text-sky-700 border-sky-200"            },
  { name: "CIDR Visualizer",    href: "/networking#cidr",       tag: "Networking",   color: "bg-indigo-50 text-indigo-700 border-indigo-200"   },
  { name: "K8s Architecture",   href: "/docker-k8s#k8s-cluster",tag: "Kubernetes",   color: "bg-sky-50 text-sky-700 border-sky-200"            },
  { name: "OWASP Top 10",       href: "/security#sec-owasp",    tag: "Security",     color: "bg-rose-50 text-rose-700 border-rose-200"         },
  { name: "GitHub Actions CI",  href: "/git-ops#git-actions",   tag: "GitOps",       color: "bg-violet-50 text-violet-700 border-violet-200"   },
  { name: "Wireshark PCAP",     href: "/networking#packets",    tag: "Networking",   color: "bg-indigo-50 text-indigo-700 border-indigo-200"   },
  { name: "Secrets & Vault",    href: "/security#sec-vault",    tag: "Security",     color: "bg-rose-50 text-rose-700 border-rose-200"         },
];

const STATS = [
  { value: "61",  label: "Interactive Modules", accent: "text-indigo-600" },
  { value: "5",   label: "Learning Tracks",     accent: "text-emerald-600"},
  { value: "23",  label: "Networking Labs",      accent: "text-amber-600"  },
  { value: "100%",label: "Browser-Native",       accent: "text-sky-600"    },
];

export default function HubHero() {
  const [query, setQuery] = useState("");

  const results = query.trim()
    ? QUICK_TOOLS.filter((t) =>
        t.name.toLowerCase().includes(query.toLowerCase()) ||
        t.tag.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-white">
      {/* Subtle dot-grid background */}
      <div className="absolute inset-0 bg-dot-grid opacity-40 pointer-events-none" />

      {/* Soft radial gradient for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/60 via-white to-white pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-6 py-16 sm:py-20 space-y-10">

        {/* ── Badge ── */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-soft-pulse" />
          Live · All 61 modules running on Docker
        </div>

        {/* ── Headline ── */}
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight">
            DevOps, Cloud &amp;{" "}
            <span className="text-indigo-600">Security</span>{" "}
            Engineering Hub
          </h1>
          <p className="text-lg text-slate-500 leading-relaxed max-w-2xl">
            A comprehensive interactive learning portal covering Networking, AWS Architecture,
            Cybersecurity, GitOps, and Container Engineering — built for engineers who learn by doing.
          </p>
        </div>

        {/* ── Command Search ── */}
        <div className="relative max-w-xl">
          <div className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-indigo-400 transition-all">
            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search modules, tools, labs…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-slate-400 hover:text-slate-600 transition"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Dropdown results */}
          {results.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden divide-y divide-slate-100">
              {results.map((tool) => (
                <Link
                  key={tool.name}
                  href={tool.href}
                  onClick={() => setQuery("")}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 transition text-sm group"
                >
                  <span className="font-medium text-slate-800 group-hover:text-indigo-700 transition">
                    {tool.name}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tool.color}`}>
                    {tool.tag}
                  </span>
                </Link>
              ))}
              {results.length === 0 && query && (
                <div className="px-4 py-3 text-sm text-slate-400">No results for &ldquo;{query}&rdquo;</div>
              )}
            </div>
          )}
        </div>

        {/* ── Quick-launch pill buttons ── */}
        <div className="flex flex-wrap gap-2">
          {QUICK_TOOLS.slice(0, 8).map((tool) => (
            <Link
              key={tool.name}
              href={tool.href}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition hover:shadow-sm hover:-translate-y-px active:scale-95 ${tool.color}`}
            >
              {tool.name}
            </Link>
          ))}
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          {STATS.map((s) => (
            <div key={s.label} className="space-y-1">
              <div className={`text-2xl font-extrabold tracking-tight ${s.accent}`}>{s.value}</div>
              <div className="text-xs text-slate-500 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
