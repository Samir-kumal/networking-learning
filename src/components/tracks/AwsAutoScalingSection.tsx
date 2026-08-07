"use client";

import React, { useEffect, useRef, useState } from "react";

// ============================================================
// Types & Constants
// ============================================================

interface TargetGroup {
  id: string;
  name: string;
  port: number;
  protocol: string;
  chip: string; // chip tailwind classes
  dot: string; // status dot color
  instances: number;
}

interface RouteRule {
  id: number;
  path: string;
  targetGroupId: string;
}

type HealthMode = "healthy" | "flaky" | "down";

interface HealthInstance {
  id: string;
  az: string;
  mode: HealthMode;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  status: "InService" | "Draining" | "Unhealthy";
}

interface TickResult {
  instanceId: string;
  ok: boolean;
}

interface StepRule {
  id: number;
  kind: "out" | "in";
  threshold: number;
  adjustment: number;
}

type PolicyType = "target-tracking" | "step-scaling" | "predictive";
type PredictiveMode = "forecast-only" | "forecast-and-scale";

interface ScaleInstance {
  id: string;
  az: string;
  status: "Launching" | "InService" | "Terminating";
}

interface ActivityEntry {
  id: number;
  time: string;
  message: string;
  kind: "scale-out" | "scale-in" | "info" | "warn";
}

const TARGET_GROUPS: TargetGroup[] = [
  { id: "api", name: "API-TG", port: 8080, protocol: "HTTP", chip: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", instances: 4 },
  { id: "web", name: "WEB-TG", port: 80, protocol: "HTTP", chip: "bg-teal-100 text-teal-700 border-teal-200", dot: "bg-teal-500", instances: 6 },
  { id: "static", name: "STATIC-TG", port: 443, protocol: "HTTPS", chip: "bg-lime-100 text-lime-700 border-lime-200", dot: "bg-lime-500", instances: 2 },
  { id: "admin", name: "ADMIN-TG", port: 3000, protocol: "HTTP", chip: "bg-cyan-100 text-cyan-700 border-cyan-200", dot: "bg-cyan-500", instances: 2 },
];

const DEFAULT_ROUTES: RouteRule[] = [
  { id: 1, path: "/api/*", targetGroupId: "api" },
  { id: 2, path: "/admin/*", targetGroupId: "admin" },
  { id: 3, path: "/static/*", targetGroupId: "static" },
  { id: 4, path: "/", targetGroupId: "web" },
];

const AZS = ["us-east-1a", "us-east-1b", "us-east-1c"];

const INITIAL_HEALTH_INSTANCES: HealthInstance[] = [
  { id: "i-0a1f2b", az: "us-east-1a", mode: "healthy", consecutiveFailures: 0, consecutiveSuccesses: 0, status: "InService" },
  { id: "i-0b3c4d", az: "us-east-1b", mode: "flaky", consecutiveFailures: 0, consecutiveSuccesses: 0, status: "InService" },
  { id: "i-0c5e6f", az: "us-east-1c", mode: "down", consecutiveFailures: 0, consecutiveSuccesses: 0, status: "InService" },
  { id: "i-0d7a8b", az: "us-east-1a", mode: "healthy", consecutiveFailures: 0, consecutiveSuccesses: 0, status: "InService" },
];

const NAV_LINKS = [
  { href: "#alb-routing", label: "ALB Path Routing" },
  { href: "#lb-comparison", label: "ALB vs NLB" },
  { href: "#health-checks", label: "Health Check Simulator" },
  { href: "#scaling-policy", label: "Scaling Policy Builder" },
  { href: "#live-capacity", label: "Live Instance Count" },
];

const SCENARIOS = [
  {
    id: "storefront",
    label: "Public HTTPS storefront",
    workload: "Web storefront: HTTPS + WAF, path-based routing to microservices, cookie sticky sessions, canary deploys.",
    verdict: "alb" as const,
    reason: "Content-based routing (path / host / query), TLS termination with ACM, cookie stickiness and WAF integration are all Layer-7 features. ALB is the right call.",
  },
  {
    id: "udp-game",
    label: "UDP multiplayer game",
    workload: "Real-time multiplayer game: UDP packets for state sync, sub-millisecond latency, static IPs for allow-listed clients.",
    verdict: "nlb" as const,
    reason: "NLB operates at Layer 4 and is the only AWS load balancer that forwards UDP. It also gives you a static IP per AZ and extreme throughput at ultra-low latency.",
  },
  {
    id: "legacy-tcp",
    label: "Legacy TCP service",
    workload: "Legacy .NET / Java service speaking raw TCP, no HTTP endpoint, must preserve the client source IP for auditing.",
    verdict: "nlb" as const,
    reason: "Raw TCP can't be inspected by a Layer-7 balancer. NLB passes the stream through untouched (with optional TLS passthrough) and preserves source IPs.",
  },
  {
    id: "websocket",
    label: "WebSocket push fleet",
    workload: "Millions of long-lived WebSocket connections with sticky routing so each client always hits the same node.",
    verdict: "nlb" as const,
    reason: "Both support WebSocket, but NLB wins at extreme concurrency: it scales per connection and keeps the same client pinned to the same target via source-IP stickiness with minimal overhead.",
  },
  {
    id: "grpc",
    label: "gRPC + Lambda microservices",
    workload: "gRPC services with HTTP/2 multiplexing plus Lambda function targets behind one endpoint.",
    verdict: "alb" as const,
    reason: "gRPC needs HTTP/2 (a Layer-7 feature) and Lambda targets are only supported by ALB. ALB handles both in one listener.",
  },
  {
    id: "containers",
    label: "ECS Fargate container fleet",
    workload: "ECS Fargate services with dynamic host-port mapping, health-based replacement and blue/green deploys.",
    verdict: "alb" as const,
    reason: "ALB is the standard integration for ECS: dynamic port mapping, per-target health checks and weighted target groups for blue/green are first-class features.",
  },
];

const LB_COMPARISON_ROWS: { feature: string; alb: string; nlb: string }[] = [
  { feature: "OSI Layer", alb: "Layer 7 (Application)", nlb: "Layer 4 (Transport)" },
  { feature: "Protocols", alb: "HTTP, HTTPS, HTTP/2, gRPC, WebSocket", nlb: "TCP, UDP, TLS passthrough" },
  { feature: "Static IPs", alb: "No — DNS name only", nlb: "Yes — one static IP per AZ" },
  { feature: "TLS termination", alb: "Yes — ACM certificates", nlb: "No — passthrough (offload on targets)" },
  { feature: "Content-based routing", alb: "Path, host, header, query, method", nlb: "None — flow based on IP + port" },
  { feature: "Sticky sessions", alb: "Yes — cookie-based", nlb: "Yes — source IP based" },
  { feature: "Health checks", alb: "Deep HTTP/HTTPS (path, status codes)", nlb: "TCP or simple HTTP probe" },
  { feature: "Target types", alb: "Instances, IPs, Lambda, containers", nlb: "Instances, IPs" },
  { feature: "Best for", alb: "Microservices, K8s ingress, serverless, canaries", nlb: "UDP gaming, legacy TCP, extreme throughput, VPC endpoints" },
];

const forecastLoadAt = (h: number): number => {
  const morning = Math.pow(Math.sin(((h - 8) / 24) * Math.PI), 2) * 28; // morning rush ~08:00
  const evening = Math.pow(Math.sin(((h - 19) / 24) * Math.PI), 2) * 34; // evening peak ~19:00
  return Math.round(18 + morning + evening);
};

const fmtTime = () => new Date().toLocaleTimeString("en-US", { hour12: false });

const getTg = (id: string) => TARGET_GROUPS.find((t) => t.id === id);

// ============================================================
// Component
// ============================================================

export default function AwsAutoScalingSection() {
  // ==========================================
  // MODULE 1: ALB PATH-BASED ROUTING CONFIGURATOR
  // ==========================================
  const [routes, setRoutes] = useState<RouteRule[]>(DEFAULT_ROUTES);
  const [newPath, setNewPath] = useState<string>("/api/*");
  const [newTargetId, setNewTargetId] = useState<string>("api");
  const [testPath, setTestPath] = useState<string>("/api/users/42");
  const [selectedScenario, setSelectedScenario] = useState<string>(SCENARIOS[0].id);
  const nextRouteId = useRef(5);

  const addRoute = () => {
    const clean = newPath.trim() || "/";
    setRoutes((prev) => [...prev, { id: nextRouteId.current++, path: clean, targetGroupId: newTargetId }]);
  };

  const removeRoute = (id: number) => {
    setRoutes((prev) => prev.filter((r) => r.id !== id));
  };

  const matchedRule = (() => {
    for (const rule of routes) {
      if (rule.path.endsWith("/*")) {
        if (testPath.startsWith(rule.path.slice(0, -1))) return rule;
      } else if (testPath === rule.path) {
        return rule;
      }
    }
    return null;
  })();
  const matchedTg = matchedRule ? getTg(matchedRule.targetGroupId) : null;

  // ==========================================
  // MODULE 3: TARGET GROUP HEALTH CHECK SIMULATOR
  // ==========================================
  const [healthInstances, setHealthInstances] = useState<HealthInstance[]>(INITIAL_HEALTH_INSTANCES);
  const [healthPath, setHealthPath] = useState<string>("/health");
  const [healthInterval, setHealthInterval] = useState<number>(30);
  const [unhealthyThreshold, setUnhealthyThreshold] = useState<number>(3);
  const [healthyThreshold, setHealthyThreshold] = useState<number>(2);
  const [healthTimeout, setHealthTimeout] = useState<number>(5);
  const [healthTick, setHealthTick] = useState<number>(0);
  const [healthHistory, setHealthHistory] = useState<TickResult[][]>([]);
  const [isHealthPlaying, setIsHealthPlaying] = useState(false);
  const healthIntervalRef = useRef<number | null>(null);
  const healthTickRef = useRef<() => void>(() => {});

  const runHealthTick = () => {
    const results: TickResult[] = [];
    const updated = healthInstances.map((inst) => {
      // flaky instances fail every 3rd consecutive check
      const checkNum = inst.consecutiveFailures + inst.consecutiveSuccesses + 1;
      const ok = inst.mode === "healthy" ? true : inst.mode === "down" ? false : checkNum % 3 !== 0;
      results.push({ instanceId: inst.id, ok });
      const cf = ok ? 0 : inst.consecutiveFailures + 1;
      const cs = ok ? inst.consecutiveSuccesses + 1 : 0;
      let status = inst.status;
      if (status === "Unhealthy") {
        // deregistered instance can recover after consecutive successes
        if (cs >= healthyThreshold) status = "InService";
      } else if (status === "Draining") {
        status = cf >= unhealthyThreshold ? "Unhealthy" : "InService";
      } else if (cf >= unhealthyThreshold) {
        status = "Draining";
      }
      return { ...inst, consecutiveFailures: cf, consecutiveSuccesses: cs, status };
    });
    setHealthInstances(updated);
    setHealthHistory((prev) => [...prev.slice(-11), results]);
    setHealthTick((t) => t + 1);
  };

  const toggleHealthSim = () => {
    if (isHealthPlaying) {
      if (healthIntervalRef.current) window.clearInterval(healthIntervalRef.current);
      healthIntervalRef.current = null;
      setIsHealthPlaying(false);
    } else {
      healthIntervalRef.current = window.setInterval(() => healthTickRef.current(), 650);
      setIsHealthPlaying(true);
    }
  };

  const resetHealthSim = () => {
    if (healthIntervalRef.current) window.clearInterval(healthIntervalRef.current);
    healthIntervalRef.current = null;
    setIsHealthPlaying(false);
    setHealthInstances(INITIAL_HEALTH_INSTANCES.map((i) => ({ ...i })));
    setHealthHistory([]);
    setHealthTick(0);
  };

  const timeoutValid = healthTimeout < healthInterval;
  const totalChecks = healthTick * healthInstances.length;
  const passedChecks = healthHistory.reduce((acc, tick) => acc + tick.filter((r) => r.ok).length, 0);
  const failedChecks = healthHistory.reduce((acc, tick) => acc + tick.filter((r) => !r.ok).length, 0);
  const inServiceCount = healthInstances.filter((i) => i.status === "InService").length;

  // ==========================================
  // MODULE 4: SCALING POLICY BUILDER
  // ==========================================
  const [policyType, setPolicyType] = useState<PolicyType>("target-tracking");
  const [minInstances, setMinInstances] = useState<number>(1);
  const [maxInstances, setMaxInstances] = useState<number>(10);
  const [desiredCapacity, setDesiredCapacity] = useState<number>(3);

  // target tracking
  const [ttMetric, setTtMetric] = useState<string>("CPUUtilization");
  const [targetValue, setTargetValue] = useState<number>(50);
  const [allowScaleIn, setAllowScaleIn] = useState<boolean>(true);
  const [currentLoad, setCurrentLoad] = useState<number>(62);

  const requiredCapacity = Math.min(maxInstances, Math.max(minInstances, Math.ceil(currentLoad / targetValue)));
  const ttDelta = requiredCapacity - desiredCapacity;

  // step scaling
  const [stepRules, setStepRules] = useState<StepRule[]>([
    { id: 1, kind: "out", threshold: 80, adjustment: 2 },
    { id: 2, kind: "out", threshold: 90, adjustment: 4 },
    { id: 3, kind: "in", threshold: 35, adjustment: 1 },
  ]);
  const [stepMetric, setStepMetric] = useState<number>(85);
  const [cooldown, setCooldown] = useState<number>(300);
  const [newStepKind, setNewStepKind] = useState<"out" | "in">("out");
  const [newStepThreshold, setNewStepThreshold] = useState<number>(75);
  const [newStepAdjustment, setNewStepAdjustment] = useState<number>(2);
  const nextStepId = useRef(4);

  const addStep = () => {
    setStepRules((prev) => [
      ...prev,
      { id: nextStepId.current++, kind: newStepKind, threshold: newStepThreshold, adjustment: newStepAdjustment },
    ]);
  };

  const removeStep = (id: number) => {
    setStepRules((prev) => prev.filter((s) => s.id !== id));
  };

  const triggeredStep = (() => {
    let out: StepRule | null = null;
    let inn: StepRule | null = null;
    for (const s of stepRules) {
      if (s.kind === "out" && stepMetric >= s.threshold && (!out || s.threshold > out.threshold)) out = s;
      if (s.kind === "in" && stepMetric <= s.threshold && (!inn || s.threshold < inn.threshold)) inn = s;
    }
    if (out && inn) return out.adjustment >= inn.adjustment ? out : inn;
    return out ?? inn;
  })();

  const stepResultCapacity = triggeredStep
    ? Math.min(maxInstances, Math.max(minInstances, desiredCapacity + (triggeredStep.kind === "out" ? triggeredStep.adjustment : -triggeredStep.adjustment)))
    : desiredCapacity;

  // predictive scaling
  const [predMode, setPredMode] = useState<PredictiveMode>("forecast-and-scale");
  const [lookAhead, setLookAhead] = useState<string>("6h");
  const [historyDays, setHistoryDays] = useState<number>(14);

  const forecast = Array.from({ length: 24 }, (_, h) => forecastLoadAt(h));
  const peak = Math.max(...forecast);
  const peakHour = forecast.indexOf(peak);
  const requiredAt = (v: number) => Math.min(maxInstances, Math.max(minInstances, Math.ceil(v / targetValue)));
  const peakRequired = requiredAt(peak);

  // ==========================================
  // MODULE 5: LIVE INSTANCE COUNT VISUALIZATION
  // ==========================================
  const [capacity, setCapacity] = useState<number>(3);
  const [capacityMin, setCapacityMin] = useState<number>(2);
  const [capacityMax, setCapacityMax] = useState<number>(8);
  const [load, setLoad] = useState<number>(45);
  const [isCapacityPlaying, setIsCapacityPlaying] = useState(false);
  const [instances, setInstances] = useState<ScaleInstance[]>([
    { id: "i-0a1f2b3c", az: "us-east-1a", status: "InService" },
    { id: "i-0b3c4d5e", az: "us-east-1b", status: "InService" },
    { id: "i-0c5e6f7a", az: "us-east-1c", status: "InService" },
  ]);
  const [activity, setActivity] = useState<ActivityEntry[]>([
    { id: 1, time: fmtTime(), message: "Auto Scaling group initialized: desired 3 · min 2 · max 8", kind: "info" },
  ]);
  const [cooldownTicks, setCooldownTicks] = useState(0);
  const capacityIntervalRef = useRef<number | null>(null);
  const capacityTickRef = useRef<() => void>(() => {});
  const instanceCounter = useRef(3);
  const logIdRef = useRef(2);

  const runCapacityTick = () => {
    // 1. finalize lifecycle transitions (Launching → InService, drop Terminating)
    const promoted = instances
      .filter((i) => i.status !== "Terminating")
      .map((i) => (i.status === "Launching" ? { ...i, status: "InService" as const } : i));

    // 2. evolve the load: random walk + occasional traffic spike
    let nextLoad = load + (Math.random() - 0.48) * 18 + (load < 40 ? 4 : 0);
    if (Math.random() < 0.08) nextLoad = 86 + Math.random() * 12;
    nextLoad = Math.round(Math.min(100, Math.max(4, nextLoad)));

    // 3. scaling decision (simple policy: scale out ≥78%, scale in ≤28%, 2-tick cooldown)
    let newCapacity = capacity;
    let nextInstances = [...promoted];
    let cooldownLeft = Math.max(0, cooldownTicks - 1);
    const entries: ActivityEntry[] = [];

    if (cooldownLeft === 0) {
      if (nextLoad >= 78 && capacity < capacityMax) {
        newCapacity = capacity + 1;
        instanceCounter.current += 1;
        const az = AZS[instanceCounter.current % AZS.length];
        const newId = `i-0f${instanceCounter.current.toString(16).padStart(6, "0")}`;
        nextInstances = [...promoted, { id: newId, az, status: "Launching" }];
        cooldownLeft = 2;
        entries.push({ id: logIdRef.current++, time: fmtTime(), message: `Scale OUT: load ${nextLoad}% ≥ 78% → desired ${newCapacity} · launching ${newId} in ${az}`, kind: "scale-out" });
      } else if (nextLoad <= 28 && capacity > capacityMin) {
        newCapacity = capacity - 1;
        const idx = nextInstances.findIndex((i) => i.status === "InService");
        if (idx >= 0) {
          nextInstances[idx] = { ...nextInstances[idx], status: "Terminating" };
          entries.push({ id: logIdRef.current++, time: fmtTime(), message: `Scale IN: load ${nextLoad}% ≤ 28% → desired ${newCapacity} · terminating ${nextInstances[idx].id}`, kind: "scale-in" });
        }
      }
    }

    setCapacity(newCapacity);
    setInstances(nextInstances);
    setLoad(nextLoad);
    setCooldownTicks(cooldownLeft);
    const inService = nextInstances.filter((i) => i.status === "InService").length;
    if (entries.length > 0) {
      setActivity((prev) => [...entries.reverse(), ...prev].slice(0, 8));
    } else {
      const probeEntry: ActivityEntry = {
        id: logIdRef.current++,
        time: fmtTime(),
        message: `Probe: load ${nextLoad}% · desired ${newCapacity} · ${inService} in service`,
        kind: "info",
      };
      setActivity((prev) => [probeEntry, ...prev].slice(0, 8));
    }
  };

  const toggleCapacitySim = () => {
    if (isCapacityPlaying) {
      if (capacityIntervalRef.current) window.clearInterval(capacityIntervalRef.current);
      capacityIntervalRef.current = null;
      setIsCapacityPlaying(false);
    } else {
      capacityIntervalRef.current = window.setInterval(() => capacityTickRef.current(), 900);
      setIsCapacityPlaying(true);
    }
  };

  const resetCapacitySim = () => {
    if (capacityIntervalRef.current) window.clearInterval(capacityIntervalRef.current);
    capacityIntervalRef.current = null;
    setIsCapacityPlaying(false);
    setCapacity(3);
    setLoad(45);
    setCooldownTicks(0);
    instanceCounter.current = 3;
    logIdRef.current = 2;
    setInstances([
      { id: "i-0a1f2b3c", az: "us-east-1a", status: "InService" },
      { id: "i-0b3c4d5e", az: "us-east-1b", status: "InService" },
      { id: "i-0c5e6f7a", az: "us-east-1c", status: "InService" },
    ]);
    setActivity([{ id: 1, time: fmtTime(), message: "Auto Scaling group reset: desired 3 · min 2 · max 8", kind: "info" }]);
  };

  const setManualCapacity = (n: number) => {
    const clamped = Math.min(capacityMax, Math.max(capacityMin, n));
    if (clamped === capacity) return;
    setCapacity(clamped);
    setInstances((prev) => {
      const current = prev
        .filter((i) => i.status !== "Terminating")
        .map((i) => (i.status === "Launching" ? { ...i, status: "InService" as const } : i));
      let next = [...current];
      const active = next.filter((i) => i.status === "InService").length;
      if (clamped > active) {
        while (next.length < clamped) {
          instanceCounter.current += 1;
          next = [...next, { id: `i-0f${instanceCounter.current.toString(16).padStart(6, "0")}`, az: AZS[instanceCounter.current % AZS.length], status: "Launching" }];
        }
      } else if (clamped < active) {
        let toRemove = active - clamped;
        next = next.map((i) => (i.status === "InService" && toRemove-- > 0 ? { ...i, status: "Terminating" as const } : i));
      }
      return next;
    });
    setCooldownTicks(2);
    const manualEntry: ActivityEntry = {
      id: logIdRef.current++,
      time: fmtTime(),
      message: `Manual adjustment: desired capacity → ${clamped}`,
      kind: "warn",
    };
    setActivity((prev) => [manualEntry, ...prev].slice(0, 8));
  };

  // keep tick refs fresh with latest state
  useEffect(() => {
    healthTickRef.current = runHealthTick;
    capacityTickRef.current = runCapacityTick;
  });

  // clean up intervals on unmount
  useEffect(
    () => () => {
      if (healthIntervalRef.current) window.clearInterval(healthIntervalRef.current);
      if (capacityIntervalRef.current) window.clearInterval(capacityIntervalRef.current);
    },
    []
  );

  const capacityPct = (capacity / capacityMax) * 100;
  const minMarkerPct = (capacityMin / capacityMax) * 100;
  const loadBarColor = load >= 78 ? "bg-rose-500" : load >= 55 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="space-y-16 py-6">
      {/* ================================================================ */}
      {/* TRACK TITLE BANNER */}
      {/* ================================================================ */}
      <div className="rounded-2xl bg-gradient-to-r from-[#041f14] via-[#0b3b26] to-[#041f14] border border-emerald-900/60 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-400 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              AWS Elasticity &amp; Traffic Engineering Track
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Auto Scaling &amp; Load Balancer Deep Dive
            </h1>
            <p className="text-emerald-100/70 text-sm sm:text-base mt-2 max-w-3xl">
              Production-grade elasticity: configure ALB path-based routing, compare ALB vs NLB, simulate target
              group health checks, build target-tracking / step / predictive scaling policies, and watch a live
              Auto Scaling group react to traffic in real time.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg">
              ✓ Path-Based Routing
            </span>
            <span className="bg-teal-500/10 border border-teal-500/30 text-teal-400 px-3 py-1.5 rounded-lg">
              ✓ Health Check Sim
            </span>
            <span className="bg-lime-500/10 border border-lime-500/30 text-lime-400 px-3 py-1.5 rounded-lg">
              ✓ Predictive Scaling
            </span>
          </div>
        </div>
      </div>

      {/* Quick nav */}
      <nav className="flex flex-wrap gap-2">
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            {link.label}
          </a>
        ))}
      </nav>

      {/* ================================================================ */}
      {/* MODULE 1: ALB PATH-BASED ROUTING CONFIGURATOR (#alb-routing) */}
      {/* ================================================================ */}
      <section
        id="alb-routing"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 card-shadow shadow-xl hover:border-emerald-400/40 transition-colors space-y-8"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono text-emerald-600 uppercase tracking-wider mb-1">
              Module 01 / Listener Rules
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              <span>🔀</span> ALB Path-Based Routing Configurator
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            Listener :443 · Rules evaluated in priority order
          </span>
        </div>

        <p className="text-sm text-slate-500 leading-relaxed">
          An <strong className="text-slate-900">Application Load Balancer</strong> evaluates incoming requests against{" "}
          <strong className="text-emerald-600">listener rules</strong> from lowest priority number upward. The first
          rule whose condition matches wins and routes the request to its target group — no fall-through. Path
          patterns support a single trailing wildcard (<code className="text-emerald-700 bg-emerald-50 px-1 rounded font-mono">/api/*</code>).
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Rule builder */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 font-mono">➕ Add Listener Rule</h3>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">Path Pattern</label>
                  <input
                    type="text"
                    value={newPath}
                    onChange={(e) => setNewPath(e.target.value)}
                    placeholder="/api/*"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">Forward To</label>
                  <select
                    value={newTargetId}
                    onChange={(e) => setNewTargetId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-emerald-500 focus:outline-none"
                  >
                    {TARGET_GROUPS.map((tg) => (
                      <option key={tg.id} value={tg.id}>
                        {tg.name} (: {tg.port})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={addRoute}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-mono font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  >
                    Add Rule
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs font-mono text-slate-500 border-b border-slate-200">
                    <th className="p-3">Priority</th>
                    <th className="p-3">Condition (Path Pattern)</th>
                    <th className="p-3">Action → Target Group</th>
                    <th className="p-3">Port / Proto</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363d] text-xs font-mono text-slate-900">
                  {routes.map((rule, idx) => {
                    const tg = getTg(rule.targetGroupId);
                    return (
                      <tr key={rule.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold">
                            {idx + 1}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {rule.path} {rule.path === "/" && <span className="text-slate-400 font-normal">(default)</span>}
                        </td>
                        <td className="p-3">
                          {tg && (
                            <span className={`px-2 py-0.5 rounded border ${tg.chip}`}>
                              {tg.dot && <span className={`inline-block w-1.5 h-1.5 rounded-full ${tg.dot} mr-1.5 align-middle`} />}
                              {tg.name}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-500">
                          {tg ? `${tg.protocol} :${tg.port}` : "—"}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => removeRoute(rule.id)}
                            className="text-[11px] font-mono text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition-colors"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Route test */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 font-mono">🧪 Live Route Tester</h3>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">Incoming Request Path</label>
                <input
                  type="text"
                  value={testPath}
                  onChange={(e) => setTestPath(e.target.value)}
                  placeholder="/api/users/42"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                {routes.length} rule{routes.length === 1 ? "" : "s"} evaluated in priority order
              </p>
            </div>

            {matchedRule && matchedTg ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 space-y-2">
                <div className="text-xs font-mono text-emerald-700 font-bold uppercase tracking-wider">✓ Rule Matched</div>
                <p className="text-sm text-slate-700">
                  Request <code className="font-mono text-emerald-700 bg-white border border-emerald-200 rounded px-1">{testPath}</code>{" "}
                  matched pattern <code className="font-mono text-slate-900 bg-white border border-emerald-200 rounded px-1">{matchedRule.path}</code>
                </p>
                <div className="flex items-center gap-2 pt-2 border-t border-emerald-200">
                  <span className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold ${matchedTg.chip}`}>
                    {matchedTg.name}
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    {matchedTg.protocol} :{matchedTg.port} · {matchedTg.instances} registered
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-5 space-y-2">
                <div className="text-xs font-mono text-rose-700 font-bold uppercase tracking-wider">✗ No Rule Matched</div>
                <p className="text-sm text-slate-700">
                  <code className="font-mono text-rose-700 bg-white border border-rose-200 rounded px-1">{testPath}</code>{" "}
                  did not match any configured path pattern.
                </p>
                <p className="text-xs font-mono text-slate-500">
                  Listener returns <span className="text-rose-600 font-bold">503 Service Unavailable</span> — add a{" "}
                  <code className="bg-white border border-slate-200 rounded px-1">/</code> default rule to catch all.
                </p>
              </div>
            )}

            {/* Flow diagram */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-3">Request Flow</div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700">🌐 Client</span>
                <span className="text-slate-400">→</span>
                <span className="bg-emerald-50 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-emerald-700 font-bold">ALB :443</span>
                <span className="text-slate-400">→</span>
                <span className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700">Rule Engine</span>
                <span className="text-slate-400">→</span>
                <span className="bg-teal-50 border border-teal-300 rounded-lg px-2.5 py-1.5 text-teal-700 font-bold">Target Group</span>
                <span className="text-slate-400">→</span>
                <span className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700">EC2 / ECS / Lambda</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {TARGET_GROUPS.map((tg) => (
                  <span key={tg.id} className={`px-2 py-0.5 rounded border text-[11px] font-mono ${tg.chip}`}>
                    {tg.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* MODULE 2: NLB vs ALB COMPARISON (#lb-comparison) */}
      {/* ================================================================ */}
      <section
        id="lb-comparison"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 card-shadow shadow-xl hover:border-emerald-400/40 transition-colors space-y-8"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono text-emerald-600 uppercase tracking-wider mb-1">
              Module 02 / Load Balancer Selection
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              <span>⚖️</span> NLB vs ALB — Which One Do You Need?
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            Layer 4 vs Layer 7
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ALB card */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-emerald-700 text-lg font-mono">ALB · Layer 7</h3>
              <span className="text-[11px] font-mono bg-emerald-600 text-white px-2 py-0.5 rounded-full">Application</span>
            </div>
            <ul className="space-y-1.5 text-sm text-slate-700">
              <li>• HTTP / HTTPS / HTTP/2 / gRPC / WebSocket</li>
              <li>• Routes on path, host, header, query string</li>
              <li>• TLS termination with ACM certificates</li>
              <li>• Targets: EC2, IP, Lambda, ECS, EKS</li>
              <li>• Deep HTTP health checks + WAF integration</li>
              <li>• Cookie sticky sessions, redirects, auth</li>
            </ul>
          </div>
          {/* NLB card */}
          <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-teal-700 text-lg font-mono">NLB · Layer 4</h3>
              <span className="text-[11px] font-mono bg-teal-600 text-white px-2 py-0.5 rounded-full">Transport</span>
            </div>
            <ul className="space-y-1.5 text-sm text-slate-700">
              <li>• TCP, UDP, TLS passthrough (no content inspection)</li>
              <li>• Static IP per AZ — ideal for allow-listing</li>
              <li>• Extreme throughput, sub-millisecond latency</li>
              <li>• Preserves client source IP end to end</li>
              <li>• Scales with millions of connections (long-lived)</li>
              <li>• Source-IP stickiness for UDP / WebSocket</li>
            </ul>
          </div>
        </div>

        {/* Comparison table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs font-mono text-slate-500 border-b border-slate-200">
                <th className="p-3 w-40">Feature</th>
                <th className="p-3 text-emerald-700">Application Load Balancer (L7)</th>
                <th className="p-3 text-teal-700">Network Load Balancer (L4)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d] text-xs font-mono text-slate-900">
              {LB_COMPARISON_ROWS.map((row) => (
                <tr key={row.feature} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 font-bold">{row.feature}</td>
                  <td className="p-3 text-slate-600">{row.alb}</td>
                  <td className="p-3 text-slate-600">{row.nlb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Workload advisor */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 font-mono">🧭 Workload Advisor — what would you deploy?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedScenario(s.id)}
                className={`text-left px-4 py-3 rounded-xl border text-xs font-mono transition-colors ${
                  selectedScenario === s.id
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-300"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {(() => {
            const s = SCENARIOS.find((x) => x.id === selectedScenario);
            if (!s) return null;
            return (
              <div
                className={`rounded-xl border p-5 space-y-2 ${
                  s.verdict === "alb" ? "bg-emerald-50 border-emerald-200" : "bg-teal-50 border-teal-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-white ${s.verdict === "alb" ? "bg-emerald-600" : "bg-teal-600"}`}>
                    Recommendation: {s.verdict.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-slate-700">{s.workload}</p>
                <p className="text-xs font-mono text-slate-500">{s.reason}</p>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ================================================================ */}
      {/* MODULE 3: TARGET GROUP HEALTH CHECK SIMULATOR (#health-checks) */}
      {/* ================================================================ */}
      <section
        id="health-checks"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 card-shadow shadow-xl hover:border-emerald-400/40 transition-colors space-y-8"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono text-emerald-600 uppercase tracking-wider mb-1">
              Module 03 / Target Group Health
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              <span>💚</span> Target Group Health Check Simulator
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            Interval · Thresholds · Timeout
          </span>
        </div>

        <p className="text-sm text-slate-500 leading-relaxed">
          The load balancer probes each registered target at the configured{" "}
          <strong className="text-slate-900">interval</strong>. A target is marked{" "}
          <strong className="text-rose-600">unhealthy</strong> only after{" "}
          <strong className="text-slate-900">unhealthy threshold</strong> consecutive failures — it then enters{" "}
          <strong className="text-amber-600">draining</strong>, finishes in-flight requests and is deregistered. A
          deregistered target can return to service after{" "}
          <strong className="text-slate-900">healthy threshold</strong> consecutive successes.
        </p>

        {/* Health check config */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">Health Path</label>
            <input
              type="text"
              value={healthPath}
              onChange={(e) => setHealthPath(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">Interval (s)</label>
            <select
              value={healthInterval}
              onChange={(e) => setHealthInterval(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-emerald-500 focus:outline-none"
            >
              {[10, 30, 60, 120, 300].map((v) => (
                <option key={v} value={v}>
                  {v}s
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">Unhealthy Threshold</label>
            <select
              value={unhealthyThreshold}
              onChange={(e) => setUnhealthyThreshold(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-emerald-500 focus:outline-none"
            >
              {[2, 3, 5, 8, 10].map((v) => (
                <option key={v} value={v}>
                  {v} failures
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">Healthy Threshold</label>
            <select
              value={healthyThreshold}
              onChange={(e) => setHealthyThreshold(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-emerald-500 focus:outline-none"
            >
              {[2, 3, 5, 8, 10].map((v) => (
                <option key={v} value={v}>
                  {v} successes
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">Timeout (s)</label>
            <select
              value={healthTimeout}
              onChange={(e) => setHealthTimeout(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-emerald-500 focus:outline-none"
            >
              {[3, 5, 10, 20, 30].map((v) => (
                <option key={v} value={v}>
                  {v}s
                </option>
              ))}
            </select>
          </div>
        </div>

        {!timeoutValid && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs font-mono text-amber-700">
            ⚠️ Invalid config: timeout ({healthTimeout}s) must be less than the interval ({healthInterval}s) or probes
            overlap. EC2/ELB validates this at creation time.
          </div>
        )}

        {/* Simulation controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={toggleHealthSim}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-colors ${
              isHealthPlaying
                ? "bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {isHealthPlaying ? "⏸ Pause" : "▶ Run Checks"}
          </button>
          <button
            onClick={() => healthTickRef.current()}
            className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors"
          >
            Single Check
          </button>
          <button
            onClick={resetHealthSim}
            className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors"
          >
            ↺ Reset
          </button>
          <span className="text-xs font-mono text-slate-500">Tick #{healthTick}</span>
          <span className="text-xs font-mono text-slate-500">
            Est. deregistration: <span className="text-slate-900 font-bold">{unhealthyThreshold} × {healthInterval}s = {unhealthyThreshold * healthInterval}s</span>
          </span>
        </div>

        {/* Instance status table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs font-mono text-slate-500 border-b border-slate-200">
                <th className="p-3">Instance</th>
                <th className="p-3">AZ</th>
                <th className="p-3">Behavior</th>
                <th className="p-3">Consecutive Fails</th>
                <th className="p-3">Consecutive OKs</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d] text-xs font-mono text-slate-900">
              {healthInstances.map((inst) => (
                <tr key={inst.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 font-bold">{inst.id}</td>
                  <td className="p-3 text-slate-500">{inst.az}</td>
                  <td className="p-3">
                    <select
                      value={inst.mode}
                      onChange={(e) =>
                        setHealthInstances((prev) =>
                          prev.map((i) =>
                            i.id === inst.id
                              ? { ...i, mode: e.target.value as HealthMode, consecutiveFailures: 0, consecutiveSuccesses: 0, status: "InService" }
                              : i
                          )
                        )
                      }
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="healthy">Healthy (always 200)</option>
                      <option value="flaky">Flaky (fails every 3rd)</option>
                      <option value="down">Down (always timeout)</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <span className={inst.consecutiveFailures >= unhealthyThreshold ? "text-rose-600 font-bold" : "text-slate-500"}>
                      {inst.consecutiveFailures}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={inst.consecutiveSuccesses >= healthyThreshold ? "text-emerald-600 font-bold" : "text-slate-500"}>
                      {inst.consecutiveSuccesses}
                    </span>
                  </td>
                  <td className="p-3">
                    {inst.status === "InService" && (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold">
                        InService
                      </span>
                    )}
                    {inst.status === "Draining" && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 font-bold">
                        Draining…
                      </span>
                    )}
                    {inst.status === "Unhealthy" && (
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 font-bold">
                        Unhealthy
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Timeline */}
        {healthHistory.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 text-xs font-mono text-slate-500 uppercase tracking-wider">
              Check Timeline (last {healthHistory.length} intervals)
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] font-mono text-slate-400 border-b border-slate-200">
                  <th className="p-2 pl-3">Instance</th>
                  {healthHistory.map((_, t) => (
                    <th key={t} className="p-2 text-center">
                      T{healthTick - healthHistory.length + t + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]">
                {healthInstances.map((inst) => (
                  <tr key={inst.id} className="text-xs font-mono text-slate-500">
                    <td className="p-2 pl-3 font-bold text-slate-900 whitespace-nowrap">{inst.id}</td>
                    {healthHistory.map((tick, t) => {
                      const res = tick.find((r) => r.instanceId === inst.id);
                      return (
                        <td key={t} className="p-1.5 text-center">
                          {res ? (
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded text-[11px] font-bold text-white ${
                                res.ok ? "bg-emerald-500" : "bg-rose-500"
                              }`}
                            >
                              {res.ok ? "✓" : "✗"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-100" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <div className="text-[11px] font-mono text-slate-500 uppercase">Checks Run</div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">{totalChecks}</div>
          </div>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <div className="text-[11px] font-mono text-slate-500 uppercase">Pass Rate (last 12)</div>
            <div className="text-2xl font-extrabold text-emerald-600 font-mono">
              {passedChecks + failedChecks > 0 ? Math.round((passedChecks / (passedChecks + failedChecks)) * 100) : 0}%
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <div className="text-[11px] font-mono text-slate-500 uppercase">In Service</div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">
              {inServiceCount}<span className="text-slate-400 text-sm">/{healthInstances.length}</span>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <div className="text-[11px] font-mono text-slate-500 uppercase">Probe</div>
            <div className="text-sm font-bold text-slate-700 font-mono mt-1.5">
              GET {healthPath} · {healthTimeout}s timeout
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* MODULE 4: SCALING POLICY BUILDER (#scaling-policy) */}
      {/* ================================================================ */}
      <section
        id="scaling-policy"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 card-shadow shadow-xl hover:border-emerald-400/40 transition-colors space-y-8"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono text-emerald-600 uppercase tracking-wider mb-1">
              Module 04 / Auto Scaling Policies
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              <span>📈</span> Scaling Policy Builder
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            Target Tracking · Step Scaling · Predictive
          </span>
        </div>

        {/* Group capacity controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">Min Instances</label>
            <select
              value={minInstances}
              onChange={(e) => setMinInstances(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-emerald-500 focus:outline-none"
            >
              {[1, 2, 3, 4, 5, 6].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">Max Instances</label>
            <select
              value={maxInstances}
              onChange={(e) => setMaxInstances(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-emerald-500 focus:outline-none"
            >
              {[4, 6, 8, 10, 12, 16].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">Desired Capacity</label>
            <input
              type="number"
              min={minInstances}
              max={maxInstances}
              value={desiredCapacity}
              onChange={(e) => setDesiredCapacity(Math.min(maxInstances, Math.max(minInstances, Number(e.target.value) || minInstances)))}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Policy type tabs */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "target-tracking", label: "🎯 Target Tracking" },
              { id: "step-scaling", label: "🪜 Step Scaling" },
              { id: "predictive", label: "🔮 Predictive Scaling" },
            ] as { id: PolicyType; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setPolicyType(t.id)}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-colors border ${
                policyType === t.id
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:border-emerald-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ---------------- Target Tracking ---------------- */}
        {policyType === "target-tracking" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">Metric</label>
                <select
                  value={ttMetric}
                  onChange={(e) => setTtMetric(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-emerald-500 focus:outline-none"
                >
                  <option value="CPUUtilization">EC2 CPUUtilization</option>
                  <option value="RequestCountPerTarget">ALB RequestCountPerTarget</option>
                  <option value="ConcurrentConnections">ALB ConcurrentConnections</option>
                  <option value="SQSCustom">Custom: SQS ApproximateNumberOfMessages</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">
                  Target Value: <span className="text-emerald-600 font-bold">{targetValue}%</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={90}
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">
                  Current Fleet Utilization: <span className="text-slate-900 font-bold">{currentLoad}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={currentLoad}
                  onChange={(e) => setCurrentLoad(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-mono text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowScaleIn}
                  onChange={(e) => setAllowScaleIn(e.target.checked)}
                  className="accent-emerald-600"
                />
                Allow scale-in (lower capacity when metric drops)
              </label>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 space-y-2">
                <div className="text-xs font-mono text-emerald-700 font-bold uppercase tracking-wider">
                  📐 Capacity Math — keep {ttMetric} at {targetValue}%
                </div>
                <p className="text-sm font-mono text-slate-700">
                  required = ⌈ {currentLoad}% ÷ {targetValue}% ⌉ ={" "}
                  <span className="text-emerald-700 font-extrabold">{requiredCapacity} instances</span>
                </p>
                <p className="text-xs font-mono text-slate-500">
                  desired capacity: {desiredCapacity} · range [{minInstances} – {maxInstances}]
                </p>
                <div className="pt-2 border-t border-emerald-200">
                  {ttDelta > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-mono font-bold">
                      SCALE OUT +{ttDelta} → {Math.min(maxInstances, desiredCapacity + ttDelta)}
                    </span>
                  )}
                  {ttDelta < 0 && allowScaleIn && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-xs font-mono font-bold">
                      SCALE IN {ttDelta} → {Math.max(minInstances, desiredCapacity + ttDelta)}
                    </span>
                  )}
                  {ttDelta < 0 && !allowScaleIn && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-600 text-xs font-mono font-bold">
                      Scale-in disabled — capacity held at {desiredCapacity}
                    </span>
                  )}
                  {ttDelta === 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-mono font-bold">
                      Steady state — no action
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Target tracking works like a thermostat: CloudWatch polls the metric, computes the capacity needed to
                bring it back to the target, and adjusts the desired count — with a warm-up window after each
                scale-out so new instances can finish booting before the next evaluation.
              </p>
            </div>
          </div>
        )}

        {/* ---------------- Step Scaling ---------------- */}
        {policyType === "step-scaling" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 text-xs font-mono text-slate-500 uppercase tracking-wider flex justify-between">
                  <span>Step Adjustments</span>
                  <span>{stepRules.length} rules</span>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] font-mono text-slate-400 border-b border-slate-200">
                      <th className="p-2.5 pl-4">Direction</th>
                      <th className="p-2.5">When metric…</th>
                      <th className="p-2.5">Adjust by</th>
                      <th className="p-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30363d] text-xs font-mono text-slate-900">
                    {stepRules.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-2.5 pl-4">
                          {s.kind === "out" ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold">Scale out</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 font-bold">Scale in</span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-600">
                          {s.kind === "out" ? "≥ " : "≤ "}
                          {s.threshold}%
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">
                          {s.kind === "out" ? "+" : "−"}
                          {s.adjustment}
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => removeStep(s.id)}
                            className="text-[11px] font-mono text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition-colors"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr_auto] gap-3 items-end">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">Direction</label>
                  <select
                    value={newStepKind}
                    onChange={(e) => setNewStepKind(e.target.value as "out" | "in")}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="out">Scale out</option>
                    <option value="in">Scale in</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">Threshold %</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={newStepThreshold}
                    onChange={(e) => setNewStepThreshold(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">Adjustment</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newStepAdjustment}
                    onChange={(e) => setNewStepAdjustment(Number(e.target.value) || 1)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={addStep}
                  className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  Add Step
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">
                  Cooldown: <span className="text-slate-900 font-bold">{cooldown}s</span>
                </label>
                <input
                  type="range"
                  min={60}
                  max={600}
                  step={30}
                  value={cooldown}
                  onChange={(e) => setCooldown(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">
                  Current Metric Value: <span className="text-slate-900 font-bold">{stepMetric}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={stepMetric}
                  onChange={(e) => setStepMetric(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 space-y-2">
                <div className="text-xs font-mono text-emerald-700 font-bold uppercase tracking-wider">⚡ Alarm Evaluation</div>
                {triggeredStep ? (
                  <>
                    <p className="text-sm font-mono text-slate-700">
                      Metric {stepMetric}% {triggeredStep.kind === "out" ? "≥" : "≤"} {triggeredStep.threshold}% →{" "}
                      <span className="font-extrabold text-emerald-700">
                        {triggeredStep.kind === "out" ? `+${triggeredStep.adjustment}` : `−${triggeredStep.adjustment}`} instance{triggeredStep.adjustment === 1 ? "" : "s"}
                      </span>
                    </p>
                    <p className="text-xs font-mono text-slate-500">
                      desired {desiredCapacity} → {stepResultCapacity} (after {cooldown}s cooldown)
                    </p>
                    <div className="pt-2 border-t border-emerald-200">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-mono font-bold">
                        NEW DESIRED CAPACITY: {stepResultCapacity}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm font-mono text-slate-500">
                    Metric {stepMetric}% breaches no threshold — capacity stays at {desiredCapacity}.
                  </p>
                )}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Step scaling gives explicit control: each CloudWatch alarm breach maps to a fixed capacity
                adjustment, optionally followed by a cooldown that suppresses further actions until the fleet
                settles. Larger breaches can trigger bigger steps (e.g. +2 at 80%, +4 at 90%).
              </p>
            </div>
          </div>
        )}

        {/* ---------------- Predictive Scaling ---------------- */}
        {policyType === "predictive" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">Mode</label>
                <select
                  value={predMode}
                  onChange={(e) => setPredMode(e.target.value as PredictiveMode)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-emerald-500 focus:outline-none"
                >
                  <option value="forecast-only">Forecast only (dry run)</option>
                  <option value="forecast-and-scale">Forecast and scale (automatic)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">Look-Ahead Window</label>
                <select
                  value={lookAhead}
                  onChange={(e) => setLookAhead(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-emerald-500 focus:outline-none"
                >
                  <option value="1h">1 hour</option>
                  <option value="6h">6 hours</option>
                  <option value="12h">12 hours</option>
                  <option value="24h">24 hours</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">Training Data Window</label>
                <select
                  value={historyDays}
                  onChange={(e) => setHistoryDays(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-emerald-500 focus:outline-none"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs font-mono text-slate-600 space-y-1.5">
                <div>Model: DailySeasonality (AM/PM peaks)</div>
                <div>Training window: last {historyDays} days</div>
                <div>Look-ahead: {lookAhead} · horizon: 24 hourly points</div>
                <div>
                  Capacity model: ⌈load ÷ target({targetValue}%)⌉ per hour
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">24h Load Forecast (CPU %)</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    dashed line = target {targetValue}%
                  </span>
                </div>
                <div className="relative h-48 flex items-end gap-[2px]">
                  {/* threshold line */}
                  <div
                    className="absolute left-0 right-0 border-t-2 border-dashed border-amber-400 z-10"
                    style={{ bottom: `${targetValue}%` }}
                  >
                    <span className="absolute -top-5 right-0 text-[10px] font-mono text-amber-600 bg-white px-1">
                      target {targetValue}%
                    </span>
                  </div>
                  {forecast.map((v, h) => {
                    const isPeak = h === peakHour;
                    return (
                      <div key={h} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={`${String(h).padStart(2, "0")}:00 → ${v}% · needs ${requiredAt(v)} instance${requiredAt(v) === 1 ? "" : "s"}`}>
                        <div
                          className={`w-full rounded-t ${
                            isPeak
                              ? "bg-emerald-600"
                              : v > targetValue
                              ? "bg-amber-400"
                              : "bg-emerald-300"
                          }`}
                          style={{ height: `${Math.max(4, v)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1.5">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>23:00</span>
                </div>
              </div>

              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 space-y-2">
                <div className="text-xs font-mono text-emerald-700 font-bold uppercase tracking-wider">
                  🔮 Forecast Summary
                </div>
                <p className="text-sm font-mono text-slate-700">
                  Predicted peak: <span className="font-extrabold text-emerald-700">{peak}%</span> at{" "}
                  {String(peakHour).padStart(2, "0")}:00 → needs{" "}
                  <span className="font-extrabold text-emerald-700">{peakRequired} instance{peakRequired === 1 ? "" : "s"}</span>{" "}
                  vs desired {desiredCapacity} now
                </p>
                {predMode === "forecast-and-scale" ? (
                  <p className="text-xs font-mono text-slate-600">
                    → Pre-scale scheduled: set desired capacity to {peakRequired} at{" "}
                    {String(Math.max(0, peakHour - 1)).padStart(2, "0")}:00 (1h ahead of peak), then scale back down.
                  </p>
                ) : (
                  <p className="text-xs font-mono text-slate-600">
                    → Forecast-only: the model publishes predictions; no scaling actions are taken. Review accuracy
                    before enabling automatic mode.
                  </p>
                )}
                <div className="pt-2 border-t border-emerald-200 text-xs font-mono text-slate-500">
                  Best practice: pair predictive scaling (proactive) with target tracking (reactive) to absorb
                  forecast error.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Policy summary */}
        <div className="rounded-xl bg-slate-900 text-slate-200 p-5 font-mono text-xs space-y-1.5">
          <div className="text-emerald-400 font-bold uppercase tracking-wider text-[11px] mb-2">📄 Policy Summary</div>
          {policyType === "target-tracking" && (
            <>
              <div>Policy: TargetTrackingScaling</div>
              <div>Metric: aws/ec2 {ttMetric} · Target: {targetValue}% · Scale-in: {allowScaleIn ? "enabled" : "disabled"}</div>
              <div>Group: min {minInstances} · max {maxInstances} · desired {desiredCapacity}</div>
              <div className="text-emerald-400">
                Now: utilization {currentLoad}% → required {requiredCapacity} → {ttDelta > 0 ? `scale out +${ttDelta}` : ttDelta < 0 ? (allowScaleIn ? `scale in ${ttDelta}` : "held (scale-in disabled)") : "steady state"}
              </div>
            </>
          )}
          {policyType === "step-scaling" && (
            <>
              <div>Policy: StepScaling (CloudWatch alarm-driven)</div>
              <div>
                Steps:{" "}
                {stepRules.map((s) => `${s.kind === "out" ? "≥" : "≤"}${s.threshold}% ${s.kind === "out" ? "+" : "−"}${s.adjustment}`).join(" · ")}
              </div>
              <div>Cooldown: {cooldown}s · Group: min {minInstances} · max {maxInstances} · desired {desiredCapacity}</div>
              <div className="text-emerald-400">
                Now: metric {stepMetric}% → {triggeredStep ? `adjust ${triggeredStep.kind === "out" ? "+" : "−"}${triggeredStep.adjustment} → ${stepResultCapacity}` : "no step breached"}
              </div>
            </>
          )}
          {policyType === "predictive" && (
            <>
              <div>Policy: PredictiveScaling · Mode: {predMode === "forecast-and-scale" ? "ForecastAndScale" : "ForecastOnly"}</div>
              <div>Look-ahead: {lookAhead} · Training: {historyDays} days · Capacity model: ⌈load ÷ {targetValue}%⌉</div>
              <div>Group: min {minInstances} · max {maxInstances} · desired {desiredCapacity}</div>
              <div className="text-emerald-400">
                Peak {peak}% at {String(peakHour).padStart(2, "0")}:00 → pre-scale to {peakRequired} {predMode === "forecast-and-scale" ? "scheduled" : "(dry run — no action)"}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ================================================================ */}
      {/* MODULE 5: LIVE INSTANCE COUNT VISUALIZATION (#live-capacity) */}
      {/* ================================================================ */}
      <section
        id="live-capacity"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 card-shadow shadow-xl hover:border-emerald-400/40 transition-colors space-y-8"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono text-emerald-600 uppercase tracking-wider mb-1">
              Module 05 / Auto Scaling Group
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              <span>🖥️</span> Live Instance Count Visualization
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            ASG: demo-app · us-east-1
          </span>
        </div>

        <p className="text-sm text-slate-500 leading-relaxed">
          Watch an Auto Scaling group react to a synthetic load. The group scales out when load crosses{" "}
          <strong className="text-slate-900">78%</strong>, scales in below <strong className="text-slate-900">28%</strong>,
          and respects a <strong className="text-slate-900">2-tick cooldown</strong> between actions. New instances boot
          (<strong className="text-amber-600">Launching</strong> → <strong className="text-emerald-600">InService</strong>);
          removed instances drain before termination.
        </p>

        {/* Controls */}
        <div className="flex flex-wrap items-end gap-3 bg-slate-50 p-5 rounded-xl border border-slate-200">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">Min</label>
            <select
              value={capacityMin}
              onChange={(e) => setCapacityMin(Math.min(Number(e.target.value), capacityMax))}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-emerald-500 focus:outline-none"
            >
              {[1, 2, 3, 4, 5, 6].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">Max</label>
            <select
              value={capacityMax}
              onChange={(e) => setCapacityMax(Math.max(Number(e.target.value), capacityMin))}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-emerald-500 focus:outline-none"
            >
              {[4, 6, 8, 10, 12].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase font-mono">Desired Capacity</label>
            <input
              type="number"
              min={capacityMin}
              max={capacityMax}
              value={capacity}
              onChange={(e) => setManualCapacity(Number(e.target.value) || capacityMin)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <button
            onClick={toggleCapacitySim}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-colors ${
              isCapacityPlaying
                ? "bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {isCapacityPlaying ? "⏸ Pause Traffic" : "▶ Simulate Traffic"}
          </button>
          <button
            onClick={resetCapacitySim}
            className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors"
          >
            ↺ Reset
          </button>
          {cooldownTicks > 0 && (
            <span className="px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-700 border border-amber-200 text-xs font-mono font-bold">
              ⏳ Cooldown ({cooldownTicks} tick{cooldownTicks === 1 ? "" : "s"})
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: gauges + instances */}
          <div className="space-y-5">
            {/* Desired capacity bar */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                <span className="uppercase tracking-wider">Desired Capacity</span>
                <span>
                  <span className="text-emerald-600 font-extrabold text-base">{capacity}</span> / {capacityMax} max · min {capacityMin}
                </span>
              </div>
              <div className="relative h-6 rounded-lg bg-slate-200 overflow-visible">
                <div
                  className="absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-700"
                  style={{ width: `${capacityPct}%` }}
                />
                {/* min marker */}
                <div
                  className="absolute inset-y-0 w-0.5 bg-white border-x border-slate-400 z-10"
                  style={{ left: `${minMarkerPct}%` }}
                  title={`min ${capacityMin}`}
                />
                <span
                  className="absolute -top-6 text-[10px] font-mono text-slate-400"
                  style={{ left: `calc(${minMarkerPct}% - 8px)` }}
                >
                  min
                </span>
              </div>
            </div>

            {/* Load meter */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                <span className="uppercase tracking-wider">Synthetic Load</span>
                <span className={`font-extrabold text-base ${load >= 78 ? "text-rose-600" : load >= 55 ? "text-amber-600" : "text-emerald-600"}`}>
                  {load}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${loadBarColor}`}
                  style={{ width: `${load}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>scale in ≤ 28%</span>
                <span>scale out ≥ 78%</span>
              </div>
            </div>

            {/* Instance chips */}
            <div className="space-y-2">
              <div className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                Fleet ({instances.length} registered)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {instances.map((inst) => (
                  <div
                    key={inst.id}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2.5 transition-colors ${
                      inst.status === "InService"
                        ? "bg-emerald-50 border-emerald-200"
                        : inst.status === "Launching"
                        ? "bg-amber-50 border-amber-200"
                        : "bg-rose-50 border-rose-200"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-mono font-bold text-slate-900">{inst.id}</div>
                      <div className="text-[11px] font-mono text-slate-500">{inst.az}</div>
                    </div>
                    {inst.status === "InService" && (
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded-full">
                        InService
                      </span>
                    )}
                    {inst.status === "Launching" && (
                      <span className="text-[10px] font-mono font-bold text-amber-700 bg-white border border-amber-200 px-2 py-0.5 rounded-full animate-pulse">
                        Launching…
                      </span>
                    )}
                    {inst.status === "Terminating" && (
                      <span className="text-[10px] font-mono font-bold text-rose-700 bg-white border border-rose-200 px-2 py-0.5 rounded-full">
                        Terminating
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: activity log */}
          <div className="rounded-xl border border-slate-200 overflow-hidden self-start">
            <div className="bg-slate-50 px-4 py-2.5 text-xs font-mono text-slate-500 uppercase tracking-wider border-b border-slate-200">
              📜 Auto Scaling Activity Log
            </div>
            <div className="divide-y divide-[#30363d] max-h-96 overflow-y-auto">
              {activity.map((entry) => (
                <div key={entry.id} className="px-4 py-2.5 flex items-start gap-2.5 text-xs font-mono">
                  <span
                    className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                      entry.kind === "scale-out"
                        ? "bg-emerald-500"
                        : entry.kind === "scale-in"
                        ? "bg-amber-500"
                        : entry.kind === "warn"
                        ? "bg-violet-500"
                        : "bg-slate-300"
                    }`}
                  />
                  <div>
                    <div className="text-slate-400 text-[10px]">{entry.time}</div>
                    <div
                      className={`${
                        entry.kind === "scale-out"
                          ? "text-emerald-700 font-bold"
                          : entry.kind === "scale-in"
                          ? "text-amber-700 font-bold"
                          : entry.kind === "warn"
                          ? "text-violet-700"
                          : "text-slate-600"
                      }`}
                    >
                      {entry.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer note */}
      <div className="text-center text-xs font-mono text-slate-400 pb-4">
        AWS Auto Scaling &amp; Elastic Load Balancing · ELB v2 · ASG lifecycle: Pending → InService → Draining →
        Terminating
      </div>
    </div>
  );
}
