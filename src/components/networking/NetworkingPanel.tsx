import type { NetworkingPanelVariant } from "./NetworkingTypes";

interface NetworkingPanelProps {
  variant?: NetworkingPanelVariant;
  className?: string;
  children: React.ReactNode;
}

const PANEL_STYLES: Record<NetworkingPanelVariant, string> = {
  default:
    "rounded-2xl border border-[color:var(--border-l1)] bg-[color:var(--surface-l1)] p-5 text-slate-900 card-shadow sm:p-6 dark:text-slate-100",
  console:
    "rounded-2xl border border-[color:var(--border-l3)] bg-[color:var(--surface-l3)] p-5 text-slate-100 shadow-inner sm:p-6",
  muted:
    "rounded-2xl border border-[color:var(--border-l2)] bg-[color:var(--surface-l2)] p-5 text-slate-700 sm:p-6 dark:text-slate-300",
};

export default function NetworkingPanel({
  variant = "default",
  className = "",
  children,
}: NetworkingPanelProps) {
  const classes = [PANEL_STYLES[variant], className].filter(Boolean).join(" ");

  return (
    <div data-networking-panel={variant} className={classes}>
      {children}
    </div>
  );
}
