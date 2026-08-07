"use client";

import { useState } from "react";
import { scoreIncidentResponse, type Severity } from "@/lib/security-evaluators";

type AlertScenario = {
  id: string;
  title: string;
  source: string;
  summary: string;
  indicators: string[];
};

type LifecycleStep = "preparation" | "identify" | "contain" | "eradicate" | "recover" | "lessons-learned";
type IncidentResult = { score: number; priority: string; nextAction: string };

const ALERT_SCENARIOS: AlertScenario[] = [
  {
    id: "credential-stuffing",
    title: "Credential stuffing burst",
    source: "Identity gateway",
    summary: "A concentrated authentication failure pattern is targeting several customer accounts from rotating source addresses.",
    indicators: ["78 failed sign-ins in 10 minutes", "12 accounts targeted", "No successful privileged login observed"],
  },
  {
    id: "container-execution",
    title: "Unexpected container execution",
    source: "Runtime workload monitor",
    summary: "A production workload launched a shell process that is outside its approved process profile.",
    indicators: ["Shell spawned by API worker", "Image digest differs from deployment record", "Outbound connection to an unclassified host"],
  },
  {
    id: "impossible-travel",
    title: "Impossible travel sign-in",
    source: "Identity risk engine",
    summary: "The same user session appears in two distant regions within a time window that is not physically plausible.",
    indicators: ["Two regions 6,400 km apart", "Session token reused across devices", "Privileged console accessed after sign-in"],
  },
];

const LIFECYCLE_STEPS: Array<{ value: LifecycleStep; label: string; description: string }> = [
  { value: "preparation", label: "Preparation", description: "Confirm playbook, roles, and communication channel." },
  { value: "identify", label: "Identify", description: "Validate the alert and define incident scope." },
  { value: "contain", label: "Contain", description: "Limit spread while preserving the investigation." },
  { value: "eradicate", label: "Eradicate", description: "Remove persistence and the underlying cause." },
  { value: "recover", label: "Recover", description: "Restore trusted service and monitor closely." },
  { value: "lessons-learned", label: "Lessons learned", description: "Document findings and preventive improvements." },
];

const SEVERITY_OPTIONS: Array<{ value: Severity; label: string; description: string }> = [
  { value: "critical", label: "Critical", description: "Material impact or active compromise of critical services." },
  { value: "high", label: "High", description: "Likely compromise or significant business impact." },
  { value: "medium", label: "Medium", description: "Contained impact requiring coordinated response." },
  { value: "low", label: "Low", description: "Limited impact with no evidence of material compromise." },
];

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "border-rose-200 bg-rose-50 text-rose-800",
  high: "border-orange-200 bg-orange-50 text-orange-800",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  low: "border-sky-200 bg-sky-50 text-sky-800",
};

export default function SecIncidentResponseSection() {
  const [scenarioId, setScenarioId] = useState(ALERT_SCENARIOS[0].id);
  const [severity, setSeverity] = useState<Severity>("high");
  const [affectedAssets, setAffectedAssets] = useState(2);
  const [contained, setContained] = useState(false);
  const [evidencePreserved, setEvidencePreserved] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<LifecycleStep[]>(["preparation", "identify"]);
  const [result, setResult] = useState<IncidentResult | null>(null);

  const scenario = ALERT_SCENARIOS.find((item) => item.id === scenarioId) ?? ALERT_SCENARIOS[0];

  const toggleLifecycleStep = (step: LifecycleStep) => {
    setCompletedSteps((current) => current.includes(step) ? current.filter((item) => item !== step) : [...current, step]);
  };

  const handleScore = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult(scoreIncidentResponse({
      severity,
      contained,
      evidencePreserved,
      affectedAssets,
      lifecycleStepsCompleted: completedSteps,
    }));
  };

  return (
    <section id="sec-incident-response" className="scroll-mt-20 space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-mono font-semibold text-amber-700">
          S9 · Incident Response &amp; SOC Triage
        </span>
        <h3 className="mt-2 text-lg font-bold text-slate-900">Seeded alert investigation</h3>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">
          Practice a repeatable incident lifecycle against safe, synthetic alerts. Classify the signal, preserve evidence, contain affected assets, and score response readiness with the shared evaluator.
        </p>
      </div>

      <form onSubmit={handleScore} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <label htmlFor="sec-ir-scenario" className="mb-1 block text-xs font-semibold text-slate-700">Alert scenario</label>
            <select
              id="sec-ir-scenario"
              value={scenarioId}
              onChange={(event) => setScenarioId(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900"
            >
              {ALERT_SCENARIOS.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-900">{scenario.title}</h4>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-mono font-semibold text-slate-600">{scenario.source}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{scenario.summary}</p>
            <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
              {scenario.indicators.map((indicator) => <li key={indicator} className="flex gap-2"><span className="text-amber-600">•</span><span>{indicator}</span></li>)}
            </ul>
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-slate-700">Severity classification</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {SEVERITY_OPTIONS.map((option) => (
                <label key={option.value} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-xs transition-colors ${severity === option.value ? SEVERITY_STYLES[option.value] : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  <input
                    type="radio"
                    name="sec-ir-severity"
                    value={option.value}
                    checked={severity === option.value}
                    onChange={() => setSeverity(option.value)}
                    className="mt-0.5 accent-amber-600"
                  />
                  <span><span className="block font-semibold">{option.label}</span><span className="mt-0.5 block text-[11px] opacity-80">{option.description}</span></span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="sec-ir-assets" className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Affected asset count</span><span className="font-mono text-amber-700">{affectedAssets}</span>
            </label>
            <input id="sec-ir-assets" type="range" min="0" max="10" value={affectedAssets} onChange={(event) => setAffectedAssets(Number(event.target.value))} className="w-full accent-amber-600" />
            <div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>0 assets</span><span>10 assets</span></div>
          </div>

          <div className="space-y-2">
            <label htmlFor="sec-ir-contained" className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <input id="sec-ir-contained" type="checkbox" checked={contained} onChange={(event) => setContained(event.target.checked)} className="mt-0.5 accent-emerald-600" />
              <span><span className="block font-semibold text-slate-800">Containment complete</span><span className="mt-0.5 block text-slate-500">Affected assets are isolated without destroying evidence.</span></span>
            </label>
            <label htmlFor="sec-ir-evidence" className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <input id="sec-ir-evidence" type="checkbox" checked={evidencePreserved} onChange={(event) => setEvidencePreserved(event.target.checked)} className="mt-0.5 accent-emerald-600" />
              <span><span className="block font-semibold text-slate-800">Forensic evidence preserved</span><span className="mt-0.5 block text-slate-500">Capture logs, volatile context, and chain-of-custody details before eradication.</span></span>
            </label>
          </div>

          <button type="submit" className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700">Score response readiness</button>
        </div>

        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-slate-700">Incident lifecycle</legend>
            <div className="space-y-2">
              {LIFECYCLE_STEPS.map((step, index) => (
                <label key={step.value} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-xs text-slate-700 hover:bg-slate-50">
                  <input type="checkbox" checked={completedSteps.includes(step.value)} onChange={() => toggleLifecycleStep(step.value)} className="mt-0.5 accent-amber-600" />
                  <span className="flex-1"><span className="flex items-center gap-2 font-semibold text-slate-800"><span className="font-mono text-[10px] text-slate-400">{String(index + 1).padStart(2, "0")}</span>{step.label}</span><span className="mt-0.5 block text-slate-500">{step.description}</span></span>
                </label>
              ))}
            </div>
          </fieldset>

          {result ? (
            <div role="status" aria-live="polite" className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Evaluator-backed response result</p><p className="mt-1 text-2xl font-bold text-slate-900">{result.score}<span className="text-sm font-medium text-slate-500"> / 100</span></p></div><span className="rounded-full bg-amber-600 px-3 py-1.5 text-sm font-bold text-white">{result.priority}</span></div>
              <dl className="mt-4 space-y-2 text-xs"><div><dt className="font-semibold text-slate-700">Priority</dt><dd className="mt-0.5 text-slate-600">{result.priority} response priority based on severity, containment, evidence, scope, and lifecycle progress.</dd></div><div><dt className="font-semibold text-slate-700">Next action</dt><dd className="mt-0.5 leading-relaxed text-slate-600">{result.nextAction}</dd></div></dl>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">Complete the controls, then score the response to see priority and the evaluator&rsquo;s next action.</p>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">SOC handoff checklist</p>
            <ul className="mt-2 space-y-1.5"><li>• Keep alert notes factual and timestamped.</li><li>• Preserve evidence before removing persistence.</li><li>• Escalate based on business impact, not signal volume alone.</li></ul>
          </div>
        </div>
      </form>
    </section>
  );
}
