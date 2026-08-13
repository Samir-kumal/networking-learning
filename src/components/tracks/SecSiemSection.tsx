"use client";

import { useState } from "react";
import { detectSiemEvents, type Severity } from "@/lib/security-evaluators";

type SiemRule = "credential-stuffing" | "privilege-escalation" | "data-exfiltration";
type EventSource = "authentication" | "api" | "waf" | "cloud-audit";
type FilterValue = "all" | Severity;

type SiemEvent = {
  id: string;
  kind: string;
  user: string;
  sourceIp: string;
  failedAttempts: number;
  privilegeChange: boolean;
  bytesOut: number;
  source: EventSource;
  severity: Severity;
  summary: string;
};

type DetectionResult = {
  matchingIds: string[];
  filteredCount: number;
};

const EVENTS: SiemEvent[] = [
  { id: "auth-001", kind: "login-failure", user: "alex", sourceIp: "203.0.113.4", failedAttempts: 8, privilegeChange: false, bytesOut: 0, source: "authentication", severity: "high", summary: "Repeated sign-in failures for one account" },
  { id: "auth-002", kind: "login-success", user: "morgan", sourceIp: "198.51.100.21", failedAttempts: 1, privilegeChange: false, bytesOut: 0, source: "authentication", severity: "low", summary: "Successful sign-in after one retry" },
  { id: "api-014", kind: "token-refresh", user: "service-orders", sourceIp: "10.20.4.18", failedAttempts: 0, privilegeChange: false, bytesOut: 4200, source: "api", severity: "low", summary: "Routine service token refresh" },
  { id: "api-033", kind: "bulk-export", user: "jordan", sourceIp: "10.20.7.11", failedAttempts: 0, privilegeChange: false, bytesOut: 1850000, source: "api", severity: "critical", summary: "Large response volume from customer export endpoint" },
  { id: "waf-009", kind: "blocked-request", user: "anonymous", sourceIp: "203.0.113.19", failedAttempts: 6, privilegeChange: false, bytesOut: 0, source: "waf", severity: "medium", summary: "Burst of rejected authentication-shaped requests" },
  { id: "waf-010", kind: "blocked-request", user: "anonymous", sourceIp: "198.51.100.44", failedAttempts: 2, privilegeChange: false, bytesOut: 0, source: "waf", severity: "low", summary: "Single malformed request blocked at edge" },
  { id: "cloud-021", kind: "role-change", user: "sam", sourceIp: "10.0.0.4", failedAttempts: 0, privilegeChange: true, bytesOut: 0, source: "cloud-audit", severity: "high", summary: "Production role granted outside maintenance window" },
  { id: "cloud-022", kind: "policy-read", user: "auditor", sourceIp: "10.0.0.8", failedAttempts: 0, privilegeChange: false, bytesOut: 12000, source: "cloud-audit", severity: "low", summary: "Read-only policy inspection" },
];

const RULE_OPTIONS: Array<{ value: SiemRule; label: string; description: string }> = [
  { value: "credential-stuffing", label: "Credential stuffing", description: "Find events with five or more failed attempts." },
  { value: "privilege-escalation", label: "Privilege escalation", description: "Find events that record a privilege change." },
  { value: "data-exfiltration", label: "Data exfiltration", description: "Find events sending at least 1 MB of data." },
];

const SOURCE_OPTIONS: Array<{ value: FilterValue | EventSource; label: string }> = [
  { value: "all", label: "All sources" },
  { value: "authentication", label: "Authentication" },
  { value: "api", label: "API gateway" },
  { value: "waf", label: "WAF" },
  { value: "cloud-audit", label: "Cloud audit" },
];

const SEVERITY_OPTIONS: Array<{ value: FilterValue; label: string }> = [
  { value: "all", label: "All severities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "—";
  return `${(bytes / 1_000_000).toFixed(bytes >= 1_000_000 ? 2 : 1)} MB`;
}

export default function SecSiemSection() {
  const [rule, setRule] = useState<SiemRule>("credential-stuffing");
  const [sourceFilter, setSourceFilter] = useState<FilterValue | EventSource>("all");
  const [severityFilter, setSeverityFilter] = useState<FilterValue>("all");
  const [result, setResult] = useState<DetectionResult | null>(null);

  const filteredEvents = EVENTS.filter((event) => {
    const sourceMatches = sourceFilter === "all" || event.source === sourceFilter;
    const severityMatches = severityFilter === "all" || event.severity === severityFilter;
    return sourceMatches && severityMatches;
  });

  const handleRuleChange = (value: SiemRule) => {
    setResult(null);
    setRule(value);
  };

  const handleSourceChange = (value: FilterValue | EventSource) => {
    setResult(null);
    setSourceFilter(value);
  };

  const handleSeverityChange = (value: FilterValue) => {
    setResult(null);
    setSeverityFilter(value);
  };

  const handleDetect = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult({ matchingIds: detectSiemEvents(filteredEvents, rule), filteredCount: filteredEvents.length });
  };

  const selectedRule = RULE_OPTIONS.find((option) => option.value === rule) ?? RULE_OPTIONS[0];

  return (
    <section id="sec-siem" className="scroll-mt-20 space-y-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
        <span className="rounded-full border border-cyan-200 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-900/30 px-2.5 py-0.5 text-xs font-mono font-semibold text-cyan-700 dark:text-cyan-300">
          S10 · SIEM Detection &amp; Log Analysis
        </span>
        <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">Event filtering and detection rules</h3>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Query deterministic synthetic authentication, API, WAF, and cloud audit events. Filters narrow analyst scope;
          the shared evaluator applies local example thresholds, not a universal SIEM detection standard.
        </p>
      </div>

      <form onSubmit={handleDetect} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] md:items-end">
          <div>
            <label htmlFor="sec-siem-rule" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Detection rule</label>
            <select id="sec-siem-rule" value={rule} onChange={(event) => handleRuleChange(event.target.value as SiemRule)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-xs text-slate-900 dark:text-slate-100">
              {RULE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{selectedRule.description}</p>
          </div>
          <div>
            <label htmlFor="sec-siem-source" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Source filter</label>
            <select id="sec-siem-source" value={sourceFilter} onChange={(event) => handleSourceChange(event.target.value as FilterValue | EventSource)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-xs text-slate-900 dark:text-slate-100">
              {SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="sec-siem-severity" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Severity filter</label>
            <select id="sec-siem-severity" value={severityFilter} onChange={(event) => handleSeverityChange(event.target.value as FilterValue)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-xs text-slate-900 dark:text-slate-100">
              {SEVERITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <button type="submit" className="rounded-lg bg-cyan-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-700 dark:hover:bg-cyan-600">Run detection</button>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div><h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Structured event stream</h4><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Synthetic events only; source addresses use documentation ranges.</p></div>
            <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-1 text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-300">{filteredEvents.length} of {EVENTS.length} events</span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[980px] text-left text-[11px]">
              <caption className="sr-only">Synthetic SIEM events filtered by source and severity</caption>
              <thead className="bg-slate-50 dark:bg-slate-700 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400"><tr><th scope="col" className="px-3 py-2 font-semibold">Event ID</th><th scope="col" className="px-3 py-2 font-semibold">Source</th><th scope="col" className="px-3 py-2 font-semibold">Severity</th><th scope="col" className="px-3 py-2 font-semibold">Kind / summary</th><th scope="col" className="px-3 py-2 font-semibold">User</th><th scope="col" className="px-3 py-2 font-semibold">Failed</th><th scope="col" className="px-3 py-2 font-semibold">Privilege</th><th scope="col" className="px-3 py-2 font-semibold">Bytes out</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredEvents.map((event) => <tr key={event.id} className="text-slate-600 dark:text-slate-300"><td className="px-3 py-2 font-mono font-semibold text-slate-800 dark:text-slate-200">{event.id}</td><td className="px-3 py-2">{event.source}</td><td className="px-3 py-2"><span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 font-semibold uppercase text-slate-600 dark:text-slate-300">{event.severity}</span></td><td className="max-w-[260px] px-3 py-2"><span className="block font-mono text-slate-700 dark:text-slate-300">{event.kind}</span><span className="mt-0.5 block text-slate-500 dark:text-slate-400">{event.summary}</span></td><td className="px-3 py-2 font-mono">{event.user}</td><td className="px-3 py-2 text-center">{event.failedAttempts || "—"}</td><td className="px-3 py-2 text-center">{event.privilegeChange ? "Yes" : "—"}</td><td className="px-3 py-2 font-mono">{formatBytes(event.bytesOut)}</td></tr>)}
                {filteredEvents.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-xs text-slate-500 dark:text-slate-400">No events match the selected filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {result ? (
          <div role="status" aria-live="polite" className={`rounded-xl border p-5 shadow-sm ${result.matchingIds.length > 0 ? "border-cyan-200 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-900/30" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">Evaluator-backed detection result</p><h4 className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">{result.matchingIds.length > 0 ? `${result.matchingIds.length} matching event${result.matchingIds.length === 1 ? "" : "s"}` : "No matching events"}</h4></div><span className="rounded-full bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-mono font-bold text-cyan-800 dark:text-cyan-200">{selectedRule.label}</span></div>
            <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2"><div><dt className="font-semibold text-slate-700 dark:text-slate-300">Matching event IDs</dt><dd className="mt-0.5 font-mono text-slate-600 dark:text-slate-300">{result.matchingIds.length > 0 ? result.matchingIds.join(", ") : "None"}</dd></div><div><dt className="font-semibold text-slate-700 dark:text-slate-300">Analyst conclusion</dt><dd className="mt-0.5 leading-relaxed text-slate-600 dark:text-slate-300">{result.matchingIds.length > 0 ? `Investigate ${result.matchingIds.join(", ")} first, enrich the alert with identity and asset context, and preserve the correlated records.` : "The selected rule found no matches in this filtered scope; widen the source or severity filter before closing the query."}</dd></div></dl>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 p-4 text-xs text-slate-500 dark:text-slate-400">Choose a rule and optional filters, then run detection to see evaluator-matched event IDs and the analyst conclusion.</p>
        )}
      </form>
    </section>
  );
}
