"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { scaleLinear, type ScaleLinear } from "d3-scale";
import { line as d3Line, curveMonotoneX } from "d3-shape";

export interface FunctionPlotScales {
  xScale: ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
  innerWidth: number;
  innerHeight: number;
}

export interface FunctionPlotProps {
  fn: (x: number) => number;
  domain: [number, number];
  /** Fixed y-domain; auto-fit to the sampled curve (with 10% padding) when omitted. */
  range?: [number, number];
  resolution?: number;
  /** Render-prop so overlays (tangent lines, Riemann rectangles, markers) share the plot's scales. */
  overlays?: (scales: FunctionPlotScales) => ReactNode;
  onPointerX?: (x: number) => void;
  className?: string;
}

const MARGIN = { top: 16, right: 16, bottom: 28, left: 42 };

/** A resizable, axis-labeled 2D function plot (SVG + d3 scales, no d3 DOM manipulation). */
export function FunctionPlot({
  fn,
  domain,
  range,
  resolution = 200,
  overlays,
  onPointerX,
  className,
}: FunctionPlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 480, height: 312 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (!width) return;
      setSize({ width: Math.max(240, width), height: Math.max(200, Math.round(width * 0.65)) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const innerWidth = Math.max(1, size.width - MARGIN.left - MARGIN.right);
  const innerHeight = Math.max(1, size.height - MARGIN.top - MARGIN.bottom);

  const points = useMemo(() => {
    const [x0, x1] = domain;
    const step = (x1 - x0) / resolution;
    const pts: [number, number][] = [];
    for (let i = 0; i <= resolution; i++) {
      const x = x0 + i * step;
      const y = fn(x);
      if (Number.isFinite(y)) pts.push([x, y]);
    }
    return pts;
  }, [fn, domain, resolution]);

  const yDomain = useMemo<[number, number]>(() => {
    if (range) return range;
    const ys = points.map(([, y]) => y);
    if (ys.length === 0) return [-1, 1];
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    const pad = (max - min || 1) * 0.1;
    return [min - pad, max + pad];
  }, [points, range]);

  const xScale = useMemo(() => scaleLinear().domain(domain).range([0, innerWidth]), [domain, innerWidth]);
  const yScale = useMemo(
    () => scaleLinear().domain(yDomain).range([innerHeight, 0]),
    [yDomain, innerHeight],
  );

  const path = useMemo(() => {
    const generator = d3Line<[number, number]>()
      .x(([x]) => xScale(x))
      .y(([, y]) => yScale(y))
      .curve(curveMonotoneX);
    return generator(points) ?? "";
  }, [points, xScale, yScale]);

  const xTicks = xScale.ticks(6);
  const yTicks = yScale.ticks(5);

  return (
    <div ref={containerRef} className={`w-full ${className ?? ""}`}>
      <svg
        width={size.width}
        height={size.height}
        role="img"
        aria-label="Function plot"
        onPointerMove={(event) => {
          if (!onPointerX) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const px = ((event.clientX - rect.left) / rect.width) * size.width - MARGIN.left;
          onPointerX(xScale.invert(px));
        }}
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {xTicks.map((t) => (
            <line
              key={`gx-${t}`}
              x1={xScale(t)}
              x2={xScale(t)}
              y1={0}
              y2={innerHeight}
              className="stroke-slate-100 dark:stroke-slate-700"
              strokeWidth={1}
            />
          ))}
          {yTicks.map((t) => (
            <line
              key={`gy-${t}`}
              x1={0}
              x2={innerWidth}
              y1={yScale(t)}
              y2={yScale(t)}
              className="stroke-slate-100 dark:stroke-slate-700"
              strokeWidth={1}
            />
          ))}
          {yDomain[0] <= 0 && yDomain[1] >= 0 && (
            <line
              x1={0}
              x2={innerWidth}
              y1={yScale(0)}
              y2={yScale(0)}
              className="stroke-slate-400 dark:stroke-slate-500"
              strokeWidth={1.5}
            />
          )}
          {domain[0] <= 0 && domain[1] >= 0 && (
            <line
              x1={xScale(0)}
              x2={xScale(0)}
              y1={0}
              y2={innerHeight}
              className="stroke-slate-400 dark:stroke-slate-500"
              strokeWidth={1.5}
            />
          )}
          <path d={path} fill="none" stroke="#4f46e5" strokeWidth={2.5} />
          {xTicks.map((t) => (
            <text
              key={`xt-${t}`}
              x={xScale(t)}
              y={innerHeight + 16}
              textAnchor="middle"
              className="fill-slate-400 text-[10px] dark:fill-slate-500"
            >
              {t}
            </text>
          ))}
          {yTicks.map((t) => (
            <text
              key={`yt-${t}`}
              x={-8}
              y={yScale(t)}
              dy="0.32em"
              textAnchor="end"
              className="fill-slate-400 text-[10px] dark:fill-slate-500"
            >
              {t}
            </text>
          ))}
          {overlays?.({ xScale, yScale, innerWidth, innerHeight })}
        </g>
      </svg>
    </div>
  );
}
