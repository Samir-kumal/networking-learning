interface NetworkingModuleHeaderProps {
  anchor: string;
  icon: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  meta?: React.ReactNode;
}

export default function NetworkingModuleHeader({
  anchor,
  icon,
  title,
  description,
  meta,
}: NetworkingModuleHeaderProps) {
  return (
    <header data-networking-header="true" className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 card-shadow dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-300">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-600 dark:text-cyan-400">
              {anchor}
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              {title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-400 sm:text-base">
              {description}
            </p>
          </div>
        </div>
        {meta && (
          <div className="shrink-0 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 sm:text-right">
            {meta}
          </div>
        )}
      </div>
    </header>
  );
}
