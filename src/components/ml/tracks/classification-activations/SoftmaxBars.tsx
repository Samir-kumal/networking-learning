"use client";

export interface SoftmaxBarsProps {
  probs: number[];
  labels: string[];
}

const COLORS = ["#4f46e5", "#059669", "#dc2626"];

/**
 * Small resize-safe SVG bar chart for the 3-logit softmax mini-demo (Chapter 7,
 * activation-functions section). Colocated here because none of the shared
 * primitives (FunctionPlot/VectorCanvas/MatrixGrid) render an arbitrary bar chart.
 */
export function SoftmaxBars({ probs, labels }: SoftmaxBarsProps) {
  const width = 320;
  const height = 170;
  const barWidth = 64;
  const gap = 36;
  const baseline = height - 26;
  const maxBarHeight = baseline - 20;
  const totalWidth = probs.length * barWidth + (probs.length - 1) * gap;
  const startX = (width - totalWidth) / 2;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-sm"
      role="img"
      aria-label="Softmax output probabilities bar chart"
    >
      <line
        x1={12}
        x2={width - 12}
        y1={baseline}
        y2={baseline}
        className="stroke-slate-300 dark:stroke-slate-600"
        strokeWidth={1}
      />
      {probs.map((p, i) => {
        const barHeight = Math.max(0, p) * maxBarHeight;
        const x = startX + i * (barWidth + gap);
        const y = baseline - barHeight;
        return (
          <g key={labels[i]}>
            <rect x={x} y={y} width={barWidth} height={barHeight} fill={COLORS[i % COLORS.length]} rx={3} />
            <text
              x={x + barWidth / 2}
              y={y - 6}
              textAnchor="middle"
              className="fill-slate-600 text-[11px] font-mono dark:fill-slate-300"
            >
              {p.toFixed(3)}
            </text>
            <text
              x={x + barWidth / 2}
              y={baseline + 16}
              textAnchor="middle"
              className="fill-slate-500 text-[11px] dark:fill-slate-400"
            >
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
