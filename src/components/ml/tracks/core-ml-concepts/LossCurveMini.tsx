"use client";

export interface LossCurveMiniProps {
  /** Loss value at each iteration, oldest first. */
  history: number[];
  className?: string;
}

/**
 * A minimal inline SVG polyline of loss vs. iteration — used by the animated
 * gradient-descent playgrounds (linear-regression, gradient-descent) instead of a
 * full FunctionPlot, since the x-axis here is "iteration count," not a continuous domain.
 */
export function LossCurveMini({ history, className }: LossCurveMiniProps) {
  const width = 160;
  const height = 56;

  if (history.length < 2) {
    return (
      <div
        className={`flex h-[56px] items-center justify-center rounded-md border border-dashed border-slate-200 text-center text-[11px] text-slate-400 dark:border-slate-700 dark:text-slate-500 ${className ?? ""}`}
      >
        Run gradient descent to see the loss curve
      </div>
    );
  }

  const maxLoss = Math.max(...history);
  const minLoss = Math.min(...history);
  const span = maxLoss - minLoss || 1;
  const points = history
    .map((loss, i) => {
      const x = (i / (history.length - 1)) * width;
      const y = height - ((loss - minLoss) / span) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[56px] w-full" preserveAspectRatio="none" role="img" aria-label="Loss vs. iteration">
        <polyline points={points} fill="none" stroke="#4f46e5" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
        <span>iter 0</span>
        <span>iter {history.length - 1}</span>
      </div>
    </div>
  );
}
