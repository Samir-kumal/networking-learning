"use client";

import { useEffect, useRef, useState } from "react";

export interface DecisionPoint {
  x: number;
  y: number;
  label: 0 | 1;
}

export interface DecisionBoundaryCanvasProps {
  /** Predicted P(class = 1) for a point in the 2D input plane. */
  predict: (x: number, y: number) => number;
  points: DecisionPoint[];
  /** Symmetric [lo, hi] domain applied to both axes. */
  domain?: [number, number];
  /** Grid cells per axis sampled to build the heatmap. */
  resolution?: number;
  className?: string;
}

const CLASS0_COLOR = [245, 158, 11] as const; // amber-500
const CLASS1_COLOR = [79, 70, 229] as const; // indigo-600
const WHITE = [255, 255, 255] as const;

/** Diverging heatmap color for a probability in [0, 1]: amber (class 0) <-> white (uncertain) <-> indigo (class 1). */
function heatColor(p: number): string {
  const [from, to, t] =
    p < 0.5 ? [CLASS0_COLOR, WHITE, 1 - p * 2] : [WHITE, CLASS1_COLOR, (p - 0.5) * 2];
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  return `rgb(${r},${g},${b})`;
}

/**
 * A resize-safe canvas decision-boundary heatmap: samples `predict` over a grid across
 * `domain` x `domain`, colors each cell by predicted probability, and overlays the true
 * data points colored by their real class. Used by both perceptron-to-mlp (a single
 * neuron's linear boundary) and train-a-network (the full trained network's boundary).
 */
export function DecisionBoundaryCanvas({
  predict,
  points,
  domain = [-1.5, 1.5],
  resolution = 40,
  className,
}: DecisionBoundaryCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(320);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (!width) return;
      setSize(Math.max(200, Math.round(width)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const [lo, hi] = domain;
    const span = hi - lo;
    const cell = size / resolution;

    for (let gy = 0; gy < resolution; gy++) {
      const worldY = hi - ((gy + 0.5) / resolution) * span;
      for (let gx = 0; gx < resolution; gx++) {
        const worldX = lo + ((gx + 0.5) / resolution) * span;
        ctx.fillStyle = heatColor(predict(worldX, worldY));
        ctx.fillRect(gx * cell, gy * cell, cell + 0.5, cell + 0.5);
      }
    }

    // axis lines through the origin, when visible in the domain
    ctx.strokeStyle = "rgba(15, 23, 42, 0.25)";
    ctx.lineWidth = 1;
    if (lo <= 0 && hi >= 0) {
      const originX = ((0 - lo) / span) * size;
      const originY = size - ((0 - lo) / span) * size;
      ctx.beginPath();
      ctx.moveTo(originX, 0);
      ctx.lineTo(originX, size);
      ctx.moveTo(0, originY);
      ctx.lineTo(size, originY);
      ctx.stroke();
    }

    for (const point of points) {
      const sx = ((point.x - lo) / span) * size;
      const sy = size - ((point.y - lo) / span) * size;
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fillStyle = point.label === 1 ? "#3730a3" : "#b45309";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [predict, points, domain, resolution, size]);

  return (
    <div ref={containerRef} className={`w-full ${className ?? ""}`}>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="rounded-md border border-slate-200 dark:border-slate-700"
        role="img"
        aria-label="Decision boundary heatmap with data points"
      />
    </div>
  );
}
