"use client";

import { useState } from "react";

// --- Types & Interfaces ---
interface SecurityRule {
  id: number;
  ruleNum?: number; // for NACLs
  protocol: "TCP" | "UDP" | "ICMP" | "ALL";
  portRange: string; // e.g. "80", "22", "3306", "1024-65535", "ALL"
  sourceCidr: string; // e.g. "0.0.0.0/0", "10.0.1.0/24", "192.168.1.0/24"
  action: "ALLOW" | "DENY";
  description: string;
  enabled: boolean;
}

// Preset rules for NACL vs SG
const INITIAL_NACL_RULES: SecurityRule[] = [
  {
    id: 1,
    ruleNum: 100,
    protocol: "TCP",
    portRange: "80",
    sourceCidr: "0.0.0.0/0",
    action: "ALLOW",
    description: "Allow inbound HTTP from internet",
    enabled: true,
  },
  {
    id: 2,
    ruleNum: 110,
    protocol: "TCP",
    portRange: "443",
    sourceCidr: "0.0.0.0/0",
    action: "ALLOW",
    description: "Allow inbound HTTPS from internet",
    enabled: true,
  },
  {
    id: 3,
    ruleNum: 200,
    protocol: "TCP",
    portRange: "22",
    sourceCidr: "192.168.1.0/24",
    action: "ALLOW",
    description: "Allow SSH only from Admin Subnet",
    enabled: true,
  },
  {
    id: 4,
    ruleNum: 210,
    protocol: "TCP",
    portRange: "22",
    sourceCidr: "0.0.0.0/0",
    action: "DENY",
    description: "Deny SSH from everywhere else",
    enabled: true,
  },
  {
    id: 5,
    ruleNum: 300,
    protocol: "TCP",
    portRange: "3306",
    sourceCidr: "10.0.1.0/24",
    action: "ALLOW",
    description: "Allow MySQL from Web Subnet",
    enabled: true,
  },
  {
    id: 6,
    ruleNum: 999,
    protocol: "ALL",
    portRange: "ALL",
    sourceCidr: "0.0.0.0/0",
    action: "DENY",
    description: "Default Deny All Inbound Traffic",
    enabled: true,
  },
];

const INITIAL_SG_RULES: SecurityRule[] = [
  {
    id: 101,
    protocol: "TCP",
    portRange: "80",
    sourceCidr: "0.0.0.0/0",
    action: "ALLOW",
    description: "Allow HTTP web traffic",
    enabled: true,
  },
  {
    id: 102,
    protocol: "TCP",
    portRange: "443",
    sourceCidr: "0.0.0.0/0",
    action: "ALLOW",
    description: "Allow HTTPS web traffic",
    enabled: true,
  },
  {
    id: 103,
    protocol: "TCP",
    portRange: "22",
    sourceCidr: "192.168.1.0/24",
    action: "ALLOW",
    description: "Allow SSH Bastion Host access",
    enabled: true,
  },
  {
    id: 104,
    protocol: "TCP",
    portRange: "3306",
    sourceCidr: "10.0.1.0/24",
    action: "ALLOW",
    description: "Allow DB connection from App Tier",
    enabled: true,
  },
];

// Helper IP matching function
function checkIpMatch(ip: string, cidr: string): boolean {
  if (cidr === "0.0.0.0/0" || cidr.toLowerCase() === "all" || cidr === "*") return true;
  if (ip === cidr) return true;

  // Simple CIDR match check for standard prefixes /24 and /16
  const [targetIp, prefixStr] = cidr.split("/");
  if (!prefixStr) return ip === targetIp;

  const prefix = parseInt(prefixStr, 10);
  const ipOctets = ip.split(".").map(Number);
  const targetOctets = targetIp.split(".").map(Number);

  if (ipOctets.length !== 4 || targetOctets.length !== 4) return false;

  if (prefix === 24) {
    return (
      ipOctets[0] === targetOctets[0] &&
      ipOctets[1] === targetOctets[1] &&
      ipOctets[2] === targetOctets[2]
    );
  } else if (prefix === 16) {
    return ipOctets[0] === targetOctets[0] && ipOctets[1] === targetOctets[1];
  } else if (prefix === 8) {
    return ipOctets[0] === targetOctets[0];
  } else if (prefix === 32) {
    return ip === targetIp;
  }

  return ip === targetIp;
}

// Helper Port matching function
function checkPortMatch(port: number, portRange: string): boolean {
  if (portRange.toUpperCase() === "ALL" || portRange === "*") return true;
  if (portRange.includes("-")) {
    const [start, end] = portRange.split("-").map((p) => parseInt(p.trim(), 10));
    return port >= start && port <= end;
  }
  const targetPort = parseInt(portRange, 10);
  return port === targetPort;
}

export default function SecuritySection() {
  // --- State 1: NACL vs SG Interactive Logic ---
  const [logicMode, setLogicMode] = useState<"nacl" | "sg">("nacl");
  const [simStep, setSimStep] = useState<number>(1);

  // --- State 2: VPN & VXLAN Overlay Cards ---
  const [vpnTab, setVpnTab] = useState<"wireguard" | "ipsec">("wireguard");
  const [activeVxlanLayer, setActiveVxlanLayer] = useState<number>(3); // 0 to 5 index

  // --- State 3: NAT Variants Breakdown ---
  const [activeNatType, setActiveNatType] = useState<"snat" | "dnat" | "pat">("pat");

  // --- State 4: Interactive Security Rule Inspector ---
  const [inspectorMode, setInspectorMode] = useState<"nacl" | "sg">("nacl");
  const [sourceIpInput, setSourceIpInput] = useState<string>("203.0.113.50");
  const [destPortInput, setDestPortInput] = useState<number>(80);
  const [protocolInput, setProtocolInput] = useState<"TCP" | "UDP" | "ICMP">("TCP");

  // Custom rules list state
  const [naclRules, setNaclRules] = useState<SecurityRule[]>(INITIAL_NACL_RULES);
  const [sgRules, setSgRules] = useState<SecurityRule[]>(INITIAL_SG_RULES);

  // Rule Form state for adding custom rule
  const [newPort, setNewPort] = useState<string>("8080");
  const [newCidr, setNewCidr] = useState<string>("0.0.0.0/0");
  const [newAction, setNewAction] = useState<"ALLOW" | "DENY">("ALLOW");
  const [newDesc, setNewDesc] = useState<string>("Custom Application Service");
  const [newRuleNum, setNewRuleNum] = useState<number>(150);

  const toggleRuleEnabled = (id: number) => {
    if (inspectorMode === "nacl") {
      setNaclRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
      );
    } else {
      setSgRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
      );
    }
  };

  const addCustomRule = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = Date.now();
    if (inspectorMode === "nacl") {
      const rule: SecurityRule = {
        id: newId,
        ruleNum: newRuleNum,
        protocol: protocolInput,
        portRange: newPort,
        sourceCidr: newCidr,
        action: newAction,
        description: newDesc,
        enabled: true,
      };
      setNaclRules((prev) => [...prev, rule].sort((a, b) => (a.ruleNum || 0) - (b.ruleNum || 0)));
    } else {
      const rule: SecurityRule = {
        id: newId,
        protocol: protocolInput,
        portRange: newPort,
        sourceCidr: newCidr,
        action: "ALLOW", // SGs only allow ALLOW rules
        description: newDesc,
        enabled: true,
      };
      setSgRules((prev) => [...prev, rule]);
    }
  };

  // --- Rule Evaluation Logic ---
  const evaluatePacket = () => {
    const activeRules = (inspectorMode === "nacl" ? naclRules : sgRules).filter(
      (r) => r.enabled
    );
    const traceLogs: string[] = [];

    if (inspectorMode === "nacl") {
      // NACL: Numbered order, top-to-bottom evaluation. First match wins!
      const sortedRules = [...activeRules].sort((a, b) => (a.ruleNum || 0) - (b.ruleNum || 0));

      for (const rule of sortedRules) {
        const ipMatch = checkIpMatch(sourceIpInput, rule.sourceCidr);
        const portMatch = checkPortMatch(destPortInput, rule.portRange);
        const protoMatch =
          rule.protocol === "ALL" || rule.protocol === protocolInput;

        if (ipMatch && portMatch && protoMatch) {
          traceLogs.push(
            `Rule #${rule.ruleNum} MATCHED: [Protocol: ${rule.protocol}, Port: ${rule.portRange}, Source: ${rule.sourceCidr}] → Action: ${rule.action}`
          );
          return {
            allowed: rule.action === "ALLOW",
            matchedRule: rule,
            trace: traceLogs,
            reason: `Matched explicitly enabled Rule #${rule.ruleNum} (${rule.description}). Evaluation halted (First Match Wins).`,
          };
        } else {
          traceLogs.push(
            `Rule #${rule.ruleNum} checked: [Source ${sourceIpInput} vs ${rule.sourceCidr}: ${
              ipMatch ? "OK" : "NO"
            }, Port ${destPortInput} vs ${rule.portRange}: ${
              portMatch ? "OK" : "NO"
            }] → Skip`
          );
        }
      }

      return {
        allowed: false,
        matchedRule: null,
        trace: traceLogs,
        reason: "No explicit rule matched. Blocked by implicit default deny (*).",
      };
    } else {
      // Security Group: Stateful, Allow-only rules. Evaluate all rules.
      let matchingAllowRule: SecurityRule | null = null;

      for (const rule of activeRules) {
        const ipMatch = checkIpMatch(sourceIpInput, rule.sourceCidr);
        const portMatch = checkPortMatch(destPortInput, rule.portRange);
        const protoMatch =
          rule.protocol === "ALL" || rule.protocol === protocolInput;

        if (ipMatch && portMatch && protoMatch && rule.action === "ALLOW") {
          matchingAllowRule = rule;
          traceLogs.push(
            `Allow Rule MATCHED: [${rule.description}] permits ${protocolInput} from ${sourceIpInput}:${destPortInput}`
          );
          break;
        } else {
          traceLogs.push(
            `Rule checked: [${rule.description}] → Did not match criteria`
          );
        }
      }

      if (matchingAllowRule) {
        return {
          allowed: true,
          matchedRule: matchingAllowRule,
          trace: traceLogs,
          reason: `Permitted by Security Group Rule: ${matchingAllowRule.description}. Return traffic is statefully tracked and permitted automatically.`,
        };
      }

      return {
        allowed: false,
        matchedRule: null,
        trace: traceLogs,
        reason:
          "Denied: Security Groups operate on an implicit Default Deny model. No matching ALLOW rule was found.",
      };
    }
  };

  const evalResult = evaluatePacket();

  // VXLAN header layers
  const vxlanLayers = [
    {
      name: "1. Outer Ethernet Header",
      size: "14 Bytes",
      desc: "Contains MAC address of source and destination VTEPs (VXLAN Tunnel Endpoints) or transit routers across the physical L3 underlay network.",
      color: "border-indigo-400 text-indigo-600 bg-indigo-50",
      fields: "Src MAC (VTEP A) | Dst MAC (Next-hop Router)",
    },
    {
      name: "2. Outer IP Header",
      size: "20 Bytes",
      desc: "Standard IPv4 header routing the encapsulated packet across the L3 IP fabric from VTEP IP A (e.g. 10.200.1.5) to VTEP IP B (e.g. 10.200.2.8).",
      color: "border-emerald-400 text-emerald-600 bg-emerald-50",
      fields: "Src IP: 10.200.1.5 | Dst IP: 10.200.2.8 | Protocol: UDP (17)",
    },
    {
      name: "3. Outer UDP Header",
      size: "8 Bytes",
      desc: "Uses IANA assigned UDP port 4789 for VXLAN. Source UDP port is calculated from inner frame hash to enable Equal-Cost Multi-Path (ECMP) load balancing.",
      color: "border-amber-400 text-amber-600 bg-amber-50",
      fields: "Src Port: Hash(Inner) | Dst Port: 4789 (VXLAN)",
    },
    {
      name: "4. VXLAN Header",
      size: "8 Bytes",
      desc: "Contains the 24-bit VXLAN Network Identifier (VNI) providing up to 16,777,216 isolated virtual Layer 2 subnets over a shared L3 fabric.",
      color: "border-violet-400 text-violet-600 bg-violet-50",
      fields: "Flags (I=1) | Reserved (24b) | VNI: 5001 (24-bit) | Reserved (8b)",
    },
    {
      name: "5. Inner Ethernet Header",
      size: "14 Bytes",
      desc: "Original Layer 2 frame generated by tenant Virtual Machine or Container (Src MAC: VM A, Dst MAC: VM B). Preserves tenant L2 headers intact.",
      color: "border-rose-400 text-rose-600 bg-rose-50",
      fields: "Tenant Src MAC (VM-A) | Tenant Dst MAC (VM-B) | EtherType: 0x0800",
    },
    {
      name: "6. Inner IP & Payload",
      size: "Variable",
      desc: "Original tenant IP payload (e.g., HTTP request from 172.16.10.5 to 172.16.10.20). Fully encapsulated and transparent to physical network switches.",
      color: "border-[#e6edf3] text-slate-900 bg-[#e6edf3]/10",
      fields: "Inner Src IP: 172.16.10.5 | Inner Dst IP: 172.16.10.20 | TCP Payload",
    },
  ];

  return (
    <section
      id="security"
      className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold">
          #security
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          18. Network Security & Access Control
        </h2>
      </div>

      <p className="text-slate-500 text-base leading-relaxed mb-8 max-w-4xl">
        Modern cloud and enterprise networks enforce defense-in-depth through multi-layered access control mechanisms. From <strong className="text-amber-600">Stateless Subnet NACLs</strong> and <strong className="text-emerald-600">Stateful Instance Security Groups</strong> to <strong className="text-indigo-600">Encapsulated Overlay Tunnels (VPN & VXLAN)</strong> and <strong className="text-violet-600">Network Address Translation (NAT)</strong>, secure network architectures protect workloads at every hop.
      </p>

      {/* ========================================================================= */}
      {/* 1. STATELESS NACLS VS STATEFUL SECURITY GROUPS */}
      {/* ========================================================================= */}
      <div className="mb-12 rounded-xl bg-white border border-slate-200 p-6 card-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-[#ffa657]/20 text-amber-600 text-xs font-mono font-bold">
                Layer 3/4 Filtering
              </span>
              <h3 className="text-xl font-bold text-slate-900">
                1. Network ACLs vs. Security Groups
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Comparing subnet-level stateless packet filters against hypervisor/ENI stateful firewalls.
            </p>
          </div>

          {/* Toggle Button */}
          <div className="flex rounded-lg bg-slate-50 p-1 border border-slate-200 self-start sm:self-auto">
            <button
              onClick={() => setLogicMode("nacl")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                logicMode === "nacl"
                  ? "bg-[#ffa657] text-slate-900 shadow"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Stateless NACL View
            </button>
            <button
              onClick={() => setLogicMode("sg")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                logicMode === "sg"
                  ? "bg-emerald-500 text-slate-900 shadow"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Stateful SG View
            </button>
          </div>
        </div>

        {/* Comparison Matrix Table */}
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/60">
                <th className="py-3 px-4 font-semibold">Architectural Feature</th>
                <th className="py-3 px-4 font-semibold text-amber-600">Network ACL (NACL)</th>
                <th className="py-3 px-4 font-semibold text-emerald-600">Security Group (SG)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d] text-slate-900">
              <tr className="hover:bg-slate-50/40">
                <td className="py-3 px-4 text-slate-500 font-sans font-medium">Operating Boundary</td>
                <td className="py-3 px-4 text-amber-600">Subnet Boundary (VPC Router Level)</td>
                <td className="py-3 px-4 text-emerald-600">Instance / ENI Level (Hypervisor)</td>
              </tr>
              <tr className="hover:bg-slate-50/40">
                <td className="py-3 px-4 text-slate-500 font-sans font-medium">State Tracking</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">
                    Stateless
                  </span>
                  <p className="font-sans text-[11px] text-slate-500 mt-1">
                    Return traffic MUST be explicitly allowed in Outbound rules.
                  </p>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                    Stateful
                  </span>
                  <p className="font-sans text-[11px] text-slate-500 mt-1">
                    Return traffic automatically allowed regardless of outbound rules.
                  </p>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/40">
                <td className="py-3 px-4 text-slate-500 font-sans font-medium">Rule Actions Supported</td>
                <td className="py-3 px-4">ALLOW and DENY rules</td>
                <td className="py-3 px-4 text-emerald-600">ALLOW rules only (Implicit Default Deny)</td>
              </tr>
              <tr className="hover:bg-slate-50/40">
                <td className="py-3 px-4 text-slate-500 font-sans font-medium">Evaluation Order</td>
                <td className="py-3 px-4">Sequential by Rule Number (Lowest number evaluated first)</td>
                <td className="py-3 px-4">All rules evaluated simultaneously before decision</td>
              </tr>
              <tr className="hover:bg-slate-50/40">
                <td className="py-3 px-4 text-slate-500 font-sans font-medium">Ephemeral Return Ports</td>
                <td className="py-3 px-4 text-rose-600">
                  Must open ports 1024-65535 outbound for response traffic!
                </td>
                <td className="py-3 px-4 text-emerald-600">
                  Automatically tracked by connection state table
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Interactive Return Traffic Logic Breakdown */}
        <div className="rounded-lg bg-slate-50 p-5 border border-slate-200">
          <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
            <span>
              Return Traffic Flow Breakdown — {logicMode === "nacl" ? "NACL (Stateless)" : "Security Group (Stateful)"}
            </span>
            <span className="text-xs font-mono text-slate-500">
              Step {simStep} of 3
            </span>
          </h4>

          {/* Stepper buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSimStep(1)}
              className={`flex-1 py-1.5 rounded text-xs font-mono transition-all ${
                simStep === 1
                  ? "bg-indigo-600 text-slate-900 font-bold"
                  : "bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200"
              }`}
            >
              1. Inbound Request (Port 80)
            </button>
            <button
              onClick={() => setSimStep(2)}
              className={`flex-1 py-1.5 rounded text-xs font-mono transition-all ${
                simStep === 2
                  ? "bg-indigo-600 text-slate-900 font-bold"
                  : "bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200"
              }`}
            >
              2. State Tracking Table
            </button>
            <button
              onClick={() => setSimStep(3)}
              className={`flex-1 py-1.5 rounded text-xs font-mono transition-all ${
                simStep === 3
                  ? "bg-indigo-600 text-slate-900 font-bold"
                  : "bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200"
              }`}
            >
              3. Outbound Response (Ephemeral)
            </button>
          </div>

          {/* Simulation Display */}
          <div className="p-4 rounded-lg bg-white border border-slate-200 font-mono text-xs text-slate-900">
            {simStep === 1 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-indigo-600">
                  <span>[PACKET INBOUND]</span>
                  <span>Src: 203.0.113.50:52134 → Dst: 10.0.1.10:80</span>
                </div>
                <p className="text-xs font-sans text-slate-500">
                  External client sends HTTP request to web server on port 80 using client ephemeral port 52134.
                </p>
                <div className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px] text-emerald-600">
                  {logicMode === "nacl"
                    ? "NACL Check: Inbound Rule 100 permits TCP Port 80 → Packet allowed into Subnet."
                    : "Security Group Check: Inbound Allow Rule matches Port 80 → Packet allowed to ENI."}
                </div>
              </div>
            )}

            {simStep === 2 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-amber-600">
                  <span>[STATE TABLE ACTION]</span>
                  <span>
                    {logicMode === "nacl"
                      ? "Stateless — NO State Entry Created"
                      : "Stateful Connection Session Created"}
                  </span>
                </div>
                <p className="text-xs font-sans text-slate-500">
                  How the firewall processes session memory for this active TCP connection:
                </p>
                <div
                  className={`p-3 rounded border text-[11px] ${
                    logicMode === "nacl"
                      ? "bg-rose-50 border-rose-200 text-rose-600"
                      : "bg-emerald-50 border-emerald-200 text-emerald-600"
                  }`}
                >
                  {logicMode === "nacl" ? (
                    <div>
                      <strong>⚠️ Stateless Engine:</strong> Network ACLs do NOT track connection state! Once packet passes inbound, the router completely forgets about this request. Outbound response must be evaluated from scratch.
                    </div>
                  ) : (
                    <div>
                      <strong>✓ Stateful Engine:</strong> Connection table records entry: <code>[203.0.113.50:52134 ↔ 10.0.1.10:80]</code>. Any reply packet matching this flow will bypass outbound rules automatically!
                    </div>
                  )}
                </div>
              </div>
            )}

            {simStep === 3 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-violet-600">
                  <span>[PACKET OUTBOUND RESPONSE]</span>
                  <span>Src: 10.0.1.10:80 → Dst: 203.0.113.50:52134</span>
                </div>
                <p className="text-xs font-sans text-slate-500">
                  Web server sends HTTP response packet back to client ephemeral port 52134.
                </p>
                <div
                  className={`p-3 rounded border text-[11px] ${
                    logicMode === "nacl"
                      ? "bg-amber-50 border-amber-200 text-amber-600"
                      : "bg-emerald-50 border-emerald-200 text-emerald-600"
                  }`}
                >
                  {logicMode === "nacl" ? (
                    <div>
                      <strong>NACL Outbound Evaluation:</strong> Requires Outbound Rule allowing TCP destination ports 1024-65535 to 0.0.0.0/0. Without this ephemeral port rule, response packets are <span className="text-rose-600 font-bold">DROPPED</span>!
                    </div>
                  ) : (
                    <div>
                      <strong>SG Outbound Evaluation:</strong> Automatic pass! Because the request was allowed inbound, the stateful firewall permits the return packet on port 52134 even if outbound rules block port 52134.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. VPN TUNNELS & VXLAN ENCAPSULATION OVERLAY CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        {/* CARD A: VPN Tunnels (WireGuard vs IPsec) */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow hover:card-shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 text-xs font-mono font-bold">
                  Site-to-Site & Remote Access
                </span>
                <h3 className="text-lg font-bold text-slate-900">VPN Tunnels</h3>
              </div>
              <div className="flex rounded bg-slate-50 p-0.5 border border-slate-200">
                <button
                  onClick={() => setVpnTab("wireguard")}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${
                    vpnTab === "wireguard"
                      ? "bg-indigo-600 text-slate-900"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  WireGuard
                </button>
                <button
                  onClick={() => setVpnTab("ipsec")}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${
                    vpnTab === "ipsec"
                      ? "bg-[#bc8cff] text-slate-900"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  IPsec
                </button>
              </div>
            </div>

            {vpnTab === "wireguard" ? (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-slate-900">
                  <h4 className="font-bold text-indigo-600 mb-1">
                    WireGuard — Modern Lightweight Crypto Tunnel
                  </h4>
                  <p className="text-slate-500 leading-relaxed">
                    Designed as a fast, simple replacement for IPsec and OpenVPN. Operates in Linux kernel space with minimal overhead (~4,000 lines of code).
                  </p>
                </div>

                <div className="space-y-2 text-xs font-mono text-slate-500">
                  <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-200">
                    <span>Crypto Primitive:</span>
                    <span className="text-emerald-600">ChaCha20-Poly1305 & Curve25519</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-200">
                    <span>Handshake Protocol:</span>
                    <span className="text-slate-900">Noise Protocol Framework (1 RTT)</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-200">
                    <span>Transport Layer:</span>
                    <span className="text-amber-600">UDP Port 51820</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-200">
                    <span>Key Exchange:</span>
                    <span className="text-indigo-600">Static Public Keys (Cryptokey Routing)</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-200">
                    <span>Roaming Ability:</span>
                    <span className="text-emerald-600">Seamless IP Roaming across Wi-Fi/Cellular</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-violet-50 border border-violet-200 text-xs text-slate-900">
                  <h4 className="font-bold text-violet-600 mb-1">
                    IPsec — Enterprise Standard Security Suite
                  </h4>
                  <p className="text-slate-500 leading-relaxed">
                    Robust Layer 3 security suite widely used in corporate Site-to-Site VPNs. Complex multi-phase negotiation with high configurability (~100,000+ lines of code).
                  </p>
                </div>

                <div className="space-y-2 text-xs font-mono text-slate-500">
                  <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-200">
                    <span>Key Negotiation:</span>
                    <span className="text-violet-600">IKEv2 / ISAKMP (Phase 1 & Phase 2)</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-200">
                    <span>Encapsulation Headers:</span>
                    <span className="text-slate-900">ESP (Proto 50) & AH (Proto 51)</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-200">
                    <span>NAT Traversal:</span>
                    <span className="text-amber-600">UDP Port 4500 (Encap ESP in UDP)</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-200">
                    <span>Cipher Support:</span>
                    <span className="text-indigo-600">AES-256-GCM, SHA-384, DH Groups 14-21</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-200">
                    <span>Use Case:</span>
                    <span className="text-emerald-600">AWS DirectConnect VPN, Cisco/Fortinet Tunnels</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CARD B: VXLAN Overlay (L2 over L3 Encapsulation) */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow hover:border-emerald-400/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 text-xs font-mono font-bold">
                  Overlay Network (L2 over L3)
                </span>
                <h3 className="text-lg font-bold text-slate-900">VXLAN Encapsulation</h3>
              </div>
              <span className="text-xs font-mono text-amber-600">UDP 4789</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              <strong className="text-emerald-600">Virtual Extensible LAN (VXLAN)</strong> encapsulates Layer 2 Ethernet frames inside Layer 4 UDP packets. Used in data center spine-leaf topologies and Kubernetes CNI overlays (Flannel/Calico) to expand past the 4,096 VLAN limit up to <strong className="text-indigo-600">16.7 Million VNI segments</strong>.
            </p>

            {/* Interactive VXLAN Header Inspection */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-900">
                Click Packet Header Layer to Inspect Encapsulation:
              </div>

              {/* Horizontal Header Block Visual */}
              <div className="grid grid-cols-6 gap-1 text-[10px] font-mono text-center">
                {vxlanLayers.map((layer, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveVxlanLayer(idx)}
                    className={`p-2 rounded transition-all border ${
                      activeVxlanLayer === idx
                        ? `${layer.color} font-bold scale-105 shadow-md`
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-400"
                    }`}
                  >
                    L{idx + 1}
                  </button>
                ))}
              </div>

              {/* Active Layer Details */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">
                    {vxlanLayers[activeVxlanLayer].name}
                  </span>
                  <span className="font-mono text-[11px] text-amber-600">
                    Header Size: {vxlanLayers[activeVxlanLayer].size}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-indigo-600 bg-white p-1.5 rounded border border-slate-200">
                  {vxlanLayers[activeVxlanLayer].fields}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {vxlanLayers[activeVxlanLayer].desc}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. NAT VARIANTS BREAKDOWN (SNAT, DNAT, PAT) */}
      {/* ========================================================================= */}
      <div className="mb-12 rounded-xl bg-white border border-slate-200 p-6 card-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-[#bc8cff]/20 text-violet-600 text-xs font-mono font-bold">
                Address Translation Architecture
              </span>
              <h3 className="text-xl font-bold text-slate-900">
                3. Network Address Translation (NAT) Variants
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Understanding SNAT, DNAT, and PAT (NAPT) packet header transformations at boundary gateways.
            </p>
          </div>

          {/* Type Selector Tabs */}
          <div className="flex rounded-lg bg-slate-50 p-1 border border-slate-200 self-start sm:self-auto">
            <button
              onClick={() => setActiveNatType("snat")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeNatType === "snat"
                  ? "bg-indigo-600 text-slate-900"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              SNAT (Source NAT)
            </button>
            <button
              onClick={() => setActiveNatType("dnat")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeNatType === "dnat"
                  ? "bg-[#ffa657] text-slate-900"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              DNAT (Destination NAT)
            </button>
            <button
              onClick={() => setActiveNatType("pat")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeNatType === "pat"
                  ? "bg-emerald-500 text-slate-900"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              PAT / NAPT (Port NAT)
            </button>
          </div>
        </div>

        {/* NAT Type Details & Header Transformation Graphic */}
        {activeNatType === "snat" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-3">
              <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-600 text-xs font-mono font-bold">
                Outbound Internet Access
              </span>
              <h4 className="text-lg font-bold text-slate-900">SNAT — Source NAT</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Rewrites the <strong className="text-indigo-600">Source IP address</strong> of outbound packets initiated from a private network host to a public gateway IP.
              </p>
              <div className="p-3 rounded bg-slate-50 border border-slate-200 text-xs text-slate-500">
                <strong>Primary Use Case:</strong> AWS NAT Gateway, Outbound Egress for private subnet EC2 instances.
              </div>
            </div>

            <div className="md:col-span-2 p-4 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs space-y-3">
              <div className="text-xs font-bold text-slate-900 mb-2">
                Header Rewrite Transformation (SNAT):
              </div>
              <div className="p-3 rounded bg-white border border-slate-200 space-y-2">
                <div className="text-rose-600">
                  [LAN Packet Before Gateway]:
                  <span className="text-slate-900 ml-2">Src: 10.0.1.45:51200 → Dst: 1.1.1.1:443</span>
                </div>
                <div className="text-emerald-600">
                  [WAN Packet After Gateway]:
                  <span className="text-slate-900 ml-2">Src: 203.0.113.10:51200 → Dst: 1.1.1.1:443</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500">
                NAT Translation Entry: <code>10.0.1.45 ➔ 203.0.113.10 (Source Rewritten)</code>
              </div>
            </div>
          </div>
        )}

        {activeNatType === "dnat" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-3">
              <span className="px-2 py-1 rounded bg-[#ffa657]/20 text-amber-600 text-xs font-mono font-bold">
                Inbound Port Forwarding
              </span>
              <h4 className="text-lg font-bold text-slate-900">DNAT — Destination NAT</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Rewrites the <strong className="text-amber-600">Destination IP address and Port</strong> of incoming public requests to forward traffic to an internal server.
              </p>
              <div className="p-3 rounded bg-slate-50 border border-slate-200 text-xs text-slate-500">
                <strong>Primary Use Case:</strong> Web Server Port Forwarding (80/443), Ingress Load Balancers, Virtual Server Virtual IPs.
              </div>
            </div>

            <div className="md:col-span-2 p-4 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs space-y-3">
              <div className="text-xs font-bold text-slate-900 mb-2">
                Header Rewrite Transformation (DNAT):
              </div>
              <div className="p-3 rounded bg-white border border-slate-200 space-y-2">
                <div className="text-rose-600">
                  [WAN Packet At Router]:
                  <span className="text-slate-900 ml-2">Src: 198.51.100.88:61000 → Dst: 203.0.113.10:80</span>
                </div>
                <div className="text-emerald-600">
                  [LAN Packet Forwarded to Server]:
                  <span className="text-slate-900 ml-2">Src: 198.51.100.88:61000 → Dst: 10.0.2.50:8080</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500">
                NAT Translation Entry: <code>203.0.113.10:80 ➔ 10.0.2.50:8080 (Destination & Port Rewritten)</code>
              </div>
            </div>
          </div>
        )}

        {activeNatType === "pat" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-3">
              <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-600 text-xs font-mono font-bold">
                Many-to-One Overload NAT
              </span>
              <h4 className="text-lg font-bold text-slate-900">PAT — Port Address Translation</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Maps thousands of internal private host IP addresses onto a <strong className="text-emerald-600">single shared public IP address</strong> by assigning unique public source ports for each session.
              </p>
              <div className="p-3 rounded bg-slate-50 border border-slate-200 text-xs text-slate-500">
                <strong>Primary Use Case:</strong> Home Routers, Corporate Egress Gateways, IPv4 Address Preservation.
              </div>
            </div>

            <div className="md:col-span-2 p-4 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs space-y-3">
              <div className="text-xs font-bold text-slate-900 mb-2">
                PAT Translation Table Mapping (Multiple Internal Hosts → 1 Public IP):
              </div>
              <div className="p-3 rounded bg-white border border-slate-200 space-y-2 text-[11px]">
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-indigo-600">Host A (10.0.1.15:5000)</span>
                  <span className="text-slate-500">➔</span>
                  <span className="text-emerald-600">203.0.113.1:10001</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-indigo-600">Host B (10.0.1.16:5000)</span>
                  <span className="text-slate-500">➔</span>
                  <span className="text-emerald-600">203.0.113.1:10002</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-600">Host C (10.0.1.17:5000)</span>
                  <span className="text-slate-500">➔</span>
                  <span className="text-emerald-600">203.0.113.1:10003</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Both source IP and source port are translated to prevent socket collisions on public internet responses.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. INTERACTIVE SECURITY RULE INSPECTOR */}
      {/* ========================================================================= */}
      <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 text-xs font-mono font-bold">
                Interactive Testing Suite
              </span>
              <h3 className="text-xl font-bold text-slate-900">
                4. Interactive Security Rule Inspector
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Test arbitrary packet parameters (Source IP, Destination Port, Protocol) against custom firewall ACLs.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex rounded-lg bg-slate-50 p-1 border border-slate-200 self-start sm:self-auto">
            <button
              onClick={() => setInspectorMode("nacl")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                inspectorMode === "nacl"
                  ? "bg-[#ffa657] text-slate-900 shadow"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              NACL Inspector Mode
            </button>
            <button
              onClick={() => setInspectorMode("sg")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                inspectorMode === "sg"
                  ? "bg-emerald-500 text-slate-900 shadow"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              SG Inspector Mode
            </button>
          </div>
        </div>

        {/* Input Form & Quick Presets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 rounded-lg bg-slate-50 border border-slate-200">
          {/* Source IP Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Source IP Address / Subnet:
            </label>
            <input
              type="text"
              value={sourceIpInput}
              onChange={(e) => setSourceIpInput(e.target.value)}
              className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-400"
              placeholder="e.g. 203.0.113.50"
            />
            <div className="flex flex-wrap gap-1 mt-2">
              <button
                onClick={() => setSourceIpInput("203.0.113.50")}
                className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-500 hover:text-slate-900"
              >
                WAN (203.0.113.50)
              </button>
              <button
                onClick={() => setSourceIpInput("192.168.1.50")}
                className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-500 hover:text-slate-900"
              >
                Admin (192.168.1.50)
              </button>
              <button
                onClick={() => setSourceIpInput("10.0.1.25")}
                className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-500 hover:text-slate-900"
              >
                Web Subnet (10.0.1.25)
              </button>
            </div>
          </div>

          {/* Destination Port Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Destination Port Number:
            </label>
            <input
              type="number"
              value={destPortInput}
              onChange={(e) => setDestPortInput(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-400"
            />
            <div className="flex flex-wrap gap-1 mt-2">
              <button
                onClick={() => setDestPortInput(80)}
                className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-500 hover:text-slate-900"
              >
                HTTP (80)
              </button>
              <button
                onClick={() => setDestPortInput(443)}
                className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-500 hover:text-slate-900"
              >
                HTTPS (443)
              </button>
              <button
                onClick={() => setDestPortInput(22)}
                className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-500 hover:text-slate-900"
              >
                SSH (22)
              </button>
              <button
                onClick={() => setDestPortInput(3306)}
                className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-500 hover:text-slate-900"
              >
                MySQL (3306)
              </button>
            </div>
          </div>

          {/* Protocol Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Transport Protocol:
            </label>
            <select
              value={protocolInput}
              onChange={(e) =>
                setProtocolInput(e.target.value as "TCP" | "UDP" | "ICMP")
              }
              className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-400"
            >
              <option value="TCP">TCP</option>
              <option value="UDP">UDP</option>
              <option value="ICMP">ICMP</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-2">
              Testing packet: <code>{protocolInput}</code> packet to port <code>{destPortInput}</code> from <code>{sourceIpInput}</code>.
            </p>
          </div>
        </div>

        {/* Live Evaluation Result Banner */}
        <div
          className={`p-5 rounded-lg border mb-8 transition-all ${
            evalResult.allowed
              ? "bg-emerald-50 border-emerald-400/40 text-emerald-600"
              : "bg-rose-50 border-rose-400/40 text-rose-600"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold">
                {evalResult.allowed ? "✓ PACKET PERMITTED (ALLOWED)" : "🚫 PACKET DROPPED (DENIED)"}
              </span>
              <span className="px-2.5 py-0.5 rounded bg-slate-50 text-xs font-mono font-bold text-slate-900 border border-slate-200">
                Mode: {inspectorMode.toUpperCase()}
              </span>
            </div>
          </div>

          <p className="text-xs font-sans text-slate-900 leading-relaxed mb-3">
            {evalResult.reason}
          </p>

          {/* Trace Logs */}
          <div className="p-3 rounded bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-500 space-y-1">
            <div className="text-xs font-semibold text-indigo-600 mb-1">
              Rule Engine Evaluation Trace:
            </div>
            {evalResult.trace.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-[#30363d]">›</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Rules List */}
        <div className="mb-6">
          <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
            <span>
              Active {inspectorMode.toUpperCase()} Rule Configuration
            </span>
            <span className="text-xs font-mono text-slate-500">
              Click rule checkbox to enable/disable
            </span>
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                  <th className="py-2 px-3">Active</th>
                  {inspectorMode === "nacl" && <th className="py-2 px-3">Rule #</th>}
                  <th className="py-2 px-3">Protocol</th>
                  <th className="py-2 px-3">Port Range</th>
                  <th className="py-2 px-3">Source CIDR</th>
                  <th className="py-2 px-3">Action</th>
                  <th className="py-2 px-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d] text-slate-900">
                {(inspectorMode === "nacl" ? naclRules : sgRules).map((rule) => (
                  <tr
                    key={rule.id}
                    className={`transition-colors ${
                      !rule.enabled
                        ? "opacity-40 bg-slate-50/30"
                        : evalResult.matchedRule?.id === rule.id
                        ? "bg-indigo-50 font-semibold"
                        : "hover:bg-slate-50/50"
                    }`}
                  >
                    <td className="py-2 px-3">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => toggleRuleEnabled(rule.id)}
                        className="rounded border-slate-200 accent-[#58a6ff]"
                      />
                    </td>
                    {inspectorMode === "nacl" && (
                      <td className="py-2 px-3 text-amber-600 font-bold">
                        #{rule.ruleNum}
                      </td>
                    )}
                    <td className="py-2 px-3">{rule.protocol}</td>
                    <td className="py-2 px-3 font-bold text-indigo-600">
                      {rule.portRange}
                    </td>
                    <td className="py-2 px-3 text-emerald-600">{rule.sourceCidr}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rule.action === "ALLOW"
                            ? "bg-emerald-500/20 text-emerald-600"
                            : "bg-[#ff7b72]/20 text-rose-600"
                        }`}
                      >
                        {rule.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-500 font-sans">
                      {rule.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Custom Rule Form */}
        <form
          onSubmit={addCustomRule}
          className="p-4 rounded-lg bg-slate-50 border border-slate-200"
        >
          <div className="text-xs font-bold text-slate-900 mb-3">
            Add Custom Rule to {inspectorMode.toUpperCase()} Table:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-3 text-xs">
            {inspectorMode === "nacl" && (
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Rule Number:
                </label>
                <input
                  type="number"
                  value={newRuleNum}
                  onChange={(e) => setNewRuleNum(parseInt(e.target.value, 10) || 100)}
                  className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-900 font-mono"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                Port / Range:
              </label>
              <input
                type="text"
                value={newPort}
                onChange={(e) => setNewPort(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-900 font-mono"
                placeholder="e.g. 8080"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                Source CIDR:
              </label>
              <input
                type="text"
                value={newCidr}
                onChange={(e) => setNewCidr(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-900 font-mono"
                placeholder="e.g. 10.0.0.0/16"
              />
            </div>

            {inspectorMode === "nacl" && (
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Action:
                </label>
                <select
                  value={newAction}
                  onChange={(e) =>
                    setNewAction(e.target.value as "ALLOW" | "DENY")
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-900 font-mono"
                >
                  <option value="ALLOW">ALLOW</option>
                  <option value="DENY">DENY</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                Description:
              </label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-900"
                placeholder="Rule description..."
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-1.5 rounded bg-indigo-600 text-slate-900 text-xs font-semibold hover:bg-indigo-600/90 transition-all"
          >
            + Add Rule to {inspectorMode.toUpperCase()}
          </button>
        </form>
      </div>
    </section>
  );
}
