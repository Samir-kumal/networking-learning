"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// ============================================================
// Types & Constants
// ============================================================

type MetricKind = "resource" | "custom" | "external";
type ResourceName = "cpu" | "memory";
type TargetType = "averageUtilization" | "averageValue";
type VpaMode = "Off" | "Initial" | "Auto" | "Recreate";
type ScenarioKey = "workday" | "spike" | "sawtooth" | "chaotic";
type SimStatus = "Stable" | "Scaling Up" | "Scaling Down" | "Capped";

interface BehaviorConfig {
  upWindow: number;
  upPct: number;
  upPods: number;
  upPeriod: number;
  upSelect: "Max" | "Min";
  downWindow: number;
  downPct: number;
  downPods: number;
  downPeriod: number;
  downSelect: "Max" | "Min" | "Disabled";
}

interface SimSample {
  t: number; // simulated seconds
  load: number; // demand in metric units (mCPU / Mi / RPS)
  desired: number; // raw formula output
  replicas: number; // applied replica count
  status: SimStatus;
}

interface SimEvent {
  t: number;
  from: number;
  to: number;
  reason: string;
}

interface VpaWorkload {
  id: string;
  name: string;
  curCpuM: number;
  curMemMi: number;
  obsCpuM: number;
  obsMemMi: number;
  note: string;
}

const CLAMP = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Simulation timings: 1 tick = 20 simulated seconds
const SIM_TICK_SECONDS = 20;
const SIM_MAX_TICKS = 300;
const CHART_MAX_SAMPLES = 120;

// Per-pod resource requests used by the simulator when in resource mode
const POD_CPU_REQUEST_M = 500; // millicores
const POD_MEM_REQUEST_MI = 512;

const VPA_WORKLOADS: VpaWorkload[] = [
  {
    id: "web",
    name: "web-api (stateless HTTP)",
    curCpuM: 500,
    curMemMi: 512,
    obsCpuM: 318,
    obsMemMi: 542,
    note: "Bursty p90 CPU, memory steadily climbing — classic VPA candidate.",
  },
  {
    id: "batch",
    name: "report-worker (batch)",
    curCpuM: 1000,
    curMemMi: 2048,
    obsCpuM: 486,
    obsMemMi: 1290,
    note: "Requests inflated vs steady 45% CPU usage. ~50% headroom reclaimable.",
  },
  {
    id: "cache",
    name: "session-cache (stateful)",
    curCpuM: 250,
    curMemMi: 384,
    obsCpuM: 412,
    obsMemMi: 690,
    note: "Running hot — requests below observed usage. VPA would raise requests.",
  },
];

const SCENARIOS: { key: ScenarioKey; label: string; desc: string }[] = [
  { key: "workday", label: "Workday Rhythm", desc: "Quiet night → busy day, gentle noise." },
  { key: "spike", label: "Traffic Spike", desc: "Sudden sharp surge, then slow decay." },
  { key: "sawtooth", label: "Sawtooth Load", desc: "Continuous ramp up / rapid drop." },
  { key: "chaotic", label: "Chaotic Bursts", desc: "Random bursts — tests stabilization." },
];

// Seeded PRNG so each Reset replays the exact same traffic storm
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const scenarioLoadAt = (key: ScenarioKey, tick: number, rnd: () => number): number => {
  const t = tick * SIM_TICK_SECONDS;
  switch (key) {
    case "workday":
      return 120 + 1300 * Math.abs(Math.sin((Math.PI * t) / 4800)) + 180 * Math.sin(t / 140) + rnd() * 120;
    case "spike":
      return 130 + 4100 * Math.exp(-Math.pow((t - 900) / 460, 2)) + rnd() * 60;
    case "sawtooth":
      return 160 + ((t % 1200) / 1200) * 2100;
    case "chaotic": {
      const burst = Math.floor(t / 900) % 2 === 0 ? 1 : 0.25;
      return 130 + 2400 * burst * rnd() * rnd() * 4;
    }
  }
};

const fmtCpu = (m: number) => (m >= 1000 ? `${Number((m / 1000).toFixed(2))}` : `${m}m`);
const fmtMemMi = (mi: number) => (mi >= 1024 ? `${Number((mi / 1024).toFixed(1))}Gi` : `${mi}Mi`);

// ============================================================
// YAML Builders (pure)
// ============================================================

const behaviorPolicyLines = (dir: "up" | "down", b: BehaviorConfig): string => {
  if (dir === "up") {
    return `      stabilizationWindowSeconds: ${b.upWindow}
      selectPolicy: ${b.upSelect}
      policies:
        - type: Percent
          value: ${b.upPct}
          periodSeconds: ${b.upPeriod}
        - type: Pods
          value: ${b.upPods}
          periodSeconds: ${b.upPeriod}`;
  }
  if (b.downSelect === "Disabled") {
    return `      stabilizationWindowSeconds: ${b.downWindow}
      selectPolicy: Disabled
      policies: []`;
  }
  return `      stabilizationWindowSeconds: ${b.downWindow}
      selectPolicy: ${b.downSelect}
      policies:
        - type: Percent
          value: ${b.downPct}
          periodSeconds: ${b.downPeriod}
        - type: Pods
          value: ${b.downPods}
          periodSeconds: ${b.downPeriod}`;
};

const buildBehaviorYaml = (b: BehaviorConfig): string =>
  `  behavior:
    scaleUp:
${behaviorPolicyLines("up", b)}
    scaleDown:
${behaviorPolicyLines("down", b)}`;

const buildMetricYaml = (kind: MetricKind, name: ResourceName, targetType: TargetType, targetValue: number): string => {
  const utilizationLine = targetType === "averageUtilization" ? `\n          averageUtilization: ${Math.round(targetValue)}` : "";
  if (kind === "resource") {
    return `  metrics:
    - type: Resource
      resource:
        name: ${name}
        target:
          type: ${targetType === "averageUtilization" ? "Utilization" : "AverageValue"}${utilizationLine}`;
  }
  if (kind === "custom") {
    return `  metrics:
    - type: Object
      object:
        describedObject:
          apiVersion: networking.k8s.io/v1
          kind: Ingress
          name: web-api-ingress
        metric:
          name: requests_per_second
        target:
          type: AverageValue
          averageValue: ${Math.round(targetValue)}`;
  }
  return `  metrics:
    - type: External
      external:
        metric:
          name: http_requests_per_second
          selector:
            matchLabels:
              service: web-api
        target:
          type: Value
          value: ${Math.round(targetValue)}`;
};

const buildHpaYaml = (args: {
  kind: MetricKind;
  name: ResourceName;
  targetType: TargetType;
  targetValue: number;
  minReplicas: number;
  maxReplicas: number;
  behavior: BehaviorConfig;
}): string => {
  const { kind, name, targetType, targetValue, minReplicas, maxReplicas, behavior } = args;
  return `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-api
  minReplicas: ${minReplicas}
  maxReplicas: ${maxReplicas}
${buildMetricYaml(kind, name, targetType, targetValue)}
${buildBehaviorYaml(behavior)}`;
};

const buildVpaYaml = (mode: VpaMode, w: VpaWorkload): string => `apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: ${w.id}-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${w.name.split(" (")[0]}
  updatePolicy:
    updateMode: "${mode}"
  resourcePolicy:
    containerPolicies:
      - containerName: "*"
        minAllowed:
          cpu: 50m
          memory: 64Mi
        maxAllowed:
          cpu: "2"
          memory: 4Gi
        controlledResources: ["cpu", "memory"]`;

const vpaCpuTarget = (w: VpaWorkload) => Math.round(w.obsCpuM * 1.08);
const vpaMemTarget = (w: VpaWorkload) => Math.round(w.obsMemMi * 1.05);

// ============================================================
// Small UI atoms
// ============================================================

function NumberField(props: { label: string; unit: string; value: number; onChange: (v: number) => void; step?: number; min?: number }) {
  const { label, unit, value, onChange, step = 1, min = 1 } = props;
  return (
    <label className="block">
      <span className="block text-xs font-mono text-slate-500 dark:text-slate-400 uppercase mb-2">
        {label} <span className="text-slate-400 dark:text-slate-500 normal-case">({unit})</span>
      </span>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || min)}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
      />
    </label>
  );
}

type Accent = "sky" | "amber" | "emerald" | "rose" | "slate" | "blue";

const ACCENT_STYLES: Record<Accent, string> = {
  sky: "bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-700 text-sky-900 dark:text-sky-200",
  blue: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-900 dark:text-blue-200",
  amber: "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200",
  emerald: "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200",
  rose: "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-300",
  slate: "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200",
};

function ResultTile({ label, value, accent, tiny = false }: { label: string; value: string; accent: Accent; tiny?: boolean }) {
  return (
    <div className={`p-3 rounded-xl border ${ACCENT_STYLES[accent]}`}>
      <div className="text-[10px] font-mono uppercase tracking-wider opacity-75">{label}</div>
      <div className={`${tiny ? "text-xs" : "text-2xl"} font-bold font-mono mt-1 leading-tight ${tiny ? "" : "truncate"}`}>{value}</div>
    </div>
  );
}

function StatChip({ label, value, accent, small = false }: { label: string; value: string; accent: Accent; small?: boolean }) {
  return (
    <div className={`rounded-lg border ${ACCENT_STYLES[accent]} px-2.5 py-2 min-w-0`}>
      <div className="text-[9px] font-mono uppercase tracking-wider opacity-75 truncate">{label}</div>
      <div className={`${small ? "text-xs" : "text-lg"} font-bold font-mono truncate`}>{value}</div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function DkHpaVpaSection() {
  // ---------- MODULE 1: HPA Metric Configurator ----------
  const [metricKind, setMetricKind] = useState<MetricKind>("resource");
  const [resourceName, setResourceName] = useState<ResourceName>("cpu");
  const [targetType, setTargetType] = useState<TargetType>("averageUtilization");
  const [targetValue, setTargetValue] = useState(70);
  const [minReplicas, setMinReplicas] = useState(2);
  const [maxReplicas, setMaxReplicas] = useState(10);
  const [copiedHpa, setCopiedHpa] = useState(false);

  // ---------- MODULE 2: Scale-Up / Down Behavior Editor ----------
  const [behavior, setBehavior] = useState<BehaviorConfig>({
    upWindow: 0,
    upPct: 100,
    upPods: 4,
    upPeriod: 15,
    upSelect: "Max",
    downWindow: 300,
    downPct: 100,
    downPods: 2,
    downPeriod: 15,
    downSelect: "Max",
  });
  const [copiedBehavior, setCopiedBehavior] = useState(false);
  const setBh = (patch: Partial<BehaviorConfig>) => setBehavior((prev) => ({ ...prev, ...patch }));

  // ---------- MODULE 3: Target Utilization Calculator ----------
  const [calcMode, setCalcMode] = useState<"resource" | "custom">("resource");
  const [calcTarget, setCalcTarget] = useState(70);
  const [calcRequest, setCalcRequest] = useState(500);
  const [calcCurrent, setCalcCurrent] = useState(84);
  const [calcReplicas, setCalcReplicas] = useState(3);

  // ---------- MODULE 4: VPA Recommendation Viewer ----------
  const [vpaWorkloadId, setVpaWorkloadId] = useState("web");
  const [vpaMode, setVpaMode] = useState<VpaMode>("Auto");
  const [vpaApplied, setVpaApplied] = useState(false);
  const [showVpaYaml, setShowVpaYaml] = useState(false);

  // ---------- MODULE 5: Autoscaling Simulator ----------
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>("spike");
  const [running, setRunning] = useState(false);
  const [speedMs, setSpeedMs] = useState(700);
  const [samples, setSamples] = useState<SimSample[]>([]);
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [stats, setStats] = useState({ up: 0, down: 0, peak: 0 });

  const tickRef = useRef(0);
  const samplesRef = useRef<SimSample[]>([]);
  const rawDesiredRef = useRef<number[]>([]);
  const scenarioRef = useRef<ScenarioKey>("spike");
  scenarioRef.current = scenarioKey;

  const effectiveMin = Math.min(minReplicas, maxReplicas);
  const effectiveMax = maxReplicas;

  // ---------- Derived YAML ----------
  const hpaYaml = useMemo(
    () =>
      buildHpaYaml({
        kind: metricKind,
        name: resourceName,
        targetType,
        targetValue,
        minReplicas: effectiveMin,
        maxReplicas: effectiveMax,
        behavior,
      }),
    [metricKind, resourceName, targetType, targetValue, effectiveMin, effectiveMax, behavior]
  );

  const behaviorYaml = useMemo(() => buildBehaviorYaml(behavior), [behavior]);

  const targetLabel =
    metricKind === "resource"
      ? targetType === "averageUtilization"
        ? `${Math.round(targetValue)}%`
        : `${Math.round(targetValue)}${resourceName === "cpu" ? "m" : "Mi"}`
      : `${Math.round(targetValue)} req/s`;

  const metricUnit =
    metricKind === "resource" ? (resourceName === "cpu" ? "mCPU" : "MiB") : "QPS";

  // ---------- Module 3 derived ----------
  const calcResult = useMemo(() => {
    if (calcMode === "custom") {
      const desired = Math.max(1, Math.ceil((calcReplicas * calcCurrent) / calcTarget));
      return { utilizationPct: null, desired, formula: `${calcReplicas} × ${calcCurrent} ÷ ${calcTarget}` };
    }
    const utilizationPct = (calcCurrent / calcRequest) * 100;
    const desired = Math.max(1, Math.ceil((calcReplicas * utilizationPct) / calcTarget));
    return { utilizationPct, desired, formula: `${calcReplicas} × ${utilizationPct.toFixed(0)}% ÷ ${calcTarget}%` };
  }, [calcMode, calcCurrent, calcRequest, calcReplicas, calcTarget]);

  // ---------- Module 4 derived ----------
  const vpaWorkload = VPA_WORKLOADS.find((w) => w.id === vpaWorkloadId) ?? VPA_WORKLOADS[0];

  const vpaRec = useMemo(() => {
    const cpuTarget = vpaCpuTarget(vpaWorkload);
    const memTarget = vpaMemTarget(vpaWorkload);
    return {
      cpu: { target: cpuTarget, lower: Math.round(cpuTarget * 0.78), upper: Math.round(cpuTarget * 1.55), uncapped: Math.round(vpaWorkload.obsCpuM * 1.15) },
      mem: { target: memTarget, lower: Math.round(memTarget * 0.85), upper: Math.round(memTarget * 1.6), uncapped: Math.round(vpaWorkload.obsMemMi * 1.12) },
      cpuDeltaPct: Math.round(((vpaWorkload.curCpuM - cpuTarget) / vpaWorkload.curCpuM) * 100),
      memDeltaPct: Math.round(((vpaWorkload.curMemMi - memTarget) / vpaWorkload.curMemMi) * 100),
    };
  }, [vpaWorkloadId]);

  const shownCpu = vpaApplied ? vpaRec.cpu.target : vpaWorkload.curCpuM;
  const shownMem = vpaApplied ? vpaRec.mem.target : vpaWorkload.curMemMi;

  const vpaYaml = useMemo(() => buildVpaYaml(vpaMode, vpaWorkload), [vpaMode, vpaWorkloadId]);

  // ---------- Module 5: simulator loop ----------
  const resetSim = () => {
    tickRef.current = 0;
    samplesRef.current = [];
    rawDesiredRef.current = [];
    setSamples([]);
    setEvents([]);
    setStats({ up: 0, down: 0, peak: 0 });
    setRunning(false);
  };

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const tk = tickRef.current;
      if (tk >= SIM_MAX_TICKS) {
        setRunning(false);
        return;
      }
      const rnd = mulberry32(1000 + tk);
      const load = scenarioLoadAt(scenarioRef.current, tk, rnd);
      tickRef.current = tk + 1;

      // Per-pod target: resource → targetUtilization × request; custom/external → averageValue
      const requestPerPod = resourceName === "cpu" ? POD_CPU_REQUEST_M : POD_MEM_REQUEST_MI;
      const targetPerPod = metricKind === "resource" ? (targetValue / 100) * requestPerPod : targetValue;
      const rawDesired = Math.max(effectiveMin, Math.ceil(load / Math.max(1, targetPerPod)));

      rawDesiredRef.current = [...rawDesiredRef.current, rawDesired];

      const current = samplesRef.current.length > 0 ? samplesRef.current[samplesRef.current.length - 1].replicas : effectiveMin;
      let candidate = rawDesired;

      // Stabilization windows: scale-up takes the max in-window demand, scale-down the min
      const upWindowTicks = Math.max(1, Math.ceil(behavior.upWindow / SIM_TICK_SECONDS));
      const downWindowTicks = Math.max(1, Math.ceil(behavior.downWindow / SIM_TICK_SECONDS));
      if (candidate > current) {
        candidate = Math.max(candidate, ...rawDesiredRef.current.slice(-upWindowTicks));
      } else {
        candidate = Math.min(candidate, ...rawDesiredRef.current.slice(-downWindowTicks));
      }

      // 10% tolerance damps trivial changes (HPA default)
      if (candidate < current && candidate >= current * 0.9) candidate = current;

      // Behavior policy caps per-event movement (Percent ∪/∩ Pods per selectPolicy)
      const upCap =
        behavior.upSelect === "Max" ? Math.max((behavior.upPct / 100) * current, behavior.upPods) : Math.min((behavior.upPct / 100) * current, behavior.upPods);
      const downCap =
        behavior.downSelect === "Disabled"
          ? 0
          : behavior.downSelect === "Max"
          ? Math.max((behavior.downPct / 100) * current, behavior.downPods)
          : Math.min((behavior.downPct / 100) * current, behavior.downPods);
      candidate = CLAMP(candidate, current - downCap, current + upCap);
      candidate = CLAMP(candidate, effectiveMin, effectiveMax);

      const status: SimStatus =
        candidate > current ? "Scaling Up" : candidate < current ? "Scaling Down" : rawDesired > current && current >= effectiveMax ? "Capped" : "Stable";

      if (candidate !== current) {
        const reason =
          candidate > current
            ? `load ${load.toFixed(0)}${metricUnit} → needs ${rawDesired} × target ${targetLabel}`
            : `load ${load.toFixed(0)}${metricUnit} well below target ${targetLabel}`;
        setEvents((prev) => [...prev.slice(-24), { t: tk * SIM_TICK_SECONDS, from: current, to: candidate, reason }]);
      }

      samplesRef.current = [...samplesRef.current.slice(-(CHART_MAX_SAMPLES - 1)), { t: tk * SIM_TICK_SECONDS, load, desired: rawDesired, replicas: candidate, status }];
      setSamples(samplesRef.current);
      setStats((prev) => ({
        up: prev.up + (candidate > current ? 1 : 0),
        down: prev.down + (candidate < current ? 1 : 0),
        peak: Math.max(prev.peak, candidate),
      }));
    }, speedMs);
    return () => clearInterval(id);
  }, [running, speedMs, behavior, metricKind, resourceName, targetValue, effectiveMin, effectiveMax, metricUnit, targetLabel]);

  const lastSample = samples.length > 0 ? samples[samples.length - 1] : null;

  // ---------- Chart geometry ----------
  const chart = useMemo(() => {
    if (samples.length < 2) return null;
    const W = 760;
    const H = 240;
    const PAD = { l: 46, r: 16, t: 16, b: 28 };
    const n = samples.length;
    const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / (n - 1);
    const maxR = Math.max(effectiveMax, ...samples.map((s) => s.replicas)) + 1;
    const maxLoad = Math.max(100, ...samples.map((s) => s.load)) * 1.08;
    const y = (v: number, max: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);

    const replicaLine = samples.map((s, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(s.replicas, maxR).toFixed(1)}`).join(" ");
    const loadLine = samples.map((s, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(s.load, maxLoad).toFixed(1)}`).join(" ");
    const gridYs = [0, 1, 2, 3].map((g) => PAD.t + (g / 4) * (H - PAD.t - PAD.b));

    return { W, H, PAD, n, x, y, maxR, maxLoad, replicaLine, loadLine, gridYs };
  }, [samples, effectiveMax]);

  // ---------- Replica timeline geometry ----------
  const timeline = useMemo(() => {
    const visible = samples.slice(-48);
    const cap = Math.min(12, Math.max(4, effectiveMax));
    return { visible, cap };
  }, [samples, effectiveMax]);

  return (
    <section id="hpa-vpa" className="scroll-mt-24 space-y-8 bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 rounded-2xl p-6 sm:p-8 card-shadow">
      {/* ======================= HEADER ======================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-sky-100 dark:border-sky-700 pb-5">
        <div>
          <div className="text-xs font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-500 inline-block"></span> Module 5 • Kubernetes Workload Autoscaling
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">HPA & VPA Autoscaling Control Room</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure metrics, tune scale behaviors, then watch replica decisions play out live</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 text-sky-700 dark:text-sky-300">autoscaling/v2</span>
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300">autoscaling.k8s.io/v1</span>
        </div>
      </div>

      {/* ======================= MODULE 1: HPA METRIC CONFIGURATOR ======================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 card-shadow overflow-hidden">
          <div className="px-5 py-3 border-b border-sky-100 dark:border-sky-700 bg-gradient-to-r from-sky-50 to-blue-50/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">📈</span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">HPA Metric Configurator</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Pick the signal the controller watches</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300">HorizontalPodAutoscaler</span>
          </div>

          <div className="p-5 space-y-5">
            {/* Metric source */}
            <div>
              <span className="block text-xs font-mono text-slate-500 dark:text-slate-400 uppercase mb-2">Metric Source</span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { key: "resource", label: "Resource", desc: "cpu / memory" },
                    { key: "custom", label: "Object / Custom", desc: "ingress QPS" },
                    { key: "external", label: "External", desc: "Prometheus" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMetricKind(m.key)}
                    className={`px-2 py-2 rounded-lg border text-left transition-all ${
                      metricKind === m.key ? "bg-sky-50 dark:bg-sky-900/30 border-sky-300 dark:border-sky-600 ring-1 ring-sky-500" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-sky-300"
                    }`}
                  >
                    <div className={`text-[11px] font-bold ${metricKind === m.key ? "text-sky-700 dark:text-sky-300" : "text-slate-900 dark:text-slate-100"}`}>{m.label}</div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Resource picker + target type */}
            {metricKind === "resource" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs font-mono text-slate-500 dark:text-slate-400 uppercase mb-2">Resource</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(["cpu", "memory"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setResourceName(r)}
                        className={`px-3 py-2 rounded-lg border text-xs font-mono transition-all ${
                          resourceName === r ? "bg-sky-500 text-white border-sky-500" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-300"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-mono text-slate-500 dark:text-slate-400 uppercase mb-2">Target Type</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { key: "averageUtilization", label: "Utilization" },
                        { key: "averageValue", label: "Avg Value" },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setTargetType(t.key)}
                        className={`px-3 py-2 rounded-lg border text-xs font-mono transition-all ${
                          targetType === t.key ? "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-600" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-300"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Target value slider */}
            <div>
              <span className="block text-xs font-mono text-slate-500 dark:text-slate-400 uppercase mb-2">
                Target {metricKind === "resource" && targetType === "averageUtilization" ? "Utilization (of pod request)" : "Average Value"}
                {metricKind === "external" && <span className="text-slate-400 dark:text-slate-500 normal-case ml-1">— total, not per-pod</span>}
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={10}
                  max={metricKind === "resource" && targetType === "averageUtilization" ? 95 : 1000}
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  className="flex-1 accent-sky-500"
                />
                <div className="min-w-[84px] text-right">
                  <span className="text-lg font-bold font-mono text-sky-700 dark:text-sky-300">
                    {metricKind === "resource" && targetType === "averageUtilization"
                      ? `${Math.round(targetValue)}%`
                      : Math.round(targetValue)}
                  </span>
                  {metricKind === "resource" && targetType === "averageValue" && (
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 ml-0.5">{resourceName === "cpu" ? "m" : "Mi"}</span>
                  )}
                  {metricKind !== "resource" && <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 ml-0.5">/s</span>}
                </div>
              </div>
              <div className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                desiredReplicas = ceil( currentReplicas × currentMetric ÷ targetMetric )
              </div>
            </div>

            {/* Replica bounds */}
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Min Replicas"
                unit="pods"
                value={effectiveMin}
                min={1}
                onChange={(v) => setMinReplicas(CLAMP(v, 1, Math.max(2, effectiveMax)))}
              />
              <NumberField label="Max Replicas" unit="pods" value={effectiveMax} min={2} onChange={(v) => setMaxReplicas(CLAMP(v, 2, 60))} />
            </div>

            {/* kubectl view */}
            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 font-mono text-[11px] text-sky-900 dark:text-sky-200 leading-relaxed overflow-x-auto">
              <span className="text-sky-700 dark:text-sky-300 font-bold">$ kubectl get hpa web-api -w</span>
              <br />
              NAME&nbsp;&nbsp;&nbsp;&nbsp;REFERENCE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;TARGETS&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;MIN&nbsp;&nbsp;MAX&nbsp;&nbsp;REPLICAS
              <br />
              <span className="font-bold text-slate-900 dark:text-slate-100">web-api</span>&nbsp;&nbsp;Deployment/web-api&nbsp;&nbsp;
              <span className="text-sky-700 dark:text-sky-300 font-bold">{targetLabel}</span>&nbsp;&nbsp;{effectiveMin}&nbsp;&nbsp;&nbsp;{effectiveMax}&nbsp;&nbsp;&nbsp;{effectiveMin}
            </div>
          </div>
        </div>

        {/* Live YAML */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 overflow-hidden flex flex-col min-h-[420px]">
          <div className="flex items-center justify-between px-5 py-3 border-b border-sky-100 dark:border-sky-700 bg-gradient-to-r from-blue-50 to-sky-50/40">
            <span className="text-xs font-mono text-slate-900 dark:text-slate-100 font-bold">hpa.yaml — autoscaling/v2</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(hpaYaml);
                setCopiedHpa(true);
                setTimeout(() => setCopiedHpa(false), 2000);
              }}
              className="px-3 py-1 rounded bg-white dark:bg-slate-800 hover:bg-sky-50 border border-sky-200 dark:border-sky-700 text-xs font-mono text-slate-900 dark:text-slate-100 transition-colors"
            >
              {copiedHpa ? <span className="text-emerald-600 dark:text-emerald-400">✓ Copied!</span> : <span>📋 Copy YAML</span>}
            </button>
          </div>
          <div className="p-4 font-mono text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 overflow-x-auto flex-1 whitespace-pre leading-relaxed">{hpaYaml}</div>
        </div>
      </div>

      {/* ======================= MODULE 2: SCALE BEHAVIOR EDITOR ======================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 space-y-4">
          <div className="flex items-center justify-between border-b border-sky-100 dark:border-sky-700 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🎚️</span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Scale-Up / Scale-Down Behavior Editor</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Stabilization windows + per-event rate policies</p>
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(behaviorYaml);
                setCopiedBehavior(true);
                setTimeout(() => setCopiedBehavior(false), 2000);
              }}
              className="px-3 py-1 rounded bg-slate-50 dark:bg-slate-700 hover:bg-sky-50 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 transition-colors"
            >
              {copiedBehavior ? <span className="text-emerald-600 dark:text-emerald-400">✓</span> : <span>📋</span>}
            </button>
          </div>

          {/* Scale-up panel */}
          <div className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-700 bg-sky-50/40 dark:bg-sky-900/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-sky-700 dark:text-sky-300">▲ Scale-Up</span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">window {behavior.upWindow}s · select {behavior.upSelect}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="block">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Stabilization (s)</span>
                <input type="number" min={0} max={900} step={15} value={behavior.upWindow}
                  onChange={(e) => setBh({ upWindow: Math.max(0, Number(e.target.value) || 0) })}
                  className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:border-sky-400" />
              </label>
              <label className="block">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Max % per event</span>
                <input type="number" min={10} max={500} step={10} value={behavior.upPct}
                  onChange={(e) => setBh({ upPct: Math.max(10, Number(e.target.value) || 10) })}
                  className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:border-sky-400" />
              </label>
              <label className="block">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Max pods / event</span>
                <input type="number" min={1} max={20} value={behavior.upPods}
                  onChange={(e) => setBh({ upPods: Math.max(1, Number(e.target.value) || 1) })}
                  className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:border-sky-400" />
              </label>
              <label className="block">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Period (s)</span>
                <input type="number" min={5} max={120} step={5} value={behavior.upPeriod}
                  onChange={(e) => setBh({ upPeriod: Math.max(5, Number(e.target.value) || 5) })}
                  className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:border-sky-400" />
              </label>
            </div>
            {(["Max", "Min"] as const).map((sel) => (
              <button
                key={sel}
                onClick={() => setBh({ upSelect: sel })}
                className={`mr-2 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                  behavior.upSelect === sel ? "bg-sky-500 text-white border-sky-500" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-300"
                }`}
              >
                {sel}
              </button>
            ))}
            <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">Max = most aggressive policy wins (fastest growth)</span>
          </div>

          {/* Scale-down panel */}
          <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-900/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300">▼ Scale-Down</span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">window {behavior.downWindow}s · {behavior.downSelect === "Disabled" ? "DISABLED" : `selectPolicy ${behavior.downSelect}`}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="block">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Stabilization (s)</span>
                <input type="number" min={0} max={1800} step={30} value={behavior.downWindow}
                  onChange={(e) => setBh({ downWindow: Math.max(0, Number(e.target.value) || 0) })}
                  className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:border-amber-400" />
              </label>
              <label className="block">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Max % per event</span>
                <input type="number" min={1} max={100} step={5} value={behavior.downPct}
                  onChange={(e) => setBh({ downPct: Math.max(1, Number(e.target.value) || 1) })}
                  className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:border-amber-400" />
              </label>
              <label className="block">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Max pods / event</span>
                <input type="number" min={1} max={20} value={behavior.downPods}
                  onChange={(e) => setBh({ downPods: Math.max(1, Number(e.target.value) || 1) })}
                  className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:border-amber-400" />
              </label>
              <label className="block">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Period (s)</span>
                <input type="number" min={5} max={120} step={5} value={behavior.downPeriod}
                  onChange={(e) => setBh({ downPeriod: Math.max(5, Number(e.target.value) || 5) })}
                  className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:border-amber-400" />
              </label>
            </div>
            {(["Max", "Min", "Disabled"] as const).map((sel) => (
              <button
                key={sel}
                onClick={() => setBh({ downSelect: sel })}
                className={`mr-2 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                  behavior.downSelect === sel
                    ? sel === "Disabled"
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-amber-500 text-white border-amber-500"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-300"
                }`}
              >
                {sel}
              </button>
            ))}
            <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">Disabled = never shrink pods</span>
          </div>

          <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            <span className="font-bold text-slate-900 dark:text-slate-100">Pro tip:</span> keep scale-down slower than scale-up — a 300s down window absorbs
            traffic dips that would otherwise trigger ping-pong scaling.
          </div>
        </div>

        {/* Behavior YAML */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 overflow-hidden flex flex-col min-h-[320px]">
          <div className="flex items-center justify-between px-5 py-3 border-b border-sky-100 dark:border-sky-700 bg-gradient-to-r from-amber-50 to-sky-50/40">
            <span className="text-xs font-mono text-slate-900 dark:text-slate-100 font-bold">behavior block</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100/60 text-amber-700 dark:text-amber-300">scaleDown.selectPolicy: {behavior.downSelect}</span>
          </div>
          <div className="p-4 font-mono text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 overflow-x-auto flex-1 whitespace-pre leading-relaxed">{behaviorYaml}</div>
        </div>
      </div>

      {/* ======================= MODULE 3: TARGET UTILIZATION CALCULATOR ======================= */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-100 dark:border-sky-700 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🧮</span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Target Utilization → Required Replicas Calculator</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">ceil( replicas × observed ÷ target ) — the math HPA runs every reconcile loop</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCalcMode("resource")}
              className={`px-3 py-1 rounded-lg text-xs font-mono border transition-all ${
                calcMode === "resource" ? "bg-sky-100 dark:bg-sky-900/40 border-sky-300 dark:border-sky-600 text-sky-700 dark:text-sky-300 font-bold" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
              }`}
            >
              CPU / MEM
            </button>
            <button
              onClick={() => setCalcMode("custom")}
              className={`px-3 py-1 rounded-lg text-xs font-mono border transition-all ${
                calcMode === "custom" ? "bg-sky-100 dark:bg-sky-900/40 border-sky-300 dark:border-sky-600 text-sky-700 dark:text-sky-300 font-bold" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
              }`}
            >
              Custom QPS
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-4 items-end">
          {calcMode === "resource" ? (
            <>
              <NumberField label="Pod CPU request" unit="mCPU" value={calcRequest} step={25} onChange={(v) => setCalcRequest(Math.max(10, v))} />
              <NumberField label="Observed utilization" unit="%" value={calcCurrent} step={1} onChange={(v) => setCalcCurrent(Math.max(1, v))} />
              <NumberField label="Current replicas" unit="pods" value={calcReplicas} onChange={(v) => setCalcReplicas(Math.max(1, v))} />
              <div className="md:col-span-1 xl:col-span-2">
                <span className="block text-xs font-mono text-slate-500 dark:text-slate-400 uppercase mb-2">Target Utilization</span>
                <div className="flex items-center gap-2 pt-1.5">
                  <input
                    type="range"
                    min={10}
                    max={95}
                    value={calcTarget}
                    onChange={(e) => setCalcTarget(Number(e.target.value))}
                    className="flex-1 accent-sky-500"
                  />
                  <span className="text-sm font-mono text-sky-800 dark:text-sky-200 min-w-[40px] text-right">{calcTarget}%</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <NumberField label="Current avg per pod" unit="req/s" value={calcCurrent} step={5} onChange={(v) => setCalcCurrent(Math.max(1, v))} />
              <NumberField label="Target avg per pod" unit="req/s" value={calcTarget} step={5} onChange={(v) => setCalcTarget(Math.max(1, v))} />
              <NumberField label="Current replicas" unit="pods" value={calcReplicas} onChange={(v) => setCalcReplicas(Math.max(1, v))} />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {calcMode === "resource" && calcResult.utilizationPct !== null && (
            <ResultTile
              label="Observed utilization"
              value={`${calcResult.utilizationPct.toFixed(0)}%`}
              accent={calcResult.utilizationPct > 100 ? "rose" : calcResult.utilizationPct > calcTarget ? "amber" : "emerald"}
            />
          )}
          <ResultTile label="Required replicas" value={`${calcResult.desired}`} accent={calcResult.desired > calcReplicas ? "rose" : calcResult.desired < calcReplicas ? "amber" : "emerald"} />
          <ResultTile label="Math applied" value={calcResult.formula} accent="slate" tiny />
          <ResultTile
            label="Action"
            value={calcResult.desired > calcReplicas ? `scale +${calcResult.desired - calcReplicas}` : calcResult.desired < calcReplicas ? `scale ${calcResult.desired - calcReplicas}` : "no change"}
            accent={calcResult.desired !== calcReplicas ? "sky" : "slate"}
          />
        </div>

        <div className="mt-4 p-3 rounded-xl bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 text-[11px] text-slate-600 dark:text-slate-300 font-mono leading-relaxed">
          <span className="text-sky-700 dark:text-sky-300 font-bold">example:</span> {calcReplicas} pods currently at{" "}
          {calcMode === "resource" ? `${calcResult.utilizationPct?.toFixed(0)}%` : `${calcCurrent} req/s avg`} vs target{" "}
          {calcMode === "resource" ? `${calcTarget}%` : `${calcTarget} req/s`} → desired {calcResult.desired} replicas. HPA clamps this to
          [min, max] before acting and tolerates ±10% drift.
        </div>
      </div>

      {/* ======================= MODULE 4: VPA RECOMMENDATION VIEWER ======================= */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-blue-100 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-sky-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base">📊</span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Vertical Pod Autoscaler — Recommendation Viewer</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">VPA mines history (histograms) and emits request bounds, not just a target</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Mode:</span>
            <select
              value={vpaMode}
              onChange={(e) => setVpaMode(e.target.value as VpaMode)}
              className="px-2.5 py-1.5 rounded-lg border border-sky-200 dark:border-sky-700 bg-white dark:bg-slate-800 text-xs font-mono text-sky-800 dark:text-sky-200 focus:outline-none focus:border-sky-400"
            >
              {(["Off", "Initial", "Auto", "Recreate"] as VpaMode[]).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Workload profiles */}
          <div className="space-y-3">
            <span className="block text-xs font-mono text-slate-500 dark:text-slate-400 uppercase">Workload Profiles</span>
            {VPA_WORKLOADS.map((w) => (
              <button
                key={w.id}
                onClick={() => setVpaWorkloadId(w.id)}
                className={`w-full p-3.5 rounded-xl border text-left transition-all ${
                  vpaWorkload.id === w.id ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 ring-1 ring-blue-400" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{w.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">{w.id}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{w.note}</p>
              </button>
            ))}

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
              <span className="font-bold">⚠ VPA × HPA conflict:</span> never run VPA in <span className="font-mono">Auto</span> on the same
              resource metric HPA watches — they fight over requests. Use VPA on memory + HPA on CPU, or set VPA to{" "}
              <span className="font-mono">Off</span>.
            </div>
          </div>

          {/* Recommendation table + bars */}
          <div className="lg:col-span-2 space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-sky-50 dark:bg-sky-900/30 text-sky-900 dark:text-sky-200 font-mono text-left">
                    <th className="px-3 py-2.5 font-bold">Metric</th>
                    <th className="px-3 py-2.5 font-bold">Current</th>
                    <th className="px-3 py-2.5 font-bold">Observed</th>
                    <th className="px-3 py-2.5 font-bold">Lower</th>
                    <th className="px-3 py-2.5 font-bold bg-sky-100 dark:bg-sky-900/40">Recommended</th>
                    <th className="px-3 py-2.5 font-bold">Uncapped</th>
                    <th className="px-3 py-2.5 font-bold">Upper</th>
                    <th className="px-3 py-2.5 font-bold">Δ vs current</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-slate-700 dark:text-slate-200">
                  <tr className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-slate-100">cpu</td>
                    <td className="px-3 py-2.5">{fmtCpu(shownCpu)}</td>
                    <td className="px-3 py-2.5">{fmtCpu(vpaWorkload.obsCpuM)}</td>
                    <td className="px-3 py-2.5">{fmtCpu(vpaRec.cpu.lower)}</td>
                    <td className="px-3 py-2.5 bg-sky-100 dark:bg-sky-900/40 font-bold text-sky-900 dark:text-sky-200">{fmtCpu(vpaRec.cpu.target)}</td>
                    <td className="px-3 py-2.5">{fmtCpu(vpaRec.cpu.uncapped)}</td>
                    <td className="px-3 py-2.5">{fmtCpu(vpaRec.cpu.upper)}</td>
                    <td className={`px-3 py-2.5 ${vpaRec.cpuDeltaPct > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {vpaRec.cpuDeltaPct > 0 ? `−${vpaRec.cpuDeltaPct}%` : `+${-vpaRec.cpuDeltaPct}%`}
                    </td>
                  </tr>
                  <tr className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-slate-100">memory</td>
                    <td className="px-3 py-2.5">{fmtMemMi(shownMem)}</td>
                    <td className="px-3 py-2.5">{fmtMemMi(vpaWorkload.obsMemMi)}</td>
                    <td className="px-3 py-2.5">{fmtMemMi(vpaRec.mem.lower)}</td>
                    <td className="px-3 py-2.5 bg-sky-100 dark:bg-sky-900/40 font-bold text-sky-900 dark:text-sky-200">{fmtMemMi(vpaRec.mem.target)}</td>
                    <td className="px-3 py-2.5">{fmtMemMi(vpaRec.mem.uncapped)}</td>
                    <td className="px-3 py-2.5">{fmtMemMi(vpaRec.mem.upper)}</td>
                    <td className={`px-3 py-2.5 ${vpaRec.memDeltaPct > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {vpaRec.memDeltaPct > 0 ? `−${vpaRec.memDeltaPct}%` : `+${-vpaRec.memDeltaPct}%`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-3">
              {(
                [
                  { label: "CPU", current: shownCpu, target: vpaRec.cpu.target, upper: vpaRec.cpu.upper, unit: fmtCpu },
                  { label: "Memory", current: shownMem, target: vpaRec.mem.target, upper: vpaRec.mem.upper, unit: fmtMemMi },
                ] as const
              ).map((row) => {
                const scale = Math.max(row.upper, row.current) * 1.1;
                return (
                  <div key={row.label}>
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1">
                      <span>{row.label} — current vs recommended vs upper bound</span>
                      <span>{row.unit(row.target)} recommended</span>
                    </div>
                    <div className="relative h-6 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
                      <div
                        className="absolute inset-y-0 left-0 rounded-lg bg-sky-500/20"
                        style={{ width: `${(row.current / scale) * 100}%` }}
                        title={`current ${row.unit(row.current)}`}
                      />
                      <div
                        className="absolute inset-y-1.5 rounded bg-sky-600"
                        style={{ left: `${(row.target / scale) * 100}%`, width: 4, transform: "translateX(-2px)" }}
                        title={`recommended ${row.unit(row.target)}`}
                      />
                      <div
                        className="absolute inset-y-0 rounded bg-blue-400/60"
                        style={{ left: `${(row.upper / scale) * 100}%`, width: 2 }}
                        title={`upper ${row.unit(row.upper)}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setVpaApplied(true)}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 dark:hover:bg-sky-600 text-white text-xs font-mono transition-colors"
              >
                Apply Recommendation
              </button>
              <button
                onClick={() => setVpaApplied(false)}
                className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-sky-400 text-slate-700 dark:text-slate-200 text-xs font-mono transition-colors"
              >
                Revert
              </button>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {vpaApplied ? "recommendation applied ✓" : "showing original requests"}
              </span>
              {vpaMode === "Auto" && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                  Auto mode restarts pods to apply
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed overflow-x-auto">
              <span className="text-blue-700 dark:text-blue-300 font-bold">$ kubectl describe vpa {vpaWorkload.id}-vpa</span>
              <br />
              Status: <span className="text-emerald-600 dark:text-emerald-400">Running</span> · target: {vpaWorkload.name.split(" (")[0]}
              <br />
              Recommendation: cpu {fmtCpu(vpaRec.cpu.target)} ({fmtCpu(vpaRec.cpu.lower)}–{fmtCpu(vpaRec.cpu.upper)}) · memory{" "}
              {fmtMemMi(vpaRec.mem.target)} ({fmtMemMi(vpaRec.mem.lower)}–{fmtMemMi(vpaRec.mem.upper)})
            </div>

            <button
              onClick={() => setShowVpaYaml((v) => !v)}
              className="text-[11px] font-mono text-blue-700 dark:text-blue-300 hover:text-blue-800 underline underline-offset-2"
            >
              {showVpaYaml ? "▾ hide" : "▸ show"} vpa.yaml manifest
            </button>
            {showVpaYaml && (
              <div className="rounded-xl border border-blue-200 dark:border-blue-700 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-blue-100 dark:border-blue-700 bg-blue-50/50">
                  <span className="text-xs font-mono text-slate-900 dark:text-slate-100 font-bold">vpa.yaml — autoscaling.k8s.io/v1</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(vpaYaml);
                    }}
                    className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 hover:bg-blue-50 border border-blue-200 dark:border-blue-700 text-[10px] font-mono text-slate-900 dark:text-slate-100 transition-colors"
                  >
                    📋 Copy
                  </button>
                </div>
                <div className="p-4 font-mono text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 overflow-x-auto whitespace-pre leading-relaxed">{vpaYaml}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================= MODULE 5: AUTOSCALING SIMULATOR ======================= */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-sky-100 dark:border-sky-700 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base">⚙️</span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Autoscaling Simulator — Live Replica Decisions</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Drives the configured metric through HPA math: formula → stabilization → policy → min/max bounds</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => (running ? setRunning(false) : setRunning(true))}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-colors ${
                running ? "bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 text-slate-700 dark:text-slate-200" : "bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white"
              }`}
            >
              {running ? "⏸ Pause" : "▶ Simulate"}
            </button>
            <button
              onClick={resetSim}
              className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-sky-400 text-slate-700 dark:text-slate-200 text-xs font-mono transition-colors"
            >
              ⟲ Reset
            </button>
            <select
              value={scenarioKey}
              onChange={(e) => {
                setScenarioKey(e.target.value as ScenarioKey);
                resetSim();
              }}
              className="px-2.5 py-1.5 rounded-lg border border-sky-200 dark:border-sky-700 bg-white dark:bg-slate-800 text-xs font-mono text-sky-800 dark:text-sky-200 focus:outline-none focus:border-sky-400"
            >
              {SCENARIOS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
            <select
              value={speedMs}
              onChange={(e) => setSpeedMs(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value={1000}>⅔× slow</option>
              <option value={700}>1× normal</option>
              <option value={350}>2× fast</option>
            </select>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-2 mb-4">
          <StatChip label="Replicas" value={lastSample ? `${lastSample.replicas}` : "—"} accent="sky" />
          <StatChip label={`Load (${metricUnit})`} value={lastSample ? lastSample.load.toFixed(0) : "—"} accent="amber" />
          <StatChip label="Status" value={lastSample?.status ?? "idle"} small accent={lastSample?.status === "Scaling Up" ? "rose" : lastSample?.status === "Capped" ? "blue" : "emerald"} />
          <StatChip label="▲ scale-ups" value={`${stats.up}`} accent="sky" />
          <StatChip label="▼ scale-downs" value={`${stats.down}`} accent="amber" />
          <StatChip label="Peak replicas" value={stats.peak ? `${stats.peak}` : "—"} accent="slate" />
          <StatChip label="Target" value={targetLabel} small accent="slate" />
          <StatChip label="Bounds" value={`${effectiveMin}–${effectiveMax}`} small accent="slate" />
        </div>

        {/* Load graph */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-3">
          <div className="min-w-[620px]">
            {chart ? (
              <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full h-auto" role="img" aria-label="Replica count and metric demand over time">
                <defs>
                  <linearGradient id="loadFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {chart.gridYs.map((gy, i) => (
                  <g key={i}>
                    <line x1={chart.PAD.l} x2={chart.W - chart.PAD.r} y1={gy} y2={gy} stroke="#e2e8f0" strokeWidth="1" />
                    <text x={chart.PAD.l - 6} y={gy + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">
                      {Math.round((chart.maxR / 4) * (4 - i))}
                    </text>
                  </g>
                ))}

                {/* max ceiling */}
                <line
                  x1={chart.PAD.l}
                  x2={chart.W - chart.PAD.r}
                  y1={chart.y(effectiveMax, chart.maxR)}
                  y2={chart.y(effectiveMax, chart.maxR)}
                  stroke="#3b82f6"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                  opacity="0.7"
                />
                <text x={chart.W - chart.PAD.r - 2} y={chart.y(effectiveMax, chart.maxR) - 4} textAnchor="end" fontSize="9" fill="#3b82f6" fontFamily="monospace">
                  max={effectiveMax}
                </text>

                {/* demand area + line */}
                <path
                  d={`${chart.loadLine} L${chart.x(chart.n - 1)},${chart.H - chart.PAD.b} L${chart.x(0)},${chart.H - chart.PAD.b} Z`}
                  fill="url(#loadFill)"
                />
                <path d={chart.loadLine} fill="none" stroke="#f59e0b" strokeWidth="1.6" opacity="0.8" />

                {/* replica step line + points */}
                <path d={chart.replicaLine} fill="none" stroke="#0284c7" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
                {samples.map((s, i) => (
                  <circle key={i} cx={chart.x(i)} cy={chart.y(s.replicas, chart.maxR)} r="2.2" fill="#0ea5e9">
                    <title>{`t=${(s.t / 60).toFixed(1)}m · replicas ${s.replicas} · load ${s.load.toFixed(0)}${metricUnit} · ${s.status}`}</title>
                  </circle>
                ))}

                {/* x labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((f) => {
                  const idx = Math.round(f * (chart.n - 1));
                  return (
                    <text key={f} x={chart.x(idx)} y={chart.H - 8} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="monospace">
                      {(samples[idx].t / 60).toFixed(0)}m
                    </text>
                  );
                })}
              </svg>
            ) : (
              <div className="py-16 text-center">
                <div className="text-3xl mb-2">📉</div>
                <p className="text-xs font-mono text-slate-400 dark:text-slate-500">
                  Press <span className="text-sky-600 dark:text-sky-400 font-bold">▶ Simulate</span> to watch the HPA compute replicas against the {SCENARIOS.find((s) => s.key === scenarioKey)?.label.toLowerCase()} scenario
                </p>
              </div>
            )}
            <div className="flex items-center gap-4 px-1 pt-2 text-[10px] font-mono text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#0284c7] inline-block"></span> replica count</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-500 inline-block"></span> target metric demand ({metricUnit})</span>
              <span className="flex items-center gap-1.5"><span className="w-3 border-t border-dashed border-blue-600 inline-block"></span> maxReplicas ceiling</span>
            </div>
          </div>
        </div>

        {/* Replica count visualization over time */}
        <div className="mt-4 rounded-xl border border-sky-100 dark:border-sky-700 bg-sky-50/40 p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <span className="text-xs font-mono text-slate-700 dark:text-slate-200 font-bold">REPLICA COUNT VISUALIZATION — LAST {timeline.visible.length} TICKS</span>
            <span className="text-[10px] font-mono text-sky-700 dark:text-sky-300">
              {lastSample ? `${lastSample.replicas} pods · desired ${lastSample.desired} · [${effectiveMin}–${effectiveMax}]` : "idle"}
            </span>
          </div>
          {timeline.visible.length === 0 ? (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">No samples yet — start the simulation.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {timeline.visible.map((s, i) => (
                <div key={i} className="flex flex-col-reverse items-center gap-0.5">
                  <span className="text-[8px] font-mono text-slate-400 dark:text-slate-500 leading-none">{(s.t / 60).toFixed(0)}</span>
                  <div className="flex flex-col-reverse gap-px" title={`t=${(s.t / 60).toFixed(1)}m · ${s.replicas} pods (desired ${s.desired})`}>
                    {Array.from({ length: Math.max(1, Math.min(s.replicas, timeline.cap)) }).map((_, j) => (
                      <div
                        key={j}
                        className="w-2.5 h-2.5 rounded-[2px]"
                        style={{ background: j < Math.min(s.desired, timeline.cap) ? "#0ea5e9" : "#7dd3fc" }}
                      />
                    ))}
                    {s.replicas > timeline.cap && (
                      <span className="text-[8px] font-mono text-sky-600 dark:text-sky-400 text-center leading-none">+{s.replicas - timeline.cap}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Event log */}
        <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-900 p-4 font-mono text-[11px] leading-relaxed">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-300 dark:text-slate-400 font-bold">SCALING EVENT LOG</span>
            <span className="text-slate-500 dark:text-slate-400">{events.length} events</span>
          </div>
          {events.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">— waiting for the first scale event —</p>
          ) : (
            <div className="space-y-1">
              {events.slice(-10).map((ev, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-slate-600 dark:text-slate-300 w-14 shrink-0">t+{(ev.t / 60).toFixed(0)}m</span>
                  <span className={ev.to > ev.from ? "text-sky-400 dark:text-sky-300" : "text-amber-400 dark:text-amber-300"}>
                    {ev.to > ev.from ? "▲ SCALE UP" : "▼ SCALE DOWN"} {ev.from} → {ev.to}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 truncate">{ev.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ======================= BEST PRACTICES ======================= */}
      <div className="p-5 rounded-xl bg-gradient-to-br from-sky-50 via-white to-blue-50/50 border border-sky-200 dark:border-sky-700">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">✅ Autoscaling Best Practices</h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
          <li className="flex gap-2"><span className="text-sky-600 dark:text-sky-400">▸</span> Start with <b>CPU utilization</b> (~70–80%), add custom metrics (QPS, queue depth) only once they stabilize.</li>
          <li className="flex gap-2"><span className="text-sky-600 dark:text-sky-400">▸</span> Set <b>minReplicas ≥ 2</b> for HA — the floor keeps serving even at zero load.</li>
          <li className="flex gap-2"><span className="text-sky-600 dark:text-sky-400">▸</span> Scale down gently: <b>stabilizationWindowSeconds ≥ 300s</b> prevents flapping on dips.</li>
          <li className="flex gap-2"><span className="text-sky-600 dark:text-sky-400">▸</span> HPA scales on <b>per-pod averages</b>; per-pod skew is handled by VPA instead.</li>
          <li className="flex gap-2"><span className="text-sky-600 dark:text-sky-400">▸</span> VPA on <b>memory</b> + HPA on <b>CPU</b> is battle-tested; avoid both on the same metric in Auto mode.</li>
          <li className="flex gap-2"><span className="text-sky-600 dark:text-sky-400">▸</span> After VPA changes requests, HPA&apos;s utilization denominator changes — re-check targets.</li>
        </ul>
      </div>
    </section>
  );
}