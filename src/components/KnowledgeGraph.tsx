"use client";

import { useEffect, useRef, useState } from "react";
import { BRANCHES, CENTER, type Branch } from "@/lib/graph-data";

const W = 1000;
const H = 700;
const CX = W / 2;
const CY = H / 2;
const R_BRANCH = 218;
const R_LEAF = 96;

type Pt = { x: number; y: number };

function quad(p0: Pt, p1: Pt, p2: Pt, t: number): Pt {
  const m = 1 - t;
  return {
    x: m * m * p0.x + 2 * m * t * p1.x + t * t * p2.x,
    y: m * m * p0.y + 2 * m * t * p1.y + t * t * p2.y,
  };
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
// smoothstep easing on the already-eased spring value
const ease = (x: number) => x * x * (3 - 2 * x);

/**
 * Frame clock + critically-damped focus springs.
 * Every focus-driven value is interpolated over time, so switching nodes
 * eases continuously instead of snapping between two layouts.
 */
function useGraphFrame(activeId: string | null, animate: boolean) {
  const targets = useRef<Record<string, number>>({});
  const values = useRef<Record<string, number>>({});
  const velocity = useRef<Record<string, number>>({});
  const [frame, setFrame] = useState({ t: 0, focus: {} as Record<string, number> });

  for (const b of BRANCHES) {
    targets.current[b.id] = activeId === b.id ? 1 : 0;
    values.current[b.id] ??= 0;
    velocity.current[b.id] ??= 0;
  }

  useEffect(() => {
    if (!animate) {
      setFrame({ t: 0, focus: { ...targets.current } });
      return;
    }
    let last = performance.now();
    const start = last;
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const stiffness = 120;
      const damping = 22;
      const next: Record<string, number> = {};
      for (const b of BRANCHES) {
        const target = targets.current[b.id] ?? 0;
        const v = velocity.current[b.id] ?? 0;
        const x = values.current[b.id] ?? 0;
        const accel = (target - x) * stiffness - v * damping;
        const nv = v + accel * dt;
        const nx = x + nv * dt;
        velocity.current[b.id] = nv;
        values.current[b.id] = nx;
        next[b.id] = ease(Math.min(1, Math.max(0, nx)));
      }
      setFrame({ t: (now - start) / 1000, focus: next });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [animate]);

  return frame;
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
  const { t, focus: focusMap } = useGraphFrame(activeId, animate);

  // aggregate focus (0 = nothing selected, 1 = a node fully selected)
  const anyFocus = Math.max(0, ...BRANCHES.map((b) => focusMap[b.id] ?? 0));

  const nodes = BRANCHES.map((b, i) => {
    const f = focusMap[b.id] ?? 0;
    const base = (i / BRANCHES.length) * Math.PI * 2 - Math.PI / 2;
    const drift = Math.sin(t * 0.18 + i * 1.7) * 0.055;
    const angle = base + drift + t * 0.028;
    // dim smoothly: other nodes fade only as far as the selection has settled
    const dim = anyFocus * (1 - f);
    const r = R_BRANCH + Math.sin(t * 0.7 + i) * 7 + f * 26;
    const p: Pt = { x: CX + Math.cos(angle) * r, y: CY + Math.sin(angle) * r * 0.82 };
    const ctrl: Pt = {
      x: CX + Math.cos(angle + 0.34) * r * 0.55,
      y: CY + Math.sin(angle + 0.34) * r * 0.5,
    };
    const leaves = b.leaves.map((leaf, j) => {
      const spread = lerp(1.05, 1.35, f);
      const la =
        angle -
        spread / 2 +
        (j / Math.max(1, b.leaves.length - 1)) * spread +
        Math.sin(t * 0.5 + j * 2.1 + i) * 0.05;
      const lr = R_LEAF * lerp(1, 1.25, f) * (0.9 + (j % 3) * 0.09);
      return {
        ...leaf,
        angle: la,
        p: { x: p.x + Math.cos(la) * lr, y: p.y + Math.sin(la) * lr * 0.85 } as Pt,
      };
    });
    return { branch: b, angle, p, ctrl, leaves, f, dim };
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-full w-full select-none"
      role="img"
      aria-label="Animated knowledge graph of learning domains"
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
      </defs>

      <rect width={W} height={H} fill="url(#kg-grid)" opacity="0.5" />

      {/* orbit rings */}
      {[0.62, 0.85, 1.06].map((k, i) => (
        <ellipse
          key={k}
          cx={CX}
          cy={CY}
          rx={R_BRANCH * k}
          ry={R_BRANCH * k * 0.82}
          fill="none"
          stroke="var(--grid)"
          strokeWidth="1"
          strokeDasharray={i === 1 ? "3 9" : "1 7"}
          opacity="0.8"
        />
      ))}

      <circle cx={CX} cy={CY} r={230} fill="url(#kg-core)" />

      {/* edges: core -> branch */}
      {nodes.map((n) => {
        const d = `M${CX} ${CY} Q${n.ctrl.x} ${n.ctrl.y} ${n.p.x} ${n.p.y}`;
        const color = `var(--${n.branch.hue})`;
        return (
          <g key={`e-${n.branch.id}`} opacity={lerp(1, 0.25, n.dim)}>
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={lerp(1, 2, n.f)}
              opacity="0.4"
            />
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={lerp(1.6, 2.6, n.f)}
              strokeDasharray="10 26"
              style={{ animation: animate ? "kg-dash 3.6s linear infinite" : undefined }}
              opacity="0.9"
            />
            {[0, 0.4, 0.72].map((off, k) => {
              const tt = (((t * 0.26 + off) % 1) + 1) % 1;
              const pp = quad({ x: CX, y: CY }, n.ctrl, n.p, tt);
              return (
                <circle
                  key={k}
                  cx={pp.x}
                  cy={pp.y}
                  r={lerp(2.4, 3.4, n.f)}
                  fill={color}
                  opacity={0.9 - tt * 0.4}
                />
              );
            })}
          </g>
        );
      })}

      {/* leaves */}
      {nodes.map((n) =>
        n.leaves.map((l) => {
          const color = `var(--${n.branch.hue})`;
          return (
            <g key={`l-${l.id}`} opacity={lerp(lerp(0.72, 1, n.f), 0.18, n.dim)}>
              <line
                x1={n.p.x}
                y1={n.p.y}
                x2={l.p.x}
                y2={l.p.y}
                stroke={color}
                strokeWidth="0.9"
                strokeDasharray="2 5"
                opacity="0.6"
              />
              <circle cx={l.p.x} cy={l.p.y} r={lerp(3.6, 5, n.f)} fill={color} />
              <circle
                cx={l.p.x}
                cy={l.p.y}
                r={lerp(8, 11, n.f)}
                fill="none"
                stroke={color}
                strokeWidth="0.7"
                opacity="0.45"
              />
              {n.f > 0.02 && (
                <text
                  x={l.p.x + (Math.cos(l.angle) >= 0 ? 15 : -15)}
                  y={l.p.y + 4}
                  textAnchor={Math.cos(l.angle) >= 0 ? "start" : "end"}
                  className="font-mono"
                  fontSize="11"
                  fill="var(--foreground)"
                  opacity={n.f * 0.9}
                >
                  {l.label}
                </text>
              )}
            </g>
          );
        }),
      )}

      {/* branch nodes */}
      {nodes.map((n) => {
        const color = `var(--${n.branch.hue})`;
        return (
          <g
            key={`b-${n.branch.id}`}
            opacity={lerp(1, 0.4, n.dim)}
            className="cursor-pointer"
            onMouseEnter={() => onActivate(n.branch.id)}
            onFocus={() => onActivate(n.branch.id)}
            onClick={() => onActivate(n.f > 0.5 ? null : n.branch.id)}
            tabIndex={0}
          >
            <circle
              cx={n.p.x}
              cy={n.p.y}
              r={lerp(26, 34, n.f)}
              fill={color}
              opacity={lerp(0.12, 0.2, n.f)}
            />
            <circle
              cx={n.p.x}
              cy={n.p.y}
              r={lerp(17, 22, n.f)}
              fill="var(--surface)"
              stroke={color}
              strokeWidth={lerp(1.4, 2.2, n.f)}
            />
            <circle cx={n.p.x} cy={n.p.y} r={lerp(5, 7, n.f)} fill={color} />
            <circle
              cx={n.p.x}
              cy={n.p.y}
              r={26 + (Math.sin(t * 1.6 + n.angle) + 1) * lerp(10, 16, n.f)}
              fill="none"
              stroke={color}
              strokeWidth="0.8"
              opacity={0.35 - (Math.sin(t * 1.6 + n.angle) + 1) * 0.12}
            />
            <text
              x={n.p.x}
              y={n.p.y + (n.p.y < CY ? -38 : 46)}
              textAnchor="middle"
              fontSize={lerp(14, 15, n.f)}
              fontWeight="600"
              fill="var(--foreground)"
            >
              {n.branch.label}
            </text>
            <text
              x={n.p.x}
              y={n.p.y + (n.p.y < CY ? -22 : 62)}
              textAnchor="middle"
              fontSize="10.5"
              className="font-mono"
              fill={color}
              opacity="0.9"
            >
              {n.branch.modules} modules
            </text>
          </g>
        );
      })}

      {/* core */}
      <g onClick={() => onActivate(null)} className="cursor-pointer">
        <circle
          cx={CX}
          cy={CY}
          r={lerp(62, 54, anyFocus)}
          fill="var(--primary)"
          opacity="0.16"
          filter="url(#kg-soft)"
        />
        {[0, 1, 2].map((i) => {
          const k = (((t * 0.5 + i / 3) % 1) + 1) % 1;
          return (
            <circle
              key={i}
              cx={CX}
              cy={CY}
              r={44 + k * 120}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="1"
              opacity={0.4 * (1 - k) * lerp(1, 0.5, anyFocus)}
            />
          );
        })}
        <circle
          cx={CX}
          cy={CY}
          r={lerp(46, 40, anyFocus)}
          fill="var(--surface)"
          stroke="var(--primary)"
          strokeWidth="2"
        />
        <circle
          cx={CX}
          cy={CY}
          r={lerp(46, 40, anyFocus)}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeDasharray="6 12"
          transform={`rotate(${t * 22} ${CX} ${CY})`}
          opacity="0.7"
        />
        <text
          x={CX}
          y={CY - 2}
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fill="var(--foreground)"
        >
          {CENTER.label.split(" ")[0]}
        </text>
        <text
          x={CX}
          y={CY + 14}
          textAnchor="middle"
          fontSize="10"
          className="font-mono"
          fill="var(--primary)"
        >
          {CENTER.label.split(" ")[1]}
        </text>
      </g>
    </svg>
  );
}

export function BranchDetail({ branch }: { branch: Branch | null }) {
  if (!branch) {
    return (
      <div className="rounded-xl border border-border bg-surface/60 p-5">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Graph idle
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Hover or tap any node to expand its branch and inspect the sub-topics it links to.
        </p>
      </div>
    );
  }
  return (
    <div key={branch.id} className="kg-rise rounded-xl border border-border bg-surface/60 p-5">
      <p
        className="font-mono text-xs uppercase tracking-[0.18em]"
        style={{ color: `var(--${branch.hue})` }}
      >
        {branch.level}
      </p>
      <h3 className="mt-2 text-lg font-semibold">{branch.label}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{branch.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {branch.leaves.map((l) => (
          <span
            key={l.id}
            className="rounded-full border border-border bg-surface-2 px-3 py-1 font-mono text-xs"
          >
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
