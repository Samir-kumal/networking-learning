"use client";

import { useState } from "react";
import {
  evaluateIamRequest,
  type IamPolicyRule,
  type IamRequest,
} from "@/lib/security-evaluators";

type Principal =
  | "role/api-reader"
  | "role/ops-admin"
  | "user/alex"
  | "service/orders-worker"
  | "unknown-client";
type Action = "orders:Get" | "orders:List" | "orders:Update" | "orders:Delete" | "admin:*";
type Resource = "orders/prod" | "orders/*" | "customers/prod" | "admin/*";
type Source = IamRequest["source"];
type Evaluation = {
  decision: "ALLOW" | "DENY";
  matchedRule: IamPolicyRule | null;
  reason: string;
};

const POLICY_RULES: IamPolicyRule[] = [
  {
    effect: "Deny",
    principal: "user/*",
    action: "orders:Delete",
    resource: "orders/*",
  },
  {
    effect: "Allow",
    principal: "role/api-reader",
    action: "orders:Get",
    resource: "orders/*",
  },
  {
    effect: "Allow",
    principal: "role/api-reader",
    action: "orders:List",
    resource: "orders/*",
  },
  {
    effect: "Allow",
    principal: "role/ops-admin",
    action: "admin:*",
    resource: "admin/*",
    requireMfa: true,
  },
  {
    effect: "Allow",
    principal: "service/orders-worker",
    action: "orders:Update",
    resource: "orders/prod",
  },
  {
    effect: "Allow",
    principal: "role/ops-admin",
    action: "orders:*",
    resource: "orders/*",
    requireMfa: true,
  },
];

const PRINCIPAL_OPTIONS: Array<{ value: Principal; label: string }> = [
  { value: "role/api-reader", label: "Role · API reader" },
  { value: "role/ops-admin", label: "Role · Operations admin" },
  { value: "user/alex", label: "User · Alex" },
  { value: "service/orders-worker", label: "Service · Orders worker" },
  { value: "unknown-client", label: "Unknown client" },
];

const ACTION_OPTIONS: Array<{ value: Action; label: string }> = [
  { value: "orders:Get", label: "orders:Get" },
  { value: "orders:List", label: "orders:List" },
  { value: "orders:Update", label: "orders:Update" },
  { value: "orders:Delete", label: "orders:Delete" },
  { value: "admin:*", label: "admin:*" },
];

const RESOURCE_OPTIONS: Array<{ value: Resource; label: string }> = [
  { value: "orders/prod", label: "orders/prod" },
  { value: "orders/*", label: "orders/*" },
  { value: "customers/prod", label: "customers/prod" },
  { value: "admin/*", label: "admin/*" },
];

const SOURCE_OPTIONS: Array<{ value: Source; label: string }> = [
  { value: "corporate", label: "Corporate network" },
  { value: "internet", label: "Internet" },
  { value: "service", label: "Internal service" },
];

function ruleSummary(rule: IamPolicyRule): string {
  return `${rule.effect} · ${rule.principal} · ${rule.action} · ${rule.resource}`;
}

export default function SecIamSection() {
  const [principal, setPrincipal] = useState<Principal>("role/api-reader");
  const [action, setAction] = useState<Action>("orders:Get");
  const [resource, setResource] = useState<Resource>("orders/prod");
  const [mfa, setMfa] = useState<boolean>(false);
  const [source, setSource] = useState<Source>("corporate");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  const request: IamRequest = { principal, action, resource, mfa, source };

  const handleEvaluate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEvaluation(evaluateIamRequest(request, POLICY_RULES));
  };

  return (
    <section id="sec-iam" className="scroll-mt-20 space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-mono font-semibold text-indigo-700">
          S6 · IAM, RBAC &amp; Least Privilege
        </span>
        <h3 className="mt-2 text-lg font-bold text-slate-900">IAM policy evaluator</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Build an access request and evaluate it against a local policy set. Explicit Deny rules,
          wildcard matching, and MFA conditions are handled by the shared evaluator.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form onSubmit={handleEvaluate} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sec-iam-principal" className="mb-1 block text-xs font-semibold text-slate-700">Principal</label>
              <select
                id="sec-iam-principal"
                value={principal}
                onChange={(event) => setPrincipal(event.target.value as Principal)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900"
              >
                {PRINCIPAL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="sec-iam-action" className="mb-1 block text-xs font-semibold text-slate-700">Action</label>
              <select
                id="sec-iam-action"
                value={action}
                onChange={(event) => setAction(event.target.value as Action)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900"
              >
                {ACTION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="sec-iam-resource" className="mb-1 block text-xs font-semibold text-slate-700">Resource</label>
              <select
                id="sec-iam-resource"
                value={resource}
                onChange={(event) => setResource(event.target.value as Resource)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900"
              >
                {RESOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="sec-iam-source" className="mb-1 block text-xs font-semibold text-slate-700">Source context</label>
              <select
                id="sec-iam-source"
                value={source}
                onChange={(event) => setSource(event.target.value as Source)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900"
              >
                {SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          </div>

          <label htmlFor="sec-iam-mfa" className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <input
              id="sec-iam-mfa"
              type="checkbox"
              checked={mfa}
              onChange={(event) => setMfa(event.target.checked)}
              className="mt-0.5 accent-indigo-600"
            />
            <span>
              <span className="block font-semibold text-slate-800">MFA verified</span>
              <span className="mt-0.5 block text-slate-500">Satisfies rules that require step-up authentication.</span>
            </span>
          </label>

          <button type="submit" className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700">
            Evaluate access request
          </button>

          {evaluation ? (
            <div role="status" className={`rounded-lg border p-4 ${evaluation.decision === "ALLOW" ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Decision</span>
                <span className={`rounded-full px-3 py-1 text-sm font-bold ${evaluation.decision === "ALLOW" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
                  {evaluation.decision}
                </span>
              </div>
              <dl className="mt-3 space-y-2 text-xs">
                <div>
                  <dt className="font-semibold text-slate-700">Matched rule</dt>
                  <dd className="mt-0.5 break-words font-mono text-slate-600">
                    {evaluation.matchedRule ? ruleSummary(evaluation.matchedRule) : "No rule matched"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-700">Reason</dt>
                  <dd className="mt-0.5 leading-relaxed text-slate-600">{evaluation.reason}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">
              Submit the request to see the evaluator decision, matched rule, and reason.
            </p>
          )}
        </form>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Local policy set</h4>
              <p className="mt-1 text-xs text-slate-500">Deny rules are evaluated before matching Allow rules.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-mono font-semibold text-slate-600">{POLICY_RULES.length} rules</span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[620px] text-left text-[11px]">
              <caption className="sr-only">IAM policy rules used by the evaluator</caption>
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">Effect</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Principal</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Action</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Resource</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {POLICY_RULES.map((rule, index) => (
                  <tr key={`${rule.effect}-${rule.principal}-${rule.action}-${index}`} className="text-slate-600">
                    <td className={`px-3 py-2 font-bold ${rule.effect === "Allow" ? "text-emerald-700" : "text-rose-700"}`}>{rule.effect}</td>
                    <td className="px-3 py-2 font-mono">{rule.principal}</td>
                    <td className="px-3 py-2 font-mono">{rule.action}</td>
                    <td className="px-3 py-2 font-mono">{rule.resource}</td>
                    <td className="px-3 py-2">{rule.requireMfa ? "MFA required" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
