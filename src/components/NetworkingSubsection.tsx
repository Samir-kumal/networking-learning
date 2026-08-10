interface NetworkingSubsectionProps {
  id: string;
  label: string;
  title: string;
  description: string;
  moduleCount: number;
  children: React.ReactNode;
}

export default function NetworkingSubsection({
  id,
  label,
  title,
  description,
  moduleCount,
  children,
}: NetworkingSubsectionProps) {
  const headingId = `${id}-heading`;

  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-24 space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-white p-5 card-shadow dark:border-indigo-800 dark:bg-slate-800 sm:p-6">
        <div className="absolute inset-x-0 top-0 h-1 bg-indigo-500 dark:bg-indigo-400" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                {label}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
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
      </div>

      <div className="space-y-12">{children}</div>
    </section>
  );
}
