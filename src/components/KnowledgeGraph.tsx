"use client";

import { useEffect, useRef, useState } from "react";
import {
  BRANCH_RELATIONSHIPS,
  BRANCHES,
  CENTER,
  type Branch,
  type GraphPosition,
} from "@/lib/graph-data";

const W = 1000;
const H = 700;
const CX = W / 2;
const CY = H / 2;
const R_BRANCH = 22;
const R_LEAF = 86;

type FocusMap = Record<string, number>;

function ease(x: number) {
  return x * x * (3 - 2 * x);
}

function relationshipGeometry(from: GraphPosition, to: GraphPosition) {
  const midpoint = {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
  };
  const radialLength = Math.max(1, Math.hypot(midpoint.x - CX, midpoint.y - CY));
  const curveOffset = 105;
  const control = {
    x: midpoint.x + ((midpoint.x - CX) / radialLength) * curveOffset,
    y: midpoint.y + ((midpoint.y - CY) / radialLength) * curveOffset,
  };

  return {
    path: `M${from.x} ${from.y} Q${control.x} ${control.y} ${to.x} ${to.y}`,
    label: {
      x: (from.x + 2 * control.x + to.x) / 4,
      y: (from.y + 2 * control.y + to.y) / 4,
    },
  };
}

function leafPoint(branch: Branch, index: number): GraphPosition {
  const angle = Math.atan2(branch.position.y - CY, branch.position.x - CX);
  const spread = 1.05;
  const leafAngle = angle - spread / 2 + (index / Math.max(1, branch.leaves.length - 1)) * spread;
  const radius = R_LEAF + (index % 3) * 9;

  return {
    x: branch.position.x + Math.cos(leafAngle) * radius,
    y: branch.position.y + Math.sin(leafAngle) * radius * 0.85,
  };
}

function useGraphFocus(activeId: string | null, animate: boolean) {
  const targets = useRef<FocusMap>({});
  const values = useRef<FocusMap>({});
  const velocity = useRef<FocusMap>({});
  const [focus, setFocus] = useState<FocusMap>({});

  for (const branch of BRANCHES) {
    targets.current[branch.id] = activeId === branch.id ? 1 : 0;
    values.current[branch.id] ??= 0;
    velocity.current[branch.id] ??= 0;
  }

  useEffect(() => {
    if (!animate) {
      for (const branch of BRANCHES) {
        values.current[branch.id] = targets.current[branch.id] ?? 0;
        velocity.current[branch.id] = 0;
      }
      setFocus({ ...targets.current });
      return;
    }

    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const next: FocusMap = {};
      let settled = true;

      for (const branch of BRANCHES) {
        const target = targets.current[branch.id] ?? 0;
        const value = values.current[branch.id] ?? 0;
        const currentVelocity = velocity.current[branch.id] ?? 0;
        const acceleration = (target - value) * 120 - currentVelocity * 22;
        const nextVelocity = currentVelocity + acceleration * dt;
        const nextValue = value + nextVelocity * dt;

        velocity.current[branch.id] = nextVelocity;
        values.current[branch.id] = nextValue;
        next[branch.id] = ease(Math.min(1, Math.max(0, nextValue)));
        settled = settled && Math.abs(target - nextValue) < 0.001 && Math.abs(nextVelocity) < 0.001;
      }

      setFocus(next);
      if (!settled) {
        raf = requestAnimationFrame(loop);
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [activeId, animate]);

  return focus;
}

export function KnowledgeGraph({
  activeId,
  onActivate,
}: {
  activeId: string | null;
  onActivate: (id: string | null) => void;
}) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    setAnimate(!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const focusMap = useGraphFocus(activeId, animate);
  const anyFocus = Math.max(0, ...BRANCHES.map((branch) => focusMap[branch.id] ?? 0));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-full w-full select-none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="kg-core" cx="50%" cy="50%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
          <stop offset="60%" stopColor="var(--primary)" stopOpacity="0.07" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
        <pattern id="kg-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="var(--grid)" strokeWidth="0.6" />
        </pattern>
        <filter id="kg-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <marker id="kg-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0 0L8 4L0 8Z" fill="var(--muted-foreground)" />
        </marker>
      </defs>

      <rect width={W} height={H} fill="url(#kg-grid)" opacity="0.5" />
      {[0.62, 0.85, 1.06].map((scale, index) => (
        <ellipse
          key={scale}
          cx={CX}
          cy={CY}
          rx={230 * scale}
          ry={230 * scale * 0.82}
          fill="none"
          stroke="var(--grid)"
          strokeWidth="1"
          strokeDasharray={index === 1 ? "3 9" : "1 7"}
          opacity="0.8"
        />
      ))}
      <circle cx={CX} cy={CY} r={230} fill="url(#kg-core)" />

      {/* Recommended production sequence: Git → security → containers → cloud → networking. */}
      {BRANCH_RELATIONSHIPS.map((relationship) => {
        const from = BRANCHES.find((branch) => branch.id === relationship.from);
        const to = BRANCHES.find((branch) => branch.id === relationship.to);
        if (!from || !to) return null;
        const geometry = relationshipGeometry(from.position, to.position);

        return (
          <g key={`${relationship.from}-${relationship.to}`} opacity="0.8">
            <path
              d={geometry.path}
              fill="none"
              stroke="var(--muted-foreground)"
              strokeWidth="1.5"
              strokeDasharray="5 8"
              markerEnd="url(#kg-arrow)"
            />
            <text
              x={geometry.label.x}
              y={geometry.label.y - 7}
              textAnchor="middle"
              fontSize="9"
              fill="var(--muted-foreground)"
              className="font-mono"
            >
              {relationship.label}
            </text>
          </g>
        );
      })}

      {/* Learning Hub → track edges. */}
      {BRANCHES.map((branch) => {
        const focus = focusMap[branch.id] ?? 0;
        const dim = anyFocus * (1 - focus);
        return (
          <line
            key={`core-${branch.id}`}
            x1={CX}
            y1={CY}
            x2={branch.position.x}
            y2={branch.position.y}
            stroke={`var(--${branch.hue})`}
            strokeWidth={1.5 + focus}
            strokeDasharray="8 10"
            opacity={0.75 - dim * 0.45}
          />
        );
      })}

      {BRANCHES.map((branch) => {
        const focus = focusMap[branch.id] ?? 0;
        const dim = anyFocus * (1 - focus);
        const labelAbove = branch.position.y < CY;
        const labelY = branch.position.y + (labelAbove ? -38 : 48);
        const leavesVisible = focus > 0.02;
        const color = `var(--${branch.hue})`;

        return (
          <g key={`branch-${branch.id}`} opacity={1 - dim * 0.6}>
            {leavesVisible &&
              branch.leaves.map((leaf, index) => {
                const point = leafPoint(branch, index);
                return (
                  <g key={leaf.id} opacity={focus * 0.9}>
                    <line
                      x1={branch.position.x}
                      y1={branch.position.y}
                      x2={point.x}
                      y2={point.y}
                      stroke={color}
                      strokeWidth="0.9"
                      strokeDasharray="2 5"
                      opacity="0.65"
                    />
                    <circle cx={point.x} cy={point.y} r="4.5" fill={color} />
                    <text
                      x={point.x + (point.x >= branch.position.x ? 12 : -12)}
                      y={point.y + 4}
                      textAnchor={point.x >= branch.position.x ? "start" : "end"}
                      className="font-mono"
                      fontSize="11"
                      fill="var(--foreground)"
                    >
                      {leaf.label}
                    </text>
                  </g>
                );
              })}

            <g
              className="cursor-pointer"
              onMouseEnter={() => onActivate(branch.id)}
              onClick={() => onActivate(activeId === branch.id ? null : branch.id)}
            >
              <circle
                cx={branch.position.x}
                cy={branch.position.y}
                r={R_BRANCH + 12}
                fill="transparent"
                pointerEvents="all"
              />
              <circle
                cx={branch.position.x}
                cy={branch.position.y}
                r={R_BRANCH + focus * 8}
                fill={color}
                opacity={0.16 + focus * 0.08}
              />
              <circle
                cx={branch.position.x}
                cy={branch.position.y}
                r={R_BRANCH - 5 + focus * 4}
                fill="var(--surface)"
                stroke={color}
                strokeWidth={1.6 + focus * 0.7}
              />
              <circle cx={branch.position.x} cy={branch.position.y} r={6 + focus} fill={color} />
              <text
                x={branch.position.x}
                y={labelY}
                textAnchor="middle"
                fontSize="14"
                fontWeight="600"
                fill="var(--foreground)"
              >
                {branch.label}
              </text>
              <text
                x={branch.position.x}
                y={labelY + (labelAbove ? 14 : 16)}
                textAnchor="middle"
                fontSize="10.5"
                className="font-mono"
                fill={color}
              >
                {branch.modules} modules
              </text>
            </g>
          </g>
        );
      })}

      <g onClick={() => onActivate(null)} className="cursor-pointer">
        <circle cx={CX} cy={CY} r="230" fill="url(#kg-core)" opacity="0.18" filter="url(#kg-soft)" />
        <circle cx={CX} cy={CY} r={46 - anyFocus * 5} fill="var(--surface)" stroke="var(--primary)" strokeWidth="2" />
        <circle
          cx={CX}
          cy={CY}
          r={46 - anyFocus * 5}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeDasharray="6 12"
          opacity="0.7"
        />
        <text x={CX} y={CY - 2} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--foreground)">
          Learning
        </text>
        <text x={CX} y={CY + 14} textAnchor="middle" fontSize="10" className="font-mono" fill="var(--primary)">
          Hub
        </text>
      </g>
    </svg>
  );
}

export function BranchSelector({
  activeId,
  onActivate,
  className = "",
}: {
  activeId: string | null;
  onActivate: (id: string | null) => void;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2 ${className}`} role="group" aria-label="Learning track controls">
      {BRANCHES.map((branch) => {
        const selected = activeId === branch.id;
        return (
          <button
            key={branch.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onActivate(selected ? null : branch.id)}
            className={`min-h-11 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
              selected
                ? "border-indigo-400 bg-indigo-50 text-slate-900 dark:border-indigo-500 dark:bg-indigo-900/30 dark:text-slate-100"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: `var(--${branch.hue})` }} />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold">{branch.label}</span>
              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{branch.modules}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function BranchDetail({ branch }: { branch: Branch | null }) {
  if (!branch) {
    return (
      <div className="rounded-xl border border-border bg-surface/60 p-5">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Choose a track</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Select a track to see its focus areas, recommended sequence, and a direct link into the labs.
        </p>
      </div>
    );
  }

  const relationship = BRANCH_RELATIONSHIPS.find((item) => item.from === branch.id);
  const nextBranch = relationship ? BRANCHES.find((item) => item.id === relationship.to) : undefined;

  return (
    <div
      key={branch.id}
      className="kg-rise rounded-xl border border-border bg-surface/60 p-5"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="font-mono text-xs uppercase tracking-[0.18em]" style={{ color: `var(--${branch.hue})` }}>
        {branch.level}
      </p>
      <h3 className="mt-2 text-lg font-semibold">{branch.label}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{branch.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {branch.leaves.map((leaf) => (
          <span key={leaf.id} className="rounded-full border border-border bg-surface-2 px-3 py-1 font-mono text-xs">
            {leaf.label}
          </span>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <a
          href={branch.href}
          className="inline-flex min-h-10 items-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        >
          Open track
        </a>
        {nextBranch && relationship ? (
          <span className="text-xs leading-relaxed text-muted-foreground">
            Next: <a className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400" href={nextBranch.href}>{nextBranch.label}</a>
            <span className="block">{relationship.label}</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Final production networking layer</span>
        )}
      </div>
    </div>
  );
}
