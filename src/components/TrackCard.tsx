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

/**
 * A whole-card link to a learning track. Flat surface, one clear hierarchy:
 * level and size, title, description, stack, then the call to action.
 */
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
    <Link
      href={href}
      className="group flex h-full flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-500"
    >
      <div className="flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${accentClass}`} />
          {difficulty}
        </span>
        <span>{moduleCount} modules</span>
      </div>

      <div className="flex-1 space-y-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
          <span aria-hidden="true" className="text-base">
            {icon}
          </span>
          {name}
        </h3>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
      </div>

      <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{techStack.join(" · ")}</p>

      <div className="flex items-center justify-end gap-1.5 border-t border-slate-100 pt-3 text-sm font-medium text-indigo-600 dark:border-slate-700 dark:text-indigo-400">
        Open track
        <svg
          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 5 7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
