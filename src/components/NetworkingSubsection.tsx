type StageTone = "cyan" | "amber" | "violet" | "lime";

const TONE_STYLES = {
  cyan: {
    border: "border-cyan-200 dark:border-cyan-900",
    rule: "bg-cyan-400",
    badge: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300",
    marker: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300",
    signal: "bg-cyan-400",
  },
  amber: {
    border: "border-amber-200 dark:border-amber-900",
    rule: "bg-amber-400",
    badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
    marker: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
    signal: "bg-amber-400",
  },
  violet: {
    border: "border-violet-200 dark:border-violet-900",
    rule: "bg-violet-400",
    badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300",
    marker: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300",
    signal: "bg-violet-400",
  },
  lime: {
    border: "border-lime-200 dark:border-lime-900",
    rule: "bg-lime-400",
    badge: "border-lime-200 bg-lime-50 text-lime-700 dark:border-lime-800 dark:bg-lime-950/50 dark:text-lime-300",
    marker: "border-lime-200 bg-lime-50 text-lime-700 dark:border-lime-800 dark:bg-lime-950/50 dark:text-lime-300",
    signal: "bg-lime-400",
  },
} as const;

interface NetworkingSubsectionProps {
  id: string;
  label: string;
  title: string;
  description: string;
  moduleCount: number;
  tone: StageTone;
  children: React.ReactNode;
}

export default function NetworkingSubsection({
  id,
  label,
  title,
  description,
  moduleCount,
  tone,
  children,
}: NetworkingSubsectionProps) {
  const headingId = `${id}-heading`;
  const styles = TONE_STYLES[tone];

  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-24 space-y-6">
      <div className={`relative overflow-hidden rounded-2xl border bg-white p-5 card-shadow dark:bg-slate-900 sm:p-6 ${styles.border}`}>
        <div className={`absolute inset-x-0 top-0 h-1 ${styles.rule}`} />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="flex min-w-0 gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border font-mono text-xs font-bold ${styles.marker}`}>
              <span aria-hidden="true">⌁</span>
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] ${styles.badge}`}>
                  {label}
                </span>
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                  {moduleCount} {moduleCount === 1 ? "Module" : "Modules"}
                </span>
              </div>
              <h2 id={headingId} className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                {title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-400 sm:text-base">
                {description}
              </p>
            </div>
          </div>

          <div className="hidden shrink-0 text-right sm:block">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Stage signal</p>
            <div className="mt-3 flex items-center gap-1" aria-hidden="true">
              {Array.from({ length: 4 }, (_, index) => (
                <span key={index} className={`h-1.5 w-6 rounded-full ${index === 0 ? styles.signal : "bg-slate-200 dark:bg-slate-700"}`} />
              ))}
            </div>
            <p className="mt-2 font-mono text-[10px] text-slate-500 dark:text-slate-400">{moduleCount} labs in scope</p>
          </div>
        </div>
      </div>

      <div className="space-y-12">{children}</div>
    </section>
  );
}
