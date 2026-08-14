import type { NetworkingPanelVariant } from "./NetworkingTypes";

interface NetworkingPanelProps {
  variant?: NetworkingPanelVariant;
  className?: string;
  children: React.ReactNode;
}

const PANEL_STYLES: Record<NetworkingPanelVariant, string> = {
  default:
    "rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 card-shadow sm:p-6 dark:border-[#24445D] dark:bg-[#102235] dark:text-slate-100",
  console:
    "rounded-2xl border border-cyan-900/80 bg-[#08111F] p-5 text-slate-100 shadow-inner sm:p-6",
  muted:
    "rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-700 sm:p-6 dark:border-[#24445D] dark:bg-[#102235]/80 dark:text-slate-300",
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
