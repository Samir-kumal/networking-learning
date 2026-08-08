"use client";

import { useState, useMemo } from "react";

// ==========================================
// TYPES
// ==========================================

type CompareTab = "matrix" | "nginx" | "istio";
type PathType = "Prefix" | "Exact" | "ImplementationSpecific";
type IngressClass = "nginx" | "istio-gateway";
type MTLSSMode = "DISABLE" | "PERMISSIVE" | "STRICT";

interface RouteRule {
  id: string;
  path: string;
  pathType: PathType;
  backend: string;
  port: number;
  enabled: boolean;
}

interface ComparisonRow {
  dimension: string;
  nginx: string;
  istio: string;
  nginxScore: number; // 0-100 relative strength
  istioScore: number;
  note: string;
}

interface VsTab {
  tab: string;
  title: string;
  payload: string;
}

// ==========================================
// CONSTANTS & MOCK DATA
// ==========================================

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    dimension: "L7 North-South Edge Routing",
    nginx: "Native Ingress controller: host-based rules, path prefixes, TLS at the edge",
    istio: "Routed through Istio IngressGateway (Envoy) — also exposed as a Gateway API",
    nginxScore: 92,
    istioScore: 70,
    note: "Both terminate TLS at the edge; NGINX is the battle-tested default for plain Ingress.",
  },
  {
    dimension: "mTLS & Workload Identity",
    nginx: "No mesh identity — services must handle their own certs, if at all",
    istio: "Automatic mutual TLS with SPIFFE workload certs rotated by istiod (PERMISSIVE/STRICT)",
    nginxScore: 10,
    istioScore: 98,
    note: "The core reason teams adopt a mesh: encrypted east-west traffic with zero app changes.",
  },
  {
    dimension: "Traffic Splitting & Weighted Canary",
    nginx: "Header / cookie canary annotations + canary-weight distribution between two backends",
    istio: "Weighted route subsets, header conditions, A/B splits, fault injection, retries, timeouts",
    nginxScore: 55,
    istioScore: 95,
    note: "NGINX canaries are per-Ingress (one split); Istio splits across the whole mesh per-service.",
  },
  {
    dimension: "Traffic Mirroring (Shadowing)",
    nginx: "mirror-* annotations copy requests to a shadow backend (no percentage control)",
    istio: "mirror + mirrorWeight on any VirtualService route — exact % control, optional response discard",
    nginxScore: 45,
    istioScore: 90,
    note: "Istio's mirrorWeight makes shadowing precise; NGINX mirrors blindly at request level.",
  },
  {
    dimension: "TLS Termination Flexibility",
    nginx: "Ingress tls block, cert-manager annotations, custom TLS protocols & proxy protocols",
    istio: "TLS termination at gateway + per-node deeper: SNI routing, mTLS passthrough options",
    nginxScore: 90,
    istioScore: 78,
    note: "NGINX is the workhorse for classic certs; Istio adds SNI-aware routing and mesh-native certs.",
  },
  {
    dimension: "Retries, Fault Injection, Timeouts",
    nginx: "Annotations for simple retries/timeouts; no fault injection simulation",
    istio: "First-class HTTP fault injection (abort/delay), per-route retries and timeout policies",
    nginxScore: 30,
    istioScore: 88,
    note: "Chaos-engineering tools only exist in the mesh data plane.",
  },
  {
    dimension: "East-West (Pod-to-Pod) Routing",
    nginx: "Not applicable — Ingress only handles external traffic",
    istio: "Service entries, headless service routing, locality load balancing, DNS proxying",
    nginxScore: 5,
    istioScore: 90,
    note: "If you only need edge routing, NGINX is enough; east-west traffic requires a mesh.",
  },
  {
    dimension: "Operational Complexity",
    nginx: "One Deployment + ConfigMap; simple, few moving parts, huge community",
    istio: "istiod control plane, sidecar injection, RBAC, mTLS policies — real learning curve",
    nginxScore: 85,
    istioScore: 40,
    note: "NGINX 'just works'; Istio needs a mesh-operations discipline to run safely.",
  },
];

const NGNIX_DEEP_INFO = `# 1. IngressClassName selects the controller
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: payments
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: letsencrypt-prod
    # Canary: send 10% to v2 backend
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"
spec:
  ingressClassName: nginx
  tls:
    - hosts: [app.example.com]
      secretName: app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /api/v1
            pathType: Prefix
            backend:
              service:
                name: api-v1-svc
                port:
                  number: 8080`;

const ISTIO_DEEP_INFO = `# 1) Gateway — the edge listener (Envoy)
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: app-gw
  namespace: edge
spec:
  selector:
    istio: ingressgateway
  servers:
    - port: { number: 443, name: https, protocol: HTTPS }
      tls:
        mode: SIMPLE
        credentialName: app-tls   # K8s Secret, same cert store
      hosts: ["app.example.com"]

# 2) VirtualService — routing + weight + mirror
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-vs
spec:
  hosts: ["app.example.com"]
  gateways: ["edge/app-gw"]
  http:
    - match:
        - uri:
            prefix: /api/
      route:
        - destination:
            host: api-svc
            subset: stable
          weight: 90
        - destination:
            host: api-svc
            subset: canary
          weight: 10
    - route:
        - destination:
            host: web-svc
            subset: stable
`;

const DEFAULT_ROUTES: RouteRule[] = [
  { id: "r1", path: "/", pathType: "Prefix", backend: "web-svc", port: 80, enabled: true },
  { id: "r2", path: "/api", pathType: "Prefix", backend: "api-svc", port: 8080, enabled: true },
  { id: "r3", path: "/api/v1/orders", pathType: "Exact", backend: "orders-svc", port: 3000, enabled: true },
];

// ==========================================
// HELPERS
// ==========================================

/** True when requestPath lands on a Prefix rule — segment-aware, so /api doesn't swallow /apixxx. */
const prefixMatches = (path: string, rulePath: string): boolean => {
  if (rulePath === "/") return true;
  if (path === rulePath) return true;
  if (rulePath.endsWith("/")) return path.startsWith(rulePath);
  return path.startsWith(`${rulePath}/`);
};

const formatTime = () =>
  new Date().toLocaleTimeString("en-US", { hour12: false }) + "." + String(new Date().getMilliseconds()).padStart(3, "0");

// ==========================================
// COMPONENT
// ==========================================

export default function DkIngressServiceMeshSection() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // --- MODULE 1: NGINX vs Istio ---
  const [compareTab, setCompareTab] = useState<CompareTab>("matrix");

  // --- MODULE 2: Ingress Path-Based Routing Builder ---
  const [routes, setRoutes] = useState<RouteRule[]>(DEFAULT_ROUTES);
  const [host, setHost] = useState<string>("app.example.com");
  const [ingressClass, setIngressClass] = useState<IngressClass>("nginx");
  const [tlsEnabled, setTlsEnabled] = useState<boolean>(true);
  const [reqPath, setReqPath] = useState<string>("/api/v1/orders/42");
  const [simResult, setSimResult] = useState<{ found: boolean; message: string; backend: string } | null>(null);
  const [routeCounter, setRouteCounter] = useState<number>(4);

  const addRoute = () => {
    const id = `r${routeCounter}`;
    setRouteCounter((c) => c + 1);
    setRoutes((prev) => [...prev, { id, path: `/new${routeCounter}`, pathType: "Prefix", backend: "new-svc", port: 80, enabled: true }]);
  };

  const updateRoute = (id: string, patch: Partial<RouteRule>) => {
    setRoutes((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRoute = (id: string) => {
    setRoutes((prev) => prev.filter((r) => r.id !== id));
  };

  const simulateRequest = (path: string) => {
    const active = routes.filter((r) => r.enabled);
    const normalized = path.startsWith("/") ? path : `/${path}`;

    // Exact match wins outright
    let match: RouteRule | null = active.find((r) => r.pathType === "Exact" && r.path === normalized) ?? null;

    if (!match) {
      // Longest prefix match, segment-aware (e.g. /api/v1 beats /api)
      const candidates = active
        .filter((r) => r.pathType === "Prefix" && prefixMatches(normalized, r.path))
        .sort((a, b) => b.path.length - a.path.length);
      match = candidates[0] ?? null;
    }

    if (!match) {
      setSimResult({
        found: false,
        message: `No enabled rule matches "${normalized}" → Nginx returns HTML 404 default backend`,
        backend: "default-backend",
      });
      return;
    }

    const via = match.pathType === "Exact" ? "exact match" : "longest prefix match";
    setSimResult({
      found: true,
      message: `${normalized} → matched rule "${match.path}" (${match.pathType}, ${via})`,
      backend: `${match.backend}:${match.port}`,
    });
  };

  // Generated Ingress YAML (module 2)
  const generatedIngressYaml = useMemo(() => {
    const enabled = routes.filter((r) => r.enabled);
    const lines: string[] = [];

    lines.push(`apiVersion: networking.k8s.io/v1`);
    lines.push(`kind: Ingress`);
    lines.push(`metadata:`);
    lines.push(`  name: app-ingress`);
    lines.push(`  annotations:`);
    if (tlsEnabled) lines.push(`    nginx.ingress.kubernetes.io/ssl-redirect: "true"`);
    lines.push(`spec:`);
    lines.push(`  ingressClassName: ${ingressClass}`);
    if (tlsEnabled) {
      lines.push(`  tls:`);
      lines.push(`    - hosts:`);
      lines.push(`        - ${host}`);
      lines.push(`      secretName: app-tls`);
    }
    lines.push(`  rules:`);
    lines.push(`    - host: ${host}`);
    lines.push(`      http:`);
    lines.push(`        paths:`);
    enabled.forEach((r) => {
      lines.push(`          - path: ${r.path}`);
      lines.push(`            pathType: ${r.pathType}`);
      lines.push(`            backend:`);
      lines.push(`              service:`);
      lines.push(`                name: ${r.backend}`);
      lines.push(`                port:`);
      lines.push(`                  number: ${r.port}`);
    });
    return lines.join("\n");
  }, [routes, host, ingressClass, tlsEnabled]);

  // --- MODULE 3: TLS Termination ---
  const [tlsSource, setTlsSource] = useState<"secret" | "cert-manager">("cert-manager");
  const [sslRedirect, setSslRedirect] = useState<boolean>(true);
  const [minTls, setMinTls] = useState<"TLSv1.2" | "TLSv1.3">("TLSv1.2");
  const [backendProto, setBackendProto] = useState<"http" | "https">("http");

  const generatedTlsManifest = useMemo(() => {
    const lines: string[] = [];
    lines.push(`apiVersion: networking.k8s.io/v1`);
    lines.push(`kind: Ingress`);
    lines.push(`metadata:`);
    lines.push(`  name: app-ingress`);
    lines.push(`  annotations:`);
    if (tlsSource === "cert-manager") {
      lines.push(`    cert-manager.io/cluster-issuer: "letsencrypt-prod"`);
    }
    if (sslRedirect) {
      lines.push(`    nginx.ingress.kubernetes.io/ssl-redirect: "true"`);
      lines.push(`    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"`);
    }
    lines.push(`    nginx.ingress.kubernetes.io/ssl-protocols: "${minTls} TLSv1.2"`);
    if (backendProto === "https") {
      lines.push(`    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"`);
    }
    lines.push(`spec:`);
    lines.push(`  ingressClassName: nginx`);
    lines.push(`  tls:`);
    lines.push(`    - hosts:`);
    lines.push(`        - ${host}`);
    lines.push(`      secretName: app-tls`);
    lines.push(`  rules:`);
    lines.push(`    - host: ${host}`);
    lines.push(`      http:`);
    lines.push(`        paths:`);
    lines.push(`          - path: /`);
    lines.push(`            pathType: Prefix`);
    lines.push(`            backend:`);
    lines.push(`              service:`);
    lines.push(`                name: web-svc`);
    lines.push(`                port:`);
    lines.push(`                  number: 443`);
    if (tlsSource === "cert-manager") {
      lines.push(``);
      lines.push(`# cert-manager watches this Ingress and issues the certificate`);
      lines.push(`# -- validated with DNS-01 / HTTP-01 challenge, auto-renewed before expiry (Let's Encrypt: 90 days)`);
    }
    return lines.join("\n");
  }, [tlsSource, sslRedirect, minTls, backendProto, host]);

  // --- MODULE 4: mTLS mesh visualization ---
  const [mtlsMode, setMtlsMode] = useState<MTLSSMode>("STRICT");

  const meshState = useMemo(() => {
    switch (mtlsMode) {
      case "STRICT":
        return {
          label: "Automatic mTLS — REQUIRED",
          edgeLabel: "mutual TLS",
          edge: "border-sky-400 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400",
          edgeIconBg: "bg-sky-500",
          warn: null,
        };
      case "PERMISSIVE":
        return {
          label: "Plaintext or mTLS",
          edgeLabel: "plain OR mTLS",
          edge: "border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400",
          edgeIconBg: "bg-blue-400",
          warn: "Permissive: services negotiate — legacy apps may still send plaintext.",
        };
      default:
        return {
          label: "mTLS DISABLED",
          edgeLabel: "plaintext (no auth)",
          edge: "border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400",
          edgeIconBg: "bg-rose-400",
          warn: "DISABLE only for migration troubleshooting — workloads trust the network entirely.",
        };
    }
  }, [mtlsMode]);

  const peerAuthYaml = useMemo(() => {
    return `apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: prod
spec:
  mtls:
    mode: ${mtlsMode}
---
# Scoped to a specific workload instead? Use selector:
#   selector:
#     matchLabels:
#       app: checkout
# And pair with DestinationRule to REQUIRE the client side:
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: checkout-dr
  namespace: prod
spec:
  host: checkout-svc.prod.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
`;
  }, [mtlsMode]);

  const handshakeSteps = useMemo(() => {
    const base = [
      `[1] Workload certs signed by mesh root (istiod); presented on EVERY request from the sidecar`,
      `[2] Peer verifies cert against mesh CA — cert SAN carries SPIFFE identity`,
      `[3] Short-lived certs (24h) rotate automatically; no app code changes needed`,
    ];
    if (mtlsMode === "STRICT") return base;
    if (mtlsMode === "PERMISSIVE") return [`[warn] Plaintext requests are still allowed — pair PeerAuthentication PERMISSIVE with DestinationRule ISTIO_MUTUAL to force the client side.`];
    return [`[warn] Pod-to-pod traffic is unencrypted and unauthenticated — anyone in the cluster can read it (or spoof identity).`];
  }, [mtlsMode]);

  // --- MODULE 5: Canary deployment weights ---
  const [canaryWeight, setCanaryWeight] = useState<number>(10);
  const [canaryHeader, setCanaryHeader] = useState<boolean>(false);
  const [canaryTab, setCanaryTab] = useState<"istio" | "destrule" | "nginx">("istio");
  const [requestLog, setRequestLog] = useState<{ id: number; ts: string; picked: "stable" | "canary" }[]>([]);
  const [reqCounter, setReqCounter] = useState<number>(0);

  const sendCanaryRequest = () => {
    const roll = Math.floor(Math.random() * 100);
    const picked: "stable" | "canary" = roll < 100 - canaryWeight ? "stable" : "canary";
    setReqCounter((c) => c + 1);
    setRequestLog((prev) => [{ id: reqCounter + 1, ts: formatTime(), picked }, ...prev].slice(0, 8));
  };

  const generatedCanaryIstio = useMemo(() => {
    const stable = 100 - canaryWeight;
    return `apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: frontend-vs
  namespace: prod
spec:
  hosts:
    - frontend-svc
  http:
${
  canaryHeader
    ? `    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: frontend-svc
            subset: canary
          weight: 100
`
    : ``
}    - route:
        - destination:
            host: frontend-svc
            subset: stable
          weight: ${stable}
        - destination:
            host: frontend-svc
            subset: canary
          weight: ${canaryWeight}`;
  }, [canaryWeight, canaryHeader]);

  const generatedCanaryDestRule = useMemo(() => {
    return `apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: frontend-dr
  namespace: prod
spec:
  host: frontend-svc
  subsets:
    - name: stable
      labels:
        version: v1
    - name: canary
      labels:
        version: v2`;
  }, []);

  const generatedCanaryNginx = useMemo(() => {
    return `# Weighted canary via ingress annotations (5-100%)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: frontend-ingress
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "${canaryWeight}"
    nginx.ingress.kubernetes.io/canary-by-header: "canary"   # header-based:
    nginx.ingress.kubernetes.io/canary-by-header-value: "always"
spec:
  ingressClassName: nginx
  tls:
    - hosts: [app.example.com]
      secretName: app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-svc
                port:
                  number: 80`;
  }, [canaryWeight]);

  // --- MODULE 6: Traffic mirroring ---
  const [mirrorOn, setMirrorOn] = useState<boolean>(true);
  const [mirrorWeight, setMirrorWeight] = useState<number>(50);
  const [mirrorTab, setMirrorTab] = useState<"istio" | "nginx">("istio");
  const [mirrorLogs, setMirrorLogs] = useState<{ id: number; ts: string; line: string }[]>([]);
  const [mirrorCounter, setMirrorCounter] = useState<number>(0);

  const triggerMirror = () => {
    setMirrorCounter((c) => c + 1);
    const paths = ["/checkout/checkouts?user=42", "/cart", "/payments/init", "/orders/new", "/catalog/search?q=drone"];
    const pickedPath = paths[mirrorCounter % paths.length];
    setMirrorLogs((prev) =>
      [
        {
          id: mirrorCounter + 1,
          ts: formatTime(),
          line: mirrorOn
            ? `GET ${pickedPath} → shadow-copy to shadow-svc.prod.svc.cluster.local (discarded response)`
            : `mirroring disabled — request hits PRIMARY service only`,
        },
        ...prev,
      ].slice(0, 6)
    );
  };

  const generatedMirrorIstio = useMemo(() => {
    return `apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: checkout-vs
  namespace: prod
spec:
  hosts:
    - checkout-svc
  http:
    - route:
        - destination:
            host: checkout-svc
            subset: v1
      mirror:
        host: checkout-svc
        subset: shadow
      mirrorWeight: ${mirrorOn ? mirrorWeight : 0}`;
  }, [mirrorOn, mirrorWeight]);

  const generatedMirrorNginx = useMemo(() => {
    return `# Nginx shadow backend — copy EVERY request to the shadow service:
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: checkout-ingress
  annotations:
    nginx.ingress.kubernetes.io/mirror-target: "https://checkout-shadow.prod.svc.cluster.local"
    nginx.ingress.kubernetes.io/mirror-uri: "/"
spec:
  ingressClassName: nginx
  rules:
    - host: example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: checkout-svc
                port:
                  number: 80`;
  }, []);

  // --- RENDER ---
  return (
    <div id="dk-ingress-mesh" className="space-y-16 pb-16">
      {/* Track Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#082f49] via-[#0c4a6e] to-[#1e3a8a] border border-sky-800/60 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-400/10 border border-sky-300/30 text-xs font-mono text-sky-200">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            Track 5 • Kubernetes Edge Routing & Service Mesh
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Kubernetes Ingress &amp; Service Mesh
          </h1>
          <p className="text-sm sm:text-base text-sky-100/80 max-w-3xl leading-relaxed">
            Route external traffic into the cluster with NGINX Ingress, then go deeper: path-based
            routing builders, TLS termination, mutual-TLS mesh identity, canary weight splitting and
            traffic mirroring with Istio. Compare the two control planes side by side.
          </p>
          <div className="flex flex-wrap gap-2 pt-2 text-xs font-mono">
            <span className="bg-sky-50 dark:bg-sky-900/30 border border-sky-300 dark:border-sky-600 text-sky-700 dark:text-sky-300 px-3 py-1 rounded-lg">NGINX vs Istio</span>
            <span className="bg-sky-50 dark:bg-sky-900/30 border border-sky-300 dark:border-sky-600 text-sky-700 dark:text-sky-300 px-3 py-1 rounded-lg">Path Routing</span>
            <span className="bg-sky-50 dark:bg-sky-900/30 border border-sky-300 dark:border-sky-600 text-sky-700 dark:text-sky-300 px-3 py-1 rounded-lg">TLS Termination</span>
            <span className="bg-sky-50 dark:bg-sky-900/30 border border-sky-300 dark:border-sky-600 text-sky-700 dark:text-sky-300 px-3 py-1 rounded-lg">mTLS Mesh</span>
            <span className="bg-sky-50 dark:bg-sky-900/30 border border-sky-300 dark:border-sky-600 text-sky-700 dark:text-sky-300 px-3 py-1 rounded-lg">Canary Weights</span>
            <span className="bg-sky-50 dark:bg-sky-900/30 border border-sky-300 dark:border-sky-600 text-sky-700 dark:text-sky-300 px-3 py-1 rounded-lg">Traffic Mirroring</span>
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* MODULE 1: NGINX vs Istio — interactive comparison */}
      {/* ======================================================================= */}
      <section className="space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
              Module 1 • Control Plane Comparison
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              NGINX Ingress Controller vs Istio Service Mesh
            </h2>
          </div>
          <div className="flex items-center gap-1 text-xs font-mono bg-slate-50 dark:bg-slate-700 px-1.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            {(["matrix", "nginx", "istio"] as CompareTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setCompareTab(tab)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  compareTab === tab
                    ? "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-bold border border-sky-200 dark:border-sky-700"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600"
                }`}
              >
                {tab === "matrix" ? "Side-by-Side" : tab.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {compareTab === "matrix" && (
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
              <div className="col-span-3">Dimension</div>
              <div className="col-span-3 text-right">NGINX Ingress</div>
              <div className="col-span-3 text-right">Istio Mesh</div>
              <div className="col-span-3">{/* legend */}</div>
            </div>
            {COMPARISON_ROWS.map((row) => (
              <div key={row.dimension} className="grid grid-cols-12 gap-2 items-center p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/50">
                <div className="col-span-3">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{row.dimension}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{row.note}</div>
                </div>
                <div className="col-span-3 space-y-1.5">
                  <div className="text-right text-[11px] font-mono text-slate-600 dark:text-slate-300 truncate" title={row.nginx}>{row.nginx}</div>
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden ml-auto" style={{ width: "80%" }}>
                    <div
                      className="h-full rounded-full bg-sky-500 transition-all duration-500"
                      style={{ width: `${row.nginxScore}%`, marginLeft: `${100 - row.nginxScore}%` }}
                    />
                  </div>
                  <div className="text-right text-[10px] font-mono text-sky-600 dark:text-sky-400">{row.nginxScore}/100</div>
                </div>
                <div className="col-span-3 space-y-1.5">
                  <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300" title={row.istio}>{row.istio}</div>
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden" style={{ width: "80%" }}>
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${row.istioScore}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-blue-600 dark:text-blue-400">{row.istioScore}/100</div>
                </div>
                <div className="col-span-3 hidden sm:block text-[10px] font-mono text-slate-400 dark:text-slate-500">
                  {row.nginxScore >= row.istioScore ? "NGINX wins" : "Istio wins"}
                </div>
              </div>
            ))}
          </div>
        )}

        {compareTab === "nginx" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">When NGINX is the right call</h3>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="p-3 rounded-lg bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700">You only need external L7 edge routing — host/path rules + TLS</li>
                <li className="p-3 rounded-lg bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700">Small team; one Deployment + ConfigMap to understand</li>
                <li className="p-3 rounded-lg bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700">No need for mTLS between services; app-level auth suffices</li>
                <li className="p-3 rounded-lg bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700">Best performance profile: single process decision per request</li>
                <li className="p-3 rounded-lg bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700">Canary via annotations, mirror via annotations — but per-Ingress only</li>
              </ul>
            </div>
            <div className="lg:col-span-7 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-mono text-slate-900 dark:text-slate-100 font-bold">ingress.yaml — controller + canary annotations</span>
                <button
                  onClick={() => copyCode("nginx-deep", NGNIX_DEEP_INFO)}
                  className="px-3 py-1 rounded bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 transition-colors"
                >
                  {copied === "nginx-deep" ? <span className="text-emerald-600 dark:text-emerald-400">✓ Copied!</span> : <span>Copy YAML</span>}
                </button>
              </div>
              <div className="p-4 font-mono text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 overflow-x-auto whitespace-pre leading-relaxed">
                {NGNIX_DEEP_INFO}
              </div>
            </div>
          </div>
        )}

        {compareTab === "istio" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">When Istio is the right call</h3>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700">• East-west microservice traffic with automatic mTLS and SPIFFE identity</li>
                <li className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700">• Weight splitting, retries, timeouts, fault injection — per-route policies</li>
                <li className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700">• Mirror + mirrorWeight for precise shadowing</li>
                <li className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700">• Observability: per-hop tracing, metrics, and telemetry from Envoy</li>
                <li className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700">• Costs: istiod control plane + sidecar memory; needs mesh-savvy operators</li>
              </ul>
            </div>
            <div className="lg:col-span-7 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-mono text-slate-900 dark:text-slate-100 font-bold">Gateway + VirtualService — the mesh equivalent</span>
                <button
                  onClick={() => copyCode("istio-deep", ISTIO_DEEP_INFO)}
                  className="px-3 py-1 rounded bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 transition-colors"
                >
                  {copied === "istio-deep" ? <span className="text-emerald-600 dark:text-emerald-400">✓ Copied!</span> : <span>Copy YAML</span>}
                </button>
              </div>
              <div className="p-4 font-mono text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 overflow-x-auto whitespace-pre leading-relaxed">
                {ISTIO_DEEP_INFO}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ======================================================================= */}
      {/* MODULE 2: Ingress path-based routing builder */}
      {/* ======================================================================= */}
      <section className="space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
              Module 2 • Edge Traffic Router
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              Ingress Resource — Path-Based Routing Builder
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-50 dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
            <span>Host:</span>
            <input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="bg-transparent text-sky-600 dark:text-sky-400 font-bold outline-none border-b border-sky-200 dark:border-sky-700 focus:border-sky-500 w-40"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Builder column */}
          <div className="lg:col-span-5 space-y-4">
            <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              1. Path Rules (longest prefix wins)
            </label>
            <div className="space-y-2.5">
              {routes.map((route) => (
                <div
                  key={route.id}
                  className={`p-3 rounded-xl border transition-all ${
                    route.enabled ? "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700" : "bg-slate-50/50 dark:bg-slate-700/50 border-slate-200/40 dark:border-slate-700/60 opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={route.enabled}
                      onChange={() => updateRoute(route.id, { enabled: !route.enabled })}
                      className="w-4 h-4 accent-sky-500"
                    />
                    <input
                      value={route.path}
                      onChange={(e) => updateRoute(route.id, { path: e.target.value })}
                      className="w-28 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 focus:border-sky-400 focus:outline-none"
                    />
                    <select
                      value={route.pathType}
                      onChange={(e) => updateRoute(route.id, { pathType: e.target.value as PathType })}
                      className="px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300 focus:border-sky-400 focus:outline-none"
                    >
                      <option>Prefix</option>
                      <option>Exact</option>
                      <option>ImplementationSpecific</option>
                    </select>
                    {routes.length > 1 && (
                      <button
                        onClick={() => removeRoute(route.id)}
                        className="ml-auto text-slate-400 dark:text-slate-500 hover:text-rose-500 text-xs font-mono"
                        aria-label={`remove ${route.path}`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    <span>Backend:</span>
                    <input
                      value={route.backend}
                      onChange={(e) => updateRoute(route.id, { backend: e.target.value })}
                      className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-28 font-mono text-slate-900 dark:text-slate-100 focus:border-sky-400 focus:outline-none"
                    />
                    <input
                      type="number"
                      min={1}
                      max={65535}
                      value={route.port}
                      onChange={(e) => updateRoute(route.id, { port: Number(e.target.value) || 80 })}
                      className="w-16 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-slate-100 focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={addRoute}
                className="px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/30 hover:bg-sky-100 border border-sky-200 dark:border-sky-700 text-xs font-mono text-sky-700 dark:text-sky-300 transition-colors"
              >
                + Add path rule
              </button>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <span>Class:</span>
                {(["nginx", "istio-gateway"] as IngressClass[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setIngressClass(c)}
                    className={`px-2 py-1 rounded border text-[10px] transition-colors ${
                      ingressClass === c
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-sky-300"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 ml-auto">
                <input
                  type="checkbox"
                  checked={tlsEnabled}
                  onChange={() => setTlsEnabled(!tlsEnabled)}
                  className="w-4 h-4 accent-sky-500"
                />
                TLS block
              </label>
            </div>

            {/* Request simulator */}
            <div className="rounded-xl bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 p-4 space-y-3">
              <div className="text-[11px] font-mono text-sky-700 dark:text-sky-300 uppercase tracking-wider">Request simulation</div>
              <div className="flex gap-2">
                <input
                  value={reqPath}
                  onChange={(e) => setReqPath(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && simulateRequest(reqPath)}
                  placeholder="/api/…"
                  className="flex-1 px-3 py-2 rounded-lg border border-sky-200 dark:border-sky-700 bg-white dark:bg-slate-800 font-mono text-sm text-slate-900 dark:text-slate-100 focus:border-sky-400 focus:outline-none"
                />
                <button
                  onClick={() => simulateRequest(reqPath)}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 dark:hover:bg-sky-600 text-white text-xs font-mono transition-colors"
                >
                  Route →
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["/", "/api/users", "/api/v1/orders/42", "/static/app.js", "/nope"].map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setReqPath(p);
                      simulateRequest(p);
                    }}
                    className="px-2 py-1 rounded border border-sky-200 dark:border-sky-700 bg-white dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300 hover:border-sky-400 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
              {simResult && (
                <div
                  className={`rounded-lg p-3 font-mono text-xs ${
                    simResult.found ? "bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300" : "bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-700 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  <div className="font-bold">{simResult.found ? "MATCH FOUND" : "404 — NO MATCH"}</div>
                  <div className="mt-1 whitespace-pre-wrap">{simResult.message}</div>
                  <div className="mt-1 text-sky-700 dark:text-sky-300">→ backend: {simResult.backend}</div>
                </div>
              )}
            </div>
          </div>

          {/* YAML column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col min-h-[420px]">
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-mono text-slate-900 dark:text-slate-100 font-bold">ingress.yaml (generated live)</span>
                <button
                  onClick={() => copyCode("ingress-yaml", generatedIngressYaml)}
                  className="px-3 py-1 rounded bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 transition-colors"
                >
                  {copied === "ingress-yaml" ? <span className="text-emerald-600 dark:text-emerald-400">✓ Copied!</span> : <span>Copy YAML</span>}
                </button>
              </div>
              <div className="p-4 font-mono text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 overflow-x-auto flex-1 whitespace-pre leading-relaxed">
                {generatedIngressYaml}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
              <div className="font-mono text-sky-700 dark:text-sky-300 font-bold">How NGINX picks the backend</div>
              <div>1. Host match → 2. most specific segment-aware prefix match (or Exact) → 3. Service port → EndpointSlice load balancing.</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500">Precedence: Exact rules beat Prefix; among Prefix rules, the longest path wins — so /api/v1/orders beats /api.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================================= */}
      {/* MODULE 3: TLS termination configuration */}
      {/* ======================================================================= */}
      <section className="space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-sky-700 dark:text-sky-300 uppercase tracking-wider mb-1">
              Module 3 • Edge Cryptography
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              TLS Termination Configuration
            </h2>
          </div>
          <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">tls block + annotations → controller behavior</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls */}
          <div className="lg:col-span-4 space-y-4">
            <div>
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Certificate source</label>
              <div className="grid grid-cols-2 gap-2">
                {(["secret", "cert-manager"] as const).map((src) => (
                  <button
                    key={src}
                    onClick={() => setTlsSource(src)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      tlsSource === src
                        ? "bg-sky-50 dark:bg-sky-900/30 border-sky-400 ring-1 ring-sky-300"
                        : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700 hover:border-sky-300"
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{src === "secret" ? "Manual Secret" : "cert-manager"}</div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                      {src === "secret" ? "self-managed tls Secret" : "auto-issue + renew (Let's Encrypt)"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Redirect HTTP → HTTPS</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">ssl-redirect / force-ssl-redirect annotations</div>
              </div>
              <button
                onClick={() => setSslRedirect(!sslRedirect)}
                className={`w-12 h-6 rounded-full transition-colors relative p-1 ${sslRedirect ? "bg-sky-500" : "bg-[#30363d]"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white dark:bg-slate-800 transition-transform ${sslRedirect ? "translate-x-6" : "translate-x-0"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Minimum TLS version</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">pin the handshake floor (TLSv1.2+ recommended)</div>
              </div>
              <div className="flex gap-1">
                {(["TLSv1.2", "TLSv1.3"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setMinTls(v)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                      minTls === v ? "bg-sky-600 text-white" : "bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Backend transport</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">http = plaintext pod-to-pod (cluster net)</div>
              </div>
              <div className="flex gap-1">
                {(["http", "https"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setBackendProto(p)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                      backendProto === p ? "bg-blue-600 text-white" : "bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Flow visualization + manifest */}
          <div className="lg:col-span-8 space-y-4">
            {/* TLS flow */}
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-2 mb-3">
                <span>Request flow — TLS terminates at the ingress edge</span>
                <span className="text-sky-600 dark:text-sky-400">minSsl {minTls}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-3 text-center">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Client</div>
                  <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1">HTTPS :443</div>
                  <div className="mt-2 inline-block px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-[10px] font-mono">
                    TLS {minTls.slice(-3)} ↦
                  </div>
                </div>
                <div className="rounded-lg border border-sky-300 dark:border-sky-600 bg-sky-50 dark:bg-sky-900/30 p-3 text-center relative">
                  <div className="text-[11px] font-bold text-sky-800 dark:text-sky-200">Ingress Controller</div>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1">terminates TLS here</div>
                  <div className="mt-2 space-y-1">
                    <div className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 text-[10px] font-mono text-sky-700 dark:text-sky-300">
                      {tlsSource === "cert-manager" ? "cert-manager auto-issue + renew" : "secret: app-tls (manual)"}
                    </div>
                    {sslRedirect && (
                      <div className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 text-[10px] font-mono text-sky-600 dark:text-sky-400">
                        301 → https://{host}
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-3 text-center">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Service (VIP)</div>
                  <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1">podIP routing</div>
                  <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1">cluster-internal</div>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-3 text-center">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Pod (web-svc)</div>
                  <div className={`mt-2 inline-block px-2 py-0.5 rounded font-mono ${
                    backendProto === "http"
                      ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700"
                      : "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-700"
                  }`}>
                    {backendProto === "http" ? "plain HTTP :80" : "HTTPS :443"}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                    {backendProto === "http" ? "trust cluster network" : "second TLS hop (or use mesh mTLS)"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-mono text-slate-900 dark:text-slate-100 font-bold">ingress.yaml — TLS block + annotations</span>
                <button
                  onClick={() => copyCode("tls-yaml", generatedTlsManifest)}
                  className="px-3 py-1 rounded bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 transition-colors"
                >
                  {copied === "tls-yaml" ? <span className="text-emerald-600 dark:text-emerald-400">✓ Copied!</span> : <span>Copy YAML</span>}
                </button>
              </div>
              <div className="p-4 font-mono text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 overflow-x-auto whitespace-pre leading-relaxed">
                {generatedTlsManifest}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================================= */}
      {/* MODULE 4: mTLS mesh visualization */}
      {/* ======================================================================= */}
      <section className="space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-1">
              Module 4 • Mesh Security
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              mTLS Service Mesh Visualization
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-700 px-1.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            {(["DISABLE", "PERMISSIVE", "STRICT"] as MTLSSMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setMtlsMode(mode)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  mtlsMode === mode
                    ? mtlsMode === "DISABLE"
                      ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-700"
                      : mtlsMode === "PERMISSIVE"
                      ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-700"
                      : "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-bold border border-sky-200 dark:border-sky-700"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Mesh diagram */}
          <div className="lg:col-span-7 space-y-3">
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-5">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">
                <span>Imagined mesh — prod namespace (sidecars injected)</span>
                <span className={`px-2 py-0.5 rounded ${meshState.edge}`}>{meshState.label}</span>
              </div>

              {/* GW → frontend */}
              <div className="flex items-center justify-center gap-4 mb-3">
                <div className="rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-2.5 text-center min-w-[130px]">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">istio-ingressgateway</div>
                  <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">Public :443</div>
                  <div className="mt-1 text-[10px] font-mono text-sky-600 dark:text-sky-400">tls Secret</div>
                </div>
                <div className={`flex-1 flex items-center gap-2 border-t-2 border-dashed px-2 ${meshState.edge}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${meshState.edgeIconBg}`} />
                  <span className="text-[10px] font-mono">{meshState.edgeLabel}</span>
                </div>
                <div className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-center min-w-[130px]">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">frontend-svc</div>
                  <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">sa/frontend</div>
                  <div className="mt-1 text-[9px] font-mono text-sky-500 dark:text-sky-400 truncate">SPIFFE://cluster.local/ns/prod/sa/frontend</div>
                </div>
              </div>

              {/* frontend → api */}
              <div className="flex items-center justify-center gap-4 mb-3 pl-10">
                <div className={`flex-1 flex items-center gap-2 border-t-2 px-3 ${meshState.edge}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${meshState.edgeIconBg}`} />
                  <span className="text-[10px] font-mono">{meshState.edgeLabel}</span>
                </div>
                <div className="rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-2.5 text-center min-w-[130px]">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">checkout-svc</div>
                  <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">svc/checkout</div>
                  <div className="mt-1 text-[9px] font-mono text-sky-500 dark:text-sky-400 truncate">SPIFFE://cluster.local/ns/prod/sa/checkout</div>
                </div>
              </div>

              {/* frontend → payments */}
              <div className="flex items-center justify-center gap-4">
                <div className={`flex-1 flex items-center gap-2 border-t-2 px-3 ${meshState.edge}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${meshState.edgeIconBg}`} />
                  <span className="text-[10px] font-mono">{meshState.edgeLabel}</span>
                </div>
                <div className="rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-2.5 text-center min-w-[130px]">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">payments-svc</div>
                  <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">svc/payments</div>
                  <div className="mt-1 text-[9px] font-mono text-sky-500 dark:text-sky-400 truncate">SPIFFE://cluster.local/ns/prod/sa/payments</div>
                </div>
              </div>

              {meshState.warn && (
                <div className="mt-4 rounded-lg bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700 p-3 text-xs font-mono text-rose-600 dark:text-rose-400">
                  {meshState.warn}
                </div>
              )}

              {/* Handshake trace */}
              <div className="mt-4 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 p-3">
                <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Sidecar handshake (Envoy → Envoy)</div>
                {handshakeSteps.map((step) => (
                  <div key={step} className="text-[11px] font-mono text-slate-600 dark:text-slate-300 py-0.5 whitespace-pre-wrap leading-5">
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Policies column */}
          <div className="lg:col-span-5 space-y-3">
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-mono text-slate-900 dark:text-slate-100 font-bold">PeerAuthentication + DestinationRule</span>
                <button
                  onClick={() => copyCode("mtsl-yaml", peerAuthYaml)}
                  className="px-3 py-1 rounded bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 transition-colors"
                >
                  {copied === "mtsl-yaml" ? <span className="text-emerald-600 dark:text-emerald-400">✓ Copied!</span> : <span>Copy YAML</span>}
                </button>
              </div>
              <div className="p-4 font-mono text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 overflow-x-auto whitespace-pre leading-relaxed min-h-[240px]">
                {peerAuthYaml}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="font-mono text-sky-700 dark:text-sky-300 font-bold">Why mTLS matters</div>
              <div className="text-[11px] leading-relaxed">
                With sidecars, every workload gets a SPIFFE identity (k8s service account). istiod signs
                24-hour workload certificates, so:<br />
                1. Traffic is encrypted pod-to-pod — the cluster network is no longer trusted.<br />
                2. Replay/middlebox attacks fail: a client must present a cert bound to its identity.<br />
                3. STRICT rejects legacy clients until they adopt mTLS — migrate with PERMISSIVE first.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================================= */}
      {/* MODULE 5: Canary deployment weights */}
      {/* ======================================================================= */}
      <section className="space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
              Module 5 • Progressive Delivery
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              Canary Deployment Weights
            </h2>
          </div>
          <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">Istio VirtualService weights • NGINX canary annotations</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls */}
          <div className="lg:col-span-5 space-y-5">
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">Canary traffic weight</span>
                <span className="text-2xl font-extrabold text-sky-600 dark:text-sky-400">{canaryWeight}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={5}
                value={canaryWeight}
                onChange={(e) => setCanaryWeight(Number(e.target.value))}
                className="w-full accent-sky-500"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500">
                <span>0% (smoke)</span>
                <span>10% (safe)</span>
                <span>25% (bold)</span>
                <span>50% (A/B cap)</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[0, 5, 10, 20, 25, 40, 50].map((w) => (
                  <button
                    key={w}
                    onClick={() => setCanaryWeight(w)}
                    className={`px-2.5 py-1 rounded border text-[10px] font-mono transition-colors ${
                      canaryWeight === w
                        ? "bg-sky-600 text-white border-sky-600"
                        : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-sky-300"
                    }`}
                  >
                    {w}%
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Header-based split</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">x-canary: "true" always goes to canary</div>
                </div>
                <button
                  onClick={() => setCanaryHeader(!canaryHeader)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 ${canaryHeader ? "bg-sky-500" : "bg-[#30363d]"}`}
                  aria-label="toggle header-based canary"
                >
                  <div className={`w-4 h-4 rounded-full bg-white dark:bg-slate-800 transition-transform ${canaryHeader ? "translate-x-6" : "translate-x-0"}`} />
                </button>
              </div>
            </div>

            {/* Weight visualization */}
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-5">
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Live split</div>
              <div className="flex h-4 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                <div
                  className="bg-blue-500 transition-all duration-500"
                  style={{ width: `${100 - canaryWeight}%` }}
                  title={`stable ${100 - canaryWeight}%`}
                />
                <div
                  className="bg-sky-300 transition-all duration-500"
                  style={{ width: `${canaryWeight}%` }}
                  title={`canary ${canaryWeight}%`}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1.5">
                <span className="text-blue-600 dark:text-blue-400">stable v1 — {100 - canaryWeight}%</span>
                <span className="text-sky-600 dark:text-sky-400">canary v2 — {canaryWeight}%</span>
              </div>

              <button
                onClick={sendCanaryRequest}
                className="mt-4 w-full px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 dark:hover:bg-sky-600 text-white text-xs font-bold transition-colors"
              >
                Send test request (also honors x-canary header)
              </button>

              <div className="mt-3 space-y-1">
                {requestLog.length === 0 && (
                  <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500">No requests yet — click to observe weighting.</div>
                )}
                {requestLog.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="text-slate-400 dark:text-slate-500">{r.ts}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        r.picked === "stable" ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" : "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300"
                      }`}
                    >
                      {r.picked}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* YAML output */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-700 px-1.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 w-fit">
              {(["istio", "destrule", "nginx"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setCanaryTab(tab)}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    canaryTab === tab ? "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-bold border border-sky-200 dark:border-sky-700" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600"
                  }`}
                >
                  {tab === "istio" ? "VirtualService" : tab === "destrule" ? "DestinationRule" : "NGINX"}
                </button>
              ))}
            </div>

            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-mono text-slate-900 dark:text-slate-100 font-bold">
                  {canaryTab === "istio" ? "frontend-vs.yaml — weighted split (VirtualService)" : canaryTab === "destrule" ? "frontend-dr.yaml — subsets (DestinationRule)" : "frontend-ingress.yaml — NGINX annotations"}
                </span>
                <button
                  onClick={() =>
                    copyCode(
                      "canary-yaml",
                      canaryTab === "istio" ? generatedCanaryIstio : canaryTab === "destrule" ? generatedCanaryDestRule : generatedCanaryNginx
                    )
                  }
                  className="px-3 py-1 rounded bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 transition-colors"
                >
                  {copied === "canary-yaml" ? <span className="text-emerald-600 dark:text-emerald-400">✓ Copied!</span> : <span>Copy YAML</span>}
                </button>
              </div>
              <div className="p-4 font-mono text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 overflow-x-auto whitespace-pre leading-relaxed min-h-[340px]">
                {canaryTab === "istio" ? generatedCanaryIstio : canaryTab === "destrule" ? generatedCanaryDestRule : generatedCanaryNginx}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================================= */}
      {/* MODULE 6: Traffic mirroring */}
      {/* ======================================================================= */}
      <section className="space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
              Module 6 • Shadow Traffic
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              Traffic Mirroring (Shadowing)
            </h2>
          </div>
          <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">copy live requests to a canary/shadow without affecting users</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls + diagram */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Enable mirroring</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">shadow traffic fires-and-forgets</div>
              </div>
              <button
                onClick={() => setMirrorOn(!mirrorOn)}
                className={`w-12 h-6 rounded-full transition-colors relative p-1 ${mirrorOn ? "bg-sky-500" : "bg-[#30363d]"}`}
                aria-label="toggle traffic mirroring"
              >
                <div className={`w-4 h-4 rounded-full bg-white dark:bg-slate-800 transition-transform ${mirrorOn ? "translate-x-6" : "translate-x-0"}`} />
              </button>
            </div>

            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mirror weight (Istio mirrorWeight)</span>
                <span className="text-xl font-extrabold text-sky-600 dark:text-sky-400">{mirrorOn ? mirrorWeight : 0}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={mirrorWeight}
                onChange={(e) => setMirrorWeight(Number(e.target.value))}
                disabled={!mirrorOn}
                className="w-full accent-sky-500 disabled:opacity-40"
              />

              <button
                onClick={triggerMirror}
                className="mt-4 w-full px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-600 text-white text-xs font-bold transition-colors disabled:opacity-40"
              >
                Simulate a live transaction
              </button>

              <div className="mt-3 space-y-1">
                {mirrorLogs.length === 0 && (
                  <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500">Shadow log empty — simulate a request to see mirrored copies.</div>
                )}
                {mirrorLogs.map((l) => (
                  <div key={l.id} className={`text-[10px] font-mono leading-5 ${l.line.includes("OFF") ? "text-slate-400 dark:text-slate-500" : "text-slate-600 dark:text-slate-300"}`}>
                    <span className="text-slate-400 dark:text-slate-500">{l.ts} </span>
                    {l.line}
                  </div>
                ))}
              </div>
            </div>

            {/* Diagram */}
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-4">
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-2 mb-3">
                Request path with mirror
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <div className="rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-center">Client</div>
                <div className="text-slate-400 dark:text-slate-500">→</div>
                <div className="rounded-lg border border-sky-300 dark:border-sky-600 bg-sky-50 dark:bg-sky-900/30 px-3 py-2 text-center relative">
                  Envoy (checkout-svc)
                  <div className="text-[9px] text-sky-600 dark:text-sky-400 mt-0.5">route weight {mirrorOn ? `${100 - mirrorWeight}%` : "100%"}</div>
                </div>
              </div>
              <div className="ml-14 mt-1 space-y-1 border-l-2 border-slate-200 dark:border-slate-700 pl-3">
                <div className="flex items-center gap-2 text-[10px] font-mono text-blue-600 dark:text-blue-400">
                  → checkout-svc version v1 (real request)
                </div>
                {mirrorOn && mirrorWeight > 0 && (
                  <div className="flex items-center gap-2 text-[10px] font-mono text-sky-600 dark:text-sky-400">
                    ⤷ shadow copy: version shadow (fire-and-forget, no client response)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* YAML output */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-700 px-1.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 w-fit">
              {(["istio", "nginx"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setMirrorTab(t)}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    mirrorTab === t ? "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-bold border border-sky-200 dark:border-sky-700" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600"
                  }`}
                >
                  {t === "istio" ? "Istio VirtualService" : "NGINX Annotations"}
                </button>
              ))}
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-mono text-slate-900 dark:text-slate-100 font-bold">
                  {mirrorTab === "istio" ? "checkout-vs.yaml — mirror + mirrorWeight" : "checkout-ingress.yaml — mirror-target"}
                </span>
                <button
                  onClick={() => copyCode("mirror-yaml", mirrorTab === "istio" ? generatedMirrorIstio : generatedMirrorNginx)}
                  className="px-3 py-1 rounded bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 transition-colors"
                >
                  {copied === "mirror-yaml" ? <span className="text-emerald-600 dark:text-emerald-400">✓ Copied!</span> : <span>Copy YAML</span>}
                </button>
              </div>
              <div className="p-4 font-mono text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 overflow-x-auto whitespace-pre leading-relaxed min-h-[260px]">
                {mirrorTab === "istio" ? generatedMirrorIstio : generatedMirrorNginx}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-mono text-blue-700 dark:text-blue-300 font-bold">Mirroring vs Canary:</span> mirrored copies never see the client
              response — they validate requests, replay, or warm caches. Canaries answer real traffic with a
              percentage split. Both are used together for risk-free releases.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}