"use client";

export interface BarChartBar {
  label: string;
  value: number;
  color?: string;
}

export interface BarChartProps {
  bars: BarChartBar[];
  /** Fixed max for the value axis; defaults to the largest bar value. */
  maxValue?: number;
  valueFormat?: (value: number) => string;
}

const VIEWBOX_WIDTH = 300;
const VIEWBOX_HEIGHT = 170;
const BOTTOM_MARGIN = 22;
const TOP_MARGIN = 18;

/**
 * A small responsive bar chart for discrete probability mass (PMF bars, prior/posterior
 * comparisons) — not covered by FunctionPlot/VectorCanvas/MatrixGrid, so it's a plain SVG
 * colocated with the probability-statistics chapter. Scales via its viewBox, so it stays
 * crisp and correctly proportioned at any container width (mobile included).
 */
export function BarChart({ bars, maxValue, valueFormat = (v) => v.toFixed(2) }: BarChartProps) {
  const max = maxValue ?? Math.max(...bars.map((b) => b.value), 1e-9);
  const plotHeight = VIEWBOX_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN;
  const slotWidth = VIEWBOX_WIDTH / bars.length;

  return (
    <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="w-full" role="img" aria-label="Bar chart">
      <line
        x1={0}
        x2={VIEWBOX_WIDTH}
        y1={VIEWBOX_HEIGHT - BOTTOM_MARGIN}
        y2={VIEWBOX_HEIGHT - BOTTOM_MARGIN}
        className="stroke-slate-200 dark:stroke-slate-700"
        strokeWidth={1}
      />
      {bars.map((bar, i) => {
        const barHeight = max > 0 ? Math.max((bar.value / max) * plotHeight, 0) : 0;
        const x = i * slotWidth + slotWidth * 0.18;
        const w = slotWidth * 0.64;
        const y = VIEWBOX_HEIGHT - BOTTOM_MARGIN - barHeight;
        return (
          <g key={bar.label}>
            <rect x={x} y={y} width={w} height={barHeight} fill={bar.color ?? "#4f46e5"} rx={2} />
            <text
              x={x + w / 2}
              y={y - 5}
              textAnchor="middle"
              className="fill-slate-500 text-[9px] dark:fill-slate-400"
            >
              {valueFormat(bar.value)}
            </text>
            <text
              x={x + w / 2}
              y={VIEWBOX_HEIGHT - 7}
              textAnchor="middle"
              className="fill-slate-600 text-[10px] font-medium dark:fill-slate-300"
            >
              {bar.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
