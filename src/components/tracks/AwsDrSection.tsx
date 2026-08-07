"use client";

import React, { useState } from "react";

// --- Types & Data Interfaces ---
type StrategyKey = "backup-restore" | "pilot-light" | "warm-standby" | "active-active";

interface DrStrategy {
  id: StrategyKey;
  code: string;
  label: string;
  tagline: string;
  warmth: "Cold" | "Lukewarm" | "Warm" | "Hot";
  // Best-case (floor) and typical (ceiling) ranges in minutes
  rtoRange: [number, number];
  rpoRange: [number, number];
  rtoTypical: number; // used as the slider default when this strategy is picked
  rpoTypical: number;
  costTier: string;
  baseCost: number; // reference monthly cost
  costBreakdown: { availability: number; replication: number; storage: number };
  description: string;
  failover: string;
  dataRecovery: string;
  verification: string;
  awsServices: string[];
}

const STRATEGIES: Record<StrategyKey, DrStrategy> = {
  "backup-restore": {
    id: "backup-restore",
    code: "S3",
    label: "Backup & Restore",
    tagline: "Back up data to another region; rebuild and restore on demand.",
    warmth: "Cold",
    rtoRange: [720, 1440], // 12-24 h
    rpoRange: [720, 1440], // 12-24 h
    rtoTypical: 1080,
    rpoTypical: 720,
    costTier: "$",
    baseCost: 850,
    costBreakdown: { availability: 120, replication: 40, storage: 690 },
    description:
      "The cheapest, simplest pattern. Data is backed up to another region — AWS Backup, S3 with versioning, EBS and RDS snapshots — but no compute runs there. On disaster you rebuild the stack from code templates and restore the newest backup. Tied to the RPO window, recovery takes hours.",
    failover:
      "Execute CloudFormation templates to provision VPC, EC2, RDS and the load balancer in the DR region, then restore data (hours, not minutes).",
    dataRecovery:
      "Restore the latest EBS/RDS snapshots and S3 objects from the backup region; data loss is bounded by the RPO (the backup cadence).",
    verification:
      "Run smoke tests against the restored endpoints before switching Route 53 DNS to the DR region.",
    awsServices: ["AWS Backup", "S3 + Versioning", "EBS Snapshots", "RDS Snapshots", "CloudFormation"],
  },
  "pilot-light": {
    id: "pilot-light",
    code: "PL",
    label: "Pilot Light",
    tagline: "A pilot light stays lit: core data + tiny fleet always run.",
    warmth: "Lukewarm",
    rtoRange: [30, 240], // 30 min - 4 h
    rpoRange: [15, 60], // 15 min - 1 h
    rtoTypical: 120,
    rpoTypical: 30,
    costTier: "$$",
    baseCost: 2400,
    costBreakdown: { availability: 900, replication: 350, storage: 1150 },
    description:
      "A minimal version of production — typically just the database cluster and a small 'pilot light' fleet — is always running in the DR region. Core data is continuously replicated via RDS cross-region read replicas and S3 Cross-Region Replication. On disaster you scale the pilot light up to full production size.",
    failover:
      "Promote the RDS cross-region read replica, scale out the pilot-light ASG/ECS cluster, and re-point ELB listeners.",
    dataRecovery:
      "The replica is nearly current (lag bounded by the RPO), so you only wait for replica lag to converge — no bulk restore.",
    verification:
      "Route 53 health checks confirm the enlarged region serves traffic, then DNS failover policy routes production traffic.",
    awsServices: ["RDS Read Replica", "S3 CRR", "Route 53", "ECS / ASG", "CloudWatch"],
  },
  "warm-standby": {
    id: "warm-standby",
    code: "WS",
    label: "Warm Standby",
    tagline: "Full environment, scaled down, ready to absorb traffic.",
    warmth: "Warm",
    rtoRange: [5, 30], // 5-30 min
    rpoRange: [1, 5], // 1-5 min
    rtoTypical: 15,
    rpoTypical: 3,
    costTier: "$$$",
    baseCost: 5200,
    costBreakdown: { availability: 3200, replication: 800, storage: 1200 },
    description:
      "A complete copy of the production environment runs in the DR region at reduced scale. Aurora Global Database and DynamoDB Global Tables keep data nearly synchronous across regions. Recovery is a scale-up plus DNS flip — RTO in minutes, RPO near zero.",
    failover:
      "Scale up the DR Auto Scaling group, promote the Aurora global secondary, and switch Route 53 failover routing.",
    dataRecovery:
      "Aurora Global Database and DynamoDB Global Tables replicate continuously; catch-up lag is seconds, so no restore step is needed.",
    verification:
      "App endpoints pass health checks, routing flips, and the warm standby is confirmed serving full traffic.",
    awsServices: ["Aurora Global Database", "Auto Scaling", "Route 53", "S3 CRR", "ElastiCache"],
  },
  "active-active": {
    id: "active-active",
    code: "A/A",
    label: "Multi-Site Active-Active",
    tagline: "Both regions serve production traffic with seamless failover.",
    warmth: "Hot",
    rtoRange: [0, 5], // seconds to minutes
    rpoRange: [0, 1], // near zero
    rtoTypical: 2,
    rpoTypical: 1,
    costTier: "$$$$",
    baseCost: 9800,
    costBreakdown: { availability: 6100, replication: 2300, storage: 1400 },
    description:
      "Every region runs at full production capacity and Global Accelerator / Route 53 latency routing steers users to the nearest healthy region. Data is replicated synchronously in both directions. A regional failure simply removes that region from traffic — downtime and data loss trend to zero.",
    failover:
      "None — traffic controllers stop sending requests to the impaired region within seconds; no DNS swap or promotion is required.",
    dataRecovery:
      "Aurora Global Database and DynamoDB Global Tables hold the same customer-visible state in both regions; there is nothing to restore.",
    verification:
      "Health checks on the surviving region are already answering; load simply redistributes to the remaining capacity.",
    awsServices: ["Global Accelerator", "Route 53 Latency", "Aurora Global Database", "DynamoDB Global Tables", "S3 CRR"],
  },
};

const STRATEGY_ORDER: StrategyKey[] = [
  "backup-restore",
  "pilot-light",
  "warm-standby",
  "active-active",
];

const SLIDER_MIN = 1; // 1 minute
const SLIDER_MAX = 1440; // 24 hours, in minutes

const RTO_PRESETS = [
  { label: "15m", value: 15 },
  { label: "1h", value: 60 },
  { label: "4h", value: 240 },
  { label: "8h", value: 480 },
  { label: "12h", value: 720 },
  { label: "24h", value: 1440 },
];
const RPO_PRESETS = [
  { label: "1m", value: 1 },
  { label: "5m", value: 5 },
  { label: "15m", value: 15 },
  { label: "1h", value: 60 },
  { label: "6h", value: 360 },
  { label: "24h", value: 1440 },
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Compact human time from minutes ("45m", "1h", "1h 30m", "24h")
const formatMinutes = (m: number): string => {
  if (m < 60) return `${m}m`;
  if (m >= SLIDER_MAX) return "24h";
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
};

export default function AwsDrSection() {
  // ==========================================
  // STATE: RTO / RPO OBJECTIVES + STRATEGY
  // ==========================================
  const [rtoMinutes, setRtoMinutes] = useState<number>(15);
  const [rpoMinutes, setRpoMinutes] = useState<number>(3);
  const [strategyKey, setStrategyKey] = useState<StrategyKey>("warm-standby");

  const strategy = STRATEGIES[strategyKey];
  const totalDowntime = rtoMinutes + rpoMinutes;

  // A strategy can meet the targets only when its best-case floor is at
  // or above the requested RTO/RPO.
  const meetsTarget = (s: DrStrategy) =>
    rtoMinutes >= s.rtoRange[0] && rpoMinutes >= s.rpoRange[0];

  const recommended = STRATEGY_ORDER.map((k) => STRATEGIES[k])
    .filter(meetsTarget)
    .sort((a, b) => a.baseCost - b.baseCost)[0] ?? null;

  // Cost model: replication cost scales with target RPO freshness; the
  // availability layer scales up 15% when the RTO target is below typical.
  const replicationFactor = clamp(strategy.rpoTypical / rpoMinutes, 0.5, 4);
  const computeScaleFactor = rtoMinutes < strategy.rtoTypical ? 1.15 : 1;
  const monthlyCost = Math.round(
    strategy.costBreakdown.availability * computeScaleFactor +
      strategy.costBreakdown.replication * replicationFactor +
      strategy.costBreakdown.storage
  );
  const annualCost = monthlyCost * 12;

  const handleStrategySelect = (key: StrategyKey) => {
    const s = STRATEGIES[key];
    setStrategyKey(key);
    setRtoMinutes(s.rtoTypical);
    setRpoMinutes(s.rpoTypical);
  };

  // ==========================================
  // TIMELINE GEOMETRY (driven by sliders)
  // ==========================================
  const lossPct = (rpoMinutes / totalDowntime) * 100;
  const recoveryPct = (rtoMinutes / totalDowntime) * 100;

  // ==========================================
  // TRADEOFF PLOT GEOMETRY (SVG, log-scale X = RTO)
  // ==========================================
  const PLOT = { left: 56, right: 744, top: 30, bottom: 300, viewH: 384 };
  const plotW = PLOT.right - PLOT.left;
  const plotH = PLOT.bottom - PLOT.top;
  const logSpan = Math.log10(SLIDER_MAX) - Math.log10(SLIDER_MIN);
  const xForMinutes = (m: number) =>
    PLOT.left + ((Math.log10(Math.max(m, SLIDER_MIN)) - Math.log10(SLIDER_MIN)) / logSpan) * plotW;
  const yForCostK = (k: number) => PLOT.top + (1 - k / 10) * plotH;

  const X_TICKS = [
    { m: 1, label: "1m" },
    { m: 15, label: "15m" },
    { m: 60, label: "1h" },
    { m: 240, label: "4h" },
    { m: 720, label: "12h" },
    { m: 1440, label: "24h" },
  ];
  const Y_TICKS = [0, 2, 4, 6, 8, 10];

  const plotPoints = [...STRATEGY_ORDER]
    .map((k) => STRATEGIES[k])
    .sort((a, b) => a.rtoTypical - b.rtoTypical)
    .map((s) => ({ s, x: xForMinutes(s.rtoTypical), y: yForCostK(s.baseCost / 1000) }));

  const targetX = xForMinutes(rtoMinutes);
  const steepZoneX = xForMinutes(60);
  const steepZoneWidth = xForMinutes(60) - xForMinutes(1);

  return (
    <section id="aws-dr" className="scroll-mt-20 space-y-6">
      {/* ========== TRACK BANNER ========== */}
      <div className="rounded-2xl bg-gradient-to-r from-[#161b22] via-[#1c2333] to-[#161b22] border border-slate-200 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-[#f0883e]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f0883e]/10 border border-[#f0883e]/30 text-xs font-mono text-[#f0883e] mb-3">
              <span className="w-2 h-2 rounded-full bg-[#f0883e] animate-pulse" />
              AWS Disaster Recovery Track
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Disaster Recovery &amp; Multi-Region Architecture
            </h1>
            <p className="mt-3 text-sm text-slate-400 max-w-2xl leading-relaxed">
              Set your Recovery Time Objective (RTO) and Recovery Point Objective (RPO), then see
              which of the four canonical AWS strategies can hit them — what the recovery timeline
              looks like and what it actually costs. The business asks for numbers; this planner
              turns RPO/RTO into a strategy.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <span className="bg-slate-50 border border-slate-200 text-amber-600 px-3 py-1.5 rounded-lg">
              RTO / RPO Planner
            </span>
            <span className="bg-slate-50 border border-slate-200 text-emerald-600 px-3 py-1.5 rounded-lg">
              4 DR Strategies
            </span>
            <span className="bg-slate-50 border border-slate-200 text-violet-600 px-3 py-1.5 rounded-lg">
              Recovery Timeline
            </span>
            <span className="bg-slate-50 border border-slate-200 text-indigo-600 px-3 py-1.5 rounded-lg">
              Cost Tradeoff
            </span>
          </div>
        </div>
      </div>

      {/* ========== MODULE 1: RTO / RPO OBJECTIVES ========== */}
      <div
        id="dr-objectives"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-8 shadow-xl hover:border-[#f0803e]/40 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono text-amber-600 uppercase tracking-wider mb-1">
              Module 01 / Recovery Objectives
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              RTO &amp; RPO Sliders
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            Range: 1 min – 24 hr
          </span>
        </div>

        <p className="text-sm text-slate-500 leading-relaxed">
          <strong className="text-amber-600">RTO (Recovery Time Objective)</strong> is the maximum
          downtime you can tolerate — how fast service must be back.{" "}
          <strong className="text-amber-600">RPO (Recovery Point Objective)</strong> is the maximum
          acceptable data loss, i.e. how far back in time your last good copy may be. Together they
          set the severity of the disaster:{" "}
          <code className="text-xs bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">
            Total Downtime = RPO + RTO
          </code>
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-200">
          {/* RTO slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="rto-slider"
                className="text-xs font-bold text-slate-500 uppercase font-mono"
              >
                Recovery Time Objective (RTO)
              </label>
              <span className="px-3 py-1 rounded-lg bg-[#f0803e]/15 text-[#f0803e] border border-[#f0803e]/30 text-sm font-mono font-bold">
                {formatMinutes(rtoMinutes)}
              </span>
            </div>
            <input
              id="rto-slider"
              type="range"
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step={1}
              value={rtoMinutes}
              onChange={(e) => setRtoMinutes(Number(e.target.value))}
              className="w-full accent-[#f0803e]"
            />
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>1m — max failover</span>
              <span>24h — restore from backup</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {RTO_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setRtoMinutes(p.value)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors ${
                    rtoMinutes === p.value
                      ? "bg-[#f0803e]/20 text-[#f0803e] border-[#f0803e] font-bold"
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:border-[#8b949e]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* RPO slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="rpo-slider"
                className="text-xs font-bold text-slate-500 uppercase font-mono"
              >
                Recovery Point Objective (RPO)
              </label>
              <span className="px-3 py-1 rounded-lg bg-amber-500/15 text-amber-700 border border-amber-300 text-sm font-mono font-bold">
                {formatMinutes(rpoMinutes)}
              </span>
            </div>
            <input
              id="rpo-slider"
              type="range"
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step={1}
              value={rpoMinutes}
              onChange={(e) => setRpoMinutes(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>1m — sychronous replication</span>
              <span>24h — daily snapshots</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {RPO_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setRpoMinutes(p.value)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors ${
                    rpoMinutes === p.value
                      ? "bg-amber-500/15 text-amber-700 border-amber-400 font-bold"
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:border-[#8b949e]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feasibility verdict */}
        <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono border-b border-slate-200 pb-2">
            <span className="text-slate-900 font-bold">Strategy Feasibility Check</span>
            <span className="text-slate-500">Best case must be ≤ your target</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {STRATEGY_ORDER.map((k) => {
              const s = STRATEGIES[k];
              const ok = meetsTarget(s);
              return (
                <div
                  key={k}
                  className={`rounded-lg border px-3 py-2 text-xs font-mono ${
                    ok
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                      : "bg-rose-50 border-rose-200 text-rose-600"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>{s.label}</span>
                    <span>{ok ? "FITS" : "TOO SLOW"}</span>
                  </div>
                  <div className="text-[11px] mt-0.5 opacity-80">
                    RTO {formatMinutes(s.rtoRange[0])} / RPO {formatMinutes(s.rpoRange[0])}
                  </div>
                </div>
              );
            })}
          </div>
          {recommended ? (
            <p className="text-xs text-slate-500">
              <strong className="text-emerald-600">Best fit for your targets:</strong>{" "}
              {recommended.label} ({recommended.costTier}/mo) — the cheapest viable strategy given
              RTO {formatMinutes(rtoMinutes)} / RPO {formatMinutes(rpoMinutes)}.
            </p>
          ) : (
            <p className="text-xs text-rose-600">
              <strong>No strategy meets your targets.</strong> Even Multi-Site Active-Active&#39;s
              sub-minute best case is slower than you asked for. Relax the objectives or embrace
              synchronous multi-region replication as the only answer.
            </p>
          )}
        </div>
      </div>

      {/* ========== MODULE 02: STRATEGY SELECTOR ========== */}
      <div
        id="dr-strategy"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-8 shadow-xl hover:border-[#f0803e]/40 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono text-amber-600 uppercase tracking-wider mb-1">
              Module 02 / Strategy Selection
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              Pick a DR Strategy
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            Selecting a strategy sets typical RTO/RPO targets
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {STRATEGY_ORDER.map((k) => {
            const s = STRATEGIES[k];
            const active = strategyKey === k;
            const ok = meetsTarget(s);
            return (
              <button
                key={k}
                onClick={() => handleStrategySelect(k)}
                className={`text-left rounded-xl border p-4 transition-all ${
                  active
                    ? "border-[#f0803e] ring-1 ring-[#f0803e] bg-[#f0803e]/5 shadow-lg"
                    : "border-slate-200 bg-white hover:border-[#f0803e]/50"
                } ${!active && !ok ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-mono font-bold ${
                      active
                        ? "bg-[#f0803e] text-white"
                        : "bg-slate-50 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {s.code}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      s.warmth === "Cold"
                        ? "bg-rose-50 text-rose-600 border border-rose-200"
                        : s.warmth === "Lukewarm"
                        ? "bg-amber-50 text-amber-600 border border-amber-200"
                        : s.warmth === "Warm"
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        : "bg-indigo-50 text-indigo-600 border border-indigo-200"
                    }`}
                  >
                    {s.warmth}
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">{s.label}</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">{s.tagline}</p>
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">RTO</span>
                    <span className="text-slate-700 font-bold">
                      {formatMinutes(s.rtoRange[0])} – {formatMinutes(s.rtoRange[1])}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">RPO</span>
                    <span className="text-slate-700 font-bold">
                      {formatMinutes(s.rpoRange[0])} – {formatMinutes(s.rpoRange[1])}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cost tier</span>
                    <span className="text-amber-600 font-bold">{s.costTier}/mo</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected strategy detail */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <h3 className="text-xs font-extrabold text-slate-900 font-mono">
              {strategy.label}
              <span className="ml-2 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-500 text-[10px] uppercase">
                {strategy.warmth} model
              </span>
            </h3>
            <span className="text-xs font-mono text-slate-500">
              Target: RTO {formatMinutes(rtoMinutes)} / RPO {formatMinutes(rpoMinutes)} —{" "}
              {meetsTarget(strategy) ? (
                <span className="text-emerald-600 font-bold">this strategy fits</span>
              ) : (
                <span className="text-rose-600 font-bold">too slow for your targets — pick warmer</span>
              )}
            </span>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">{strategy.description}</p>

          <div>
            <span className="text-[11px] font-mono uppercase text-slate-400 font-bold block mb-2">
              Key AWS Services
            </span>
            <div className="flex flex-wrap gap-2">
              {strategy.awsServices.map((svc) => (
                <span
                  key={svc}
                  className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-mono"
                >
                  {svc}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-white border border-slate-200 p-3">
              <span className="text-[10px] font-mono uppercase text-slate-400">Failover</span>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{strategy.failover}</p>
            </div>
            <div className="rounded-lg bg-white border border-slate-200 p-3">
              <span className="text-[10px] font-mono uppercase text-slate-400">Data recovery</span>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{strategy.dataRecovery}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========== MODULE 03: RECOVERY TIMELINE ========== */}
      <div
        id="dr-timeline"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-8 shadow-xl hover:border-[#f0803e]/40 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono text-amber-600 uppercase tracking-wider mb-1">
              Module 03 / Visualized Timeline
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              Recovery Timeline
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            RTO {formatMinutes(rtoMinutes)} / RPO {formatMinutes(rpoMinutes)}
          </span>
        </div>

        {/* Equation summary strip */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-mono">
            <span className="text-slate-500">
              RPO <span className="text-rose-600 font-bold">{formatMinutes(rpoMinutes)}</span>
            </span>
            <span className="text-slate-400">+</span>
            <span className="text-slate-500">
              RTO <span className="text-[#f0803e] font-bold">{formatMinutes(rtoMinutes)}</span>
            </span>
            <span className="text-slate-400">=</span>
            <span className="text-slate-700 font-bold">
              Total downtime: {formatMinutes(totalDowntime)}
            </span>
          </div>
        </div>

        {/* The bar */}
        <div className="space-y-2">
          <div className="w-full h-10 rounded-lg overflow-hidden border border-slate-200 flex">
            <div
              style={{ width: `${lossPct}%` }}
              className="bg-rose-200 border-r-2 border-rose-400 flex items-center justify-center overflow-hidden"
              title={`Data loss window (RPO): ${formatMinutes(rpoMinutes)}`}
            >
              <span className="text-[10px] font-mono font-bold text-rose-700 whitespace-nowrap px-1">
                DATA LOSS ({formatMinutes(rpoMinutes)})
              </span>
            </div>
            <div
              style={{ width: `${recoveryPct}%` }}
              className="bg-amber-200 flex items-center justify-center overflow-hidden"
              title={`Recovery window (RTO): ${formatMinutes(rtoMinutes)}`}
            >
              <span className="text-[10px] font-mono font-bold text-amber-700 whitespace-nowrap px-1">
                RECOVERY ({formatMinutes(rtoMinutes)})
              </span>
            </div>
          </div>

          {/* Markers */}
          <div className="relative h-8">
            <div
              className="absolute top-0 bottom-0 border-l-2 border-dashed border-rose-400"
              style={{ left: `${lossPct}%` }}
            />
            <div className="absolute top-0 -translate-x-full">
              <span className="text-[10px] font-mono text-slate-600 whitespace-nowrap">
                T+0 disaster
              </span>
            </div>
            <div
              className="absolute top-0 -translate-x-1/2"
              style={{ left: `${lossPct}%` }}
            >
              <span className="text-[10px] font-mono text-rose-600 bg-white px-1.5 py-0.5 rounded border border-rose-200 whitespace-nowrap">
                Recovery point (T – {formatMinutes(rpoMinutes)})
              </span>
            </div>
            <div className="absolute top-0 right-0">
              <span className="text-[10px] font-mono text-emerald-600 bg-white px-1.5 py-0.5 rounded border border-emerald-200 whitespace-nowrap">
                Restored at T+{formatMinutes(rtoMinutes)}
              </span>
            </div>
          </div>
        </div>

        {/* Step cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              step: "01",
              title: "Detect",
              desc: "Route 53 health checks and CloudWatch alarms detect the impaired region and trigger the runbook.",
              cls: "border-slate-200 bg-slate-50 text-slate-500",
            },
            {
              step: "02",
              title: "Failover",
              desc: strategy.failover,
              cls: "border-amber-200 bg-amber-50 text-amber-600",
            },
            {
              step: "03",
              title: "Recover data",
              desc: strategy.dataRecovery,
              cls: "border-[#f0803e]/30 bg-[#f0803e]/5 text-[#f0803e]",
            },
            {
              step: "04",
              title: "Verify & reroute",
              desc: strategy.verification,
              cls: "border-emerald-200 bg-emerald-50 text-emerald-600",
            },
          ].map((p) => (
            <div key={p.step} className={`rounded-xl border p-4 ${p.cls}`}>
              <div className="text-[10px] font-mono font-bold opacity-70">STEP {p.step}</div>
              <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">{p.title}</h4>
              <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ========== MODULE 04: COST vs RECOVERY TIME TRADEOFF ========== */}
      <div
        id="dr-tradeoff"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-8 shadow-xl hover:border-[#f0803e]/40 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono text-amber-600 uppercase tracking-wider mb-1">
              Module 04 / Economic Analysis
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              Cost vs Recovery Time Tradeoff
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            Plot: typical RTO against monthly cost
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scatter plot */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <svg viewBox={`0 0 ${PLOT.right + 16} ${PLOT.viewH}`} className="w-full h-auto">
              {/* sub-hour "steep" zone */}
              <rect
                x={xForMinutes(1)}
                y={PLOT.top}
                width={steepZoneWidth}
                height={PLOT.bottom - PLOT.top}
                fill="#f59e0b"
                opacity="0.06"
              />
              <text
                x={xForMinutes(30)}
                y={PLOT.bottom - 6}
                textAnchor="middle"
                fontSize="11"
                fill="#b45309"
                fontFamily="monospace"
              >
                sub-hour RTO: cost accelerates
              </text>

              {/* Y grid + labels */}
              {Y_TICKS.map((t) => (
                <g key={t}>
                  <line
                    x1={PLOT.left}
                    x2={PLOT.right}
                    y1={yForCostK(t)}
                    y2={yForCostK(t)}
                    stroke="#e2e8f0"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={PLOT.left - 8}
                    y={yForCostK(t) + 3}
                    textAnchor="end"
                    fontSize="10"
                    fill="#64748b"
                    fontFamily="monospace"
                  >
                    ${t}k
                  </text>
                </g>
              ))}

              {/* X grid + labels */}
              {X_TICKS.map((t) => (
                <g key={t.m}>
                  <line
                    x1={xForMinutes(t.m)}
                    x2={xForMinutes(t.m)}
                    y1={PLOT.top}
                    y2={PLOT.bottom}
                    stroke="#e2e8f0"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={xForMinutes(t.m)}
                    y={PLOT.bottom + 14}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#64748b"
                    fontFamily="monospace"
                  >
                    {t.label}
                  </text>
                </g>
              ))}

              {/* Axis captions */}
              <text
                x={(PLOT.left + PLOT.right) / 2}
                y={PLOT.bottom + 32}
                textAnchor="middle"
                fontSize="11"
                fill="#475569"
                fontFamily="monospace"
              >
                Typical RTO (minutes, log scale)
              </text>
              <text
                x={10}
                y={(PLOT.top + PLOT.bottom) / 2}
                textAnchor="middle"
                fontSize="11"
                fill="#475569"
                fontFamily="monospace"
                transform={`rotate(-90 10 ${(PLOT.top + PLOT.bottom) / 2})`}
              >
                Monthly cost ($k)
              </text>

              {/* Tradeoff curve + your RTO marker */}
              <polyline
                points={plotPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <line
                x1={targetX}
                x2={targetX}
                y1={PLOT.top}
                y2={PLOT.bottom}
                stroke="#ff9900"
                strokeWidth="2"
                strokeDasharray="6 3"
              />
              <text
                x={targetX}
                y={PLOT.top - 8}
                textAnchor={targetX > PLOT.right - 90 ? "end" : "start"}
                fontSize="11"
                fill="#d97706"
                fontFamily="monospace"
                fontWeight="bold"
              >
                your RTO: {formatMinutes(rtoMinutes)}
              </text>

              {/* Strategy points */}
              {plotPoints.map(({ s, x, y }) => {
                const selected = s.id === strategyKey;
                const viable = meetsTarget(s);
                const fill = viable ? (selected ? "#ff9900" : "#22c55e") : "#f43f5e";
                const labelAnchor = s.id === "backup-restore" ? "end" : "start";
                const labelX = s.id === "backup-restore" ? x - 10 : x + 10;
                return (
                  <g key={s.id}>
                    <circle cx={x} cy={y} r={selected ? 8 : 6} fill={fill} stroke="#ffffff" strokeWidth="2">
                      <title>{`${s.label} — best RTO ${formatMinutes(s.rtoRange[0])}, ${(s.baseCost / 1000).toFixed(1)}k USD/mo`}</title>
                    </circle>
                    <text
                      x={labelX}
                      y={y - 6}
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight={selected ? "bold" : "normal"}
                      fill={selected ? "#b45309" : "#475569"}
                      textAnchor={labelAnchor}
                    >
                      {s.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div className="flex flex-wrap gap-4 mt-2 text-[11px] font-mono text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#22c55e]" /> Meets your RTO
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#f43f5e]" /> Exceeds your RTO
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#ff9900] ring-2 ring-white" /> Selected strategy
              </span>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="text-xs font-mono font-bold text-slate-900">
                  Estimated Monthly Cost — {strategy.label}
                </h4>
                <span className="text-[#f0803e] font-mono font-bold">
                  ${monthlyCost.toLocaleString()}
                </span>
              </div>

              {(
                [
                  { key: "availability", label: "Compute & availability (RTO-driven)", color: "bg-[#f0803e]" },
                  { key: "replication", label: "Data replication (RPO-driven)", color: "bg-amber-400" },
                  { key: "storage", label: "Storage & backups", color: "bg-amber-200" },
                ] as const
              ).map((row) => {
                const base = strategy.costBreakdown[row.key];
                const scaled =
                  row.key === "availability"
                    ? base * computeScaleFactor
                    : row.key === "replication"
                    ? base * replicationFactor
                    : base;
                const pct = (scaled / monthlyCost) * 100;
                return (
                  <div key={row.key}>
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                      <span className="text-slate-500">{row.label}</span>
                      <span className="text-slate-700 font-bold">
                        ${Math.round(scaled).toLocaleString()} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-white border border-slate-200 overflow-hidden">
                      <div className={`h-full ${row.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-between pt-3 border-t border-slate-200 text-[11px] font-mono text-slate-500">
                <span>Annual TCO projection</span>
                <span className="text-slate-900 font-bold">${annualCost.toLocaleString()}/yr</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Model: replication cost scales with freshness (typical RPO {formatMinutes(strategy.rpoTypical)}{" "}
              ÷ your RPO {formatMinutes(rpoMinutes)}, clamped 0.5–4×) and compute cost +15% when your
              RTO target {formatMinutes(rtoMinutes)} is below the strategy&#39;s typical{" "}
              {formatMinutes(strategy.rtoTypical)}. Faster recovery is always the expensive
              direction — the slope steepens hard below the 1-hour mark.
            </p>
          </div>
        </div>

        {/* Comparison table */}
        <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3">
            <h4 className="text-xs font-mono font-bold text-slate-900">Strategy Comparison Matrix</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="p-3 text-left">Strategy</th>
                  <th className="p-3 text-left">Best-case RTO</th>
                  <th className="p-3 text-left">Best-case RPO</th>
                  <th className="p-3 text-left">Cost tier</th>
                  <th className="p-3 text-left">Data replication approach</th>
                </tr>
              </thead>
              <tbody>
                {STRATEGY_ORDER.map((k) => {
                  const s = STRATEGIES[k];
                  const selected = s.id === strategyKey;
                  return (
                    <tr
                      key={k}
                      className={`border-b border-slate-100 last:border-0 transition-colors ${
                        selected ? "bg-[#f0803e]/5" : "hover:bg-slate-50/50"
                      }`}
                    >
                      <td className="p-3">
                        <span className="font-bold text-slate-900">{s.label}</span>
                        {selected && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-[#f0803e] text-white text-[9px] font-bold">
                            SELECTED
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600">
                        {formatMinutes(s.rtoRange[0])} – {formatMinutes(s.rtoRange[1])}
                      </td>
                      <td className="p-3 text-slate-600">
                        {formatMinutes(s.rpoRange[0])} – {formatMinutes(s.rpoRange[1])}
                      </td>
                      <td className="p-3">
                        <span className="text-amber-600 font-bold">{s.costTier}</span>
                        <span className="text-slate-400">/mo · {(s.baseCost / 1000).toFixed(1)}k</span>
                      </td>
                      <td className="p-3 text-slate-500">{s.tagline}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}