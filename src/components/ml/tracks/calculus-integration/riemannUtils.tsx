import type { ReactNode } from "react";
import type { FunctionPlotScales } from "@/components/ml/primitives";

/**
 * Right Riemann sum approximation of ∫[a,b] fn(x) dx using n equal-width
 * subintervals, with each rectangle's height taken from the *right* endpoint
 * of its subinterval: width = (b-a)/n, sum = width * Σ_{i=1..n} fn(a + i*width).
 */
export function rightRiemannSum(fn: (x: number) => number, a: number, b: number, n: number): number {
  const width = (b - a) / n;
  let sum = 0;
  for (let i = 1; i <= n; i++) {
    sum += fn(a + i * width);
  }
  return sum * width;
}

/**
 * Renders the n right-Riemann-sum rectangles for fn over [a,b] as SVG <rect>s,
 * sharing a FunctionPlot's scales. Each rectangle spans one subinterval on the
 * x-axis, from y=0 up (or down, if fn is negative) to fn(right endpoint).
 */
export function riemannRectangles(
  fn: (x: number) => number,
  a: number,
  b: number,
  n: number,
  scales: FunctionPlotScales,
  options: { fill?: string; fillOpacity?: number; stroke?: string } = {},
): ReactNode {
  const { xScale, yScale } = scales;
  const { fill = "#6366f1", fillOpacity = 0.35, stroke = "#4338ca" } = options;
  const width = (b - a) / n;
  const y0 = yScale(0);
  const rects = [];
  for (let i = 1; i <= n; i++) {
    const xRight = a + i * width;
    const xLeft = xRight - width;
    const height = fn(xRight);
    const px0 = xScale(xLeft);
    const px1 = xScale(xRight);
    const py1 = yScale(height);
    rects.push(
      <rect
        key={i}
        x={Math.min(px0, px1)}
        y={Math.min(y0, py1)}
        width={Math.abs(px1 - px0)}
        height={Math.abs(y0 - py1)}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth={stroke === "none" ? 0 : 0.5}
      />,
    );
  }
  return <>{rects}</>;
}
