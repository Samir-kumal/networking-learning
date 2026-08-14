import type { NetworkingTone } from "./NetworkingTypes";

interface NetworkingMetricProps {
  label: React.ReactNode;
  value: React.ReactNode;
  detail?: React.ReactNode;
  tone?: NetworkingTone;
  className?: string;
}

const TONE_STYLES: Record<NetworkingTone, string> = {
  cyan: "border-[color:var(--networking-tone-border)] bg-[color:var(--networking-tone-surface)]",
  amber: "border-[color:var(--networking-tone-border)] bg-[color:var(--networking-tone-surface)]",
  violet: "border-[color:var(--networking-tone-border)] bg-[color:var(--networking-tone-surface)]",
  lime: "border-[color:var(--networking-tone-border)] bg-[color:var(--networking-tone-surface)]",
};

export default function NetworkingMetric({
  label,
  value,
  detail,
  tone = "cyan",
  className = "",
}: NetworkingMetricProps) {
  return (
    <article
      data-networking-metric="true"
      data-tone={tone}
      className={`networking-surface rounded-xl border p-4 ${TONE_STYLES[tone]} ${className}`}
    >
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-[color:var(--networking-tone)]">{value}</div>
      {detail && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</div>}
    </article>
  );
}
