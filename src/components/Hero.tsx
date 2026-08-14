const PACKET_STEPS = [
  { code: "01", label: "CLIENT", detail: "origin" },
  { code: "02", label: "SUBNET", detail: "scope" },
  { code: "03", label: "ROUTER", detail: "next hop" },
  { code: "04", label: "SERVICE", detail: "destination" },
];

const HERO_STATS = [
  { value: "23", label: "interactive labs", accent: "text-cyan-300" },
  { value: "04", label: "learning stages", accent: "text-amber-300" },
  { value: "01", label: "prerequisite path", accent: "text-lime-300" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-slate-800 bg-[#08111f] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-signal-grid opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(103,232,249,0.15),transparent_28%),radial-gradient(circle_at_12%_85%,rgba(129,140,248,0.14),transparent_34%)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Networking Lab</span>
            <span className="text-slate-700">/</span>
            <span>Packet path briefing</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-lime-300">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-300 animate-soft-pulse" />
              Online
            </span>
            <span className="hidden sm:inline">IPv4 → IPv6 → Cloud</span>
          </div>
        </div>

        <div className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(19rem,0.95fr)] lg:items-center lg:gap-16 lg:py-14">
          <div className="space-y-7">
            <div className="space-y-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-300">
                Learn by tracing / build real instincts
              </p>
              <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.04] tracking-[-0.04em] text-white sm:text-6xl">
                Read the path a packet{" "}
                <span className="text-cyan-300">takes.</span>
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
                Build a working mental model from address space to traffic decisions.
                Practice subnetting, forwarding, policy, wireless, and diagnosis in the
                same order a real network reveals them.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#basics"
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-bold text-[#08111f] transition hover:bg-cyan-200 hover:shadow-[0_0_24px_rgba(103,232,249,0.2)]"
              >
                Start with foundations
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" />
                </svg>
              </a>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">
                23 modules / 4 stages
              </span>
            </div>

            <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-400">
              {["IPv4", "CIDR", "Routing", "Wi-Fi", "Containers"].map((tag) => (
                <span key={tag} className="rounded border border-slate-700 bg-slate-950/50 px-2.5 py-1.5">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] sm:p-5">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Live topology</p>
                <h2 className="mt-1 text-sm font-semibold text-slate-100">Packet path</h2>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-lime-400/30 bg-lime-400/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-lime-300">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-300 animate-soft-pulse" />
                Online / 23 labs
              </span>
            </div>

            <div className="space-y-3">
              {PACKET_STEPS.map((step, index) => (
                <div key={step.code} className="flex items-center gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-800 bg-[#102235] px-3 py-3">
                    <span className="font-mono text-[10px] text-cyan-300">{step.code}</span>
                    <span className="font-mono text-xs font-semibold tracking-[0.12em] text-slate-100">{step.label}</span>
                    <span className="ml-auto font-mono text-[10px] text-slate-500">{step.detail}</span>
                  </div>
                  {index < PACKET_STEPS.length - 1 && (
                    <span className="font-mono text-sm text-cyan-300/70" aria-hidden="true">→</span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-800 pt-4 font-mono text-[10px] uppercase tracking-[0.12em]">
              <div>
                <span className="text-slate-600">Focus</span>
                <p className="mt-1 text-slate-300">Scope → decision</p>
              </div>
              <div className="text-right">
                <span className="text-slate-600">Next signal</span>
                <p className="mt-1 text-cyan-300">CIDR /24</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-slate-800 pt-5">
          {HERO_STATS.map((stat, index) => (
            <div
              key={stat.label}
              className={`px-3 ${index > 0 ? "border-l border-slate-800" : ""} sm:px-5`}
            >
              <p className={`font-mono text-2xl font-semibold tracking-tight sm:text-3xl ${stat.accent}`}>{stat.value}</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500 sm:text-[10px]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
