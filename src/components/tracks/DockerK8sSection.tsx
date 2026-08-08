"use client";

import { useState, useMemo } from "react";
import DkSecurityScanSection from "./DkSecurityScanSection";
import DkResourceQuotasSection from "./DkResourceQuotasSection";
import DkNetworkPolicySection from "./DkNetworkPolicySection";
import DkIngressServiceMeshSection from "./DkIngressServiceMeshSection";
import DkPersistentVolumesSection from "./DkPersistentVolumesSection";
import DkImageRegistrySection from "./DkImageRegistrySection";
import DkRbacSecuritySection from "./DkRbacSecuritySection";
import DkHpaVpaSection from "./DkHpaVpaSection";
import DkTroubleshootingSection from "./DkTroubleshootingSection";
import DkObservabilitySection from "./DkObservabilitySection";

// --- Types & Data Interfaces ---
type BaseImageKey = "node-full" | "node-slim" | "node-alpine" | "distroless";

interface BaseImageDetail {
  name: string;
  dockerRef: string;
  baseSizeMb: number;
  cveCount: number;
  securityRating: "A+" | "B" | "C" | "F";
  description: string;
  osType: string;
}

const BASE_IMAGES: Record<BaseImageKey, BaseImageDetail> = {
  "node-full": {
    name: "Node.js 20 Full (Debian)",
    dockerRef: "node:20",
    baseSizeMb: 1150,
    cveCount: 42,
    securityRating: "F",
    description: "Includes full build tools, gcc, python, curl, package manager (apt). Massive attack surface.",
    osType: "Debian GNU/Linux 12 (bookworm)",
  },
  "node-slim": {
    name: "Node.js 20 Slim",
    dockerRef: "node:20-slim",
    baseSizeMb: 240,
    cveCount: 14,
    securityRating: "C",
    description: "Debian minimal runtime without build tools. Moderate size with essential shared libraries.",
    osType: "Debian Minimal",
  },
  "node-alpine": {
    name: "Node.js 20 Alpine",
    dockerRef: "node:20-alpine",
    baseSizeMb: 170,
    cveCount: 3,
    securityRating: "B",
    description: "Lightweight Alpine Linux using musl libc and busybox. Great compromise for container size.",
    osType: "Alpine Linux 3.19",
  },
  distroless: {
    name: "Distroless Node 20",
    dockerRef: "gcr.io/distroless/nodejs20-debian12",
    baseSizeMb: 125,
    cveCount: 0,
    securityRating: "A+",
    description: "Google Distroless: Contains ONLY Node.js and dependencies. No shell, package manager, or extra utilities.",
    osType: "Distroless (Minimal glibc)",
  },
};

interface ComposeServiceConfig {
  id: string;
  name: string;
  image: string;
  port: string;
  enabled: boolean;
  category: "frontend" | "backend" | "database" | "cache" | "proxy";
  envVars: string[];
  volumeName?: string;
  network: "frontend-net" | "backend-net" | "both";
  dependsOn?: string[];
}

interface ComponentInfo {
  id: string;
  title: string;
  category: "Control Plane" | "Worker Node";
  port: string;
  protocol: string;
  functionDesc: string;
  haStrategy: string;
  failureImpact: string;
}

const K8S_COMPONENTS: ComponentInfo[] = [
  {
    id: "apiserver",
    title: "kube-apiserver",
    category: "Control Plane",
    port: "6443 / TCP",
    protocol: "HTTPS / REST",
    functionDesc: "Central API gateway and orchestration engine. Validates and processes all REST requests from kubectl, controllers, and kubelets.",
    haStrategy: "Active-Active behind external Load Balancer (stateless).",
    failureImpact: "Cluster management frozen; kubectl commands fail, but running Pods continue operating.",
  },
  {
    id: "etcd",
    title: "etcd Datastore",
    category: "Control Plane",
    port: "2379-2380 / TCP",
    protocol: "gRPC / Raft Consensus",
    functionDesc: "Consistent, highly-available key-value store holding complete cluster configuration, state, and metadata snapshot.",
    haStrategy: "Raft consensus cluster requiring odd nodes (3, 5, 7) for quorum.",
    failureImpact: "Cluster state becomes read-only or inaccessible; no scheduling or auto-healing possible.",
  },
  {
    id: "controller-mgr",
    title: "kube-controller-manager",
    category: "Control Plane",
    port: "10257 / TCP",
    protocol: "HTTPS",
    functionDesc: "Runs core control loops (DeploymentController, NodeController, ReplicaSetController, EndpointSliceController) driving desired vs live state.",
    haStrategy: "Active-Passive with Leader Election via Lease objects.",
    failureImpact: "Failed pods won't restart, scaled Deployments won't adjust replica count.",
  },
  {
    id: "scheduler",
    title: "kube-scheduler",
    category: "Control Plane",
    port: "10259 / TCP",
    protocol: "HTTPS",
    functionDesc: "Assigns unscheduled Pods to optimal Worker Nodes based on resource requests, taints/tolerations, node affinity, and anti-affinity rules.",
    haStrategy: "Active-Passive with Leader Election via etcd leases.",
    failureImpact: "Newly created Pods remain indefinitely in 'Pending' state.",
  },
  {
    id: "kubelet",
    title: "kubelet Agent",
    category: "Worker Node",
    port: "10250 / TCP",
    protocol: "HTTPS / gRPC (CRI)",
    functionDesc: "Primary node agent ensuring containers described in PodSpecs are running, healthy, and reporting status back to kube-apiserver.",
    haStrategy: "One instance per Worker Node monitored by systemd watchdog.",
    failureImpact: "Node marked as 'NotReady' by Control Plane; Pods evicted after eviction-timeout.",
  },
  {
    id: "kube-proxy",
    title: "kube-proxy",
    category: "Worker Node",
    port: "10256 / TCP",
    protocol: "iptables / IPVS / eBPF",
    functionDesc: "Maintains network rules on nodes allowing network communication to Pods from inside or outside cluster (Service VIP routing).",
    haStrategy: "DaemonSet running on every Worker Node.",
    failureImpact: "Service VIP routing breaks on affected node; Pod-to-Service traffic fails.",
  },
  {
    id: "containerd",
    title: "containerd (CRI Runtime)",
    category: "Worker Node",
    port: "Unix Socket (/run/containerd/containerd.sock)",
    protocol: "gRPC (CRI spec)",
    functionDesc: "High-performance container runtime managing container lifecycles, image pulling, execution via runc, and storage overlays.",
    haStrategy: "Local host daemon process managed by systemd.",
    failureImpact: "Containers on node fail to start or stop; image pulls fail.",
  },
  {
    id: "cni-plugin",
    title: "CNI Plugin (Calico / Cilium)",
    category: "Worker Node",
    port: "VXLAN 4789 / BGP 179",
    protocol: "eBPF / BGP / IP-in-IP",
    functionDesc: "Allocates Pod IP addresses, attaches veth pairs, executes NetworkPolicies, and provides inter-pod cross-node routing.",
    haStrategy: "DaemonSet per node with eBPF kernel hooks or BGP mesh.",
    failureImpact: "Pods fail to receive IP addresses ('ContainerCreating' freeze); inter-pod cross-node network isolation breaks.",
  },
];

export default function DockerK8sSection() {
  // --- MODULE 1 STATE: Multi-Stage Dockerfile Builder ---
  const [selectedBaseImage, setSelectedBaseImage] = useState<BaseImageKey>("node-alpine");
  const [isMultiStage, setIsMultiStage] = useState<boolean>(true);
  const [useCacheOptimization, setUseCacheOptimization] = useState<boolean>(true);
  const [useNonRootUser, setUseNonRootUser] = useState<boolean>(true);
  const [useDockerignore, setUseDockerignore] = useState<boolean>(true);
  const [useProdOnlyDeps, setUseProdOnlyDeps] = useState<boolean>(true);
  const [activeCodeTab, setActiveCodeTab] = useState<"dockerfile" | "dockerignore">("dockerfile");
  const [copiedDockerfile, setCopiedDockerfile] = useState<boolean>(false);

  // Computed metrics for Module 1
  const dockerMetrics = useMemo(() => {
    const base = BASE_IMAGES[selectedBaseImage];
    let size = base.baseSizeMb;
    let cves = base.cveCount;
    let buildTimeSec = 40;

    // Apply optimizations
    if (isMultiStage) {
      if (selectedBaseImage === "distroless") {
        size = 128;
        cves = 0;
      } else if (selectedBaseImage === "node-alpine") {
        size = 165;
        cves = Math.min(cves, 2);
      } else if (selectedBaseImage === "node-slim") {
        size = 230;
        cves = Math.min(cves, 8);
      } else {
        size = 450;
      }
    } else {
      // Single stage bloat
      size += 420; // DevDependencies + cache bloat
      cves += 15;
    }

    if (useProdOnlyDeps) {
      size -= 45;
    }

    if (useCacheOptimization) {
      buildTimeSec = 4; // Cached layer hit
    }

    const baselineSize = BASE_IMAGES["node-full"].baseSizeMb + 420;
    const reductionPercent = Math.round(((baselineSize - size) / baselineSize) * 100);

    let score: "A+" | "A" | "B" | "C" | "F" = "F";
    if (isMultiStage && useNonRootUser && useDockerignore && (selectedBaseImage === "distroless" || selectedBaseImage === "node-alpine")) {
      score = selectedBaseImage === "distroless" ? "A+" : "A";
    } else if (isMultiStage && useNonRootUser) {
      score = "B";
    } else if (isMultiStage) {
      score = "C";
    }

    return {
      finalSizeMb: size,
      reductionPercent: Math.max(0, reductionPercent),
      cveCount: cves,
      buildTimeSec,
      securityScore: score,
    };
  }, [selectedBaseImage, isMultiStage, useCacheOptimization, useNonRootUser, useDockerignore, useProdOnlyDeps]);

  // Generated Dockerfile text
  const generatedDockerfile = useMemo(() => {
    const baseRef = BASE_IMAGES[selectedBaseImage].dockerRef;

    if (!isMultiStage) {
      return `# SINGLE-STAGE UNOPTIMIZED DOCKERFILE
FROM ${baseRef}

WORKDIR /app

${useDockerignore ? "# Note: .dockerignore is enabled" : "# WARNING: No .dockerignore file configured"}
COPY . .

RUN npm install

EXPOSE 3000

${useNonRootUser ? "USER node" : "# WARNING: Running as ROOT user"}
CMD ["npm", "start"]`;
    }

    return `# MULTI-STAGE OPTIMIZED PRODUCTION DOCKERFILE
# Stage 1: Build Dependencies & Asset Compilation
FROM node:20-alpine AS builder

WORKDIR /app

${
  useCacheOptimization
    ? `# Optimize Layer Caching: Copy package manifests first
COPY package*.json tsconfig*.json ./
RUN npm ci`
    : `# Sub-optimal Layer Caching: Copying all source code before install
COPY . .
RUN npm install`
}

${useCacheOptimization ? "COPY . .\nRUN npm run build" : "RUN npm run build"}

# Stage 2: Minimal Secure Runtime Environment
FROM ${baseRef} AS runner

WORKDIR /app
ENV NODE_ENV=production

${useNonRootUser ? "RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs" : "# Running as root user (Security Risk)"}

${
  useCacheOptimization && useProdOnlyDeps
    ? `# Copy isolated production node_modules from builder
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production && npm cache clean --force`
    : `COPY --from=builder /app/node_modules ./node_modules`
}

# Copy compiled build output with explicit non-root ownership
${
  useNonRootUser
    ? `COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist`
    : `COPY --from=builder /app/dist ./dist`
}

EXPOSE 3000

${useNonRootUser ? "USER nextjs" : "# WARNING: Container executes as root"}

CMD ["node", "dist/index.js"]`;
  }, [selectedBaseImage, isMultiStage, useCacheOptimization, useNonRootUser, useProdOnlyDeps]);

  const generatedDockerignore = `# Dockerignore Pattern Rule Matches
node_modules
.git
.github
.env*.local
dist
coverage
*.log
Dockerfile*
docker-compose*.yml
README.md`;

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDockerfile(true);
    setTimeout(() => setCopiedDockerfile(false), 2000);
  };

  // --- MODULE 2 STATE: Docker Compose Stack Generator ---
  const [composeServices, setComposeServices] = useState<ComposeServiceConfig[]>([
    { id: "proxy", name: "nginx-proxy", image: "nginx:1.25-alpine", port: "80:80", enabled: true, category: "proxy", envVars: [], network: "frontend-net", dependsOn: ["frontend", "backend"] },
    { id: "frontend", name: "nextjs-app", image: "company/nextjs-frontend:v1.4", port: "3000:3000", enabled: true, category: "frontend", envVars: ["NODE_ENV=production", "API_URL=http://backend-api:8080"], network: "frontend-net", dependsOn: ["backend"] },
    { id: "backend", name: "backend-api", image: "company/backend-api:v2.1", port: "8080:8080", enabled: true, category: "backend", envVars: ["DB_HOST=postgres-db", "REDIS_HOST=redis-cache"], network: "both", dependsOn: ["postgres", "redis"] },
    { id: "postgres", name: "postgres-db", image: "postgres:16-alpine", port: "5432:5432", enabled: true, category: "database", envVars: ["POSTGRES_DB=prod_db", "POSTGRES_USER=db_user", "POSTGRES_PASSWORD=secret_pass"], volumeName: "pgdata", network: "backend-net" },
    { id: "redis", name: "redis-cache", image: "redis:7-alpine", port: "6379:6379", enabled: true, category: "cache", envVars: [], volumeName: "redisdata", network: "backend-net" },
  ]);

  const [networkMode, setNetworkMode] = useState<"isolated" | "single">("isolated");
  const [volumeType, setVolumeType] = useState<"named" | "bind">("named");
  const [enableHealthchecks, setEnableHealthchecks] = useState<boolean>(true);
  const [copiedCompose, setCopiedCompose] = useState<boolean>(false);

  const toggleService = (id: string) => {
    setComposeServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const generatedComposeYml = useMemo(() => {
    const active = composeServices.filter((s) => s.enabled);
    let yml = `version: "3.8"\n\nservices:\n`;

    active.forEach((s) => {
      yml += `  ${s.name}:\n`;
      yml += `    image: ${s.image}\n`;
      yml += `    container_name: ${s.name}\n`;
      yml += `    ports:\n      - "${s.port}"\n`;

      if (s.envVars.length > 0) {
        yml += `    environment:\n`;
        s.envVars.forEach((ev) => {
          yml += `      - ${ev}\n`;
        });
      }

      if (s.volumeName) {
        yml += `    volumes:\n`;
        if (volumeType === "named") {
          yml += `      - ${s.volumeName}:/var/lib/${s.category === "database" ? "postgresql/data" : "redis"}\n`;
        } else {
          yml += `      - ./data/${s.category}:/var/lib/${s.category === "database" ? "postgresql/data" : "redis"}\n`;
        }
      }

      if (networkMode === "isolated") {
        yml += `    networks:\n`;
        if (s.network === "both") {
          yml += `      - frontend-net\n      - backend-net\n`;
        } else {
          yml += `      - ${s.network}\n`;
        }
      } else {
        yml += `    networks:\n      - app-net\n`;
      }

      if (enableHealthchecks && (s.category === "database" || s.category === "cache")) {
        yml += `    healthcheck:\n`;
        if (s.category === "database") {
          yml += `      test: ["CMD-SHELL", "pg_isready -U db_user -d prod_db"]\n      interval: 10s\n      timeout: 5s\n      retries: 5\n`;
        } else {
          yml += `      test: ["CMD", "redis-cli", "ping"]\n      interval: 5s\n      timeout: 3s\n      retries: 3\n`;
        }
      }

      if (s.dependsOn && s.dependsOn.length > 0) {
        const validDepends = s.dependsOn.filter((depId) =>
          active.some((act) => act.id === depId)
        );
        if (validDepends.length > 0) {
          yml += `    depends_on:\n`;
          validDepends.forEach((depId) => {
            const depObj = active.find((act) => act.id === depId);
            if (depObj) {
              if (enableHealthchecks && (depObj.category === "database" || depObj.category === "cache")) {
                yml += `      ${depObj.name}:\n        condition: service_healthy\n`;
              } else {
                yml += `      - ${depObj.name}\n`;
              }
            }
          });
        }
      }
      yml += `\n`;
    });

    yml += `networks:\n`;
    if (networkMode === "isolated") {
      yml += `  frontend-net:\n    driver: bridge\n  backend-net:\n    driver: bridge\n    internal: true # Isolated from public internet\n`;
    } else {
      yml += `  app-net:\n    driver: bridge\n`;
    }

    if (volumeType === "named") {
      const activeVolumes = active.filter((s) => s.volumeName).map((s) => s.volumeName);
      if (activeVolumes.length > 0) {
        yml += `\nvolumes:\n`;
        [...new Set(activeVolumes)].forEach((v) => {
          yml += `  ${v}:\n    driver: local\n`;
        });
      }
    }

    return yml;
  }, [composeServices, networkMode, volumeType, enableHealthchecks]);

  // --- MODULE 3 STATE: K8s Architecture Inspector & Traffic Flow ---
  const [selectedK8sComp, setSelectedK8sComp] = useState<ComponentInfo>(K8S_COMPONENTS[0]);
  const [simServiceType, setSimServiceType] = useState<"clusterip" | "nodeport" | "loadbalancer" | "ingress">("ingress");
  const [simDataplane, setSimDataplane] = useState<"iptables" | "ebpf">("ebpf");
  const [podCounters, setPodCounters] = useState<Record<string, number>>({
    "pod-web-1": 0,
    "pod-web-2": 0,
    "pod-web-3": 0,
  });
  const [packetTraceLogs, setPacketTraceLogs] = useState<string[]>([]);

  const handleSimulateRequest = () => {
    const pods = ["pod-web-1", "pod-web-2", "pod-web-3"];
    const picked = pods[Math.floor(Math.random() * pods.length)];
    const podIps: Record<string, string> = {
      "pod-web-1": "10.244.1.18:8080 (Node-1)",
      "pod-web-2": "10.244.2.45:8080 (Node-2)",
      "pod-web-3": "10.244.3.92:8080 (Node-3)",
    };

    let trace: string[] = [];
    const reqId = Math.floor(Math.random() * 89999 + 10000);

    if (simServiceType === "ingress") {
      trace = [
        `[REQ #${reqId}] HTTPS GET https://app.example.com/api/v1/orders`,
        `[L7 INGRESS] NGINX Ingress Controller pod decrypted TLS, matched route rule '/api/v1' ➔ Service 'backend-svc:80'`,
        `[ENDPOINTS LOOKUP] Querying Endpoints API ➔ Target Pod Pool [10.244.1.18, 10.244.2.45, 10.244.3.92]`,
        simDataplane === "ebpf"
          ? `[CILIUM eBPF] Direct BPF_MAP socket redirection (Bypasses iptables layer, zero-copy socket jump)`
          : `[KUBE-PROXY IPTABLES] Evaluated KUBE-SERVICES chain with 33.3% random weight probability`,
        `[DNAT REWRITE] Forwarding HTTP payload directly to Pod ${picked.toUpperCase()} (${podIps[picked]})`,
        `[HTTP 200 OK] Response returned to client in 1.4ms`,
      ];
    } else if (simServiceType === "loadbalancer") {
      trace = [
        `[REQ #${reqId}] Traffic landed on AWS Network Load Balancer (NLB) Public IP 54.210.88.12:80`,
        `[L4 HEALTHCHECK] Target group healthcheck passed across 3 worker nodes`,
        `[NODE INGRESS] Packet lands on Worker Node 2 interface eth0 on NodePort 31820`,
        simDataplane === "ebpf"
          ? `[eBPF XDP] XDP kernel hook intercepted packet before sk_buff memory allocation`
          : `[IPTABLES DNAT] Selected target endpoint using iptables statistic mode`,
        `[DELIVERY] Transferred to ${picked.toUpperCase()} (${podIps[picked]})`,
      ];
    } else if (simServiceType === "nodeport") {
      trace = [
        `[REQ #${reqId}] Direct client request to Worker Node IP 192.168.1.101:31820`,
        `[NODEPORT HIT] Kernel packet filter matches NodePort range 30000-32767`,
        `[POD ROUTING] Target Pod ${picked.toUpperCase()} selected via round-robin distribution`,
        `[DELIVERY] Packet forwarded over VXLAN overlay tunnel to ${podIps[picked]}`,
      ];
    } else {
      // ClusterIP
      trace = [
        `[REQ #${reqId}] Internal pod-to-pod call to Virtual ClusterIP 10.96.140.88:80`,
        `[VIRTUAL IP RESOLVE] ClusterIP VIP non-routable on physical network; intercepted at kernel level`,
        simDataplane === "ebpf"
          ? `[CILIUM eBPF] Fast-path socket lookup (bpf_sockmap) redirected connection in host kernel`
          : `[KUBE-PROXY] NAT table modified destination IP from 10.96.140.88 ➔ ${podIps[picked]}`,
        `[CONTAINER RECVD] Pod ${picked.toUpperCase()} accepted connection`,
      ];
    }

    setPodCounters((prev) => ({
      ...prev,
      [picked]: prev[picked] + 1,
    }));
    setPacketTraceLogs(trace);
  };

  // --- MODULE 4 STATE: Helm & ArgoCD GitOps Visualizer ---
  const [helmReplicas, setHelmReplicas] = useState<number>(3);
  const [helmTag, setHelmTag] = useState<string>("v1.2.0");
  const [helmIngressEnabled, setHelmIngressEnabled] = useState<boolean>(true);
  const [helmMemoryLimit, setHelmMemoryLimit] = useState<string>("512Mi");
  const [helmCpuLimit, setHelmCpuLimit] = useState<string>("500m");
  const [activeHelmTab, setActiveHelmTab] = useState<"values" | "deployment">("values");

  // ArgoCD GitOps Sync state
  const [gitSha, setGitSha] = useState<string>("a4f9b2c");
  const [gitCommitMsg, setGitCommitMsg] = useState<string>("feat: bump image tag to v1.2.0");
  const [clusterSha, setClusterSha] = useState<string>("a4f9b2c");
  const [syncStatus, setSyncStatus] = useState<"Synced" | "OutOfSync" | "Syncing" | "Degraded">("Synced");
  const [healthStatus, setHealthStatus] = useState<"Healthy" | "Progressing" | "Degraded">("Healthy");
  const [diffView, setDiffView] = useState<string[]>([]);

  // Generated Helm values.yaml
  const helmValuesYml = useMemo(() => {
    return `# HELM VALUES.YAML
replicaCount: ${helmReplicas}

image:
  repository: registry.company.io/web-service
  pullPolicy: IfNotPresent
  tag: "${helmTag}"

resources:
  limits:
    cpu: "${helmCpuLimit}"
    memory: "${helmMemoryLimit}"
  requests:
    cpu: "100m"
    memory: "128Mi"

ingress:
  enabled: ${helmIngressEnabled}
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: app.company.com
      paths:
        - path: /
          pathType: Prefix`;
  }, [helmReplicas, helmTag, helmIngressEnabled, helmMemoryLimit, helmCpuLimit]);

  // Generated rendered Deployment.yaml
  const helmRenderedDeployment = useMemo(() => {
    return `# RENDERED KUBERNETES DEPLOYMENT MANIFEST (helm template)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: release-web-service
  labels:
    app.kubernetes.io/name: web-service
    app.kubernetes.io/instance: release
spec:
  replicas: ${helmReplicas}
  selector:
    matchLabels:
      app.kubernetes.io/name: web-service
  template:
    metadata:
      labels:
        app.kubernetes.io/name: web-service
    spec:
      containers:
        - name: web-service
          image: "registry.company.io/web-service:${helmTag}"
          ports:
            - containerPort: 8080
          resources:
            limits:
              cpu: "${helmCpuLimit}"
              memory: "${helmMemoryLimit}"
            requests:
              cpu: "100m"
              memory: "128Mi"`;
  }, [helmReplicas, helmTag, helmMemoryLimit, helmCpuLimit]);

  // GitOps actions
  const handleGitCommitChange = () => {
    const newSha = Math.random().toString(36).substring(2, 9);
    const tags = ["v1.3.0", "v1.4.0-rc1", "v2.0.0", "v1.2.1-patch"];
    const pickedTag = tags[Math.floor(Math.random() * tags.length)];
    const newMsg = `chore: update image tag to ${pickedTag} and scale replicas`;

    setHelmTag(pickedTag);
    setGitSha(newSha);
    setGitCommitMsg(newMsg);
    setSyncStatus("OutOfSync");
    setDiffView([
      `--- Cluster Live Manifest (${clusterSha})`,
      `+++ Git Desired Manifest (${newSha})`,
      `@@ -14,7 +14,7 @@`,
      `- image: registry.company.io/web-service:${helmTag}`,
      `+ image: registry.company.io/web-service:${pickedTag}`,
      `- replicas: ${helmReplicas}`,
      `+ replicas: ${helmReplicas + 1}`,
    ]);
  };

  const handleTriggerArgoSync = () => {
    setSyncStatus("Syncing");
    setHealthStatus("Progressing");
    setTimeout(() => {
      setClusterSha(gitSha);
      setSyncStatus("Synced");
      setHealthStatus("Healthy");
      setDiffView([]);
    }, 1500);
  };

  const handleSimulateDrift = () => {
    setSyncStatus("OutOfSync");
    setHealthStatus("Healthy");
    setDiffView([
      `# WARNING: MANUAL KUBECTL DRIFT DETECTED IN CLUSTER`,
      `--- Cluster Live State (Modified directly via kubectl edit)`,
      `+++ Git Source Repository State (${gitSha})`,
      `@@ -18,3 +18,3 @@`,
      `- memory: 2048Mi # (Manual drift in production cluster)`,
      `+ memory: ${helmMemoryLimit} # (GitOps source of truth)`,
    ]);
  };

  const handleRollback = () => {
    const prevSha = "7e1b93f";
    setGitSha(prevSha);
    setGitCommitMsg("revert: rollback to previous stable commit 7e1b93f");
    setHelmTag("v1.1.0");
    setSyncStatus("OutOfSync");
    setDiffView([
      `--- Cluster Live Manifest (${clusterSha})`,
      `+++ Git Rollback Desired Manifest (${prevSha})`,
      `- image: registry.company.io/web-service:${helmTag}`,
      `+ image: registry.company.io/web-service:v1.1.0`,
    ]);
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1c2333] via-[#161b22] to-[#1c2333] border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-50 dark:bg-violet-900/30 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#bc8cff]/15 border border-violet-200 dark:border-violet-700 text-xs font-mono text-violet-600 dark:text-violet-400">
            <span className="w-2 h-2 rounded-full bg-[#bc8cff] animate-ping" />
            Track 5 • Cloud-Native Infrastructure & Orchestration
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Docker Containers & Kubernetes Architecture
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
            Master production multi-stage container optimization, Docker Compose multi-service topology networking, Kubernetes control plane architecture, and Helm & ArgoCD GitOps continuous deployment.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODULE 1: Interactive Multi-Stage Dockerfile Builder & Inspector */}
      {/* ========================================================================= */}
      <section className="space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">
              Module 1 • Image Engineering & Security
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              Multi-Stage Dockerfile Builder & Optimization Inspector
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-50 dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
            <span>Base Image:</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{BASE_IMAGES[selectedBaseImage].dockerRef}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Interactive Controls */}
          <div className="lg:col-span-5 space-y-6">
            {/* 1. Base Image Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                1. Select Base Operating System Image
              </label>
              <div className="grid grid-cols-1 gap-2">
                {(Object.keys(BASE_IMAGES) as BaseImageKey[]).map((key) => {
                  const item = BASE_IMAGES[key];
                  const isSelected = selectedBaseImage === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedBaseImage(key)}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-slate-50 dark:bg-slate-700 border-indigo-400 ring-1 ring-[#58a6ff]"
                          : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700 hover:border-[#8b949e]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.name}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-mono ${
                            item.securityRating === "A+"
                              ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700"
                              : item.securityRating === "B"
                              ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700"
                              : item.securityRating === "C"
                              ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700"
                              : "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-700"
                          }`}
                        >
                          Grade {item.securityRating}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.description}</p>
                      <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/60">
                        <span>Base Size: ~{item.baseSizeMb} MB</span>
                        <span>CVEs: {item.cveCount}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Optimization Toggles */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                2. Hardening & Optimization Flags
              </label>

              {/* Toggle 1: Multi-Stage */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Multi-Stage Build</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Separate build tools from lightweight runtime</div>
                </div>
                <button
                  onClick={() => setIsMultiStage(!isMultiStage)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                    isMultiStage ? "bg-emerald-500" : "bg-[#30363d]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white dark:bg-slate-800 transition-transform ${
                      isMultiStage ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2: Cache Optimization */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Layer Cache Strategy</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Copy package.json before source code</div>
                </div>
                <button
                  onClick={() => setUseCacheOptimization(!useCacheOptimization)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                    useCacheOptimization ? "bg-indigo-600" : "bg-[#30363d]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white dark:bg-slate-800 transition-transform ${
                      useCacheOptimization ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 3: Non-Root User */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Non-Root Execution User</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Run container process as unprivileged user</div>
                </div>
                <button
                  onClick={() => setUseNonRootUser(!useNonRootUser)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                    useNonRootUser ? "bg-[#bc8cff]" : "bg-[#30363d]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white dark:bg-slate-800 transition-transform ${
                      useNonRootUser ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 4: Production Only Deps */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Prune DevDependencies</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Strip build tools, tests, and dev binaries</div>
                </div>
                <button
                  onClick={() => setUseProdOnlyDeps(!useProdOnlyDeps)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                    useProdOnlyDeps ? "bg-[#ffa657]" : "bg-[#30363d]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white dark:bg-slate-800 transition-transform ${
                      useProdOnlyDeps ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Real-Time Metrics & Live Code Preview */}
          <div className="lg:col-span-7 space-y-6 flex flex-col justify-between">
            {/* Live Metrics Dashboard */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Final Image Size</div>
                <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{dockerMetrics.finalSizeMb} MB</div>
                <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">-{dockerMetrics.reductionPercent}% reduced</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">CVE Vulnerabilities</div>
                <div className={`text-xl font-extrabold mt-1 ${dockerMetrics.cveCount === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {dockerMetrics.cveCount} CVEs
                </div>
                <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">Trivy scan report</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Rebuild Time</div>
                <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">{dockerMetrics.buildTimeSec}s</div>
                <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">{useCacheOptimization ? "Cache Hit ⚡" : "Cache Miss 🐢"}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Security Grade</div>
                <div
                  className={`text-xl font-extrabold mt-1 ${
                    dockerMetrics.securityScore === "A+" || dockerMetrics.securityScore === "A"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : dockerMetrics.securityScore === "B"
                      ? "text-indigo-600 dark:text-indigo-400"
                      : dockerMetrics.securityScore === "C"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  Grade {dockerMetrics.securityScore}
                </div>
                <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">CIS Benchmark</div>
              </div>
            </div>

            {/* Generated Code Preview Tabs */}
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow overflow-hidden flex-1 flex flex-col min-h-[340px]">
              {/* Tab Header */}
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveCodeTab("dockerfile")}
                    className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                      activeCodeTab === "dockerfile"
                        ? "bg-slate-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold border border-slate-200 dark:border-slate-700"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    Dockerfile
                  </button>
                  <button
                    onClick={() => setActiveCodeTab("dockerignore")}
                    className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                      activeCodeTab === "dockerignore"
                        ? "bg-slate-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold border border-slate-200 dark:border-slate-700"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    .dockerignore
                  </button>
                </div>

                <button
                  onClick={() =>
                    handleCopyCode(
                      activeCodeTab === "dockerfile" ? generatedDockerfile : generatedDockerignore
                    )
                  }
                  className="px-3 py-1 rounded bg-slate-50 dark:bg-slate-700 hover:bg-[#252d3d] border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 flex items-center gap-1.5 transition-colors"
                >
                  {copiedDockerfile ? (
                    <span className="text-emerald-600 dark:text-emerald-400">✓ Copied!</span>
                  ) : (
                    <span>📋 Copy Code</span>
                  )}
                </button>
              </div>

              {/* Code Display Area */}
              <div className="p-4 font-mono text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 overflow-x-auto flex-1 whitespace-pre leading-relaxed">
                {activeCodeTab === "dockerfile" ? generatedDockerfile : generatedDockerignore}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODULE 2: Docker Compose Service Stack Generator & Network Topology */}
      {/* ========================================================================= */}
      <section className="space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
              Module 2 • Multi-Container Orchestration
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              Docker Compose Service Stack Generator & Topology Engine
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setNetworkMode(networkMode === "isolated" ? "single" : "isolated")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                networkMode === "isolated"
                  ? "bg-emerald-500/15 border-emerald-400 text-emerald-600 dark:text-emerald-400"
                  : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
              }`}
            >
              Network: {networkMode === "isolated" ? "Dual Isolated Bridges 🔒" : "Single Default Bridge 🌐"}
            </button>

            <button
              onClick={() => setVolumeType(volumeType === "named" ? "bind" : "named")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                volumeType === "named"
                  ? "bg-indigo-600/15 border-indigo-400 text-indigo-600 dark:text-indigo-400"
                  : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
              }`}
            >
              Volumes: {volumeType === "named" ? "Named Volumes 💾" : "Bind Mounts 📁"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Service Stack Toggles */}
          <div className="lg:col-span-5 space-y-4">
            <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Toggle Stack Services & Settings
            </label>

            <div className="space-y-2.5">
              {composeServices.map((service) => (
                <div
                  key={service.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    service.enabled
                      ? "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700"
                      : "bg-slate-50/50 dark:bg-slate-700/50 border-slate-200/40 dark:border-slate-700/60 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={service.enabled}
                        onChange={() => toggleService(service.id)}
                        className="w-4 h-4 rounded accent-[#58a6ff]"
                      />
                      <div>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{service.name}</span>
                        <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 ml-2">({service.port})</span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        service.network === "frontend-net"
                          ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                          : service.network === "backend-net"
                          ? "bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
                          : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {service.network}
                    </span>
                  </div>

                  <div className="mt-2 text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Image: {service.image}</span>
                    {service.volumeName && <span className="text-amber-600 dark:text-amber-400">Vol: {service.volumeName}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Healthcheck Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Enable Healthcheck Conditions</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">wait for DB healthy before app start</div>
              </div>
              <button
                onClick={() => setEnableHealthchecks(!enableHealthchecks)}
                className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                  enableHealthchecks ? "bg-emerald-500" : "bg-[#30363d]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white dark:bg-slate-800 transition-transform ${
                    enableHealthchecks ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Right Column: Visual Topology & YAML Output */}
          <div className="lg:col-span-7 space-y-6">
            {/* Visual Architecture Topology Diagram */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Interactive Network Isolation Topology
                </span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                  {networkMode === "isolated" ? "2 Bridge Networks Active" : "1 Bridge Network Active"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Frontend Bridge Network */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-600 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold border-b border-slate-200 dark:border-slate-700 pb-1.5">
                    <span>🌐 frontend-net (Bridge)</span>
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">Public Facing</span>
                  </div>
                  <div className="space-y-1.5">
                    {composeServices
                      .filter((s) => s.enabled && (s.network === "frontend-net" || s.network === "both"))
                      .map((s) => (
                        <div key={s.id} className="p-2 rounded bg-slate-50 dark:bg-slate-700 text-xs flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{s.name}</span>
                          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{s.port}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Backend Bridge Network */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-violet-400/40 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-violet-600 dark:text-violet-400 font-bold border-b border-slate-200 dark:border-slate-700 pb-1.5">
                    <span>🔒 backend-net (Isolated)</span>
                    <span className="text-[10px] bg-violet-50 dark:bg-violet-900/30 px-1.5 py-0.5 rounded">Internal Only</span>
                  </div>
                  <div className="space-y-1.5">
                    {composeServices
                      .filter((s) => s.enabled && (s.network === "backend-net" || s.network === "both"))
                      .map((s) => (
                        <div key={s.id} className="p-2 rounded bg-slate-50 dark:bg-slate-700 text-xs flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{s.name}</span>
                          <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">
                            {s.volumeName ? `Vol: ${s.volumeName}` : s.port}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Generated docker-compose.yml Viewer */}
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow overflow-hidden flex flex-col min-h-[300px]">
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-mono text-slate-900 dark:text-slate-100 font-bold">docker-compose.yml</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedComposeYml);
                    setCopiedCompose(true);
                    setTimeout(() => setCopiedCompose(false), 2000);
                  }}
                  className="px-3 py-1 rounded bg-slate-50 dark:bg-slate-700 hover:bg-[#252d3d] border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 transition-colors"
                >
                  {copiedCompose ? <span className="text-emerald-600 dark:text-emerald-400">✓ Copied!</span> : <span>📋 Copy YAML</span>}
                </button>
              </div>

              <div className="p-4 font-mono text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 overflow-x-auto flex-1 whitespace-pre leading-relaxed">
                {generatedComposeYml}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODULE 3: Kubernetes Architecture Inspector & Traffic Flow */}
      {/* ========================================================================= */}
      <section className="space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
              Module 3 • Production Kubernetes Cluster Mechanics
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              Kubernetes Control Plane vs Worker Node Architecture
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Routing Dataplane:</span>
            <button
              onClick={() => setSimDataplane(simDataplane === "ebpf" ? "iptables" : "ebpf")}
              className={`px-3 py-1 rounded-lg text-xs font-mono border transition-all ${
                simDataplane === "ebpf"
                  ? "bg-emerald-500/15 border-emerald-400 text-emerald-600 dark:text-emerald-400"
                  : "bg-[#ffa657]/15 border-amber-400 text-amber-600 dark:text-amber-400"
              }`}
            >
              {simDataplane === "ebpf" ? "eBPF (Cilium) 🚀" : "iptables (kube-proxy) ⚙️"}
            </button>
          </div>
        </div>

        {/* Dual Layout: Control Plane vs Worker Nodes Visual Map */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Control Plane Box */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-700 border border-indigo-300 dark:border-indigo-600 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧠</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Control Plane (Master Node)</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Global cluster state, scheduling & API management</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700">
                Active Cluster Leader
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {K8S_COMPONENTS.filter((c) => c.category === "Control Plane").map((comp) => {
                const isSelected = selectedK8sComp.id === comp.id;
                return (
                  <button
                    key={comp.id}
                    onClick={() => setSelectedK8sComp(comp)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-slate-50 dark:bg-slate-700 border-indigo-400 ring-1 ring-[#58a6ff]"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-[#8b949e]"
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{comp.title}</div>
                    <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 mt-1">{comp.port}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Worker Node Box */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-700 border border-emerald-400/40 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚙️</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Worker Nodes (Node 01..03)</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Runs application pods, container runtime & networking</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">
                3 Nodes Online
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {K8S_COMPONENTS.filter((c) => c.category === "Worker Node").map((comp) => {
                const isSelected = selectedK8sComp.id === comp.id;
                return (
                  <button
                    key={comp.id}
                    onClick={() => setSelectedK8sComp(comp)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-slate-50 dark:bg-slate-700 border-emerald-400 ring-1 ring-[#7ee787]"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-[#8b949e]"
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{comp.title}</div>
                    <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-1">{comp.port}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Deep Dive Component Inspector Card */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
            <div className="flex items-center gap-3">
              <span className="text-base font-bold text-slate-900 dark:text-slate-100">{selectedK8sComp.title}</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                {selectedK8sComp.category}
              </span>
            </div>
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Port / Spec: <span className="text-slate-900 dark:text-slate-100">{selectedK8sComp.port}</span> ({selectedK8sComp.protocol})
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{selectedK8sComp.functionDesc}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono pt-1">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold block mb-0.5">HA & Redundancy Strategy:</span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">{selectedK8sComp.haStrategy}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
              <span className="text-rose-600 dark:text-rose-400 font-bold block mb-0.5">Failure Impact:</span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">{selectedK8sComp.failureImpact}</span>
            </div>
          </div>
        </div>

        {/* Interactive Ingress -> Service -> Pod Packet Flow Simulator */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Ingress ➔ Kubernetes Service ➔ Pod Endpoints Traffic Flow
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Simulate live HTTP ingress packet decapsulation and load balancing</p>
            </div>

            <div className="flex items-center gap-2">
              {(["ingress", "loadbalancer", "nodeport", "clusterip"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSimServiceType(mode)}
                  className={`px-2.5 py-1 rounded text-xs font-mono border transition-all ${
                    simServiceType === mode
                      ? "bg-indigo-100 dark:bg-indigo-900/40 border-indigo-400 text-indigo-600 dark:text-indigo-400 font-bold"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Pod Load Counters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {["pod-web-1", "pod-web-2", "pod-web-3"].map((podName, idx) => (
              <div key={podName} className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-1">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Pod 0{idx + 1} ({podName})</div>
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400">10.244.{idx + 1}.{15 + idx * 30}:8080</div>
                <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 pt-1">{podCounters[podName]} Requests</div>
              </div>
            ))}
          </div>

          {/* Simulator Action Button & Trace Log Output */}
          <div className="space-y-3">
            <button
              onClick={handleSimulateRequest}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#58a6ff] to-[#7ee787] text-slate-900 dark:text-slate-100 font-bold text-xs font-mono shadow-lg hover:opacity-95 transition-opacity"
            >
              ⚡ Send Simulated Ingress Traffic Request
            </button>

            {packetTraceLogs.length > 0 && (
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-slate-100 space-y-1.5">
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-1 mb-2">
                  Real-time Packet Routing Hop Trace
                </div>
                {packetTraceLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">[{i + 1}]</span>
                    <span className={i === packetTraceLogs.length - 1 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-900 dark:text-slate-100"}>
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODULE 4: Helm Charts & ArgoCD GitOps Sync State Visualizer */}
      {/* ========================================================================= */}
      <section className="space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
              Module 4 • Continuous Deployment & GitOps
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              Helm Charts Packaging & ArgoCD GitOps Sync Visualizer
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Sync State:</span>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  syncStatus === "Synced"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : syncStatus === "OutOfSync"
                    ? "bg-[#ffa657]/15 text-amber-600 dark:text-amber-400"
                    : syncStatus === "Syncing"
                    ? "bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 animate-pulse"
                    : "bg-[#ff7b72]/15 text-rose-600 dark:text-rose-400"
                }`}
              >
                ● {syncStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Helm Values Customizer */}
          <div className="lg:col-span-5 space-y-5">
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              1. Helm Chart values.yaml Parameters
            </div>

            {/* Slider 1: Replicas */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-slate-100">replicaCount</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{helmReplicas} Pods</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={helmReplicas}
                onChange={(e) => setHelmReplicas(Number(e.target.value))}
                className="w-full accent-[#58a6ff]"
              />
            </div>

            {/* Input 2: Image Tag */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow space-y-1.5">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">image.tag</label>
              <input
                type="text"
                value={helmTag}
                onChange={(e) => setHelmTag(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-400"
              />
            </div>

            {/* Dropdown 3: Memory Limit */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow space-y-1.5">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">resources.limits.memory</label>
              <select
                value={helmMemoryLimit}
                onChange={(e) => setHelmMemoryLimit(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-400"
              >
                <option value="256Mi">256Mi</option>
                <option value="512Mi">512Mi</option>
                <option value="1024Mi">1024Mi (1Gi)</option>
                <option value="2048Mi">2048Mi (2Gi)</option>
              </select>
            </div>

            {/* Toggle 4: Ingress */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">ingress.enabled</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Provision NGINX Ingress rules</div>
              </div>
              <button
                onClick={() => setHelmIngressEnabled(!helmIngressEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                  helmIngressEnabled ? "bg-emerald-500" : "bg-[#30363d]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white dark:bg-slate-800 transition-transform ${
                    helmIngressEnabled ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Helm Code Tab Viewer */}
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow overflow-hidden flex flex-col min-h-[220px]">
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveHelmTab("values")}
                    className={`px-2.5 py-0.5 rounded text-xs font-mono ${
                      activeHelmTab === "values" ? "bg-slate-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    values.yaml
                  </button>
                  <button
                    onClick={() => setActiveHelmTab("deployment")}
                    className={`px-2.5 py-0.5 rounded text-xs font-mono ${
                      activeHelmTab === "deployment" ? "bg-slate-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    deployment.yaml
                  </button>
                </div>
              </div>
              <div className="p-3 font-mono text-[11px] text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 overflow-x-auto flex-1 whitespace-pre leading-relaxed">
                {activeHelmTab === "values" ? helmValuesYml : helmRenderedDeployment}
              </div>
            </div>
          </div>

          {/* Right Column: ArgoCD GitOps Sync Simulation Control Panel */}
          <div className="lg:col-span-7 space-y-6">
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              2. ArgoCD GitOps Continuous Reconciliation Dashboard
            </div>

            {/* State Comparison Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Git Repository State */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700 border border-indigo-300 dark:border-indigo-600 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>🐙</span> Git Source Repo
                  </span>
                  <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">SHA: {gitSha}</span>
                </div>
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">{gitCommitMsg}</div>
                <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 pt-1">Target Tag: {helmTag}</div>
              </div>

              {/* Live Cluster State */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700 border border-emerald-400/40 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>☸️</span> Live K8s Cluster
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">SHA: {clusterSha}</span>
                </div>
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400">Replicas: {helmReplicas} active pods</div>
                <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 pt-1">Health: {healthStatus}</div>
              </div>
            </div>

            {/* Control Actions Buttons Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={handleGitCommitChange}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-[#252d3d] border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 transition-all hover:scale-[1.02]"
              >
                1. Git Push (Update Tag)
              </button>

              <button
                onClick={handleTriggerArgoSync}
                className="p-2.5 rounded-xl bg-gradient-to-r from-[#58a6ff] to-[#7ee787] text-slate-900 dark:text-slate-100 font-bold text-xs font-mono shadow-md transition-all hover:scale-[1.02]"
              >
                2. ArgoCD Sync 🔄
              </button>

              <button
                onClick={handleSimulateDrift}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-[#252d3d] border border-amber-400/40 text-xs font-mono text-amber-600 dark:text-amber-400 transition-all hover:scale-[1.02]"
              >
                3. Cause Drift ⚠️
              </button>

              <button
                onClick={handleRollback}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-[#252d3d] border border-rose-400/40 text-xs font-mono text-rose-600 dark:text-rose-400 transition-all hover:scale-[1.02]"
              >
                4. Rollback Commit ⏪
              </button>
            </div>

            {/* Live Diff Viewer Box */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow font-mono text-xs min-h-[160px] space-y-1">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-1 mb-2 flex justify-between">
                <span>ArgoCD GitOps Live Unified Diff Viewer</span>
                <span>{diffView.length > 0 ? "Changes Detected" : "In Sync (0 diffs)"}</span>
              </div>

              {diffView.length > 0 ? (
                diffView.map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.startsWith("+")
                        ? "text-emerald-600 dark:text-emerald-400"
                        : line.startsWith("-")
                        ? "text-rose-600 dark:text-rose-400"
                        : line.startsWith("@")
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-slate-500 dark:text-slate-400"
                    }
                  >
                    {line}
                  </div>
                ))
              ) : (
                <div className="text-slate-500 dark:text-slate-400 text-center pt-8">
                  ✓ Desired Git State matches Live Cluster State perfectly. No drift detected.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SUB-MODULE 6: CONTAINER SECURITY SCANNING (#dk-security-scan) */}
      {/* ========================================================================= */}
      <DkSecurityScanSection />

      {/* ========================================================================= */}
      {/* SUB-MODULE 7: RESOURCE QUOTAS & LIMITS (#dk-resource-quotas) */}
      {/* ========================================================================= */}
      <DkResourceQuotasSection />

      {/* ========================================================================= */}
      {/* SUB-MODULE 8: NETWORK POLICY BUILDER (#dk-network-policy) */}
      {/* ========================================================================= */}
      <DkNetworkPolicySection />

      {/* ========================================================================= */}
      {/* SUB-MODULE 9: INGRESS & SERVICE MESH (#dk-ingress-mesh) */}
      {/* ========================================================================= */}
      <DkIngressServiceMeshSection />

      {/* ========================================================================= */}
      {/* SUB-MODULE 10: PERSISTENT VOLUMES (#dk-persistent-volumes) */}
      {/* ========================================================================= */}
      <DkPersistentVolumesSection />

      {/* ========================================================================= */}
      {/* SUB-MODULE 11: IMAGE REGISTRY & TAGS (#dk-image-registry) */}
      {/* ========================================================================= */}
      <DkImageRegistrySection />

      {/* ========================================================================= */}
      {/* SUB-MODULE 12: RBAC & SECURITY (#dk-rbac-security) */}
      {/* ========================================================================= */}
      <DkRbacSecuritySection />

      {/* ========================================================================= */}
      {/* SUB-MODULE 13: HPA & VPA AUTOSCALING (#dk-hpa-vpa) */}
      {/* ========================================================================= */}
      <DkHpaVpaSection />

      {/* ========================================================================= */}
      {/* SUB-MODULE 14: TROUBLESHOOTING (#dk-troubleshooting) */}
      {/* ========================================================================= */}
      <DkTroubleshootingSection />

      {/* ========================================================================= */}
      {/* SUB-MODULE 15: OBSERVABILITY STACK (#dk-observability) */}
      {/* ========================================================================= */}
      <DkObservabilitySection />
    </div>
  );
}
