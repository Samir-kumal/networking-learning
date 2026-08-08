"use client";

import { useState, type Dispatch, type SetStateAction } from "react";

// ============================================================
// Types
// ============================================================

type ParamType = "SecureString" | "String" | "StringList";

interface ParamNode {
  name: string;
  path: string;
  kind: "folder" | "param";
  type?: ParamType;
  tier?: "Standard" | "Advanced";
  kmsKey?: string;
  value?: string;
  version?: number;
  lastModified?: string;
  children?: ParamNode[];
}

type RotationCadence = "weekly" | "monthly" | "quarterly" | "custom";

type RotationStrategy = "single" | "alternating";

interface CronSpec {
  minute: number;
  hour: number;
  dom: number[] | null;
  month: number[] | null;
  dow: number[] | null;
}

interface EvalStatement {
  sid: string;
  effect: "Allow" | "Deny";
  actions: string[];
  resources: string[];
  requires: { mfa?: boolean; tls?: boolean; vpc?: boolean };
}

interface PolicyPreset {
  id: string;
  label: string;
  statements: EvalStatement[];
}

interface StatementResult {
  sid: string;
  effect: "Allow" | "Deny";
  applies: boolean;
  actionMatched: boolean;
  resourceMatched: boolean;
  conditionSkipped: boolean;
  reason: string;
}

type EvalDecision = "ALLOW" | "EXPLICIT_DENY" | "IMPLICIT_DENY";

interface SecretVersion {
  id: string;
  stage: string[];
  created: string;
  source: string;
  enabled: boolean;
  payload: Record<string, string | number>;
}

// ============================================================
// Static data
// ============================================================

const SECRET_ARN =
  "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/db/credentials-AbC12d";

const PARAMETER_TREE: ParamNode[] = [
  {
    name: "prod",
    path: "/prod",
    kind: "folder",
    children: [
      {
        name: "api",
        path: "/prod/api",
        kind: "folder",
        children: [
          {
            name: "db",
            path: "/prod/api/db",
            kind: "folder",
            children: [
              {
                name: "password",
                path: "/prod/api/db/password",
                kind: "param",
                type: "SecureString",
                tier: "Advanced",
                kmsKey: "alias/aws/ssm",
                value: "DbP@ss_X9!qZ72#mK",
                version: 12,
                lastModified: "2026-08-07 21:40 UTC",
              },
              {
                name: "port",
                path: "/prod/api/db/port",
                kind: "param",
                type: "String",
                tier: "Standard",
                value: "5432",
                version: 3,
                lastModified: "2026-03-02 10:15 UTC",
              },
              {
                name: "hosts",
                path: "/prod/api/db/hosts",
                kind: "param",
                type: "StringList",
                tier: "Standard",
                value: "db-1.prod.internal,db-2.prod.internal,db-3.prod.internal",
                version: 5,
                lastModified: "2026-06-18 08:00 UTC",
              },
            ],
          },
          {
            name: "redis-url",
            path: "/prod/api/redis/url",
            kind: "param",
            type: "SecureString",
            tier: "Advanced",
            kmsKey: "arn:aws:kms:us-east-1:123456789012:key/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            value: "redis://cache.prod.internal:6379/0",
            version: 8,
            lastModified: "2026-07-30 16:22 UTC",
          },
          {
            name: "feature-flags",
            path: "/prod/api/feature-flags",
            kind: "param",
            type: "String",
            tier: "Standard",
            value: '{"checkout_v2":true,"recommendations":false}',
            version: 21,
            lastModified: "2026-08-01 09:05 UTC",
          },
        ],
      },
      {
        name: "frontend",
        path: "/prod/frontend",
        kind: "folder",
        children: [
          {
            name: "sentry-dsn",
            path: "/prod/frontend/sentry-dsn",
            kind: "param",
            type: "SecureString",
            tier: "Advanced",
            kmsKey: "alias/aws/ssm",
            value: "https://abc123@o45000.ingest.sentry.io/45000",
            version: 2,
            lastModified: "2026-04-11 12:00 UTC",
          },
        ],
      },
    ],
  },
  {
    name: "staging",
    path: "/staging",
    kind: "folder",
    children: [
      {
        name: "api",
        path: "/staging/api",
        kind: "folder",
        children: [
          {
            name: "db-password",
            path: "/staging/api/db-password",
            kind: "param",
            type: "SecureString",
            tier: "Standard",
            kmsKey: "alias/aws/ssm",
            value: "Staging_Pw#41!",
            version: 9,
            lastModified: "2026-07-19 14:33 UTC",
          },
          {
            name: "feature-flags",
            path: "/staging/api/feature-flags",
            kind: "param",
            type: "String",
            tier: "Standard",
            value: '{"checkout_v2":true,"recommendations":true}',
            version: 14,
            lastModified: "2026-08-02 11:20 UTC",
          },
        ],
      },
    ],
  },
  {
    name: "dev",
    path: "/dev",
    kind: "folder",
    children: [
      {
        name: "api",
        path: "/dev/api",
        kind: "folder",
        children: [
          {
            name: "db-password",
            path: "/dev/api/db-password",
            kind: "param",
            type: "SecureString",
            tier: "Standard",
            kmsKey: "alias/aws/ssm",
            value: "dev-local-only",
            version: 4,
            lastModified: "2026-05-22 08:45 UTC",
          },
        ],
      },
    ],
  },
];

const INITIAL_EXPANDED: string[] = [
  "/prod",
  "/prod/api",
  "/prod/api/db",
  "/prod/frontend",
  "/staging",
  "/staging/api",
  "/dev",
  "/dev/api",
];

const TYPE_LEGEND: { type: ParamType; note: string; badge: string }[] = [
  {
    type: "SecureString",
    note: "Encrypted at rest via AWS KMS (envelope encryption). Requires kms:Decrypt + --with-decryption.",
    badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600",
  },
  {
    type: "String",
    note: "Plaintext string stored as-is. Suitable for non-sensitive config.",
    badge: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600",
  },
  {
    type: "StringList",
    note: "Comma-delimited plaintext list (e.g. hostnames). Parsed into an array by the SDK.",
    badge: "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-600",
  },
];

const ROTATION_NOW = new Date("2026-08-08T12:00:00Z");

// ============================================================
// Helpers
// ============================================================

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(
    d.getUTCDate()
  )} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC`;
}

function daysUntil(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function parseCronExpression(expr: string): CronSpec | null {
  const m = expr
    .trim()
    .match(/^cron\(\s*(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*\)$/i);
  if (!m) return null;
  const parseField = (raw: string): number[] | null => {
    if (raw === "*" || raw === "?") return null;
    const parts = raw
      .split(",")
      .map((s) => parseInt(s.trim(), 10));
    if (parts.length === 0 || parts.some((p) => Number.isNaN(p))) return null;
    return parts;
  };
  const minute = parseInt(m[1], 10);
  const hour = parseInt(m[2], 10);
  if (Number.isNaN(minute) || Number.isNaN(hour)) return null;
  if (minute < 0 || minute > 59 || hour < 0 || hour > 23) return null;
  const dom = parseField(m[3]);
  const month = parseField(m[4]);
  const dow = parseField(m[5]);
  if (
    (dom && dom.some((d) => d < 1 || d > 31)) ||
    (month && month.some((mo) => mo < 1 || mo > 12)) ||
    (dow && dow.some((d) => d < 1 || d > 7))
  ) {
    return null;
  }
  return { minute, hour, dom, month, dow };
}

function findNextRun(spec: CronSpec, after: Date): Date | null {
  const start = Date.UTC(
    after.getUTCFullYear(),
    after.getUTCMonth(),
    after.getUTCDate()
  );
  for (let d = 0; d < 1460; d += 1) {
    const day = start + d * 86_400_000;
    const dt = new Date(day);
    const monthOk = !spec.month || spec.month.includes(dt.getUTCMonth() + 1);
    const domOk = !spec.dom || spec.dom.includes(dt.getUTCDate());
    const dowOk =
      !spec.dow || spec.dow.includes(dt.getUTCDay() === 0 ? 7 : dt.getUTCDay());
    const dayOk =
      spec.dom && spec.dow
        ? domOk || dowOk // AWS: both specified => either may match
        : spec.dom
          ? domOk
          : spec.dow
            ? dowOk
            : true;
    if (!monthOk || !dayOk) continue;
    const candidate = Date.UTC(
      dt.getUTCFullYear(),
      dt.getUTCMonth(),
      dt.getUTCDate(),
      spec.hour,
      spec.minute,
      0
    );
    if (candidate > after.getTime()) return new Date(candidate);
  }
  return null;
}

function nextRotationRuns(spec: CronSpec, from: Date, count: number): Date[] {
  const out: Date[] = [];
  let cursor = from;
  for (let i = 0; i < count; i += 1) {
    const next = findNextRun(spec, cursor);
    if (!next) break;
    out.push(next);
    cursor = new Date(next.getTime() + 60_000);
  }
  return out;
}

function wildcardMatch(pattern: string, value: string): boolean {
  const escaped = pattern
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${escaped}$`).test(value);
}

function maskSecretValue(value: string | number): string {
  return String(value).replace(/[^\s,]/g, "•");
}

// ============================================================
// Shared small components
// ============================================================

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. non-secure context) — no-op.
    }
  };
  return (
    <button
      onClick={handleCopy}
      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition shadow-sm ${
        copied
          ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600"
          : "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400"
      }`}
    >
      {copied ? "✓ Copied!" : label}
    </button>
  );
}

function ParamTypeBadge({ type }: { type: ParamType }) {
  const style =
    type === "SecureString"
      ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600"
      : type === "StringList"
        ? "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-600"
        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600";
  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${style}`}
    >
      {type}
    </span>
  );
}

function StagePill({ stage }: { stage: string }) {
  const style =
    stage === "AWSCURRENT"
      ? "bg-emerald-500 text-white"
      : stage === "AWSPREVIOUS"
        ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-600"
        : stage === "AWSPENDING"
          ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-600"
          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600";
  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${style}`}
    >
      {stage}
    </span>
  );
}

// ============================================================
// Main component
// ============================================================

export default function AwsSecretsManagerSection() {
  // ---- Module 1: Parameter Store hierarchy visualizer ----
  const [expandedPaths, setExpandedPaths] = useState<string[]>(INITIAL_EXPANDED);
  const [selectedParam, setSelectedParam] = useState<ParamNode>(
    PARAMETER_TREE[0].children![0].children![0].children![0]
  );
  const [revealValue, setRevealValue] = useState(false);

  // ---- Module 2: Rotation schedule configurator ----
  const [rotationCadence, setRotationCadence] =
    useState<RotationCadence>("monthly");
  const [customCron, setCustomCron] = useState<string>("cron(0 3 15 * ? *)");
  const [windowDay, setWindowDay] = useState<number>(1); // 1 = Sunday
  const [windowHour, setWindowHour] = useState<number>(3);
  const [rotationStrategy, setRotationStrategy] =
    useState<RotationStrategy>("alternating");
  const [cronError, setCronError] = useState<string | null>(null);

  // ---- Module 3: Cross-account trust policy builder ----
  const [ownerAccount, setOwnerAccount] = useState<string>("123456789012");
  const [consumerAccount, setConsumerAccount] = useState<string>("210987654321");
  const [consumerRole, setConsumerRole] = useState<string>("app-prod-role");
  const [conditionMode, setConditionMode] = useState<
    "none" | "sourceAccount" | "principalArn"
  >("principalArn");
  const [selectedActions, setSelectedActions] = useState<string[]>([
    "secretsmanager:GetSecretValue",
    "secretsmanager:DescribeSecret",
  ]);
  const [policyError, setPolicyError] = useState<string | null>(null);

  // ---- Module 4: IAM policy evaluator ----
  const [presetId, setPresetId] = useState<string>("least-privilege");
  const [requestAction, setRequestAction] = useState<string>(
    "secretsmanager:GetSecretValue"
  );
  const [requestResource, setRequestResource] = useState<string>(SECRET_ARN);
  const [ctxMfa, setCtxMfa] = useState(true);
  const [ctxTls, setCtxTls] = useState(true);
  const [ctxVpc, setCtxVpc] = useState(false);

  // ---- Module 5: Version history viewer ----
  const [secretVersions, setSecretVersions] = useState<SecretVersion[]>([
    {
      id: "b48f912c-9011-411a-8e3d-7c2a1f9d4e66",
      stage: ["AWSCURRENT"],
      created: "2026-08-08 09:12 UTC",
      source: "AWS Lambda rotation (rotate-prod-db)",
      enabled: true,
      payload: {
        username: "db_admin",
        password: "N9!qZ72#mKx@L4pW",
        host: "db-1.prod.internal",
        port: 5432,
        engine: "postgres",
      },
    },
    {
      id: "a31c8a41-77d2-4f9b-b5a0-91e3c22b8d14",
      stage: ["AWSPREVIOUS"],
      created: "2026-07-09 09:11 UTC",
      source: "AWS Lambda rotation (rotate-prod-db)",
      enabled: true,
      payload: {
        username: "db_admin",
        password: "M8!pY41#kBw@J3oV",
        host: "db-1.prod.internal",
        port: 5432,
        engine: "postgres",
      },
    },
    {
      id: "f07d5b62-5a1e-4c8d-9f32-0b6a7e8d9c10",
      stage: [],
      created: "2026-06-12 18:44 UTC",
      source: "Manual update (ops-console)",
      enabled: true,
      payload: {
        username: "db_admin",
        password: "L7!oR30#mYv@I2nU",
        host: "db-1.prod.internal",
        port: 5432,
        engine: "postgres",
      },
    },
    {
      id: "c9e2f1a0-3b4d-5e6f-7a8b-9c0d1e2f3a4b",
      stage: [],
      created: "2026-05-01 10:02 UTC",
      source: "Manual update (ops-console)",
      enabled: true,
      payload: {
        username: "db_admin",
        password: "K6!nQ29#zWx@H1mT",
        host: "db-1.prod.internal",
        port: 5432,
        engine: "postgres",
      },
    },
    {
      id: "d4a5b6c7-8e9f-0a1b-2c3d-4e5f6a7b8c9d",
      stage: [],
      created: "2026-03-22 07:30 UTC",
      source: "Manual update (ops-console)",
      enabled: false,
      payload: {
        username: "db_admin",
        password: "J5!mP18#yUv@G0qS",
        host: "db-2.prod.internal",
        port: 5432,
        engine: "postgres",
      },
    },
    {
      id: "e1f2a3b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b",
      stage: [],
      created: "2026-02-10 13:55 UTC",
      source: "Initial provisioning (CloudFormation)",
      enabled: false,
      payload: {
        username: "db_admin",
        password: "I4!lK07#xTs@F9pR",
        host: "db-2.prod.internal",
        port: 5432,
        engine: "postgres",
      },
    },
  ]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    secretVersions[0].id
  );
  const [revealVersionPayload, setRevealVersionPayload] = useState(false);

  // ============================================================
  // Module 1: hierarchy helpers
  // ============================================================

  const toggleFolder = (path: string) => {
    setExpandedPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const countParams = (nodes: ParamNode[]): number =>
    nodes.reduce(
      (acc, n) => acc + (n.kind === "param" ? 1 : countParams(n.children ?? [])),
      0
    );

  const renderTree = (nodes: ParamNode[], depth: number) =>
    nodes.map((node) =>
      node.kind === "folder" ? (
        <div key={node.path}>
          <button
            onClick={() => toggleFolder(node.path)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-emerald-50/70 dark:hover:bg-emerald-900/30 text-left transition"
            style={{ paddingLeft: `${8 + depth * 18}px` }}
          >
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 w-3 text-center">
              {expandedPaths.includes(node.path) ? "▼" : "▶"}
            </span>
            <span className="text-emerald-500 dark:text-emerald-400">📁</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
              {node.name}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono ml-1">
              ({countParams(node.children ?? [])})
            </span>
          </button>
          {expandedPaths.includes(node.path) &&
            node.children &&
            renderTree(node.children, depth + 1)}
        </div>
      ) : (
        <button
          key={node.path}
          onClick={() => setSelectedParam(node)}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition ${
            selectedParam.path === node.path
              ? "bg-emerald-50 dark:bg-emerald-900/30 ring-1 ring-emerald-400"
              : "hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
          style={{ paddingLeft: `${26 + depth * 18}px` }}
        >
          <span className="text-emerald-500 dark:text-emerald-400 text-[10px]">▸</span>
          <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{node.name}</span>
          {node.type && <ParamTypeBadge type={node.type} />}
          {node.value !== undefined && (
            <span className="ml-auto text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate max-w-[160px]">
              {revealValue ? node.value : "••••••"}
            </span>
          )}
        </button>
      )
    );

  const selectedValue = selectedParam.value ?? "";

  // ============================================================
  // Module 2: rotation helpers
  // ============================================================

  const activeCron = (): string => {
    switch (rotationCadence) {
      case "weekly":
        return `cron(0 ${windowHour} ? * ${windowDay} *)`;
      case "monthly":
        return `cron(0 ${windowHour} 1 * ? *)`;
      case "quarterly":
        return `cron(0 ${windowHour} 1 1,4,7,10 ? *)`;
      case "custom":
        return customCron.trim() || "cron(0 3 1 * ? *)";
    }
  };

  const rotationSpec = parseCronExpression(activeCron());
  const rotationRuns = rotationSpec
    ? nextRotationRuns(rotationSpec, ROTATION_NOW, 5)
    : [];

  const cadenceLabel: Record<RotationCadence, string> = {
    weekly: "Every 7 days",
    monthly: "Every 30 days",
    quarterly: "Every 90 days",
    custom: "Custom cron",
  };

  const cadenceDays: Record<RotationCadence, number | null> = {
    weekly: 7,
    monthly: 30,
    quarterly: 90,
    custom: null,
  };

  const handleCadenceChange = (c: RotationCadence) => {
    setRotationCadence(c);
    setCronError(null);
    if (c === "custom") {
      const spec = parseCronExpression(customCron);
      setCronError(spec ? null : "Invalid cron — expected cron(min hour dom month dow year).");
    }
  };

  const handleCustomCronChange = (value: string) => {
    setCustomCron(value);
    const spec = parseCronExpression(value);
    setCronError(
      value.trim() === "" || spec
        ? null
        : "Invalid cron — expected cron(min hour dom month dow year)."
    );
  };

  const rotationFlowSteps: Record<RotationStrategy, string[]> = {
    single: [
      "Lambda generates a high-entropy secret and creates a new version",
      "New version is staged as AWSCURRENT in a single atomic update",
      "Old version is deleted (clients pick up the new value on next fetch)",
    ],
    alternating: [
      "Lambda creates a new secret version staged as AWSPENDING",
      "Database credentials are updated with the AWSPENDING value",
      "New version is tested against the live application",
      "AWSPENDING is promoted to AWSCURRENT",
      "Previous AWSCURRENT is relabeled AWSPREVIOUS for instant rollback",
      "AWSPENDING label is removed and the Lambda function completes",
    ],
  };

  // ============================================================
  // Module 3: cross-account trust policy helpers
  // ============================================================

  const principalArn = `arn:aws:iam::${consumerAccount}:role/${consumerRole}`;

  const buildTrustPolicy = () => {
    const condition: Record<string, Record<string, string>> | undefined =
      conditionMode === "sourceAccount"
        ? { StringEquals: { "aws:SourceAccount": consumerAccount } }
        : conditionMode === "principalArn"
          ? { StringEquals: { "aws:PrincipalArn": principalArn } }
          : undefined;
    return JSON.stringify(
      {
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "AllowCrossAccountSecretAccess",
            Effect: "Allow",
            Principal: { AWS: principalArn },
            Action: selectedActions,
            Resource: SECRET_ARN,
            ...(condition ? { Condition: condition } : {}),
          },
        ],
      },
      null,
      2
    );
  };

  const validatePolicyInputs = (): string | null => {
    if (!/^\d{12}$/.test(ownerAccount)) {
      return "Owner account must be a 12-digit AWS account ID.";
    }
    if (!/^\d{12}$/.test(consumerAccount)) {
      return "Consumer account must be a 12-digit AWS account ID.";
    }
    if (!/^[A-Za-z0-9+=,.@_-]{1,64}$/.test(consumerRole)) {
      return "Role name must be 1–64 chars of [A-Za-z0-9+=,.@_-].";
    }
    if (selectedActions.length === 0) {
      return "Select at least one secret action.";
    }
    return null;
  };

  const toggleAction = (action: string) => {
    setSelectedActions((prev) =>
      prev.includes(action)
        ? prev.filter((a) => a !== action)
        : [...prev, action]
    );
  };

  const ALL_ACTIONS = [
    "secretsmanager:GetSecretValue",
    "secretsmanager:DescribeSecret",
    "secretsmanager:ListSecretVersionIds",
    "secretsmanager:PutSecretValue",
    "secretsmanager:RotateSecret",
  ];

  // ============================================================
  // Module 4: IAM policy evaluation helpers
  // ============================================================

  const POLICY_PRESETS: PolicyPreset[] = [
    {
      id: "least-privilege",
      label: "Least-Privilege Read",
      statements: [
        {
          sid: "AllowGetSecretValue",
          effect: "Allow",
          actions: ["secretsmanager:GetSecretValue"],
          resources: [SECRET_ARN],
          requires: { tls: true },
        },
      ],
    },
    {
      id: "ops-rotate",
      label: "Rotation Operator",
      statements: [
        {
          sid: "AllowSecretOps",
          effect: "Allow",
          actions: [
            "secretsmanager:GetSecretValue",
            "secretsmanager:DescribeSecret",
            "secretsmanager:PutSecretValue",
            "secretsmanager:RotateSecret",
          ],
          resources: [
            "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/*",
          ],
          requires: { mfa: true, tls: true },
        },
      ],
    },
    {
      id: "broad-power",
      label: "Broad Secrets Power",
      statements: [
        {
          sid: "AllowAllSecrets",
          effect: "Allow",
          actions: ["secretsmanager:*"],
          resources: [
            "arn:aws:secretsmanager:us-east-1:123456789012:secret:*",
          ],
          requires: {},
        },
        {
          sid: "AllowSsmGet",
          effect: "Allow",
          actions: ["ssm:GetParameter", "ssm:GetParametersByPath"],
          resources: [
            "arn:aws:ssm:us-east-1:123456789012:parameter/prod/*",
          ],
          requires: {},
        },
      ],
    },
    {
      id: "deny-staging-writes",
      label: "Deny Staging Writes",
      statements: [
        {
          sid: "DenyStagingMutation",
          effect: "Deny",
          actions: [
            "secretsmanager:DeleteSecret",
            "secretsmanager:PutSecretValue",
          ],
          resources: [
            "arn:aws:secretsmanager:us-east-1:123456789012:secret:staging/*",
          ],
          requires: {},
        },
        {
          sid: "AllowReadSecrets",
          effect: "Allow",
          actions: ["secretsmanager:GetSecretValue"],
          resources: ["arn:aws:secretsmanager:us-east-1:123456789012:secret:*"],
          requires: { tls: true },
        },
      ],
    },
    {
      id: "admin",
      label: "Secrets Administrator",
      statements: [
        {
          sid: "AdminAllSecrets",
          effect: "Allow",
          actions: ["secretsmanager:*", "ssm:*"],
          resources: ["*"],
          requires: {},
        },
      ],
    },
  ];

  const activePreset =
    POLICY_PRESETS.find((p) => p.id === presetId) ?? POLICY_PRESETS[0];

  const ACTION_OPTIONS = [
    "secretsmanager:GetSecretValue",
    "secretsmanager:DescribeSecret",
    "secretsmanager:ListSecretVersionIds",
    "secretsmanager:PutSecretValue",
    "secretsmanager:RotateSecret",
    "secretsmanager:DeleteSecret",
    "ssm:GetParameter",
    "ssm:GetParametersByPath",
    "ssm:PutParameter",
  ];

  const evaluatePolicy = (): {
    decision: EvalDecision;
    rows: StatementResult[];
  } => {
    const ctx = { mfa: ctxMfa, tls: ctxTls, vpc: ctxVpc };
    const rows: StatementResult[] = activePreset.statements.map((stmt) => {
      const actionMatched = stmt.actions.some((a) =>
        wildcardMatch(a, requestAction)
      );
      const resourceMatched = stmt.resources.some((r) =>
        wildcardMatch(r, requestResource)
      );
      const condKeys = Object.keys(stmt.requires) as (keyof typeof ctx)[];
      const conditionSkipped = condKeys.some((k) => !ctx[k]);
      const applies = actionMatched && resourceMatched && !conditionSkipped;
      let reason: string;
      if (!actionMatched) {
        reason = `Action ${requestAction} is not covered by this statement's actions.`;
      } else if (!resourceMatched) {
        reason = `Resource ${requestResource} does not match this statement's patterns.`;
      } else if (conditionSkipped) {
        reason = `Condition not satisfied: ${condKeys
          .filter((k) => !ctx[k])
          .map((k) =>
            k === "mfa"
              ? "MFA session"
              : k === "tls"
                ? "TLS transport"
                : "source VPC"
          )
          .join(", ")} — statement skipped.`;
      } else {
        reason =
          "Action and resource match; all conditions satisfied — statement applies.";
      }
      return {
        sid: stmt.sid,
        effect: stmt.effect,
        applies,
        actionMatched,
        resourceMatched,
        conditionSkipped,
        reason,
      };
    });

    const denyHit = rows.find((r) => r.applies && r.effect === "Deny");
    if (denyHit) return { decision: "EXPLICIT_DENY", rows };
    const allowHit = rows.find((r) => r.applies && r.effect === "Allow");
    if (allowHit) return { decision: "ALLOW", rows };
    return { decision: "IMPLICIT_DENY", rows };
  };

  const evalResult = evaluatePolicy();

  // ---- Module 5: version history helpers ----
  const selectedVersion =
    secretVersions.find((v) => v.id === selectedVersionId) ??
    secretVersions[0];

  const versionPayloadJson = JSON.stringify(
    selectedVersion.payload,
    (key, value) =>
      key === "password" && !revealVersionPayload ? "••••••••••" : value,
    2
  );

  const handlePromote = (id: string) => {
    setSecretVersions((prev) =>
      prev.map((v) => {
        if (v.id === id) {
          return {
            ...v,
            stage: [
              "AWSCURRENT",
              ...v.stage.filter(
                (s) => s !== "AWSCURRENT" && s !== "AWSPREVIOUS"
              ),
            ],
            enabled: true,
          };
        }
        if (v.stage.includes("AWSCURRENT")) {
          return {
            ...v,
            stage: [
              "AWSPREVIOUS",
              ...v.stage.filter(
                (s) => s !== "AWSCURRENT" && s !== "AWSPREVIOUS"
              ),
            ],
          };
        }
        if (v.stage.includes("AWSPREVIOUS")) {
          return { ...v, stage: v.stage.filter((s) => s !== "AWSPREVIOUS") };
        }
        return v;
      })
    );
    setSelectedVersionId(id);
  };

  // ---- Module 3: derived policy + validation ----
  const trustPolicy = buildTrustPolicy();
  const policyValidation = validatePolicyInputs();

  // ---- Module 2: derived schedule artifacts ----
  const rotationRuleJson = JSON.stringify(
    {
      ScheduleExpression: activeCron(),
      State: "ENABLED",
      Targets: [
        {
          Arn: "arn:aws:lambda:us-east-1:123456789012:function:rotate-prod-db",
          Id: "rotate-prod-db",
        },
      ],
    },
    null,
    2
  );

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const windowLabel =
    rotationCadence === "weekly"
      ? `Every ${WEEKDAYS[windowDay - 1]} ${pad2(windowHour)}:00 UTC`
      : rotationCadence === "monthly"
        ? `1st of month, ${pad2(windowHour)}:00 UTC`
        : rotationCadence === "quarterly"
          ? `1st of Jan / Apr / Jul / Oct, ${pad2(windowHour)}:00 UTC`
          : "Custom cron expression";

  return (
    <section id="aws-secrets-manager" className="scroll-mt-20 space-y-6">
      {/* ============ HEADER ============ */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-600/60 text-xs font-mono font-semibold">
            AWS · Secrets Manager &amp; Parameter Store
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-semibold">
            SECURITY TRACK
          </span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          🔐 Secrets Manager &amp; Parameter Store — Secure Secret Lifecycle
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Hierarchical parameters, KMS envelope encryption, automated rotation
          scheduling, cross-account trust policies, IAM evaluation, and
          versioned rollback with staging labels.
        </p>
        <div className="flex flex-wrap gap-2 mt-3 text-[10px] font-mono">
          {[
            { href: "#sm-hierarchy", label: "01 · Hierarchy Visualizer" },
            { href: "#sm-rotation", label: "02 · Rotation Scheduler" },
            { href: "#sm-cross-account", label: "03 · Cross-Account Trust" },
            { href: "#sm-iam-eval", label: "04 · IAM Policy Evaluator" },
            { href: "#sm-versions", label: "05 · Version History" },
          ].map((chip) => (
            <a
              key={chip.href}
              href={chip.href}
              className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition"
            >
              {chip.label}
            </a>
          ))}
        </div>
      </div>

      {/* ============ MODULE 1: HIERARCHY VISUALIZER ============ */}
      <div
        id="sm-hierarchy"
        className="scroll-mt-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
          <div>
            <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
              01 · SSM Parameter Store
            </div>
            <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              Secrets Hierarchy Visualizer
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Path hierarchy with per-type encryption semantics — SecureString
              is envelope-encrypted with KMS, String / StringList are plaintext.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TYPE_LEGEND.map((item) => (
              <span
                key={item.type}
                title={item.note}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${item.badge}`}
              >
                {item.type}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Tree */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/60 p-2">
            <div className="flex items-center justify-between px-2 py-1.5 mb-1">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-semibold">
                $ aws ssm get-parameters-by-path --path / --recursive
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                {countParams(PARAMETER_TREE)} params
              </span>
            </div>
            {renderTree(PARAMETER_TREE, 0)}
          </div>

          {/* Details */}
          <div className="lg:col-span-3 space-y-3">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-900/30 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-200 break-all">
                  {selectedParam.path}
                </span>
                {selectedParam.type && <ParamTypeBadge type={selectedParam.type} />}
                {selectedParam.tier && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
                    {selectedParam.tier} Tier
                  </span>
                )}
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
                  v{selectedParam.version}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                <div>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    Last Modified
                  </div>
                  <div className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">
                    {selectedParam.lastModified}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    KMS Key
                  </div>
                  <div className="font-mono text-slate-700 dark:text-slate-300 mt-0.5 break-all truncate" title={selectedParam.kmsKey}>
                    {selectedParam.kmsKey ?? "None — plaintext at rest"}
                  </div>
                </div>
              </div>

              {/* Value */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    Value
                    {selectedParam.type === "SecureString" && (
                      <span className="text-emerald-600 dark:text-emerald-400 ml-1">
                        (decrypt requires kms:Decrypt + --with-decryption)
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => setRevealValue((prev) => !prev)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600 hover:bg-emerald-500/25 transition"
                  >
                    {revealValue ? "🙈 Hide Value" : "👁️ Reveal Value"}
                  </button>
                </div>
                <pre className="p-3 rounded-lg bg-slate-900 border border-emerald-900/40 text-emerald-400 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
                  {revealValue ? selectedValue : maskSecretValue(selectedValue)}
                </pre>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                How to fetch this parameter
              </div>
              <pre className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-emerald-700 dark:text-emerald-300 overflow-x-auto">
                {`$ aws ssm get-parameter --name ${selectedParam.path} ${
                  selectedParam.type === "SecureString"
                    ? "--with-decryption"
                    : ""
                }`}
              </pre>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {selectedParam.type === "SecureString"
                  ? "SecureString values are encrypted at rest with envelope encryption: the KMS customer/aws-managed key encrypts a data key, which encrypts the value. IAM must allow both ssm:GetParameter and kms:Decrypt on the key."
                  : selectedParam.type === "StringList"
                    ? "StringList values are comma-delimited — the AWS SDK parses them into an array (e.g. hostnames across AZs). No encryption at rest."
                    : "String values are stored as plaintext — fine for non-sensitive configuration like ports and feature flags."}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ 2: ROTATION SCHEDULER ============ */}
      <div
        id="sm-rotation"
        className="scroll-mt-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-sm"
      >
        <div className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
          <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
            02 · Secrets Rotation
          </div>
          <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
            Rotation Schedule Configurator
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Compose a rotation cadence, pick an execution window, and preview
            the exact schedule EventBridge will fire.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Configurator */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
            <div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1.5">
                Rotation cadence
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["weekly", "Every 7 days"],
                    ["monthly", "Every 30 days"],
                    ["quarterly", "Every 90 days"],
                    ["custom", "Custom cron"],
                  ] as [RotationCadence, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => handleCadenceChange(value)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold border transition ${
                      rotationCadence === value
                        ? "bg-emerald-500 text-white border-emerald-500 shadow"
                        : "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1">
                  Preferred day (window)
                </label>
                <select
                  value={windowDay}
                  onChange={(e) => setWindowDay(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono focus:border-emerald-400 focus:outline-none"
                >
                  {WEEKDAYS.map((day, idx) => (
                    <option key={day} value={idx + 1}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1">
                  Hour (UTC)
                </label>
                <select
                  value={windowHour}
                  onChange={(e) => setWindowHour(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono focus:border-emerald-400 focus:outline-none"
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {pad2(h)}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {rotationCadence === "custom" && (
              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1">
                  Cron expression (6-field AWS schedule)
                </label>
                <input
                  value={customCron}
                  onChange={(e) => handleCustomCronChange(e.target.value)}
                  placeholder="cron(min hour dom month dow year)"
                  className={`w-full bg-slate-50 dark:bg-slate-700 border rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none ${
                    cronError
                      ? "border-rose-400 text-rose-600 dark:text-rose-400"
                      : "border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-300 focus:border-emerald-400"
                  }`}
                />
                {cronError && (
                  <div className="mt-1 text-[10px] font-mono text-rose-600 dark:text-rose-400">
                    ⚠ {cronError}
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1.5">
                Rotation strategy
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setRotationStrategy("single")}
                  className={`px-3 py-2 rounded-lg text-[11px] font-mono font-bold border transition text-left ${
                    rotationStrategy === "single"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400"
                      : "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400"
                  }`}
                >
                  Single-User
                  <div className="text-[9px] font-sans font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                    One credential set, atomic swap
                  </div>
                </button>
                <button
                  onClick={() => setRotationStrategy("alternating")}
                  className={`px-3 py-2 rounded-lg text-[11px] font-mono font-bold border text-left ${
                    rotationStrategy === "alternating"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400"
                      : "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400"
                  }`}
                >
                  Alternating
                  <div className="text-[9px] font-sans font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    AWSCURRENT / AWSPREVIOUS dual-set
                  </div>
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 p-3">
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1">
                Generated schedule (EventBridge rule)
              </div>
              <div className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 break-all">
                {activeCron()}
              </div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                {windowLabel} · {cadenceLabel[rotationCadence]}
              </div>
            </div>
          </div>

          {/* Schedule board */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Upcoming rotation runs
                </span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {rotationSpec ? "SCHEDULE ACTIVE" : "SCHEDULE INVALID"}
                </span>
              </div>
              {rotationSpec && rotationRuns.length > 0 ? (
                <div className="space-y-1.5">
                  {rotationRuns.map((run, idx) => (
                    <div
                      key={run.getTime()}
                      className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 px-3 py-2"
                    >
                      <span className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-300 dark:border-emerald-600 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatUtc(run)}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          rotation #{idx + 1} · {cadenceLabel[rotationCadence]}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-bold">
                        T-{daysUntil(ROTATION_NOW, run)}d
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-xs text-rose-600 dark:text-rose-400 font-mono bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700 rounded-lg">
                  Invalid cron expression — fix the custom schedule above.
                </div>
              )}

              <div className="mt-3">
                <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1.5">
                  Rotation pipeline ({rotationStrategy === "single" ? "single-user" : "alternating"})
                </div>
                <ol className="space-y-1">
                  {rotationFlowSteps[rotationStrategy].map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                      <span className="mt-0.5 w-4 h-4 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[9px] font-mono font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  Rotation rule (Secrets Manager + EventBridge)
                </span>
                <CopyButton text={rotationRuleJson} label="📋 Copy rule" />
              </div>
              <pre className="p-3 rounded-lg bg-slate-900 border border-emerald-900/40 text-emerald-400 text-[11px] font-mono overflow-x-auto">
{`$ aws secretsmanager rotate-secret --secret-id prod/db/credentials \\
    --rotation-rules "AutomaticallyAfterDays=${
      cadenceDays[rotationCadence] ?? "n/a"
    },ScheduleExpression=\\"${activeCron()}\\""`}
              </pre>
              <pre className="mt-2 p-3 rounded-lg bg-slate-900 border border-emerald-900/40 text-emerald-400 text-[11px] font-mono overflow-x-auto">
                {rotationRuleJson}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* ============ 3: CROSS-ACCOUNT TRUST ============ */}
      <div
        id="sm-cross-account"
        className="scroll-mt-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-sm"
      >
        <div className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
          <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
            03 · Cross-Account Access
          </div>
          <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
            Cross-Account Trust Policy Builder
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Attach a resource-based policy to the secret so a role in another
            account can read it — the secret “trusts” the foreign principal.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Builder */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1">
                  Owner account
                </label>
                <input
                  value={ownerAccount}
                  onChange={(e) => setOwnerAccount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono focus:border-emerald-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1">
                  Consumer account
                </label>
                <input
                  value={consumerAccount}
                  onChange={(e) => setConsumerAccount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1">
                Consumer role name
              </label>
              <input
                value={consumerRole}
                onChange={(e) => setConsumerRole(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono focus:border-emerald-400 focus:outline-none"
              />
              <div className="mt-1 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                Principal: {principalArn}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1.5">
                Confused-deputy guard (Condition)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["none", "None"],
                    ["principalArn", "aws:PrincipalArn"],
                    ["sourceAccount", "aws:SourceAccount"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setConditionMode(value)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold border transition ${
                      conditionMode === value
                        ? "bg-emerald-500 text-white border-emerald-500 shadow"
                        : "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                {conditionMode === "sourceAccount"
                  ? "Restricts the grant to calls originating from the consumer account — guards against the confused-deputy problem."
                  : conditionMode === "principalArn"
                    ? "Binds the grant to the exact role ARN — the strictest form of cross-account trust."
                    : "No condition — any principal with credentials in the consumer account who can assume the role benefits."}
              </p>
            </div>

            <div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1.5">
                Actions granted to the consumer
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ALL_ACTIONS.map((action) => {
                  const checked = selectedActions.includes(action);
                  return (
                    <button
                      key={action}
                      onClick={() => toggleAction(action)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border transition ${
                        checked
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400"
                          : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-400"
                      }`}
                    >
                      {checked ? "✓ " : ""}
                      {action}
                    </button>
                  );
                })}
              </div>
            </div>

            {policyError ? (
              <div className="rounded-lg bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700 px-3 py-2 text-[11px] font-mono text-rose-600 dark:text-rose-400">
                ⚠ {policyError}
              </div>
            ) : (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 px-3 py-2 text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
                ✓ Policy valid — resource policy is attachable.
              </div>
            )}

            <div className="rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 p-3 space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-semibold">
                Why this works (4 steps)
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-700 dark:text-emerald-300">
                <span className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-600">
                  Owner {ownerAccount}
                </span>
                <span>—— resource policy ——▶</span>
                <span className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-600">
                  {consumerRole} @ {consumerAccount}
                </span>
              </div>
              <div>
                1. The consumer role assumes/uses its role in its own account —
                IAM “trust” is always intra-account.
              </div>
              <div>
                2. The secret&apos;s resource policy (below) grants the foreign
                principal ARN access — cross-account trust.
              </div>
              <div>
                3. The secret&apos;s KMS key policy must also allow the same
                principal to kms:Decrypt — two policies, both required.
              </div>
              <div>
                4. The consumer SDK call targets the secret ARN with a
                cross-account role session; AWS authorizes against both
                policies.
              </div>
            </div>
          </div>

          {/* Policy preview */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                Generated resource-based policy (trust policy)
              </span>
              <CopyButton text={trustPolicy} label="📋 Copy policy" />
            </div>
            <pre className="p-3 rounded-lg bg-slate-900 text-emerald-400 text-[11px] font-mono overflow-x-auto">
              {trustPolicy}
            </pre>
            <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              <span className="font-bold text-slate-700 dark:text-slate-300">Attach with:</span>{" "}
              <span className="font-mono text-emerald-700 dark:text-emerald-300">
                aws secretsmanager put-resource-policy --secret-id
                prod/db/credentials --resource-policy &apos;{trustPolicy}&apos;
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============ 4: IAM POLICY EVALUATOR ============ */}
      <div
        id="sm-iam-eval"
        className="scroll-mt-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-sm"
      >
        <div className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
          <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
            04 · IAM Authorization
          </div>
          <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
            IAM Policy Evaluator for Secrets Access
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Simulate an API request against an attachable identity policy —
            explicit Deny always wins, a matching Allow grants access, and
            everything else is implicitly denied.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Request */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
            <div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1.5">
                Identity policy preset
              </div>
              <div className="flex flex-wrap gap-1.5">
                {POLICY_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setPresetId(preset.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold border transition ${
                      presetId === preset.id
                        ? "bg-emerald-500 text-white border-emerald-500 shadow"
                        : "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1">
                  Requested action
                </label>
                <select
                  value={requestAction}
                  onChange={(e) => setRequestAction(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono focus:border-emerald-400 focus:outline-none"
                >
                  {ACTION_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1">
                  Resource ARN
                </label>
                <input
                  value={requestResource}
                  onChange={(e) => setRequestResource(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1.5">
                Request context (satisfied conditions)
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    [ctxMfa, setCtxMfa, "MFA present"],
                    [ctxTls, setCtxTls, "TLS transport"],
                    [ctxVpc, setCtxVpc, "Source VPC"],
                  ] as [
                    boolean,
                    Dispatch<SetStateAction<boolean>>,
                    string,
                  ][]
                ).map(([value, setter, label]) => (
                  <button
                    key={label}
                    onClick={() => setter(!value)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition ${
                      value
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400"
                        : "bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {value ? "✓ " : "✗ "}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Verdict */}
            <div
              className={`rounded-xl border p-4 ${
                evalResult.decision === "ALLOW"
                  ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-600"
                  : evalResult.decision === "EXPLICIT_DENY"
                    ? "bg-rose-50 dark:bg-rose-900/30 border-rose-300 dark:border-rose-600"
                    : "bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  Authorization decision
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-extrabold ${
                    evalResult.decision === "ALLOW"
                      ? "bg-emerald-500 text-white"
                      : evalResult.decision === "EXPLICIT_DENY"
                        ? "bg-rose-500 text-white"
                        : "bg-amber-400 text-slate-900"
                  }`}
                >
                  {evalResult.decision === "ALLOW"
                    ? "✔ ALLOW"
                    : evalResult.decision === "EXPLICIT_DENY"
                      ? "✘ EXPLICIT DENY"
                      : "✘ IMPLICIT DENY"}
                </span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                {evalResult.decision === "ALLOW"
                  ? "An explicit Allow statement matched the action and resource, and every required condition was satisfied."
                  : evalResult.decision === "EXPLICIT_DENY"
                    ? "An explicit Deny statement matched and overrides every Allow — IAM Deny always wins."
                    : "No statement granted the requested action on this resource. IAM defaults to denying anything not explicitly allowed."}
              </div>
            </div>
          </div>

          {/* Statement analysis */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-2">
              Statement-by-statement analysis — {activePreset.label}
            </div>
            <div className="space-y-2">
              {evalResult.rows.map((row) => (
                <div
                  key={row.sid}
                  className={`rounded-lg border px-3 py-2.5 ${
                    row.applies
                      ? row.effect === "Deny"
                        ? "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700"
                        : "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700"
                      : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                      {row.sid}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        row.applies
                          ? row.effect === "Deny"
                            ? "bg-rose-500 text-white"
                            : "bg-emerald-500 text-white"
                          : "bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {row.applies
                        ? `APPLIES (${row.effect.toUpperCase()})`
                        : "SKIPPED"}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                    {row.reason}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1 text-[9px] font-mono">
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        row.actionMatched
                          ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      action: {row.actionMatched ? "match" : "no match"}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        row.resourceMatched
                          ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      resource: {row.resourceMatched ? "match" : "no match"}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        row.conditionSkipped
                          ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      conditions: {row.conditionSkipped ? "failed" : "ok"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 p-3 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              <span className="font-bold text-slate-700 dark:text-slate-300">Evaluation order:</span>{" "}
              identity policies → resource policies → IAM boundary → SCP → session
              policy. Any explicit <span className="font-mono">Deny</span>{" "}
              anywhere wins; a missing Allow is an implicit deny. Wildcard
              matches like <span className="font-mono">secretsmanager:*</span>{" "}
              are honored.
            </div>
          </div>
        </div>
      </div>

      {/* ============ 5: VERSION HISTORY ============ */}
      <div
        id="sm-versions"
        className="scroll-mt-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
          <div>
            <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
              05 · Secret Provenance
            </div>
            <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              Version History Viewer
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Staging labels route clients: AWSCURRENT is the live value,
              AWSPREVIOUS enables instant rollback. {SECRET_ARN}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
              Rotation: ON (30d)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              KMS: alias/aws/secretsmanager
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* List */}
          <div className="lg:col-span-2 space-y-1.5">
            {secretVersions.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVersionId(v.id)}
                className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${
                  selectedVersionId === v.id
                    ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 ring-1 ring-emerald-400"
                    : v.enabled
                      ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600"
                      : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700 opacity-70"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200">
                    {v.id.slice(0, 8)}…{v.id.slice(-4)}
                  </span>
                  <div className="flex gap-1">
                    {v.stage.map((s) => (
                      <StagePill key={s} stage={s} />
                    ))}
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  <span>{v.created}</span>
                  <span className={v.enabled ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}>
                    {v.enabled ? "ENABLED" : "DISABLED"}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 truncate">
                  {v.source}
                </div>
              </button>
            ))}
          </div>

          {/* Detail */}
          <div className="lg:col-span-3 space-y-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    Version: <span className="text-emerald-700 dark:text-emerald-300">{selectedVersion.id}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                    Created: {selectedVersion.created} · {selectedVersion.source}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRevealVersionPayload((prev) => !prev)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold border bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                  >
                    {revealVersionPayload ? "🙈 Mask payload" : "👁️ Reveal payload"}
                  </button>
                  <button
                    onClick={() => handlePromote(selectedVersion.id)}
                    disabled={selectedVersion.stage.includes("AWSCURRENT")}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold border bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 dark:hover:bg-emerald-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {selectedVersion.stage.includes("AWSCURRENT")
                      ? "✓ Already AWSCURRENT"
                      : "⬆ Promote to AWSCURRENT"}
                  </button>
                </div>
              </div>
              <pre className="mt-3 p-3 rounded-lg bg-slate-900 text-emerald-400 text-[11px] font-mono overflow-x-auto">
                {versionPayloadJson}
              </pre>
              <div className="mt-2 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                $ aws secretsmanager get-secret-value --secret-id prod/db/credentials
                --version-id {selectedVersion.id.slice(0, 8)} --version-stage{" "}
                {selectedVersion.stage[0] ?? "AWSCURRENT"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ FOOTER NOTE ============ */}
      <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
        <span className="font-bold text-emerald-700 dark:text-emerald-300">Best practice recap: </span>
        Prefer Secrets Manager for values that rotate or need audit history;
        use Parameter Store for config. Always scope policy statements to a
        single secret ARN, require TLS + MFA for access, and enable rotation
        with a tested Lambda so stale credentials never outlive their expiry.
      </div>
    </section>
  );
}