import type { NetworkingPanelVariant } from "./NetworkingTypes";

interface NetworkingPanelProps {
  variant?: NetworkingPanelVariant;
  className?: string;
  children: React.ReactNode;
}

const PANEL_STYLES: Record<NetworkingPanelVariant, string> = {
  default:
    "rounded-2xl border border-slate-200 bg-white p-5 text-slate-700 card-shadow dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 sm:p-6",
  console:
    "rounded-2xl border border-slate-800 bg-slate-950 p-5 text-slate-100 shadow-inner sm:p-6",
  muted:
    "rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400 sm:p-6",
};

export default function NetworkingPanel({
  variant = "default",
  className = "",
  children,
}: NetworkingPanelProps) {
  return (
    <div data-networking-panel={variant} className={`${PANEL_STYLES[variant]} ${className}`}>
      {children}
    </div>
  );
}
