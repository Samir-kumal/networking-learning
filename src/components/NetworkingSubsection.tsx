import type { NetworkingTone } from "@/components/networking/NetworkingTypes";

type StageTone = NetworkingTone;

const TONE_STYLES = {
  cyan: {
    border: "border-cyan-200/80 dark:border-cyan-900/60",
    rule: "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.5)]",
    badge: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800/80 dark:bg-cyan-950/60 dark:text-cyan-300",
    marker: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800/80 dark:bg-cyan-950/60 dark:text-cyan-300 shadow-[0_0_12px_-2px_rgba(8,145,178,0.15)]",
    signal: "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]",
    glyph: "⬡",
  },
  amber: {
    border: "border-amber-200/80 dark:border-amber-900/60",
    rule: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]",
    badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-300",
    marker: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-300 shadow-[0_0_12px_-2px_rgba(217,119,6,0.15)]",
    signal: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]",
    glyph: "◈",
  },
  violet: {
    border: "border-violet-200/80 dark:border-violet-900/60",
    rule: "bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.5)]",
    badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/80 dark:bg-violet-950/60 dark:text-violet-300",
    marker: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/80 dark:bg-violet-950/60 dark:text-violet-300 shadow-[0_0_12px_-2px_rgba(124,58,237,0.15)]",
    signal: "bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.6)]",
    glyph: "⌁",
  },
  lime: {
    border: "border-lime-200/80 dark:border-lime-900/60",
    rule: "bg-lime-400 shadow-[0_0_12px_rgba(163,230,53,0.5)]",
    badge: "border-lime-200 bg-lime-50 text-lime-700 dark:border-lime-800/80 dark:bg-lime-950/60 dark:text-lime-300",
    marker: "border-lime-200 bg-lime-50 text-lime-700 dark:border-lime-800/80 dark:bg-lime-950/60 dark:text-lime-300 shadow-[0_0_12px_-2px_rgba(101,163,13,0.15)]",
    signal: "bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.6)]",
    glyph: "✓",
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
  const stageIndex = Math.max(0, (parseInt(label.slice(0, 2), 10) || 1) - 1);

  return (
    <section id={id} data-tone={tone} aria-labelledby={headingId} className="scroll-mt-24 space-y-6">
      <div className={`relative overflow-hidden rounded-2xl border bg-[color:var(--surface-l1)] p-5 card-shadow sm:p-6 ${styles.border}`}>
        <div className={`absolute inset-x-0 top-0 h-1 ${styles.rule}`} />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="flex min-w-0 gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border font-mono text-sm font-bold ${styles.marker}`}>
              <span aria-hidden="true">{styles.glyph}</span>
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
                <span
                  key={index}
                  className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                    index <= stageIndex ? styles.signal : "bg-[color:var(--border-l1)]"
                  }`}
                />
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
