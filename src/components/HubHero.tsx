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
  { name: "Subnet Calculator",  href: "/networking#calculator", tag: "Networking",   color: "bg-indigo-400/10 text-indigo-200 border-indigo-400/30" },
  { name: "AWS VPC Planner",    href: "/aws#aws-vpc",           tag: "AWS",          color: "bg-amber-400/10 text-amber-200 border-amber-400/30" },
  { name: "IAM Simulator",      href: "/aws#aws-iam",           tag: "AWS",          color: "bg-amber-400/10 text-amber-200 border-amber-400/30" },
  { name: "Trivy Scanner",      href: "/security#sec-scanners", tag: "Security",     color: "bg-rose-400/10 text-rose-200 border-rose-400/30" },
  { name: "Git Branching Sim",  href: "/git-ops#git-branching", tag: "GitOps",       color: "bg-violet-400/10 text-violet-200 border-violet-400/30" },
  { name: "Compose Generator",  href: "/docker-k8s#k8s-compose",tag: "Docker",       color: "bg-sky-400/10 text-sky-200 border-sky-400/30" },
  { name: "CIDR Visualizer",    href: "/networking#cidr",       tag: "Networking",   color: "bg-indigo-400/10 text-indigo-200 border-indigo-400/30" },
  { name: "K8s Architecture",   href: "/docker-k8s#k8s-cluster",tag: "Kubernetes",   color: "bg-sky-400/10 text-sky-200 border-sky-400/30" },
  { name: "OWASP Top 10",       href: "/security#sec-owasp",    tag: "Security",     color: "bg-rose-400/10 text-rose-200 border-rose-400/30" },
  { name: "GitHub Actions CI",  href: "/git-ops#git-actions",   tag: "GitOps",       color: "bg-violet-400/10 text-violet-200 border-violet-400/30" },
  { name: "Wireshark PCAP",     href: "/networking#packets",    tag: "Networking",   color: "bg-indigo-400/10 text-indigo-200 border-indigo-400/30" },
  { name: "Secrets & Vault",    href: "/security#sec-vault",    tag: "Security",     color: "bg-rose-400/10 text-rose-200 border-rose-400/30" },
];

const STATS = [
  { value: "71",   label: "Interactive Modules", accent: "text-cyan-300" },
  { value: "5",    label: "Learning Tracks",     accent: "text-lime-300" },
  { value: "23",   label: "Networking Labs",     accent: "text-amber-300" },
  { value: "100%", label: "Browser-Native",      accent: "text-sky-300" },
];

const HERO_STEPS = [
  { code: "01", name: "Commit", detail: "Branches + CI/CD", dot: "bg-violet-300", ring: "ring-violet-300/20" },
  { code: "02", name: "Secure", detail: "Scans + policy gates", dot: "bg-rose-300", ring: "ring-rose-300/20" },
  { code: "03", name: "Package", detail: "Docker + Helm", dot: "bg-emerald-300", ring: "ring-emerald-300/20" },
  { code: "04", name: "Orchestrate", detail: "AWS + Kubernetes", dot: "bg-amber-300", ring: "ring-amber-300/20" },
  { code: "05", name: "Route", detail: "VPC + production subnet", dot: "bg-cyan-300", ring: "ring-cyan-300/20" },
];

export default function HubHero() {
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const results = normalizedQuery
    ? QUICK_TOOLS.filter((t) =>
        t.name.toLowerCase().includes(normalizedQuery) ||
        t.tag.toLowerCase().includes(normalizedQuery)
      )
    : [];

  return (
    <section className="relative overflow-hidden border-b border-slate-800 bg-[#08111f] text-slate-100">
      <div className="absolute inset-0 bg-signal-grid opacity-70 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(103,232,249,0.12),transparent_32%),radial-gradient(circle_at_18%_80%,rgba(129,140,248,0.12),transparent_35%)] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-10 lg:py-12">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Engineering Lab</span>
            <span className="text-slate-700">/</span>
            <span>Home / Briefing</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-lime-300">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-300 animate-soft-pulse" />
              Online
            </span>
            <span className="hidden sm:inline">71 Modules</span>
            <span className="hidden sm:inline text-slate-700">·</span>
            <span className="hidden sm:inline">Browser-Native</span>
          </div>
        </div>

        <div className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] lg:items-center lg:gap-16 lg:py-14">
          <div className="space-y-7">
            <div className="space-y-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-300">
                Learn by doing / build real instincts
              </p>
              <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.04] tracking-[-0.04em] text-white sm:text-6xl">
                Build the instincts behind{" "}
                <span className="text-cyan-300">production systems.</span>
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
                Interactive labs for the systems between a packet, a commit, and a production rollout.
                Practice Networking, AWS, Security, GitOps, and Containers directly in the browser.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/networking"
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-bold text-[#08111f] transition hover:bg-cyan-200 hover:shadow-[0_0_24px_rgba(103,232,249,0.2)]"
              >
                Start with Networking
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" />
                </svg>
              </Link>
              <a
                href="#tracks"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-white/5"
              >
                View all tracks
              </a>
            </div>

            <div className="relative max-w-2xl">
              <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 shadow-[0_14px_35px_rgba(0,0,0,0.18)] transition focus-within:border-cyan-300/70 focus-within:ring-2 focus-within:ring-cyan-300/20">
                <span className="font-mono text-sm font-bold text-cyan-300" aria-hidden="true">/</span>
                <input
                  type="text"
                  placeholder="Find a lab or tool…"
                  aria-label="Search modules, tools, and labs"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent font-mono text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
                />
                <span className="hidden rounded border border-slate-700 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 sm:inline">FIND</span>
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="text-slate-500 transition hover:text-slate-200"
                    aria-label="Clear search"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {query.trim() && (
                <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-slate-700 bg-[#102235] shadow-2xl divide-y divide-slate-800">
                  {results.map((tool) => (
                    <Link
                      key={tool.name}
                      href={tool.href}
                      onClick={() => setQuery("")}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-white/5 group"
                    >
                      <span className="font-medium text-slate-200 transition group-hover:text-cyan-200">{tool.name}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tool.color}`}>
                        {tool.tag}
                      </span>
                    </Link>
                  ))}
                  {results.length === 0 && (
                    <div className="px-4 py-3 font-mono text-xs text-slate-500">
                      No signal for &ldquo;{query}&rdquo;
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_TOOLS.slice(0, 8).map((tool) => (
                <Link
                  key={tool.name}
                  href={tool.href}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-px hover:bg-white/10 active:scale-95 ${tool.color}`}
                >
                  {tool.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#0d1b2a]/90 p-5 shadow-[0_22px_60px_rgba(0,0,0,0.22)] sm:p-6">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-cyan-300/10 blur-3xl" />
            <div className="relative flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">Route trace</p>
                <p className="mt-1 text-sm font-semibold text-white">From commit to subnet</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-lime-300/20 bg-lime-300/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-lime-300">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-300 animate-soft-pulse" />
                Live path
              </span>
            </div>

            <div className="relative mt-6 pl-8">
              <div className="absolute bottom-2 left-[5px] top-2 w-px bg-gradient-to-b from-violet-300/70 via-cyan-300/60 to-lime-300/70" />
              <ol className="space-y-5">
                {HERO_STEPS.map((step, index) => (
                  <li key={step.code} className="relative">
                    <span className={`absolute -left-8 top-1 flex h-3 w-3 items-center justify-center rounded-full bg-[#0d1b2a] ring-4 ${step.ring}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${step.dot} ${index === HERO_STEPS.length - 1 ? "animate-soft-pulse" : ""}`} />
                    </span>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-100">{step.name}</span>
                      <span className="font-mono text-[10px] tracking-widest text-slate-600">{step.code}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{step.detail}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
              <span>5 linked domains</span>
              <span className="text-cyan-300">Trace ready</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5 border-t border-slate-800 pt-5 sm:grid-cols-4 sm:gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="space-y-1">
              <div className={`font-mono text-2xl font-bold tracking-tight ${s.accent}`}>{s.value}</div>
              <div className="text-xs font-medium text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
