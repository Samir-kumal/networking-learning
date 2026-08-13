"use client";

import { useState } from "react";
import { evaluateZeroTrustRequest } from "@/lib/security-evaluators";

type SourceZone = "internet" | "workforce" | "workload" | "partner";
type DestinationZone = "public" | "application" | "data" | "management" | "third-party";
type Action = "read" | "write" | "export" | "administer";
type ZeroTrustEvaluation = {
  decision: "ALLOW" | "STEP_UP" | "DENY";
  reason: string;
};

type Option<T extends string> = { value: T; label: string; description: string };

const SOURCE_OPTIONS: Array<Option<SourceZone>> = [
  { value: "internet", label: "Internet", description: "Untrusted public origin" },
  { value: "workforce", label: "Workforce", description: "Managed employee access zone" },
  { value: "workload", label: "Workload", description: "Service-to-service origin" },
  { value: "partner", label: "Partner", description: "Federated partner network" },
];

const DESTINATION_OPTIONS: Array<Option<DestinationZone>> = [
  { value: "public", label: "Public", description: "Publicly reachable service" },
  { value: "application", label: "Application", description: "Internal application tier" },
  { value: "data", label: "Data", description: "Sensitive data store" },
  { value: "management", label: "Management", description: "Administrative control plane" },
  { value: "third-party", label: "Third-party", description: "External service integration" },
];

const ACTION_OPTIONS: Array<Option<Action>> = [
  { value: "read", label: "Read", description: "Retrieve permitted information" },
  { value: "write", label: "Write", description: "Create or change application state" },
  { value: "export", label: "Export", description: "Move data beyond the trust boundary" },
  { value: "administer", label: "Administer", description: "Change configuration or access policy" },
];

const DECISION_STYLES: Record<ZeroTrustEvaluation["decision"], string> = {
  ALLOW: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  STEP_UP: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  DENY: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

const PATH_CARDS = [
  { key: "source", title: "Source zone", detail: "Request origin" },
  { key: "policy", title: "Policy engine", detail: "Verify every signal" },
  { key: "destination", title: "Destination zone", detail: "Protected resource" },
] as const;

function decisionLabel(decision: ZeroTrustEvaluation["decision"]): string {
  if (decision === "STEP_UP") return "STEP-UP MFA";
  return decision;
}

export default function SecZeroTrustSection() {
  const [identityVerified, setIdentityVerified] = useState(true);
  const [deviceCompliant, setDeviceCompliant] = useState(true);
  const [sourceZone, setSourceZone] = useState<SourceZone>("workforce");
  const [destination, setDestination] = useState<DestinationZone>("data");
  const [mfa, setMfa] = useState(false);
  const [action, setAction] = useState<Action>("read");
  const [evaluation, setEvaluation] = useState<ZeroTrustEvaluation | null>(null);

  const handleIdentityVerifiedChange = (value: boolean) => {
    setIdentityVerified(value);
    setEvaluation(null);
  };

  const handleDeviceCompliantChange = (value: boolean) => {
    setDeviceCompliant(value);
    setEvaluation(null);
  };

  const handleSourceZoneChange = (value: SourceZone) => {
    setSourceZone(value);
    setEvaluation(null);
  };

  const handleDestinationChange = (value: DestinationZone) => {
    setDestination(value);
    setEvaluation(null);
  };

  const handleMfaChange = (value: boolean) => {
    setMfa(value);
    setEvaluation(null);
  };

  const handleActionChange = (value: Action) => {
    setAction(value);
    setEvaluation(null);
  };

  const handleEvaluate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEvaluation(evaluateZeroTrustRequest({ identityVerified, deviceCompliant, sourceZone, destination, mfa, action }));
  };

  const sourceLabel = SOURCE_OPTIONS.find((option) => option.value === sourceZone)?.label;
  const destinationLabel = DESTINATION_OPTIONS.find((option) => option.value === destination)?.label;
  const actionLabel = ACTION_OPTIONS.find((option) => option.value === action)?.label;

  return (
    <section id="sec-zero-trust" className="scroll-mt-20 space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-mono font-semibold text-violet-700 dark:border-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
          S8 · ZERO TRUST
        </span>
        <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">Zero Trust policy path</h3>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Model a request using identity, device posture, source zone, destination zone, MFA, and action.
          The policy engine evaluates every request instead of trusting the network location alone.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <form onSubmit={handleEvaluate} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sec-zero-trust-source" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Source zone</label>
              <select
                id="sec-zero-trust-source"
                value={sourceZone}
                onChange={(event) => handleSourceZoneChange(event.target.value as SourceZone)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100"
              >
                {SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{SOURCE_OPTIONS.find((option) => option.value === sourceZone)?.description}</p>
            </div>
            <div>
              <label htmlFor="sec-zero-trust-destination" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Destination zone</label>
              <select
                id="sec-zero-trust-destination"
                value={destination}
                onChange={(event) => handleDestinationChange(event.target.value as DestinationZone)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100"
              >
                {DESTINATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{DESTINATION_OPTIONS.find((option) => option.value === destination)?.description}</p>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="sec-zero-trust-action" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Requested action</label>
              <select
                id="sec-zero-trust-action"
                value={action}
                onChange={(event) => handleActionChange(event.target.value as Action)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100"
              >
                {ACTION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{ACTION_OPTIONS.find((option) => option.value === action)?.description}</p>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">Trust signals</legend>
            <label htmlFor="sec-zero-trust-identity" className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300">
              <input
                id="sec-zero-trust-identity"
                type="checkbox"
                checked={identityVerified}
                onChange={(event) => handleIdentityVerifiedChange(event.target.checked)}
                className="mt-0.5 accent-violet-600"
              />
              <span>
                <span className="block font-semibold text-slate-800 dark:text-slate-200">Identity verified</span>
                <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">The principal is authenticated and mapped to a known identity.</span>
              </span>
            </label>
            <label htmlFor="sec-zero-trust-device" className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300">
              <input
                id="sec-zero-trust-device"
                type="checkbox"
                checked={deviceCompliant}
                onChange={(event) => handleDeviceCompliantChange(event.target.checked)}
                className="mt-0.5 accent-violet-600"
              />
              <span>
                <span className="block font-semibold text-slate-800 dark:text-slate-200">Device is compliant</span>
                <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">Posture, patch, and endpoint protection checks are current.</span>
              </span>
            </label>
            <label htmlFor="sec-zero-trust-mfa" className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300">
              <input
                id="sec-zero-trust-mfa"
                type="checkbox"
                checked={mfa}
                onChange={(event) => handleMfaChange(event.target.checked)}
                className="mt-0.5 accent-violet-600"
              />
              <span>
                <span className="block font-semibold text-slate-800 dark:text-slate-200">MFA completed</span>
                <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">A recent step-up challenge is available for sensitive destinations.</span>
              </span>
            </label>
          </fieldset>

          <button type="submit" className="w-full rounded-lg bg-violet-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-violet-800 dark:hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2">
            Evaluate policy path
          </button>

          {evaluation ? (
            <div role="status" aria-live="polite" className={`rounded-lg border p-4 ${DECISION_STYLES[evaluation.decision]}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Policy decision</span>
                <span className="rounded-full bg-white/80 dark:bg-slate-800/80 px-3 py-1 text-sm font-bold">{decisionLabel(evaluation.decision)}</span>
              </div>
              <dl className="mt-3 space-y-2 text-xs">
                <div>
                  <dt className="font-semibold text-slate-700 dark:text-slate-300">Reason</dt>
                  <dd className="mt-0.5 leading-relaxed text-slate-600 dark:text-slate-300">{evaluation.reason}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-700 dark:text-slate-300">Requested action</dt>
                  <dd className="mt-0.5 text-slate-600 dark:text-slate-300">{actionLabel}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p role="status" className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400">
              Evaluate the path to see whether policy will Allow, require Step-up MFA, or Deny the request.
            </p>
          )}
        </form>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Request path visualization</h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Static policy stages make the trust boundary explicit before any decision is applied.</p>
          </div>
          <div className="grid items-stretch gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
            {PATH_CARDS.map((card, index) => (
              <div key={card.key} className="contents">
                <article className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-700">
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{card.title}</span>
                  <strong className="mt-2 block text-sm font-bold text-slate-900 dark:text-slate-100">
                    {card.key === "source" ? sourceLabel : card.key === "destination" ? destinationLabel : evaluation ? decisionLabel(evaluation.decision) : "Evaluate signals"}
                  </strong>
                  <span className="mt-1 block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{card.detail}</span>
                </article>
                {index < PATH_CARDS.length - 1 ? <span aria-hidden="true" className="hidden items-center justify-center text-lg font-semibold text-slate-300 dark:text-slate-400 md:flex">→</span> : null}
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-violet-100 bg-violet-50/70 p-4 text-xs text-violet-900 dark:border-violet-700 dark:bg-violet-900/30 dark:text-violet-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">Current path</span>
              <span className="font-mono text-[11px]">{sourceZone} → {destination} · {action}</span>
            </div>
            <p className="mt-2 leading-relaxed text-violet-800 dark:text-violet-200">
              Every hop is evaluated with the same signals; being on a workforce or workload network does not grant implicit access.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
