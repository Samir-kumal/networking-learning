"use client";

import { useState } from "react";

// ==========================================
// TYPES & INTERFACES
// ==========================================

type RegionCode = "us-east-1" | "us-west-2" | "eu-west-1";
type PaymentOption = "All Upfront" | "Partial Upfront" | "No Upfront";
type CommitmentTerm = 1 | 3;

interface RegionPricing {
  code: RegionCode;
  name: string;
  /** m5.large On-Demand hourly rate (USD) */
  onDemandHourly: number;
  /** Spot price as a fraction of On-Demand (representative current discount) */
  spotFactor: number;
}

// ==========================================
// PRICING DATA (m5.large — 2 vCPU / 8 GiB)
// ==========================================

const HOURS_PER_MONTH = 730;

const REGIONS: RegionPricing[] = [
  {
    code: "us-east-1",
    name: "US East (N. Virginia)",
    onDemandHourly: 0.096,
    spotFactor: 0.3, // ~70% cheaper than On-Demand
  },
  {
    code: "us-west-2",
    name: "US West (Oregon)",
    onDemandHourly: 0.096,
    spotFactor: 0.35, // ~65% cheaper than On-Demand
  },
  {
    code: "eu-west-1",
    name: "EU West (Ireland)",
    onDemandHourly: 0.108,
    spotFactor: 0.38, // ~62% cheaper than On-Demand
  },
];

// Effective RI hourly rate as a fraction of On-Demand, per term + payment option
const RI_FACTORS: Record<PaymentOption, Record<CommitmentTerm, number>> = {
  "All Upfront": { 1: 0.66, 3: 0.48 },
  "Partial Upfront": { 1: 0.68, 3: 0.5 },
  "No Upfront": { 1: 0.7, 3: 0.52 },
};

// Fraction of the total term cost billed upfront for each payment option
const UPFRONT_RATIO: Record<PaymentOption, number> = {
  "All Upfront": 1,
  "Partial Upfront": 0.4,
  "No Upfront": 0,
};

const PAYMENT_OPTIONS: PaymentOption[] = [
  "All Upfront",
  "Partial Upfront",
  "No Upfront",
];

// ==========================================
// FORMATTING HELPERS
// ==========================================

const fmtUSD0 = (v: number) =>
  v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const fmtUSD3 = (v: number) =>
  v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

// ==========================================
// COMPONENT
// ==========================================

export default function AwsCostSection() {
  const [instanceCount, setInstanceCount] = useState<number>(10);
  const [regionIndex, setRegionIndex] = useState<number>(0);
  const [term, setTerm] = useState<CommitmentTerm>(1);
  const [payment, setPayment] = useState<PaymentOption>("All Upfront");

  const region = REGIONS[regionIndex];

  // ---- Derived pricing (whole fleet) ----
  const odHourly = region.onDemandHourly;
  const riFactor = RI_FACTORS[payment][term];
  const spotFactor = region.spotFactor;

  const monthlyOD = odHourly * HOURS_PER_MONTH * instanceCount;
  const monthlyRI = odHourly * riFactor * HOURS_PER_MONTH * instanceCount;
  const monthlySpot = odHourly * spotFactor * HOURS_PER_MONTH * instanceCount;

  const annualOD = monthlyOD * 12;
  const annualRI = monthlyRI * 12;
  const annualSpot = monthlySpot * 12;

  // Reserved term-cost breakdown (upfront portion vs monthly bill during term)
  const termMonths = term * 12;
  const upfrontPayment = monthlyRI * termMonths * UPFRONT_RATIO[payment];
  const remainingMonthly = monthlyRI * (1 - UPFRONT_RATIO[payment]);
  const riTermTotal = upfrontPayment + remainingMonthly * termMonths;

  // Same-term projections for On-Demand / Spot so the comparison is apples-to-apples
  const odTermTotal = monthlyOD * termMonths;
  const spotTermTotal = monthlySpot * termMonths;

  const riSavingsPct = (1 - riFactor) * 100;
  const spotSavingsPct = (1 - spotFactor) * 100;

  const bars = [
    {
      key: "od",
      label: "On-Demand",
      sub: "Pay per second, no commitment",
      monthly: monthlyOD,
      pct: 100,
      barClass: "bg-slate-300 dark:bg-slate-600",
      savings: null as number | null,
    },
    {
      key: "ri",
      label: "Reserved Instance",
      sub: `${term}-year · ${payment}`,
      monthly: monthlyRI,
      pct: (monthlyRI / monthlyOD) * 100,
      barClass: "bg-[#f0883e]",
      savings: riSavingsPct,
    },
    {
      key: "spot",
      label: "Spot Instance",
      sub: "Fault-tolerant / flexible workloads",
      monthly: monthlySpot,
      pct: (monthlySpot / monthlyOD) * 100,
      barClass: "bg-[#ffa657]",
      savings: spotSavingsPct,
    },
  ];

  // Cheapest option this month
  const cheapest = monthlyRI <= monthlySpot ? bars[1] : bars[2];

  return (
    <section id="aws-cost" className="scroll-mt-24 space-y-6">
      {/* ============ Section Header ============ */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#f0883e]/10 text-[#f0883e] border border-[#f0883e]/30 text-xs font-mono font-bold shrink-0">
          AWS · COST OPTIMIZATION
        </span>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            EC2 Pricing Calculator — On-Demand vs Reserved vs Spot
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Slide the fleet size, pick a region and commitment, then watch the
            live monthly / annual cost comparison. Reserved Instances trade
            flexibility for up to{" "}
            <span className="text-[#f0883e] font-semibold">
              52% savings
            </span>{" "}
            (3-yr All Upfront); Spot adds another discount layer but instances
            can be reclaimed at any time.
          </p>
        </div>
      </div>

      {/* ============ Pricing Controls ============ */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-4">
          <div>
            <div className="text-xs font-mono text-[#f0883e] uppercase tracking-wider mb-1">
              Pricing Controls
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Fleet Configuration — m5.large (2 vCPU / 8 GiB)
            </h4>
          </div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#f0883e]" />
            {instanceCount} × {region.code}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Instance Count Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Instance Count
              </label>
              <span className="px-2 py-0.5 rounded bg-[#f0883e]/10 text-[#f0883e] border border-[#f0883e]/30 text-xs font-mono font-bold">
                {instanceCount}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={instanceCount}
              onChange={(e) => setInstanceCount(Number(e.target.value))}
              className="w-full accent-[#f0883e]"
              aria-label="EC2 instance count"
            />
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1">
              <span>1</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          {/* Region Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Region
              </label>
              <span className="px-2 py-0.5 rounded bg-[#f0883e]/10 text-[#f0883e] border border-[#f0883e]/30 text-xs font-mono font-bold">
                {region.code}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={REGIONS.length - 1}
              step={1}
              value={regionIndex}
              onChange={(e) => setRegionIndex(Number(e.target.value))}
              className="w-full accent-[#f0883e]"
              aria-label="AWS region"
            />
            <div className="grid grid-cols-3 text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1">
              {REGIONS.map((r) => (
                <span
                  key={r.code}
                  className={
                    r.code === region.code
                      ? "text-[#f0883e] font-bold text-center"
                      : "text-center"
                  }
                >
                  {r.code}
                </span>
              ))}
            </div>
          </div>

          {/* Commitment Term Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Commitment Term
              </label>
              <span className="px-2 py-0.5 rounded bg-[#f0883e]/10 text-[#f0883e] border border-[#f0883e]/30 text-xs font-mono font-bold">
                {term}-Year
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={2}
              value={term}
              onChange={(e) => setTerm(Number(e.target.value) as CommitmentTerm)}
              className="w-full accent-[#f0883e]"
              aria-label="Reserved instance commitment term"
            />
            <div className="grid grid-cols-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1">
              <span className={term === 1 ? "text-[#f0883e] font-bold" : ""}>
                1 Year
              </span>
              <span className={`text-right ${term === 3 ? "text-[#f0883e] font-bold" : ""}`}>
                3 Years
              </span>
            </div>
          </div>
        </div>

        {/* Payment Option Segmented Control */}
        <div>
          <label className="block text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Reserved Payment Option
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PAYMENT_OPTIONS.map((option) => {
              const isActive = option === payment;
              return (
                <button
                  key={option}
                  onClick={() => setPayment(option)}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#f0883e]/20 text-[#f0883e] border-[#f0883e]/40 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-800 hover:border-[#f0883e]/40"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
            All Upfront = 100% of term billed now · Partial Upfront = 40% now,
            60% spread across the term · No Upfront = fully billed monthly.
          </p>
        </div>
      </div>

      {/* ============ Live Cost Comparison ============ */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
          <div className="text-xs font-mono text-[#f0883e] uppercase tracking-wider mb-1">
            Live Comparison
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Monthly Spend — {instanceCount} × m5.large @ {region.code}
          </h4>
        </div>

        {/* Horizontal Bar Visualization */}
        <div className="space-y-4">
          {bars.map((bar) => (
            <div key={bar.key}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0 inline-block bg-current" style={{ color: bar.key === "od" ? "#94a3b8" : bar.key === "ri" ? "#f0883e" : "#ffa657" }} />
                  <span className="font-bold text-slate-900 dark:text-slate-100">{bar.label}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono hidden sm:inline">
                    {bar.sub}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {fmtUSD0(bar.monthly)}/mo
                  </span>
                  {bar.savings !== null && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 text-[10px] font-mono font-bold">
                      −{bar.savings.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${bar.barClass}`}
                  style={{ width: `${Math.max(bar.pct, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Cheapest Option Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#f0883e]/10 to-[#ffa657]/10 border border-[#f0883e]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏆</span>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Best pick: {cheapest.label} saves{" "}
                {cheapest.savings !== null ? `${cheapest.savings.toFixed(0)}%` : "0%"} vs
                On-Demand
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {cheapest.key === "ri"
                  ? `Lock in ${term}-year pricing with ${payment.toLowerCase()} — ideal for predictable, always-on production fleets.`
                  : "Spot pricing is ideal for stateless, fault-tolerant or batch workloads that tolerate interruptions."}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase">
              Est. monthly
            </div>
            <div className="text-xl font-extrabold font-mono text-[#f0883e]">
              {fmtUSD0(cheapest.monthly)}
            </div>
          </div>
        </div>

        {/* Summary Strip: Monthly / Annual / Savings */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
            <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase mb-1">
              Reserved — Monthly / Annual
            </div>
            <div className="text-lg font-extrabold font-mono text-[#f0883e]">
              {fmtUSD0(monthlyRI)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {fmtUSD0(annualRI)}/yr
            </div>
            <div className="mt-2 inline-flex px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 text-[10px] font-mono font-bold">
              SAVES {riSavingsPct.toFixed(0)}% vs ON-DEMAND
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
            <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase mb-1">
              Spot — Monthly / Annual
            </div>
            <div className="text-lg font-extrabold font-mono text-[#ffa657]">
              {fmtUSD0(monthlySpot)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {fmtUSD0(annualSpot)}/yr
            </div>
            <div className="mt-2 inline-flex px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 text-[10px] font-mono font-bold">
              SAVES {spotSavingsPct.toFixed(0)}% vs ON-DEMAND
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 card-shadow">
            <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase mb-1">
              On-Demand Baseline
            </div>
            <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-slate-100">
              {fmtUSD0(monthlyOD)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {fmtUSD0(annualOD)}/yr
            </div>
            <div className="mt-2 inline-flex px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[10px] font-mono">
              NO COMMITMENT
            </div>
          </div>
        </div>
      </div>

      {/* ============ Term Projection & Billing Detail ============ */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
          <div className="text-xs font-mono text-[#f0883e] uppercase tracking-wider mb-1">
            Term Projection
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {term}-Year Total Cost of Ownership — {instanceCount} × m5.large
          </h4>
        </div>

        {/* Reserved payment breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
            <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase mb-1">
              Upfront Payment ({payment})
            </div>
            <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-slate-100">
              {UPFRONT_RATIO[payment] > 0 ? fmtUSD0(upfrontPayment) : "$0"}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500">
              {UPFRONT_RATIO[payment] > 0
                ? `${(UPFRONT_RATIO[payment] * 100).toFixed(0)}% of term billed today`
                : "Nothing billed today"}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
            <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase mb-1">
              Monthly Bill During Term
            </div>
            <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-slate-100">
              {fmtUSD0(remainingMonthly)}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500">
              {UPFRONT_RATIO[payment] === 1
                ? "Covered by upfront payment"
                : `${(termMonths).toFixed(0)} × ${fmtUSD0(remainingMonthly)}`}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
            <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase mb-1">
              Effective Hourly / Instance
            </div>
            <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-slate-100">
              {fmtUSD3(odHourly * riFactor)}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500">
              vs {fmtUSD3(odHourly)} On-Demand
            </div>
          </div>
        </div>

        {/* TCO table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="p-3">Model</th>
                <th className="p-3 text-right">Per-Instance Hourly</th>
                <th className="p-3 text-right">Per-Instance Monthly</th>
                <th className="p-3 text-right">{term}-Year Total (Fleet)</th>
                <th className="p-3 text-right">Savings vs On-Demand</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <td className="p-3 font-bold text-slate-900 dark:text-slate-100">On-Demand</td>
                <td className="p-3 text-right text-slate-600 dark:text-slate-300">{fmtUSD3(odHourly)}</td>
                <td className="p-3 text-right text-slate-600 dark:text-slate-300">{fmtUSD3(odHourly * HOURS_PER_MONTH)}</td>
                <td className="p-3 text-right text-slate-900 dark:text-slate-100 font-bold">{fmtUSD0(odTermTotal)}</td>
                <td className="p-3 text-right text-slate-400 dark:text-slate-500">—</td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <td className="p-3 font-bold text-[#f0883e]">
                  Reserved ({term}yr · {payment})
                </td>
                <td className="p-3 text-right text-slate-600 dark:text-slate-300">{fmtUSD3(odHourly * riFactor)}</td>
                <td className="p-3 text-right text-slate-600 dark:text-slate-300">{fmtUSD3(odHourly * riFactor * HOURS_PER_MONTH)}</td>
                <td className="p-3 text-right text-[#f0883e] font-bold">{fmtUSD0(riTermTotal)}</td>
                <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                  −{riSavingsPct.toFixed(0)}%
                </td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-[#ffa657]">Spot</td>
                <td className="p-3 text-right text-slate-600 dark:text-slate-300">{fmtUSD3(odHourly * spotFactor)}</td>
                <td className="p-3 text-right text-slate-600 dark:text-slate-300">{fmtUSD3(odHourly * spotFactor * HOURS_PER_MONTH)}</td>
                <td className="p-3 text-right text-[#ffa657] font-bold">{fmtUSD0(spotTermTotal)}</td>
                <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                  −{spotSavingsPct.toFixed(0)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* When to use which */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
              <span>🕐</span> On-Demand
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Short-term spikes, dev/test environments, unknown or elastic
              workloads. Highest flexibility, highest price.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#f0883e]/5 border border-[#f0883e]/20">
            <div className="text-xs font-bold text-[#f0883e] mb-1 flex items-center gap-1.5">
              <span>🔒</span> Reserved Instances
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Predictable, always-on production fleets (24×7 baselines).
              Upfront payment = bigger discount; 3-yr beats 1-yr; savings
              continue across the entire term.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#ffa657]/5 border border-[#ffa657]/20">
            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1.5">
              <span>⚡</span> Spot Instances
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Batch jobs, CI runners, stateless web tiers that survive
              interruptions. AWS can reclaim capacity with 2-minute notice —
              never run your only database on Spot.
            </p>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 dark:text-slate-500">
          Prices approximate public m5.large rates for educational comparison;
          Spot factors are representative discounts, not live market bids.
          Regional On-Demand: {REGIONS.map((r) => `${r.code} ${fmtUSD3(r.onDemandHourly)}/hr`).join(" · ")}.
        </p>
      </div>
    </section>
  );
}
