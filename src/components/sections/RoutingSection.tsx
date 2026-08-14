"use client";

import NetworkingModuleHeader from "@/components/networking/NetworkingModuleHeader";
import NetworkingPanel from "@/components/networking/NetworkingPanel";
import NetworkingExample from "@/components/networking/NetworkingExample";
import NetworkingMetric from "@/components/networking/NetworkingMetric";
import NetworkingTable from "@/components/networking/NetworkingTable";
import React, { useState, useMemo } from "react";

// --- Types & Data Structures ---

interface RouteItem {
  id: string;
  network: string; // CIDR e.g. "10.0.1.48/29"
  nextHop: string;
  interfaceName: string;
  protocol: "Connected" | "Static" | "OSPF" | "BGP" | "EIGRP" | "RIP";
  ad: number;
  metric: number;
  description?: string;
}

interface ProtocolInfo {
  id: string;
  name: string;
  type: string;
  algorithm: string;
  ad: number;
  metric: string;
  convergence: string;
  scope: string;
  multicastIp: string;
  ciscoCode: string;
  bestFor: string;
  keyFeatures: string[];
}

const PROTOCOLS: Record<string, ProtocolInfo> = {
  ospf: {
    id: "ospf",
    name: "OSPF (Open Shortest Path First)",
    type: "Link-State IGP",
    algorithm: "Dijkstra's Shortest Path First (SPF)",
    ad: 110,
    metric: "Cost = 100,000,000 / Bandwidth (bps)",
    convergence: "Can be fast; BFD is optional and timer-dependent",
    scope: "Interior Gateway Protocol (IGP) / Enterprise LAN/WAN",
    multicastIp: "224.0.0.5 (All OSPF) / 224.0.0.6 (DR/BDR)",
    ciscoCode: "O",
    bestFor: "Medium to large enterprise networks requiring fast convergence and hierarchical area design (Backbone Area 0).",
    keyFeatures: [
      "Hierarchical structuring via Area 0 (Backbone) and stub areas.",
      "Floods topology changes and periodically refreshes link-state information.",
      "Open IETF standard protocol (RFC 2328).",
    ],
  },
  bgp: {
    id: "bgp",
    name: "BGP (Border Gateway Protocol)",
    type: "Path Vector EGP",
    algorithm: "Best Path Selection Algorithm (Attributes)",
    ad: 20, // eBGP is 20, iBGP is 200
    metric: "Path Attributes (Weight, Local Pref, AS-Path, MED)",
    convergence: "Slow (Prioritizes stability over speed)",
    scope: "Exterior Gateway Protocol (EGP) / Global Internet & ISP Peering",
    multicastIp: "N/A (TCP unicast port 179)",
    ciscoCode: "B",
    bestFor: "Connecting Autonomous Systems (AS), multi-homing to ISPs, and enterprise Internet edge routing.",
    keyFeatures: [
      "Carries Internet-scale reachability information between autonomous systems.",
      "Uses TCP port 179 for reliable peer session establishment.",
      "Path-Vector mechanism prevents loops via AS-Path inspection.",
      "Extensive policy control using BGP route maps and communities.",
    ],
  },
  eigrp: {
    id: "eigrp",
    name: "EIGRP (Enhanced Interior Gateway Routing Protocol)",
    type: "Advanced Distance Vector / Hybrid IGP",
    algorithm: "DUAL (Diffusing Update Algorithm)",
    ad: 90, // Internal
    metric: "Composite: K-values based on Bandwidth & Delay",
    convergence: "Can fail over quickly when a feasible successor exists; timers and topology matter",
    scope: "Interior Gateway Protocol (IGP) / Cisco Enterprise Networks",
    multicastIp: "224.0.0.10",
    ciscoCode: "D",
    bestFor: "Cisco-centric networks that want integrated IGP features and unequal-cost load balancing.",
    keyFeatures: [
      "Can maintain feasible successors for rapid failover when the topology meets the conditions.",
      "Supports unequal-cost load balancing via the 'variance' command.",
      "Partial bounded updates sent only to affected routers when topology shifts.",
      "Originally Cisco proprietary, published as informational RFC 7868.",
    ],
  },
  rip: {
    id: "rip",
    name: "RIPv2 (Routing Information Protocol v2)",
    type: "Distance Vector IGP",
    algorithm: "Bellman-Ford Algorithm",
    ad: 120,
    metric: "Hop Count (Max 15 hops; 16 = Unreachable)",
    convergence: "Slow (Periodic 30-second full table updates)",
    scope: "Interior Gateway Protocol (IGP) / Small legacy networks",
    multicastIp: "224.0.0.9",
    ciscoCode: "R",
    bestFor: "Small simple topologies or legacy environments with minimal routing complexity.",
    keyFeatures: [
      "Uses simple Hop Count metric; ignores link speeds and bandwidth.",
      "Prevents routing loops using Split Horizon, Poison Reverse, and Holddown Timers.",
      "Classless routing support (RIPv2 includes subnet mask in updates).",
      "Limited scalability due to 15-hop maximum diameter limit.",
    ],
  },
  static: {
    id: "static",
    name: "Static & Default Routing",
    type: "Manual Configuration",
    algorithm: "N/A (Administrator Defined)",
    ad: 1,
    metric: "0 (Direct) or specified static cost",
    convergence: "Manual / Dependent on SLA Object Tracking",
    scope: "Stub networks, default Internet gateways, management routes",
    multicastIp: "N/A",
    ciscoCode: "S",
    bestFor: "Small networks, connecting stub sites, or pointing default route (0.0.0.0/0) to an ISP upstream.",
    keyFeatures: [
      "No dynamic routing-protocol traffic is exchanged by the route itself.",
      "A static route is predictable but not inherently more secure.",
      "Does not automatically adapt to link outages without IP SLA tracking.",
      "Cisco IOS default administrative distance is 1; floating static routes use a higher configured distance.",
    ],
  },
};

const DEFAULT_ROUTES: RouteItem[] = [
  {
    id: "r1",
    network: "10.0.1.48/29",
    nextHop: "10.0.1.49",
    interfaceName: "Eth1.20",
    protocol: "EIGRP",
    ad: 90,
    metric: 15,
    description: "App Servers Subnet (Hosts: 10.0.1.49 - 10.0.1.54)",
  },
  {
    id: "r2",
    network: "10.0.1.32/27",
    nextHop: "10.0.1.1",
    interfaceName: "Eth1.10",
    protocol: "Static",
    ad: 1,
    metric: 1,
    description: "DMZ Services Branch (Hosts: 10.0.1.33 - 10.0.1.62)",
  },
  {
    id: "r3",
    network: "10.0.1.0/24",
    nextHop: "10.0.1.1",
    interfaceName: "Eth1",
    protocol: "Connected",
    ad: 0,
    metric: 0,
    description: "Internal Office LAN (Hosts: 10.0.1.1 - 10.0.1.254)",
  },
  {
    id: "r4",
    network: "10.0.0.0/16",
    nextHop: "10.255.1.1",
    interfaceName: "Eth0",
    protocol: "OSPF",
    ad: 110,
    metric: 10,
    description: "Campus Summary Network Block",
  },
  {
    id: "r5",
    network: "10.0.0.0/8",
    nextHop: "10.255.0.1",
    interfaceName: "Eth0",
    protocol: "OSPF",
    ad: 110,
    metric: 20,
    description: "Corporate Supernet Backbone",
  },
  {
    id: "r6",
    network: "192.168.1.0/24",
    nextHop: "192.168.1.1",
    interfaceName: "Eth2",
    protocol: "Connected",
    ad: 0,
    metric: 0,
    description: "Management Subnet",
  },
  {
    id: "r7",
    network: "172.16.0.0/12",
    nextHop: "172.16.0.1",
    interfaceName: "Eth3",
    protocol: "BGP",
    ad: 20,
    metric: 100,
    description: "Partner Autonomous System (AS 64512)",
  },
  {
    id: "r8",
    network: "0.0.0.0/0",
    nextHop: "203.0.113.1",
    interfaceName: "WAN0",
    protocol: "Static",
    ad: 1,
    metric: 1,
    description: "Default Gateway to Public Internet",
  },
];

// --- IP Helper Functions ---

function ipToLong(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;
  let num = 0;
  for (let i = 0; i < 4; i++) {
    const n = parseInt(parts[i], 10);
    if (isNaN(n) || n < 0 || n > 255 || (parts[i].length > 1 && parts[i].startsWith("0"))) {
      return null;
    }
    num = (num * 256) + n;
  }
  return num >>> 0;
}

function longToIp(long: number): string {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255,
  ].join(".");
}

function parseCidr(cidr: string): { netLong: number; prefixLen: number; maskLong: number; broadcastLong: number } | null {
  const parts = cidr.trim().split("/");
  if (parts.length !== 2) return null;
  const ipLong = ipToLong(parts[0]);
  const prefixLen = parseInt(parts[1], 10);
  if (ipLong === null || isNaN(prefixLen) || prefixLen < 0 || prefixLen > 32) return null;

  const maskLong = prefixLen === 0 ? 0 : ((~0 << (32 - prefixLen)) >>> 0);
  const netLong = (ipLong & maskLong) >>> 0;
  const broadcastLong = (netLong | ((~maskLong) >>> 0)) >>> 0;
  return { netLong, prefixLen, maskLong, broadcastLong };
}

function ipToBinary(ip: string): string {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return "00000000.00000000.00000000.00000000";
  return parts
    .map((p) => {
      const num = parseInt(p, 10) || 0;
      return num.toString(2).padStart(8, "0");
    })
    .join(".");
}

// --- Main Component ---

export default function RoutingSection() {
  // --- State 1: Static vs Dynamic Routing ---
  const [selectedProto, setSelectedProto] = useState<string>("ospf");
  const currentProto = PROTOCOLS[selectedProto] || PROTOCOLS.ospf;

  // --- State 2: FHRP Redundancy Simulator ---
  const [fhrpProtocol, setFhrpProtocol] = useState<"hsrp" | "vrrp">("hsrp");
  const [r1Active, setR1Active] = useState<boolean>(true);
  const [preemptEnabled, setPreemptEnabled] = useState<boolean>(true);
  const [failoverHistory, setFailoverHistory] = useState<string[]>([
    "12:00:00 - Initial state: Router A is ACTIVE (Priority 110). Router B is STANDBY (Priority 100).",
    "12:00:00 - Virtual IP 192.168.1.1 is served by the selected FHRP group. Serving LAN Host 192.168.1.50.",
  ]);

  const toggleR1Status = () => {
    if (r1Active) {
      setR1Active(false);
      const time = new Date().toLocaleTimeString();
      setFailoverHistory((prev) => [
        `${time} - Router A (192.168.1.2) physical interface failure simulated.`,
        `${time} - Router B detection timer (${fhrpProtocol === "hsrp" ? "10s" : "about 3.6s"}) expired.`,
        `${time} - ${fhrpProtocol.toUpperCase()} failover: Router B takes over the virtual gateway.`,
        `${time} - Router B issued a gratuitous ARP for Virtual IP 192.168.1.1.`,
        ...prev,
      ]);
    } else {
      setR1Active(true);
      const time = new Date().toLocaleTimeString();
      if (preemptEnabled) {
        setFailoverHistory((prev) => [
          `${time} - Router A (192.168.1.2) restored. Priority (110) > Router B (100).`,
          `${time} - Preemption active: Router A reclaims the virtual gateway role.`,
          `${time} - Router A issued a gratuitous ARP for Virtual IP 192.168.1.1.`,
          ...prev,
        ]);
      } else {
        setFailoverHistory((prev) => [
          `${time} - Router A (192.168.1.2) restored.`,
          `${time} - Preemption disabled: Router B keeps the virtual gateway role until protocol state changes.`,
          ...prev,
        ]);
      }
    }
  };

  // --- State 3: BGP Summarization ---
  const [bgpPreset, setBgpPreset] = useState<number>(0);
  const [summaryOnly, setSummaryOnly] = useState<boolean>(true);
  const [asSet, setAsSet] = useState<boolean>(true);

  const bgpPresets = [
    {
      label: "4x /24 Subnets into /22",
      subnets: ["198.51.100.0/24", "198.51.101.0/24", "198.51.102.0/24", "198.51.103.0/24"],
      aggregate: "198.51.100.0/22",
      commonBits: 22,
      asPathOriginal: "AS 65001 AS 64512",
    },
    {
      label: "8x /24 Subnets into /21",
      subnets: [
        "172.16.0.0/24",
        "172.16.1.0/24",
        "172.16.2.0/24",
        "172.16.3.0/24",
        "172.16.4.0/24",
        "172.16.5.0/24",
        "172.16.6.0/24",
        "172.16.7.0/24",
      ],
      aggregate: "172.16.0.0/21",
      commonBits: 21,
      asPathOriginal: "AS 65100 AS 65200",
    },
    {
      label: "2x /24 Subnets into /23",
      subnets: ["192.168.10.0/24", "192.168.11.0/24"],
      aggregate: "192.168.10.0/23",
      commonBits: 23,
      asPathOriginal: "AS 65005",
    },
  ];

  const currentBgp = bgpPresets[bgpPreset];
  const aggregatePrefix = Number(currentBgp.aggregate.split("/")[1]);
  const aggregateMask =
    aggregatePrefix === 0 ? 0 : ((~0 << (32 - aggregatePrefix)) >>> 0);
  const aggregateMaskIp = longToIp(aggregateMask);

  // --- State 4: Routing Table Simulator ---
  const [targetIp, setTargetIp] = useState<string>("10.0.1.50");
  const [routesTable, setRoutesTable] = useState<RouteItem[]>(DEFAULT_ROUTES);

  // Form for adding custom route
  const [newNetwork, setNewNetwork] = useState<string>("");
  const [newNextHop, setNewNextHop] = useState<string>("");
  const [newInterface, setNewInterface] = useState<string>("Eth0");
  const [newProtocol, setNewProtocol] = useState<RouteItem["protocol"]>("Static");
  const [addError, setAddError] = useState<string>("");

  const handleAddRoute = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    if (!newNetwork || !newNextHop) {
      setAddError("Please specify both Network CIDR and Next Hop IP.");
      return;
    }
    const parsedCidr = parseCidr(newNetwork);
    if (!parsedCidr) {
      setAddError("Invalid CIDR network format (e.g. 10.0.2.0/24).");
      return;
    }
    const nextHopLong = ipToLong(newNextHop);
    if (nextHopLong === null) {
      setAddError("Invalid Next Hop IP address.");
      return;
    }

    const defaultADMap: Record<string, number> = {
      Connected: 0,
      Static: 1,
      EIGRP: 90,
      OSPF: 110,
      RIP: 120,
      BGP: 20,
    };

    const newRoute: RouteItem = {
      id: `custom-${Date.now()}`,
      network: newNetwork.trim(),
      nextHop: newNextHop.trim(),
      interfaceName: newInterface.trim() || "Eth0",
      protocol: newProtocol,
      ad: defaultADMap[newProtocol] ?? 1,
      metric: 10,
      description: "User Added Custom Route",
    };

    setRoutesTable((prev) => [newRoute, ...prev]);
    setNewNetwork("");
    setNewNextHop("");
  };

  const handleRemoveRoute = (id: string) => {
    setRoutesTable((prev) => prev.filter((r) => r.id !== id));
  };

  const handleResetRoutes = () => {
    setRoutesTable(DEFAULT_ROUTES);
  };

  // Perform Longest Prefix Matching algorithm
  const lookupResult = useMemo(() => {
    const destLong = ipToLong(targetIp);
    if (destLong === null) {
      return { isValidIp: false, winningRouteId: null, candidates: [] };
    }

    const matchesList: {
      route: RouteItem;
      prefixLen: number;
      netLong: number;
      broadcastLong: number;
    }[] = [];

    for (const r of routesTable) {
      const parsed = parseCidr(r.network);
      if (!parsed) continue;
      const { netLong, prefixLen, maskLong, broadcastLong } = parsed;

      let isMatch = false;
      if (prefixLen === 0) {
        // Default route matches all IPs
        isMatch = true;
      } else {
        isMatch = ((destLong & maskLong) >>> 0) === netLong;
      }

      if (isMatch) {
        matchesList.push({ route: r, prefixLen, netLong, broadcastLong });
      }
    }

    // Sort matching routes by:
    // 1. Prefix length DESCENDING (Longest prefix match rule!)
    // 2. Administrative Distance ASCENDING (Lower AD is preferred)
    // 3. Metric ASCENDING
    matchesList.sort((a, b) => {
      if (b.prefixLen !== a.prefixLen) {
        return b.prefixLen - a.prefixLen;
      }
      if (a.route.ad !== b.route.ad) {
        return a.route.ad - b.route.ad;
      }
      return a.route.metric - b.route.metric;
    });

    const winningRouteId = matchesList.length > 0 ? matchesList[0].route.id : null;

    return {
      isValidIp: true,
      destLong,
      winningRouteId,
      winningMatch: matchesList[0] || null,
      candidates: matchesList,
    };
  }, [targetIp, routesTable]);

  return (
    <section
      id="routing"
      className="networking-module scroll-mt-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Header */}
      <NetworkingModuleHeader
        anchor="#routing"
        icon={<span className="text-indigo-500 dark:text-indigo-400" aria-hidden="true">⑂</span>}
        title={<>15. Routing & Gateway Protocols</>}
        description={<>Routers build forwarding decisions by evaluating destination addresses against local <strong className="text-indigo-600 dark:text-indigo-400">routing tables</strong>. Explore dynamic <strong className="text-emerald-600 dark:text-emerald-400">IGP & EGP protocols</strong>, configured first-hop redundancy with <strong className="text-amber-600 dark:text-amber-400">HSRP/VRRP</strong>, policy-controlled <strong className="text-violet-600 dark:text-violet-400">BGP aggregation</strong>, and <strong className="text-rose-600 dark:text-rose-400">longest-prefix matching</strong>.</>}
      />
        <NetworkingPanel className="space-y-6">
      <div className="module-content networking-module-content">
      {/* ITEM 1: Static vs Dynamic Routing Comparison */}
      <div className="mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Part 1
            </span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              Static vs. Dynamic Routing Protocols
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(PROTOCOLS).map((pKey) => {
              const p = PROTOCOLS[pKey];
              const isSelected = selectedProto === pKey;
              return (
                <button
                  key={pKey}
                  onClick={() => setSelectedProto(pKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    isSelected
                      ? "bg-indigo-600 text-slate-900 dark:text-slate-100 shadow-lg shadow-[#58a6ff]/20"
                      : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:text-slate-100 hover:border-indigo-300"
                  }`}
                >
                  {p.ciscoCode ? `[${p.ciscoCode}] ` : ""}
                  {pKey.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Protocol Deep Dive Card */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200/60 dark:border-slate-700/60">
            <div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-bold">
                  Code: {currentProto.ciscoCode || "N/A"}
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{currentProto.type}</span>
              </div>
              <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{currentProto.name}</h4>
            </div>

            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="text-right">
                <span className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                  Admin Distance (AD)
                </span>
                <span className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {currentProto.ad}
                </span>
              </div>
              <div className="h-8 w-px bg-[#30363d]" />
              <div>
                <span className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                  Multicast IP / Transport
                </span>
                <span className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">
                  {currentProto.multicastIp}
                </span>
              </div>
            </div>
          <NetworkingMetric label="Administrative Distance" value={currentProto.ad} detail={`${currentProto.name} trust value; lower values win`} tone="cyan" />
          </div>

          <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed mb-6 bg-white/60 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-200/40">
            {currentProto.bestFor}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm">
            <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block mb-1">Algorithm</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">{currentProto.algorithm}</span>
            </div>
            <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block mb-1">Metric Calculation</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">{currentProto.metric}</span>
            </div>
            <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block mb-1">Convergence Speed</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{currentProto.convergence}</span>
            </div>
            <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block mb-1">Deployment Scope</span>
              <span className="font-semibold text-violet-600 dark:text-violet-400">{currentProto.scope}</span>
            </div>
          </div>

          <div>
            <h5 className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase mb-3">Key Technical Highlights</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentProto.keyFeatures.map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200/60"
                >
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Administrative Distance Hierarchy Reference Bar */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow p-5">
          <h4 className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase mb-3 flex items-center justify-between">
            <span>Administrative Distance (AD) Trust Hierarchy (Lower = Better)</span>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400">Believability Score (0 - 255)</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-xs font-mono">
            <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 p-2.5 rounded-lg text-emerald-600 dark:text-emerald-400">
              <div className="font-bold text-sm">0</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Connected</div>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 p-2.5 rounded-lg text-indigo-600 dark:text-indigo-400">
              <div className="font-bold text-sm">1</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Static</div>
            </div>
            <div className="bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 p-2.5 rounded-lg text-violet-600 dark:text-violet-400">
              <div className="font-bold text-sm">20</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">eBGP</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 p-2.5 rounded-lg text-amber-600 dark:text-amber-400">
              <div className="font-bold text-sm">90</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">EIGRP</div>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 p-2.5 rounded-lg text-indigo-600 dark:text-indigo-400">
              <div className="font-bold text-sm">110</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">OSPF</div>
            </div>
            <div className="bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700 p-2.5 rounded-lg text-rose-600 dark:text-rose-400">
              <div className="font-bold text-sm">120</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">RIP</div>
            </div>
            <div className="bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 p-2.5 rounded-lg text-violet-600 dark:text-violet-400">
              <div className="font-bold text-sm">200</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">iBGP</div>
            </div>
          </div>
        </div>
      </div>

      {/* ITEM 2: Gateway Redundancy (HSRP & VRRP Failover Diagram) */}
      <div className="mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Part 2
            </span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              Gateway Redundancy (HSRP & VRRP Virtual IP Failover)
            </h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFhrpProtocol("hsrp")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                fhrpProtocol === "hsrp"
                  ? "bg-emerald-500 text-slate-900 dark:text-slate-100"
                  : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              }`}
            >
              HSRP (Cisco)
            </button>
            <button
              onClick={() => setFhrpProtocol("vrrp")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                fhrpProtocol === "vrrp"
                  ? "bg-emerald-500 text-slate-900 dark:text-slate-100"
                  : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              }`}
            >
              VRRP (Open IETF)
            </button>
          </div>
        </div>
        <NetworkingPanel className="space-y-6">

        {/* FHRP Interactive Topology & Failover Visualizer */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow mb-6">
          <div className="flex flex-col lg:flex-row gap-6 items-stretch">
            {/* Left Diagram Box */}
            <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex flex-col justify-between">
              {/* Virtual Gateway Header */}
              <div className="bg-slate-50 dark:bg-slate-700 border border-indigo-300 rounded-lg p-3 text-center mb-6">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase block">
                  Shared First-Hop Gateway ({fhrpProtocol.toUpperCase()})
                </span>
                <div className="text-lg font-mono font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-2">
                  <span>VIP: 192.168.1.1</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                    (VMAC: {fhrpProtocol === "hsrp" ? "0000.0C07.AC01" : "0000.5E00.0101"})
                  </span>
                </div>
              </div>

              {/* Topology Routers */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Router A */}
                <div
                  className={`rounded-lg border p-4 transition-all relative ${
                    r1Active
                      ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30"
                      : "border-rose-400 bg-rose-50 dark:bg-rose-900/30 opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                      Router A (R1)
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        r1Active
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : "bg-[#ff7b72]/20 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {r1Active ? "ACTIVE" : "FAILED"}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400 space-y-1">
                    <div>Phys IP: <span className="text-slate-900 dark:text-slate-100">192.168.1.2</span></div>
                    <div>Priority: <span className="text-indigo-600 dark:text-indigo-400 font-bold">110</span></div>
                    <div>{fhrpProtocol === "hsrp" ? "Hello: " : "Advertisement: "}<span className="text-emerald-600 dark:text-emerald-400">{fhrpProtocol === "hsrp" ? "Every 3s" : "Every 1s"}</span></div>
                  </div>
                  {r1Active && (
                    <div className="mt-3 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Forwarding LAN Traffic
                    </div>
                  )}
                </div>

                {/* Router B */}
                <div
                  className={`rounded-lg border p-4 transition-all ${
                    !r1Active
                      ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                      Router B (R2)
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        !r1Active
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : "bg-[#ffa657]/20 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {!r1Active
                        ? "ACTIVE (Promoted)"
                        : fhrpProtocol === "hsrp"
                        ? "STANDBY"
                        : "BACKUP"}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400 space-y-1">
                    <div>Phys IP: <span className="text-slate-900 dark:text-slate-100">192.168.1.3</span></div>
                    <div>Priority: <span className="text-amber-600 dark:text-amber-400">100</span></div>
                    <div>{fhrpProtocol === "hsrp" ? "Hold Timer: " : "Active Down Interval: "}<span className="text-amber-600 dark:text-amber-400">{fhrpProtocol === "hsrp" ? "10s" : "about 3.6s"}</span></div>
                  </div>
                  {!r1Active && (
                    <div className="mt-3 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Serving Virtual IP 192.168.1.1
                    </div>
                  )}
                  {r1Active && (
                    <div className="mt-3 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      Listening for R1 Heartbeats
                    </div>
                  )}
                </div>
              </div>

              {/* Host Client Box */}
              <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-3 text-center">
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="text-slate-500 dark:text-slate-400">LAN Client Host</span>
                  <span className="text-indigo-600 dark:text-indigo-400">IP: 192.168.1.50</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Configured Default Gateway:{" "}
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">192.168.1.1</span> (Unaware of physical router swap!)
                </div>
              </div>
            </div>

            {/* Right Controls & Event Console */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
                  Interactive Failover Controls
                </h4>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 block">
                        Primary Router A Status
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {r1Active ? "Link UP & Healthy" : "Physical Interface Failure"}
                      </span>
                    </div>
                    <button
                      onClick={toggleR1Status}
                      className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                        r1Active
                          ? "bg-[#ff7b72] hover:bg-[#ff7b72]/80 text-white shadow-lg shadow-[#ff7b72]/20"
                          : "bg-emerald-500 hover:bg-emerald-500/80 text-slate-900 dark:text-slate-100 shadow-lg shadow-[#7ee787]/20"
                      }`}
                    >
                      {r1Active ? "💥 Simulate R1 Link Failure" : "🔄 Restore R1 Physical Link"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60 pt-3">
                    <div>
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                        Preemption Mode
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Forces highest priority router back to Active upon recovery
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        aria-label="Enable FHRP preemption"
                        checked={preemptEnabled}
                        onChange={(e) => setPreemptEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#30363d] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>

                <h5 className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase mb-2">
                  Protocol Event Console Log
                </h5>
                <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-3 font-mono text-xs text-emerald-600 dark:text-emerald-400 h-40 overflow-y-auto space-y-1.5">
                  {failoverHistory.map((log, i) => (
                    <div key={i} className="leading-relaxed border-b border-slate-200/30 dark:border-slate-700/30 pb-1">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        </NetworkingPanel>
      </div>
        <NetworkingExample title="BGP Route Aggregation Example" description="Interactive route summarization shows how contiguous prefixes share a common network bit prefix before advertisement." tone="violet">

      {/* ITEM 3: BGP Summarization / Aggregation Overview */}
      <div className="mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <span className="text-xs font-mono font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
              Part 3
            </span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              BGP Route Summarization & Aggregation
            </h3>
          </div>
          <div className="flex gap-2">
            {bgpPresets.map((p, idx) => (
              <button
                key={idx}
                onClick={() => setBgpPreset(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  bgpPreset === idx
                    ? "bg-[#bc8cff] text-slate-900 dark:text-slate-100"
                    : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Aggregation Explanation & Visualizer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left Explanation */}
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-1 rounded bg-[#bc8cff]/20 text-violet-600 dark:text-violet-400 font-mono text-xs font-bold">
                  BGP aggregate-address
                </span>
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                Reducing Global Routing Table Bloat
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                The global routing table is large and changes over time. Autonomous systems can summarize contiguous, aligned prefixes before advertising to peers, reducing routing state when policy allows.
              </p>
            </div>
            <div className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-4 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Original Routes:</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">{currentBgp.subnets.length} prefixes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Aggregated Block:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{currentBgp.aggregate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Table Reduction:</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  -{Math.round((1 - 1 / currentBgp.subnets.length) * 100)}% route entries
                </span>
              </div>
            </div>
          </div>

          {/* Center Binary Bitwise Alignment */}
          <div className="lg:col-span-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow">
            <h4 className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase mb-4 flex items-center justify-between">
              <span>Bitwise Matching Breakdown ({currentBgp.commonBits} Common Bits)</span>
              <span className="text-emerald-600 dark:text-emerald-400">Green = Identical Network Bits</span>
            </h4>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 font-mono text-xs space-y-2 mb-4 overflow-x-auto">
              {currentBgp.subnets.map((sub, i) => {
                const bin = ipToBinary(sub.split("/")[0]);
                const bitsWithoutDots = bin.replace(/\./g, "");
                const commonPart = bitsWithoutDots.slice(0, currentBgp.commonBits);
                const hostPart = bitsWithoutDots.slice(currentBgp.commonBits);

                return (
                  <div key={i} className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/40 dark:border-slate-700/40 pb-1.5">
                    <span className="text-indigo-600 dark:text-indigo-400 w-32 shrink-0">{sub}</span>
                    <div className="min-w-0 max-w-full overflow-x-auto tracking-widest font-mono">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{commonPart}</span>
                      <span className="text-slate-500 dark:text-slate-400">{hostPart}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cisco BGP Command Preview */}
            <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4 font-mono text-xs text-slate-900 dark:text-slate-100">
              <div className="text-slate-500 dark:text-slate-400 text-[11px] mb-2">! Cisco IOS BGP Aggregation Configuration</div>
              <div className="text-indigo-600 dark:text-indigo-400">router bgp 65001</div>
              {currentBgp.subnets.map((s, idx) => (
                <div key={idx} className="pl-4 text-slate-500 dark:text-slate-400">
                  network {s.split("/")[0]} mask 255.255.255.0
                </div>
              ))}
              <div className="pl-4 text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                aggregate-address {currentBgp.aggregate.split("/")[0]} {aggregateMaskIp}
                {summaryOnly ? " summary-only" : ""}
                {asSet ? " as-set" : ""}
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  aria-label="Advertise only the aggregate route"
                  type="checkbox"
                  checked={summaryOnly}
                  onChange={(e) => setSummaryOnly(e.target.checked)}
                  className="rounded border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400"
                />
                <span className="text-slate-900 dark:text-slate-100">
                  <strong className="text-indigo-600 dark:text-indigo-400">summary-only</strong> (Suppress specific routes)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  aria-label="Preserve AS path with as-set"
                  type="checkbox"
                  checked={asSet}
                  onChange={(e) => setAsSet(e.target.checked)}
                  className="rounded border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400"
                />
                <span className="text-slate-900 dark:text-slate-100">
                  <strong className="text-violet-600 dark:text-violet-400">as-set</strong> (Preserve AS-Path to prevent loops)
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
        </NetworkingExample>

      {/* ITEM 4: Interactive Routing Table Lookup Simulator */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <span className="text-xs font-mono font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Part 4
            </span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              Interactive Routing Table Lookup Simulator (Longest Prefix Match)
            </h3>
          </div>
          <button
            onClick={handleResetRoutes}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:border-rose-400/40 transition-all"
          >
            Reset Table to Defaults
          </button>
        </div>
        <NetworkingPanel className="space-y-6">

        {/* Input Controls */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-mono text-slate-500 dark:text-slate-400 uppercase mb-2">
                Destination IP Address Lookup
              </label>
              <div className="relative">
                <input
                  aria-label="Destination IP address for route lookup"
                  type="text"
                  value={targetIp}
                  onChange={(e) => setTargetIp(e.target.value)}
                  placeholder="e.g. 10.0.1.50"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 font-mono text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-400 transition-all"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-mono text-slate-500 dark:text-slate-400 uppercase mb-2">
                Quick Test IPs
              </span>
              <div className="flex flex-wrap gap-2">
                {["10.0.1.50", "10.0.1.35", "10.0.5.12", "192.168.1.100", "8.8.8.8"].map((ip) => (
                  <button
                    aria-label={`Use ${ip} as route lookup destination`}
                    key={ip}
                    onClick={() => setTargetIp(ip)}
                    className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:border-indigo-400/60"
                  >
                    {ip}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Resolution Result Banner */}
          {lookupResult.isValidIp ? (
            <div
              className={`rounded-lg p-4 border transition-all ${
                lookupResult.winningMatch
                  ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400/40 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-50 dark:bg-rose-900/30 border-rose-400/40 text-rose-600 dark:text-rose-400"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  <span className="font-bold text-sm">
                    {lookupResult.winningMatch
                      ? `Selected Route: ${lookupResult.winningMatch.route.network} via ${lookupResult.winningMatch.route.nextHop} (${lookupResult.winningMatch.route.interfaceName})`
                      : "No Route to Host (Packet Dropped)"}
                  </span>
                </div>
                {lookupResult.winningMatch && (
                  <span className="px-3 py-1 rounded bg-emerald-500 text-slate-900 dark:text-slate-100 font-mono text-xs font-bold">
                    Longest Prefix: /{lookupResult.winningMatch.prefixLen}
                  </span>
                )}
              </div>

              {lookupResult.winningMatch && (
                <p className="text-xs text-slate-900 dark:text-slate-100 mt-2 leading-relaxed">
                  Matched <strong>{lookupResult.candidates.length}</strong> route entries. Subnet mask{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400">/{lookupResult.winningMatch.prefixLen}</strong> won because it has the highest number of contiguous matching network bits (Longest Prefix Match Rule).
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg p-4 bg-rose-50 dark:bg-rose-900/30 border border-rose-400/40 text-rose-600 dark:text-rose-400 text-xs font-mono">
              ⚠️ Invalid IPv4 Address format. Please enter a valid address (e.g. 10.0.1.50).
            </div>
          )}
        </div>

        {/* Live Routing Table Grid */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Active Router Forwarding Information Base (FIB)
            </h4>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Total Entries: {routesTable.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <NetworkingTable>
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Protocol</th>
                  <th className="pb-3 px-3">Network CIDR</th>
                  <th className="pb-3 px-3">Next Hop IP</th>
                  <th className="pb-3 px-3">Interface</th>
                  <th className="pb-3 px-3">AD / Metric</th>
                  <th className="pb-3 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]/40">
                {routesTable.map((r) => {
                  const isWinning = lookupResult.winningRouteId === r.id;
                  const candMatch = lookupResult.candidates.find((c) => c.route.id === r.id);

                  let rowStyle = "hover:bg-white/50 dark:hover:bg-slate-800/50";
                  if (isWinning) {
                    rowStyle = "bg-emerald-500/15 border-l-4 border-l-[#7ee787] text-slate-900 dark:text-slate-100";
                  } else if (candMatch) {
                    rowStyle = "bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-l-[#58a6ff]/60 text-slate-900 dark:text-slate-100";
                  } else {
                    rowStyle = "opacity-50 text-slate-500 dark:text-slate-400";
                  }

                  return (
                    <tr key={r.id} className={`transition-all ${rowStyle}`}>
                      <td className="py-3 px-3">
                        {isWinning ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-900 dark:text-slate-100 font-bold text-[10px]">
                            ★ SELECTED
                          </span>
                        ) : candMatch ? (
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-[10px]">
                            MATCHED (/{candMatch.prefixLen})
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">NO MATCH</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-amber-600 dark:text-amber-400">{r.protocol}</span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">{r.network}</td>
                      <td className="py-3 px-3 text-indigo-600 dark:text-indigo-400">{r.nextHop}</td>
                      <td className="py-3 px-3 text-violet-600 dark:text-violet-400">{r.interfaceName}</td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                        {r.ad} / {r.metric}
                      </td>
                      <td className="py-3 px-3">
                        {r.id.startsWith("custom-") && (
                          <button
                            onClick={() => handleRemoveRoute(r.id)}
                            className="text-rose-600 dark:text-rose-400 hover:underline text-[11px]"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </NetworkingTable>
          </div>
        </div>

        {/* Add Custom Route Form */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">
            Add Custom Route Entry to Table
          </h4>
          <form onSubmit={handleAddRoute} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1">
                Network CIDR
              </label>
              <input
                aria-label="New route network in CIDR notation"
                type="text"
                value={newNetwork}
                onChange={(e) => setNewNetwork(e.target.value)}
                placeholder="e.g. 10.0.2.0/24"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1">
                Next Hop IP
              </label>
              <input
                aria-label="New route next hop"
                type="text"
                value={newNextHop}
                onChange={(e) => setNewNextHop(e.target.value)}
                placeholder="e.g. 10.0.2.1"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1">
                Exit Interface
              </label>
              <input
                aria-label="New route interface"
                type="text"
                value={newInterface}
                onChange={(e) => setNewInterface(e.target.value)}
                placeholder="e.g. Eth1.30"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1">
                Protocol
              </label>
              <select
                aria-label="New route protocol"
                value={newProtocol}
                onChange={(e) => setNewProtocol(e.target.value as RouteItem["protocol"])}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-400"
              >
                <option value="Static">Static (AD 1)</option>
                <option value="Connected">Connected (AD 0)</option>
                <option value="OSPF">OSPF (AD 110)</option>
                <option value="EIGRP">EIGRP (AD 90)</option>
                <option value="BGP">BGP (AD 20)</option>
                <option value="RIP">RIP (AD 120)</option>
              </select>
            </div>
            <div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-600/80 text-slate-900 dark:text-slate-100 font-mono text-xs font-bold py-2 rounded transition-all"
              >
                + Inject Route
              </button>
            </div>
          </form>
          {addError && (
            <div className="mt-3 text-xs font-mono text-rose-600 dark:text-rose-400">{addError}</div>
          )}
        </div>
        </NetworkingPanel>
      </div>
      </div>
        </NetworkingPanel>
    </section>
  );
}
