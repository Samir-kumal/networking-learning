"use client";

import { useState, useEffect, useMemo, useRef } from "react";

// ============================================================================
// TYPES & CONSTANT DATA — CloudWatch & Observability Stack
// ============================================================================

type MetricKey = "cpu" | "latency" | "requests" | "errors" | "network";

interface MetricDef {
  label: string;
  short: string;
  unit: string;
  color: string;
  base: number;
  variance: number;
  drift: number;
  min: number;
  max: number;
  defaultThreshold: number;
}

const METRICS: Record<MetricKey, MetricDef> = {
  cpu: {
    label: "EC2 CPUUtilization",
    short: "CPU %",
    unit: "%",
    color: "#38bdf8",
    base: 46,
    variance: 26,
    drift: 0.4,
    min: 0,
    max: 100,
    defaultThreshold: 80,
  },
  latency: {
    label: "Order API Latency",
    short: "Latency",
    unit: "ms",
    color: "#818cf8",
    base: 142,
    variance: 70,
    drift: 2,
    min: 0,
    max: 2000,
    defaultThreshold: 400,
  },
  requests: {
    label: "RequestCount (5m avg)",
    short: "Requests",
    unit: "rpm",
    color: "#34d399",
    base: 420,
    variance: 160,
    drift: 12,
    min: 0,
    max: 5000,
    defaultThreshold: 900,
  },
  errors: {
    label: "Lambda ErrorRate",
    short: "Errors",
    unit: "%",
    color: "#fb7185",
    base: 2.4,
    variance: 3.6,
    drift: 0.12,
    min: 0,
    max: 100,
    defaultThreshold: 5,
  },
  network: {
    label: "NetworkIn (m5.large)",
    short: "Network",
    unit: "MB/min",
    color: "#22d3ee",
    base: 180,
    variance: 90,
    drift: 3,
    min: 0,
    max: 5000,
    defaultThreshold: 480,
  },
};

const POINT_COUNT = 48;

const seedMetric = (def: MetricDef): number[] => {
  const points: number[] = [];
  let v = def.base;
  for (let i = 0; i < POINT_COUNT; i++) {
    v = Math.max(def.min, Math.min(def.max, v + (Math.random() - 0.48) * def.variance + def.drift));
    points.push(Math.round(v * 10) / 10);
  }
  return points;
};

const initialStreams = (): Record<MetricKey, number[]> => ({
  cpu: seedMetric(METRICS.cpu),
  latency: seedMetric(METRICS.latency),
  requests: seedMetric(METRICS.requests),
  errors: seedMetric(METRICS.errors),
  network: seedMetric(METRICS.network),
});

// --- Alarm severity levels ---
type Severity = "SEV1" | "SEV2" | "SEV3" | "SEV4";

const SEVERITIES: Record<Severity, { name: string; desc: string; dot: string; badge: string }> = {
  SEV1: {
    name: "CRITICAL",
    desc: "Production outage — page on-call immediately. 15 min response target.",
    dot: "bg-rose-500 animate-ping",
    badge: "bg-rose-50 text-rose-600 border-rose-300 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-600",
  },
  SEV2: {
    name: "HIGH",
    desc: "Severe degradation — respond within 1 hour, customer impact likely.",
    dot: "bg-orange-500",
    badge: "bg-orange-50 text-orange-600 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-600",
  },
  SEV3: {
    name: "MEDIUM",
    desc: "Moderate degradation / capacity pressure. Triage in next business hours.",
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-600",
  },
  SEV4: {
    name: "LOW",
    desc: "Informational — tracking, no immediate action required.",
    dot: "bg-sky-400",
    badge: "bg-sky-50 text-sky-600 border-sky-300 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-600",
  },
};

type AlarmOperator = ">" | ">=" | "<" | "<=";
type AlarmState = "OK" | "ALARM" | "INSUFFICIENT_DATA";

// --- Log groups & streams ---
interface LogLine {
  time: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  message: string;
}

interface LogGroup {
  id: string;
  name: string;
  retention: string;
  size: string;
  events: string;
  streams: number;
  templates: Array<{ level: LogLine["level"]; message: string }>;
}

const nowClock = (): string => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(
    d.getSeconds()
  ).padStart(2, "0")}`;
};

const LOG_GROUPS: LogGroup[] = [
  {
    id: "orders-api",
    name: "/aws/lambda/orders-api",
    retention: "14 days",
    size: "1.2 GB",
    events: "48,231",
    streams: 3,
    templates: [
      { level: "INFO", message: "START RequestId: 8f2b…d31 Version: $LATEST" },
      { level: "INFO", message: "POST /api/orders 201 — 61 ms — dynamodb:PutItem" },
      { level: "WARN", message: "Order validation retry (attempt 2) — idempotency key reused" },
      { level: "ERROR", message: "DynamoDB ConditionalCheckFailed — event raced with duplicate request" },
      { level: "INFO", message: "GET /api/orders?status=pending 200 — 34 ms" },
      { level: "DEBUG", message: "X-Ray trace segment closed: orders-api:processOrder 61.2ms" },
      { level: "ERROR", message: "TimeoutError: SQS SendMessage timed out after 3000ms (retry scheduled)" },
      { level: "INFO", message: "REPORT RequestId: 8f2b…d31  Duration: 61.21 ms  Billed Duration: 62 ms  Memory: 256 MB" },
      { level: "WARN", message: "Provisioned concurrency throttled — warm pool exhausted, cold start 812ms" },
      { level: "INFO", message: "INIT_START Runtime Version: nodejs:20.v13  Runtime Version ARN" },
    ],
  },
  {
    id: "ec2-web",
    name: "/aws/ec2/production-web",
    retention: "30 days",
    size: "4.6 GB",
    events: "1,204,118",
    streams: 4,
    templates: [
      { level: "INFO", message: "nginx: 10.0.4.71 - - [GET /assets/app.js] 304 0.004s" },
      { level: "INFO", message: "nginx: 10.0.4.87 - - [POST /api/v1/login] 200 0.061s" },
      { level: "WARN", message: "upstream_response_time 2.3s exceeds warn threshold (p95=1.8s)" },
      { level: "ERROR", message: "php-fpm: ERROR: pool www seems busy (2 children are running)" },
      { level: "INFO", message: "systemd: unit nginx.service notified readiness" },
      { level: "WARN", message: "Disk usage /var/log 82% — logrotate scheduled for 02:00 UTC" },
      { level: "ERROR", message: "application[web]: UnhandledRejection TypeError: Cannot read properties of null" },
      { level: "INFO", message: "CloudWatch agent: CPU=61.2% mem=72.4% disk=38.1% procstat=nginx ok" },
    ],
  },
  {
    id: "rds-mysql",
    name: "/aws/rds/mysql-prod",
    retention: "7 days",
    size: "0.8 GB",
    events: "94,002",
    streams: 1,
    templates: [
      { level: "INFO", message: "InnoDB: Buffer pool hit rate 998 / 1000" },
      { level: "WARN", message: "slow_query: 4.2s SELECT orders WHERE status IN (...) FOR UPDATE" },
      { level: "ERROR", message: "InnoDB: Deadlock found when trying to get lock; rollback row 42" },
      { level: "INFO", message: "log_checkpoint: checkpoint completed, 1,204 pages written" },
      { level: "WARN", message: "Replica lag 8.4s on mysql-prod-replica-1 (threshold 8s)" },
      { level: "INFO", message: "backup: automated snapshot taken, retention 7 days" },
    ],
  },
  {
    id: "apigw",
    name: "API-Gateway-Execution-Logs_8f2b…3d31",
    retention: "14 days",
    size: "0.4 GB",
    events: "881,447",
    streams: 2,
    templates: [
      { level: "INFO", message: "HTTP Method: POST, ResourcePath: /orders, Status: 201, Latency: 61 ms" },
      { level: "INFO", message: "HTTP Method: GET, ResourcePath: /orders/{id}, Status: 200, Latency: 34 ms" },
      { level: "ERROR", message: "HTTP Method: GET, ResourcePath: /inventory, Status: 500, Latency: 2219 ms" },
      { level: "WARN", message: "RetryDueToThrottling: request rate 1,204/s exceeds per-method throttle 1,000/s" },
      { level: "INFO", message: "Extracting request body with body models defined in API" },
      { level: "DEBUG", message: "X-Request-Id: 8f2b1c3a-… assigned, trace propagated via X-Amzn-Trace-Id" },
    ],
  },
  {
    id: "email-worker",
    name: "/aws/lambda/email-worker",
    retention: "7 days",
    size: "0.2 GB",
    events: "58,771",
    streams: 2,
    templates: [
      { level: "INFO", message: "Received message from SQS queue order-notifications (visibility 30s)" },
      { level: "INFO", message: "SES sendEmail accepted — RequestId 9ca1… MessageId 11e2…" },
      { level: "ERROR", message: "SES: InvalidParameterValue — template order-confirmation missing variable" },
      { level: "WARN", message: "Batch partial failure — 2 of 10 messages returned to queue" },
      { level: "DEBUG", message: "Segment email-worker:renderTemplate 8.1ms, email-worker:send 212ms" },
    ],
  },
];

// --- X-Ray service map ---
interface ServiceNode {
  id: string;
  name: string;
  serviceType: string;
  x: number;
  y: number;
  color: string;
  latencyMs: number;
  errorPct: number;
  instances: string;
  detail: string;
}

const SERVICE_NODES: ServiceNode[] = [
  { id: "client", name: "Web Client", serviceType: "Browser", x: 320, y: 14, color: "#38bdf8", latencyMs: 0, errorPct: 0, instances: "—", detail: "Instrumented with AWS X-Ray SDK (JS) — sends X-Amzn-Trace-Id header on every request." },
  { id: "apigw", name: "API Gateway", serviceType: "REST API", x: 320, y: 66, color: "#60a5fa", latencyMs: 24, errorPct: 0.2, instances: "1 endpoint (/orders)", detail: "X-Ray tracing enabled per stage. Captures method execution + latency breakdown." },
  { id: "auth", name: "Auth Service", serviceType: "Lambda", x: 112, y: 168, color: "#818cf8", latencyMs: 38, errorPct: 0.4, instances: "3 concurrent", detail: "Validates JWT + MFA session. Emits X-Ray subsegments for each policy check." },
  { id: "usersdb", name: "Users Table", serviceType: "DynamoDB", x: 112, y: 258, color: "#22d3ee", latencyMs: 12, errorPct: 0.1, instances: "on-demand", detail: "Composite key user_id#region. X-Ray auto-instruments AWS SDK calls." },
  { id: "orders", name: "Orders API", serviceType: "Lambda", x: 330, y: 168, color: "#34d399", latencyMs: 61, errorPct: 1.8, instances: "5 concurrent", detail: "Core checkout path. Emits custom subsegments for validation + persistence." },
  { id: "inventory", name: "Inventory DB", serviceType: "DynamoDB", x: 536, y: 168, color: "#22d3ee", latencyMs: 42, errorPct: 2.4, instances: "provisioned 40/80", detail: "Conditional PutItem for stock decrement. Throttling shows as 400 rejections." },
  { id: "queue", name: "Order Queue", serviceType: "SQS", x: 536, y: 258, color: "#fb923c", latencyMs: 9, errorPct: 0, instances: "standard", detail: "Decouples checkout from notifications. Messages retain trace parent ID." },
  { id: "emailw", name: "Email Worker", serviceType: "Lambda", x: 536, y: 318, color: "#f472b6", latencyMs: 214, errorPct: 3.1, instances: "2 concurrent", detail: "Consumes queue, renders SES template. Subsegment email-worker:render inside trace." },
];

interface EdgeInfo {
  from: string;
  to: string;
  latencyMs: number;
  errorPct: number;
  protocol: string;
}

const EDGES: EdgeInfo[] = [
  { from: "client", to: "apigw", latencyMs: 24, errorPct: 0.2, protocol: "HTTPS 443" },
  { from: "apigw", to: "auth", latencyMs: 38, errorPct: 0.4, protocol: "AWS::Lambda" },
  { from: "auth", to: "usersdb", latencyMs: 12, errorPct: 0.1, protocol: "DynamoDB" },
  { from: "apigw", to: "orders", latencyMs: 61, errorPct: 1.8, protocol: "AWS::Lambda" },
  { from: "orders", to: "inventory", latencyMs: 42, errorPct: 2.4, protocol: "DynamoDB" },
  { from: "orders", to: "queue", latencyMs: 9, errorPct: 0.1, protocol: "SQS" },
  { from: "queue", to: "emailw", latencyMs: 214, errorPct: 3.1, protocol: "Lambda poll" },
];

interface TraceSegment {
  id: string;
  label: string;
  startMs: number;
  durMs: number;
  status: "OK" | "ERROR";
  note: string;
}

interface TraceInfo {
  id: string;
  method: string;
  path: string;
  totalMs: number;
  status: "HTTP 200" | "HTTP 500";
  fussy: boolean;
  segments: TraceSegment[];
}

const TRACES: TraceInfo[] = [
  {
    id: "1-66b3f8a1-8f2b1c12a3d44e5f6a7b8c9",
    method: "POST",
    path: "/v1/orders",
    totalMs: 84,
    status: "HTTP 200",
    fussy: false,
    segments: [
      { id: "gw", label: "api-gateway: execute", startMs: 0, durMs: 4, status: "OK", note: "authorizer cached" },
      { id: "auth", label: "auth-service: validateJwt", startMs: 4, durMs: 31, status: "OK", note: "2 subsegments" },
      { id: "usersdb", label: "users-table: GetItem", startMs: 8, durMs: 9, status: "OK", note: "RCU=4.5" },
      { id: "orders", label: "orders-api: placeOrder", startMs: 35, durMs: 49, status: "OK", note: "λ 256MB" },
      { id: "inventory", label: "inventory-db: UpdateItem", startMs: 38, durMs: 24, status: "OK", note: "conditional" },
      { id: "queue", label: "order-queue: SendMessage", startMs: 66, durMs: 8, status: "OK", note: "fifo=true" },
      { id: "emailw", label: "email-worker: render", startMs: 74, durMs: 6, status: "OK", note: "async path" },
    ],
  },
  {
    id: "TR-66b6f8f7-7c1d2e3f4a5b6c7d8e9f0a1b",
    method: "POST",
    path: "/v1/orders",
    totalMs: 342,
    status: "HTTP 500",
    fussy: true,
    segments: [
      { id: "gw", label: "api-gateway: execute", startMs: 0, durMs: 6, status: "OK", note: "no cache" },
      { id: "auth", label: "auth-service: checkJwt", startMs: 6, durMs: 52, status: "OK", note: "cold start 41ms" },
      { id: "orders", label: "orders-api: placeOrder", startMs: 58, durMs: 284, status: "ERROR", note: "retried ×3" },
      { id: "inventory", label: "inventory-db: UpdateItem", startMs: 62, durMs: 268, status: "ERROR", note: "ConditionalCheckFailed → ProvisionedThroughputExceededException" },
      { id: "queue", label: "order-queue: SendMessage", startMs: 330, durMs: 12, status: "OK", note: "compensated" },
    ],
  },
  {
    id: "TR-1c2d3e4f-66b6f8f7-9a8b7c6d5e4f3a2b1c",
    method: "GET",
    path: "/v1/orders/{id}",
    totalMs: 37,
    status: "HTTP 200",
    fussy: false,
    segments: [
      { id: "gw", label: "api-gateway: execute", startMs: 0, durMs: 3, status: "OK", note: "cached authorizer" },
      { id: "orders", label: "orders-api: getOrder", startMs: 3, durMs: 34, status: "OK", note: "DDB read" },
      { id: "inventory", label: "inventory-db: GetItem", startMs: 5, durMs: 11, status: "OK", note: "strongly consistent" },
    ],
  },
];

// --- Dashboard widget catalog ---
type WidgetId = "controls" | "alarms" | "logs" | "services" | "histogram" | "errors";

const WIDGET_IDS: WidgetId[] = ["controls", "alarms", "logs", "services", "histogram", "errors"];

interface LayoutPreset {
  label: string;
  widgets: WidgetId[];
}

const LAYOUT_PRESETS: LayoutPreset[] = [
  { label: "Core Observability", widgets: ["controls", "alarms", "logs", "services"] },
  { label: "Traffic & Errors", widgets: ["controls", "histogram", "errors", "logs"] },
  { label: "Full Stack", widgets: ["controls", "alarms", "logs", "services", "histogram", "errors"] },
];

const COL_SPANS: Record<number, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
};

const DASH_WIDGETS: Record<WidgetId, { icon: string; title: string }> = {
  controls: { icon: "📈", title: "Metric Graph" },
  alarms: { icon: "🚨", title: "Alarm Tiles" },
  logs: { icon: "🪵", title: "Log Tail" },
  services: { icon: "🕸️", title: "Service Health" },
  histogram: { icon: "📊", title: "Latency Histogram" },
  errors: { icon: "🐞", title: "Error Rate" },
};

const LATENCY_BUCKETS = [
  { label: "p50", ms: 118 },
  { label: "p90", ms: 243 },
  { label: "p99", ms: 527 },
  { label: "max", ms: 918 },
];

const ALARM_ROWS = [
  { name: "API latency threshold", sev: "SEV1" as Severity, state: "ALARM" as AlarmState },
  { name: "DB connections", sev: "SEV2" as Severity, state: "OK" as AlarmState },
  { name: "Queue depth", sev: "SEV3" as Severity, state: "OK" as AlarmState },
  { name: "Disk utilization", sev: "SEV4" as Severity, state: "OK" as AlarmState },
];

function DashboardWidgetInner({
  id,
  metricStream,
  alarmState,
  alarmMetric,
  logLines,
  refresh,
}: {
  id: WidgetId;
  metricStream: Record<MetricKey, number[]>;
  alarmState: AlarmState;
  alarmMetric: MetricKey;
  logLines: LogLine[];
  refresh: string;
}) {
  switch (id) {
    case "controls":
      return (
        <div className="space-y-2">
          <MetricLineChart data={metricStream.cpu} def={METRICS.cpu} heightClass="h-14" />
          <div className="grid grid-cols-5 gap-1 text-[9px] font-mono">
            {(Object.keys(METRICS) as MetricKey[]).map((k) => (
              <div key={k} className="text-center">
                <div className="font-bold" style={{ color: METRICS[k].color }}>
                  {metricStream[k][metricStream[k].length - 1].toFixed(0)}
                </div>
                <div className="text-slate-400 dark:text-slate-500 truncate">{METRICS[k].short}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700">
            <span>Namespace: AWS/EC2</span>
            <span>refresh {refresh}</span>
          </div>
        </div>
      );

    case "alarms":
      return (
        <div className="space-y-1.5">
          <div
            className={`flex items-center justify-between p-2 rounded-lg border text-[10px] font-mono ${
              alarmState === "ALARM" ? "border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/30" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700"
            }`}
          >
            <span className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
              <span className={`w-1.5 h-1.5 rounded-full ${alarmState === "ALARM" ? "bg-rose-500 animate-ping" : "bg-emerald-400"}`} />
              {METRICS[alarmMetric].short} threshold
            </span>
            <span
              className={`px-1.5 py-0.5 rounded font-bold ${
                alarmState === "ALARM" ? "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400" : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {alarmState}
            </span>
          </div>
          {ALARM_ROWS.map((a) => (
            <div key={a.name} className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-[10px] font-mono">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className={`w-1.5 h-1.5 rounded-full ${a.state === "ALARM" ? "bg-rose-500" : "bg-emerald-400"}`} />
                {a.name}
              </span>
              <span className={`px-1.5 py-0.5 rounded font-bold ${SEVERITIES[a.sev].badge}`}>{a.sev}</span>
            </div>
          ))}
        </div>
      );

    case "logs":
      return (
        <div className="space-y-1 font-mono text-[9.5px] leading-relaxed">
          {[...logLines].slice(-5).reverse().map((l, i) => (
            <div key={`${l.time}-${i}`} className="flex items-start gap-1.5 break-all">
              <span className="text-slate-400 dark:text-slate-500 shrink-0">{l.time.slice(3)}</span>
              <span className={`shrink-0 font-bold ${
                l.level === "ERROR" ? "text-rose-500 dark:text-rose-400" : l.level === "WARN" ? "text-amber-500 dark:text-amber-400" : "text-sky-600 dark:text-sky-400"
              }`}>
                {l.level.slice(0, 4)}
              </span>
              <span className="text-slate-600 dark:text-slate-300">{l.message.slice(0, 52)}</span>
            </div>
          ))}
        </div>
      );

    case "services":
      return (
        <div className="space-y-1.5">
          {SERVICE_NODES.filter((n) => n.id !== "client").map((n) => (
            <div key={n.id} className="flex items-center justify-between text-[10px] font-mono">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: n.color }} />
                {n.name}
              </span>
              <span className="text-slate-400 dark:text-slate-500">
                {n.latencyMs}ms <span className={n.errorPct > 2 ? "text-rose-500 dark:text-rose-400 font-bold" : "text-emerald-600 dark:text-emerald-400"}>{n.errorPct}%</span>
              </span>
            </div>
          ))}
        </div>
      );

    case "histogram":
      return (
        <div className="space-y-1.5">
          {LATENCY_BUCKETS.map((b) => (
            <div key={b.label} className="flex items-center gap-2 text-[10px] font-mono">
              <span className="w-7 text-slate-500 dark:text-slate-400">{b.label}</span>
              <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden">
                <div
                  className={`h-full rounded transition-all duration-700 ${b.ms > 500 ? "bg-gradient-to-r from-rose-400 to-orange-400" : "bg-gradient-to-r from-sky-400 to-blue-400"}`}
                  style={{ width: `${(b.ms / LATENCY_BUCKETS[LATENCY_BUCKETS.length - 1].ms) * 100}%` }}
                />
              </div>
              <span className="w-10 text-right text-slate-600 dark:text-slate-300">{b.ms}ms</span>
            </div>
          ))}
          <div className="text-[9px] font-mono text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700">
            order-api latency distribution · 60s window
          </div>
        </div>
      );

    case "errors":
      return (
        <div className="space-y-1.5">
          {SERVICE_NODES.filter((n) => n.id !== "client").map((n) => (
            <div key={n.id} className="flex items-center gap-2 text-[10px] font-mono">
              <span className="w-16 truncate text-slate-600 dark:text-slate-300">{n.name}</span>
              <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden">
                <div
                  className={`h-full rounded transition-all duration-700 ${n.errorPct > 2 ? "bg-rose-400" : n.errorPct > 0.5 ? "bg-amber-400" : "bg-emerald-400"}`}
                  style={{ width: `${Math.min((n.errorPct / 4) * 100, 100)}%` }}
                />
              </div>
              <span className="w-9 text-right text-slate-600 dark:text-slate-300">{n.errorPct}%</span>
            </div>
          ))}
          <div className="text-[9px] font-mono text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700">
            Error rate / request · X-Ray annotations
          </div>
        </div>
      );
  }
}

// ============================================================================
// SHARED SVG CHART PRIMITIVE (CSS-animated line chart)
// ============================================================================

function MetricLineChart({
  data,
  def,
  threshold,
  color,
  heightClass,
  animateKey,
}: {
  data: number[];
  def: MetricDef;
  threshold?: number;
  color?: string;
  heightClass?: string;
  animateKey?: string | number;
}) {
  const W = 600;
  const H = 160;
  const PAD = 6;
  const gradId = useMemo(() => `cw-grad-${def.short.replace(/\W/g, "")}`, [def.short]);
  const lineColor = color ?? def.color;

  const lastVal = data.length > 0 ? data[data.length - 1] : 0;

  if (data.length < 2) {
    return <svg viewBox={`0 0 ${W} ${H}`} className={`w-full ${heightClass ?? "h-auto"}`} aria-hidden="true" />;
  }

  const min = Math.min(...data, threshold ?? Infinity);
  const max = Math.max(...data, threshold ?? -Infinity);
  const range = Math.max(max - min, 0.001);

  const points = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const linePath = `M ${points.join(" L ")}`;
  const areaPath = `${linePath} L ${W - PAD},${H - PAD} L ${PAD},${H - PAD} Z`;
  const lastX = points.length > 0 ? Number(points[points.length - 1].split(",")[0]) : PAD;
  const lastY = points.length > 0 ? Number(points[points.length - 1].split(",")[1]) : H / 2;
  const thresholdY =
    threshold !== undefined ? H - PAD - ((Math.min(Math.max(threshold, min), max) - min) / range) * (H - PAD * 2) : 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`w-full ${heightClass ?? "h-auto"}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.28" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={PAD} x2={W - PAD} y1={H * f} y2={H * f} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 5" />
      ))}

      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradId})`} className="cw-anim-fill" />

      {/* Metric line — replays draw animation on every data tick */}
      <path
        key={animateKey ?? data.length}
        d={linePath}
        fill="none"
        stroke={lineColor}
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength={100}
        className="cw-anim-draw"
        style={{ animationDelay: "0ms" }}
      />

      {/* Live sweep line */}
      <line x1={PAD} x2={PAD} y1={PAD} y2={H - PAD} stroke={lineColor} strokeWidth="1.4" opacity="0.4" className="cw-anim-sweep" />

      {/* Threshold marker */}
      {threshold !== undefined && (
        <g>
          <line x1={PAD} x2={W - PAD} y1={thresholdY} y2={thresholdY} stroke="#f59e0b" strokeWidth="1.6" strokeDasharray="7 4" />
          <text x={W - PAD - 2} y={thresholdY - 5} textAnchor="end" fontSize="11" fontFamily="monospace" fill="#d97706">
            ALARM ≥ {threshold}
          </text>
        </g>
      )}

      {/* Current value dot */}
      <circle cx={lastX} cy={lastY} r="4.5" fill={lineColor} className="cw-anim-dot" />
      <circle cx={lastX} cy={lastY} r="9" fill="none" stroke={lineColor} strokeWidth="1.4" opacity="0.45" className="cw-anim-dot-ring" />

      {/* Current value label (full-size charts only) */}
      {!heightClass && (
        <text x={Math.min(lastX + 8, W - 40)} y={Math.max(lastY - 8, 12)} fontSize="12" fontWeight="700" fontFamily="monospace" fill={lineColor}>
          {def.short} {lastVal.toFixed(1)}
          {def.unit === "%" ? "%" : ""}
        </text>
      )}
    </svg>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AwsCloudWatchSection() {
  // ---------- SIMULATED METRIC STREAM (shared across modules) ----------
  const [streams, setStreams] = useState<Record<MetricKey, number[]>>(initialStreams);
  const [streaming, setStreaming] = useState<boolean>(true);
  const [speed, setSpeed] = useState<"0.5x" | "1x" | "2x">("1x");
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("cpu");

  useEffect(() => {
    if (!streaming) return;
    const interval = window.setInterval(() => {
      setStreams((prev) => {
        const next = { ...prev };
        (Object.keys(METRICS) as MetricKey[]).forEach((key) => {
          const def = METRICS[key];
          const last = prev[key][prev[key].length - 1];
          let v = last + (Math.random() - 0.48) * def.variance + def.drift;
          if (Math.random() < 0.035) v += def.variance * (Math.random() > 0.5 ? 1.6 : -1.2); // occasional spike
          v = Math.max(def.min, Math.min(def.max, v));
          next[key] = [...prev[key].slice(1), Math.round(v * 10) / 10];
        });
        return next;
      });
    }, speed === "0.5x" ? 2400 : speed === "1x" ? 1300 : 650);
    return () => window.clearInterval(interval);
  }, [streaming, speed]);

  const lastValue = (key: MetricKey): number => streams[key][streams[key].length - 1];

  // ---------- MODULE 2: ALARM ENGINE ----------
  const [alarmMetric, setAlarmMetric] = useState<MetricKey>("cpu");
  const [alarmOperator, setAlarmOperator] = useState<AlarmOperator>(">");
  const [alarmThreshold, setAlarmThreshold] = useState<number>(METRICS.cpu.defaultThreshold);
  const [alarmSeverity, setAlarmSeverity] = useState<Severity>("SEV2");
  const [alarmSns, setAlarmSns] = useState<boolean>(true);
  const [alarmActions, setAlarmActions] = useState<boolean>(true);
  const [alarmEvents, setAlarmEvents] = useState<Array<{ time: string; from: AlarmState; to: AlarmState; msg: string }>>([]);
  const [evaluations, setEvaluations] = useState<number>(18);

  const alarmDef = METRICS[alarmMetric];
  const current = lastValue(alarmMetric);

  const evalAlarm = (val: number): boolean => {
    switch (alarmOperator) {
      case ">": return val > alarmThreshold;
      case ">=": return val >= alarmThreshold;
      case "<": return val < alarmThreshold;
      default: return val <= alarmThreshold;
    }
  };

  const alarmState: AlarmState = useMemo(() => {
    if (streams[alarmMetric].length < 5) return "INSUFFICIENT_DATA";
    return evalAlarm(current) ? "ALARM" : "OK";
  }, [streams, alarmMetric, current, alarmOperator, alarmThreshold]);

  const prevAlarmState = useRef<AlarmState>(alarmState);

  useEffect(() => {
    if (prevAlarmState.current === alarmState) return;
    const from = prevAlarmState.current;
    prevAlarmState.current = alarmState;
    const breachMsg =
      alarmState === "ALARM"
        ? `${alarmDef.short} ${current}${alarmDef.unit === "%" || alarmDef.unit === "ms" ? alarmDef.unit : ""} ${alarmOperator} ${alarmThreshold} — ${SEVERITIES[alarmSeverity].name} severity`
        : `${alarmDef.label} returned to normal`;
    setAlarmEvents((prev) => [
      ...prev.slice(-24),
      { time: nowClock(), from, to: alarmState, msg: breachMsg },
    ]);
  }, [alarmState, alarmMetric, alarmOperator, alarmThreshold, alarmSeverity, alarmDef.label, current]);

  useEffect(() => {
    const iv = window.setInterval(() => setEvaluations((e) => e + 1), 5200);
    return () => window.clearInterval(iv);
  }, []);

  const handleAlarmMetricChange = (key: MetricKey) => {
    setAlarmMetric(key);
    setAlarmThreshold(METRICS[key].defaultThreshold);
    setAlarmOperator(">");
  };

  // ---------- MODULE 3: LOG GROUPS ----------
  const [logGroupId, setLogGroupId] = useState<string>(LOG_GROUPS[0].id);
  const [logLines, setLogLines] = useState<LogLine[]>(() => LOG_GROUPS[0].templates.slice(0, 7).map((t, i) => ({ ...t, time: `${nowClock()}` })));
  const [logFilter, setLogFilter] = useState<string>("");
  const [logLevels, setLogLevels] = useState<Array<LogLine["level"]>>(["INFO", "WARN", "ERROR", "DEBUG"]);
  const [liveTail, setLiveTail] = useState<boolean>(true);
  const logScrollRef = useRef<HTMLDivElement>(null);

  const logGroup = LOG_GROUPS.find((g) => g.id === logGroupId)!;
  const logCounter = useRef(0);

  useEffect(() => {
    // Reset viewer when switching groups
    setLogLines(logGroup.templates.slice(0, 6).map((t) => ({ ...t, time: `${nowClock()}` })));
  }, [logGroupId]);

  useEffect(() => {
    if (!liveTail) return;
    const iv = window.setInterval(() => {
      setLogLines((prev) => {
        const template = logGroup.templates[Math.floor(Math.random() * logGroup.templates.length)];
        logCounter.current += 1;
        return [...prev.slice(-79), { ...template, time: nowClock() }];
      });
    }, 1500);
    return () => window.clearInterval(iv);
  }, [liveTail, logGroup]);

  useEffect(() => {
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
    }
  }, [logLines]);

  const filteredLogLines = useMemo(() => {
    const q = logFilter.trim().toLowerCase();
    return logLines.filter((l) => {
      if (!logLevels.includes(l.level)) return false;
      if (q && !l.message.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [logLines, logFilter, logLevels]);

  const toggleLogLevel = (level: LogLine["level"]) => {
    setLogLevels((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]));
  };

  const countLevel = (level: LogLine["level"]) => logLines.filter((l) => l.level === level).length;

  const selectedStreamName = `${logGroup.name.replace(/[^a-zA-Z0-9]/g, "")}/[LATEST]8f2b…3d31`;

  // Generated CloudFormation alarm resource from the live alarm config
  const alarmCfnJson = useMemo(
    () =>
      JSON.stringify(
        {
          OrdersAPICpuAlarm: {
            Type: "AWS::CloudWatch::Alarm",
            Properties: {
              AlarmName: `prod-${alarmMetric}-${alarmSeverity}`,
              Namespace: "AWS/EC2",
              MetricName: alarmDef.label,
              Statistic: "Average",
              Period: 60,
              EvaluationPeriods: 3,
              DatapointsToAlarm: 2,
              Threshold: alarmThreshold,
              ComparisonOperator:
                alarmOperator === ">"
                  ? "GreaterThanThreshold"
                  : alarmOperator === ">="
                    ? "GreaterThanOrEqualToThreshold"
                    : alarmOperator === "<"
                      ? "LessThanThreshold"
                      : "LessThanOrEqualToThreshold",
              TreatMissingData: "notBreaching",
              AlarmActions: alarmSns ? ["arn:aws:sns:us-east-1:123456789012:ops-oncall"] : [],
              Tags: [{ Key: "severity", Value: alarmSeverity }],
            },
          },
        },
        null,
        2
      ),
    [alarmMetric, alarmSeverity, alarmThreshold, alarmOperator, alarmSns, alarmDef.label]
  );

  // ---------- MODULE 4: X-RAY ----------
  const [selectedNodeId, setSelectedNodeId] = useState<string>("orders");
  const [selectedTraceId, setSelectedTraceId] = useState<string>(TRACES[0].id);
  const selectedNode = SERVICE_NODES.find((n) => n.id === selectedNodeId)!;
  const selectedTrace = TRACES.find((t) => t.id === selectedTraceId)!;
  const traceScale = Math.max(...selectedTrace.segments.map((s) => s.startMs + s.durMs), 1);

  // ---------- MODULE 5: DASHBOARD BUILDER ----------
  const [dashWidgets, setDashWidgets] = useState<WidgetId[]>(["controls", "alarms", "logs"]);
  const [dashSizes, setDashSizes] = useState<Record<WidgetId, 1 | 2 | 3>>({
    controls: 2,
    alarms: 1,
    logs: 2,
    services: 2,
    histogram: 1,
    errors: 1,
  });
  const [dashPreset, setDashPreset] = useState<string>("Full Stack");
  const [dashRefresh, setDashRefresh] = useState<"5s" | "15s" | "30s">("15s");

  const applyPreset = (preset: LayoutPreset) => {
    setDashPreset(preset.label);
    setDashWidgets(preset.widgets);
  };

  const hasWidget = (id: WidgetId) => dashWidgets.includes(id);

  const addWidget = (id: WidgetId) => {
    if (!hasWidget(id)) setDashWidgets((w) => [...w, id]);
  };

  const removeWidget = (id: WidgetId) => {
    setDashWidgets((w) => w.filter((x) => x !== id));
  };

  const setWidgetSize = (id: WidgetId, size: 1 | 2 | 3) => {
    setDashSizes((s) => ({ ...s, [id]: size }));
  };

  // ---------- RENDER ----------
  return (
    <div className="space-y-16 pb-16">
      {/* CSS animations for the metric charts, sweeps, and service-map flow */}
      <style>{`
        .cw-anim-draw { stroke-dasharray: 100; stroke-dashoffset: 100; animation: cw-draw 1.1s ease-out forwards; }
        @keyframes cw-draw { to { stroke-dashoffset: 0; } }
        .cw-anim-sweep { animation: cw-sweep 2.8s linear infinite; }
        @keyframes cw-sweep {
          0% { transform: translateX(0px); opacity: 0; }
          12% { opacity: 0.85; }
          88% { opacity: 0.85; }
          100% { transform: translateX(600px); opacity: 0; }
        }
        .cw-anim-dot { transform-box: fill-box; transform-origin: center; animation: cw-pulse 1.5s ease-in-out infinite; }
        @keyframes cw-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.7); opacity: 0.6; }
        }
        .cw-anim-dot-ring { transform-box: fill-box; transform-origin: center; animation: cw-ring 1.5s ease-out infinite; }
        @keyframes cw-ring {
          0% { transform: scale(0.55); opacity: 0.75; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        .cw-anim-fill { animation: cw-fill-in 1.1s ease-out both; }
        @keyframes cw-fill-in { from { opacity: 0; } to { opacity: 1; } }
        .cw-anim-flow { stroke-dasharray: 6 9; animation: cw-flow 0.9s linear infinite; }
        @keyframes cw-flow { to { stroke-dashoffset: -30; } }
      `}</style>

      {/* Track Title Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0b1526] via-[#0e2238] to-[#0b1526] border border-slate-700/60 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-400/10 border border-sky-300/30 text-xs font-mono text-sky-300">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            AWS Track • Observability & Reliability Engineering
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            CloudWatch & Full Observability Stack
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-3xl leading-relaxed">
            Operate the complete AWS observability loop — simulated metric streams powering CloudWatch alarms and
            dashboards, log group inspection with live tails, and X-Ray distributed tracing service maps with
            waterfall trace analysis.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {[
              ["Metrics", "stream-driven"],
              ["Alarms", "severity-gated"],
              ["Logs", "live tail"],
              ["X-Ray", "trace map"],
              ["Dashboards", "build your own"],
            ].map(([k, v]) => (
              <span key={k} className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-sky-200">
                {k} <span className="text-slate-500">·</span> {v}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODULE 1: Metrics & Metric Stream Simulator */}
      {/* ========================================================================= */}
      <section id="metrics" className="scroll-mt-24 space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl hover:border-sky-300 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
              Module 1 • Metrics & Streams
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              Simulated Metric Streams & Animated Line Charts
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStreaming(!streaming)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border font-bold transition-all ${
                streaming
                  ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600"
                  : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
              }`}
            >
              {streaming ? "● LIVE STREAM" : "❚❚ PAUSED"}
            </button>
            <div className="flex items-center gap-1 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 px-1 py-1">
              {(["0.5x", "1x", "2x"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                    speed === s ? "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: metric picker + live value tiles */}
          <div className="lg:col-span-4 space-y-4">
            <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Select Metric Stream
            </label>
            <div className="space-y-2">
              {(Object.keys(METRICS) as MetricKey[]).map((key) => {
                const def = METRICS[key];
                const isActive = selectedMetric === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedMetric(key)}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      isActive
                        ? "border-sky-400 bg-sky-50/60 dark:bg-sky-900/30 shadow-md"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-sky-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: def.color }} />
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{def.label}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{def.unit}</span>
                    </div>
                    <div className="flex items-end justify-between mt-1.5">
                      <span className="text-xl font-extrabold font-mono" style={{ color: def.color }}>
                        {lastValue(key).toFixed(1)}
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">{def.unit}</span>
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isActive ? "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300" : "text-slate-400 dark:text-slate-500"
                      }`}>
                        {isActive ? "◉ viewing" : "tap to view"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2">
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Stream characteristics
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 font-mono">
                <li><span className="text-slate-400 dark:text-slate-500">sampling:</span> 1 point / {speed === "0.5x" ? "2.4s" : speed === "1x" ? "1.3s" : "0.65s"}</li>
                <li><span className="text-slate-400 dark:text-slate-500">window:</span> last {POINT_COUNT} points</li>
                <li><span className="text-slate-400 dark:text-slate-500">storage:</span> CloudWatch Metrics → unified namespace</li>
              </ul>
            </div>
          </div>

          {/* Right: animated chart + mini charts */}
          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 card-shadow p-4 bg-white dark:bg-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                  {METRICS[selectedMetric].label}
                </span>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                  avg {(streams[selectedMetric].reduce((a, b) => a + b, 0) / streams[selectedMetric].length).toFixed(1)} · min{" "}
                  {Math.min(...streams[selectedMetric]).toFixed(1)} · max {Math.max(...streams[selectedMetric]).toFixed(1)}
                </span>
              </div>
              <MetricLineChart data={streams[selectedMetric]} def={METRICS[selectedMetric]} animateKey={`${selectedMetric}-${streams[selectedMetric].length}-${streams[selectedMetric][streams[selectedMetric].length - 1]}`} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(Object.keys(METRICS) as MetricKey[])
                .filter((k) => k !== selectedMetric)
                .map((key) => (
                  <div key={key} className="rounded-xl border border-slate-200 dark:border-slate-700 card-shadow p-3">
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1">{METRICS[key].short}</div>
                    <MetricLineChart
                      data={streams[key]}
                      def={METRICS[key]}
                      color={METRICS[key].color}
                      heightClass="h-10"
                    />
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 font-mono">
          <span className="font-bold text-sky-600 dark:text-sky-400">KEY CONCEPTS:</span>
          <span>Metrics are time-ordered data points with dimensions ·</span>
          <span>CloudWatch collects from agents (EC2 / EKS), SDKs (Lambda), and service integrations (RDS, API GW) ·</span>
          <span>Graphs support period aggregation and statistical functions (avg, p99, sum).</span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODULE 2: Alarm Threshold Configuration & Severity */}
      {/* ========================================================================= */}
      <section id="alarms" className="scroll-mt-24 space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl hover:border-rose-200 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-rose-500 dark:text-rose-400 uppercase tracking-wider mb-1">
              Module 2 • Alarm Engine
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              Alarm Threshold Configuration & Severity Levels
            </h2>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold border ${
            alarmState === "OK" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600"
            : alarmState === "ALARM" ? "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-600"
            : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-600"
          }`}>
            STATE: {alarmState}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: alarm configuration */}
          <div className="lg:col-span-5 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">1. Metric & Operator</label>
              <div className="flex gap-2">
                <select
                  value={alarmMetric}
                  onChange={(e) => handleAlarmMetricChange(e.target.value as MetricKey)}
                  className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-sky-400"
                >
                  {(Object.keys(METRICS) as MetricKey[]).map((k) => (
                    <option key={k} value={k}>{METRICS[k].label}</option>
                  ))}
                </select>
                <select
                  value={alarmOperator}
                  onChange={(e) => setAlarmOperator(e.target.value as AlarmOperator)}
                  className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-sky-400"
                >
                  <option value=">">&gt;</option>
                  <option value=">=">&gt;=</option>
                  <option value="<">&lt;</option>
                  <option value="<=">&lt;=</option>
                </select>
              </div>
            </div>

            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Threshold</label>
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                  {alarmOperator} {alarmThreshold} {alarmDef.unit}
                </span>
              </div>
              <input
                type="range"
                min={alarmDef.min}
                max={alarmDef.max}
                step={alarmDef.max > 100 ? 1 : 0.5}
                value={alarmThreshold}
                onChange={(e) => setAlarmThreshold(Number(e.target.value))}
                className="w-full accent-[#38bdf8]"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500">
                <span>{alarmDef.min}</span>
                <span>{alarmDef.max} {alarmDef.unit}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Severity Level</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(SEVERITIES) as Severity[]).map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setAlarmSeverity(sev)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      alarmSeverity === sev
                        ? SEVERITIES[sev].badge.split(" ").slice(0, 3).join(" ") + " shadow-md"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${SEVERITIES[sev].dot.replace(" animate-ping", "")}`} />
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{sev}</span>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{SEVERITIES[sev].name}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{SEVERITIES[sev].desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Notify SNS Topic</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">arn:aws:sns:us-east-1:123456:ops-oncall</div>
                </div>
                <button
                  onClick={() => setAlarmSns(!alarmSns)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                    alarmSns
                      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600"
                      : "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-700"
                  }`}
                >
                  {alarmSns ? "ENABLED" : "DISABLED"}
                </button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Auto Scaling Action</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Scale out fleet /api/* on breach</div>
                </div>
                <button
                  onClick={() => setAlarmActions(!alarmActions)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                    alarmActions
                      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600"
                      : "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-700"
                  }`}
                >
                  {alarmActions ? "ENABLED" : "DISABLED"}
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>CloudFormation Alarm Spec</span>
                <button
                  onClick={() => navigator.clipboard?.writeText(alarmCfnJson)}
                  className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-600 dark:text-slate-300 hover:border-sky-300 transition-colors"
                >
                  📋 Copy
                </button>
              </div>
              <pre className="p-4 text-[10.5px] font-mono text-slate-700 dark:text-slate-300 whitespace-pre overflow-x-auto leading-relaxed">{alarmCfnJson}</pre>
            </div>
          </div>

          {/* Right: alarm evaluation + history */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { k: "Current", v: `${current.toFixed(1)}`, u: alarmDef.unit, c: evalAlarm(current) ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400" },
                { k: "Threshold", v: `${alarmThreshold}`, u: alarmDef.unit, c: "text-amber-600 dark:text-amber-400" },
                { k: "Evaluations", v: `${evaluations}`, u: "datapoints", c: "text-sky-600 dark:text-sky-400" },
                { k: "Severity", v: alarmSeverity, u: SEVERITIES[alarmSeverity].name, c: "text-slate-900 dark:text-slate-100" },
              ].map((m) => (
                <div key={m.k} className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{m.k}</div>
                  <div className={`text-xl font-extrabold mt-1 font-mono ${m.c}`}>{m.v}</div>
                  <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">{m.u}</div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 card-shadow p-4 bg-white dark:bg-slate-800">
              <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 mb-2">
                Live Comparison — {alarmDef.label} vs Threshold
              </div>
              <MetricLineChart
                data={streams[alarmMetric]}
                def={alarmDef}
                threshold={alarmThreshold}
                animateKey={`alarm-${alarmMetric}-${alarmThreshold}-${streams[alarmMetric].length}`}
              />
              <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block bg-amber-500" /> threshold</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> current OK</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> breaching</span>
                <span className="ml-auto">
                  {alarmState === "ALARM"
                    ? `⚠️ Breach magnitude: ${(current / alarmThreshold - 1) * 100 > 0 ? "+" : ""}${((current / alarmThreshold - 1) * 100).toFixed(1)}%`
                    : `Headroom: ${((1 - (alarmOperator.startsWith(">") ? current / alarmThreshold : alarmThreshold / Math.max(current, 0.01))) * 100).toFixed(1)}%`}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2 mb-3">
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">Alarm History / State Transitions</span>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{alarmEvents.length} events</span>
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {alarmEvents.length === 0 && (
                  <div className="text-xs text-slate-400 dark:text-slate-500 font-mono py-2">Waiting for a state change — adjust the threshold to trigger one.</div>
                )}
                {[...alarmEvents].reverse().map((ev, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] font-mono">
                    <span className="text-slate-400 dark:text-slate-500 shrink-0">[{ev.time}]</span>
                    <span className={ev.to === "ALARM" ? "text-rose-600 dark:text-rose-400 font-bold" : ev.to === "OK" ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-amber-600 dark:text-amber-400 font-bold"}>
                      {ev.from} → {ev.to}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300">{ev.msg}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 font-mono">
              <span className="font-bold text-rose-500 dark:text-rose-400">HOW ALARMS WORK:</span>
              <span>CloudWatch evaluates the selected stat over consecutive periods ·</span>
              <span>missed datapoints → INSUFFICIENT_DATA ·</span>
              <span>alarm state triggers SNS / Auto Scaling / Lambda actions ·</span>
              <span>severity routes to the right on-call tier.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODULE 3: Log Group Viewer */}
      {/* ========================================================================= */}
      <section id="logs" className="scroll-mt-24 space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl hover:border-sky-300 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-1">
              Module 3 • Logs
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              CloudWatch Log Groups & Stream Viewer
            </h2>
          </div>
          <button
            onClick={() => setLiveTail(!liveTail)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
              liveTail
                ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600"
                : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
            }`}
          >
            {liveTail ? "● LIVE TAIL ON" : "❚❚ LIVE TAIL OFF"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Log group list */}
          <div className="lg:col-span-4 space-y-2">
            <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Log Groups (region: us-east-1)</label>
            <div className="space-y-2">
              {LOG_GROUPS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setLogGroupId(g.id)}
                  className={`w-full p-3 rounded-xl border text-left transition-all ${
                    logGroupId === g.id
                      ? "border-sky-400 bg-sky-50/60 dark:bg-sky-900/30 shadow-md"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-sky-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono truncate">{g.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">{g.streams} streams</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    <span>retention: <span className="text-amber-600 dark:text-amber-400 font-bold">{g.retention}</span></span>
                    <span>{g.size}</span>
                    <span>{g.events} events</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 leading-relaxed">
              <span className="font-bold text-cyan-700 dark:text-cyan-300">Log groups</span> collect streams from the same source. Retention policies (1 day – 10 years) control cost; log events expire after retention.
            </div>
          </div>

          {/* Log viewer */}
          <div className="lg:col-span-8 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                placeholder="Filter log messages…"
                className="flex-1 min-w-[160px] px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-sky-400"
              />
              {(["INFO", "WARN", "ERROR", "DEBUG"] as const).map((lv) => {
                const on = logLevels.includes(lv);
                const color =
                  lv === "ERROR" ? "text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-600 bg-rose-50 dark:bg-rose-900/30"
                  : lv === "WARN" ? "text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/30"
                  : lv === "DEBUG" ? "text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700"
                  : "text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-600 bg-sky-50 dark:bg-sky-900/30";
                return (
                  <button
                    key={lv}
                    onClick={() => toggleLogLevel(lv)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all ${on ? color : "text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-50"}`}
                  >
                    {lv} {lv === "ERROR" ? countLevel("ERROR") : lv === "WARN" ? countLevel("WARN") : lv === "INFO" ? countLevel("INFO") : countLevel("DEBUG")}
                  </button>
                );
              })}
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 ml-auto">{filteredLogLines.length} lines</span>
            </div>

            <div className="rounded-xl bg-[#0b1526] border border-slate-700 overflow-hidden shadow-xl">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/60 bg-[#0e2238]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                  <span className="ml-2 text-xs font-mono text-slate-300 font-bold">{logGroup.name}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  logStream: {selectedStreamName}
                </span>
              </div>
              <div ref={logScrollRef} className="p-4 h-64 overflow-y-auto space-y-0 font-mono text-[11px] leading-[1.7]">
                {filteredLogLines.map((l, i) => (
                  <div key={`${l.time}-${i}`} className="flex items-start gap-2 break-all">
                    <span className="text-slate-500 shrink-0">{l.time}</span>
                    <span className={`shrink-0 font-bold ${
                      l.level === "ERROR" ? "text-rose-400" : l.level === "WARN" ? "text-amber-300" : l.level === "DEBUG" ? "text-slate-500" : "text-sky-300"
                    }`}>
                      {l.level.padEnd(5)}
                    </span>
                    <span className={l.level === "ERROR" ? "text-rose-200" : l.level === "WARN" ? "text-amber-100" : "text-slate-300"}>
                      {l.message}
                    </span>
                  </div>
                ))}
                {liveTail && (
                  <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] pt-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> tailing…
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 font-mono">
              <span className="font-bold text-cyan-600 dark:text-cyan-400">CLOUDWATCH LOGS INSIGHTS:</span>
              <span>query language parses JSON fields, filters like <span className="text-sky-700 dark:text-sky-300">fields @timestamp</span> ·</span>
              <span>use metric filters to turn log patterns into alarms ·</span>
              <span>streams are appended-only, ~5KB per event limit.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODULE 4: X-Ray Distributed Tracing */}
      {/* ========================================================================= */}
      <section id="xray" className="scroll-mt-24 space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl hover:border-violet-300 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">
              Module 4 • Distributed Tracing
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              X-Ray Service Map & Trace Waterfall
            </h2>
          </div>
          <span className="px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700 text-[10px] font-mono">
            Sampling: 1 in 10 traces
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Service map */}
          <div className="lg:col-span-8">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 card-shadow overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700">
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">Service Map — <span className="text-violet-600 dark:text-violet-400">/v1/orders</span></span>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">edges labeled: avg latency · error %</span>
              </div>
              <svg viewBox="0 0 640 380" className="w-full h-auto bg-gradient-to-b from-violet-50/40 to-white" role="img" aria-label="X-Ray service map">
                {/* Edges */}
                {EDGES.map((e, i) => {
                  const from = SERVICE_NODES.find((n) => n.id === e.from)!;
                  const to = SERVICE_NODES.find((n) => n.id === e.to)!;
                  const mx = (from.x + to.x) / 2;
                  const my = (from.y + to.y) / 2 - 18;
                  const selected = selectedNodeId === e.from || selectedNodeId === e.to;
                  return (
                    <g key={i}>
                      <path
                        d={`M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`}
                        fill="none"
                        stroke={selected ? "#a78bfa" : "#cbd5e1"}
                        strokeWidth={selected ? 2.6 : 2}
                        strokeDasharray="0"
                        className={selected ? "cw-anim-flow" : ""}
                      />
                      <text x={mx} y={my - 6} textAnchor="middle" fontSize="10" fontFamily="monospace" fill={selected ? "#7c3aed" : "#94a3b8"}>
                        {e.latencyMs}ms · {e.errorPct}% err
                      </text>
                      <text x={mx} y={my + 8} textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#cbd5e1">
                        {e.protocol}
                      </text>
                    </g>
                  );
                })}
                {/* Nodes */}
                {SERVICE_NODES.map((n) => {
                  const isSelected = selectedNodeId === n.id;
                  const isSource = EDGES.some((e) => e.from === n.id || e.to === n.id) && (EDGES.some(e => e.from === n.id && (selectedNodeId === e.to)) || EDGES.some(e => e.to === n.id && selectedNodeId === e.from));
                  const highlight = isSelected || isSource;
                  return (
                    <g key={n.id} onClick={() => setSelectedNodeId(n.id)} className="cursor-pointer">
                      <rect
                        x={n.x - 72}
                        y={n.y - 22}
                        width="144"
                        height="44"
                        rx="10"
                        fill={highlight ? n.color : "#ffffff"}
                        stroke={highlight ? n.color : "#e2e8f0"}
                        strokeWidth={isSelected ? 2.4 : 1.2}
                        className="transition-all"
                      />
                      <circle cx={n.x - 56} cy={n.y} r="5" fill={highlight ? "#ffffff" : n.color} opacity="0.9" />
                      <text x={n.x} y={n.y - 3} textAnchor="middle" fontSize="11" fontWeight="bold" fontFamily="monospace" fill={highlight ? "#ffffff" : "#0f172a"}>
                        {n.name}
                      </text>
                      <text x={n.x} y={n.y + 11} textAnchor="middle" fontSize="8.5" fontFamily="monospace" fill={highlight ? "#ffffff" : "#94a3b8"}>
                        {n.serviceType} · {n.errorPct}% err
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Node detail */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 card-shadow p-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2 mb-3">
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">{selectedNode.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: `${selectedNode.color}20`, color: selectedNode.color }}>
                  {selectedNode.serviceType}
                </span>
              </div>
              <dl className="space-y-2 text-xs">
                {[
                  { k: "Avg latency", v: `${selectedNode.latencyMs} ms` },
                  { k: "Error rate", v: `${selectedNode.errorPct} %` },
                  { k: "Instances", v: selectedNode.instances },
                ].map((r) => (
                  <div key={r.k} className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5">
                    <dt className="text-slate-500 dark:text-slate-400 font-mono">{r.k}</dt>
                    <dd className="font-bold text-slate-900 dark:text-slate-100 font-mono">{r.v}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">{selectedNode.detail}</p>
              <div className="mt-3 flex items-center gap-2 text-[10px] font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-500 dark:text-slate-400">instrumented: AWS SDK auto-tracing active</span>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 leading-relaxed">
              <span className="font-bold text-violet-600 dark:text-violet-400">HOW IT WORKS:</span> X-Ray propagates a trace ID across services via headers — <span className="text-slate-700 dark:text-slate-300">X-Amzn-Trace-Id</span>. Each hop records segments / subsegments with timestamps building the service map and waterfall; sampled traces keep overhead below 5%.
            </div>
          </div>
        </div>

        {/* Trace waterfall */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 card-shadow overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700">
            <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 mr-1">Recent Traces</span>
            {TRACES.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTraceId(t.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-colors ${
                  selectedTraceId === t.id
                    ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-600 font-bold"
                    : "text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-violet-300"
                }`}
              >
                {t.method} {t.path} · {t.totalMs}ms · <span className={t.status === "HTTP 200" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>{t.status}</span>
              </button>
            ))}
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <span className="font-bold text-slate-900 dark:text-slate-100">{selectedTrace.method} {selectedTrace.path} — {selectedTrace.totalMs}ms total</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">trace id: {selectedTrace.id}</span>
            </div>
            <div className="w-full h-2 rounded bg-gradient-to-r from-violet-200 via-sky-200 to-emerald-200 mb-1" />
            <div className="space-y-2">
              {selectedTrace.segments.map((seg, i) => {
                const left = (seg.startMs / traceScale) * 100;
                const width = Math.max((seg.durMs / traceScale) * 100, 1.2);
                return (
                  <div key={seg.id + i} className="flex items-center gap-3 text-[11px] font-mono">
                    <span className="w-36 shrink-0 truncate text-slate-600 dark:text-slate-300">{seg.label}</span>
                    <div className="flex-1 relative h-5 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden">
                      <div
                        className={`absolute top-0 bottom-0 rounded ${seg.status === "OK" ? "bg-gradient-to-r from-violet-500 to-sky-400" : "bg-gradient-to-r from-rose-400 to-orange-400"}`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                      />
                    </div>
                    <span className="w-16 text-right shrink-0 text-slate-900 dark:text-slate-100 font-bold">{seg.durMs}ms</span>
                    <span className={`w-20 shrink-0 text-[10px] ${seg.status === "OK" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{seg.status}</span>
                    <span className="hidden md:block text-[10px] text-slate-400 dark:text-slate-500 truncate flex-1">{seg.note}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODULE 5: Dashboard Widget Layout Builder */}
      {/* ========================================================================= */}
      <section id="dashboards" className="scroll-mt-24 space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl hover:border-sky-300 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
              Module 5 • Dashboards
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              CloudWatch Dashboard Widget Layout Builder
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Auto refresh:</span>
            <div className="flex rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 px-1 py-1">
              {(["5s", "15s", "30s"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setDashRefresh(r)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold ${
                    dashRefresh === r ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Palette */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Widget palette</span>
              <div className="flex flex-wrap gap-1.5">
                {LAYOUT_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-colors ${
                      dashPreset === p.label
                        ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600 font-bold"
                        : "text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {WIDGET_IDS.map((id) => (
                <button
                  key={id}
                  onClick={() => addWidget(id)}
                  disabled={hasWidget(id)}
                  className={`p-3 rounded-lg text-left border text-xs transition-all ${
                    hasWidget(id)
                      ? "border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 cursor-default"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span className="block text-sm mb-1">{DASH_WIDGETS[id].icon}</span>
                  <span className="font-bold text-[11px]">{DASH_WIDGETS[id].title}</span>
                  <span className="block text-[9px] mt-0.5 font-mono text-slate-400 dark:text-slate-500">
                    {hasWidget(id) ? "✓ on canvas" : "click to add"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/50 p-4 min-h-[260px]">
            {dashWidgets.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <span className="text-3xl">📊</span>
                <span className="text-sm font-mono text-slate-400 dark:text-slate-500">Dashboard empty — add widgets from the palette above</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dashWidgets.map((id) => {
                  const size = dashSizes[id];
                  const W = DASH_WIDGETS[id];
                  return (
                    <div
                      key={id}
                      className={`rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow overflow-hidden flex flex-col ${COL_SPANS[size] ?? "md:col-span-1"}`}
                    >
                      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/60">
                        <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{W.icon}</span> {W.title}
                        </span>
                        <div className="flex items-center gap-1">
                          <select
                            value={size}
                            onChange={(e) => setWidgetSize(id, Number(e.target.value) as 1 | 2 | 3)}
                            className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[9px] font-mono text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800"
                          >
                            <option value={1}>1×1</option>
                            <option value={2}>2×1</option>
                            <option value={3}>3×1</option>
                          </select>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="live" />
                          <button
                            onClick={() => removeWidget(id)}
                            className="px-1.5 rounded text-[10px] text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                            aria-label={`Remove ${W.title}`}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="p-3 flex-1">
                        <DashboardWidgetInner id={id} metricStream={streams} alarmState={alarmState} alarmMetric={alarmMetric} logLines={logLines} refresh={dashRefresh} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Summary strip */}
      <div className="rounded-2xl bg-slate-900 text-slate-300 p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <h2 className="text-xl font-extrabold text-white">Observability Loop Cheat Sheet</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left">
            {[
              { t: "Metrics", d: "Collect → aggregate (avg/p95/sum) → store with retention. Agent-based + managed service integrations.", c: "text-sky-400" },
              { t: "Alarms", d: "Threshold + operator over N evaluation periods → OK / ALARM / INSUFFICIENT_DATA → SNS, Auto Scaling, Lambda actions.", c: "text-rose-400" },
              { t: "Logs", d: "Log groups per service, retention policies, Insights queries, and log-metric filters driving alarms.", c: "text-cyan-400" },
              { t: "X-Ray", d: "Trace IDs flow through segments; service maps show latency/errors per edge; sampling keeps overhead low.", c: "text-violet-400" },
            ].map((k) => (
              <div key={k.t} className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className={`text-sm font-extrabold font-mono ${k.c}`}>{k.t}</div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{k.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}