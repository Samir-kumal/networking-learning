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
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // CNI Data
  const cniDetails = {
    flannel: {
      name: "Flannel CNI",
      creator: "CoreOS / CNCF",
      dataplane: "VXLAN / UDP Encapsulation",
      policySupport: "None (Requires Third-Party Policy Engine)",
      performance: "Moderate (UDP overhead / Kernel context switches)",
      architecture: "Assigns a dedicated /24 subnet per node from the global Pod CIDR. Creates a flannel.1 VXLAN overlay interface on each host to encapsulate Layer 2 frames in UDP packets (port 4789).",
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
      architecture: "Uses Felix agent on each node to manipulate Linux kernel routing tables and iptables/eBPF. Runs BIRD BGP peer on each node to advertise Pod IPs directly to physical Top-of-Rack (ToR) switches without overlay overhead.",
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
      performance: "Maximum (Direct socket bypass, bypasses iptables/IPVS)",
      architecture: "Injects bytecode programs directly into kernel hooks (tc, cgroups, XDP). Replaces iptables DNAT entirely with eBPF BPF_MAP lookup tables. Provides Hubble deep flow observability and transparent WireGuard encryption.",
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
      description: "Containers connect to a virtual software bridge (docker0) via virtual ethernet (veth) pairs. Outbound traffic uses IP Masquerading (NAT). User-defined bridges enable automatic container name DNS lookup.",
      pros: ["Isolated container network namespace", "Automatic container DNS on custom bridges", "Secure default for standalone single-host containers"],
      cons: ["Port forwarding NAT overhead", "Cannot span across multiple physical hosts without custom routing"],
      command: "docker run -d --name web -p 8080:80 nginx:alpine",
    },
    host: {
      name: "Host Mode",
      flag: "docker run --net=host",
      subnet: "Shares Host Network (eth0)",
      description: "Removes network isolation between container and host. Container directly binds host IP interfaces and ports. Port 80 in container listens directly on host interface IP:80 without NAT or veth overhead.",
      pros: ["Zero NAT or bridge performance overhead", "Maximum packet-per-second throughput", "Ideal for low-latency network benchmarks"],
      cons: ["No network isolation from host", "Port conflicts (two containers cannot bind port 80 simultaneously)", "Linux host only"],
      command: "docker run -d --net=host redis:alpine",
    },
    overlay: {
      name: "Overlay Mode (Swarm / Multi-Host)",
      flag: "docker network create -d overlay",
      subnet: "10.0.0.0/16 (Multi-Host VXLAN)",
      description: "Connects multiple Docker daemon hosts across physical networks. Encapsulates Layer 2 container frames inside Layer 4 UDP packets via VXLAN (port 4789). Includes built-in ingress routing mesh & Virtual IP load balancing.",
      pros: ["Multi-host container communication out-of-the-box", "Built-in VIP load balancing", "Encrypted control plane and data plane options"],
      cons: ["VXLAN encapsulation header overhead (50 bytes)", "Requires Docker Swarm cluster state or key-value store"],
      command: "docker network create -d overlay --attachable app-overlay",
    },
    macvlan: {
      name: "Macvlan Mode",
      flag: "docker run --net=macvlan_net",
      subnet: "Direct LAN Router Subnet (e.g. 192.168.1.0/24)",
      description: "Assigns a unique physical MAC address to each container interface. Containers appear as distinct, direct physical devices on your LAN network switch/router.",
      pros: ["Containers get real physical LAN IP addresses", "Bypasses host bridge and iptables NAT", "Ideal for legacy monitoring & network traffic analyzers"],
      cons: ["Requires network switch interface in promiscuous mode", "Host cannot ping macvlan containers directly without sub-interface workaround"],
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
          ? `[KUBE-PROXY / IPTABLES] Evaluated iptables KUBE-SERVICES chain ($O(N)$ random rule matching)`
          : `[CILIUM / eBPF] Intercepted at socket layer via bpf_sockmap ($O(1)$ BPF hash lookup, bypasses TCP stack overhead)`,
        `[DNAT REWRITE] Translated Destination VIP 10.96.45.120:80 ➔ Pod IP ${podIps[pickedPod]}`,
        `[DELIVERY] Packet routed directly to target container on ${nodeIps[pickedPod]}`,
      ];
    } else if (simServiceType === "nodeport") {
      trace = [
        `[CLIENT] Initiating HTTP request to Node IP 192.168.10.101:31244`,
        `[NODE INTERFACE] Packet enters worker node eth0 on static NodePort 31244`,
        simEngine === "iptables"
          ? `[KUBE-PROXY / IPTABLES] Rule KUBE-NODEPORTS triggered DNAT state machine`
          : `[CILIUM / eBPF] XDP (eXpress Data Path) kernel hook intercepted packet before sk_buff allocation`,
        `[LOAD BALANCING] Load balanced across 3 available Endpoint IP targets`,
        `[FINAL ROUTE] Forwarded to ${pickedPod.toUpperCase()} (${podIps[pickedPod]}) on host ${nodeIps[pickedPod]}`,
      ];
    } else if (simServiceType === "loadbalancer") {
      trace = [
        `[CLIENT] Request sent to Cloud Public Load Balancer IP 52.84.12.190:80`,
        `[CLOUD L4 LB] Health-checked forwarding to Worker Node NodePort (192.168.10.102:31244)`,
        `[NODE INGRESS] Packet lands on host network interface eth0`,
        simEngine === "iptables"
          ? `[IPTABLES DNAT] Selected target Pod via random probability weight (33.3%)`
          : `[eBPF BPF_MAP] Selected target Endpoint IP with zero-copy eBPF socket redirection`,
        `[TARGET POD] HTTP 200 OK returned from ${pickedPod.toUpperCase()} (${podIps[pickedPod]})`,
      ];
    } else if (simServiceType === "headless") {
      trace = [
        `[CLIENT] Querying CoreDNS for headless service 'db-headless.default.svc.cluster.local'`,
        `[COREDNS] Returned direct Pod A/AAAA Records (No Service ClusterIP assigned!): [10.244.1.14, 10.244.2.88, 10.244.3.42]`,
        `[DIRECT CLIENT CONN] Client DNS round-robin selected target Pod IP directly: ${podIps[pickedPod]}`,
        `[NO PROXY OVERHEAD] Bypassed kube-proxy / iptables / VIP translation layer completely`,
        `[POD ESTABLISHED] Direct stateful TCP connection opened with ${pickedPod.toUpperCase()}`,
      ];
    } else {
      // Ingress
      trace = [
        `[CLIENT] HTTPS request to 'https://api.company.com/v1/orders' (Client IP: ${clientIp})`,
        `[L7 INGRESS CONTROLLER] NGINX/Envoy Pod terminated TLS certificate and parsed HTTP Host/Path headers`,
        `[PATH MATCHING] Path '/v1/orders' matched Service target rule 'order-service:9090'`,
        `[DIRECT ENDPOINTS] Ingress Controller fetched K8s Endpoints API directly (bypassing ClusterIP NAT)`,
        simEngine === "iptables"
          ? `[HTTP PROXY PASS] Proxying HTTP request payload to Pod IP ${podIps[pickedPod]}`
          : `[eBPF FAST PATH] eBPF socket redirection delivered payload to Pod ${pickedPod.toUpperCase()} with 0-copy`,
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
      className="scroll-mt-24 rounded-2xl bg-[#161b22] border border-[#30363d] p-6 sm:p-8 transition-colors hover:border-[#58a6ff]/40"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-md bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20 text-xs font-mono font-semibold">
          #containers
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#e6edf3]">
          21. Cloud-Native & Container Networking
        </h2>
      </div>

      <p className="text-[#8b949e] text-base leading-relaxed mb-8 max-w-4xl">
        Modern cloud-native systems rely on virtualized network namespaces (<code className="text-[#7ee787] font-mono">netns</code>), virtual ethernet pairs (<code className="text-[#7ee787] font-mono">veth</code>), overlay tunnels, and kernel-level packet manipulation. Discover how Kubernetes CNI plugins, Docker isolation modes, and Layer 4/7 load balancers route microservice traffic at scale.
      </p>

      {/* SUBSECTION 1: Kubernetes Networking Architecture */}
      <div className="mb-12 rounded-xl bg-[#1c2333] border border-[#30363d] p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-[#58a6ff]"></span>
          <h3 className="text-xl font-bold text-[#e6edf3]">
            1. Kubernetes Networking Architecture & CIDR Ranges
          </h3>
        </div>

        <p className="text-[#8b949e] text-sm mb-6 leading-relaxed">
          Kubernetes enforces a mandatory IP-per-Pod flat network model: every Pod gets its own routable IP address and can communicate with all other Pods across nodes without NAT.
        </p>

        {/* CIDR Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-[#30363d] pb-3">
          <button
            onClick={() => setActiveCidrTab("pod")}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeCidrTab === "pod"
                ? "bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/40 shadow-sm"
                : "bg-[#161b22] text-[#8b949e] hover:text-[#e6edf3] border border-[#30363d]"
            }`}
          >
            Pod CIDR (Virtual Containers)
          </button>
          <button
            onClick={() => setActiveCidrTab("service")}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeCidrTab === "service"
                ? "bg-[#7ee787]/20 text-[#7ee787] border border-[#7ee787]/40 shadow-sm"
                : "bg-[#161b22] text-[#8b949e] hover:text-[#e6edf3] border border-[#30363d]"
            }`}
          >
            Service CIDR (Virtual VIPs)
          </button>
          <button
            onClick={() => setActiveCidrTab("node")}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeCidrTab === "node"
                ? "bg-[#ffa657]/20 text-[#ffa657] border border-[#ffa657]/40 shadow-sm"
                : "bg-[#161b22] text-[#8b949e] hover:text-[#e6edf3] border border-[#30363d]"
            }`}
          >
            Node CIDR (Physical / Cloud Subnet)
          </button>
        </div>

        {/* Tab Content Display */}
        {activeCidrTab === "pod" && (
          <div className="rounded-lg bg-[#161b22] border border-[#58a6ff]/30 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-mono font-bold text-[#58a6ff]">Pod CIDR Range: 10.244.0.0/16</span>
              <span className="text-xs px-2.5 py-0.5 rounded bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20 font-mono">
                Allocated per Node (/24 per Worker)
              </span>
            </div>
            <p className="text-sm text-[#8b949e] mb-4">
              Real IP addresses assigned directly to container network interfaces (<code className="text-[#7ee787] font-mono">eth0</code> inside Pod). Allocated dynamically by the CNI plugin when Pods start up. Pod IPs change every time a Pod is recreated or rescheduled.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 rounded bg-[#1c2333] border border-[#30363d]">
                <div className="text-[#7ee787] font-bold mb-1">Worker Node 1 Subnet</div>
                <div className="text-[#e6edf3]">10.244.1.0/24</div>
                <div className="text-[#8b949e] mt-1 text-[11px]">Pods: 10.244.1.2 - 10.244.1.254</div>
              </div>
              <div className="p-3 rounded bg-[#1c2333] border border-[#30363d]">
                <div className="text-[#7ee787] font-bold mb-1">Worker Node 2 Subnet</div>
                <div className="text-[#e6edf3]">10.244.2.0/24</div>
                <div className="text-[#8b949e] mt-1 text-[11px]">Pods: 10.244.2.2 - 10.244.2.254</div>
              </div>
              <div className="p-3 rounded bg-[#1c2333] border border-[#30363d]">
                <div className="text-[#7ee787] font-bold mb-1">Worker Node 3 Subnet</div>
                <div className="text-[#e6edf3]">10.244.3.0/24</div>
                <div className="text-[#8b949e] mt-1 text-[11px]">Pods: 10.244.3.2 - 10.244.3.254</div>
              </div>
            </div>
          </div>
        )}

        {activeCidrTab === "service" && (
          <div className="rounded-lg bg-[#161b22] border border-[#7ee787]/30 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-mono font-bold text-[#7ee787]">Service ClusterIP CIDR: 10.96.0.0/12</span>
              <span className="text-xs px-2.5 py-0.5 rounded bg-[#7ee787]/10 text-[#7ee787] border border-[#7ee787]/20 font-mono">
                Virtual VIP (Kernel Intercept Only)
              </span>
            </div>
            <p className="text-sm text-[#8b949e] mb-4">
              Virtual IP (VIP) range assigned to Kubernetes <code className="text-[#7ee787] font-mono">ClusterIP</code> service objects. Service IPs <strong className="text-[#e6edf3]">never exist on any physical host network interface</strong>! Packets addressed to a Service VIP are intercepted inside the host Linux kernel by iptables rules or eBPF programs and rewritten (DNAT) to point to healthy Pod IPs.
            </p>
            <div className="p-3 rounded bg-[#1c2333] border border-[#30363d] font-mono text-xs">
              <span className="text-[#ffa657]">Translation Flow:</span> Client Pod (10.244.1.10) ➔ Sends to Service VIP (10.96.45.100:80) ➔ Kernel DNAT ➔ Target Pod IP (10.244.2.88:8080)
            </div>
          </div>
        )}

        {activeCidrTab === "node" && (
          <div className="rounded-lg bg-[#161b22] border border-[#ffa657]/30 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-mono font-bold text-[#ffa657]">Node CIDR Range: 192.168.10.0/24</span>
              <span className="text-xs px-2.5 py-0.5 rounded bg-[#ffa657]/10 text-[#ffa657] border border-[#ffa657]/20 font-mono">
                Physical / VPC Interface (eth0)
              </span>
            </div>
            <p className="text-sm text-[#8b949e] mb-4">
              IP addresses assigned to physical server NICs or Cloud EC2/VM instances. Used for node-to-node cluster communication, etcd quorum state sync, kubelet control plane communication, and external NodePort ingress traffic.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-2.5 rounded bg-[#1c2333] border border-[#30363d] text-[#e6edf3]">
                <div className="text-[#58a6ff]">Control-Plane Node</div>
                <div>192.168.10.100</div>
              </div>
              <div className="p-2.5 rounded bg-[#1c2333] border border-[#30363d] text-[#e6edf3]">
                <div className="text-[#7ee787]">Worker-1 Node</div>
                <div>192.168.10.101</div>
              </div>
              <div className="p-2.5 rounded bg-[#1c2333] border border-[#30363d] text-[#e6edf3]">
                <div className="text-[#ffa657]">Worker-2 Node</div>
                <div>192.168.10.102</div>
              </div>
            </div>
          </div>
        )}

        {/* CNI Plugin Selector */}
        <div className="mt-8">
          <h4 className="text-base font-bold text-[#e6edf3] mb-3 flex items-center gap-2">
            <span>🔌 CNI (Container Network Interface) Plugins Comparison</span>
          </h4>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
            {(["flannel", "calico", "cilium"] as const).map((cni) => (
              <button
                key={cni}
                onClick={() => setSelectedCni(cni)}
                className={`py-3 px-3 rounded-xl border text-center transition-all ${
                  selectedCni === cni
                    ? "bg-[#58a6ff]/15 border-[#58a6ff] text-[#e6edf3] shadow-md font-bold"
                    : "bg-[#161b22] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/40"
                }`}
              >
                <div className="capitalize text-sm sm:text-base font-bold">{cni}</div>
                <div className="text-[11px] font-mono text-[#8b949e] hidden sm:block mt-0.5">
                  {cni === "flannel" ? "VXLAN Overlay" : cni === "calico" ? "BGP + Policy" : "eBPF Next-Gen"}
                </div>
              </button>
            ))}
          </div>

          {/* Active CNI Box */}
          <div className="rounded-xl bg-[#161b22] border border-[#30363d] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-[#30363d] pb-3">
              <div>
                <h4 className="text-lg font-bold text-[#58a6ff]">{cniDetails[selectedCni].name}</h4>
                <span className="text-xs text-[#8b949e]">Project Maintainer: {cniDetails[selectedCni].creator}</span>
              </div>
              <div className="flex gap-2">
                <span className="px-2.5 py-1 rounded text-xs font-mono bg-[#7ee787]/10 text-[#7ee787] border border-[#7ee787]/20">
                  {cniDetails[selectedCni].dataplane}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-xs">
              <div className="p-3 rounded-lg bg-[#1c2333] border border-[#30363d]">
                <span className="text-[#ffa657] font-semibold block mb-1">NetworkPolicy Enforcement:</span>
                <span className="text-[#e6edf3]">{cniDetails[selectedCni].policySupport}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#1c2333] border border-[#30363d]">
                <span className="text-[#58a6ff] font-semibold block mb-1">Performance Profile:</span>
                <span className="text-[#e6edf3]">{cniDetails[selectedCni].performance}</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#8b949e] mb-4 leading-relaxed">
              {cniDetails[selectedCni].architecture}
            </p>

            {/* YAML Code Snippet */}
            <div className="relative rounded-lg bg-[#0d1117] border border-[#30363d] p-4 font-mono text-xs overflow-x-auto text-[#7ee787]">
              <pre>{cniDetails[selectedCni].yamlSnippet}</pre>
            </div>
          </div>
        </div>
      </div>

      {/* SUBSECTION 2: Docker Networking Modes */}
      <div className="mb-12 rounded-xl bg-[#1c2333] border border-[#30363d] p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-[#7ee787]"></span>
          <h3 className="text-xl font-bold text-[#e6edf3]">
            2. Docker Networking Drivers & Modes
          </h3>
        </div>

        <p className="text-[#8b949e] text-sm mb-6 leading-relaxed">
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
                  ? "bg-[#7ee787]/15 border-[#7ee787] text-[#e6edf3] shadow-md font-bold"
                  : "bg-[#161b22] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/40"
              }`}
            >
              <div className="capitalize text-sm font-bold">{mode}</div>
              <div className="text-[11px] font-mono text-[#8b949e] truncate mt-1">
                {mode === "bridge" ? "docker0 Virtual Bridge" : mode === "host" ? "Shares Host eth0" : mode === "overlay" ? "VXLAN Multi-Host" : "Direct Physical MAC"}
              </div>
            </button>
          ))}
        </div>

        {/* Selected Docker Mode Card */}
        <div className="rounded-xl bg-[#161b22] border border-[#30363d] p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-[#30363d] pb-3">
            <div>
              <h4 className="text-lg font-bold text-[#7ee787]">{dockerDetails[dockerMode].name}</h4>
              <span className="text-xs font-mono text-[#58a6ff]">{dockerDetails[dockerMode].flag}</span>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono bg-[#ffa657]/10 text-[#ffa657] border border-[#ffa657]/20">
              Subnet Scope: {dockerDetails[dockerMode].subnet}
            </span>
          </div>

          <p className="text-sm text-[#8b949e] mb-6 leading-relaxed">
            {dockerDetails[dockerMode].description}
          </p>

          {/* Pros and Cons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-[#1c2333] border border-[#7ee787]/30">
              <h5 className="text-xs font-bold text-[#7ee787] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>✓ Architectural Advantages</span>
              </h5>
              <ul className="space-y-1.5 text-xs text-[#e6edf3]">
                {dockerDetails[dockerMode].pros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#7ee787] font-bold">•</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-[#1c2333] border border-[#ff7b72]/30">
              <h5 className="text-xs font-bold text-[#ff7b72] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>⚠ Technical Limitations</span>
              </h5>
              <ul className="space-y-1.5 text-xs text-[#e6edf3]">
                {dockerDetails[dockerMode].cons.map((con, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#ff7b72] font-bold">•</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Docker CLI Command */}
          <div>
            <div className="text-xs font-mono text-[#8b949e] mb-1.5">Docker CLI Execution Example:</div>
            <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] font-mono text-xs text-[#58a6ff] overflow-x-auto">
              {dockerDetails[dockerMode].command}
            </div>
          </div>
        </div>
      </div>

      {/* SUBSECTION 3: L4 vs L7 Load Balancing & Ingress Architecture */}
      <div className="mb-12 rounded-xl bg-[#1c2333] border border-[#30363d] p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffa657]"></span>
          <h3 className="text-xl font-bold text-[#e6edf3]">
            3. Layer 4 (L4) vs Layer 7 (L7) Load Balancing & Ingress
          </h3>
        </div>

        <p className="text-[#8b949e] text-sm mb-6 leading-relaxed">
          Load balancers operate at different OSI layers to distribute traffic across container replicas. Compare transport-level packet routing (L4) with application-level HTTP routing (L7).
        </p>

        {/* L4 / L7 Toggle Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setLbLayer("l4")}
            className={`flex-1 p-4 rounded-xl border transition-all text-left ${
              lbLayer === "l4"
                ? "bg-[#ffa657]/15 border-[#ffa657] text-[#e6edf3] shadow-md"
                : "bg-[#161b22] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/40"
            }`}
          >
            <div className="text-base font-bold text-[#ffa657] mb-1">Layer 4 (L4) Transport Load Balancer</div>
            <div className="text-xs text-[#8b949e]">TCP/UDP Stream Switching (AWS NLB, IPVS, K8s Service)</div>
          </button>

          <button
            onClick={() => setLbLayer("l7")}
            className={`flex-1 p-4 rounded-xl border transition-all text-left ${
              lbLayer === "l7"
                ? "bg-[#bc8cff]/15 border-[#bc8cff] text-[#e6edf3] shadow-md"
                : "bg-[#161b22] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/40"
            }`}
          >
            <div className="text-base font-bold text-[#bc8cff] mb-1">Layer 7 (L7) Application Ingress</div>
            <div className="text-xs text-[#8b949e]">HTTP/HTTPS Path & Header Routing (NGINX, Envoy, Traefik)</div>
          </button>
        </div>

        {/* Layer Comparison Details */}
        {lbLayer === "l4" ? (
          <div className="rounded-xl bg-[#161b22] border border-[#ffa657]/30 p-5 mb-6">
            <h4 className="text-base font-bold text-[#ffa657] mb-3">⚡ L4 Load Balancing Mechanics</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-[#8b949e] mb-4">
              <li className="flex items-start gap-2">
                <span className="text-[#ffa657] font-bold">✓</span>
                <span><strong className="text-[#e6edf3]">Inspection Depth:</strong> Reads IP addresses and TCP/UDP port headers only. Does <strong className="text-[#ff7b72]">not</strong> decrypt TLS or inspect HTTP payload content.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#ffa657] font-bold">✓</span>
                <span><strong className="text-[#e6edf3]">Performance:</strong> Extremely high packet throughput (millions QPS) with ultra-low latency sub-millisecond overhead.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#ffa657] font-bold">✓</span>
                <span><strong className="text-[#e6edf3]">Use Cases:</strong> Database connection pools (PostgreSQL/MySQL), gRPC persistent streams, DNS resolvers, and non-HTTP protocols.</span>
              </li>
            </ul>
          </div>
        ) : (
          <div className="rounded-xl bg-[#161b22] border border-[#bc8cff]/30 p-5 mb-6">
            <h4 className="text-base font-bold text-[#bc8cff] mb-3">🌐 L7 Ingress Controller Mechanics</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-[#8b949e] mb-4">
              <li className="flex items-start gap-2">
                <span className="text-[#bc8cff] font-bold">✓</span>
                <span><strong className="text-[#e6edf3]">Inspection Depth:</strong> Decrypts TLS certificates (HTTPS Termination), parses HTTP methods, URI paths (<code className="text-[#7ee787] font-mono">/v1/users</code>), Host headers (<code className="text-[#7ee787] font-mono">api.domain.com</code>), and cookies.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#bc8cff] font-bold">✓</span>
                <span><strong className="text-[#e6edf3]">Advanced Traffic Controls:</strong> Supports Canary deployment traffic splits (90/10 weighted routing), rate-limiting, CORS injection, and Web Application Firewall (WAF) rule sets.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#bc8cff] font-bold">✓</span>
                <span><strong className="text-[#e6edf3]">Direct Pod Bypass:</strong> Modern K8s Ingress Controllers (NGINX/Envoy) watch K8s Endpoints API directly and forward packets straight to target Pod IPs without ClusterIP NAT overhead.</span>
              </li>
            </ul>
          </div>
        )}

        {/* Kubernetes Ingress Manifest Example */}
        <div className="rounded-xl bg-[#161b22] border border-[#30363d] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-semibold text-[#bc8cff]">Kubernetes Ingress Manifest (networking.k8s.io/v1)</span>
            <button
              onClick={() => handleCopy(ingressYaml)}
              className="px-3 py-1 rounded bg-[#30363d] hover:bg-[#30363d]/80 text-[#e6edf3] text-xs font-mono transition-all"
            >
              {copiedCode ? "Copied!" : "Copy YAML"}
            </button>
          </div>
          <div className="rounded-lg bg-[#0d1117] border border-[#30363d] p-4 font-mono text-xs overflow-x-auto text-[#7ee787]">
            <pre>{ingressYaml}</pre>
          </div>
        </div>
      </div>

      {/* SUBSECTION 4: Interactive K8s Service IP Routing Simulator */}
      <div className="rounded-xl bg-[#1c2333] border border-[#58a6ff]/40 p-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#58a6ff] animate-pulse"></span>
            <h3 className="text-xl font-bold text-[#e6edf3]">
              4. Interactive K8s Service IP Routing Simulator
            </h3>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/30">
            Live Kernel Packet Processing
          </span>
        </div>

        <p className="text-[#8b949e] text-sm mb-6 leading-relaxed">
          Test how incoming client packets travel through Kubernetes abstractions (<code className="text-[#7ee787] font-mono">ClusterIP</code>, <code className="text-[#7ee787] font-mono">NodePort</code>, <code className="text-[#7ee787] font-mono">LoadBalancer</code>, <code className="text-[#7ee787] font-mono">Headless</code>, and <code className="text-[#7ee787] font-mono">Ingress</code>) using either legacy <strong className="text-[#ffa657]">iptables</strong> or high-performance <strong className="text-[#7ee787]">eBPF</strong> data paths!
        </p>

        {/* Controls Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Controls: Service Type */}
          <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d]">
            <label className="block text-xs font-mono font-bold text-[#58a6ff] uppercase tracking-wider mb-2">
              Select K8s Service Type:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(["clusterip", "nodeport", "loadbalancer", "headless", "ingress"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSimServiceType(type)}
                  className={`p-2 rounded-lg text-xs font-mono font-bold capitalize transition-all border ${
                    simServiceType === type
                      ? "bg-[#58a6ff]/20 text-[#58a6ff] border-[#58a6ff]"
                      : "bg-[#1c2333] text-[#8b949e] border-[#30363d] hover:text-[#e6edf3]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Controls: Engine Mode */}
          <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d]">
            <label className="block text-xs font-mono font-bold text-[#7ee787] uppercase tracking-wider mb-2">
              Select Data Path Engine:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSimEngine("iptables")}
                className={`p-3 rounded-lg text-xs font-mono font-bold transition-all border ${
                  simEngine === "iptables"
                    ? "bg-[#ffa657]/20 text-[#ffa657] border-[#ffa657]"
                    : "bg-[#1c2333] text-[#8b949e] border-[#30363d] hover:text-[#e6edf3]"
                }`}
              >
                <div>kube-proxy (iptables)</div>
                <div className="text-[10px] font-normal text-[#8b949e] mt-1">$O(N)$ Sequential Rule Check</div>
              </button>
              <button
                onClick={() => setSimEngine("ebpf")}
                className={`p-3 rounded-lg text-xs font-mono font-bold transition-all border ${
                  simEngine === "ebpf"
                    ? "bg-[#7ee787]/20 text-[#7ee787] border-[#7ee787]"
                    : "bg-[#1c2333] text-[#8b949e] border-[#30363d] hover:text-[#e6edf3]"
                }`}
              >
                <div>Cilium eBPF (Fast Path)</div>
                <div className="text-[10px] font-normal text-[#8b949e] mt-1">$O(1)$ Direct Socket Map Bypass</div>
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={handleSendPacket}
            className="flex-1 py-3 px-6 rounded-xl bg-[#58a6ff] hover:bg-[#58a6ff]/90 text-[#0d1117] font-bold text-sm transition-all shadow-lg hover:shadow-[#58a6ff]/20 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <span>🚀 Send Packet / Trigger Request</span>
          </button>
          <button
            onClick={handleResetSim}
            className="py-3 px-4 rounded-xl bg-[#30363d] hover:bg-[#30363d]/80 text-[#e6edf3] font-bold text-xs transition-all"
          >
            Reset Stats
          </button>
        </div>

        {/* Backend Pod Distribution Grid */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-bold text-[#e6edf3] uppercase tracking-wider">
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
                      ? "bg-[#58a6ff]/15 border-[#58a6ff] scale-[1.02] shadow-md"
                      : "bg-[#161b22] border-[#30363d]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold font-mono text-[#e6edf3] uppercase">{pod.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                        isSelected ? "bg-[#58a6ff] text-[#0d1117]" : "bg-[#30363d] text-[#8b949e]"
                      }`}
                    >
                      {count} Hits ({pct}%)
                    </span>
                  </div>
                  <div className="text-xs font-mono text-[#7ee787] mb-1">Pod IP: {pod.ip}</div>
                  <div className="text-[11px] font-mono text-[#8b949e] mb-3">{pod.node}</div>

                  {/* Meter Bar */}
                  <div className="w-full h-2 rounded-full bg-[#0d1117] overflow-hidden border border-[#30363d]">
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
        <div className="rounded-xl bg-[#0d1117] border border-[#30363d] p-5 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[#30363d] pb-2 mb-3">
            <span className="text-[#58a6ff] font-bold flex items-center gap-2">
              <span>📡 Live Packet Translation Trace</span>
            </span>
            <span className="text-[11px] text-[#8b949e]">
              Engine: {simEngine === "iptables" ? "iptables DNAT" : "eBPF bpf_sockmap"}
            </span>
          </div>

          {lastPacketTrace.length === 0 ? (
            <div className="text-[#8b949e] italic text-center py-6">
              Click &quot;Send Packet / Trigger Request&quot; above to trace kernel packet routing...
            </div>
          ) : (
            <div className="space-y-2">
              {lastPacketTrace.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-[#58a6ff] font-bold">{idx + 1}.</span>
                  <span className={idx === lastPacketTrace.length - 1 ? "text-[#7ee787] font-bold" : "text-[#e6edf3]"}>
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
