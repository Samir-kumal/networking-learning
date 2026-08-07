"use client";

import { useMemo, useState } from "react";

// ============================================================================
// Kubernetes Resource Quotas & Limits — Interactive Learning Modules
// ============================================================================

// --- Utility Formatters -----------------------------------------------------

const fmtNum = (v: number): string => (Number.isFinite(v) ? `${Math.round(v * 100) / 100}` : "—");

const fmtCpuM = (milli: number): string => {
  if (!Number.isFinite(milli)) return "—";
  if (milli >= 1000) {
    const cores = milli / 1000;
    return cores % 1 === 0 ? `${cores}` : `${cores.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}`;
  }
  return `${milli}m`;
};

const fmtMemMi = (mi: number): string => {
  if (!Number.isFinite(mi)) return "—";
  if (mi >= 1024) {
    const gi = mi / 1024;
    return gi % 1 === 0 ? `${gi}Gi` : `${gi.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}Gi`;
  }
  return `${mi}Mi`;
};

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** Human-readable CPU quantity: "250m" below 1 core, "1.5c" at/above 1 core. */
const cpuDisplay = (m: number): string => (m < 1000 ? `${m}m` : `${fmtCpuM(m)}c`);

type Tone = "ok" | "warn" | "danger";

interface Notice {
  tone: "error" | "warn";
  text: string;
}

// ---------- Small reusable UI pieces ----------------------------------------

function SliderRow(props: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  valueText: string;
  hint?: string;
}) {
  const { label, value, onChange, min, max, step = 1, valueText, hint } = props;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm text-slate-600 font-medium">{label}</label>
        <span className="text-xs font-mono text-sky-700 bg-sky-50 border border-sky-200 rounded px-2 py-0.5 font-bold">
          {valueText}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value), min, max))}
        className="w-full accent-[#58a6ff]"
      />
      {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

function ToggleRow(props: { label: string; checked: boolean; onChange: (v: boolean) => void; suffix?: string }) {
  const { label, checked, onChange, suffix } = props;
  return (
    <label className="flex items-center justify-between gap-3 py-1 cursor-pointer group">
      <span className="text-sm text-slate-600 group-hover:text-slate-900 font-medium">
        {label}
        {suffix ? <span className="ml-1.5 text-[11px] font-mono text-slate-400">{suffix}</span> : null}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 rounded accent-[#58a6ff]" />
    </label>
  );
}

function QosField(props: {
  label: string;
  setting: ResourceSetting;
  unit: "m" | "Mi";
  onReqSet: (v: boolean) => void;
  onReqVal: (v: number) => void;
  onLimSet: (v: boolean) => void;
  onLimVal: (v: number) => void;
}) {
  const { label, setting, unit, onReqSet, onReqVal, onLimSet, onLimVal } = props;
  const maxVal = unit === "m" ? 16384 : 262144;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">{label}</div>
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <input type="checkbox" checked={setting.reqSet} onChange={(e) => onReqSet(e.target.checked)} className="w-3 h-3 accent-[#58a6ff]" />
          req
        </label>
        <input
          type="number"
          value={setting.req}
          min={0}
          max={maxVal}
          disabled={!setting.reqSet}
          onChange={(e) => onReqVal(clamp(Number(e.target.value) || 0, 0, maxVal))}
          className="w-20 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono text-slate-900 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <input type="checkbox" checked={setting.limSet} onChange={(e) => onLimSet(e.target.checked)} className="w-3 h-3 accent-[#58a6ff]" />
          lim
        </label>
        <input
          type="number"
          value={setting.lim}
          min={0}
          max={maxVal}
          disabled={!setting.limSet}
          onChange={(e) => onLimVal(clamp(Number(e.target.value) || 0, 0, maxVal))}
          className="w-20 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono text-slate-900 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </div>
    </div>
  );
}

function NumInput(props: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  const { label, value, onChange, min, max } = props;
  return (
    <label className="block">
      <span className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(clamp(Number(e.target.value) || 0, min, max))}
        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
      />
    </label>
  );
}

function Stat(props: { label: string; value: string; tone?: Tone }) {
  const { label, value, tone = "ok" } = props;
  const toneCls =
    tone === "ok"
      ? "text-sky-700"
      : tone === "warn"
        ? "text-amber-600"
        : "text-red-600";
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`text-lg font-extrabold font-mono mt-1 ${toneCls}`}>{value}</div>
    </div>
  );
}

function NoticeBlock(props: { notices: Notice[] }) {
  const { notices } = props;
  if (notices.length === 0) return null;
  return (
    <div className="space-y-2">
      {notices.map((n, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 border ${
            n.tone === "error" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          <span className="font-bold">{n.tone === "error" ? "✕" : "⚠"}</span>
          <span>{n.text}</span>
        </div>
      ))}
    </div>
  );
}

function CopyBlock(props: { label: string; code: string }) {
  const { label, code } = props;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable (e.g. non-secure context) — ignore
    }
  };
  return (
    <div className="rounded-xl bg-white border border-slate-200 card-shadow overflow-hidden flex flex-col">
      <div className="flex items-center justify-between bg-white px-4 py-2.5 border-b border-slate-200">
        <span className="text-xs font-mono text-slate-900 font-bold">{label}</span>
        <button
          onClick={copy}
          className={`text-xs font-mono px-2.5 py-1 rounded-md border transition-all ${
            copied
              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
              : "bg-slate-50 text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-700"
          }`}
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 font-mono text-xs text-slate-900 bg-slate-50 overflow-x-auto flex-1 whitespace-pre leading-relaxed max-h-[420px] overflow-y-auto">
        {code}
      </pre>
    </div>
  );
}

function ResourceGauge(props: {
  resource: string;
  request: number; // base unit (m or Mi)
  limit: number; // base unit
  capacity: number; // node capacity in same unit
  unit: "m" | "Mi";
}) {
  const { resource, request, limit, capacity, unit } = props;
  const reqPct = clamp((request / capacity) * 100, 0.5, 100);
  const limPct = clamp((limit / capacity) * 100, 0, 100);
  const overflow = limit > capacity;
  const reqTxt = unit === "m" ? `${fmtCpuM(request)} cores` : fmtMemMi(request);
  const limTxt = unit === "m" ? `${fmtCpuM(limit)} cores` : fmtMemMi(limit);
  const spareTxt = unit === "m" ? `${fmtCpuM(capacity - request)} cores` : fmtMemMi(capacity - request);
  const limFull = unit === "m" ? `${fmtCpuM(limit)} cores` : fmtMemMi(limit);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-slate-500 font-medium">{resource}</span>
        <span className="text-slate-400">
          req <span className="text-sky-700 font-bold">{unit === "m" ? `${fmtCpuM(request)}c` : fmtMemMi(request)}</span>
          {" / "}lim <span className="text-blue-700 font-bold">{unit === "m" ? `${fmtCpuM(limit)}c` : fmtMemMi(limit)}</span>
        </span>
      </div>
      <div className="relative h-4 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
        <div
          className="absolute left-0 top-0 bottom-0 bg-sky-500 transition-all"
          style={{ width: `${reqPct}%` }}
          title={`Request: ${reqTxt}`}
        />
        {limit > request ? (
          <div
            className="absolute top-0 bottom-0 bg-gradient-to-r from-sky-400 to-blue-400 opacity-80 transition-all"
            style={{ width: `${Math.max(0, limPct - reqPct)}%`, left: `${reqPct}%` }}
            title="Limit headroom"
          />
        ) : null}
        {overflow ? <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500" title="Limit exceeds node capacity" /> : null}
      </div>
      <p className="text-[11px] text-slate-400">
        {overflow ? (
          <span className="text-red-500 font-semibold">⚠ Limit {limFull} exceeds node capacity — unschedulable.</span>
        ) : (
          `Spare node headroom: ${unit === "m" ? `${fmtCpuM(capacity - request)} cores` : fmtMemMi(capacity - request)}`
        )}
      </p>
    </div>
  );
}

// ---------- Data ------------------------------------------------------------

const NODE_PRESETS = [
  { id: "t3-large", label: "t3.large", cores: 2, memGi: 8 },
  { id: "m5-xlarge", label: "m5.xlarge", cores: 4, memGi: 16 },
  { id: "m5-2xlarge", label: "m5.2xlarge", cores: 8, memGi: 32 },
  { id: "m5-4xlarge", label: "m5.4xlarge", cores: 16, memGi: 64 },
];

interface ResourceSetting {
  reqSet: boolean;
  req: number;
  limSet: boolean;
  lim: number;
}

interface ContainerSpec {
  name: string;
  cpu: ResourceSetting;
  mem: ResourceSetting;
}

const ALL_UNSET_SPEC = (name: string): ContainerSpec => ({
  name,
  cpu: { reqSet: false, req: 250, limSet: false, lim: 500 },
  mem: { reqSet: false, req: 128, limSet: false, lim: 256 },
});

const DEFAULT_CONTAINER = (name: string): ContainerSpec => ({
  name,
  cpu: { reqSet: true, req: 250, limSet: true, lim: 500 },
  mem: { reqSet: true, req: 256, limSet: true, lim: 512 },
});

type QosClass = "Guaranteed" | "Burstable" | "BestEffort";

const QOS_META: Record<QosClass, { badge: string; dot: string; blurb: string }> = {
  Guaranteed: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    blurb:
      "Every container sets CPU and memory requests equal to its limits. Highest priority: scheduled first, essentially never evicted under node pressure.",
  },
  Burstable: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    blurb:
      "At least one container declares a request or limit, but the Guaranteed criteria are not fully met. Middle tier: can burst, may be evicted when pressure hits.",
  },
  BestEffort: {
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
    blurb:
      "No container sets any requests or limits. Lowest tier: first to be evicted under node pressure and gets no resource guarantees.",
  },
};

// ============================================================================
// Component
// ============================================================================

export default function DkResourceQuotasSection() {
  // ---- MODULE 1: Requests & Limits Calculator -----------------------------
  const [cpuReqM, setCpuReqM] = useState<number>(250);
  const [cpuLimM, setCpuLimM] = useState<number>(500);
  const [memReqMi, setMemReqMi] = useState<number>(512);
  const [memLimMi, setMemLimMi] = useState<number>(1024);
  const [nodeIdx, setNodeIdx] = useState<number>(2);

  const node = NODE_PRESETS[nodeIdx];

  const m1Warnings = useMemo<Notice[]>(() => {
    const out: Notice[] = [];
    const nodeCpuM = node.cores * 1000;
    const nodeMemMi = node.memGi * 1024;

    if (cpuLimM < cpuReqM) out.push({ tone: "error", text: `CPU limit (${fmtCpuM(cpuLimM)}c) is below the request (${fmtCpuM(cpuReqM)}c) — the API server will reject this pod.` });
    if (memLimMi < memReqMi) out.push({ tone: "error", text: `Memory limit (${fmtMemMi(memLimMi)}) is below the request (${fmtMemMi(memReqMi)}) — the API server will reject this pod.` });
    if (cpuReqM > nodeCpuM) out.push({ tone: "error", text: `CPU request ${cpuDisplay(cpuReqM)} exceeds this ${node.cores} vCPU node — pod cannot be scheduled.` });
    else if (memReqMi > nodeMemMi) out.push({ tone: "error", text: `Memory request ${fmtMemMi(memReqMi)} exceeds this ${node.memGi}Gi node — pod cannot be scheduled.` });

    const cpuRatio = cpuReqM > 0 ? cpuLimM / cpuReqM : 1;
    const memRatio = memReqMi > 0 ? memLimMi / memReqMi : 1;

    if (cpuReqM <= nodeCpuM && memReqMi <= nodeMemMi) {
      if (cpuRatio > 4) out.push({ tone: "warn", text: `CPU limit/request ratio is ${fmtNum(cpuRatio)}× — bursts above 4× rarely sustain; consider tightening limits.` });
      if (memRatio > 4) out.push({ tone: "warn", text: `Memory limit/request ratio is ${fmtNum(memRatio)}× — memory is not reclaimable; a huge limit invites OOM kills on the node.` });
      if (cpuReqM < 100) out.push({ tone: "warn", text: "CPU request below 100m is scheduler noise — prefer at least 100m per container." });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpuReqM, cpuLimM, memReqMi, memLimMi, nodeIdx, node]);

  const m1 = useMemo(() => {
    const nodeCpuM = node.cores * 1000;
    const nodeMemMi = node.memGi * 1024;
    const cpuRatio = cpuReqM > 0 ? cpuLimM / cpuReqM : 1;
    const memRatio = memReqMi > 0 ? memLimMi / memReqMi : 1;
    const podsByCpu = cpuReqM > 0 ? Math.floor(nodeCpuM / cpuReqM) : Number.POSITIVE_INFINITY;
    const podsByMem = memReqMi > 0 ? Math.floor(nodeMemMi / memReqMi) : Number.POSITIVE_INFINITY;
    const estPods = Math.min(podsByCpu, podsByMem);
    return {
      cpuRatio,
      memRatio,
      cpuHeadroomM: Math.max(0, cpuLimM - cpuReqM),
      memHeadroomMi: Math.max(0, memLimMi - memReqMi),
      estPods: Number.isFinite(estPods) ? estPods : null,
    };
  }, [cpuReqM, cpuLimM, memReqMi, memLimMi, node]);

  const m1SpecYaml = `resources:
  requests:
    cpu: "${fmtCpuM(cpuReqM)}"
    memory: "${fmtMemMi(memReqMi)}"
  limits:
    cpu: "${fmtCpuM(cpuLimM)}"
    memory: "${fmtMemMi(memLimMi)}"`;

  // ---- MODULE 2: ResourceQuota builder ------------------------------------
  const [quotaName, setQuotaName] = useState("compute-quota");
  const [quotaNs, setQuotaNs] = useState("default");
  const [quotaScope, setQuotaScope] = useState<"Default" | "BestEffort" | "NotBestEffort">("Default");
  const [quotaCpuReqCores, setQuotaCpuReqCores] = useState(2);
  const [quotaCpuLimCores, setQuotaCpuLimCores] = useState(4);
  const [quotaMemReqGi, setQuotaMemReqGi] = useState(4);
  const [quotaMemLimGi, setQuotaMemLimGi] = useState(8);
  const [quotaPods, setQuotaPods] = useState(20);
  const [quotaServices, setQuotaServices] = useState(10);
  const [quotaPvc, setQuotaPvc] = useState(10);
  const [quotaStorageGi, setQuotaStorageGi] = useState(100);
  const [quotaSecrets, setQuotaSecrets] = useState(10);
  const [quotaCm, setQuotaCm] = useState(10);
  const [qEnablePods, setQEnablePods] = useState(true);
  const [qEnableCpuReq, setQEnableCpuReq] = useState(true);
  const [qEnableCpuLim, setQEnableCpuLim] = useState(true);
  const [qEnableMemReq, setQEnableMemReq] = useState(true);
  const [qEnableMemLim, setQEnableMemLim] = useState(true);
  const [qEnablePvc, setQEnablePvc] = useState(false);
  const [qEnableStorage, setQEnableStorage] = useState(false);
  const [qEnableServices, setQEnableServices] = useState(false);
  const [qEnableSecrets, setQEnableSecrets] = useState(false);
  const [qEnableCm, setQEnableCm] = useState(false);

  const quotaYaml = useMemo(() => {
    const out: string[] = [
      "apiVersion: v1",
      "kind: ResourceQuota",
      "metadata:",
      `  name: ${quotaName.trim() || "compute-quota"}`,
      `  namespace: ${quotaNs.trim() || "default"}`,
      "spec:",
    ];
    if (quotaScope !== "Default") {
      out.push("  scopes:");
      out.push(`    - ${quotaScope}`);
    }
    out.push("  hard:");
    const hard: [string, string][] = [];
    if (qEnablePods) hard.push(["pods", `${quotaPods}`]);
    if (qEnableCpuReq) hard.push(["requests.cpu", `"${quotaCpuReqCores}"`]);
    if (qEnableCpuLim) hard.push(["limits.cpu", `"${quotaCpuLimCores}"`]);
    if (qEnableMemReq) hard.push(["requests.memory", `"${quotaMemReqGi}Gi"`]);
    if (qEnableMemLim) hard.push(["limits.memory", `"${quotaMemLimGi}Gi"`]);
    if (qEnablePvc) hard.push(["persistentvolumeclaims", `${quotaPvc}`]);
    if (qEnableStorage) hard.push(["requests.storage", `"${quotaStorageGi}Gi"`]);
    if (qEnableServices) hard.push(["services", `${quotaServices}`]);
    if (qEnableSecrets) hard.push(["secrets", `${quotaSecrets}`]);
    if (qEnableCm) hard.push(["configmaps", `${quotaCm}`]);
    if (hard.length === 0) {
      out.push("  # no resources selected — nothing is constrained");
    } else {
      hard.forEach(([k, v]) => out.push(`    ${k}: ${v}`));
    }
    return out.join("\n");
  }, [
    quotaName, quotaNs, quotaScope,
    quotaPods, quotaCpuReqCores, quotaCpuLimCores, quotaMemReqGi, quotaMemLimGi,
    quotaPvc, quotaStorageGi, quotaServices, quotaSecrets, quotaCm,
    qEnablePods, qEnableCpuReq, qEnableCpuLim, qEnableMemReq, qEnableMemLim,
    qEnablePvc, qEnableStorage, qEnableServices, qEnableSecrets, qEnableCm,
  ]);

  const quotaWarnings = useMemo<Notice[]>(() => {
    const out: Notice[] = [];
    if (qEnableCpuReq && qEnableCpuLim && quotaCpuLimCores < quotaCpuReqCores)
      out.push({ tone: "error", text: "limits.cpu is below requests.cpu — pods whose requests exceed the limit quota can never be created." });
    if (qEnableMemReq && qEnableMemLim && quotaMemLimGi < quotaMemReqGi)
      out.push({ tone: "error", text: "limits.memory is below requests.memory — pods needing more memory than the limit quota are rejected." });
    if (quotaScope === "BestEffort" && (qEnableCpuReq || qEnableCpuLim || qEnableMemReq || qEnableMemLim))
      out.push({ tone: "warn", text: "BestEffort pods never declare requests/limits — the request/limit caps above will never be consumed by them. Use Default or NotBestEffort scope instead." });
    if (qEnablePvc && !qEnableStorage)
      out.push({ tone: "warn", text: "persistentvolumeclaims is capped but requests.storage is not — PVCs may consume unbounded storage." });
    return out;
  }, [qEnableCpuReq, qEnableCpuLim, quotaCpuLimCores, quotaCpuReqCores, qEnableMemReq, qEnableMemLim, quotaMemLimGi, quotaMemReqGi, quotaScope, qEnablePvc, qEnableStorage]);

  // ---- MODULE 3: LimitRange configurator -----------------------------------
  const [lrKind, setLrKind] = useState<"Container" | "PVC">("Container");
  const [lrMinCpuM, setLrMinCpuM] = useState(50);
  const [lrDefReqCpuM, setLrDefReqCpuM] = useState(100);
  const [lrDefCpuM, setLrDefCpuM] = useState(250);
  const [lrMaxCpuM, setLrMaxCpuM] = useState(4000);
  const [lrMinMemMi, setLrMinMemMi] = useState(64);
  const [lrDefReqMemMi, setLrDefReqMemMi] = useState(128);
  const [lrDefMemMi, setLrDefMemMi] = useState(512);
  const [lrMaxMemMi, setLrMaxMemMi] = useState(8192);
  const [lrRatioCpu, setLrRatioCpu] = useState(4);
  const [lrRatioMem, setLrRatioMem] = useState(2);
  const [lrMinStorageGi, setLrMinStorageGi] = useState(1);
  const [lrMaxStorageGi, setLrMaxStorageGi] = useState(100);

  const lrWarnings = useMemo<Notice[]>(() => {
    const out: Notice[] = [];
    if (lrKind === "Container") {
      if (lrDefReqCpuM < lrMinCpuM) out.push({ tone: "error", text: "defaultRequest.cpu is below min.cpu — invalid LimitRange." });
      if (lrDefCpuM < lrDefReqCpuM) out.push({ tone: "error", text: "default.cpu is below defaultRequest.cpu — invalid LimitRange." });
      if (lrMaxCpuM < lrDefCpuM) out.push({ tone: "error", text: "max.cpu is below default.cpu — invalid LimitRange." });
      if (lrMaxCpuM < lrMinCpuM) out.push({ tone: "error", text: "max.cpu must be ≥ min.cpu." });
      if (lrDefReqMemMi < lrMinMemMi) out.push({ tone: "error", text: "defaultRequest.memory is below min.memory — invalid LimitRange." });
      if (lrDefMemMi < lrDefReqMemMi) out.push({ tone: "error", text: "default.memory is below defaultRequest.memory — invalid LimitRange." });
      if (lrMaxMemMi < lrDefMemMi) out.push({ tone: "error", text: "max.memory is below default.memory — invalid LimitRange." });
      if (lrRatioCpu < 1 || lrRatioMem < 1) out.push({ tone: "error", text: "maxLimitRequestRatio must be ≥ 1 for every resource." });
      if (lrRatioCpu > 8) out.push({ tone: "warn", text: "CPU ratio of 8× is aggressive; the scheduler may pack this namespace hard. Consider ≤ 4×." });
    } else {
      if (lrMaxStorageGi < lrMinStorageGi) out.push({ tone: "error", text: "max.storage is below min.storage — invalid LimitRange." });
    }
    return out;
  }, [lrKind, lrDefReqCpuM, lrMinCpuM, lrDefCpuM, lrMaxCpuM, lrDefReqMemMi, lrMinMemMi, lrDefMemMi, lrMaxMemMi, lrRatioCpu, lrRatioMem, lrMaxStorageGi, lrMinStorageGi]);

  const lrYaml = useMemo(() => {
    const out: string[] = [
      "apiVersion: v1",
      "kind: LimitRange",
      "metadata:",
      "  name: " + (lrKind === "Container" ? "container-limits" : "pvc-storage-limits"),
      "  namespace: default",
      "spec:",
      "  limits:",
      "    - max:",
    ];
    if (lrKind === "Container") {
      out.push(`        cpu: "${lrMaxCpuM}m"`);
      out.push(`        memory: "${lrMaxMemMi}Mi"`);
      out.push("      min:");
      out.push(`        cpu: "${lrMinCpuM}m"`);
      out.push(`        memory: "${lrMinMemMi}Mi"`);
      out.push("      default:");
      out.push(`        cpu: "${lrDefCpuM}m"`);
      out.push(`        memory: "${lrDefMemMi}Mi"`);
      out.push("      defaultRequest:");
      out.push(`        cpu: "${lrDefReqCpuM}m"`);
      out.push(`        memory: "${lrDefReqMemMi}Mi"`);
      out.push("      maxLimitRequestRatio:");
      out.push(`        cpu: "${lrRatioCpu}"`);
      out.push(`        memory: "${lrRatioMem}"`);
      out.push("      type: Container");
    } else {
      out.push(`        storage: "${lrMaxStorageGi}Gi"`);
      out.push("      min:");
      out.push(`        storage: "${lrMinStorageGi}Gi"`);
      out.push("      type: PersistentVolumeClaim");
    }
    return out.join("\n");
  }, [lrKind, lrMaxCpuM, lrMaxMemMi, lrMinCpuM, lrMinMemMi, lrDefCpuM, lrDefMemMi, lrDefReqCpuM, lrDefReqMemMi, lrRatioCpu, lrRatioMem, lrMaxStorageGi, lrMinStorageGi]);

  // ---- MODULE 4: QoS class calculator --------------------------------------
  const [containers, setContainers] = useState<ContainerSpec[]>([
    { name: "api-server", cpu: { reqSet: true, req: 250, limSet: true, lim: 500 }, mem: { reqSet: true, req: 256, limSet: true, lim: 512 } },
    { name: "cache", cpu: { reqSet: false, req: 125, limSet: false, lim: 250 }, mem: { reqSet: false, req: 128, limSet: false, lim: 256 } },
  ]);

  const patchContainer = (i: number, key: "cpu" | "mem", patch: Partial<ResourceSetting>, name?: string) =>
    setContainers((prev) =>
      prev.map((c, idx) =>
        idx === i
          ? { ...c, [key]: { ...c[key], ...patch }, name: name !== undefined ? name : c.name }
          : c
      )
    );

  const qos = useMemo<QosClass>(() => {
    const anySet = containers.some((c) => c.cpu.reqSet || c.cpu.limSet || c.mem.reqSet || c.mem.limSet);
    if (!anySet) return "BestEffort";
    const guaranteed = containers.every(
      (c) =>
        c.cpu.reqSet && c.cpu.limSet && c.cpu.req === c.cpu.lim &&
        c.mem.reqSet && c.mem.limSet && c.mem.req === c.mem.lim
    );
    return guaranteed ? "Guaranteed" : "Burstable";
  }, [containers]);

  const qosPodYaml = useMemo(() => {
    const out: string[] = [
      "apiVersion: v1",
      "kind: Pod",
      "metadata:",
      "  name: qos-demo",
      "  namespace: default",
      "spec:",
      "  containers:",
    ];
    containers.forEach((c) => {
      const set = c.cpu.reqSet || c.cpu.limSet || c.mem.reqSet || c.mem.limSet;
      out.push(`    - name: ${c.name}`);
      if (!set) {
        out.push("      # no requests/limits — contributes to BestEffort");
        return;
      }
      out.push("      resources:");
      out.push("        requests:");
      if (c.cpu.reqSet) out.push(`          cpu: "${fmtCpuM(c.cpu.req)}"`);
      if (c.mem.reqSet) out.push(`          memory: "${fmtMemMi(c.mem.req)}"`);
      out.push("        limits:");
      if (c.cpu.limSet) out.push(`          cpu: "${fmtCpuM(c.cpu.lim)}"`);
      if (c.mem.limSet) out.push(`          memory: "${fmtMemMi(c.mem.lim)}"`);
    });
    out.push("  restartPolicy: Always");
    out.push(`# Pod QoS class: ${qos}`);
    return out.join("\n");
  }, [containers, qos]);

  const applyPreset = (kind: "guaranteed" | "burstable" | "besteffort") => {
    if (kind === "guaranteed") {
      setContainers([
        { name: "api-server", cpu: { reqSet: true, req: 500, limSet: true, lim: 500 }, mem: { reqSet: true, req: 512, limSet: true, lim: 512 } },
        { name: "cache", cpu: { reqSet: true, req: 250, limSet: true, lim: 250 }, mem: { reqSet: true, req: 256, limSet: true, lim: 256 } },
      ]);
    } else if (kind === "burstable") {
      setContainers([
        { name: "api-server", cpu: { reqSet: true, req: 250, limSet: true, lim: 1000 }, mem: { reqSet: true, req: 128, limSet: true, lim: 512 } },
        { name: "cache", cpu: { reqSet: false, req: 125, limSet: false, lim: 250 }, mem: { reqSet: false, req: 128, limSet: false, lim: 256 } },
      ]);
    } else {
      setContainers([ALL_UNSET_SPEC("api-server"), ALL_UNSET_SPEC("cache")]);
    }
  };

  // ---- MODULE 5: Resource efficiency dashboard -----------------------------
  const [effNodeIdx, setEffNodeIdx] = useState<number>(2);
  const effNode = NODE_PRESETS[effNodeIdx];
  const [effReplicas, setEffReplicas] = useState(4);
  const [effCpuReqM, setEffCpuReqM] = useState(500);
  const [effCpuLimM, setEffCpuLimM] = useState(1000);
  const [effMemReqMi, setEffMemReqMi] = useState(512);
  const [effMemLimMi, setEffMemLimMi] = useState(1024);
  const [effCpuUsePct, setEffCpuUsePct] = useState(35);
  const [effMemUsePct, setEffMemUsePct] = useState(55);

  const eff = useMemo(() => {
    const totalCpuReq = (effCpuReqM / 1000) * effReplicas;
    const totalCpuLim = (effCpuLimM / 1000) * effReplicas;
    const totalMemReq = effMemReqMi * effReplicas;
    const totalMemLim = effMemLimMi * effReplicas;
    const cpuActual = totalCpuReq * (effCpuUsePct / 100);
    const memActual = totalMemReq * (effMemUsePct / 100);
    const cpuUtil = effCpuUsePct; // utilization is expressed as % of request
    const memUtil = effMemUsePct;
    const overcommitCpu = totalCpuReq > 0 ? totalCpuLim / totalCpuReq : 0;
    const overcommitMem = totalMemReq > 0 ? totalMemLim / totalMemReq : 0;

    const score = Math.max(
      0,
      Math.round(
        100 -
          Math.abs(cpuUtil - 70) * 0.9 -
          Math.abs(memUtil - 70) * 0.9 -
          (overcommitCpu > 4 ? 18 : 0) -
          (overcommitMem > 3 ? 12 : 0) -
          (cpuUtil < 25 || memUtil < 25 ? 15 : 0)
      )
    );

    const recs: { tone: "good" | "warn" | "bad"; text: string }[] = [];
    const healthy = cpuUtil >= 30 && cpuUtil <= 85 && memUtil >= 30 && memUtil <= 85;
    if (healthy) recs.push({ tone: "good", text: "Requests track actual utilization — steady-state efficiency looks healthy." });
    if (cpuUtil < 30) recs.push({ tone: "bad", text: `CPU runs at ${cpuUtil}% of request — you reserve ${fmtNum(totalCpuReq)} cores but use ~${fmtNum(cpuActual)}. Shrink requests.cpu.` });
    if (memUtil < 30) recs.push({ tone: "bad", text: `Memory runs at ${memUtil}% of request — only ~${fmtNum(memActual)}Mi is in use. Lower requests.memory.` });
    if (cpuUtil > 85) recs.push({ tone: "warn", text: "CPU at 85%+ of request — throttling and latency risk. Scale out or raise limits." });
    if (memUtil > 85) recs.push({ tone: "warn", text: "Memory above 85% of request — you are close to the OOM killer. Raise or right-size limits." });
    if (overcommitCpu > 4) recs.push({ tone: "warn", text: `CPU overcommit is ${fmtNum(overcommitCpu)}× — bursty neighbors can starve each other.` });
    if (overcommitMem > 3) recs.push({ tone: "warn", text: `Memory overcommit is ${fmtNum(overcommitMem)}× — memory is never reclaimed; >3× risks node instability.` });
    if (recs.length === 0) recs.push({ tone: "good", text: "Balanced profile — minor tuning only." });

    const podsPerNodeCpu = effCpuReqM > 0 ? Math.floor((effNode.cores * 1000) / effCpuReqM) : null;
    const podsPerNodeMem = effMemReqMi > 0 ? Math.floor((effNode.memGi * 1024) / effMemReqMi) : null;
    const podsFit =
      podsPerNodeCpu !== null && podsPerNodeMem !== null ? Math.min(podsPerNodeCpu, podsPerNodeMem) : null;

    return {
      totalCpuReq, totalCpuLim, totalMemReq, totalMemLim,
      cpuActual, memActual, cpuUtil, memUtil, overcommitCpu, overcommitMem,
      score, recs, podsFit,
    };
  }, [effCpuReqM, effCpuLimM, effMemReqMi, effMemLimMi, effReplicas, effCpuUsePct, effMemUsePct, effNode]);

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div id="dk-resource-quotas" className="space-y-16 pb-16">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-[#1e3a8a] border border-sky-200 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-100 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-300/20 border border-sky-200 text-xs font-mono text-sky-50">
            <span className="w-2 h-2 rounded-full bg-sky-200 animate-ping" />
            Track 5 • Cloud-Native Infrastructure &amp; Orchestration
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Kubernetes Resource Quotas &amp; Limits
          </h1>
          <p className="text-sm sm:text-base text-sky-100 max-w-3xl leading-relaxed">
            Master CPU &amp; memory request/limit math, namespace-wide ResourceQuota enforcement, LimitRange
            defaults, QoS class mechanics (Guaranteed · Burstable · BestEffort), and efficiency metrics that keep
            costs and evictions in check.
          </p>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODULE 1 — Requests & Limits Calculator */}
      {/* ===================================================================== */}
      <section className="space-y-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="text-xs font-mono text-sky-600 uppercase tracking-wider mb-1">
              Module 1 • Scheduling Math
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              CPU &amp; Memory Requests/Limits Calculator
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500">
            <span>Node:</span>
            <select
              value={nodeIdx}
              onChange={(e) => setNodeIdx(Number(e.target.value))}
              className="bg-transparent text-sky-700 font-bold focus:outline-none"
            >
              {NODE_PRESETS.map((n, i) => (
                <option key={n.id} value={i}>
                  {n.label} ({n.cores} vCPU / {n.memGi}Gi)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-xl p-5">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">CPU (millicores)</div>
              <SliderRow
                label="requests.cpu"
                value={cpuReqM}
                onChange={setCpuReqM}
                min={50}
                max={node.cores * 1000}
                step={50}
                valueText={cpuDisplay(cpuReqM)}
                hint="Guaranteed minimum for scheduling"
              />
              <SliderRow
                label="limits.cpu"
                value={cpuLimM}
                onChange={setCpuLimM}
                min={50}
                max={node.cores * 2000}
                step={50}
                valueText={cpuDisplay(cpuLimM)}
                hint="Burst ceiling before CPU throttling"
              />
            </div>
            <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-xl p-5">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Memory</div>
              <SliderRow
                label="requests.memory"
                value={memReqMi}
                onChange={setMemReqMi}
                min={64}
                max={node.memGi * 2048}
                step={64}
                valueText={fmtMemMi(memReqMi)}
                hint="Reserved on nodes at placement"
              />
              <SliderRow
                label="limits.memory"
                value={memLimMi}
                onChange={setMemLimMi}
                min={64}
                max={node.memGi * 4096}
                step={64}
                valueText={fmtMemMi(memLimMi)}
                hint="OOM-kill threshold"
              />
            </div>
          </div>

          <div className="lg:col-span-7 space-y-5">
            <ResourceGauge resource="CPU vs Node" request={cpuReqM} limit={cpuLimM} capacity={node.cores * 1000} unit="m" />
            <ResourceGauge resource="Memory vs Node" request={memReqMi} limit={memLimMi} capacity={node.memGi * 1024} unit="Mi" />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat
                label="limit/request ratio"
                value={`${fmtNum(m1.cpuRatio)}×`}
                tone={m1.cpuRatio > 4 || cpuLimM < cpuReqM ? "warn" : "ok"}
              />
              <Stat label="CPU burst headroom" value={cpuDisplay(m1.cpuHeadroomM)} tone="ok" />
              <Stat label="Memory burst headroom" value={fmtMemMi(m1.memHeadroomMi)} tone="ok" />
              <Stat label="Est. pods / node" value={m1.estPods === null ? "∞" : `${m1.estPods}`} tone="ok" />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-900 whitespace-pre leading-relaxed">
              {m1SpecYaml}
            </div>

            {m1Warnings.length > 0 ? (
              <NoticeBlock notices={m1Warnings} />
            ) : (
              <div className="text-xs text-slate-600 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 font-mono">
                ✅ Schedulable on {node.label}: request {cpuDisplay(cpuReqM)} / {fmtMemMi(memReqMi)} · limit {cpuDisplay(cpuLimM)} / {fmtMemMi(memLimMi)}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* MODULE 2 — ResourceQuota Builder */}
      {/* ===================================================================== */}
      <section className="space-y-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="text-xs font-mono text-sky-600 uppercase tracking-wider mb-1">
              Module 2 • Namespace Guardrails
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">ResourceQuota Builder</h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <label className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500">
              <span>name:</span>
              <input
                value={quotaName}
                onChange={(e) => setQuotaName(e.target.value)}
                className="w-32 bg-transparent text-sky-700 font-bold focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500">
              <span>namespace:</span>
              <input
                value={quotaNs}
                onChange={(e) => setQuotaNs(e.target.value)}
                className="w-28 bg-transparent text-sky-700 font-bold focus:outline-none"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-1">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">Compute resources</div>
              <ToggleRow label="Pods" checked={qEnablePods} onChange={setQEnablePods} />
              <ToggleRow label="requests.cpu" checked={qEnableCpuReq} onChange={setQEnableCpuReq} />
              <ToggleRow label="limits.cpu" checked={qEnableCpuLim} onChange={setQEnableCpuLim} />
              <ToggleRow label="requests.memory" checked={qEnableMemReq} onChange={setQEnableMemReq} />
              <ToggleRow label="limits.memory" checked={qEnableMemLim} onChange={setQEnableMemLim} />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-1">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">Other resources</div>
              <ToggleRow label="PersistentVolumeClaims" checked={qEnablePvc} onChange={setQEnablePvc} />
              <ToggleRow label="requests.storage" checked={qEnableStorage} onChange={setQEnableStorage} />
              <ToggleRow label="Services" checked={qEnableServices} onChange={setQEnableServices} />
              <ToggleRow label="Secrets" checked={qEnableSecrets} onChange={setQEnableSecrets} />
              <ToggleRow label="ConfigMaps" checked={qEnableCm} onChange={setQEnableCm} />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">Scope</div>
              <div className="flex gap-1">
                {(["Default", "BestEffort", "NotBestEffort"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuotaScope(s)}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
                      quotaScope === s ? "bg-sky-500 text-white shadow" : "text-slate-500 hover:text-sky-700"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Scope restricts the quota to pods matching that QoS class (BestEffort / NotBestEffort) or the whole namespace (Default).
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {qEnablePods ? <NumInput label="pods" value={quotaPods} onChange={setQuotaPods} min={1} max={1000} /> : null}
              {qEnableCpuReq ? <NumInput label="requests.cpu (cores)" value={quotaCpuReqCores} onChange={setQuotaCpuReqCores} min={1} max={64} /> : null}
              {qEnableCpuLim ? <NumInput label="limits.cpu (cores)" value={quotaCpuLimCores} onChange={setQuotaCpuLimCores} min={1} max={64} /> : null}
              {qEnableMemReq ? <NumInput label="requests.memory (Gi)" value={quotaMemReqGi} onChange={setQuotaMemReqGi} min={1} max={512} /> : null}
              {qEnableMemLim ? <NumInput label="limits.memory (Gi)" value={quotaMemLimGi} onChange={setQuotaMemLimGi} min={1} max={512} /> : null}
              {qEnablePvc ? <NumInput label="persistentvolumeclaims" value={quotaPvc} onChange={setQuotaPvc} min={1} max={1000} /> : null}
              {qEnableStorage ? <NumInput label="requests.storage (Gi)" value={quotaStorageGi} onChange={setQuotaStorageGi} min={1} max={10000} /> : null}
              {qEnableServices ? <NumInput label="services" value={quotaServices} onChange={setQuotaServices} min={1} max={1000} /> : null}
              {qEnableSecrets ? <NumInput label="secrets" value={quotaSecrets} onChange={setQuotaSecrets} min={1} max={1000} /> : null}
              {qEnableCm ? <NumInput label="configmaps" value={quotaCm} onChange={setQuotaCm} min={1} max={1000} /> : null}
            </div>

            <NoticeBlock notices={quotaWarnings} />

            <CopyBlock label="resourcequota.yaml" code={quotaYaml} />

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5 text-xs text-slate-600 leading-relaxed">
              <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">Enforcement rules</div>
              <p>
                • Admission is rejected when the pod&apos;s declared request/limit would exceed the remaining quota for that resource.
              </p>
              <p>
                • Resources counted: <span className="font-mono">requests.*</span> and <span className="font-mono">limits.*</span> are summed across all containers in the pod.
              </p>
              <p>
                • If a namespace has a quota for <span className="font-mono">requests.cpu</span>, every pod must declare it (ingress) or be rejected.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* MODULE 3 — LimitRange Configurator */}
      {/* ===================================================================== */}
      <section className="space-y-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="text-xs font-mono text-sky-600 uppercase tracking-wider mb-1">Module 3 • Defaults &amp; Bounds</div>
            <h2 className="text-2xl font-extrabold text-slate-900">LimitRange Configurator</h2>
          </div>
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <button
              onClick={() => setLrKind("Container")}
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
                lrKind === "Container" ? "bg-sky-500 text-white shadow" : "text-slate-500 hover:text-sky-700"
              }`}
            >
              Containers
            </button>
            <button
              onClick={() => setLrKind("PVC")}
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
                lrKind === "PVC" ? "bg-sky-500 text-white shadow" : "text-slate-500 hover:text-sky-700"
              }`}
            >
              PVC Storage
            </button>
          </div>
        </div>

        {lrKind === "Container" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-xl p-5">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-500">CPU (millicores)</div>
                <SliderRow label="min.cpu" value={lrMinCpuM} onChange={setLrMinCpuM} min={1} max={2000} step={10} valueText={`${lrMinCpuM}m`} hint="Lowest allowed request/limit" />
                <SliderRow label="defaultRequest.cpu" value={lrDefReqCpuM} onChange={setLrDefReqCpuM} min={10} max={4000} step={10} valueText={`${lrDefReqCpuM}m`} hint="Injected when request omitted" />
                <SliderRow label="default.cpu" value={lrDefCpuM} onChange={setLrDefCpuM} min={10} max={8000} step={10} valueText={`${lrDefCpuM}m`} hint="Injected when limit omitted" />
                <SliderRow label="max.cpu" value={lrMaxCpuM} onChange={setLrMaxCpuM} min={100} max={16000} step={100} valueText={`${lrMaxCpuM}m`} hint="Hard ceiling per container" />
              </div>
              <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-xl p-5">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-500">Memory (Mi)</div>
                <SliderRow label="min.memory" value={lrMinMemMi} onChange={setLrMinMemMi} min={16} max={16384} step={16} valueText={fmtMemMi(lrMinMemMi)} hint="Lowest allowed request/limit" />
                <SliderRow label="defaultRequest.memory" value={lrDefReqMemMi} onChange={setLrDefReqMemMi} min={64} max={32768} step={64} valueText={fmtMemMi(lrDefReqMemMi)} hint="Injected when request omitted" />
                <SliderRow label="default.memory" value={lrDefMemMi} onChange={setLrDefMemMi} min={64} max={65536} step={64} valueText={fmtMemMi(lrDefMemMi)} hint="Injected when limit omitted" />
                <SliderRow label="max.memory" value={lrMaxMemMi} onChange={setLrMaxMemMi} min={128} max={131072} step={128} valueText={fmtMemMi(lrMaxMemMi)} hint="Hard ceiling per container" />
              </div>
              <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-5">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-500">maxLimitRequestRatio</div>
                <SliderRow label="cpu ratio" value={lrRatioCpu} onChange={setLrRatioCpu} min={1} max={10} valueText={`${lrRatioCpu}`} />
                <SliderRow label="memory ratio" value={lrRatioMem} onChange={setLrRatioMem} min={1} max={10} valueText={`${lrRatioMem}`} />
              </div>
            </div>

            <div className="lg:col-span-7 space-y-5">
              <NoticeBlock notices={lrWarnings} />
              <CopyBlock label="limitrange.yaml" code={lrYaml} />
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5 text-xs text-slate-600 leading-relaxed">
                <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">How LimitRange applies</div>
                <p>• When a container omits a limit, the namespace default is injected; when it omits a request, defaultRequest is injected.</p>
                <p>• Containers declaring values outside [min, max] are rejected at admission.</p>
                <p>• maxLimitRequestRatio caps how far a container&apos;s limit may exceed its request for the same resource.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-5 bg-slate-50 border border-slate-200 rounded-xl p-5">
              <SliderRow label="min.storage" value={lrMinStorageGi} onChange={setLrMinStorageGi} min={1} max={lrMaxStorageGi} valueText={`${lrMinStorageGi}Gi`} hint="Smallest claim allowed" />
              <SliderRow label="max.storage" value={lrMaxStorageGi} onChange={setLrMaxStorageGi} min={1} max={10000} valueText={`${lrMaxStorageGi}Gi`} hint="Largest claim allowed" />
              <NoticeBlock notices={lrWarnings} />
            </div>
            <div className="lg:col-span-7 space-y-5">
              <CopyBlock label="limitrange-pvc.yaml" code={lrYaml} />
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed">
                Applies to PersistentVolumeClaim sizes: claims outside [min.storage, max.storage] are rejected at admission time.
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* MODULE 4 — QoS Class Calculator */}
      {/* ===================================================================== */}
      <section className="space-y-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="text-xs font-mono text-sky-600 uppercase tracking-wider mb-1">Module 4 • Pod Priority Tiers</div>
            <h2 className="text-2xl font-extrabold text-slate-900">QoS Class Calculator</h2>
          </div>
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <button
              onClick={() => applyPreset("guaranteed")}
              className="px-3 py-1.5 rounded-md text-xs font-mono text-slate-500 hover:text-sky-700"
            >
              Guaranteed preset
            </button>
            <button
              onClick={() => applyPreset("burstable")}
              className="px-3 py-1.5 rounded-md text-xs font-mono text-slate-500 hover:text-sky-700"
            >
              Burstable preset
            </button>
            <button
              onClick={() => applyPreset("besteffort")}
              className="px-3 py-1.5 rounded-md text-xs font-mono text-slate-500 hover:text-sky-700"
            >
              BestEffort preset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 space-y-5">
            {containers.map((c, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <input
                    value={c.name}
                    onChange={(e) => patchContainer(i, "cpu", {}, e.target.value)}
                    className="text-sm font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-2 py-1 font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  {containers.length > 1 ? (
                    <button
                      onClick={() => setContainers((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-xs font-mono text-red-400 hover:text-red-600"
                    >
                      remove
                    </button>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <QosField label="cpu (m)" setting={c.cpu} unit="m" onReqSet={(v) => patchContainer(i, "cpu", { reqSet: v })} onReqVal={(v) => patchContainer(i, "cpu", { req: v })} onLimSet={(v) => patchContainer(i, "cpu", { limSet: v })} onLimVal={(v) => patchContainer(i, "cpu", { lim: v })} />
                  <QosField label="memory (Mi)" setting={c.mem} unit="Mi" onReqSet={(v) => patchContainer(i, "mem", { reqSet: v })} onReqVal={(v) => patchContainer(i, "mem", { req: v })} onLimSet={(v) => patchContainer(i, "mem", { limSet: v })} onLimVal={(v) => patchContainer(i, "mem", { lim: v })} />
                </div>
              </div>
            ))}
            <button
              onClick={() => setContainers((prev) => [...prev, { ...DEFAULT_CONTAINER(`container-${prev.length + 1}`) }])}
              className="text-xs font-mono text-sky-600 border border-dashed border-sky-300 rounded-lg px-3 py-2 w-full hover:bg-sky-50"
            >
              + Add container
            </button>
          </div>

          <div className="lg:col-span-6 space-y-5">
            {/* Result badge */}
            <div className={`rounded-xl border p-5 flex items-start gap-4 ${QOS_META[qos].badge}`}>
              <span className={`w-3 h-3 rounded-full mt-1 ${QOS_META[qos].dot}`} />
              <div className="space-y-1">
                <div className="text-lg font-extrabold font-mono">QoS: {qos}</div>
                <p className="text-xs leading-relaxed">{QOS_META[qos].blurb}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5 text-xs text-slate-600 leading-relaxed">
              <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">Decision rules</div>
              <p>1. No requests or limits anywhere → <span className="font-mono font-bold">BestEffort</span>.</p>
              <p>2. Every container sets CPU request = CPU limit AND memory request = memory limit → <span className="font-mono font-bold">Guaranteed</span>.</p>
              <p>3. Anything else with at least one request/limit → <span className="font-mono font-bold">Burstable</span>.</p>
            </div>

            <CopyBlock label="pod.yaml" code={qosPodYaml} />
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* MODULE 5 — Resource Efficiency Metrics */}
      {/* ===================================================================== */}
      <section className="space-y-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="text-xs font-mono text-sky-600 uppercase tracking-wider mb-1">Module 5 • Cost &amp; Capacity</div>
            <h2 className="text-2xl font-extrabold text-slate-900">Resource Efficiency Metrics</h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500">
            <span>Node size:</span>
            <select
              value={effNodeIdx}
              onChange={(e) => setEffNodeIdx(Number(e.target.value))}
              className="bg-transparent text-sky-700 font-bold focus:outline-none"
            >
              {NODE_PRESETS.map((n, i) => (
                <option key={n.id} value={i}>
                  {n.label} ({n.cores} vCPU / {n.memGi}Gi)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-xl p-5">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Workload shape (per pod)</div>
              <SliderRow label="replicas" value={effReplicas} onChange={setEffReplicas} min={1} max={24} valueText={`${effReplicas}`} />
              <SliderRow label="CPU request" value={effCpuReqM} onChange={setEffCpuReqM} min={50} max={8000} step={50} valueText={cpuDisplay(effCpuReqM)} />
              <SliderRow label="CPU limit" value={effCpuLimM} onChange={setEffCpuLimM} min={50} max={16000} step={50} valueText={cpuDisplay(effCpuLimM)} />
              <SliderRow label="Mem request" value={effMemReqMi} onChange={setEffMemReqMi} min={64} max={65536} step={64} valueText={fmtMemMi(effMemReqMi)} />
              <SliderRow label="Mem limit" value={effMemLimMi} onChange={setEffMemLimMi} min={64} max={131072} step={64} valueText={fmtMemMi(effMemLimMi)} />
            </div>
            <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-xl p-5">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Measured utilization (% of request)</div>
              <SliderRow label="CPU utilization" value={effCpuUsePct} onChange={setEffCpuUsePct} min={0} max={100} valueText={`${effCpuUsePct}%`} hint="From metrics: sum(rate(container_cpu_usage_seconds_total))/requests" />
              <SliderRow label="Memory utilization" value={effMemUsePct} onChange={setEffMemUsePct} min={0} max={100} valueText={`${effMemUsePct}%`} hint="From metrics: container_memory_working_set_bytes vs requests" />
            </div>
          </div>

          <div className="lg:col-span-7 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Efficiency score" value={`${eff.score}/100`} tone={eff.score >= 70 ? "ok" : eff.score >= 40 ? "warn" : "danger"} />
              <Stat label="Total CPU request" value={`${fmtNum(eff.totalCpuReq)}c`} tone="ok" />
              <Stat label="CPU overcommit" value={`${fmtNum(eff.overcommitCpu)}×`} tone={eff.overcommitCpu > 4 ? "warn" : "ok"} />
              <Stat label="Mem overcommit" value={`${fmtNum(eff.overcommitMem)}×`} tone={eff.overcommitMem > 3 ? "warn" : "ok"} />
            </div>

            <ResourceGauge resource="CPU fleet (request vs limit)" request={eff.totalCpuReq * 1000} limit={eff.totalCpuLim * 1000} capacity={effNode.cores * 1000} unit="m" />
            <ResourceGauge resource="Memory fleet" request={eff.totalMemReq} limit={eff.totalMemLim} capacity={effNode.memGi * 1024} unit="Mi" />

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">CPU in use</div>
                <div className="text-sm font-mono font-bold text-slate-900 mt-1">{fmtNum(eff.cpuActual)}c</div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">CPU waste</div>
                <div className="text-sm font-mono font-bold text-slate-900 mt-1">{fmtNum(eff.totalCpuReq - eff.cpuActual)}c</div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Mem in use</div>
                <div className="text-sm font-mono font-bold text-slate-900 mt-1">{fmtNum(eff.memActual)}Mi</div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Pods fit / node</div>
                <div className="text-sm font-mono font-bold text-slate-900 mt-1">{eff.podsFit === null ? "—" : eff.podsFit}</div>
              </div>
            </div>

            <div className="space-y-2">
              {eff.recs.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 border ${
                    r.tone === "good"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : r.tone === "warn"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  <span className="font-bold">{r.tone === "good" ? "✓" : r.tone === "warn" ? "⚠" : "✕"}</span>
                  <span>{r.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}