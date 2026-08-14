import type { NetworkingPanelVariant } from "./NetworkingTypes";

interface NetworkingPanelProps {
  variant?: NetworkingPanelVariant;
  className?: string;
  children: React.ReactNode;
}

const PANEL_STYLES: Record<NetworkingPanelVariant, string> = {
  default:
    "rounded-2xl border border-[#24445D] bg-[#102235] p-5 text-slate-100 card-shadow sm:p-6",
  console:
    "rounded-2xl border border-cyan-900/80 bg-[#08111F] p-5 text-slate-100 shadow-inner sm:p-6",
  muted:
    "rounded-2xl border border-[#24445D] bg-[#102235]/80 p-5 text-slate-300 sm:p-6",
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
