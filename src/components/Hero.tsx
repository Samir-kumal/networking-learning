export default function Hero() {
  return (
    <section className="relative rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-slate-50 dark:from-indigo-950/50 dark:via-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 card-shadow px-8 py-14 text-center overflow-hidden">
      {/* Soft radial background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 bg-indigo-100/60 dark:bg-indigo-500/20 blur-3xl rounded-full pointer-events-none -z-10" />

      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-6 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-soft-pulse" />
        Interactive Subnetting & Network Architecture Guide
      </div>

      {/* Title */}
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mb-4">
        Mastering{" "}
        <span className="text-indigo-600 dark:text-indigo-400">Subnets</span>
      </h1>

      {/* Subtitle */}
      <p className="max-w-2xl mx-auto text-base text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
        From binary bitwise operations and CIDR calculations to VLSM, VLAN isolation,
        cloud VPC design, and firewall rules — master IP networking through interactive
        visualisations and real-time drills.
      </p>

      {/* Feature tags */}
      <div className="flex flex-wrap justify-center gap-2 mb-10 text-[12px]">
        {["IPv4 & IPv6", "Bitwise AND", "VLSM Tree", "AWS / Azure VPC", "Drill Generator", "Wireshark PCAP"].map((tag) => (
          <span
            key={tag}
            className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* CTA */}
      <a
        href="#basics"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md hover:-translate-y-px active:scale-95"
      >
        Start Learning
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </a>
    </section>
  );
}
