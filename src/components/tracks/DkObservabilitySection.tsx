"use client";

import { useState, useMemo, useEffect, useRef } from "react";

// ============================================================================
// TYPES & CONSTANT DATA — Container Observability (Prometheus · Grafana · Tempo)
// ============================================================================

type GaugeKey = "cpu" | "memory" | "disk" | "network" | "latency" | "errors";

interface GaugeDef {
  label: string;
  short: string;
  unit: string;
  color: string;
  metric: string;
  description: string;
  base: number;
  volatility: number;
  min: number;
  max: number;
}

const GAUGES: Record<GaugeKey, GaugeDef> = {
  cpu: {
    label: "CPU Usage",
    short: "cpu",
    unit: "%",
    color: "#0ea5e9",
    metric: "container_cpu_usage_seconds_total",
    description: "Sum of container CPU time over the node, expressed as a percentage of node capacity.",
    base: 34,
    volatility: 14,
    min: 0,
    max: 100,
  },
  memory: {
    label: "Memory Usage",
    short: "memory",
    unit: "MiB",
    color: "#2563eb",
    metric: "container_memory_working_set_bytes",
    description: "Working-set memory: the live bytes a container cannot free without reclaiming. Drives OOMKilled risk.",
    base: 620,
    volatility: 90,
    min: 0,
    max: 1024,
  },
  disk: {
    label: "Disk I/O",
    short: "disk",
    unit: "MB/s",
    color: "#06b6d4",
    metric: "container_fs_io_time_seconds_total",
    description: "Aggregated read/write throughput of the container filesystem on overlay layers and volume mounts.",
    base: 42,
    volatility: 25,
    min: 0,
    max: 120,
  },
  network: {
    label: "Network I/O",
    short: "net",
    unit: "Mbps",
    color: "#38bdf8",
    metric: "container_network_receive_bytes_total",
    description: "Receive + transmit bytes over all container veth endpoints, rate-converted from cumulative counters.",
    base: 88,
    volatility: 40,
    min: 0,
    max: 300,
  },
  latency: {
    label: "Request Latency p95",
    short: "lat",
    unit: "ms",
    color: "#0284c7",
    metric: "http_request_duration_seconds_bucket",
    description: "p95 latency computed from histogram buckets — the duration 95% of requests complete within.",
    base: 180,
    volatility: 65,
    min: 0,
    max: 600,
  },
  errors: {
    label: "Error Rate",
    short: "err",
    unit: "%",
    color: "#f43f5e",
    metric: "http_requests_total{status=~\"5..\"}",
    description: "Percentage of 5xx responses over the window — the metric that burns your availability SLO.",
    base: 1.4,
    volatility: 1.4,
    min: 0,
    max: 6,
  },
};

const GAUGE_KEYS: GaugeKey[] = ["cpu", "memory", "disk", "network", "latency", "errors"];

interface ScrapeTarget {
  name: string;
  endpoint: string;
  job: string;
  labels: string;
  up: boolean;
  samples: string;
}

const SCRAPE_TARGETS: ScrapeTarget[] = [
  { name: "cadvisor", endpoint: "9090/metrics", job: "kubernetes-nodes-cadvisor", labels: "job, instance, container", up: true, samples: "1.3m" },
  { name: "node-exporter", endpoint: "9100/metrics", job: "node-exporter", labels: "instance, device, mountpoint", up: true, samples: "840k" },
  { name: "kube-state-metrics", endpoint: "8080/metrics", job: "kube-state-metrics", labels: "namespace, pod, deployment", up: true, samples: "2.1m" },
  { name: "backend-api", endpoint: "8081/metrics", job: "app/backend", labels: "service, route, status", up: true, samples: "96k" },
  { name: "ingress-nginx", endpoint: "10254/metrics", job: "ingress-nginx", labels: "ingress, path, backend", up: false, samples: "412k" },
];

// ---------------------------------------------------------------------------
// Grafana dashboard builder
// ---------------------------------------------------------------------------

type WidgetId = "timeseries" | "bargauge" | "gauge" | "stat" | "heatmap" | "logs" | "table";

interface WidgetDef {
  icon: string;
  title: string;
  category: string;
  desc: string;
  query: string;
}

const WIDGETS: Record<WidgetId, WidgetDef> = {
  timeseries: {
    icon: "∿",
    title: "Time Series",
    category: "Graph",
    desc: "Line/area chart over a PromQL query",
    query: 'sum(rate(http_requests_total[5m])) by (service)',
  },
  bargauge: {
    icon: "▮",
    title: "Bar Gauge",
    category: "Graph",
    desc: "Horizontal bars per series",
    query: 'topk(6, sum(rate(http_requests_total[5m])) by (service))',
  },
  gauge: {
    icon: "◔",
    title: "Gauge",
    category: "Graph",
    desc: "Radial gauge with thresholds",
    query: "avg(container_cpu_usage_seconds_total{namespace=\"prod\"}) * 100",
  },
  stat: {
    icon: "Σ",
    title: "Stat",
    category: "Stat",
    desc: "Latest value / series summary",
    query: 'sum by (pod) (container_memory_working_set_bytes) / 1e6',
  },
  heatmap: {
    icon: "▦",
    title: "Heatmap",
    category: "Graph",
    desc: "Value distribution over time",
    query: "rate(http_request_duration_seconds_bucket[5m])",
  },
  logs: {
    icon: "≡",
    title: "Logs",
    category: "Log",
    desc: "Structured log stream panel",
    query: '{service="backend-api"} |= "error"',
  },
  table: {
    icon: "▤",
    title: "Table",
    category: "Table",
    desc: "Labeled query result table",
    query: 'topk(10, sum by (pod) (container_memory_working_set_bytes))',
  },
};

const WIDGET_IDS: WidgetId[] = ["timeseries", "bargauge", "gauge", "stat", "heatmap", "logs", "table"];

interface PlacedWidget {
  id: string;
  type: WidgetId;
  size: 1 | 2 | 3;
}

const WIDGET_PRESETS: { label: string; widgets: WidgetId[] }[] = [
  { label: "Cluster Overview", widgets: ["timeseries", "gauge", "stat", "timeseries", "logs"] },
  { label: "Kubernetes Nodes", widgets: ["gauge", "gauge", "timeseries", "stat", "heatmap"] },
  { label: "API Performance", widgets: ["timeseries", "stat", "bargauge", "logs", "table"] },
];

const SIZE_SPAN: Record<1 | 2 | 3, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
};

// ---------------------------------------------------------------------------
// Distributed tracing (Jaeger / Tempo)
// ---------------------------------------------------------------------------

interface TraceSample {
  id: string;
  service: string;
  operation: string;
  totalMs: number;
  status: "OK" | "ERROR";
  spans: number;
  traceId: string;
}

interface Span {
  name: string;
  operation: string;
  startMs: number;
  durationMs: number;
  service: string;
  status: "OK" | "ERROR";
  kind: "SERVER" | "CLIENT" | "INTERNAL" | "PRODUCER" | "CONSUMER";
  db: boolean;
  critical: boolean;
}

interface TraceDetail {
  sample: TraceSample;
  spans: Span[];
}

const TRACE_SAMPLES: TraceSample[] = [
  { id: "t1", service: "api-gateway", operation: "POST /api/v1/orders", totalMs: 1240, status: "OK", spans: 11, traceId: "7f4a92e1c8b3d5f6a0e1b2c3" },
  { id: "t2", service: "api-gateway", operation: "GET /api/v1/catalog", totalMs: 310, status: "OK", spans: 6, traceId: "a1b2c3d4e5f60718293a4b5c" },
  { id: "t3", service: "checkout-svc", operation: "POST /api/v1/checkout", totalMs: 2950, status: "ERROR", spans: 8, traceId: "9c8d7e6f5041324354657687" },
  { id: "t4", service: "auth-svc", operation: "POST /api/v1/auth/login", totalMs: 180, status: "OK", spans: 4, traceId: "1a2b3c4d5e6f708192a3b4c5" },
  { id: "t5", service: "inventory-svc", operation: "GET /api/v1/inventory", totalMs: 860, status: "OK", spans: 5, traceId: "3f4e5d6c7b8a091827364554" },
];

const TRACE_DETAILS: Record<string, TraceDetail> = {
  t1: {
    sample: TRACE_SAMPLES[0],
    spans: [
      { name: "api-gateway", operation: "POST /api/v1/orders", startMs: 0, durationMs: 1240, service: "api-gateway", status: "OK", kind: "SERVER", db: false, critical: true },
      { name: "api-gateway", operation: "proxy to backend", startMs: 60, durationMs: 1180, service: "api-gateway", status: "OK", kind: "CLIENT", db: false, critical: true },
      { name: "backend-api", operation: "orders.create", startMs: 86, durationMs: 1140, service: "backend-api", status: "OK", kind: "SERVER", db: false, critical: true },
      { name: "backend-api", operation: "validate line items", startMs: 100, durationMs: 120, service: "backend-api", status: "OK", kind: "INTERNAL", db: false, critical: false },
      { name: "inventory-svc", operation: "reserve stock", startMs: 240, durationMs: 380, service: "inventory-svc", status: "OK", kind: "CLIENT", db: false, critical: true },
      { name: "postgres", operation: "SELECT inventory WHERE sku", startMs: 262, durationMs: 90, service: "postgres", status: "OK", kind: "CLIENT", db: true, critical: true },
      { name: "redis", operation: "DEL inventory_lock:*", startMs: 600, durationMs: 12, service: "redis", status: "OK", kind: "CLIENT", db: true, critical: false },
      { name: "backend-api", operation: "apply discount", startMs: 440, durationMs: 210, service: "backend-api", status: "OK", kind: "INTERNAL", db: false, critical: false },
      { name: "payment-svc", operation: "charge card", startMs: 660, durationMs: 540, service: "payment-svc", status: "OK", kind: "CLIENT", db: false, critical: true },
      { name: "payment-gateway", operation: "stripe.charges.create", startMs: 690, durationMs: 500, service: "payment-gateway", status: "OK", kind: "SERVER", db: false, critical: true },
      { name: "backend-api", operation: "publish order.created", startMs: 1210, durationMs: 26, service: "backend-api", status: "OK", kind: "PRODUCER", db: false, critical: false },
    ],
  },
  t2: {
    sample: TRACE_SAMPLES[1],
    spans: [
      { name: "api-gateway", operation: "GET /api/v1/catalog", startMs: 0, durationMs: 310, service: "api-gateway", status: "OK", kind: "SERVER", db: false, critical: true },
      { name: "api-gateway", operation: "proxy to backend", startMs: 12, durationMs: 296, service: "api-gateway", status: "OK", kind: "CLIENT", db: false, critical: true },
      { name: "backend-api", operation: "catalog.list", startMs: 20, durationMs: 280, service: "backend-api", status: "OK", kind: "SERVER", db: false, critical: true },
      { name: "catalog-svc", operation: "query featured", startMs: 34, durationMs: 240, service: "catalog-svc", status: "OK", kind: "CLIENT", db: false, critical: true },
      { name: "postgres", operation: "SELECT products WHERE featured", startMs: 40, durationMs: 190, service: "postgres", status: "OK", kind: "CLIENT", db: true, critical: true },
      { name: "redis", operation: "cache GET featured", startMs: 150, durationMs: 8, service: "redis", status: "OK", kind: "CLIENT", db: true, critical: false },
    ],
  },
  t3: {
    sample: TRACE_SAMPLES[2],
    spans: [
      { name: "checkout-svc", operation: "POST /api/v1/checkout", startMs: 0, durationMs: 2950, service: "checkout-svc", status: "ERROR", kind: "SERVER", db: false, critical: true },
      { name: "checkout-svc", operation: "validate shipping", startMs: 30, durationMs: 60, service: "checkout-svc", status: "OK", kind: "INTERNAL", db: false, critical: false },
      { name: "inventory-svc", operation: "lock items", startMs: 110, durationMs: 420, service: "inventory-svc", status: "OK", kind: "CLIENT", db: false, critical: true },
      { name: "postgres", operation: "UPDATE inventory SET reserved", startMs: 130, durationMs: 380, service: "postgres", status: "OK", kind: "CLIENT", db: true, critical: true },
      { name: "payment-svc", operation: "charge card", startMs: 550, durationMs: 2100, service: "payment-svc", status: "OK", kind: "CLIENT", db: false, critical: true },
      { name: "payment-gateway", operation: "stripe API call (retried ×3)", startMs: 570, durationMs: 2050, service: "payment-gateway", status: "ERROR", kind: "SERVER", db: false, critical: true },
      { name: "checkout-svc", operation: "rollback inventory", startMs: 2680, durationMs: 220, service: "checkout-svc", status: "OK", kind: "INTERNAL", db: false, critical: false },
      { name: "checkout-svc", operation: "emit checkout.failed", startMs: 2910, durationMs: 18, service: "checkout-svc", status: "OK", kind: "PRODUCER", db: false, critical: false },
    ],
  },
  t4: {
    sample: TRACE_SAMPLES[3],
    spans: [
      { name: "auth-svc", operation: "POST /api/v1/auth/login", startMs: 0, durationMs: 180, service: "auth-svc", status: "OK", kind: "SERVER", db: false, critical: true },
      { name: "auth-svc", operation: "verify credentials", startMs: 10, durationMs: 90, service: "auth-svc", status: "OK", kind: "INTERNAL", db: false, critical: true },
      { name: "ldap-svc", operation: "bind user", startMs: 22, durationMs: 74, service: "ldap-svc", status: "OK", kind: "CLIENT", db: false, critical: true },
      { name: "redis", operation: "SET session:token", startMs: 120, durationMs: 30, service: "redis", status: "OK", kind: "CLIENT", db: true, critical: false },
    ],
  },
  t5: {
    sample: TRACE_SAMPLES[4],
    spans: [
      { name: "inventory-svc", operation: "GET /api/v1/inventory", startMs: 0, durationMs: 860, service: "inventory-svc", status: "OK", kind: "SERVER", db: false, critical: true },
      { name: "inventory-svc", operation: "parse warehouse query", startMs: 10, durationMs: 40, service: "inventory-svc", status: "OK", kind: "INTERNAL", db: false, critical: false },
      { name: "postgres", operation: "SELECT stock WHERE wh", startMs: 70, durationMs: 620, service: "postgres", status: "OK", kind: "CLIENT", db: true, critical: true },
      { name: "postgres", operation: "escalate to sequential scan", startMs: 75, durationMs: 610, service: "postgres", status: "OK", kind: "INTERNAL", db: true, critical: true },
      { name: "inventory-svc", operation: "aggregate by sku", startMs: 700, durationMs: 140, service: "inventory-svc", status: "OK", kind: "INTERNAL", db: false, critical: false },
    ],
  },
};

const SERVICE_COLORS: Record<string, string> = {
  "api-gateway": "#0ea5e9",
  "backend-api": "#2563eb",
  "inventory-svc": "#06b6d4",
  "catalog-svc": "#38bdf8",
  "checkout-svc": "#0284c7",
  "auth-svc": "#0ea5e9",
  "payment-svc": "#7dd3fc",
  "payment-gateway": "#38bdf8",
  postgres: "#0369a1",
  redis: "#0f766e",
  "ldap-svc": "#1d4ed8",
};

// ---------------------------------------------------------------------------
// Structured logging
// ---------------------------------------------------------------------------

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

interface LogEntry {
  ts: string;
  level: LogLevel;
  service: string;
  message: string;
  fields: Record<string, string | number | boolean>;
}

const LOG_LEVELS: LogLevel[] = ["DEBUG", "INFO", "WARN", "ERROR"];

interface LogTemplate {
  level: LogLevel;
  service: string;
  message: string;
  fields: Record<string, string | number | boolean>;
}

const LOG_POOL: LogTemplate[] = [
  { level: "INFO", service: "gateway", message: "request started", fields: { method: "POST", path: "/api/v1/orders", req_id: "req-8f3a" } },
  { level: "INFO", service: "backend-api", message: "order created", fields: { order_id: "ord-10422", total: 142.9, customer: "usr-77" } },
  { level: "DEBUG", service: "backend-api", message: "cache lookup", fields: { key: "catalog:featured", hit: true, ms: 3 } },
  { level: "WARN", service: "inventory-svc", message: "stock low for SKU", fields: { sku: "SKU-8821", remaining: 5, min: 10 } },
  { level: "INFO", service: "payment-svc", message: "charge authorized", fields: { id: "ch-77kk", ms: 84 } },
  { level: "ERROR", service: "payment-gateway", message: "upstream timeout on auth", fields: { provider: "stripe", attempt: 2, ms: 1004 } },
  { level: "INFO", service: "gateway", message: "response completed", fields: { req_id: "req-8f3a", status: 201, ms: 38 } },
  { level: "WARN", service: "inventory-svc", message: "retry queue behind", fields: { depth: 37, oldest_s: 62 } },
  { level: "DEBUG", service: "redis", message: "ttl extended", fields: { key: "session:token:7f", ttl_s: 1800 } },
  { level: "INFO", service: "postgres", message: "slow query logged", fields: { query: "SELECT * FROM orders WHERE total>1000", ms: 1480, rows: 12 } },
  { level: "ERROR", service: "postgres", message: "connection reset by peer", fields: { peer: "10.244.3.92:5432", err: "EOF" } },
  { level: "INFO", service: "backend-api", message: "order dispatched", fields: { order_id: "ord-10421", shipper: "ups" } },
];

// ---------------------------------------------------------------------------
// Alert rules
// ---------------------------------------------------------------------------

type AlertMetricKey = "cpu" | "memory" | "errors" | "latency" | "disk";

interface AlertMetricDef {
  label: string;
  unit: string;
  expr: string;
  gaugeKey: GaugeKey;
  defaultThreshold: number;
  summary: string;
}

const ALERT_METRICS: Record<AlertMetricKey, AlertMetricDef> = {
  cpu: {
    label: "Container CPU Usage",
    unit: "%",
    expr: 'avg by (pod) (rate(container_cpu_usage_seconds_total[5m])) * 100',
    gaugeKey: "cpu",
    defaultThreshold: 85,
    summary: "{{ $labels.pod }} exceeds {{ $value }}% CPU",
  },
  memory: {
    label: "Container Memory Usage",
    unit: "MiB",
    expr: "avg by (pod) (container_memory_working_set_bytes) / 1024 / 1024",
    gaugeKey: "memory",
    defaultThreshold: 900,
    summary: "{{ $labels.pod }} exceeds {{ $value }}MiB working set",
  },
  errors: {
    label: "HTTP 5xx Error Rate",
    unit: "%",
    expr: 'sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100',
    gaugeKey: "errors",
    defaultThreshold: 2,
    summary: "5xx rate is at {{ $value }}% of traffic",
  },
  latency: {
    label: "p95 Request Latency",
    unit: "ms",
    expr: 'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) * 1000',
    gaugeKey: "latency",
    defaultThreshold: 400,
    summary: "p95 latency is {{ $value }}ms",
  },
  disk: {
    label: "Filesystem Pressure",
    unit: "%",
    expr: "container_fs_usage_bytes / container_fs_limit_bytes * 100",
    gaugeKey: "memory",
    defaultThreshold: 90,
    summary: "Filesystem usage at {{ $value }}%",
  },
};

const ALERT_KEYS: AlertMetricKey[] = ["cpu", "memory", "errors", "latency", "disk"];

const FOR_OPTIONS = ["30s", "1m", "5m", "15m", "30m"];

// ---------------------------------------------------------------------------
// SLO calculator
// ---------------------------------------------------------------------------

const SLO_TARGETS = [99, 99.5, 99.9, 99.95, 99.99];

// ============================================================================
// SMALL PRESENTATION HELPERS
// ============================================================================

function Sparkline({ data, color, max }: { data: number[]; color: string; max: number }) {
  const w = 220;
  const h = 42;
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const denom = Math.max(max - min, 0.0001);
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(h - 4 - ((v - min) / denom) * (h - 8)).toFixed(1)}`);
  const area = `0,${h} ${pts.join(" ")} ${w},${h}`;
  const gid = `spark-${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function levelColor(level: LogLevel): string {
  return level === "ERROR" ? "text-rose-400" : level === "WARN" ? "text-amber-300" : level === "DEBUG" ? "text-slate-500" : "text-sky-300";
}

function levelChipColor(level: LogLevel): string {
  return level === "ERROR"
    ? "text-rose-600 border-rose-300 bg-rose-50"
    : level === "WARN"
      ? "text-amber-600 border-amber-300 bg-amber-50"
      : level === "DEBUG"
        ? "text-slate-500 border-slate-300 bg-slate-50"
        : "text-sky-600 border-sky-300 bg-sky-50";
}

function renderFields(fields: Record<string, string | number | boolean>): string {
  return Object.entries(fields)
    .map(([k, v]) => `${k}=${typeof v === "string" ? `"${v}"` : v}`)
    .join(" ");
}

function WidgetPreview({ type, theme }: { type: WidgetId; theme: "light" | "dark" }) {
  const dark = theme === "dark";
  const bar = (i: number, max = 100) => 35 + ((i * 37) % 55);
  if (type === "logs") {
    return (
      <div className="p-3 space-y-1 font-mono text-[9px]">
        {["13:02:11 INFO  order created order_id=ord-10422", "13:02:11 WARN  retry queue behind depth=30", "13:02:11 ERROR payment-gateway upstream timeout"].map((l, i) => (
          <div key={i} className={`truncate ${dark ? (i === 2 ? "text-rose-300" : i === 1 ? "text-amber-200" : "text-sky-200") : (i === 2 ? "text-rose-600" : i === 1 ? "text-amber-600" : "text-slate-600")}`}>
            {l}
          </div>
        ))}
      </div>
    );
  }
  if (type === "table") {
    return (
      <div className="p-3 font-mono text-[9px] space-y-1">
        {[
          ["pod", "memory"],
          ["backend-7f8d9", "812MiB"],
          ["backend-9ab12", "740MiB"],
          ["web-2c3d4", "455MiB"],
        ].map(([k, v], i) => (
          <div key={i} className={`flex justify-between border-b pb-0.5 ${dark ? "border-slate-700/60 text-slate-300" : "border-slate-100 text-slate-600"}`}>
            <span>{k}</span>
            <span className={dark ? "text-sky-300" : "text-blue-600"}>{v}</span>
          </div>
        ))}
      </div>
    );
  }
  if (type === "heatmap") {
    return (
      <div className="p-3 grid grid-cols-10 gap-0.5" aria-hidden="true">
        {Array.from({ length: 50 }, (_, i) => {
          const shade = Math.abs(Math.sin(i * 1.7)) * 255;
          return (
            <div
              key={i}
              className="h-2 rounded-[2px]"
              style={{ backgroundColor: dark ? `rgba(14,165,233,${(shade / 255) * 0.9 + 0.05})` : `rgba(37,99,235,${(shade / 255) * 0.75 + 0.05})` }}
            />
          );
        })}
      </div>
    );
  }
  if (type === "gauge" || type === "stat") {
    const pct = Math.min(100, Math.max(8, bar(2, 92)));
    return (
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="relative w-16 h-16 rounded-full" style={{ background: dark ? "#0b1526" : "#e2e8f0" }}>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(${type === "gauge" ? "#0ea5e9" : "#2563eb"} ${pct * 3.6}deg, transparent 0deg)`,
              WebkitMask: "radial-gradient(circle, transparent 55%, black 56%)",
              mask: "radial-gradient(circle, transparent 55%, black 56%)",
            }}
          />
          <div className={`absolute inset-0 flex items-center justify-center font-mono text-[10px] font-bold ${dark ? "text-slate-100" : "text-slate-700"}`}>
            {pct}%
          </div>
        </div>
        <div className="font-mono">
          <div className={`text-[9px] ${dark ? "text-slate-400" : "text-slate-500"}`}>{type === "gauge" ? "memory / 1Gi" : "2.84 req/s"}</div>
          <div className={`text-base font-extrabold ${dark ? "text-white" : "text-slate-900"}`}>{type === "gauge" ? "68%" : "204k"}</div>
          <div className={`text-[9px] ${dark ? "text-slate-500" : "text-slate-400"}`}>updated 15s ago</div>
        </div>
      </div>
    );
  }
  // time series / bar gauge: mini chart
  return (
    <div className="p-3">
      <svg viewBox="0 0 220 56" className="w-full h-14" preserveAspectRatio="none" aria-hidden="true">
        {type === "bargauge" ? (
          <g>
            {Array.from({ length: 6 }, (_, i) => (
              <rect key={i} x={i * 38 + 2} y={56 - bar(i + 3) * 0.5} width="30" height={bar(i + 3) * 0.5} rx="3" fill={dark ? "#0ea5e9" : "#2563eb"} opacity={0.55 + i * 0.07} />
            ))}
          </g>
        ) : (
          <g>
            {Array.from({ length: 24 }, (_, i) => {
              const v = 20 + Math.abs(Math.sin(i * 0.9)) * 30 + (i % 7) * 1.4;
              return <rect key={i} x={i * 9.4} y={56 - v} width="5.5" height={v} rx="2" fill={dark ? "#38bdf8" : "#0ea5e9"} opacity="0.75" />;
            })}
          </g>
        )}
      </svg>
      <div className={`flex justify-between font-mono text-[8px] mt-1 ${dark ? "text-slate-500" : "text-slate-400"}`}>
        <span>−60m</span>
        <span>now</span>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const INITIAL_LOGS: LogEntry[] = [
  { ts: "14:02:11.482", level: "INFO", service: "gateway", message: "request started", fields: { method: "POST", path: "/api/v1/orders", req_id: "req-8f3a" } },
  { ts: "14:02:11.490", level: "INFO", service: "backend-api", message: "order claimed", fields: { order_id: "ord-10421", total: 428.9, customer: "usr-77" } },
  { ts: "14:02:11.501", level: "WARN", service: "inventory-svc", message: "stock low for SKU", fields: { sku: "SKU-8821", qty: 5, min: 10 } },
  { ts: "14:02:11.505", level: "INFO", service: "payment-svc", message: "charge authorized", fields: { id: "ch-77kk", ms: 84 } },
  { ts: "14:02:11.512", level: "ERROR", service: "payment-gateway", message: "upstream timeout on auth", fields: { provider: "stripe", attempt: 2, ms: 1004 } },
  { ts: "14:02:11.518", level: "INFO", service: "gateway", message: "response completed", fields: { req_id: "req-8f3a", status: 201, ms: 38 } },
];

export default function DkObservabilitySection() {
  const POINTS = 26;

  // ------------------------------------------------------------------------
  // MODULE 1 STATE — Prometheus metric simulator
  // ------------------------------------------------------------------------

  const seedHistory = (): Record<GaugeKey, number[]> => {
    const seed: Record<GaugeKey, number[]> = { cpu: [], memory: [], disk: [], network: [], latency: [], errors: [] };
    GAUGE_KEYS.forEach((k) => {
      const g = GAUGES[k];
      for (let i = 0; i < POINTS; i++) {
        const wave = Math.sin(i / 4 + k.length) * g.volatility * 0.5;
        seed[k].push(Math.min(g.max, Math.max(g.min, g.base + wave + (Math.random() - 0.5) * g.volatility)));
      }
    });
    return seed;
  };

  const [history, setHistory] = useState<Record<GaugeKey, number[]>>(seedHistory);
  const [simSpeed, setSimSpeed] = useState<"1x" | "2x">("1x");
  const [paused, setPaused] = useState(false);
  const [selectedGauge, setSelectedGauge] = useState<GaugeKey>("cpu");
  const tickRef = useRef(0);

  useEffect(() => {
    if (paused) return;
    const intervalMs = simSpeed === "2x" ? 650 : 1300;
    const id = setInterval(() => {
      tickRef.current += 1;
      const t = tickRef.current;
      setHistory((prev) => {
        const next: Record<GaugeKey, number[]> = { ...prev };
        GAUGE_KEYS.forEach((k) => {
          const g = GAUGES[k];
          const last = prev[k][prev[k].length - 1];
          const drift = g.base - last;
          const wave = Math.sin(t / 2.6 + k.length) * g.volatility * 0.3;
          let v = last + drift * 0.06 + wave + (Math.random() - 0.5) * g.volatility;
          v = Math.max(g.min, Math.min(g.max, v));
          next[k] = [...prev[k].slice(-(POINTS - 1)), v];
        });
        return next;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [paused, simSpeed]);

  const currentValue = (k: GaugeKey) => history[k][history[k].length - 1];

  const gaugePercent = (k: GaugeKey) => {
    const g = GAUGES[k];
    return Math.max(0, Math.min(100, ((currentValue(k) - g.min) / (g.max - g.min)) * 100));
  };

  // ------------------------------------------------------------------------
  // MODULE 2 STATE — Grafana dashboard builder
  // ------------------------------------------------------------------------

  const [placedWidgets, setPlacedWidgets] = useState<PlacedWidget[]>([]);
  const [dashPreset, setDashPreset] = useState<string | null>(null);
  const [dashTheme, setDashTheme] = useState<"light" | "dark">("dark");
  const [exportedJson, setExportedJson] = useState<string>("");
  const [copiedJson, setCopiedJson] = useState(false);

  const addWidget = (type: WidgetId) => {
    setPlacedWidgets((prev) => [...prev, { id: `${type}-${Date.now()}-${Math.floor(Math.random() * 999)}`, type, size: 1 }]);
  };

  const removeWidget = (id: string) => {
    setPlacedWidgets((prev) => prev.filter((w) => w.id !== id));
  };

  const resizeWidget = (id: string, size: 1 | 2 | 3) => {
    setPlacedWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, size } : w)));
  };

  const applyPreset = (label: string) => {
    const preset = WIDGET_PRESETS.find((p) => p.label === label);
    if (!preset) return;
    setDashPreset(label);
    setPlacedWidgets(
      preset.widgets.map((type, i) => ({ id: `${type}-preset-${i}-${Date.now()}`, type, size: (i % 3 + 1) as 1 | 2 | 3 }))
    );
    setExportedJson("");
  };

  const clearCanvas = () => {
    setPlacedWidgets([]);
    setDashPreset(null);
    setExportedJson("");
  };

  const exportDashboard = () => {
    const json = JSON.stringify(
      {
        title: dashPreset ?? "Container Observability",
        uid: "obs-dash-01",
        schemaVersion: 38,
        timezone: "browser",
        refresh: "15s",
        panelCount: placedWidgets.length,
        panels: placedWidgets.map((w, i) => ({
          id: i + 1,
          title: WIDGETS[w.type].title,
          type: w.type,
          gridPos: { w: w.size * 8, h: 8, x: (i * 8) % 24, y: i },
          targets: [{ expr: WIDGETS[w.type].query, legendFormat: "__auto" }],
        })),
      },
      null,
      2
    );
    setExportedJson(json);
  };

  const copyJson = () => {
    navigator.clipboard?.writeText(exportedJson);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 1600);
  };

  // ------------------------------------------------------------------------
  // MODULE 3 STATE — Distributed tracing
  // ------------------------------------------------------------------------

  const [traceBackend, setTraceBackend] = useState<"tempo" | "jaeger">("tempo");
  const [traceId, setTraceId] = useState<string>("t1");
  const [selectedSpanIdx, setSelectedSpanIdx] = useState<number>(2);

  const trace = TRACE_DETAILS[traceId];
  const selectedSpan = trace.spans[selectedSpanIdx];

  // ------------------------------------------------------------------------
  // MODULE 4 STATE — Structured logging
  // ------------------------------------------------------------------------

  const [activeLevels, setActiveLevels] = useState<LogLevel[]>(["INFO", "WARN", "ERROR"]);
  const [searchTerm, setSearchTerm] = useState("");
  const [liveTail, setLiveTail] = useState(true);
  const [logLines, setLogLines] = useState<LogEntry[]>(INITIAL_LOGS);

  const toggleLevel = (lv: LogLevel) => {
    setActiveLevels((prev) => (prev.includes(lv) ? prev.filter((l) => l !== lv) : [...prev, lv]));
  };

  const countLevel = (lv: LogLevel) => logLines.filter((l) => l.level === lv).length;

  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return logLines.filter(
      (l) => activeLevels.includes(l.level) && (term === "" || l.message.toLowerCase().includes(term) || l.service.toLowerCase().includes(term))
    );
  }, [logLines, activeLevels, searchTerm]);

  useEffect(() => {
    if (!liveTail) return;
    const id = setInterval(() => {
      const tpl = LOG_POOL[Math.floor(Math.random() * LOG_POOL.length)];
      const now = new Date();
      const ts = now.toTimeString().slice(0, 8) + "." + String(now.getMilliseconds()).padStart(3, "0");
      setLogLines((prev) => [...prev.slice(-119), { ...tpl, ts, fields: { ...tpl.fields, pod: "backend-" + (Math.floor(Math.random() * 9) + 1) + "abc" } }]);
    }, 2400);
    return () => clearInterval(id);
  }, [liveTail]);

  // ------------------------------------------------------------------------
  // MODULE 5 STATE — Alert rule configurator
  // ------------------------------------------------------------------------

  const [alertMetric, setAlertMetric] = useState<AlertMetricKey>("errors");
  const [alertOperator, setAlertOperator] = useState<">" | ">=" | "<" | "<=">(">");
  const [alertThreshold, setAlertThreshold] = useState(ALERT_METRICS.errors.defaultThreshold);
  const [alertFor, setAlertFor] = useState<string>("5m");
  const [alertSeverity, setAlertSeverity] = useState<"critical" | "warning" | "info">("critical");
  const [alertLabels, setAlertLabels] = useState<string>("team=platform\nenv=prod");
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [evalCount, setEvalCount] = useState(0);
  const [copiedRule, setCopiedRule] = useState(false);

  const alertDef = ALERT_METRICS[alertMetric];

  const alertValue = useMemo(() => {
    const v = currentValue(alertDef.gaugeKey);
    return Math.round(v * 10) / 10;
  }, [alertDef, history]);

  const alertBreached = alertOperator === ">" || alertOperator === ">=" ? (alertOperator === ">" ? alertValue > alertThreshold : alertValue >= alertThreshold) : alertOperator === "<" ? alertValue < alertThreshold : alertValue <= alertThreshold;

  const alertState: "DISABLED" | "INACTIVE" | "PENDING" | "FIRING" = !alertEnabled
    ? "DISABLED"
    : !alertBreached
      ? "INACTIVE"
      : evalCount >= 2
        ? "FIRING"
        : "PENDING";

  const evaluateRule = () => {
    if (alertBreached) {
      setEvalCount((prev) => Math.min(3, prev + 1));
    } else {
      setEvalCount(0);
    }
  };

  const generatedRuleYaml = useMemo(() => {
    const labels = alertLabels
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [k, v] = s.split("=");
        return k && v ? `        ${k}: "${v.trim()}"` : "";
      })
      .filter(Boolean)
      .join("\n");
    return `groups:
  - name: container-observability.alerts
    rules:
      - alert: ${alertDef.label.toUpperCase().replace(/[^A-Z0-9]/g, "_")}
        expr: ${alertDef.expr} ${alertOperator} ${alertThreshold}
        for: ${alertFor}
        labels:
          severity: ${alertSeverity}
${labels}
        annotations:
          summary: ${JSON.stringify(alertDef.summary)}
          description: "Value ${alertValue}${alertDef.unit} is ${alertOperator} ${alertThreshold} for ${alertFor}."`;
  }, [alertDef, alertOperator, alertThreshold, alertFor, alertSeverity, alertLabels, alertValue]);

  const copyRule = () => {
    navigator.clipboard?.writeText(generatedRuleYaml);
    setCopiedRule(true);
    setTimeout(() => setCopiedRule(false), 1600);
  };

  const changeAlertMetric = (key: AlertMetricKey) => {
    setAlertMetric(key);
    setAlertThreshold(ALERT_METRICS[key].defaultThreshold);
  };

  // ------------------------------------------------------------------------
  // MODULE 6 STATE — SLI/SLO calculator
  // ------------------------------------------------------------------------

  const [sloType, setSloType] = useState<"availability" | "latency">("availability");
  const [sloTarget, setSloTarget] = useState(99.9);
  const [sloWindowDays, setSloWindowDays] = useState(30);
  const [sloTotal, setSloTotal] = useState(4500000);
  const [sloBad, setSloBad] = useState(2250);
  const [sloLatencyMs, setSloLatencyMs] = useState(240);
  const [sloLatencyBudgetMs, setSloLatencyBudgetMs] = useState(400);

  const slo = useMemo(() => {
    if (sloType === "latency") {
      const consumedPct = Math.min(100, (sloLatencyMs / sloLatencyBudgetMs) * 100);
      return {
        availability: null as number | null,
        goodPct: Math.max(0, 100 - consumedPct),
        consumedPct,
        remainingPct: Math.max(0, 100 - consumedPct),
        allowedBad: 0,
        remainingBad: 0,
        burnRate: 1,
        status: sloLatencyMs <= sloLatencyBudgetMs ? "COMPLIANT" : "BREACHED",
      };
    }
    const availability = sloTotal > 0 ? ((sloTotal - sloBad) / sloTotal) * 100 : 100;
    const allowedBad = Math.round((sloTotal * (100 - sloTarget)) / 100);
    const consumedPct = allowedBad > 0 ? Math.min(100, (sloBad / allowedBad) * 100) : 0;
    return {
      availability,
      goodPct: availability,
      consumedPct,
      remainingPct: Math.max(0, 100 - consumedPct),
      allowedBad,
      remainingBad: Math.max(0, allowedBad - sloBad),
      burnRate: allowedBad > 0 ? sloBad / allowedBad : 0,
      status: availability >= sloTarget ? "COMPLIANT" : "BREACHED",
    };
  }, [sloType, sloTarget, sloWindowDays, sloTotal, sloBad, sloLatencyMs, sloLatencyBudgetMs]);

  return (
    <div className="space-y-8">
      {/* Track Title Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0b1526] via-[#0e2238] to-[#0b1526] border border-slate-700/60 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-400/10 border border-sky-300/30 text-xs font-mono text-sky-300">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            Docker Track • Container Observability
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Observability Stack Lab</h1>
          <p className="text-sm text-slate-300 dark:text-slate-400 max-w-3xl leading-relaxed">
            Prometheus metric collection, Grafana dashboard composition, Tempo/Jaeger distributed tracing,
            structured log streams, alert rule authoring, and SLI/SLO budgeting — the full observability
            loop for containerized workloads.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              ["Scrape", "15s interval"],
              ["Retention", "15d"],
              ["Targets", `${SCRAPE_TARGETS.filter((t) => t.up).length}/${SCRAPE_TARGETS.length} up`],
              ["Tempo", "trace.id propagation"],
            ].map(([k, v]) => (
              <span key={k} className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-sky-200">
                {k} <span className="text-slate-500 dark:text-slate-400">·</span> {v}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      <section id="metrics" className="scroll-mt-24 space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl hover:border-sky-300 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">Module 1 • Prometheus Metrics</div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Live Metric Simulator</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Gauges sampled every {simSpeed === "2x" ? "650" : "1300"}ms — counters stay monotonic, rate() converts them to usable rates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaused(!paused)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border font-bold transition-all ${
                paused ? "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700" : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600"
              }`}
            >
              {paused ? "❚❚ PAUSED" : "● SAMPLING"}
            </button>
            <div className="flex items-center gap-1 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 px-1 py-1">
              {(["1x", "2x"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSimSpeed(s)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                    simSpeed === s ? "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Gauge cards */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {GAUGE_KEYS.map((k) => {
              const g = GAUGES[k];
              const active = selectedGauge === k;
              const pct = gaugePercent(k);
              return (
                <button
                  key={k}
                  onClick={() => setSelectedGauge(k)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    active ? "border-sky-400 bg-sky-50/60 dark:bg-sky-900/30 shadow-md" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-sky-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: g.color }} />
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{g.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{g.unit}</span>
                  </div>
                  <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
                    {currentValue(k).toFixed(k === "memory" || k === "disk" || k === "network" || k === "latency" ? 0 : 1)}
                    <span className="text-xs font-mono text-slate-400 dark:text-slate-500 ml-1">{g.unit}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 w-8">{g.short}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden">
                      <div
                        className={`h-full rounded transition-all duration-700 ${
                          pct > 88 ? "bg-rose-400" : pct > 68 ? "bg-amber-400" : "bg-gradient-to-r from-sky-400 to-blue-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`text-[9px] font-mono font-bold ${pct > 88 ? "text-rose-500 dark:text-rose-400" : "text-slate-400 dark:text-slate-500"}`}>{pct.toFixed(0)}%</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected gauge detail + scrape targets */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 bg-white dark:bg-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">{GAUGES[selectedGauge].label}</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-700">Gauge</span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 leading-relaxed min-h-[64px]">{GAUGES[selectedGauge].description}</div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-700 rounded-lg px-2.5 py-2 break-all">
                <span className="text-sky-600 dark:text-sky-400 font-bold">query</span> {GAUGES[selectedGauge].metric}
              </div>
              <div className="mt-2">
                <Sparkline data={history[selectedGauge]} color={GAUGES[selectedGauge].color} max={GAUGES[selectedGauge].max} />
              </div>
              <div className="text-[9px] font-mono text-slate-400 dark:text-slate-500 flex justify-between border-t border-slate-100 dark:border-slate-700 pt-1.5">
                <span>window {POINTS}p · last {simSpeed === "2x" ? "650" : "1300"}ms</span>
                <span>{paused ? "sampling paused" : "next scrape…"}</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Scrape targets</span>
                <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">TSDB state</span>
              </div>
              <div className="space-y-1.5">
                {SCRAPE_TARGETS.map((t) => (
                  <div key={t.name} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.up ? "bg-emerald-400" : "bg-rose-500 animate-ping"}`} />
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{t.name}</span>
                      <span className="text-slate-400 dark:text-slate-500 hidden sm:inline truncate">:{t.endpoint}</span>
                    </div>
                    <span className={`shrink-0 font-bold ${t.up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>{t.up ? "UP" : "DOWN"}</span>
                  </div>
                ))}
              </div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2">
                <span className="font-bold text-sky-700 dark:text-sky-300">up</span> = scrape succeeded · <span className="font-bold text-sky-700 dark:text-sky-300">labels</span> define each series' cardivality key.
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 font-mono">
          <span className="font-bold text-sky-600 dark:text-sky-400">PROMETHEUS:</span>
          <span>counters always increase — use rate()</span>
          <span>gauges go up and down (current value) ·</span>
          <span>histograms power quantiles + SLIs ·</span>
          <span>alerting uses the same query language as dashboards.</span>
        </div>
      </section>

      {/* ========================================================================= */}
      <section id="dashboard" className="scroll-mt-24 space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl hover:border-blue-300 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Module 2 • Grafana</div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Dashboard Builder</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Compose panels from the widget palette, size them on the canvas, export provisioning JSON.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 px-1 py-1">
              {(["light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setDashTheme(t)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                    dashTheme === t ? (t === "dark" ? "bg-slate-800 text-white" : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300") : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {t === "dark" ? "● dark" : "○ light"}
                </button>
              ))}
            </div>
            <button
              onClick={exportDashboard}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600 hover:bg-blue-100"
            >
              Export JSON
            </button>
            <button
              onClick={clearCanvas}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:border-rose-300 transition-colors"
            >
              ✕ Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Widget palette + presets */}
          <div className="lg:col-span-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-4">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {WIDGET_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p.label)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-colors ${
                    dashPreset === p.label ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600 font-bold" : "text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">Widget palette</div>
            <div className="grid grid-cols-1 gap-2">
              {WIDGET_IDS.map((id) => (
                <button
                  key={id}
                  onClick={() => addWidget(id)}
                  className="p-3 rounded-lg text-left border text-xs transition-all border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300 text-slate-700 dark:text-slate-200"
                >
                  <span className="flex items-center gap-2 font-bold">
                    <span className="text-sm text-blue-600 dark:text-blue-400">{WIDGETS[id].icon}</span> {WIDGETS[id].title}
                  </span>
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">{WIDGETS[id].desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dashboard canvas */}
          <div className="lg:col-span-9 space-y-4">
            <div className={`rounded-xl border-2 border-dashed p-4 min-h-[320px] transition-colors ${dashTheme === "dark" ? "border-slate-700 bg-[#111c2e]" : "border-slate-200 bg-slate-50"}`}>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/20">
                <span className={`text-xs font-mono font-bold ${dashTheme === "dark" ? "text-sky-300" : "text-slate-800"}`}>
                  {dashPreset ?? "Untitled Dashboard"} <span className="opacity-50">· {placedWidgets.length} panels</span>
                </span>
                <span className={`text-[9px] font-mono ${dashTheme === "dark" ? "text-slate-500" : "text-slate-400"}`}>auto refresh 15s · time range 1h</span>
              </div>
              {placedWidgets.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <span className={`text-4xl ${dashTheme === "dark" ? "text-slate-700" : "text-slate-300"}`}>▦</span>
                  <p className={`text-sm font-mono ${dashTheme === "dark" ? "text-slate-500" : "text-slate-400"}`}>empty canvas — add widgets from the palette</p>
                  <p className={`text-[10px] font-mono ${dashTheme === "dark" ? "text-slate-600" : "text-slate-400"}`}>or pick a preset template above</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {placedWidgets.map((w) => (
                    <div
                      key={w.id}
                      className={`rounded-xl ${dashTheme === "dark" ? "bg-[#12233b] border border-slate-700/60" : "bg-white border border-slate-200"} shadow-sm overflow-hidden flex flex-col ${SIZE_SPAN[w.size]}`}
                    >
                      <div className={`flex items-center justify-between px-3 py-1.5 border-b ${dashTheme === "dark" ? "border-slate-700/60" : "border-slate-100"}`}>
                        <span className={`text-[11px] font-mono font-bold flex items-center gap-1.5 ${dashTheme === "dark" ? "text-sky-300" : "text-slate-900"}`}>
                          <span className={dashTheme === "dark" ? "text-sky-500" : "text-blue-600"}>{WIDGETS[w.type].icon}</span>
                          {WIDGETS[w.type].title}
                        </span>
                        <div className="flex items-center gap-1">
                          <select
                            value={w.size}
                            onChange={(e) => resizeWidget(w.id, Number(e.target.value) as 1 | 2 | 3)}
                            className={`px-1 py-0.5 rounded border text-[9px] font-mono ${
                              dashTheme === "dark" ? "bg-slate-800 border-slate-600 text-slate-300" : "bg-white border-slate-200 text-slate-600"
                            }`}
                            aria-label={`${WIDGETS[w.type].title} size`}
                          >
                            <option value={1}>1×1</option>
                            <option value={2}>2×1</option>
                            <option value={3}>3×1</option>
                          </select>
                          <button
                            onClick={() => removeWidget(w.id)}
                            className={`px-1.5 rounded text-[10px] transition-colors ${
                              dashTheme === "dark" ? "text-slate-500 hover:text-rose-400" : "text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                            }`}
                            aria-label={`Remove ${WIDGETS[w.type].title}`}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <WidgetPreview type={w.type} theme={dashTheme} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-3.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 leading-relaxed">
              <span className="font-bold text-blue-600 dark:text-blue-400">GRAFANA PANELS:</span> each panel renders a <span className="text-slate-700 dark:text-slate-200">PromQL</span> target — the query defines the data, the visualization defines the shape (lines, gauges, heatmaps, tables).
            </div>
          </div>
        </div>

        {exportedJson && (
          <div className="rounded-xl bg-[#0b1526] border border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/60 bg-[#0e2238]">
              <span className="text-xs font-mono text-slate-300 dark:text-slate-400 font-bold">dashboard.json · provisioning export</span>
              <button
                onClick={copyJson}
                className="px-2.5 py-1 rounded bg-white/10 border border-white/15 text-[10px] font-mono text-slate-300 dark:text-slate-400 hover:bg-white/20 transition-colors"
              >
                {copiedJson ? "✓ copied" : "Copy"}
              </button>
            </div>
            <pre className="p-4 text-[10px] font-mono text-sky-200 overflow-x-auto leading-relaxed">{exportedJson}</pre>
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 font-mono">
          <span className="font-bold text-blue-600 dark:text-blue-400">KEY CONCEPTS:</span>
          <span>dashboards are JSON + provisioned via config ·</span>
          <span>folders/teams gate dashboard access ·</span>
          <span>unified alerting = Prometheus rules rendered as panels ·</span>
          <span>query variables ($namespace) keep dashboards reusable.</span>
        </div>
      </section>

      {/* ========================================================================= */}
      <section id="tracing" className="scroll-mt-24 space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl hover:border-cyan-300 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-1">Module 3 • Distributed Tracing</div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Trace Waterfall — Jaeger / Tempo</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">One user request fans out across services; every span carries start time, duration, status, and its parent link.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 px-1 py-1">
              {(["tempo", "jaeger"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setTraceBackend(b)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                    traceBackend === b ? "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {b === "jaeger" ? "Jaeger" : "Tempo"}
                </button>
              ))}
            </div>
            <span className="px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700 text-[10px] font-mono">
              Sampling {traceBackend === "jaeger" ? "head-based 10%" : "tail-based 1% + errors"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Trace list */}
          <div className="lg:col-span-3 space-y-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-4">
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Traces ({TRACE_SAMPLES.length})</span>
              <div className="mt-2 space-y-2">
                {TRACE_SAMPLES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setTraceId(t.id); setSelectedSpanIdx(2); }}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      traceId === t.id ? "border-cyan-400 bg-cyan-50/60 dark:bg-cyan-900/30 shadow-md" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-cyan-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-900 dark:text-slate-100 truncate">{t.operation}</span>
                      <span
                        className={`shrink-0 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold ${
                          t.status === "OK" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700" : "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-700"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1">
                      {t.service} · {t.totalMs}ms · {t.spans} spans
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-3.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 leading-relaxed">
              <span className="font-bold text-cyan-600 dark:text-cyan-400">TRACE ID:</span> <span className="break-all">{trace.sample.traceId}</span>
              <div className="mt-1">propagated via <span className="text-slate-700 dark:text-slate-200">traceparent</span> header · W3C ctx</div>
            </div>
          </div>

          {/* Waterfall */}
          <div className="lg:col-span-9 space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden bg-white dark:bg-slate-800">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700">
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                  {trace.sample.operation} <span className="text-cyan-600 dark:text-cyan-400">· {trace.sample.totalMs}ms total</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{trace.sample.spans} spans · service depth {new Set(trace.spans.map((s) => s.service)).size}</span>
              </div>

              {/* Timeline ruler */}
              <div className="px-4 pt-3">
                <div className="relative h-2 rounded bg-gradient-to-r from-cyan-100 via-sky-100 to-blue-100 dark:from-cyan-900/40 dark:via-sky-900/40 dark:to-blue-900/40 border border-slate-100 dark:border-slate-700">
                  {[0, 0.25, 0.5, 0.75, 1].map((p) => (
                    <span key={p} className="absolute top-0 bottom-0 w-px bg-slate-300/70 dark:bg-slate-600/70" style={{ left: `${p * 100}%` }} />
                  ))}
                </div>
                <div className="flex justify-between px-0.5 text-[8px] font-mono text-slate-400 dark:text-slate-500 mt-1">
                  {[0, Math.round(trace.sample.totalMs / 4), Math.round(trace.sample.totalMs / 2), Math.round((trace.sample.totalMs * 3) / 4), trace.sample.totalMs].map((m) => (
                    <span key={m}>{m}ms</span>
                  ))}
                </div>
              </div>

              <div className="p-4 pt-2 space-y-1">
                {trace.spans.map((s, i) => {
                  const left = (s.startMs / trace.sample.totalMs) * 100;
                  const width = Math.max(1.5, (s.durationMs / trace.sample.totalMs) * 100);
                  const color = SERVICE_COLORS[s.service] ?? "#38bdf8";
                  const isSelected = selectedSpanIdx === i;
                  return (
                    <button key={`${s.name}-${i}`} onClick={() => setSelectedSpanIdx(i)} className={`w-full flex items-center gap-2 text-left rounded-lg px-1.5 py-0.5 transition-colors ${isSelected ? "bg-cyan-50/70 dark:bg-cyan-900/30" : "hover:bg-slate-50 dark:hover:bg-slate-600"}`}>
                      <span className="w-40 shrink-0 truncate pl-2 text-[10px] font-mono">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{s.service}</span>
                        <span className="text-slate-400 dark:text-slate-500"> · {s.operation}</span>
                      </span>
                      <span className="flex-1 relative h-5 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden">
                        <span
                          className={`absolute top-0 bottom-0 rounded border ${s.status === "OK" ? "border-white/40" : "border-rose-200 dark:border-rose-700"}`}
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            backgroundColor: s.status === "OK" ? color : "#f43f5e",
                            boxShadow: s.critical ? `0 0 0 1.5px ${color}66` : undefined,
                          }}
                        />
                      </span>
                      <span className="w-16 shrink-0 text-right text-[10px] font-mono text-slate-500 dark:text-slate-400">{s.durationMs}ms</span>
                      <span className={`shrink-0 w-12 text-center text-[8px] font-mono font-bold ${s.status === "OK" ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>{s.kind}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Span detail */}
            {selectedSpan && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${selectedSpan.status === "OK" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700" : "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-700"}`}>
                    {selectedSpan.status} · {selectedSpan.kind}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">critical path: {selectedSpan.critical ? "yes" : "no"}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[10px]">
                  {[
                    ["span", `"${selectedSpan.operation}"`],
                    ["service", selectedSpan.service],
                    ["start", `${selectedSpan.startMs}ms`],
                    ["duration", `${selectedSpan.durationMs}ms`],
                    ["kind", selectedSpan.kind],
                    ["trace", trace.sample.traceId.slice(0, 12)],
                    ["tags", selectedSpan.db ? "db.system=postgres" : "component=http"],
                    ["parent", selectedSpan.startMs === 0 ? "ROOT" : `span@${selectedSpan.startMs - 30}ms`],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
                      <span className="text-slate-400 dark:text-slate-500">{k}:</span> <span className="text-slate-800 dark:text-slate-200 font-bold">{v}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                  {selectedSpan.status === "ERROR"
                    ? `Root cause: ${trace.sample.operation} → ${selectedSpan.service} — this span burned ${selectedSpan.durationMs}ms (${((selectedSpan.durationMs / trace.sample.totalMs) * 100).toFixed(0)}% of trace time).`
                    : `This span took ${selectedSpan.durationMs}ms — ${((selectedSpan.durationMs / trace.sample.totalMs) * 100).toFixed(0)}% of the ${trace.sample.totalMs}ms trace. ${
                        selectedSpan.db ? "Database call: suspect missing indexes, N+1 queries, or pool saturation." : ""
                      }`}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 font-mono">
              <span className="font-bold text-cyan-600 dark:text-cyan-400">TRACING 101:</span>
              <span>trace id propagates via traceparent / b3 headers ·</span>
              <span>span context carries parent→child topology ·</span>
              <span>tail sampling keeps error traces, drops happy paths ·</span>
              <span>waterfall duration = wall clock, gaps = queuing/waiting.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      <section id="logs" className="scroll-mt-24 space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl hover:border-sky-300 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-1">Module 4 • Structured Logging</div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Log Stream Explorer</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">JSON-structured entries with levels, services, and key=value fields — filter, search, live-tail.</p>
          </div>
          <button
            onClick={() => setLiveTail(!liveTail)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
              liveTail ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600" : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
            }`}
          >
            {liveTail ? "● LIVE TAIL ON" : "❚❚ LIVE TAIL OFF"}
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by message, service, SKU…"
              className="flex-1 min-w-[160px] px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-sky-400"
            />
            {LOG_LEVELS.map((lv) => {
              const on = activeLevels.includes(lv);
              return (
                <button
                  key={lv}
                  onClick={() => toggleLevel(lv)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                    on ? levelChipColor(lv) : "text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-50"
                  }`}
                >
                  {lv} <span className="opacity-60">{countLevel(lv)}</span>
                </button>
              );
            })}
            <button
              onClick={() => setLogLines([])}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:border-rose-300 transition-colors"
            >
              ✕ Clear
            </button>
          </div>

          <div className="rounded-xl bg-[#0b1526] border border-slate-700 overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/60 bg-[#0e2238]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-2 text-xs font-mono text-slate-300 dark:text-slate-400 font-bold">loki / cluster-aggregate</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{filteredLogs.length} of {logLines.length} lines</span>
            </div>
            <div className="p-4 space-y-0.5 h-[320px] overflow-y-auto font-mono text-[11px] leading-5">
              {filteredLogs.length === 0 ? (
                <div className="text-slate-600 dark:text-slate-300 text-center py-12 text-xs">
                  no lines match the current filters — {liveTail ? "waiting for new entries…" : "tail is paused"}
                </div>
              ) : (
                filteredLogs.map((l, i) => (
                  <div key={`${l.ts}-${i}`} className="flex gap-3 whitespace-nowrap hover:bg-white/5 rounded px-1 transition-colors">
                    <span className="shrink-0 text-slate-500 dark:text-slate-400">{l.ts}</span>
                    <span className={`shrink-0 w-14 font-bold ${levelColor(l.level)}`}>{l.level.padEnd(5)}</span>
                    <span className="shrink-0 text-cyan-300/90 w-28">{l.service}</span>
                    <span className={l.level === "ERROR" ? "text-rose-200" : l.level === "WARN" ? "text-amber-200/90" : "text-slate-300 dark:text-slate-400"}>
                      {l.message} <span className="text-slate-500 dark:text-slate-400">{renderFields(l.fields)}</span>
                    </span>
                  </div>
                ))
              )}
              {liveTail && filteredLogs.length > 0 && (
                <div className="flex items-center gap-1.5 text-emerald-400 dark:text-emerald-300 text-[10px] pt-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> tailing…
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 p-3.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 leading-relaxed">
            <span className="font-bold text-cyan-700 dark:text-cyan-300">STRUCTURED LOGGING:</span> names + levels only — search by field (e.g.{" "}
            <span className="text-slate-700 dark:text-slate-200">order_id="ord-10*"</span>), correlate to traces via trace_id, and keep INFO for operational context while WARN/ERROR feed the alert path.
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      <section id="alerts" className="scroll-mt-24 space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl hover:border-amber-300 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Module 5 • Alert Rules</div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Prometheus Alert Configurator</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Author a rule against live simulated values, evaluate it repeatedly, and export the YAML for your cluster.</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold border ${
                alertState === "INACTIVE" || alertState === "DISABLED"
                  ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600"
                  : alertState === "PENDING"
                    ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-600"
                    : "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-600"
              }`}
            >
              STATE: {alertState}
            </span>
            <button
              onClick={() => setAlertEnabled(!alertEnabled)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                alertEnabled ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600" : "bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700"
              }`}
            >
              {alertEnabled ? "RULE ENABLED" : "RULE DISABLED"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Rule editor */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 card-shadow p-4">
              <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 mb-3">1 · Metric & Condition</div>
              <div className="flex flex-col gap-2">
                <select
                  value={alertMetric}
                  onChange={(e) => changeAlertMetric(e.target.value as AlertMetricKey)}
                  className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-sky-400"
                >
                  {ALERT_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {ALERT_METRICS[k].label}
                    </option>
                  ))}
                </select>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 p-2.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 break-all">
                  <span className="text-sky-600 dark:text-sky-400 font-bold">expr</span> {alertDef.expr}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={alertOperator}
                    onChange={(e) => setAlertOperator(e.target.value as ">" | ">=" | "<" | "<=")}
                    className="px-2 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-sky-400"
                  >
                    <option value=">">&gt;</option>
                    <option value=">=">&gt;=</option>
                    <option value="<">&lt;</option>
                    <option value="<=">&lt;=</option>
                  </select>
                  <input
                    type="number"
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(Number(e.target.value))}
                    className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-sky-400"
                  />
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 w-8">{alertDef.unit}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">for</span>
                  <div className="flex rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 px-1 py-1">
                    {FOR_OPTIONS.map((f) => (
                      <button
                        key={f}
                        onClick={() => setAlertFor(f)}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                          alertFor === f ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 card-shadow p-4">
              <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 mb-3">2 · Labels & Severity</div>
              <div className="flex flex-col gap-2">
                <div className="flex rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 px-1 py-1 w-fit">
                  {(["critical", "warning", "info"] as const).map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setAlertSeverity(sev)}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                        alertSeverity === sev
                          ? sev === "critical"
                            ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
                            : sev === "warning"
                              ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                              : "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
                <label className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">labels (key=value, one per line)</label>
                <textarea
                  value={alertLabels}
                  onChange={(e) => setAlertLabels(e.target.value)}
                  rows={3}
                  className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-sky-400 resize-none"
                />
              </div>
            </div>

            <button
              onClick={evaluateRule}
              className="w-full py-2.5 rounded-xl text-xs font-mono font-bold border transition-all bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-600 hover:bg-amber-100"
            >
              ⟳ Evaluate rule ({evalCount}/2 cycles to FIRE)
            </button>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-3.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 leading-relaxed">
              <span className="font-bold text-amber-600 dark:text-amber-400">STATES:</span> value {alertValue}
              {alertDef.unit} {alertOperator} {alertThreshold} →{" "}
              {alertBreached ? (
                <span className="text-rose-600 dark:text-rose-400 font-bold">breached</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">within budget</span>
              )}
              . <span className="text-slate-700 dark:text-slate-200">for: {alertFor}</span> means the condition must persist through evaluations before FIRING.
            </div>
          </div>

          {/* Live value + generated YAML */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 card-shadow p-4">
              <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 mb-2">Live value vs threshold — simulated feed</div>
              <div className="flex items-end gap-3">
                <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
                  {alertValue}
                  <span className="text-xs font-mono text-slate-400 dark:text-slate-500 ml-1">{alertDef.unit}</span>
                </div>
                <div
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border ${
                    alertBreached ? "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-600" : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600"
                  }`}
                >
                  {alertBreached ? "◉ BREACHING" : "○ NORMAL"}
                </div>
                <div className="ml-auto flex items-center gap-1.5 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" /> live from module 1 sim
                </div>
              </div>
              <div className="mt-3 h-3 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden relative">
                <div
                  className={`absolute top-0 bottom-0 rounded transition-all duration-700 ${
                    alertBreached ? "bg-gradient-to-r from-rose-400 to-orange-400" : "bg-gradient-to-r from-sky-400 to-blue-400"
                  }`}
                  style={{ width: `${Math.min(100, (alertValue / Math.max(alertDef.gaugeKey === "memory" ? 1024 : 100, alertThreshold)) * 100)}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-800"
                  style={{ left: `${Math.min(100, (alertThreshold / Math.max(alertDef.gaugeKey === "memory" ? 1024 : 100, alertThreshold)) * 100)}%` }}
                  title={`threshold ${alertThreshold}${alertDef.unit}`}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-400 dark:text-slate-500 mt-1">
                <span>0</span>
                <span>threshold {alertThreshold}{alertDef.unit}</span>
                <span>scale max</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Array.from({ length: 3 }, (_, i) => (
                  <span
                    key={i}
                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
                      i < evalCount ? (alertBreached ? "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-600" : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600") : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    eval {i + 1}{i < evalCount ? " ✓" : ""}
                  </span>
                ))}
                <span className="ml-auto text-[9px] font-mono text-slate-400 dark:text-slate-500">
                  {alertState === "PENDING" && `${2 - evalCount} more eval(s) to FIRE`}
                  {alertState === "FIRING" && "⚠ alert route: ops-oncall → slack"}{" "}
                  {alertState === "INACTIVE" && "no alert condition met"}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-[#0b1526] border border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/60 bg-[#0e2238]">
                <span className="text-xs font-mono text-slate-300 dark:text-slate-400 font-bold">prometheus-alerts.yml</span>
                <button
                  onClick={copyRule}
                  className="px-2.5 py-1 rounded bg-white/10 border border-white/15 text-[10px] font-mono text-slate-300 dark:text-slate-400 hover:bg-white/20 transition-colors"
                >
                  {copiedRule ? "✓ copied" : "Copy"}
                </button>
              </div>
              <pre className="p-4 text-[10px] font-mono text-amber-200 overflow-x-auto leading-relaxed">{generatedRuleYaml}</pre>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 font-mono">
              <span className="font-bold text-amber-600 dark:text-amber-400">ALERTING:</span>
              <span>expr is a PromQL boolean — true = breach ·</span>
              <span>for= prevents flapping ·</span>
              <span>labels route → receiver (severity, team) ·</span>
              <span>annotations are the human-readable message.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      <section id="slo" className="scroll-mt-24 space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl hover:border-emerald-300 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Module 6 • SLI / SLO</div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Error Budget Calculator</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Turn SLIs (good / total) into an SLO, then track how much of the error budget has been consumed.</p>
          </div>
          <div className="flex rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 px-1 py-1">
            {(["availability", "latency"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSloType(t)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                  sloType === t ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {t === "availability" ? "Availability" : "Latency p95"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Inputs */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 card-shadow p-4 space-y-3">
              <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">Window & Target</div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 w-24">window (days)</span>
                <input
                  type="number"
                  value={sloWindowDays}
                  onChange={(e) => setSloWindowDays(Math.max(1, Math.min(365, Number(e.target.value))))}
                  className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-400"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SLO_TARGETS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSloTarget(t)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-colors ${
                      sloTarget === t ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600 font-bold" : "text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-300"
                    }`}
                  >
                    {t}%
                  </button>
                ))}
              </div>

              {sloType === "availability" ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 w-[120px]">good requests</span>
                    <input
                      type="number"
                      value={sloTotal}
                      onChange={(e) => setSloTotal(Math.max(0, Number(e.target.value)))}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 w-[120px]">bad (5xx / timeouts)</span>
                    <input
                      type="number"
                      value={sloBad}
                      onChange={(e) => setSloBad(Math.max(0, Number(e.target.value)))}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-400"
                    />
                  </div>
                  <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    SLI = successful requests / total requests — counts "good" events over the window.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 w-[120px]">measured p95 (ms)</span>
                    <input
                      type="number"
                      value={sloLatencyMs}
                      onChange={(e) => setSloLatencyMs(Math.max(0, Number(e.target.value)))}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 w-[120px]">budget (ms)</span>
                    <input
                      type="number"
                      value={sloLatencyBudgetMs}
                      onChange={(e) => setSloLatencyBudgetMs(Math.max(1, Number(e.target.value)))}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-400"
                    />
                  </div>
                  <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    SLI = histogram_quantile(0.95, rate(...[5m])) — the budget is the SLO for that percentile.
                  </p>
                </>
              )}
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 p-3.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 leading-relaxed">
              <span className="font-bold text-emerald-700 dark:text-emerald-300">DEFINITIONS:</span> <span className="text-slate-700 dark:text-slate-200">SLI</span> = the measured indicator ·
              <span className="text-slate-700 dark:text-slate-200"> SLO</span> = the agreed target · <span className="text-slate-700 dark:text-slate-200">error budget</span> = 100% − SLO target, the seconds of
              allowed failure each month.
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {sloType === "availability"
                ? [
                    ["Availability (SLI)", `${slo.availability?.toFixed(4)}%`, "text-slate-900"],
                    ["Error budget", `${(100 - sloTarget).toFixed(2)}%`, "text-emerald-600"],
                    ["Bad events allowed", `${slo.allowedBad.toLocaleString()}`, "text-sky-600"],
                    ["Remaining budget", `${slo.remainingBad.toLocaleString()} events`, "text-emerald-600"],
                  ].map(([k, v, c]) => (
                    <div key={k} className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{k}</div>
                      <div className={`text-xl font-extrabold mt-1 font-mono ${c}`}>{v}</div>
                    </div>
                  ))
                : [
                    { key: "Measured p95", v: `${sloLatencyMs}ms`, c: sloLatencyMs <= sloLatencyBudgetMs ? "text-emerald-600" : "text-rose-600" },
                    { key: "Latency budget", v: `${sloLatencyBudgetMs}ms`, c: "text-sky-600" },
                    { key: "Consumed", v: `${slo.consumedPct.toFixed(1)}%`, c: slo.consumedPct > 85 ? "text-rose-600" : "text-slate-900" },
                    { key: "Remaining", v: `${slo.remainingPct.toFixed(1)}%`, c: "text-emerald-600" },
                  ].map((m) => (
                    <div key={m.key} className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{m.key}</div>
                      <div className={`text-xl font-extrabold mt-1 font-mono ${m.c}`}>{m.v}</div>
                    </div>
                  ))}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 card-shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">Error budget consumption</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                    slo.status === "COMPLIANT" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600" : "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-600"
                  }`}
                >
                  {slo.status}
                </span>
              </div>
              <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden relative">
                <div
                  className={`h-full rounded transition-all duration-700 ${
                    slo.consumedPct > 85 ? "bg-gradient-to-r from-rose-400 to-orange-400" : slo.consumedPct > 55 ? "bg-gradient-to-r from-amber-300 to-orange-300" : "bg-gradient-to-r from-emerald-400 to-sky-400"
                  }`}
                  style={{ width: `${slo.consumedPct}%` }}
                />
                <div className="absolute top-0 bottom-0 left-[85%] w-px bg-slate-800/40" title="fast-burn threshold" />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-400 dark:text-slate-500 mt-1">
                <span>0%</span>
                <span>85% fast-burn guardrail</span>
                <span>100%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {sloType === "availability" ? (
                <>
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Good traffic</div>
                    <div className="text-xl font-extrabold mt-1 font-mono text-slate-900 dark:text-slate-100">
                      {slo.availability === null ? "0" : slo.availability.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Burn rate (multiplier)</div>
                    <div className="text-xl font-extrabold mt-1 font-mono text-sky-600 dark:text-sky-400">
                      {sloType === "availability" ? (slo.consumedPct / 100).toFixed(2) : "—"}×
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Projected exhaustion</div>
                    <div className="text-xl font-extrabold mt-1 font-mono text-slate-900 dark:text-slate-100">
                      {slo.burnRate > 0 ? `${Math.max(0, Math.round(sloWindowDays / slo.burnRate))}d` : "—"}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Budget left</div>
                    <div className="text-xl font-extrabold mt-1 font-mono text-emerald-600 dark:text-emerald-400">{slo.remainingPct.toFixed(1)}%</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Headroom</div>
                    <div className="text-xl font-extrabold mt-1 font-mono text-slate-900 dark:text-slate-100">
                      {Math.max(0, sloLatencyBudgetMs - sloLatencyMs)}ms
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Percentile result</div>
                    <div className="text-xl font-extrabold mt-1 font-mono text-sky-600 dark:text-sky-400">
                      {sloLatencyMs <= sloLatencyBudgetMs ? "OK" : "BREACH"}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Fast-burn page</div>
                    <div className="text-xl font-extrabold mt-1 font-mono text-slate-900 dark:text-slate-100">
                      {slo.consumedPct > 85 ? "YES" : "no"}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Budget left</div>
                    <div className="text-xl font-extrabold mt-1 font-mono text-emerald-600 dark:text-emerald-400">{slo.remainingPct.toFixed(1)}%</div>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 font-mono">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">MULTI-WINDOW:</span>
              <span>burn rate = consumed / elapsed window ·</span>
              <span>1× burn = steady state ·</span>
              <span>14.4× = page (fast burn) ·</span>
              <span>multi-window alerts (1h + 5m) catch both slow leaks and spikes.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* Summary strip */}
      <div className="rounded-2xl bg-slate-900 text-slate-300 dark:text-slate-400 p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <h2 className="text-xl font-extrabold text-white">Observability Loop Cheat Sheet</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-left">
            {[
              { t: "METER", d: "Expose /metrics via client libraries; watch label cardinality; scrape on a fixed interval; store with a retention policy.", c: "text-sky-400" },
              { t: "VISUALIZE", d: "Grafana panels over PromQL; variables + provisioning keep dashboards reproducible; alert from inside the same panels.", c: "text-blue-400" },
              { t: "TRACE", d: "Correlate one request across services with traceparent. Waterfalls expose latency ownership; sample 1–10% head/tail.", c: "text-cyan-400" },
              { t: "LOG", d: "JSON lines with level, service, and fields. Filter by level and search by field; wire ERROR streams into alert paths.", c: "text-emerald-400" },
              { t: "ALERT", d: "expr boolean + for duration → labels → receivers. Put threshold with slack; PENDING vs FIRING is hysteresis.", c: "text-amber-400" },
              { t: "SLO", d: "SLI = good/total. Error budget = 100% − target. Multi-window burn alerts page before the budget is gone.", c: "text-rose-400" },
            ].map((k) => (
              <div key={k.t} className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className={`text-sm font-extrabold font-mono ${k.c}`}>{k.t}</div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 leading-relaxed">{k.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}