import { useId } from "react";
import type { NetworkingTone } from "./NetworkingTypes";

interface NetworkingExampleProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  tone?: NetworkingTone;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

const TONE_STYLES: Record<NetworkingTone, string> = {
  cyan: "border-[color:var(--networking-tone-border)] bg-[color:var(--networking-tone-surface)]",
  amber: "border-[color:var(--networking-tone-border)] bg-[color:var(--networking-tone-surface)]",
  violet: "border-[color:var(--networking-tone-border)] bg-[color:var(--networking-tone-surface)]",
  lime: "border-[color:var(--networking-tone-border)] bg-[color:var(--networking-tone-surface)]",
};

export default function NetworkingExample({
  title,
  description,
  tone,
  footer,
  className = "",
  children,
}: NetworkingExampleProps) {
  const headingId = useId();
  const toneStyles = tone ? TONE_STYLES[tone] : "";
  const classes = [
    "networking-surface overflow-hidden rounded-2xl border p-5 card-shadow sm:p-6",
    toneStyles,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section data-networking-example="true" data-tone={tone} aria-labelledby={headingId} className={classes}>
      <div className="mb-4 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--networking-tone)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--networking-tone)]" aria-hidden="true" />
        SIGNAL / WORKED EXAMPLE
      </div>
      <h3 id={headingId} className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      {description && (
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
      )}
      <div className="mt-5">{children}</div>
      {footer && (
        <div className="mt-5 border-t border-slate-200/80 pt-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
          {footer}
        </div>
      )}
    </section>
  );
}
