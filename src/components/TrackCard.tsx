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
  if (d.includes("Advanced"))    return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700";
  if (d.includes("Intermediate"))return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700";
  return                                  "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700";
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
    <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-5 card-shadow transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:card-shadow-hover dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600">
      <div className={`absolute inset-y-0 left-0 w-1 ${accentClass} opacity-80`} />

      <div className="space-y-5 pl-1">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-xl transition-colors group-hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:group-hover:bg-slate-600">
            {icon}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${difficultyStyle(difficulty)}`}>
              {difficulty}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {moduleCount} Modules
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-[15px] font-semibold leading-snug text-slate-900 transition-colors group-hover:text-indigo-700 dark:text-slate-100 dark:group-hover:text-indigo-400">
            {name}
          </h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {techStack.map((tech) => (
            <span
              key={tech}
              className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pl-1 pt-4 dark:border-slate-700">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Ready to run
        </div>
        <Link
          href={href}
          className="group/btn inline-flex items-center gap-1.5 text-[13px] font-semibold text-indigo-600 transition-colors hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Open track
          <svg
            className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 5 7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
