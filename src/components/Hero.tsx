export default function Hero() {
  return (
    <section className="relative py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
      {/* Decorative background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#58a6ff]/10 blur-3xl rounded-full pointer-events-none -z-10" />

      {/* Pill Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#161b22] border border-[#30363d] text-xs font-mono text-[#8b949e] mb-6">
        <span className="w-2 h-2 rounded-full bg-[#7ee787] animate-pulse" />
        Interactive Subnetting & Network Architecture Guide
      </div>

      {/* Hero Title */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 text-[#e6edf3]">
        <span className="bg-gradient-to-r from-[#58a6ff] via-[#7ee787] to-[#bc8cff] bg-clip-text text-transparent">
          Mastering Subnets
        </span>
      </h1>

      {/* Hero Subtitle */}
      <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#8b949e] leading-relaxed mb-8">
        From binary bitwise operations and CIDR calculations to VLSM, VLAN isolation, cloud VPC design, and firewall rules—master IP networking through interactive visualizations and real-time drills.
      </p>

      {/* Feature Pills */}
      <div className="flex flex-wrap justify-center gap-2 mb-10 text-xs font-mono text-[#8b949e]">
        <span className="px-2.5 py-1 rounded-md bg-[#1c2333] border border-[#30363d]">IPv4 & IPv6</span>
        <span className="px-2.5 py-1 rounded-md bg-[#1c2333] border border-[#30363d]">Bitwise AND</span>
        <span className="px-2.5 py-1 rounded-md bg-[#1c2333] border border-[#30363d]">VLSM Tree</span>
        <span className="px-2.5 py-1 rounded-md bg-[#1c2333] border border-[#30363d]">AWS / Azure VPC</span>
        <span className="px-2.5 py-1 rounded-md bg-[#1c2333] border border-[#30363d]">Drill Generator</span>
      </div>

      {/* CTA Button */}
      <div className="flex justify-center">
        <a
          href="#basics"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#58a6ff] hover:bg-[#58a6ff]/90 text-[#0d1117] font-semibold text-sm transition-all shadow-lg shadow-[#58a6ff]/20 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>Start Learning</span>
          <span className="text-base font-mono">↓</span>
        </a>
      </div>
    </section>
  );
}
