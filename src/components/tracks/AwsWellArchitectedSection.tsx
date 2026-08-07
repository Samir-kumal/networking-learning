"use client";

import { useMemo, useState } from "react";

// ==========================================
// TYPES & INTERFACES
// ==========================================

export type WaAnswer = "yes" | "partial" | "no" | null;

export interface WaQuestion {
  id: string;
  text: string;
  /** Relative weight of this question within its pillar */
  weight: number;
  /** Shown as an improvement action whenever the answer is not "yes" */
  recommendation: string;
}

export interface WaPillar {
  id: string;
  name: string;
  shortName: string;
  emoji: string;
  color: string;
  /** Pillar importance multiplier used in the overall weighted score */
  weight: number;
  description: string;
  questions: WaQuestion[];
}

// ==========================================
// MOCK DATA — 6 PILLARS, 4 QUESTIONS EACH
// ==========================================

const PILLARS: WaPillar[] = [
  {
    id: "operations",
    name: "Operational Excellence",
    shortName: "Ops Excellence",
    emoji: "⚙️",
    color: "#58a6ff",
    weight: 1.0,
    description:
      "Run and monitor systems to deliver business value and continually improve supporting processes and procedures.",
    questions: [
      {
        id: "iac",
        text: "Is all infrastructure provisioned through Infrastructure as Code (CloudFormation / CDK / Terraform) across every environment?",
        weight: 3,
        recommendation:
          "Adopt IaC with AWS CloudFormation/CDK or Terraform for all environments and add drift detection (CloudFormation drift, Config managed rules) to prevent manual divergence.",
      },
      {
        id: "ci-cd",
        text: "Are deployments automated through CI/CD pipelines with automated tests, staged rollouts, and rollback strategies?",
        weight: 3,
        recommendation:
          "Automate deploys with CodePipeline/CodeDeploy or GitHub Actions, gate them on automated tests, and implement canary/linear rollout with automatic rollback on failed health checks.",
      },
      {
        id: "observability",
        text: "Do you have centralized observability — structured logs, metrics, and distributed tracing — with actionable alerts?",
        weight: 2,
        recommendation:
          "Centralize structured logs in CloudWatch Logs, trace requests with X-Ray, and build dashboards with alert thresholds tied to SLOs rather than static CPU/disk values.",
      },
      {
        id: "runbooks",
        text: "Are operational runbooks documented, and do you regularly run game days or incident response drills?",
        weight: 2,
        recommendation:
          "Document runbooks for every known failure mode (with AWS Support / Incident Manager playbooks), and schedule recurring game days to validate them before real incidents.",
      },
    ],
  },
  {
    id: "security",
    name: "Security",
    shortName: "Security",
    emoji: "🛡️",
    color: "#f0883e",
    weight: 1.2,
    description:
      "Protect data, systems, and assets while delivering business value through risk assessments and mitigation strategies.",
    questions: [
      {
        id: "iam-least-privilege",
        text: "Is IAM least privilege enforced — role-based access, no long-lived human access keys, and no root account usage?",
        weight: 3,
        recommendation:
          "Replace long-lived access keys with IAM Roles and short-term credentials, use IAM Access Analyzer to detect unused permissions, and enable SCPs/Service Control Policies in Organizations.",
      },
      {
        id: "mfa",
        text: "Is MFA required for all human users and are credentials rotated automatically?",
        weight: 2,
        recommendation:
          "Require MFA for every human user (IAM + Identity Center), enforce it with an SCP or IAM policy condition (aws:MultiFactorAuthPresent), and rotate programmatic credentials on a schedule.",
      },
      {
        id: "encryption",
        text: "Is data encrypted at rest (KMS / SSE) and in transit (TLS 1.2+), with S3 Block Public Access enabled?",
        weight: 3,
        recommendation:
          "Enable S3 default encryption with SSE-KMS, enforce TLS 1.2+ via bucket/service policies, enable S3 Block Public Access at account level, and use ACM for managed certificate rotation.",
      },
      {
        id: "detective-controls",
        text: "Are detective controls active — CloudTrail, GuardDuty, Security Hub — with automated response to findings?",
        weight: 2,
        recommendation:
          "Turn on CloudTrail (all regions, S3+CloudWatch delivery), enable GuardDuty and Security Hub, and wire findings into EventBridge → Lambda/Incident Manager for automated containment.",
      },
    ],
  },
  {
    id: "reliability",
    name: "Reliability",
    shortName: "Reliability",
    emoji: "🔁",
    color: "#3fb950",
    weight: 1.2,
    description:
      "Recover from failures quickly and scale seamlessly, so workloads meet agreed availability and durability targets.",
    questions: [
      {
        id: "multi-az",
        text: "Is the workload deployed across multiple Availability Zones with no single point of failure?",
        weight: 3,
        recommendation:
          "Deploy across at least two (ideally three) AZs — ALB/NLB + targets in each AZ, RDS/Aurora Multi-AZ, and data tiers replicated across AZs to survive an AZ loss.",
      },
      {
        id: "backups",
        text: "Are backups automated (RDS snapshots, EBS snapshots, S3 versioning) and are restores tested regularly?",
        weight: 3,
        recommendation:
          "Enable automated backups and cross-region snapshots for databases, S3 versioning + replication for objects, and run quarterly restore drills that prove RTO/RPO targets are met.",
      },
      {
        id: "scaling",
        text: "Does capacity scale automatically to handle demand and replace failed instances without manual intervention?",
        weight: 2,
        recommendation:
          "Use Auto Scaling Groups with target-tracking policies, EC2 health checks for replacement, and Application Auto Scaling for databases/queues so demand spikes never require human action.",
      },
      {
        id: "health-checks",
        text: "Are health checks and automated failover (Route 53, ALB, RDS Multi-AZ) configured for your critical paths?",
        weight: 2,
        recommendation:
          "Configure ALB target health checks and Route 53 health checks with failover/failover routing, and enable RDS Multi-AZ so database failover is automatic and monitored.",
      },
    ],
  },
  {
    id: "performance",
    name: "Performance Efficiency",
    shortName: "Performance",
    emoji: "⚡",
    color: "#a371f7",
    weight: 1.0,
    description:
      "Use computing resources efficiently to meet system requirements while maintaining efficiency as demand changes.",
    questions: [
      {
        id: "rightsizing",
        text: "Are resources right-sized based on actual utilization data (CloudWatch metrics, Compute Optimizer)?",
        weight: 3,
        recommendation:
          "Review CloudWatch utilization over 14+ days, act on Compute Optimizer recommendations to resize or change instance families, and schedule reviews on a recurring cadence.",
      },
      {
        id: "compute-fit",
        text: "Is the compute model matched to each workload — serverless (Lambda/Fargate), containers, or EC2 — including Graviton where beneficial?",
        weight: 2,
        recommendation:
          "Match compute to workload shape: Lambda/Fargate for bursty or event-driven, ECS/EKS for containers, EC2 for stateful long-running; evaluate Graviton for up to 20% better price/performance.",
      },
      {
        id: "caching",
        text: "Do you use caching (CloudFront, ElastiCache, DAX) and async processing (SQS/SNS) to reduce load on hot paths?",
        weight: 3,
        recommendation:
          "Front static and API responses with CloudFront, add ElastiCache or DAX for hot reads, and decouple bursts with SQS queues + Lambda consumers to smooth demand spikes.",
      },
      {
        id: "data-scale",
        text: "Do data stores scale horizontally — partitions, read replicas, managed services — rather than scaling up a single node?",
        weight: 2,
        recommendation:
          "Design DynamoDB keys/partitions for even distribution, use RDS read replicas for read-heavy workloads, and prefer managed services that scale without capacity planning.",
      },
    ],
  },
  {
    id: "cost",
    name: "Cost Optimization",
    shortName: "Cost",
    emoji: "💰",
    color: "#e3b341",
    weight: 1.0,
    description:
      "Run systems to deliver business value at the lowest price point while meeting functional and performance requirements.",
    questions: [
      {
        id: "budgets",
        text: "Do you monitor spend with budgets, anomaly detection, and regular Cost Explorer reviews?",
        weight: 3,
        recommendation:
          "Create AWS Budgets with alerts (including zero-spend for non-prod), enable Cost Anomaly Detection, and review Cost Explorer by service and tag on a monthly cadence.",
      },
      {
        id: "commitments",
        text: "Are Savings Plans / Reserved Instances used for stable baselines and Spot for interruptible workloads?",
        weight: 2,
        recommendation:
          "Purchase Savings Plans covering the steady-state compute baseline, and move fault-tolerant workloads (batch, CI, stateless workers) to Spot to cut costs 60–90%.",
      },
      {
        id: "idle-resources",
        text: "Are idle or oversized resources — stopped EC2, unattached EBS, unused Elastic IPs — decommissioned regularly?",
        weight: 3,
        recommendation:
          "Schedule EC2 start/stop for non-prod, delete unattached EBS snapshots older than 7 days and unused Elastic IPs, and use Compute Optimizer + Trusted Advisor to find waste automatically.",
      },
      {
        id: "storage-tiering",
        text: "Is storage tiered and governed by lifecycle policies (S3 Intelligent-Tiering, transitions, expiration)?",
        weight: 2,
        recommendation:
          "Apply S3 Lifecycle policies to transition to Infrequent Access/Glacier and expire old versions, use Intelligent-Tiering for unknown access patterns, and snapshot schedules that balance RPO vs cost.",
      },
    ],
  },
  {
    id: "sustainability",
    name: "Sustainability",
    shortName: "Sustainability",
    emoji: "🌱",
    color: "#39c5cf",
    weight: 0.8,
    description:
      "Minimize the environmental impact of running cloud workloads and maximize the efficiency of every unit of energy consumed.",
    questions: [
      {
        id: "efficient-compute",
        text: "Do you use the most efficient compute — Graviton, serverless, and right-sized instances — to minimize energy use?",
        weight: 3,
        recommendation:
          "Prioritize Graviton (up to 60% less energy for same work) and serverless compute, right-size everything, and decommission idle capacity that consumes energy for nothing.",
      },
      {
        id: "data-minimization",
        text: "Is data storage minimized — lifecycle policies, deletion of stale data, and compression — to reduce storage footprint?",
        weight: 2,
        recommendation:
          "Apply lifecycle rules to expire stale logs/objects, delete orphaned snapshots, compress and deduplicate data, and move cold data to Glacier where it belongs.",
      },
      {
        id: "schedule-down",
        text: "Are non-production workloads (dev, test, staging) scaled down or shut down outside business hours?",
        weight: 2,
        recommendation:
          "Automate start/stop of dev/test environments with Instance Scheduler, use a single shared lower-cost environment where possible, and treat idle environments as an energy leak.",
      },
      {
        id: "carbon-awareness",
        text: "Do you consider carbon footprint in architecture choices — using the AWS Customer Carbon Footprint Tool and energy-efficient regions/services?",
        weight: 1,
        recommendation:
          "Track emissions with the Customer Carbon Footprint Tool, prefer regions on low-carbon energy for non-latency-critical data, and favor efficient services (DynamoDB vs provisioned clusters where fit).",
      },
    ],
  },
];

// ==========================================
// SCORING HELPERS
// ==========================================

const ANSWER_VALUE: Record<Exclude<WaAnswer, null>, number> = {
  yes: 1,
  partial: 0.5,
  no: 0,
};

function getPillarScore(pillar: WaPillar, answers: Record<string, WaAnswer>) {
  const total = pillar.questions.reduce((sum, q) => sum + q.weight, 0);
  const earned = pillar.questions.reduce((sum, q) => {
    const a = answers[`${pillar.id}:${q.id}`];
    return sum + (a ? ANSWER_VALUE[a] * q.weight : 0);
  }, 0);
  return total === 0 ? 0 : Math.round((earned / total) * 100);
}

function getOverallScore(answers: Record<string, WaAnswer>) {
  const weightSum = PILLARS.reduce((sum, p) => sum + p.weight, 0);
  const weighted = PILLARS.reduce(
    (sum, p) => sum + getPillarScore(p, answers) * p.weight,
    0
  );
  return Math.round(weighted / weightSum);
}

function getAnsweredCount(answers: Record<string, WaAnswer>) {
  return Object.values(answers).filter((a) => a !== null && a !== undefined).length;
}

const TOTAL_QUESTIONS = PILLARS.reduce((sum, p) => sum + p.questions.length, 0);

function getMaturity(score: number) {
  if (score >= 85)
    return { label: "WELL-ARCHITECTED", badge: "bg-emerald-50 text-emerald-600 border-emerald-200" };
  if (score >= 70)
    return { label: "SOLID FOUNDATION", badge: "bg-amber-50 text-amber-600 border-amber-200" };
  if (score >= 50)
    return { label: "DEVELOPING", badge: "bg-orange-50 text-orange-600 border-orange-200" };
  return { label: "INITIAL", badge: "bg-rose-50 text-rose-600 border-rose-200" };
}

// ==========================================
// RADAR CHART (pure SVG — no chart library)
// ==========================================

const RADAR_SIZE = 320;
const RADAR_CX = RADAR_SIZE / 2;
const RADAR_CY = RADAR_SIZE / 2;
const RADAR_R = 112;
const RADAR_RINGS = [20, 40, 60, 80, 100];

function radarPoint(value: number, index: number) {
  const angle = (Math.PI * 2 * index) / PILLARS.length - Math.PI / 2;
  const r = (RADAR_R * value) / 100;
  return [RADAR_CX + r * Math.cos(angle), RADAR_CY + r * Math.sin(angle)] as const;
}

function radarPolygon(values: number[]): string {
  return values
    .map((v, i) => {
      const [x, y] = radarPoint(v, i);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function RadarChart({ scores }: { scores: number[] }) {
  return (
    <svg
      viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
      className="w-full max-w-[340px] mx-auto"
      role="img"
      aria-label="AWS Well-Architected radar chart across the six pillars"
    >
      {/* Grid rings */}
      {RADAR_RINGS.map((ring) => (
        <polygon
          key={ring}
          points={radarPolygon(PILLARS.map(() => ring))}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={ring === 100 ? 1.5 : 1}
          strokeDasharray={ring === 100 ? "none" : "4 4"}
        />
      ))}
      {/* Axis lines */}
      {PILLARS.map((_, i) => {
        const [x, y] = radarPoint(100, i);
        return (
          <line
            key={i}
            x1={RADAR_CX}
            y1={RADAR_CY}
            x2={x}
            y2={y}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        );
      })}
      {/* Data polygon */}
      <polygon
        points={radarPolygon(scores)}
        fill="#f0883e"
        fillOpacity={0.3}
        stroke="#f0883e"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* Data points */}
      {scores.map((score, i) => {
        const [x, y] = radarPoint(score, i);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={4}
            fill={PILLARS[i].color}
            stroke="#fff"
            strokeWidth={1.5}
          />
        );
      })}
      {/* Axis labels */}
      {PILLARS.map((pillar, i) => {
        const angle = (Math.PI * 2 * i) / PILLARS.length - Math.PI / 2;
        const lx = RADAR_CX + (RADAR_R + 34) * Math.cos(angle);
        const ly = RADAR_CY + (RADAR_R + 34) * Math.sin(angle);
        const anchor =
          Math.abs(Math.cos(angle)) < 0.3
            ? "middle"
            : Math.cos(angle) > 0
              ? "start"
              : "end";
        return (
          <text
            key={pillar.id}
            x={lx}
            y={ly}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize="10.5"
            fontWeight={700}
            fill={pillar.color}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          >
            {pillar.shortName}
          </text>
        );
      })}
    </svg>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function AwsWellArchitectedSection() {
  const [answers, setAnswers] = useState<Record<string, WaAnswer>>({});

  const scores = useMemo(
    () => PILLARS.map((p) => getPillarScore(p, answers)),
    [answers]
  );
  const overall = getOverallScore(answers);
  const answered = getAnsweredCount(answers);
  const maturity = getMaturity(overall);
  const completion = Math.round((answered / TOTAL_QUESTIONS) * 100);

  // --- Recommendations derived from non-"yes" answers ---
  const recommendations = useMemo(() => {
    const items: {
      pillar: WaPillar;
      question: WaQuestion;
      priority: "HIGH" | "MEDIUM";
    }[] = [];
    PILLARS.forEach((pillar) => {
      pillar.questions.forEach((q) => {
        const a = answers[`${pillar.id}:${q.id}`];
        if (a === "no") items.push({ pillar, question: q, priority: "HIGH" });
        else if (a === "partial")
          items.push({ pillar, question: q, priority: "MEDIUM" });
      });
    });
    return items.sort((a, b) =>
      a.priority === b.priority ? 0 : a.priority === "HIGH" ? -1 : 1
    );
  }, [answers]);

  const topActions = recommendations.slice(0, 6);

  return (
    <div className="space-y-16 py-6">
      {/* =====================================================
           TRACK TITLE BANNER
      ===================================================== */}
      <div className="rounded-2xl bg-gradient-to-r from-[#161b22] via-[#1c2333] to-[#161b22] border border-slate-200 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-[#f0883e]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f0883e]/10 border border-[#f0883e]/30 text-xs font-mono text-[#f0883e] mb-3">
              <span className="w-2 h-2 rounded-full bg-[#f0883e] animate-pulse" />
              AWS Well-Architected Framework Review
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Well-Architected Review &amp; Maturity Radar
            </h1>
            <p className="text-slate-500 text-sm sm:text-base mt-2 max-w-3xl">
              Self-assess your architecture against the six AWS Well-Architected pillars. Answer each
              question honestly — Yes, Partial, or No — and get a weighted maturity score, a radar
              chart of your posture, and prioritized improvement recommendations.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <span className="bg-slate-50 border border-slate-200 text-amber-600 px-3 py-1.5 rounded-lg">
              ✓ 6 Pillars
            </span>
            <span className="bg-slate-50 border border-slate-200 text-indigo-600 px-3 py-1.5 rounded-lg">
              ✓ Weighted Scoring
            </span>
            <span className="bg-slate-50 border border-slate-200 text-emerald-600 px-3 py-1.5 rounded-lg">
              ✓ Radar Analysis
            </span>
            <span className="bg-slate-50 border border-slate-200 text-rose-600 px-3 py-1.5 rounded-lg">
              ✓ Action Plan
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================
           SECTION: SCORECARD + RADAR OVERVIEW
      ===================================================== */}
      <section
        id="wa-overview"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-8 shadow-xl hover:border-[#f0883e]/40 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono text-[#f0883e] uppercase tracking-wider mb-1">
              Module 01 / Maturity Scorecard
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              <span>📊</span> Weighted Pillar Scores &amp; Radar Chart
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500">Overall Maturity:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${maturity.badge}`}
            >
              {maturity.label}
            </span>
          </div>
        </div>

        {/* Overall score hero */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-200">
          <div className="md:col-span-1 flex flex-col items-center justify-center text-center space-y-2">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="#f0883e"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(overall / 100) * 326.7} 326.7`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">{overall}</span>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  / 100
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-slate-900">
                {maturity.label}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Weighted across pillars (Security &amp; Reliability weighted 1.2×)
              </div>
            </div>
          </div>

          {/* Radar chart */}
          <div className="md:col-span-1 flex items-center justify-center">
            <RadarChart scores={scores} />
          </div>

          {/* Per-pillar score bars */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">
                Progress: {answered} / {TOTAL_QUESTIONS} questions answered
              </span>
              <span className="text-[#f0883e] font-bold">{completion}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-[#f0883e] rounded-full transition-all duration-500"
                style={{ width: `${completion}%` }}
              />
            </div>
            <div className="space-y-2.5 pt-2">
              {PILLARS.map((pillar, i) => (
                <div key={pillar.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: pillar.color }}
                      />
                      {pillar.shortName}
                      <span className="text-slate-400 font-medium">w={pillar.weight.toFixed(1)}</span>
                    </span>
                    <span
                      className={`font-bold ${
                        scores[i] >= 85
                          ? "text-emerald-600"
                          : scores[i] >= 50
                            ? "text-amber-600"
                            : "text-rose-600"
                      }`}
                    >
                      {scores[i]}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${scores[i]}%`,
                        backgroundColor: pillar.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-500 font-mono">
            Scoring: <span className="text-emerald-600 font-bold">Yes = 100%</span> ·{" "}
            <span className="text-amber-600 font-bold">Partial = 50%</span> ·{" "}
            <span className="text-rose-600 font-bold">No = 0%</span> · unanswered questions count
            as 0. Each question carries a weight; each pillar carries a weight.
          </p>
          <button
            onClick={() => setAnswers({})}
            className="px-4 py-2 rounded-lg text-xs font-mono font-bold border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
          >
            ↺ Reset All Answers
          </button>
        </div>
      </section>

      {/* =====================================================
           SECTION: PILLAR-BY-PILLAR QUESTIONNAIRE
      ===================================================== */}
      <section
        id="wa-assessment"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-8 shadow-xl hover:border-[#f0883e]/40 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono text-[#f0883e] uppercase tracking-wider mb-1">
              Module 02 / Pillar-by-Pillar Questionnaire
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              <span>📋</span> Six Pillar Assessment
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            {answered}/{TOTAL_QUESTIONS} Answered
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {PILLARS.map((pillar, i) => {
            const pScore = scores[i];
            return (
              <div
                key={pillar.id}
                className="rounded-xl bg-white border border-slate-200 shadow-md hover:shadow-lg transition-shadow p-5 space-y-5"
              >
                {/* Pillar header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
                  <div className="flex items-start gap-3">
                    <span
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: `${pillar.color}1a` }}
                    >
                      {pillar.emoji}
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        {pillar.name}
                        <span
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                          style={{
                            color: pillar.color,
                            borderColor: `${pillar.color}55`,
                            backgroundColor: `${pillar.color}14`,
                          }}
                        >
                          w={pillar.weight.toFixed(1)}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        {pillar.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className="text-xl font-extrabold font-mono"
                      style={{ color: pillar.color }}
                    >
                      {pScore}
                      <span className="text-xs text-slate-400">/100</span>
                    </div>
                    <div className="w-24 h-1.5 rounded-full bg-slate-200 overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pScore}%`, backgroundColor: pillar.color }}
                      />
                    </div>
                  </div>
                </div>

                {/* Questions */}
                <div className="space-y-4">
                  {pillar.questions.map((q) => {
                    const key = `${pillar.id}:${q.id}`;
                    const current = answers[key] ?? null;
                    return (
                      <div key={q.id} className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs text-slate-700 font-medium leading-relaxed">
                            {q.text}
                          </p>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0 pt-0.5">
                            w={q.weight}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {(
                            [
                              ["yes", "✓ Yes", "bg-emerald-500/15 text-emerald-600 border-emerald-400"],
                              ["partial", "◐ Partial", "bg-amber-500/15 text-amber-600 border-amber-400"],
                              ["no", "✗ No", "bg-rose-500/15 text-rose-600 border-rose-400"],
                            ] as const
                          ).map(([value, label, activeCls]) => (
                            <button
                              key={value}
                              onClick={() =>
                                setAnswers((prev) => ({
                                  ...prev,
                                  [key]: current === value ? null : value,
                                }))
                              }
                              className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-bold border transition-all ${
                                current === value
                                  ? activeCls
                                  : "bg-slate-50 text-slate-400 border-slate-200 hover:border-[#8b949e] hover:text-slate-600"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================
           SECTION: IMPROVEMENT RECOMMENDATIONS
      ===================================================== */}
      <section
        id="wa-recommendations"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-8 shadow-xl hover:border-[#f0883e]/40 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono text-[#f0883e] uppercase tracking-wider mb-1">
              Module 03 / Improvement Plan
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              <span>🚀</span> Prioritized Recommendations
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            {recommendations.length} Action Item{recommendations.length === 1 ? "" : "s"}
          </span>
        </div>

        {recommendations.length === 0 ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-2">
            <div className="text-3xl">🏆</div>
            <p className="text-sm font-bold text-emerald-700 font-mono">
              OUTSTANDING — NO IMPROVEMENT ITEMS DETECTED
            </p>
            <p className="text-xs text-emerald-600">
              Every question was answered Yes. Re-run the review with honest, real-world answers
              to uncover gaps — no architecture is perfect.
            </p>
          </div>
        ) : (
          <>
            {/* Top priority actions */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 font-mono flex items-center gap-2">
                <span>🎯</span> Top Priority Actions ({topActions.length})
              </h3>
              <div className="space-y-3">
                {topActions.map(({ pillar, question, priority }, idx) => (
                  <div
                    key={`${pillar.id}:${question.id}`}
                    className="flex gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:border-[#f0883e]/40 transition-colors"
                  >
                    <div className="shrink-0 flex flex-col items-center gap-1">
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-extrabold font-mono ${
                          priority === "HIGH"
                            ? "bg-rose-100 text-rose-600 border border-rose-200"
                            : "bg-amber-100 text-amber-600 border border-amber-200"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          priority === "HIGH"
                            ? "bg-rose-50 text-rose-500"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {priority}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[11px] font-mono">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: pillar.color }}
                        />
                        <span className="font-bold text-slate-700">
                          {pillar.emoji} {pillar.name}
                        </span>
                        <span className="text-slate-400">· w={question.weight}</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{question.text}</p>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        <span className="font-bold text-[#f0883e] font-mono text-[11px]">
                          {priority === "HIGH" ? "FIX" : "IMPROVE"}:
                        </span>{" "}
                        {question.recommendation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Full breakdown per pillar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {PILLARS.map((pillar) => {
                const items = recommendations.filter((r) => r.pillar.id === pillar.id);
                if (items.length === 0) return null;
                return (
                  <div
                    key={pillar.id}
                    className="rounded-xl border border-slate-200 p-4 space-y-3 bg-white shadow-sm"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h4 className="text-xs font-mono font-bold text-slate-900 flex items-center gap-2">
                        <span>{pillar.emoji}</span> {pillar.name}
                      </h4>
                      <span
                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
                        style={{
                          color: pillar.color,
                          backgroundColor: `${pillar.color}14`,
                          border: `1px solid ${pillar.color}44`,
                        }}
                      >
                        {items.length} gap{items.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {items.map(({ question, priority }) => (
                        <li key={question.id} className="flex gap-2 text-[11px] leading-relaxed">
                          <span
                            className={`mt-0.5 shrink-0 font-mono font-bold ${
                              priority === "HIGH" ? "text-rose-500" : "text-amber-500"
                            }`}
                          >
                            {priority === "HIGH" ? "✗" : "◐"}
                          </span>
                          <span className="text-slate-600">
                            <span className="font-bold text-slate-800">{question.recommendation}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Lowest pillar callout */}
            <div className="rounded-xl bg-[#f0883e]/5 border border-[#f0883e]/30 p-4 flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <p className="text-xs text-slate-700 leading-relaxed">
                <span className="font-bold text-[#f0883e] font-mono">START HERE:</span> Your
                weakest pillar is{" "}
                <span className="font-bold">
                  {PILLARS.reduce(
                    (lowest, p, i) =>
                      scores[i] < scores[PILLARS.indexOf(lowest)] ? p : lowest,
                    PILLARS[0]
                  ).name}
                </span>{" "}
                (score {Math.min(...scores)}/100). Focus the first remediation sprint there — the
                weighted model gives it the largest drag on your overall maturity. Re-run this
                review after each improvement cycle to track progress.
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
