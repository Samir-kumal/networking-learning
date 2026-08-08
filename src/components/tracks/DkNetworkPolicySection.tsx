"use client";

import { useState, useMemo } from "react";

// ==========================================
// TYPES & INTERFACES
// ==========================================

type Protocol = "TCP" | "UDP" | "SCTP";
type Direction = "ingress" | "egress";
type PeerKind = "pod" | "namespace" | "cidr";
type IsolationMode = "open" | "isolate" | "same-ns";

interface PortSpec {
  id: string;
  port: string; // "" = all ports
  protocol: Protocol;
}

interface PeerSpec {
  id: string;
  kind: PeerKind;
  labels: string; // "a=b, c=d"
  cidr: string; // only for kind === "cidr"
}

interface PolicyRule {
  id: string;
  direction: Direction;
  name: string;
  enabled: boolean;
  port: PortSpec;
  peers: PeerSpec[];
}

interface SimEndpoint {
  id: string;
  kind: "pod" | "ns" | "cidr";
  name: string;
  ns: string;
  podLabels: Record<string, string>;
  nsLabels: Record<string, string>;
  ip: string;
}

interface SimResult {
  verdict: "ALLOW" | "DENY";
  matchedRuleName: string | null;
  trace: string[];
}

// ==========================================
// HELPERS
// ==========================================

function parseLabels(expr: string): Array<[string, string]> {
  return expr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const idx = s.indexOf("=");
      if (idx <= 0) return null;
      return [s.slice(0, idx).trim(), s.slice(idx + 1).trim()] as [string, string];
    })
    .filter((pair): pair is [string, string] => pair !== null && pair[0] !== "" && pair[1] !== "");
}

function labelsSubset(want: Array<[string, string]>, have: Record<string, string>): boolean {
  return want.every(([k, v]) => have[k] === v);
}

function ipToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const o = Number(p);
    if (!Number.isInteger(o) || o < 0 || o > 255) return null;
    n = (n << 8) | o;
  }
  return n >>> 0;
}

function ipInCidr(ip: string, cidr: string): boolean {
  const slash = cidr.indexOf("/");
  const net = slash === -1 ? cidr : cidr.slice(0, slash);
  const prefix = slash === -1 ? 32 : Number(cidr.slice(slash + 1));
  const a = ipToInt(ip);
  const b = ipToInt(net);
  if (a === null || b === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (a & mask) === (b & mask);
}

function peerSummary(peer: PeerSpec): string {
  if (peer.kind === "pod") return peer.labels.trim() || "(all pods)";
  if (peer.kind === "namespace") return peer.labels.trim() || "(all namespaces)";
  return peer.cidr.trim() || "0.0.0.0/0";
}

function fmtPort(p: PortSpec): string {
  return p.port === "" ? `${p.protocol} all` : `${p.port}/${p.protocol}`;
}

// ==========================================
// MOCK / DEFAULT DATA
// ==========================================

const INITIAL_RULES: PolicyRule[] = [
  {
    id: "r-ing-01",
    direction: "ingress",
    name: "allow-frontend-web",
    enabled: true,
    port: { id: "rp-11", port: "80", protocol: "TCP" },
    peers: [
      { id: "rp-ing-01", kind: "pod", labels: "app=frontend", cidr: "" },
      { id: "rp-ing-02", kind: "namespace", labels: "app=payments", cidr: "" },
    ],
  },
  {
    id: "r-ing-02",
    direction: "ingress",
    name: "allow-monitoring",
    enabled: true,
    port: { id: "rp-21", port: "9090", protocol: "TCP" },
    peers: [{ id: "rp-ing-03", kind: "namespace", labels: "role=monitoring", cidr: "" }],
  },
  {
    id: "r-egr-01",
    direction: "egress",
    name: "allow-db-out",
    enabled: true,
    port: { id: "rp-31", port: "3306", protocol: "TCP" },
    peers: [{ id: "rp-egr-01", kind: "namespace", labels: "app=db", cidr: "" }],
  },
  {
    id: "r-egr-02",
    direction: "egress",
    name: "allow-payments-lb",
    enabled: true,
    port: { id: "rp-41", port: "443", protocol: "TCP" },
    peers: [{ id: "rp-egr-02", kind: "cidr", labels: "", cidr: "203.0.113.0/24" }],
  },
];

const ENDPOINTS: SimEndpoint[] = [
  {
    id: "ep-front",
    kind: "pod",
    name: "frontend-web",
    ns: "prod",
    podLabels: { app: "frontend", tier: "web" },
    nsLabels: { team: "storefront", role: "prod" },
    ip: "10.0.1.12",
  },
  {
    id: "ep-api",
    kind: "pod",
    name: "api-gateway",
    ns: "prod",
    podLabels: { app: "api", tier: "backend" },
    nsLabels: { team: "storefront", role: "prod" },
    ip: "10.0.1.30",
  },
  {
    id: "ep-pay",
    kind: "ns",
    name: "payments namespace",
    ns: "payments",
    podLabels: {},
    nsLabels: { app: "payments" },
    ip: "10.0.2.10",
  },
  {
    id: "ep-mon",
    kind: "ns",
    name: "monitoring namespace",
    ns: "monitoring",
    podLabels: {},
    nsLabels: { role: "monitoring" },
    ip: "10.0.4.7",
  },
  {
    id: "ep-db",
    kind: "ns",
    name: "database namespace",
    ns: "db",
    podLabels: {},
    nsLabels: { app: "db" },
    ip: "10.0.5.21",
  },
  {
    id: "ep-ext",
    kind: "cidr",
    name: "External LB (203.0.113.0/24)",
    ns: "external",
    podLabels: {},
    nsLabels: {},
    ip: "203.0.113.42",
  },
  {
    id: "ep-ext2",
    kind: "cidr",
    name: "External CI Runner (198.51.100.9)",
    ns: "external",
    podLabels: {},
    nsLabels: {},
    ip: "198.51.100.9",
  },
];

const NEW_RULE_TEMPLATE: Omit<PolicyRule, "id" | "name"> = {
  direction: "ingress",
  enabled: true,
  port: { id: "", port: "80", protocol: "TCP" },
  peers: [{ id: "", kind: "pod", labels: "app=frontend", cidr: "" }],
};

// ==========================================
// COMPONENT
// ==========================================

export default function DkNetworkPolicySection() {
  // --- Policy metadata ---
  const [policyName, setPolicyName] = useState<string>("web-api-allowlist");
  const [policyNamespace, setPolicyNamespace] = useState<string>("prod");
  const [podSelector, setPodSelector] = useState<string>("app=web, tier=frontend");
  const [isolation, setIsolation] = useState<IsolationMode>("isolate");

  // --- Rules ---
  const [rules, setRules] = useState<PolicyRule[]>(INITIAL_RULES);
  const [showRuleForm, setShowRuleForm] = useState<boolean>(false);
  const [newDirection, setNewDirection] = useState<Direction>("ingress");

  // --- Simulator state ---
  const [simDirection, setSimDirection] = useState<Direction>("ingress");
  const [simEndpointId, setSimEndpointId] = useState<string>("ep-front");
  const [simPort, setSimPort] = useState<string>("8080");
  const [simProtocol, setSimProtocol] = useState<Protocol>("TCP");
  const [simLog, setSimLog] = useState<string[]>([]);
  const [simResult, setSimResult] = useState<{ allowed: boolean; reason: string } | null>(null);

  // --- YAML copy state ---
  const [copied, setCopied] = useState<boolean>(false);

  const policyLabels = useMemo(() => parseLabels(podSelector), [podSelector]);

  const simEndpoint = useMemo(() => ENDPOINTS.find((e) => e.id === simEndpointId) ?? ENDPOINTS[0], [simEndpointId]);

  // --- Rule CRUD ---
  const updateRule = (ruleId: string, patch: Partial<PolicyRule>) => {
    setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)));
  };

  const updatePeer = (ruleId: string, peerId: string, patch: Partial<PeerSpec>) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? { ...r, peers: r.peers.map((p) => (p.id === peerId ? { ...p, ...patch } : p)) }
          : r
      )
    );
  };

  const addPeer = (ruleId: string, kind: PeerKind) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? {
              ...r,
              peers: [
                ...r.peers,
                { id: `peer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind, labels: kind === "cidr" ? "" : "app=new", cidr: kind === "cidr" ? "10.0.0.0/24" : "" },
              ],
            }
          : r
      )
    );
  };

  const removePeer = (ruleId: string, peerId: string) => {
    setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, peers: r.peers.filter((p) => p.id !== peerId) } : r)));
  };

  const toggleRule = (ruleId: string) => {
    setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r)));
  };

  const removeRule = (ruleId: string) => {
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
  };

  const addRule = (e: React.FormEvent) => {
    e.preventDefault();
    const ruleId = `rule-${Date.now()}`;
    const rule: PolicyRule = {
      ...NEW_RULE_TEMPLATE,
      id: ruleId,
      name: `allow-${newDirection}-${rules.length + 1}`,
      direction: newDirection,
      port: { id: `port-${Date.now()}`, port: "80", protocol: "TCP" },
      peers: [{ id: `peer-${Date.now()}`, kind: "pod", labels: "app=svc", cidr: "" }],
    };
    setRules((prev) => [...prev, rule]);
    setShowRuleForm(false);
  };

  // --- Peer matching helpers (used by sim + flow)
  const peerHit = (peer: PeerSpec, ep: SimEndpoint): boolean => {
    if (ep.kind === "cidr") return peer.kind === "cidr" && ipInCidr(ep.ip, peer.cidr);
    if (peer.kind === "pod") return ep.kind === "pod" && labelsSubset(parseLabels(peer.labels), ep.podLabels);
    if (peer.kind === "namespace") return labelsSubset(parseLabels(peer.labels), ep.nsLabels);
    return false;
  };

  // --- Simulator execution
  const runSimulation = () => {
    const steps: string[] = [];
    const matched: string[] = [];
    let matchedRule: string | null = null;
    let allowed = false;
    let reason = "";

    steps.push(`[policy] ${policyName} in ns ${policyNamespace}, selector: ${podSelector || "{ all pods }"}`);
    steps.push(`[target] ${simEndpoint.kind} "${simEndpoint.name}" in ns ${simEndpoint.ns}, IP ${simEndpoint.ip}`);
    steps.push(`[direction] ${simDirection.toUpperCase()} flow on ${fmtPort({ id: "x", port: simPort, protocol: simProtocol })}`);

    const applicable = rules.filter((r) => r.enabled && r.direction === simDirection);
    steps.push(`[rules] ${applicable.length} enabled ${simDirection} rule(s) to evaluate`);

    for (const rule of applicable) {
      const hitPeer = rule.peers.find((p) => peerHit(p, simEndpoint));
      const portMatch = rule.port.port === "" || rule.port.port === simPort;
      const protoMatch = rule.port.protocol === simProtocol;
      if (hitPeer && portMatch && protoMatch) {
        steps.push(
          `  ✓ rule "${rule.name}" peer "${peerSummary(hitPeer)}" matches, port ${fmtPort({
            id: "x",
            port: rule.port.port,
            protocol: rule.port.protocol,
          })} → ALLOW`
        );
        matched.push(rule.name);
        matchedRule = rule.name;
      } else if (hitPeer) {
        steps.push(`  ✗ rule "${rule.name}" peer matches, but port ${fmtPort({ id: "x", port: rule.port.port, protocol: rule.port.protocol })} ≠ simulated ${simPort}/${simProtocol}`);
      } else {
        steps.push(`  ✗ rule "${rule.name}" — no peer matches ${simEndpoint.name}`);
      }
    }

    // Namespace isolation: same-namespace default allow
    if (isolation === "same-ns" && simDirection === "ingress" && simEndpoint.ns === policyNamespace && matched.length === 0) {
      matched.push("(same-namespace default)");
      steps.push(`  ↳ namespace isolation "allow same namespace": ${simEndpoint.ns} matches policy ns ${policyNamespace}`);
    }

    if (matched.length > 0) {
      matchedRule = matched[0];
      allowed = true;
      reason = `ALLOW by ${matchedRule}`;
      steps.push(`[verdict] ALLOW — matched ${matchedRule}`);
    } else if (isolation === "open") {
      allowed = true;
      reason = `DEFAULT ALLOW (no isolation — traffic outside any selected rule is permitted)`;
      steps.push(`[verdict] DEFAULT ALLOW — isolation=open`);
    } else {
      allowed = false;
      reason = `DENIED by default-${simDirection} isolation (no matching enabled rule)`;
      steps.push(`[verdict] DENY — default-${simDirection} isolation active`);
    }

    setSimLog(steps);
    setSimResult({ allowed, reason });
  };

  // --- YAML Generation ---
  const yaml = useMemo(() => {
    const lines: string[] = [];
    const put = (s = "") => lines.push(s);

    put("apiVersion: networking.k8s.io/v1");
    put("kind: NetworkPolicy");
    put("metadata:");
    put(`  name: ${policyName || "my-policy"}`);
    put(`  namespace: ${policyNamespace || "default"}`);
    put("spec:");
    put("  podSelector:");
    if (policyLabels.length === 0) {
      put("    {}");
    } else {
      put("    matchLabels:");
      for (const [k, v] of policyLabels) put(`      ${k}: ${v}`);
    }
    if (isolation === "open") {
      put("  policyTypes: []  # open mode — no default-deny");
    } else if (isolation === "same-ns") {
      put("  policyTypes: [Ingress, Egress]  # isolation: allow only same-namespace");
      put("  ingress:");
      put("    - from:");
      put("        - podSelector: {}  # same-namespace pods only");
      for (const r of rules.filter((r) => r.direction === "ingress" && r.enabled)) {
        put(`    # rule: ${r.name}`);
        put("    - from:");
        for (const p of r.peers) {
          put(`        - ${yamlPeer(p)}`);
        }
        put("      ports:");
        put(`        - port: ${r.port.port === "" ? "null" : r.port.port}`);
        put(`          protocol: ${r.port !== undefined ? r.port.protocol : "TCP"}`);
      }
      put("  egress:");
      const egresses = rules.filter((r) => r.direction === "egress" && r.enabled);
      if (egresses.length === 0) put("    []  # deny all egress");
      else {
        for (const r of egresses) {
          put(`    # rule: ${r.name}`);
          put("    - to:");
          for (const p of r.peers) put(`        - ${yamlPeer(p)}`);
          put("      ports:");
          put(`        - port: ${r.port === undefined || r.port.port === "" ? "null" : r.port.port}`);
          put(`          protocol: ${r.port === undefined ? "TCP" : r.port.protocol}`);
        }
      }
    } else {
      put("  policyTypes: [Ingress, Egress]");
      const ingresses = rules.filter((r) => r.direction === "ingress" && r.enabled);
      put("  ingress:");
      if (ingresses.length === 0) put("    []  # deny all ingress");
      for (const r of ingresses) {
        put(`    # rule: ${r.name}`);
        put("    - from:");
        for (const p of r.peers) put(`        - ${yamlPeer(p)}`);
        put("      ports:");
        put(`        - port: ${r.port === undefined || r.port.port === "" ? "null" : r.port.port}`);
        put(`          protocol: ${r.port === undefined ? "TCP" : r.port.protocol}`);
      }
      const egresses = rules.filter((r) => r.direction === "egress" && r.enabled);
      put("  egress:");
      if (egresses.length === 0) put("    []  # deny all egress");
      for (const r of egresses) {
        put(`    # rule: ${r.name}`);
        put("    - to:");
        for (const p of r.peers) put(`        - ${yamlPeer(p)}`);
        put("      ports:");
        put(`        - port: ${r.port === undefined || r.port.port === "" ? "null" : r.port.port}`);
        put(`          protocol: ${r.port === undefined ? "TCP" : r.port.protocol}`);
      }
    }
    return lines.join("\n");
    function yamlPeer(p: PeerSpec): string {
      if (p.kind === "pod") {
        if (p.labels.trim() === "") return "podSelector: {}";
        const pairs = parseLabels(p.labels);
        if (pairs.length === 0) return "podSelector: {}";
        const inner = pairs.map(([k, v]) => `              ${k}: ${v}`).join("\n");
        return `podSelector:\n            matchLabels:\n${inner}`;
      }
      if (p.kind === "namespace") {
        if (p.labels.trim() === "") return "namespaceSelector: {}";
        const pairs = parseLabels(p.labels);
        if (pairs.length === 0) return "namespaceSelector: {}";
        const inner = pairs.map(([k, v]) => `              ${k}: ${v}`).join("\n");
        return `namespaceSelector:\n            matchLabels:\n${inner}`;
      }
      return `ipBlock:\n            cidr: ${p.cidr || "0.0.0.0/0"}`;
    }
  }, [policyName, policyNamespace, policyLabels, rules, isolation]);

  const copyYaml = async () => {
    try {
      await navigator.clipboard.writeText(yaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  // --- Flow: peers per direction for diagram
  const ingressPeers = useMemo(
    () =>
      rules
        .filter((r) => r.enabled && r.direction === "ingress")
        .flatMap((r) => r.peers.map((p) => ({ rule: r, peer: p }))),
    [rules]
  );
  const egressPeers = useMemo(
    () =>
      rules
        .filter((r) => r.enabled && r.direction === "egress")
        .flatMap((r) => r.peers.map((p) => ({ rule: r, peer: p }))),
    [rules]
  );

  const isDeny = isolation !== "open";

  const directionBadge = (d: Direction) =>
    d === "ingress" ? (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300">IN</span>
    ) : (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">OUT</span>
    );

  const peerKindBadge = (k: PeerKind) => {
    const map: Record<PeerKind, string> = {
      pod: "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-700",
      namespace: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700",
      cidr: "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700",
    };
    return <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${map[k]}`}>{k}</span>;
  };

  const isolationLabel: Record<IsolationMode, string> = {
    open: "Open (no isolation)",
    isolate: "Isolate namespace (deny all by default)",
    "same-ns": "Allow same-namespace only",
  };

  const isolationDesc: Record<IsolationMode, string> = {
    open: "NetworkPolicy is inactive — all traffic is allowed unless your rules match.",
    isolate: "Deny-by-default: unmatched ingress AND egress traffic is dropped.",
    "same-ns": "Only same-namespace pods may reach this pod; cross-ns and external traffic denied.",
  };

  return (
    <section id="netpol" className="scroll-mt-20 space-y-6">
      {/* ======= Header ======= */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 card-shadow">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border border-sky-300/50 text-xs font-mono font-semibold">
            K8s · Network Policies
          </span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Kubernetes Network Policy Visual Builder 🛡️
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Build ingress/egress allowlists with pod, namespace and CIDR selectors — then preview the
          traffic flow, generated YAML, and a live allow/deny simulator.
        </p>
      </div>

      {/* ======= Rule Builder + Simulator ======= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- Rule Builder --- */}
        <div id="netpol-rules" className="lg:col-span-2 p-5 rounded-xl bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 card-shadow space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="text-sky-600 dark:text-sky-400">🛡️</span> Ingress / Egress Rule Builder
            </h4>
            <span className="text-[11px] font-mono text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 rounded px-2 py-0.5">
              {rules.filter((r) => r.enabled).length} active
            </span>
          </div>

          {/* Policy scope editor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-sky-50/50 border border-sky-100 dark:border-sky-700 rounded-lg p-3">
            <label className="block">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Policy name</span>
              <input
                value={policyName}
                onChange={(e) => setPolicyName(e.target.value)}
                className="mt-1 w-full px-2 py-1.5 rounded-md bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:border-sky-400"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Namespace</span>
              <input
                value={policyNamespace}
                onChange={(e) => setPolicyNamespace(e.target.value)}
                className="mt-1 w-full px-2 py-1.5 rounded-md bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:border-sky-400"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                podSelector matchLabels (a=b, c=d)
              </span>
              <input
                value={podSelector}
                onChange={(e) => setPodSelector(e.target.value)}
                className="mt-1 w-full px-2 py-1.5 rounded-md bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:border-sky-400"
              />
            </label>
          </div>

          {/* Rule cards */}
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`rounded-lg border p-3 space-y-2 transition-colors ${
                  rule.enabled ? "border-sky-200 dark:border-sky-700 bg-white dark:bg-slate-800" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 opacity-80"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {directionBadge(rule.direction)}
                  <input
                    value={rule.name}
                    onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                    className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 outline-none focus:border-sky-400"
                  />
                  <label className="flex items-center gap-1.5 ml-auto text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => toggleRule(rule.id)}
                      className="rounded accent-sky-600"
                    />
                    enabled
                  </label>
                  <button
                    onClick={() => removeRule(rule.id)}
                    className="text-[10px] font-mono px-2 py-1 rounded border border-rose-200 dark:border-rose-700 text-rose-500 dark:text-rose-400 hover:bg-rose-50"
                  >
                    ✕ delete
                  </button>
                </div>

                {/* direction toggle */}
                <div className="flex items-center gap-1.5">
                  {(["ingress", "egress"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => updateRule(rule.id, { direction: d, name: rule.name })}
                      className={`px-2 py-0.5 text-[11px] font-mono rounded-full border transition-colors ${
                        rule.direction === d
                          ? "bg-sky-600 text-white border-sky-600"
                          : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {d.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* peers */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Peers (any match)</div>
                  {rule.peers.map((peer) => (
                    <div key={peer.id} className="flex flex-wrap items-center gap-1.5">
                      {peerKindBadge(peer.kind)}
                      <select
                        value={peer.kind}
                        onChange={(e) => {
                          const kind = e.target.value as PeerKind;
                          updatePeer(rule.id, peer.id, {
                            kind,
                            labels: kind === "cidr" ? "" : peer.labels,
                            cidr: kind === "cidr" ? (peer.cidr || "10.0.0.0/24") : "",
                          });
                        }}
                        className="px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-[11px] font-mono bg-white dark:bg-slate-800"
                      >
                        <option>pod</option>
                        <option>namespace</option>
                        <option>cidr</option>
                      </select>
                      {peer.kind === "cidr" ? (
                        <input
                          value={peer.cidr}
                          onChange={(e) => updatePeer(rule.id, peer.id, { cidr: e.target.value })}
                          placeholder="10.0.0.0/24"
                          className="flex-1 min-w-[120px] px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-mono bg-white dark:bg-slate-800 outline-none focus:border-sky-400"
                        />
                      ) : (
                        <input
                          value={peer.labels}
                          onChange={(e) => updatePeer(rule.id, peer.id, { labels: e.target.value })}
                          placeholder={peer.kind === "pod" ? "app=frontend, tier=web" : "role=monitoring"}
                          className="flex-1 min-w-[120px] px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-mono bg-white dark:bg-slate-800 outline-none focus:border-sky-400"
                        />
                      )}
                      <button
                        onClick={() => removePeer(rule.id, peer.id)}
                        className="text-slate-400 dark:text-slate-500 hover:text-rose-500 text-xs font-mono px-1"
                        title="Remove peer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addPeer(rule.id, "pod")}
                    className="text-[11px] font-mono text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300"
                  >
                    + add peer
                  </button>
                </div>

                {/* port */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">port</span>
                  <input
                    value={rule.port.port}
                    onChange={(e) => updateRule(rule.id, { port: { ...rule.port, port: e.target.value } })}
                    placeholder="80 (blank = all)"
                    className="w-20 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-mono bg-white dark:bg-slate-800 outline-none focus:border-sky-400"
                  />
                  <select
                    value={rule.port.protocol}
                    onChange={(e) =>
                      updateRule(rule.id, { port: { ...rule.port, protocol: e.target.value as Protocol } })
                    }
                    className="px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-[11px] font-mono bg-white dark:bg-slate-800"
                  >
                    <option>TCP</option>
                    <option>UDP</option>
                    <option>SCTP</option>
                  </select>
                </div>
              </div>
            ))}

            {/* Add rule */}
            {showRuleForm ? (
              <form
                onSubmit={addRule}
                className="rounded-lg border border-dashed border-sky-300 dark:border-sky-600 bg-sky-50/40 p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">New rule direction:</span>
                  {(["ingress", "egress"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setNewDirection(d)}
                      className={`px-2 py-0.5 text-[11px] font-mono rounded-full border ${
                        newDirection === d
                          ? "bg-sky-600 text-white border-sky-600"
                          : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-md bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 dark:hover:bg-sky-600"
                  >
                    + Create rule
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRuleForm(false)}
                    className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}
            {!showRuleForm && (
              <button
                onClick={() => setShowRuleForm(true)}
                className="w-full py-2 rounded-lg border border-dashed border-sky-300 dark:border-sky-600 text-sky-600 dark:text-sky-400 text-xs font-semibold hover:bg-sky-50"
              >
                + Add new {newDirection} rule
              </button>
            )}
          </div>
        </div>

        {/* --- Simulator --- */}
        <div id="netpol-sim" className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 card-shadow space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
            <span className="text-sky-600 dark:text-sky-400">🧪</span> Policy Effect Simulator
          </h4>

          <label className="block">
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Traffic direction</span>
            <div className="mt-1 flex gap-1.5">
              {(["ingress", "egress"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setSimDirection(d)}
                  className={`flex-1 px-2 py-1.5 rounded-md border text-xs font-mono ${
                    simDirection === d
                      ? "bg-sky-600 text-white border-sky-600"
                      : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {d === "ingress" ? "IN → pod" : "pod → OUT"}
                </button>
              ))}
            </div>
          </label>

          <label className="block">
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">
              {simDirection === "ingress" ? "Source endpoint" : "Destination endpoint"}
            </span>
            <select
              value={simEndpointId}
              onChange={(e) => setSimEndpointId(e.target.value)}
              className="mt-1 w-full px-2 py-1.5 rounded-md border border-sky-200 dark:border-sky-700 text-xs font-mono bg-white dark:bg-slate-800 outline-none focus:border-sky-400"
            >
              {ENDPOINTS.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  [{ep.kind}] {ep.ns} · {ep.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Port</span>
              <input
                value={simPort}
                onChange={(e) => setSimPort(e.target.value)}
                className="mt-1 w-full px-2 py-1.5 rounded-md border border-sky-200 dark:border-sky-700 text-xs font-mono bg-white dark:bg-slate-800 outline-none focus:border-sky-400"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Protocol</span>
              <select
                value={simProtocol}
                onChange={(e) => setSimProtocol(e.target.value as Protocol)}
                className="mt-1 w-full px-2 py-1.5 rounded-md border border-sky-200 dark:border-sky-700 text-xs font-mono bg-white dark:bg-slate-800 outline-none focus:border-sky-400"
              >
                <option>TCP</option>
                <option>UDP</option>
                <option>SCTP</option>
              </select>
            </label>
          </div>

          <button
            onClick={runSimulation}
            className={`w-full py-2 rounded-md text-xs font-bold transition-colors ${
              isolation === "open"
                ? "bg-emerald-600 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600"
                : "bg-sky-600 text-white hover:bg-sky-700 dark:hover:bg-sky-600"
            }`}
          >
            ▶ Run simulation ({isolationLabel[isolation]})
          </button>

          {simResult && (
            <div
              className={`p-3 rounded-lg border text-xs font-mono ${
                simResult.allowed
                  ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-300"
              }`}
            >
              <div className="text-sm font-bold">{simResult.allowed ? "✅ ALLOW" : "🚫 DENY"}</div>
              <div className="mt-1 whitespace-pre-wrap">{simResult.reason}</div>
            </div>
          )}

          {simLog.length > 0 && (
            <div className="rounded-lg bg-slate-900 text-slate-300 dark:text-slate-400 p-3 text-[10px] font-mono leading-5 max-h-48 overflow-auto">
              {simLog.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ======= Traffic Flow Diagram ======= */}
      <div id="netpol-flow" className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 card-shadow space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-sky-600 dark:text-sky-400">📡</span> Visual Traffic Flow
          </h4>
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="text-emerald-600 dark:text-emerald-400">● allowed</span>
            <span className="text-rose-500 dark:text-rose-400">● denied (default)</span>
            <span className="text-slate-400 dark:text-slate-500">→ rule direction</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
          {/* INGRESS SOURCES */}
          <div className="rounded-lg bg-sky-50/60 border border-sky-200 dark:border-sky-700 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-full bg-sky-600 text-white text-[10px] font-bold">INGRESS</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">→ protected pod</span>
            </div>
            {ingressPeers.length === 0 && (
              <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500">No ingress rules — default:</div>
            )}
            {ingressPeers.map(({ rule, peer }) => (
              <div
                key={`${rule.id}-${peer.id}`}
                className="flex items-center gap-1.5 py-1 border-b border-sky-100 dark:border-sky-700 last:border-0"
              >
                <span className="text-[10px] font-mono text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/40 rounded px-1.5 py-0.5 truncate max-w-[130px]">
                  {peerSummary(peer)}
                </span>
                <span className="text-[10px] text-sky-500 dark:text-sky-400">→</span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{fmtPort(rule.port)}</span>
                <span className="ml-auto text-[10px] font-mono text-emerald-600 dark:text-emerald-400">ALLOW</span>
              </div>
            ))}
            {/* default unmatched traffic */}
            <div className="flex items-center gap-1.5 py-1 opacity-80">
              <span className="text-[10px] font-mono rounded px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                unmatched traffic
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">→</span>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">any port</span>
              <span
                className={`ml-auto text-[10px] font-mono ${
                  isDeny ? "text-rose-500 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {isDeny ? "DENY" : "ALLOW"}
              </span>
            </div>
          </div>

          {/* CENTER POD */}
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-full max-w-[190px] p-4 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white card-shadow text-center">
              <div className="text-[10px] font-mono uppercase tracking-wider text-sky-100">Pod(s)</div>
              <div className="text-sm font-bold font-mono mt-1">{policyName}</div>
              <div className="text-[10px] font-mono text-sky-100 mt-1">
                {policyLabels.map(([k, v]) => `${k}=${v}`).join(", ") || "{ all pods }"}
              </div>
              <div className="mt-2 inline-block px-1.5 py-0.5 rounded bg-white/20 text-[9px] font-mono text-white">
                ns: {policyNamespace}
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
              status: {isDeny ? "🔒 deny-by-default" : "open (allow-all default)"}
            </div>
          </div>

          {/* EGRESS TARGETS */}
          <div className="rounded-lg bg-blue-50/60 border border-blue-200 dark:border-blue-700 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold">EGRESS</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">protected pod →</span>
            </div>
            {egressPeers.length === 0 && (
              <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500">No enabled egress — default:</div>
            )}
            {egressPeers.map(({ rule, peer }) => (
              <div
                key={`${rule.id}-${peer.id}`}
                className="flex items-center gap-1.5 py-1 border-b border-blue-100 dark:border-blue-700 last:border-0"
              >
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{fmtPort(rule.port)}</span>
                <span className="text-[10px] text-blue-500 dark:text-blue-400">→</span>
                <span className="text-[10px] font-mono text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 rounded px-1.5 py-0.5 truncate max-w-[130px]">
                  {peerSummary(peer)}
                </span>
                <span className="ml-auto text-[10px] font-mono text-emerald-600 dark:text-emerald-400">ALLOW</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 py-1 opacity-80">
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">any port</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">→</span>
              <span className="text-[10px] font-mono rounded px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                unmatched traffic
              </span>
              <span
                className={`ml-auto text-[10px] font-mono ${
                  isDeny ? "text-rose-500 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {isDeny ? "DENY" : "ALLOW"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 p-3 text-[11px] leading-5 text-slate-600 dark:text-slate-300">
          <span className="font-bold text-slate-800 dark:text-slate-200">How to read:</span> arrows show the direction a
          packet travels. <span className="text-emerald-600 dark:text-emerald-400 font-mono">ALLOW</span> rows come from
          enabled rules; the <span className="font-mono">unmatched traffic</span> row shows the{" "}
          {isDeny ? "default-deny verdict when the namespace is isolated" : "allow-open verdict when no isolation is applied"}.
          Kubernetes NetworkPolicies are <b>allowlist-only</b> — rules never explicitly "deny", the
          isolation default does.
        </div>
      </div>

      {/* ======= YAML Generator + Isolation ======= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- YAML --- */}
        <div id="netpol-yaml" className="lg:col-span-2 p-5 rounded-xl bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 card-shadow space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="text-sky-600 dark:text-sky-400">📄</span> Generated YAML
            </h4>
            <button
              onClick={copyYaml}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${
                copied
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "border-sky-200 dark:border-sky-700 text-sky-700 dark:text-sky-300 hover:bg-sky-50"
              }`}
            >
              {copied ? "✓ Copied!" : "Copy YAML"}
            </button>
          </div>
          <pre className="rounded-lg bg-slate-900 text-sky-100 p-4 text-[11px] font-mono leading-5 overflow-x-auto whitespace-pre-wrap">
            {yaml}
          </pre>
        </div>

        {/* --- Isolation --- */}
        <div id="netpol-isolation" className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 card-shadow space-y-3">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
            <span className="text-sky-600 dark:text-sky-400">🔒</span> Namespace Isolation Mode
          </h4>
          <div className="space-y-2">
            {(["open", "same-ns", "isolate"] as IsolationMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setIsolation(mode)}
                className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors ${
                  isolation === mode
                    ? "border-sky-400 bg-sky-50 dark:bg-sky-900/30 ring-1 ring-sky-200"
                    : "border-slate-200 dark:border-slate-700 hover:border-sky-200"
                }`}
              >
                <div className="font-bold text-slate-800 dark:text-slate-200">{isolationLabel[mode]}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{isolationDesc[mode]}</div>
              </button>
            ))}
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 p-2.5 text-[11px] font-mono text-slate-600 dark:text-slate-300 leading-5">
            <div className="text-slate-800 dark:text-slate-200 font-bold mb-1">policyTypes</div>
            {isolation === "open"
              ? "[] → no pod is denied by default"
              : "[Ingress, Egress] → default-deny both directions"}
          </div>
        </div>
      </div>
    </section>
  );
}