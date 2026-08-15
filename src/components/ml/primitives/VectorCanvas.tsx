"use client";

import { useCallback, useRef, useState } from "react";

export interface VectorSpec {
  id: string;
  x: number;
  y: number;
  color?: string;
  label?: string;
}

export interface VectorCanvasProps {
  vectors: VectorSpec[];
  onDragVector?: (id: string, x: number, y: number) => void;
  /** Draws the vector sum, tail-to-head, from the origin. */
  showSum?: boolean;
  /** Draws every other vector's projection onto the named vector (dot-product-as-projection view). */
  showProjectionOnto?: string;
  /** Half-width of the square view, in world units. */
  domain?: number;
}

const SIZE = 360;

function toScreenFactory(domain: number) {
  const scale = SIZE / (domain * 2);
  return (x: number, y: number) => ({ x: SIZE / 2 + x * scale, y: SIZE / 2 - y * scale });
}

/** A 2D draggable-vector canvas: addition, scaling, and dot-product-as-projection. */
export function VectorCanvas({ vectors, onDragVector, showSum, showProjectionOnto, domain = 5 }: VectorCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const toScreen = toScreenFactory(domain);

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const scale = SIZE / (domain * 2);
      const px = ((clientX - rect.left) / rect.width) * SIZE;
      const py = ((clientY - rect.top) / rect.height) * SIZE;
      return { x: (px - SIZE / 2) / scale, y: -(py - SIZE / 2) / scale };
    },
    [domain],
  );

  const sum = vectors.reduce((acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }), { x: 0, y: 0 });
  const projectionTarget = showProjectionOnto ? vectors.find((v) => v.id === showProjectionOnto) : undefined;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-auto w-full max-w-md touch-none select-none"
      role="img"
      aria-label="Vector canvas"
      onPointerMove={(event) => {
        if (!draggingId || !onDragVector) return;
        const world = toWorld(event.clientX, event.clientY);
        onDragVector(draggingId, Math.round(world.x * 10) / 10, Math.round(world.y * 10) / 10);
      }}
      onPointerUp={() => setDraggingId(null)}
      onPointerLeave={() => setDraggingId(null)}
    >
      {Array.from({ length: domain * 2 + 1 }, (_, i) => i - domain).map((g) => (
        <g key={g}>
          <line
            x1={toScreen(g, -domain).x}
            y1={toScreen(g, -domain).y}
            x2={toScreen(g, domain).x}
            y2={toScreen(g, domain).y}
            className="stroke-slate-100 dark:stroke-slate-700"
          />
          <line
            x1={toScreen(-domain, g).x}
            y1={toScreen(-domain, g).y}
            x2={toScreen(domain, g).x}
            y2={toScreen(domain, g).y}
            className="stroke-slate-100 dark:stroke-slate-700"
          />
        </g>
      ))}
      <line
        x1={toScreen(-domain, 0).x}
        y1={toScreen(-domain, 0).y}
        x2={toScreen(domain, 0).x}
        y2={toScreen(domain, 0).y}
        className="stroke-slate-400 dark:stroke-slate-500"
        strokeWidth={1.5}
      />
      <line
        x1={toScreen(0, -domain).x}
        y1={toScreen(0, -domain).y}
        x2={toScreen(0, domain).x}
        y2={toScreen(0, domain).y}
        className="stroke-slate-400 dark:stroke-slate-500"
        strokeWidth={1.5}
      />

      {projectionTarget &&
        vectors
          .filter((v) => v.id !== projectionTarget.id)
          .map((v) => {
            const denom = projectionTarget.x ** 2 + projectionTarget.y ** 2;
            const t = denom === 0 ? 0 : (v.x * projectionTarget.x + v.y * projectionTarget.y) / denom;
            const proj = { x: projectionTarget.x * t, y: projectionTarget.y * t };
            const vEnd = toScreen(v.x, v.y);
            const projEnd = toScreen(proj.x, proj.y);
            const origin = toScreen(0, 0);
            return (
              <g key={`proj-${v.id}`}>
                <line
                  x1={vEnd.x}
                  y1={vEnd.y}
                  x2={projEnd.x}
                  y2={projEnd.y}
                  strokeDasharray="4 3"
                  className="stroke-slate-400 dark:stroke-slate-500"
                />
                <line x1={origin.x} y1={origin.y} x2={projEnd.x} y2={projEnd.y} strokeWidth={4} stroke="#f59e0b" />
              </g>
            );
          })}

      {showSum && <VectorArrow from={{ x: 0, y: 0 }} to={sum} toScreen={toScreen} color="#94a3b8" dashed label="sum" />}

      {vectors.map((v) => (
        <g key={v.id} style={{ cursor: onDragVector ? "grab" : "default" }}>
          <VectorArrow from={{ x: 0, y: 0 }} to={v} toScreen={toScreen} color={v.color ?? "#4f46e5"} label={v.label} />
          {onDragVector && (
            <circle
              cx={toScreen(v.x, v.y).x}
              cy={toScreen(v.x, v.y).y}
              r={10}
              fill="transparent"
              onPointerDown={() => setDraggingId(v.id)}
            />
          )}
        </g>
      ))}
    </svg>
  );
}

interface VectorArrowProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  toScreen: (x: number, y: number) => { x: number; y: number };
  color: string;
  dashed?: boolean;
  label?: string;
}

function VectorArrow({ from, to, toScreen, color, dashed, label }: VectorArrowProps) {
  const start = toScreen(from.x, from.y);
  const end = toScreen(to.x, to.y);
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headLength = 8;
  const left = {
    x: end.x - headLength * Math.cos(angle - Math.PI / 6),
    y: end.y - headLength * Math.sin(angle - Math.PI / 6),
  };
  const right = {
    x: end.x - headLength * Math.cos(angle + Math.PI / 6),
    y: end.y - headLength * Math.sin(angle + Math.PI / 6),
  };
  return (
    <g>
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={color}
        strokeWidth={2.5}
        strokeDasharray={dashed ? "5 4" : undefined}
      />
      <polygon points={`${end.x},${end.y} ${left.x},${left.y} ${right.x},${right.y}`} fill={color} />
      {label && (
        <text x={end.x + 6} y={end.y - 6} className="font-mono text-[11px]" fill={color}>
          {label}
        </text>
      )}
    </g>
  );
}
