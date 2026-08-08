"use client";

import { useState } from "react";
import { evaluateApiRequest } from "@/lib/security-evaluators";

type ApiEndpoint = "account" | "orders" | "admin" | "upload";
type ApiEvaluation = {
  decision: "ALLOW" | "BLOCK";
  finding: string;
  control: string;
};

type Option<T extends string> = { value: T; label: string; description: string };

const ENDPOINT_OPTIONS: Array<Option<ApiEndpoint>> = [
  { value: "account", label: "Account profile", description: "Read the caller's account details" },
  { value: "orders", label: "Orders", description: "Read an order owned by the caller" },
  { value: "admin", label: "Admin operations", description: "Access privileged administrative actions" },
  { value: "upload", label: "File upload", description: "Submit an attachment for processing" },
];

const SAFE_REQUESTS: Record<ApiEndpoint, string> = {
  account: "GET /v1/account\nAuthorization: Bearer <short-lived-token>",
  orders: "GET /v1/orders/order_2048\nAuthorization: Bearer <short-lived-token>",
  admin: "GET /v1/admin/health\nAuthorization: Bearer <short-lived-token>",
  upload: "POST /v1/uploads\nAuthorization: Bearer <short-lived-token>\nContent-Type: application/json\n\n{ \"fileId\": \"file_demo_01\" }",
};

const CONTROL_CLASSES = "rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-3";
const SELECT_CLASSES = "mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100";

export default function SecApiSecuritySection() {
  const [endpoint, setEndpoint] = useState<ApiEndpoint>("orders");
  const [authenticated, setAuthenticated] = useState(true);
  const [ownsObject, setOwnsObject] = useState(true);
  const [bodyValid, setBodyValid] = useState(true);
  const [rateWithinLimit, setRateWithinLimit] = useState(true);
  const [evaluation, setEvaluation] = useState<ApiEvaluation | null>(null);

  const handleEndpointChange = (value: ApiEndpoint) => {
    setEndpoint(value);
    setEvaluation(null);
  };

  const handleAuthenticatedChange = (value: boolean) => {
    setAuthenticated(value);
    setEvaluation(null);
  };

  const handleOwnsObjectChange = (value: boolean) => {
    setOwnsObject(value);
    setEvaluation(null);
  };

  const handleBodyValidChange = (value: boolean) => {
    setBodyValid(value);
    setEvaluation(null);
  };

  const handleRateWithinLimitChange = (value: boolean) => {
    setRateWithinLimit(value);
    setEvaluation(null);
  };

  const handleEvaluate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEvaluation(evaluateApiRequest({ endpoint, authenticated, ownsObject, bodyValid, rateWithinLimit }));
  };

  const selectedEndpoint = ENDPOINT_OPTIONS.find((option) => option.value === endpoint);

  return (
    <section id="sec-api-security" className="scroll-mt-20 space-y-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
        <span className="rounded-full border border-cyan-200 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-900/30 px-2.5 py-0.5 text-xs font-mono font-semibold text-cyan-700 dark:text-cyan-300">
          S7 · API SECURITY
        </span>
        <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">Layered API request lab</h3>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Test the controls that protect an API boundary: identity, object ownership, schema validation,
          and endpoint rate limits. The shared evaluator returns the first control that needs attention.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <form onSubmit={handleEvaluate} className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div>
            <label htmlFor="sec-api-endpoint" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Endpoint under test
            </label>
            <select
              id="sec-api-endpoint"
              value={endpoint}
              onChange={(event) => handleEndpointChange(event.target.value as ApiEndpoint)}
              className={SELECT_CLASSES}
            >
              {ENDPOINT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{selectedEndpoint?.description}</p>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">Request controls</legend>
            <label htmlFor="sec-api-authenticated" className={`${CONTROL_CLASSES} flex cursor-pointer items-start gap-3`}>
              <input
                id="sec-api-authenticated"
                type="checkbox"
                checked={authenticated}
                onChange={(event) => handleAuthenticatedChange(event.target.checked)}
                className="mt-0.5 accent-cyan-600"
              />
              <span>
                <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">Authentication verified</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">A valid, non-expired identity token is present.</span>
              </span>
            </label>
            <label htmlFor="sec-api-ownership" className={`${CONTROL_CLASSES} flex cursor-pointer items-start gap-3`}>
              <input
                id="sec-api-ownership"
                type="checkbox"
                checked={ownsObject}
                onChange={(event) => handleOwnsObjectChange(event.target.checked)}
                className="mt-0.5 accent-cyan-600"
              />
              <span>
                <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">Object ownership verified</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">The caller is authorized for the requested object.</span>
              </span>
            </label>
            <label htmlFor="sec-api-body" className={`${CONTROL_CLASSES} flex cursor-pointer items-start gap-3`}>
              <input
                id="sec-api-body"
                type="checkbox"
                checked={bodyValid}
                onChange={(event) => handleBodyValidChange(event.target.checked)}
                className="mt-0.5 accent-cyan-600"
              />
              <span>
                <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">Body passes schema validation</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Content type, required fields, and value constraints are valid.</span>
              </span>
            </label>
            <label htmlFor="sec-api-rate" className={`${CONTROL_CLASSES} flex cursor-pointer items-start gap-3`}>
              <input
                id="sec-api-rate"
                type="checkbox"
                checked={rateWithinLimit}
                onChange={(event) => handleRateWithinLimitChange(event.target.checked)}
                className="mt-0.5 accent-cyan-600"
              />
              <span>
                <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">Rate is within endpoint limit</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">The request is not part of a burst or credential-stuffing pattern.</span>
              </span>
            </label>
          </fieldset>

          <button type="submit" className="w-full rounded-lg bg-cyan-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-800 dark:hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2">
            Evaluate API request
          </button>

          {evaluation ? (
            <div
              role="status"
              aria-live="polite"
              className={`rounded-lg border p-4 ${evaluation.decision === "ALLOW" ? "border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30" : "border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/30"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Evaluator decision</span>
                <span className={`rounded-full px-3 py-1 text-sm font-bold ${evaluation.decision === "ALLOW" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
                  {evaluation.decision}
                </span>
              </div>
              <dl className="mt-3 space-y-2 text-xs">
                <div>
                  <dt className="font-semibold text-slate-700 dark:text-slate-300">Matched API security concern</dt>
                  <dd className="mt-0.5 leading-relaxed text-slate-600 dark:text-slate-300">{evaluation.finding}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-700 dark:text-slate-300">Recommended control</dt>
                  <dd className="mt-0.5 leading-relaxed text-slate-600 dark:text-slate-300">{evaluation.control}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p role="status" className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 p-4 text-xs text-slate-500 dark:text-slate-400">
              Evaluate the request to see the decision, matched concern, and recommended control.
            </p>
          )}
        </form>

        <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Safe example request</h4>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                This illustrative request is display-only. The lab never executes entered payload text or sends network traffic.
              </p>
            </div>
            <span className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 px-2 py-1 text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-300">
              DISPLAY ONLY
            </span>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-[11px] leading-relaxed text-cyan-100" aria-label={`Safe example request for ${endpoint} endpoint`}>
            <code>{SAFE_REQUESTS[endpoint]}</code>
          </pre>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-3">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Identity</span>
              <span className={`mt-1 block text-xs font-bold ${authenticated ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>{authenticated ? "Verified" : "Missing"}</span>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-3">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Payload</span>
              <span className={`mt-1 block text-xs font-bold ${bodyValid ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>{bodyValid ? "Schema-valid" : "Invalid"}</span>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-3">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Traffic</span>
              <span className={`mt-1 block text-xs font-bold ${rateWithinLimit ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>{rateWithinLimit ? "Within limit" : "Throttled"}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
