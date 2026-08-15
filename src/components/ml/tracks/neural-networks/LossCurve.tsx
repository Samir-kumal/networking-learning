export interface LossCurveProps {
  /** Loss values in chronological (training-step) order. */
  history: number[];
  className?: string;
}

const WIDTH = 420;
const HEIGHT = 120;
const MARGIN = 10;

/** A minimal SVG polyline of loss vs. training step, auto-scaled to the visible history. */
export function LossCurve({ history, className }: LossCurveProps) {
  if (history.length < 2) {
    return (
      <div
        className={`flex h-[120px] items-center justify-center text-[12px] text-slate-400 dark:text-slate-500 ${className ?? ""}`}
      >
        Press Train to see the loss curve.
      </div>
    );
  }

  const maxLoss = Math.max(...history, 1e-6);
  const points = history
    .map((loss, i) => {
      const x = MARGIN + (i / (history.length - 1)) * (WIDTH - 2 * MARGIN);
      const y = HEIGHT - MARGIN - (loss / maxLoss) * (HEIGHT - 2 * MARGIN);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={`h-auto w-full ${className ?? ""}`} role="img" aria-label="Loss curve">
      <line x1={MARGIN} y1={HEIGHT - MARGIN} x2={WIDTH - MARGIN} y2={HEIGHT - MARGIN} className="stroke-slate-200 dark:stroke-slate-700" />
      <polyline points={points} fill="none" stroke="#4f46e5" strokeWidth={2} />
      <text x={MARGIN} y={14} className="fill-slate-400 text-[10px] dark:fill-slate-500">
        loss ≈ {history[history.length - 1].toFixed(4)} (max shown {maxLoss.toFixed(4)})
      </text>
    </svg>
  );
}
