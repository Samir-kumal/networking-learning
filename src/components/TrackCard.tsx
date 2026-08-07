import Link from "next/link";

export interface TrackCardProps {
  id: string;
  name: string;
  description: string;
  icon: string | React.ReactNode;
  href: string;
  difficulty: string;
  moduleCount: number;
  techStack: string[];
  accentColor?: string;
}

export default function TrackCard({
  name,
  description,
  icon,
  href,
  difficulty,
  moduleCount,
  techStack,
  accentColor = "#00f0ff",
}: TrackCardProps) {
  return (
    <div className="group relative flex flex-col justify-between rounded-2xl bg-[#0e1420] border border-[#202c40] p-6 sm:p-7 transition-all duration-300 hover:border-[#00f0ff]/50 shadow-xl hover:shadow-[0_0_25px_rgba(0,240,255,0.15)] hover:-translate-y-1 overflow-hidden">
      {/* Subtle Glowing Top Accent Border */}
      <div
        className="absolute top-0 left-0 right-0 h-1 transition-all group-hover:shadow-[0_0_10px_#00f0ff]"
        style={{ backgroundColor: accentColor }}
      />

      {/* Ambient Radial Hover Glow */}
      <div
        className="absolute -right-16 -bottom-16 w-48 h-48 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"
        style={{ backgroundColor: accentColor }}
      />

      <div>
        {/* Top Header Row: Icon, Badges */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div
            className="w-12 h-12 rounded-xl bg-[#141c2c] border border-[#202c40] flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 group-hover:border-[#00f0ff]/40 transition-all"
            style={{ color: accentColor }}
          >
            {icon}
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="px-2.5 py-1 rounded-md bg-[#141c2c] text-[#f0f6fc] border border-[#202c40] font-semibold">
              {difficulty}
            </span>
            <span
              className="px-2.5 py-1 rounded-md font-bold text-[#0d1117]"
              style={{ backgroundColor: accentColor }}
            >
              {moduleCount} Modules
            </span>
          </div>
        </div>

        {/* Track Title */}
        <h3 className="text-xl font-bold font-mono text-[#f0f6fc] group-hover:text-[#00f0ff] transition-colors mb-3">
          {name}
        </h3>

        {/* Track Description */}
        <p className="text-xs sm:text-sm text-[#8b949e] leading-relaxed mb-6">
          {description}
        </p>

        {/* Tech Stack Pills */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {techStack.map((tech) => (
            <span
              key={tech}
              className="px-2 py-0.5 rounded bg-[#141c2c] border border-[#202c40] text-[10px] font-mono text-[#8b949e] group-hover:text-[#f0f6fc] transition"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Footer Launch Action Button */}
      <div className="pt-4 border-t border-[#202c40] flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#8b949e]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] animate-pulse" />
          <span>Lab Ready</span>
        </div>

        <Link
          href={href}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold text-[#0d1117] transition-all shadow-md group-hover:scale-105"
          style={{ backgroundColor: accentColor }}
        >
          <span>Launch Track</span>
          <span className="text-sm font-extrabold">▶</span>
        </Link>
      </div>
    </div>
  );
}
