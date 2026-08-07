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
  accentClass?: string;
}

// Maps a semantic difficulty to a small badge style
function difficultyStyle(d: string): string {
  if (d.includes("Advanced"))    return "bg-rose-50 text-rose-700 border-rose-200";
  if (d.includes("Intermediate"))return "bg-amber-50 text-amber-700 border-amber-200";
  return                                  "bg-emerald-50 text-emerald-700 border-emerald-200";
}

export default function TrackCard({
  name,
  description,
  icon,
  href,
  difficulty,
  moduleCount,
  techStack,
  accentClass = "bg-indigo-600",
}: TrackCardProps) {
  return (
    <div className="group relative flex flex-col justify-between rounded-2xl bg-white border border-slate-200 p-6 transition-all duration-200 card-shadow hover:card-shadow-hover hover:-translate-y-0.5 hover:border-slate-300 overflow-hidden">

      {/* Thin top accent line — changes per track via accentClass */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accentClass} opacity-80`} />

      <div className="space-y-5">
        {/* Icon + badges row */}
        <div className="flex items-start justify-between gap-4">
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-slate-200 transition-colors">
            {icon}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${difficultyStyle(difficulty)}`}>
              {difficulty}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200">
              {moduleCount} Modules
            </span>
          </div>
        </div>

        {/* Title */}
        <div>
          <h3 className="text-[15px] font-semibold text-slate-900 leading-snug group-hover:text-indigo-700 transition-colors">
            {name}
          </h3>
          <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Tech stack chips */}
        <div className="flex flex-wrap gap-1.5">
          {techStack.map((tech) => (
            <span
              key={tech}
              className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Ready
        </div>
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors group/btn"
        >
          Open Track
          <svg
            className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
