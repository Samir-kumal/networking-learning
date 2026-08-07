"use client";

import { useMemo, useState } from "react";
import { scoreCloudPosture, type Severity } from "@/lib/security-evaluators";

type CloudControl = "IAM" | "S3" | "VPC" | "CloudTrail" | "KMS" | "Security groups";
type SeverityFilter = Severity | "all";

export interface CloudPostureFinding {
  id: string;
  control: CloudControl;
  title: string;
  severity: Severity;
  resource: string;
  evidence: string;
  remediation: string;
  publicExposure: boolean;
  fixed: boolean;
}

const INITIAL_FINDINGS: CloudPostureFinding[] = [
  {
    id: "iam-root-mfa",
    control: "IAM",
    title: "Root account MFA is not enabled",
    severity: "critical",
    resource: "arn:aws:iam::492018377291:root",
    evidence: "Credential report shows password enabled and MFA device count = 0.",
    remediation: "Enable a hardware or virtual MFA device for the root account and remove routine root usage.",
    publicExposure: false,
    fixed: false,
  },
  {
    id: "s3-public-read",
    control: "S3",
    title: "Object storage bucket permits public reads",
    severity: "high",
    resource: "s3://acme-prod-invoices",
    evidence: "Bucket policy allows s3:GetObject to Principal \"*\"; Block Public Access is disabled.",
    remediation: "Enable all S3 Block Public Access settings and replace the public policy with a scoped role.",
    publicExposure: true,
    fixed: false,
  },
  {
    id: "vpc-flow-logs",
    control: "VPC",
    title: "Production subnet flow logs are disabled",
    severity: "medium",
    resource: "vpc-0f42a1e9 / subnet-07b3c4d1",
    evidence: "No accepted or rejected traffic records are delivered to the centralized log bucket.",
    remediation: "Enable VPC Flow Logs for all production subnets and deliver them to an access-controlled log destination.",
    publicExposure: false,
    fixed: false,
  },
  {
    id: "cloudtrail-single-region",
    control: "CloudTrail",
    title: "Trail is not multi-region or organization-wide",
    severity: "high",
    resource: "arn:aws:cloudtrail:us-east-1:492018377291:trail/prod-audit",
    evidence: "Trail covers us-east-1 only and does not log global service events from other regions.",
    remediation: "Use an organization trail with multi-region logging, log validation, and a dedicated immutable archive.",
    publicExposure: false,
    fixed: false,
  },
  {
    id: "kms-rotation",
    control: "KMS",
    title: "Customer-managed key rotation is disabled",
    severity: "medium",
    resource: "key/7e6d0d5c-4dcb-4ae5-9a19-prod-data",
    evidence: "EnableKeyRotation is false for the key encrypting production records.",
    remediation: "Enable annual automatic rotation and review key policy principals for least privilege.",
    publicExposure: false,
    fixed: false,
  },
  {
    id: "sg-wide-ingress",
    control: "Security groups",
    title: "Database security group allows unrestricted ingress",
    severity: "critical",
    resource: "sg-0a8d66bd / prod-postgres",
    evidence: "TCP/5432 is open from 0.0.0.0/0 on an internet-facing security group.",
    remediation: "Remove the unrestricted rule and allow database traffic only from the application security group.",
    publicExposure: true,
    fixed: false,
  },
  {
    id: "iam-stale-key",
    control: "IAM",
    title: "Access key has not been used for 142 days",
    severity: "low",
    resource: "user/deploy-legacy / AKIA...Q8M2",
    evidence: "LastUsedDate is more than 90 days old and the owning team has no active exception.",
    remediation: "Disable and remove the stale key, then migrate automation to short-lived role credentials.",
    publicExposure: false,
    fixed: false,
  },
];

const severityStyles: Record<Severity, string> = {
  critical: "border-rose-200 bg-rose-50 text-rose-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-sky-200 bg-sky-50 text-sky-700",
};

export default function SecCloudPostureSection() {
  const [findings, setFindings] = useState<CloudPostureFinding[]>(INITIAL_FINDINGS);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [selectedFindingId, setSelectedFindingId] = useState<string>(INITIAL_FINDINGS[0].id);
  const [lastScan, setLastScan] = useState<string | null>(null);

  const posture = scoreCloudPosture(findings);
  const selectedFinding = findings.find((finding) => finding.id === selectedFindingId) ?? findings[0];
  const visibleFindings = useMemo(
    () => findings.filter((finding) => severityFilter === "all" || finding.severity === severityFilter),
    [findings, severityFilter],
  );

  const recalculate = () => {
    setLastScan(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  };

  const toggleFixed = (findingId: string) => {
    setFindings((current) =>
      current.map((finding) =>
        finding.id === findingId ? { ...finding, fixed: !finding.fixed } : finding,
      ),
    );
  };

  return (
    <section id="sec-cloud-posture" className="scroll-mt-20 space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 card-shadow">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full border border-cyan-400/30 bg-cyan-50 px-2.5 py-0.5 text-xs font-mono font-semibold text-cyan-700">
            S13 · CLOUD SECURITY POSTURE
          </span>
        </div>
        <h3 className="text-xl font-extrabold text-slate-900">13. Cloud Security Posture Scanner</h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Review a local AWS account snapshot across identity, storage, network, logging, key management,
          and firewall controls. Findings are educational examples, not a live cloud scan.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-4 card-shadow">
          <p className="text-xs text-slate-500">Posture score</p>
          <p className="mt-1 text-3xl font-extrabold text-cyan-700">{posture.score}</p>
          <p className="mt-1 text-xs font-mono text-cyan-700">Grade {posture.grade}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-4 card-shadow">
          <p className="text-xs text-slate-500">Open findings</p>
          <p className="mt-1 text-3xl font-extrabold text-rose-700">{posture.openFindings}</p>
          <p className="mt-1 text-xs text-rose-700">Evaluator-calculated risk</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 card-shadow">
          <p className="text-xs text-slate-500">Resolved findings</p>
          <p className="mt-1 text-3xl font-extrabold text-emerald-700">{findings.length - posture.openFindings}</p>
          <p className="mt-1 text-xs text-emerald-700">Marked fixed locally</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 card-shadow">
          <p className="text-xs text-slate-500">Last recalculation</p>
          <p className="mt-2 text-sm font-bold text-slate-900">{lastScan ?? "Not run yet"}</p>
          <button
            type="button"
            onClick={recalculate}
            className="mt-3 rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
          >
            Scan / recalculate
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 card-shadow lg:col-span-2">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h4 className="text-sm font-bold text-slate-900">AWS findings ({visibleFindings.length})</h4>
              <p className="mt-1 text-xs text-slate-500">Select a finding to inspect evidence and remediation.</p>
            </div>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Filter findings by severity">
              {(["all", "critical", "high", "medium", "low"] as const).map((severity) => (
                <button
                  key={severity}
                  type="button"
                  aria-pressed={severityFilter === severity}
                  onClick={() => setSeverityFilter(severity)}
                  className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold capitalize transition focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 ${
                    severityFilter === severity
                      ? "bg-cyan-700 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {severity}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[620px] text-left text-xs">
              <caption className="sr-only">Cloud security posture findings</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-mono text-slate-500">
                <tr>
                  <th scope="col" className="px-3 py-2.5">Control</th>
                  <th scope="col" className="px-3 py-2.5">Finding</th>
                  <th scope="col" className="px-3 py-2.5">Severity</th>
                  <th scope="col" className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleFindings.map((finding) => {
                  const selected = finding.id === selectedFindingId;
                  return (
                    <tr key={finding.id} className={selected ? "bg-cyan-50/60" : "hover:bg-slate-50"}>
                      <td className="px-3 py-3 align-top font-semibold text-cyan-800">{finding.control}</td>
                      <td className="px-3 py-3 align-top">
                        <button
                          type="button"
                          onClick={() => setSelectedFindingId(finding.id)}
                          aria-label={`Inspect ${finding.title}`}
                          className="text-left font-semibold text-slate-900 underline-offset-2 hover:text-cyan-700 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                          {finding.title}
                        </button>
                        <p className="mt-1 font-mono text-[10px] text-slate-500">{finding.resource}</p>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span className={`rounded border px-2 py-1 text-[10px] font-bold uppercase ${severityStyles[finding.severity]}`}>
                          {finding.severity}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <button
                          type="button"
                          onClick={() => toggleFixed(finding.id)}
                          aria-pressed={finding.fixed}
                          className={`rounded-md border px-2 py-1 text-[10px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                            finding.fixed
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300"
                          }`}
                        >
                          {finding.fixed ? "Fixed" : "Open · mark fixed"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 card-shadow" aria-live="polite">
          <div>
            <p className="text-[11px] font-mono font-semibold uppercase tracking-wide text-cyan-700">Resource evidence</p>
            <h4 className="mt-1 text-base font-bold text-slate-900">{selectedFinding?.title ?? "No finding selected"}</h4>
          </div>
          {selectedFinding ? (
            <>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold text-slate-500">Affected resource</p>
                <p className="mt-1 break-all font-mono text-xs text-slate-800">{selectedFinding.resource}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Evidence</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{selectedFinding.evidence}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs font-semibold text-emerald-800">Recommended remediation</p>
                <p className="mt-1 text-sm leading-relaxed text-emerald-900">{selectedFinding.remediation}</p>
              </div>
              <p className="text-xs text-slate-500">
                Public exposure penalty: <span className="font-semibold text-slate-800">{selectedFinding.publicExposure ? "Yes" : "No"}</span>
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">Choose a finding from the table.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
