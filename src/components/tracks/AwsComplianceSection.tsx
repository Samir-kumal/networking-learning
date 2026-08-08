"use client";

import { useState } from "react";

// ==========================================
// TYPES & INTERFACES
// ==========================================

type RequirementStatus = "pass" | "fail";
type DomainKey =
  | "identity"
  | "encryption"
  | "logging"
  | "network"
  | "data"
  | "ops";

interface ComplianceRequirement {
  id: string;
  ref: string;
  title: string;
  description: string;
  domain: DomainKey;
  defaultStatus: RequirementStatus;
}

interface ComplianceStandard {
  id: string;
  icon: string;
  name: string;
  framework: string;
  description: string;
  requirements: ComplianceRequirement[];
}

interface RadarDomain {
  key: DomainKey;
  label: string;
  fullLabel: string;
  angle: number; // math convention, degrees counter-clockwise from +x
}

// ==========================================
// MOCK DATA
// ==========================================

// Six security domains used by the CSS radar chart (evenly spaced at 60°).
const RADAR_DOMAINS: RadarDomain[] = [
  { key: "identity", label: "Identity", fullLabel: "Identity & Access Control", angle: 90 },
  { key: "encryption", label: "Encryption", fullLabel: "Encryption & Key Mgmt", angle: 30 },
  { key: "data", label: "Data", fullLabel: "Data Protection", angle: 330 },
  { key: "ops", label: "Ops", fullLabel: "Operations & Response", angle: 270 },
  { key: "logging", label: "Logging", fullLabel: "Logging & Monitoring", angle: 210 },
  { key: "network", label: "Network", fullLabel: "Network Security", angle: 150 },
];

const COMPLIANCE_STANDARDS: ComplianceStandard[] = [
  {
    id: "soc2",
    icon: "🤝",
    name: "SOC 2",
    framework: "AICPA TSC",
    description:
      "Trust Services Criteria covering security, availability, and confidentiality of customer data.",
    requirements: [
      {
        id: "s2-1",
        ref: "CC6.1",
        title: "Logical access controls",
        description:
          "Least-privilege IAM policies with automated role assignment across all AWS accounts.",
        domain: "identity",
        defaultStatus: "pass",
      },
      {
        id: "s2-2",
        ref: "CC6.2",
        title: "User provisioning & de-provisioning",
        description:
          "SCIM-backed onboarding/offboarding with access revoked within 24h of departure.",
        domain: "identity",
        defaultStatus: "pass",
      },
      {
        id: "s2-3",
        ref: "CC6.7",
        title: "Encryption at rest",
        description:
          "Customer data encrypted with AWS KMS CMKs across S3, RDS, and EBS volumes.",
        domain: "encryption",
        defaultStatus: "pass",
      },
      {
        id: "s2-4",
        ref: "CC6.1",
        title: "Encryption in transit",
        description:
          "TLS 1.2+ enforced at ALB, CloudFront, and API Gateway endpoints.",
        domain: "encryption",
        defaultStatus: "pass",
      },
      {
        id: "s2-5",
        ref: "CC7.2",
        title: "Privileged access audit logging",
        description:
          "CloudTrail plus CloudWatch alarms fire on every privileged console/API action.",
        domain: "logging",
        defaultStatus: "pass",
      },
      {
        id: "s2-6",
        ref: "CC8.1",
        title: "Change management gates",
        description:
          "CI/CD approval workflows with rollback plans for all production changes.",
        domain: "ops",
        defaultStatus: "pass",
      },
      {
        id: "s2-7",
        ref: "CC7.1",
        title: "Annual penetration testing",
        description:
          "Independent pen test of the internet-facing surface within the last 12 months.",
        domain: "ops",
        defaultStatus: "fail",
      },
      {
        id: "s2-8",
        ref: "CC9.2",
        title: "Vendor risk assessments",
        description:
          "Due-diligence reviews of sub-processors with access to production data.",
        domain: "data",
        defaultStatus: "fail",
      },
    ],
  },
  {
    id: "hipaa",
    icon: "🏥",
    name: "HIPAA",
    framework: "45 CFR §164",
    description:
      "Security & Privacy Rule safeguards for protected health information (PHI) stored or processed in AWS.",
    requirements: [
      {
        id: "hp-1",
        ref: "§164.308(b)",
        title: "Business Associate Agreement",
        description:
          "Signed BAA with AWS covering all PHI-processing accounts and services.",
        domain: "data",
        defaultStatus: "pass",
      },
      {
        id: "hp-2",
        ref: "§164.312(a)",
        title: "PHI encrypted at rest",
        description:
          "AES-256 encryption via KMS on every datastore holding ePHI (S3, RDS, EBS).",
        domain: "encryption",
        defaultStatus: "pass",
      },
      {
        id: "hp-3",
        ref: "§164.312(e)",
        title: "PHI encrypted in transit",
        description:
          "TLS 1.2+ required for all network paths carrying ePHI, including VPC endpoints.",
        domain: "encryption",
        defaultStatus: "pass",
      },
      {
        id: "hp-4",
        ref: "§164.312(b)",
        title: "PHI access audit logs",
        description:
          "Record and retain activity logs for every access to PHI (who, what, when).",
        domain: "logging",
        defaultStatus: "pass",
      },
      {
        id: "hp-5",
        ref: "§164.308(a)",
        title: "Role-based access & separation of duties",
        description:
          "Unique user IDs, role separation, and quarterly access re-certification.",
        domain: "identity",
        defaultStatus: "fail",
      },
      {
        id: "hp-6",
        ref: "§164.408",
        title: "Breach notification procedure",
        description:
          "Documented 60-day notification workflow triggered by GuardDuty/Macie alerts.",
        domain: "ops",
        defaultStatus: "pass",
      },
      {
        id: "hp-7",
        ref: "§164.308(a)(7)",
        title: "Backup & disaster recovery",
        description:
          "Cross-region backups with tested restore for all PHI datastores.",
        domain: "data",
        defaultStatus: "pass",
      },
      {
        id: "hp-8",
        ref: "§164.308(a)(5)",
        title: "Workforce security training",
        description:
          "Annual security awareness training with attestation for all staff.",
        domain: "ops",
        defaultStatus: "fail",
      },
    ],
  },
  {
    id: "pci",
    icon: "💳",
    name: "PCI-DSS",
    framework: "v4.0",
    description:
      "Payment Card Industry Data Security Standard for cardholder data environments (CDE).",
    requirements: [
      {
        id: "pc-1",
        ref: "Req 1.3",
        title: "CDE network segmentation",
        description:
          "Cardholder data environment isolated with security groups, NACLs, and TGW routing.",
        domain: "network",
        defaultStatus: "pass",
      },
      {
        id: "pc-2",
        ref: "Req 7.1",
        title: "Least privilege for CDE access",
        description:
          "IAM policies restrict CDE access to named individuals with business justification.",
        domain: "identity",
        defaultStatus: "pass",
      },
      {
        id: "pc-3",
        ref: "Req 3.4",
        title: "PAN encryption at rest",
        description:
          "Primary account numbers rendered unreadable with KMS envelope encryption.",
        domain: "encryption",
        defaultStatus: "pass",
      },
      {
        id: "pc-4",
        ref: "Req 8.3",
        title: "MFA for all CDE access",
        description:
          "Multi-factor authentication enforced for console, CLI, and remote CDE access.",
        domain: "identity",
        defaultStatus: "pass",
      },
      {
        id: "pc-5",
        ref: "Req 11.2.2",
        title: "Quarterly ASV vulnerability scans",
        description:
          "Approved scanning vendor (ASV) scans of external IPs every 90 days.",
        domain: "ops",
        defaultStatus: "fail",
      },
      {
        id: "pc-6",
        ref: "Req 11.5",
        title: "File integrity monitoring",
        description:
          "FIM on critical system files and executables with alerting to Security Hub.",
        domain: "logging",
        defaultStatus: "pass",
      },
      {
        id: "pc-7",
        ref: "Req 10.5",
        title: "CDE audit log retention",
        description:
          "Audit trails covering CDE access retained 12 months (3 online, 9 archived).",
        domain: "logging",
        defaultStatus: "pass",
      },
      {
        id: "pc-8",
        ref: "Req 11.4",
        title: "Annual penetration testing",
        description:
          "Pen test covering segmentation controls and CDE attack surface each year.",
        domain: "ops",
        defaultStatus: "fail",
      },
    ],
  },
  {
    id: "cis",
    icon: "🛡️",
    name: "CIS Benchmark",
    framework: "AWS Foundations v2.0",
    description:
      "Center for Internet Security foundational checks enforced via Security Hub controls.",
    requirements: [
      {
        id: "cb-1",
        ref: "1.4",
        title: "Root user MFA & no access keys",
        description:
          "Root account MFA enabled, root access keys deleted, root usage monitored.",
        domain: "identity",
        defaultStatus: "pass",
      },
      {
        id: "cb-2",
        ref: "2.1",
        title: "Multi-region CloudTrail",
        description:
          "CloudTrail enabled in all regions with S3 delivery, KMS encryption, and 90-day retention.",
        domain: "logging",
        defaultStatus: "pass",
      },
      {
        id: "cb-3",
        ref: "3.1-3.6",
        title: "S3 public access blocked",
        description:
          "Block Public Access enabled at account and bucket level; no public ACLs.",
        domain: "data",
        defaultStatus: "pass",
      },
      {
        id: "cb-4",
        ref: "4.1",
        title: "Default-deny security groups",
        description:
          "No security group allows unrestricted 0.0.0.0/0 ingress except approved load balancers.",
        domain: "network",
        defaultStatus: "fail",
      },
      {
        id: "cb-5",
        ref: "4.3",
        title: "IMDSv2 enforced on EC2",
        description:
          "Instance Metadata Service v2 required; v1 disabled on all instances.",
        domain: "network",
        defaultStatus: "pass",
      },
      {
        id: "cb-6",
        ref: "4.5",
        title: "GuardDuty enabled",
        description:
          "GuardDuty active in all regions with findings exported to Security Hub.",
        domain: "ops",
        defaultStatus: "pass",
      },
      {
        id: "cb-7",
        ref: "2.2.1",
        title: "EBS snapshots private & encrypted",
        description:
          "Snapshots not public, default EBS encryption on, KMS-managed keys.",
        domain: "encryption",
        defaultStatus: "pass",
      },
    ],
  },
  {
    id: "nist",
    icon: "🏛️",
    name: "NIST 800-53",
    framework: "Rev 5 / CSF",
    description:
      "National Institute of Standards control families mapped to AWS security services.",
    requirements: [
      {
        id: "n1",
        ref: "AC-2",
        title: "Automated account management",
        description:
          "IAM Identity Center automates account lifecycle with approval workflows.",
        domain: "identity",
        defaultStatus: "pass",
      },
      {
        id: "n2",
        ref: "AC-6",
        title: "Least privilege enforcement",
        description:
          "Granular IAM policies with Access Analyzer flagging unused permissions.",
        domain: "identity",
        defaultStatus: "pass",
      },
      {
        id: "n3",
        ref: "SC-28",
        title: "Protection of information at rest",
        description:
          "KMS encryption with rotation on all storage and database services.",
        domain: "encryption",
        defaultStatus: "pass",
      },
      {
        id: "n4",
        ref: "SC-8",
        title: "Transmission confidentiality",
        description:
          "TLS 1.2+ enforced; plaintext protocols (HTTP, FTP, Telnet) blocked.",
        domain: "encryption",
        defaultStatus: "pass",
      },
      {
        id: "n5",
        ref: "AU-6",
        title: "Audit review, analysis & alerting",
        description:
          "CloudWatch alarm thresholds feed a SIEM for continuous review.",
        domain: "logging",
        defaultStatus: "pass",
      },
      {
        id: "n6",
        ref: "CM-8",
        title: "System component inventory",
        description:
          "AWS Config tracks all resources; tagged inventory reconciled weekly.",
        domain: "data",
        defaultStatus: "pass",
      },
      {
        id: "n7",
        ref: "IR-4",
        title: "Incident handling capability",
        description:
          "Runbook-driven response with dedicated IR account and tooling.",
        domain: "ops",
        defaultStatus: "fail",
      },
      {
        id: "n8",
        ref: "CP-9",
        title: "Information system backup",
        description:
          "Automated backups with quarterly restore drills for critical systems.",
        domain: "data",
        defaultStatus: "pass",
      },
    ],
  },
];

const DOMAIN_LABELS: Record<DomainKey, string> = {
  identity: "Identity",
  encryption: "Encryption",
  logging: "Logging",
  network: "Network",
  data: "Data",
  ops: "Ops",
};

// ==========================================
// COMPONENT
// ==========================================

export default function AwsComplianceSection() {
  // --- State ---
  const [enabledStandards, setEnabledStandards] = useState<Record<string, boolean>>(
    Object.fromEntries(COMPLIANCE_STANDARDS.map((s) => [s.id, true]))
  );
  const [reqStatus, setReqStatus] = useState<Record<string, RequirementStatus>>(
    Object.fromEntries(
      COMPLIANCE_STANDARDS.flatMap((s) =>
        s.requirements.map((r) => [r.id, r.defaultStatus])
      )
    )
  );

  // --- Derived data (scoped to enabled standards) ---
  const scopedStandards = COMPLIANCE_STANDARDS.filter(
    (s) => enabledStandards[s.id]
  );
  const scopedRequirements = scopedStandards.flatMap((s) => s.requirements);

  const passedCount = scopedRequirements.filter(
    (r) => reqStatus[r.id] === "pass"
  ).length;
  const failedCount = scopedRequirements.length - passedCount;
  const totalCount = scopedRequirements.length;
  const score =
    totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
  const scoreTier =
    score >= 85 ? "COMPLIANT" : score >= 70 ? "REVIEW" : "NON-COMPLIANT";

  // Per-domain coverage (passed / total) across scoped requirements.
  const domainCoverage = ((): Record<DomainKey, { passed: number; total: number }> => {
    const init: Record<DomainKey, { passed: number; total: number }> = {
      identity: { passed: 0, total: 0 },
      encryption: { passed: 0, total: 0 },
      logging: { passed: 0, total: 0 },
      network: { passed: 0, total: 0 },
      data: { passed: 0, total: 0 },
      ops: { passed: 0, total: 0 },
    };
    for (const r of scopedRequirements) {
      init[r.domain].total += 1;
      if (reqStatus[r.id] === "pass") init[r.domain].passed += 1;
    }
    return init;
  })();

  // --- Radar chart geometry (pure CSS via clip-path) ---
  const radarPoint = (value: number, angle: number, radiusPct: number) => {
    const rad = (angle * Math.PI) / 180;
    const x = 50 + radiusPct * value * Math.cos(rad);
    const y = 50 - radiusPct * value * Math.sin(rad);
    return `${x.toFixed(2)}% ${y.toFixed(2)}%`;
  };

  const coverageValue = (key: DomainKey) => {
    const d = domainCoverage[key];
    return d.total > 0 ? d.passed / d.total : 0;
  };

  const polygon = RADAR_DOMAINS.map((d) =>
    radarPoint(coverageValue(d.key), d.angle, 50)
  ).join(", ");
  // Slightly larger outline polygon gives the rose "stroke" around the fill.
  const outlinePolygon = RADAR_DOMAINS.map((d) =>
    radarPoint(Math.min(1, coverageValue(d.key) + 0.06), d.angle, 50)
  ).join(", ");

  const toggleStandard = (id: string) => {
    setEnabledStandards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleRequirement = (id: string) => {
    setReqStatus((prev) => ({
      ...prev,
      [id]: prev[id] === "pass" ? "fail" : "pass",
    }));
  };

  return (
    <section id="aws-compliance" className="scroll-mt-20 space-y-6">
      {/* Section Header Card */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-700 text-xs font-mono font-bold shrink-0">
          AWS · Security Hub &amp; Compliance
        </span>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            AWS Security Hub &amp; Compliance Framework
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Toggle regulatory frameworks in scope, audit each control, and watch
            the compliance score and domain radar update in real time.
          </p>
        </div>
      </div>

      {/* Framework Toggle Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {COMPLIANCE_STANDARDS.map((std) => {
          const enabled = enabledStandards[std.id];
          const passed = std.requirements.filter(
            (r) => reqStatus[r.id] === "pass"
          ).length;
          return (
            <div
              key={std.id}
              className={`p-4 rounded-xl border transition-all ${
                enabled
                  ? "bg-rose-50/60 dark:bg-rose-900/30 border-rose-300 dark:border-rose-600 shadow-md shadow-rose-100"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{std.icon}</span>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      {std.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      {std.framework}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`Toggle ${std.name} in scope`}
                  onClick={() => toggleStandard(std.id)}
                  className={`relative shrink-0 w-10 h-[22px] rounded-full transition-colors ${
                    enabled ? "bg-rose-600" : "bg-slate-300 dark:bg-slate-600"
                  }`}
                >
                  <span
                    className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white dark:bg-slate-800 shadow transition-transform ${
                      enabled ? "translate-x-[18px]" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                {std.description}
              </p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    enabled
                      ? "bg-rose-600 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {enabled ? "IN SCOPE" : "OUT OF SCOPE"}
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  {passed}/{std.requirements.length} passed
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Score + Radar Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>📡</span> Security Domain Coverage
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Share of passed controls per domain across in-scope frameworks.
          </p>

          <div className="relative mx-auto w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] mt-8 mb-10">
            {/* Grid rings (100% / 75% / 50% / 25%) */}
            <div className="absolute inset-0 rounded-full border border-slate-200 dark:border-slate-700" />
            <div className="absolute inset-[12.5%] rounded-full border border-slate-200 dark:border-slate-700" />
            <div className="absolute inset-[25%] rounded-full border border-slate-200 dark:border-slate-700" />
            <div className="absolute inset-[37.5%] rounded-full border border-slate-200 dark:border-slate-700" />

            {/* Axis spokes every 60° */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "repeating-conic-gradient(from 0deg, rgba(148,163,184,0.35) 0deg 0.5deg, transparent 0.5deg 60deg)",
              }}
            />

            {/* Radar outline + fill (pure CSS clip-path polygons) */}
            <div
              className="absolute inset-0"
              style={{ clipPath: `polygon(${outlinePolygon})`, backgroundColor: "#e11d48" }}
            />
            <div
              className="absolute inset-0"
              style={{ clipPath: `polygon(${polygon})`, backgroundColor: "rgba(225,29,72,0.25)" }}
            />

            {/* Vertex dots */}
            {RADAR_DOMAINS.map((d) => {
              const v = coverageValue(d.key);
              if (v <= 0) return null;
              const rad = (d.angle * Math.PI) / 180;
              return (
                <span
                  key={d.key}
                  className="absolute w-2 h-2 rounded-full bg-rose-600 border border-white shadow"
                  style={{
                    left: `${50 + 50 * v * Math.cos(rad)}%`,
                    top: `${50 - 50 * v * Math.sin(rad)}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              );
            })}

            {/* Center hub */}
            <span className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-900/70" />

            {/* Axis labels */}
            {RADAR_DOMAINS.map((d) => {
              const rad = (d.angle * Math.PI) / 180;
              return (
                <span
                  key={d.key}
                  className="absolute text-[10px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap"
                  style={{
                    left: `${50 + 54 * Math.cos(rad)}%`,
                    top: `${50 - 54 * Math.sin(rad)}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {d.label}
                </span>
              );
            })}
          </div>

          {/* Domain legend */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {RADAR_DOMAINS.map((d) => {
              const cov = coverageValue(d.key);
              return (
                <div
                  key={d.key}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                  <span className="text-[10px] text-slate-600 dark:text-slate-300 truncate">
                    {d.fullLabel}
                  </span>
                  <span className="ml-auto text-[10px] font-mono font-bold text-rose-700 dark:text-rose-300">
                    {Math.round(cov * 100)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Score Calculator */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow flex flex-col">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>🧮</span> Compliance Score Calculator
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Passed controls ÷ total controls across in-scope frameworks.
          </p>

          <div className="flex items-center gap-6 mt-5">
            {/* Score ring (CSS conic-gradient) */}
            <div
              className="relative w-32 h-32 rounded-full shrink-0"
              style={{
                background: `conic-gradient(#e11d48 ${score}%, #e2e8f0 0deg)`,
              }}
            >
              <div className="absolute inset-[10px] rounded-full bg-white dark:bg-slate-800 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                  {score}%
                </span>
                <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
                  OVERALL
                </span>
              </div>
            </div>

            <div className="space-y-2 flex-1">
              <span
                className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border ${
                  scoreTier === "COMPLIANT"
                    ? "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-600"
                    : scoreTier === "REVIEW"
                    ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-600"
                    : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-600"
                }`}
              >
                STATUS: {scoreTier}
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700">
                  <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
                    {passedCount}
                  </div>
                  <div className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400">
                    PASSED
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700">
                  <div className="text-lg font-extrabold text-red-700 dark:text-red-300">
                    {failedCount}
                  </div>
                  <div className="text-[9px] font-mono text-red-600 dark:text-red-400">
                    FAILED
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
                  <div className="text-lg font-extrabold text-slate-700 dark:text-slate-300">
                    {totalCount}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
                    TOTAL
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Per-standard breakdown */}
          <div className="mt-5 space-y-3">
            {COMPLIANCE_STANDARDS.map((std) => {
              const enabled = enabledStandards[std.id];
              const passed = std.requirements.filter(
                (r) => reqStatus[r.id] === "pass"
              ).length;
              const pct = Math.round((passed / std.requirements.length) * 100);
              return (
                <div key={std.id} className={enabled ? "" : "opacity-40"}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {std.icon} {std.name}
                      {!enabled && (
                        <span className="ml-1.5 text-[9px] font-mono text-slate-400 dark:text-slate-500">
                          (out of scope)
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      {passed}/{std.requirements.length} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-rose-600 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-auto pt-4 font-mono">
            Tip: toggle frameworks out of scope or flip controls to PASS/FAIL —
            score, radar, and breakdowns recompute instantly.
          </p>
        </div>
      </div>

      {/* Requirement Checklists */}
      <div className="space-y-6">
        {scopedStandards.length === 0 && (
          <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              All frameworks are out of scope — enable at least one standard to
              see its requirement checklist.
            </p>
          </div>
        )}

        {scopedStandards.map((std) => {
          const passed = std.requirements.filter(
            (r) => reqStatus[r.id] === "pass"
          ).length;
          const pct = Math.round((passed / std.requirements.length) * 100);
          return (
            <div
              key={std.id}
              className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{std.icon}</span>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      {std.name} — Requirement Checklist
                    </h4>
                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      {std.framework} · click any control to toggle PASS/FAIL
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {passed}/{std.requirements.length} PASSED
                  </span>
                  <div className="w-32 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-rose-600 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {std.requirements.map((req) => {
                  const status = reqStatus[req.id];
                  const isPass = status === "pass";
                  return (
                    <button
                      key={req.id}
                      type="button"
                      role="checkbox"
                      aria-checked={isPass}
                      onClick={() => toggleRequirement(req.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                        isPass
                          ? "bg-rose-50/50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/40"
                          : "bg-red-50/40 dark:bg-red-900/30 border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/40"
                      }`}
                    >
                      <span
                        className={`mt-0.5 min-w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isPass
                            ? "bg-rose-600 border-rose-600 text-white"
                            : "bg-white dark:bg-slate-800 border-red-400 text-red-500 dark:text-red-400"
                        }`}
                      >
                        {isPass ? "✓" : "✗"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {req.title}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[9px] font-mono text-slate-500 dark:text-slate-400">
                            {req.ref}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-700 text-[9px] font-mono text-rose-700 dark:text-rose-300">
                            {DOMAIN_LABELS[req.domain]}
                          </span>
                          <span
                            className={`ml-auto px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                              isPass
                                ? "bg-rose-600 text-white"
                                : "bg-red-600 text-white"
                            }`}
                          >
                            {isPass ? "PASS" : "FAIL"}
                          </span>
                        </span>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          {req.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
