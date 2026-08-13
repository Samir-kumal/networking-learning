"use client";

import { useState } from "react";

export default function ContainerSection() {
  // Subsection 1: K8s CIDR Types
  const [activeCidrTab, setActiveCidrTab] = useState<"node" | "pod" | "service">("pod");
  
  // Subsection 1: CNI Plugins
  const [selectedCni, setSelectedCni] = useState<"flannel" | "calico" | "cilium">("cilium");

  // Subsection 2: Docker Networking Modes
  const [dockerMode, setDockerMode] = useState<"bridge" | "host" | "overlay" | "macvlan">("bridge");

  // Subsection 3: L4 vs L7
  const [lbLayer, setLbLayer] = useState<"l4" | "l7">("l7");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Subsection 4: Interactive K8s Service Simulator
  const [simServiceType, setSimServiceType] = useState<"clusterip" | "nodeport" | "loadbalancer" | "headless" | "ingress">("loadbalancer");
  const [simEngine, setSimEngine] = useState<"iptables" | "ebpf">("ebpf");
  const [podStats, setPodStats] = useState<{ [key: string]: number }>({
    "pod-1": 0,
    "pod-2": 0,
    "pod-3": 0,
  });
  const [lastPacketTrace, setLastPacketTrace] = useState<string[]>([]);
  const [selectedPod, setSelectedPod] = useState<string | null>(null);
  const [totalRequests, setTotalRequests] = useState<number>(0);

  // Copy helper
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Clipboard access may be unavailable or denied; leave the copied state unchanged.
    }
  };

  // CNI Data
  const cniDetails = {
    flannel: {
      name: "Flannel CNI",
      creator: "CoreOS / CNCF",
      dataplane: "VXLAN / UDP Encapsulation",
      policySupport: "None (Requires Third-Party Policy Engine)",
      performance: "Moderate (UDP overhead / Kernel context switches)",
      architecture: "A common Flannel configuration assigns a node subnet from the cluster Pod CIDR and uses a VXLAN device to encapsulate traffic between nodes. The subnet size, backend, and UDP port are configuration choices.",
      yamlSnippet: `# Flannel CNI Core Config (Net-Conf)
net-conf.json: |
  {
    "Network": "10.244.0.0/16",
    "Backend": {
      "Type": "vxlan",
      "VNI": 1,
      "Port": 4789
    }
  }`,
    },
    calico: {
      name: "Calico CNI",
      creator: "Tigera",
      dataplane: "BGP Native L3 / VXLAN / eBPF",
      policySupport: "Rich L3/L4 NetworkPolicy & GlobalNetworkPolicy",
      performance: "High (No encapsulation in non-overlay BGP mode)",
      architecture: "Calico's Felix programs routes and policy into the node dataplane. In BGP mode, Calico can advertise Pod routes to peers; other deployments use VXLAN, IP-in-IP, or eBPF instead.",
      yamlSnippet: `# Calico NetworkPolicy Example (Zero-Trust API Isolation)
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
spec:
  selector: app == 'backend'
  ingress:
  - action: Allow
    protocol: TCP
    source:
      selector: app == 'frontend'
    destination:
      ports: [8080]`,
    },
    cilium: {
      name: "Cilium CNI (eBPF)",
      creator: "Isovalent / CNCF",
      dataplane: "eBPF (Extended Berkeley Packet Filter)",
      policySupport: "L3/L4 + L7 API-Aware (HTTP, gRPC, Kafka)",
      performance: "Can reduce per-packet overhead in supported datapaths; results depend on kernel, mode, and workload.",
      architecture: "Cilium uses eBPF programs at selected kernel hooks for networking, policy, and observability. It can integrate with or replace kube-proxy in supported modes; Hubble and WireGuard encryption are optional features.",
      yamlSnippet: `# Cilium L7 HTTP NetworkPolicy Example
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: secure-api-access
spec:
  endpointSelector:
    matchLabels:
      app: payment-service
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: checkout
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
      rules:
        http:
        - method: "POST"
          path: "/v1/charge"`,
    },
  };

  // Docker Data
  const dockerDetails = {
    bridge: {
      name: "Bridge Mode (Default)",
      flag: "docker run --net=bridge",
      subnet: "172.17.0.0/16 (docker0)",
      description: "Containers connect to a virtual software bridge (docker0) via virtual ethernet (veth) pairs. Outbound traffic commonly uses IP masquerading. User-defined bridges provide automatic container-name DNS lookup.",
      pros: ["Isolated container network namespace", "Automatic container DNS on custom bridges", "Useful default for standalone single-host containers"],
      cons: ["Port publishing may add NAT and filtering work", "Multi-host communication needs an overlay or other routing design"],
      command: "docker run -d --name web -p 8080:80 nginx:alpine",
    },
    host: {
      name: "Host Mode",
      flag: "docker run --net=host",
      subnet: "Shares Host Network (eth0)",
      description: "Shares the host network namespace, so the container binds directly to host interfaces and ports without a separate container veth/bridge path. Availability and behavior vary by platform.",
      pros: ["Avoids a separate bridge path", "Can suit workloads that need host-network access"],
      cons: ["No network isolation from host", "Port conflicts with host or other containers", "Feature availability varies by platform"],
      command: "docker run -d --net=host redis:alpine",
    },
    overlay: {
      name: "Overlay Mode (Swarm / Multi-Host)",
      flag: "docker network create -d overlay",
      subnet: "10.0.0.0/16 (Multi-Host VXLAN)",
      description: "Connects Docker hosts across physical networks using an overlay datapath such as VXLAN. Swarm mode supplies the control-plane membership and service routing features shown here.",
      pros: ["Multi-host container communication through Docker networking", "Can provide service discovery and ingress routing in Swarm"],
      cons: ["Encapsulation adds overhead", "Requires a compatible multi-host control plane and underlay reachability"],
      command: "docker network create -d overlay --attachable app-overlay",
    },
    macvlan: {
      name: "Macvlan Mode",
      flag: "docker run --net=macvlan_net",
      subnet: "Direct LAN Router Subnet (e.g. 192.168.1.0/24)",
      description: "Assigns a distinct MAC address and address from the connected Layer 2 network to each container interface. The parent network and switch must permit the resulting MAC traffic.",
      pros: ["Containers can appear as separate LAN endpoints", "Avoids the default bridge path and its NAT"],
      cons: ["Parent and switch configuration may limit MAC scale", "Host-to-container communication needs a sub-interface or another route"],
      command: "docker network create -d macvlan --subnet=192.168.1.0/24 --gateway=192.168.1.1 -o parent=eth0 macvlan_net",
    },
  };

  // Ingress Code Example
  const ingressYaml = `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: production-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  rules:
  - host: api.company.com
    http:
      paths:
      - path: /v1/users
        pathType: Prefix
        backend:
          service:
            name: user-service
            port:
              number: 8080
      - path: /v1/orders
        pathType: Prefix
        backend:
          service:
            name: order-service
            port:
              number: 9090`;

  // Simulator Packet Processing Handler
  const handleSendPacket = () => {
    const pods = ["pod-1", "pod-2", "pod-3"];
    const pickedPod = pods[Math.floor(Math.random() * pods.length)];
    const podIps: Record<string, string> = {
      "pod-1": "10.244.1.14:8080",
      "pod-2": "10.244.2.88:8080",
      "pod-3": "10.244.3.42:8080",
    };
    const nodeIps: Record<string, string> = {
      "pod-1": "192.168.10.101 (Worker-1)",
      "pod-2": "192.168.10.102 (Worker-2)",
      "pod-3": "192.168.10.103 (Worker-3)",
    };

    let trace: string[] = [];
    const clientPort = 49152 + Math.floor(Math.random() * 10000);
    const clientIp = `203.0.113.77:${clientPort}`;

    if (simServiceType === "clusterip") {
      trace = [
        `[CLIENT] Initiating connection from ${clientIp}`,
        `[POD KERNEL] Target ClusterIP Virtual Address 10.96.45.120:80`,
        simEngine === "iptables"
          ? `[KUBE-PROXY / IPTABLES] Applied the configured Service rules for endpoint selection`
          : `[CILIUM / eBPF] Applied the configured eBPF Service datapath`,
        `[DNAT OR LOAD BALANCE] Selected endpoint ${podIps[pickedPod]}`,
        `[DELIVERY] Packet routed to the selected endpoint on ${nodeIps[pickedPod]}`,
      ];
    } else if (simServiceType === "nodeport") {
      trace = [
        `[CLIENT] Initiating HTTP request to Node IP 192.168.10.101:31244`,
        `[NODE INTERFACE] Packet enters worker node eth0 on static NodePort 31244`,
        simEngine === "iptables"
          ? `[KUBE-PROXY / IPTABLES] Applied the configured NodePort rules`
          : `[CILIUM / eBPF] Applied the configured NodePort datapath`,
        `[LOAD BALANCING] Selected one endpoint from the available targets`,
        `[FINAL ROUTE] Forwarded to ${pickedPod.toUpperCase()} (${podIps[pickedPod]}) on host ${nodeIps[pickedPod]}`,
      ];
    } else if (simServiceType === "loadbalancer") {
      trace = [
        `[CLIENT] Request sent to Cloud Public Load Balancer IP 52.84.12.190:80`,
        `[CLOUD L4 LB] Health-checked forwarding to Worker Node NodePort (192.168.10.102:31244)`,
        `[NODE INGRESS] Packet lands on host network interface eth0`,
        simEngine === "iptables"
          ? `[IPTABLES OR PROXY] Selected one healthy endpoint for this illustrative request`
          : `[eBPF DATAPATH] Selected one healthy endpoint for this illustrative request`,
        `[TARGET POD] HTTP 200 OK returned from ${pickedPod.toUpperCase()} (${podIps[pickedPod]})`,
      ];
    } else if (simServiceType === "headless") {
      trace = [
        `[COREDNS] Returned direct Pod A/AAAA records (headless Service has no ClusterIP): [10.244.1.14, 10.244.2.88, 10.244.3.42]`,
        `[CLIENT] Resolved a Pod address and opened a connection to ${podIps[pickedPod]}`,
        `[HEADLESS SERVICE] This path normally avoids a Service VIP; client selection and retries are implementation-dependent`,
        `[POD ESTABLISHED] Direct stateful TCP connection opened with ${pickedPod.toUpperCase()}`,
      ];
    } else {
      // Ingress
      trace = [
        `[CLIENT] HTTPS request to 'https://api.company.com/v1/orders' (Client IP: ${clientIp})`,
        `[L7 INGRESS CONTROLLER] NGINX/Envoy Pod terminated TLS certificate and parsed HTTP Host/Path headers`,
        `[ENDPOINT SELECTION] Ingress controller selected a backend endpoint for the Service`,
        simEngine === "iptables"
          ? `[HTTP PROXY PASS] Proxied the request to Pod IP ${podIps[pickedPod]}`
          : `[eBPF DATAPATH] Delivered the request using the configured kernel datapath`,
      ];
    }

    setPodStats((prev) => ({
      ...prev,
      [pickedPod]: prev[pickedPod] + 1,
    }));
    setSelectedPod(pickedPod);
    setLastPacketTrace(trace);
    setTotalRequests((prev) => prev + 1);
  };

  const handleResetSim = () => {
    setPodStats({ "pod-1": 0, "pod-2": 0, "pod-3": 0 });
    setLastPacketTrace([]);
    setSelectedPod(null);
    setTotalRequests(0);
  };

  return (
    <section
      id="containers"
      className="scroll-mt-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 text-[11px] font-semibold">
          #containers
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
          <span className="text-indigo-500 dark:text-indigo-400" aria-hidden="true">⊞</span>
          20. Cloud-Native & Container Networking
        </h2>
      </div>

      <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed mb-8 max-w-4xl">
        Modern cloud-native systems rely on virtualized network namespaces (<code className="text-emerald-600 dark:text-emerald-400 font-mono">netns</code>), virtual ethernet pairs (<code className="text-emerald-600 dark:text-emerald-400 font-mono">veth</code>), overlay tunnels, and kernel-level packet manipulation. Discover how Kubernetes CNI plugins, Docker isolation modes, and Layer 4/7 load balancers route microservice traffic at scale.
      </p>

      {/* SUBSECTION 1: Kubernetes Networking Architecture */}
      <div className="mb-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            1. Kubernetes Networking Architecture & CIDR Ranges
          </h3>
        </div>

        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
          Kubernetes defines a Pod networking model: each Pod is assigned an IP by the cluster network plugin, and the plugin is expected to provide Pod-to-Pod connectivity without NAT. Exact routing, encapsulation, and policy behavior depend on the CNI implementation.
        </p>

        {/* CIDR Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 dark:border-slate-700 pb-3">
          <button
            onClick={() => setActiveCidrTab("pod")}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeCidrTab === "pod"
                ? "bg-indigo-100 text-indigo-600 dark:text-indigo-400 border border-indigo-300 shadow-sm"
                : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
            }`}
          >
            Pod CIDR (Virtual Containers)
          </button>
          <button
            onClick={() => setActiveCidrTab("service")}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeCidrTab === "service"
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-400/40 shadow-sm"
                : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
            }`}
          >
            Service CIDR (Virtual VIPs)
          </button>
          <button
            onClick={() => setActiveCidrTab("node")}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeCidrTab === "node"
                ? "bg-[#ffa657]/20 text-amber-600 dark:text-amber-400 border border-amber-400/40 shadow-sm"
                : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
            }`}
          >
            Node CIDR (Physical / Cloud Subnet)
          </button>
        </div>

        {/* Tab Content Display */}
        {activeCidrTab === "pod" && (
          <div className="rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">Pod CIDR Range: 10.244.0.0/16</span>
              <span className="text-xs px-2.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 font-mono">
                Allocated per Node (/24 per Worker)
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Pods receive IP addresses from the cluster network plugin and expose them on the Pod&apos;s network interface. Addresses are usually ephemeral: recreating or rescheduling a Pod may change its IP, so Services provide stable discovery.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 rounded bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                <div className="text-emerald-600 dark:text-emerald-400 font-bold mb-1">Worker Node 1 Subnet</div>
                <div className="text-slate-900 dark:text-slate-100">10.244.1.0/24</div>
                <div className="text-slate-500 dark:text-slate-400 mt-1 text-[11px]">Pods: 10.244.1.2 - 10.244.1.254</div>
              </div>
              <div className="p-3 rounded bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                <div className="text-emerald-600 dark:text-emerald-400 font-bold mb-1">Worker Node 2 Subnet</div>
                <div className="text-slate-900 dark:text-slate-100">10.244.2.0/24</div>
                <div className="text-slate-500 dark:text-slate-400 mt-1 text-[11px]">Pods: 10.244.2.2 - 10.244.2.254</div>
              </div>
              <div className="p-3 rounded bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                <div className="text-emerald-600 dark:text-emerald-400 font-bold mb-1">Worker Node 3 Subnet</div>
                <div className="text-slate-900 dark:text-slate-100">10.244.3.0/24</div>
                <div className="text-slate-500 dark:text-slate-400 mt-1 text-[11px]">Pods: 10.244.3.2 - 10.244.3.254</div>
              </div>
            </div>
          </div>
        )}

        {activeCidrTab === "service" && (
          <div className="rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">Service ClusterIP CIDR: 10.96.0.0/12</span>
              <span className="text-xs px-2.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-400/20 font-mono">
                Virtual VIP (Kernel Intercept Only)
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              A <code className="text-emerald-600 dark:text-emerald-400 font-mono">ClusterIP</code> is normally a virtual service address rather than an address assigned to a node NIC. kube-proxy or another dataplane implementation steers traffic to ready endpoints; the exact mechanism may be DNAT, load balancing, proxying, or eBPF.
            </p>
            <div className="p-3 rounded bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-mono text-xs">
              <span className="text-amber-600 dark:text-amber-400">Translation Flow:</span> Client Pod (10.244.1.10) ➔ Sends to Service VIP (10.96.45.100:80) ➔ Kernel DNAT ➔ Target Pod IP (10.244.2.88:8080)
            </div>
          </div>
        )}

        {activeCidrTab === "node" && (
          <div className="rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400">Node CIDR Range: 192.168.10.0/24</span>
              <span className="text-xs px-2.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-400/20 font-mono">
                Physical / VPC Interface (eth0)
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Node addresses belong to the host network used for node-to-node traffic, kubelet and control-plane communication, and NodePort exposure. A node may be a physical machine or a virtual machine; the exact interfaces depend on the environment.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                <div className="text-indigo-600 dark:text-indigo-400">Control-Plane Node</div>
                <div>192.168.10.100</div>
              </div>
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                <div className="text-emerald-600 dark:text-emerald-400">Worker-1 Node</div>
                <div>192.168.10.101</div>
              </div>
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                <div className="text-amber-600 dark:text-amber-400">Worker-2 Node</div>
                <div>192.168.10.102</div>
              </div>
            </div>
          </div>
        )}

        {/* CNI Plugin Selector */}
        <div className="mt-8">
          <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
            <span>🔌 CNI (Container Network Interface) Plugins Comparison</span>
          </h4>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
            {(["flannel", "calico", "cilium"] as const).map((cni) => (
              <button
                key={cni}
                onClick={() => setSelectedCni(cni)}
                className={`py-3 px-3 rounded-xl border text-center transition-all ${
                  selectedCni === cni
                    ? "bg-indigo-600/15 border-indigo-400 text-slate-900 dark:text-slate-100 shadow-md font-bold"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[#8b949e]/40"
                }`}
              >
                <div className="capitalize text-sm sm:text-base font-bold">{cni}</div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 hidden sm:block mt-0.5">
                  {cni === "flannel" ? "VXLAN Overlay" : cni === "calico" ? "BGP + Policy" : "eBPF Next-Gen"}
                </div>
              </button>
            ))}
          </div>

          {/* Active CNI Box */}
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h4 className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{cniDetails[selectedCni].name}</h4>
                <span className="text-xs text-slate-500 dark:text-slate-400">Project Maintainer: {cniDetails[selectedCni].creator}</span>
              </div>
              <div className="flex gap-2">
                <span className="px-2.5 py-1 rounded text-xs font-mono bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-400/20">
                  {cniDetails[selectedCni].dataplane}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                <span className="text-amber-600 dark:text-amber-400 font-semibold block mb-1">NetworkPolicy Enforcement:</span>
                <span className="text-slate-900 dark:text-slate-100">{cniDetails[selectedCni].policySupport}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold block mb-1">Performance Profile:</span>
                <span className="text-slate-900 dark:text-slate-100">{cniDetails[selectedCni].performance}</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              {cniDetails[selectedCni].architecture}
            </p>

            {/* YAML Code Snippet */}
            <div className="relative rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-4 font-mono text-xs overflow-x-auto text-emerald-600 dark:text-emerald-400">
              <pre>{cniDetails[selectedCni].yamlSnippet}</pre>
            </div>
          </div>
        </div>
      </div>

      {/* SUBSECTION 2: Docker Networking Modes */}
      <div className="mb-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            2. Docker Networking Drivers & Modes
          </h3>
        </div>

        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
          Docker uses container network drivers to manipulate Linux network namespaces, iptables NAT tables, and virtual interfaces. Select a mode below to analyze host binding, performance, and packet paths.
        </p>

        {/* Docker Mode Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {(["bridge", "host", "overlay", "macvlan"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setDockerMode(mode)}
              className={`p-3 rounded-xl border text-left transition-all ${
                dockerMode === mode
                  ? "bg-emerald-500/15 border-emerald-400 text-slate-900 dark:text-slate-100 shadow-md font-bold"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[#8b949e]/40"
              }`}
            >
              <div className="capitalize text-sm font-bold">{mode}</div>
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate mt-1">
                {mode === "bridge" ? "docker0 Virtual Bridge" : mode === "host" ? "Shares Host eth0" : mode === "overlay" ? "VXLAN Multi-Host" : "Direct Physical MAC"}
              </div>
            </button>
          ))}
        </div>

        {/* Selected Docker Mode Card */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-slate-200 dark:border-slate-700 pb-3">
            <div>
              <h4 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{dockerDetails[dockerMode].name}</h4>
              <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{dockerDetails[dockerMode].flag}</span>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-400/20">
              Subnet Scope: {dockerDetails[dockerMode].subnet}
            </span>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            {dockerDetails[dockerMode].description}
          </p>

          {/* Pros and Cons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700 border border-emerald-200 dark:border-emerald-700">
              <h5 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>✓ Architectural Advantages</span>
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-900 dark:text-slate-100">
                {dockerDetails[dockerMode].pros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700 border border-rose-200 dark:border-rose-700">
              <h5 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>⚠ Technical Limitations</span>
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-900 dark:text-slate-100">
                {dockerDetails[dockerMode].cons.map((con, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-rose-600 dark:text-rose-400 font-bold">•</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Docker CLI Command */}
          <div>
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mb-1.5">Docker CLI Execution Example:</div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-mono text-xs text-indigo-600 dark:text-indigo-400 overflow-x-auto">
              {dockerDetails[dockerMode].command}
            </div>
          </div>
        </div>
      </div>

      {/* SUBSECTION 3: L4 vs L7 Load Balancing & Ingress Architecture */}
      <div className="mb-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffa657]"></span>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            3. Layer 4 (L4) vs Layer 7 (L7) Load Balancing & Ingress
          </h3>
        </div>

        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
          Load balancers operate at different OSI layers to distribute traffic across container replicas. Compare transport-level packet routing (L4) with application-level HTTP routing (L7).
        </p>

        {/* L4 / L7 Toggle Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setLbLayer("l4")}
            className={`flex-1 p-4 rounded-xl border transition-all text-left ${
              lbLayer === "l4"
                ? "bg-[#ffa657]/15 border-amber-400 text-slate-900 dark:text-slate-100 shadow-md"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[#8b949e]/40"
            }`}
          >
            <div className="text-base font-bold text-amber-600 dark:text-amber-400 mb-1">Layer 4 (L4) Transport Load Balancer</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">TCP/UDP Stream Switching (AWS NLB, IPVS, K8s Service)</div>
          </button>

          <button
            onClick={() => setLbLayer("l7")}
            className={`flex-1 p-4 rounded-xl border transition-all text-left ${
              lbLayer === "l7"
                ? "bg-[#bc8cff]/15 border-violet-400 text-slate-900 dark:text-slate-100 shadow-md"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[#8b949e]/40"
            }`}
          >
            <div className="text-base font-bold text-violet-600 dark:text-violet-400 mb-1">Layer 7 (L7) Application Ingress</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">HTTP/HTTPS Path & Header Routing (NGINX, Envoy, Traefik)</div>
          </button>
        </div>

        {/* Layer Comparison Details */}
        {lbLayer === "l4" ? (
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 p-5 mb-6">
            <h4 className="text-base font-bold text-amber-600 dark:text-amber-400 mb-3">⚡ L4 Load Balancing Mechanics</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4">
              <li className="flex items-start gap-2">
                <span className="text-amber-600 dark:text-amber-400 font-bold">✓</span>
                <span><strong className="text-slate-900 dark:text-slate-100">Inspection Depth:</strong> Reads IP addresses and TCP/UDP port headers only. Does <strong className="text-rose-600 dark:text-rose-400">not</strong> decrypt TLS or inspect HTTP payload content.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 dark:text-amber-400 font-bold">✓</span>
                <span><strong className="text-slate-900 dark:text-slate-100">Performance:</strong> Extremely high packet throughput (millions QPS) with ultra-low latency sub-millisecond overhead.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 dark:text-amber-400 font-bold">✓</span>
                <span><strong className="text-slate-900 dark:text-slate-100">Use Cases:</strong> Database connection pools (PostgreSQL/MySQL), gRPC persistent streams, DNS resolvers, and non-HTTP protocols.</span>
              </li>
            </ul>
          </div>
        ) : (
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-700 p-5 mb-6">
            <h4 className="text-base font-bold text-violet-600 dark:text-violet-400 mb-3">🌐 L7 Ingress Controller Mechanics</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4">
              <li className="flex items-start gap-2">
                <span className="text-violet-600 dark:text-violet-400 font-bold">✓</span>
                <span><strong className="text-slate-900 dark:text-slate-100">Inspection Depth:</strong> Decrypts TLS certificates (HTTPS Termination), parses HTTP methods, URI paths (<code className="text-emerald-600 dark:text-emerald-400 font-mono">/v1/users</code>), Host headers (<code className="text-emerald-600 dark:text-emerald-400 font-mono">api.domain.com</code>), and cookies.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-600 dark:text-violet-400 font-bold">✓</span>
                <span><strong className="text-slate-900 dark:text-slate-100">Advanced Traffic Controls:</strong> Supports Canary deployment traffic splits (90/10 weighted routing), rate-limiting, CORS injection, and Web Application Firewall (WAF) rule sets.</span>
              </li>
              <li className="flex items-start gap-2">
                <span><strong className="text-slate-900 dark:text-slate-100">Endpoint selection:</strong> An Ingress controller may watch Service endpoints and proxy to Pod addresses; the exact path depends on the controller and Service configuration.</span>
              </li>
            </ul>
          </div>
        )}

        {/* Kubernetes Ingress Manifest Example */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-semibold text-violet-600 dark:text-violet-400">Kubernetes Ingress Manifest (networking.k8s.io/v1)</span>
            <button
              onClick={() => handleCopy(ingressYaml)}
              className="px-3 py-1 rounded bg-[#30363d] hover:bg-[#30363d]/80 text-slate-900 dark:text-slate-100 text-xs font-mono transition-all"
            >
              {copiedCode ? "Copied!" : "Copy YAML"}
            </button>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-4 font-mono text-xs overflow-x-auto text-emerald-600 dark:text-emerald-400">
            <pre>{ingressYaml}</pre>
          </div>
        </div>
      </div>

      {/* SUBSECTION 4: Interactive K8s Service IP Routing Simulator */}
      <div className="rounded-xl bg-slate-50 dark:bg-slate-700 border border-indigo-300 p-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-600 animate-pulse"></span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              4. Interactive K8s Service IP Routing Simulator
            </h3>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700">
            Live Kernel Packet Processing
          </span>
        </div>

        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
          Test how incoming client packets travel through Kubernetes abstractions (<code className="text-emerald-600 dark:text-emerald-400 font-mono">ClusterIP</code>, <code className="text-emerald-600 dark:text-emerald-400 font-mono">NodePort</code>, <code className="text-emerald-600 dark:text-emerald-400 font-mono">LoadBalancer</code>, <code className="text-emerald-600 dark:text-emerald-400 font-mono">Headless</code>, and <code className="text-emerald-600 dark:text-emerald-400 font-mono">Ingress</code>) using either legacy <strong className="text-amber-600 dark:text-amber-400">iptables</strong> or high-performance <strong className="text-emerald-600 dark:text-emerald-400">eBPF</strong> data paths!
        </p>

        {/* Controls Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Controls: Service Type */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <label className="block text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
              Select K8s Service Type:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(["clusterip", "nodeport", "loadbalancer", "headless", "ingress"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSimServiceType(type)}
                  className={`p-2 rounded-lg text-xs font-mono font-bold capitalize transition-all border ${
                    simServiceType === type
                      ? "bg-indigo-100 text-indigo-600 dark:text-indigo-400 border-indigo-400"
                      : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:text-slate-100"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Controls: Engine Mode */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <label className="block text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
              Select Data Path Engine:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSimEngine("iptables")}
                className={`p-3 rounded-lg text-xs font-mono font-bold transition-all border ${
                  simEngine === "iptables"
                    ? "bg-[#ffa657]/20 text-amber-600 dark:text-amber-400 border-amber-400"
                    : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:text-slate-100"
                }`}
              >
                <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400 mt-1">Configured kernel rule datapath</div>
              </button>
              <button
                onClick={() => setSimEngine("ebpf")}
                className={`p-3 rounded-lg text-xs font-mono font-bold transition-all border ${
                  simEngine === "ebpf"
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-400"
                    : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:text-slate-100"
                }`}
              >
                <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400 mt-1">Configured eBPF datapath</div>
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={handleSendPacket}
            className="flex-1 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-600/90 text-slate-900 dark:text-slate-100 font-bold text-sm transition-all shadow-lg hover:shadow-[#58a6ff]/20 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <span>🚀 Send Packet / Trigger Request</span>
          </button>
          <button
            onClick={handleResetSim}
            className="py-3 px-4 rounded-xl bg-[#30363d] hover:bg-[#30363d]/80 text-slate-900 dark:text-slate-100 font-bold text-xs transition-all"
          >
            Reset Stats
          </button>
        </div>

        {/* Backend Pod Distribution Grid */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Backend Pod Target Replicas (Total Requests: {totalRequests})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: "pod-1", ip: "10.244.1.14:8080", node: "Worker-1 (192.168.10.101)" },
              { id: "pod-2", ip: "10.244.2.88:8080", node: "Worker-2 (192.168.10.102)" },
              { id: "pod-3", ip: "10.244.3.42:8080", node: "Worker-3 (192.168.10.103)" },
            ].map((pod) => {
              const isSelected = selectedPod === pod.id;
              const count = podStats[pod.id];
              const pct = totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0;

              return (
                <div
                  key={pod.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isSelected
                      ? "bg-indigo-600/15 border-indigo-400 scale-[1.02] shadow-md"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 uppercase">{pod.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                        isSelected ? "bg-indigo-600 text-slate-900 dark:text-slate-100" : "bg-[#30363d] text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {count} Hits ({pct}%)
                    </span>
                  </div>
                  <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 mb-1">Pod IP: {pod.ip}</div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-3">{pod.node}</div>

                  {/* Meter Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-50 dark:bg-slate-700 overflow-hidden border border-slate-200 dark:border-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-[#58a6ff] to-[#7ee787] transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Packet Translation Log */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow p-5 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2 mb-3">
            <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-2">
              <span>📡 Live Packet Translation Trace</span>
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Engine: {simEngine === "iptables" ? "iptables DNAT" : "eBPF bpf_sockmap"}
            </span>
          </div>

          {lastPacketTrace.length === 0 ? (
            <div className="text-slate-500 dark:text-slate-400 italic text-center py-6">
              Click &quot;Send Packet / Trigger Request&quot; above to trace kernel packet routing...
            </div>
          ) : (
            <div className="space-y-2">
              {lastPacketTrace.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">{idx + 1}.</span>
                  <span className={idx === lastPacketTrace.length - 1 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-900 dark:text-slate-100"}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
