"use client";

import { useMemo, useState } from "react";
import {
  evaluateThreatModel,
  type Severity,
  type ThreatFinding,
} from "@/lib/security-evaluators";

type Asset =
  | "web-api"
  | "database"
  | "object-storage"
  | "identity-provider"
  | "message-queue";

type SelectedAsset = Asset | "";

const ASSET_OPTIONS: Array<{ value: Asset; label: string; description: string }> = [
  { value: "web-api", label: "Web API", description: "Public request and application boundary" },
  { value: "database", label: "Database", description: "Persistent records and business state" },
  { value: "object-storage", label: "Object storage", description: "Buckets, files, and backups" },
  { value: "identity-provider", label: "Identity provider", description: "Authentication and role assignment" },
  { value: "message-queue", label: "Message queue", description: "Asynchronous producers and consumers" },
];

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const SEVERITY_CLASSES: Record<Severity, string> = {
  critical: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700",
  high: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700",
  medium: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
  low: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700",
};

function titleCase(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function SecThreatModelSection() {
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset>("web-api");
  const [mitigations, setMitigations] = useState<string[]>([]);

  const mitigationSet = useMemo(() => new Set(mitigations), [mitigations]);
  const findings = useMemo<ThreatFinding[]>(
    () => (selectedAsset ? evaluateThreatModel(selectedAsset, mitigationSet) : []),
    [mitigationSet, selectedAsset],
  );

  const mitigationOptions = useMemo(
    () => Array.from(new Map(findings.map((finding) => [finding.mitigation, finding])).values()),
    [findings],
  );

  const riskSummary = useMemo(() => {
    const residualScore = findings.reduce(
      (score, finding) => score + (finding.mitigated ? 0 : SEVERITY_WEIGHT[finding.severity]),
      0,
    );
    const maximumScore = findings.reduce(
      (score, finding) => score + SEVERITY_WEIGHT[finding.severity],
      0,
    );
    const openFindings = findings.filter((finding) => !finding.mitigated);
    const criticalOrHigh = openFindings.filter(
      (finding) => finding.severity === "critical" || finding.severity === "high",
    ).length;
    const band = residualScore === 0 ? "Low" : residualScore <= 5 ? "Moderate" : "High";

    return { residualScore, maximumScore, openFindings: openFindings.length, criticalOrHigh, band };
  }, [findings]);

  const handleAssetChange = (value: SelectedAsset) => {
    setSelectedAsset(value);
    setMitigations([]);
  };

  const toggleMitigation = (mitigation: string) => {
    setMitigations((current) =>
      current.includes(mitigation)
        ? current.filter((item) => item !== mitigation)
        : [...current, mitigation],
    );
  };

  return (
    <section id="sec-threat-model" className="scroll-mt-20 space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-mono font-semibold text-rose-700 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          S5 · STRIDE Threat Modeling
        </span>
        <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">Threat model canvas</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Select an architecture asset, apply mitigations, and compare the remaining STRIDE findings.
          The severity weights and residual-risk bands are a deterministic teaching heuristic, not a
          formal risk assessment or a guarantee that a control removes every threat.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div>
            <label htmlFor="sec-threat-asset" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Architecture asset
            </label>
            <select
              id="sec-threat-asset"
              value={selectedAsset}
              onChange={(event) => handleAssetChange(event.target.value as SelectedAsset)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="">No asset selected</option>
              {ASSET_OPTIONS.map((asset) => (
                <option key={asset.value} value={asset.value}>
                  {asset.label}
                </option>
              ))}
            </select>
            {selectedAsset && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {ASSET_OPTIONS.find((asset) => asset.value === selectedAsset)?.description}
              </p>
            )}
          </div>

          {selectedAsset ? (
            <fieldset>
              <legend className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">Applied mitigations</legend>
              <div className="space-y-2">
                {mitigationOptions.map((finding) => (
                  <label
                    key={finding.mitigation}
                    className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                  >
                    <input
                      type="checkbox"
                      checked={mitigations.includes(finding.mitigation)}
                      onChange={() => toggleMitigation(finding.mitigation)}
                      className="mt-0.5 accent-indigo-600"
                    />
                    <span>
                      <span className="block font-semibold text-slate-800 dark:text-slate-200">{titleCase(finding.mitigation)}</span>
                      <span className="mt-0.5 block text-slate-500 dark:text-slate-400">Addresses {finding.threat}.</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
              Choose an asset to load its threat findings. No risk is evaluated while the canvas is empty.
            </div>
          )}
        </div>

        {selectedAsset ? (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-700">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{ASSET_OPTIONS.find((asset) => asset.value === selectedAsset)?.label} findings</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">STRIDE threats ordered by severity.</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right dark:border-slate-700 dark:bg-slate-700">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Residual risk</span>
                <span className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100">{riskSummary.band}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700">
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">Risk score</span>
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">{riskSummary.residualScore} / {riskSummary.maximumScore}</span>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700">
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">Open findings</span>
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">{riskSummary.openFindings}</span>
              </div>
              <div className="col-span-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-700">
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">High or critical remaining</span>
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">{riskSummary.criticalOrHigh}</span>
              </div>
            </div>

            <div className="grid gap-3">
              {findings.map((finding) => (
                <article key={finding.threat} className={`rounded-lg border p-4 ${finding.mitigated ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-900/30" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100">{finding.threat}</h5>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_CLASSES[finding.severity]}`}>
                        {finding.severity}
                      </span>
                      <span className={`text-[10px] font-semibold ${finding.mitigated ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400"}`}>
                        {finding.mitigated ? "Mitigated" : "Open"}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{finding.rationale}</p>
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Control:</span> {titleCase(finding.mitigation)}
                  </p>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div role="status" className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400">
            Select an asset to see STRIDE finding cards and a residual-risk summary.
          </div>
        )}
      </div>
    </section>
  );
}
