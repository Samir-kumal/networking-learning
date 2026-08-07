"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// ============================================================================
// Types & Data Interfaces
// ============================================================================

type ConnectionType = "tgw" | "peering" | "vpn" | "dx";
type TopoNodeKind = "tgw" | "vpc" | "onprem" | "dx";
type AccountKind = "own" | "cross";

interface TopoNode {
  id: string;
  label: string;
  kind: TopoNodeKind;
  account: AccountKind;
  cidr: string;
  /** position as fraction of the canvas (0..100) */
  x: number;
  y: number;
}

interface TopoLink {
  id: string;
  from: string;
  to: string;
  type: ConnectionType;
}

interface CidrInfo {
  cidr: string;
  prefix: number;
  first: number;
  last: number;
  usable: number;
}

const CIDR_PRESETS = [
  "10.0.0.0/16",
  "10.0.1.0/24",
  "10.1.0.0/16",
  "10.2.0.0/16",
  "10.2.1.0/24",
  "172.16.0.0/16",
  "172.16.1.0/24",
  "192.168.0.0/16",
  "192.168.1.0/24",
];

// --- Plain-text IPv4 CIDR helpers (no external deps) ---
function ipToInt(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = (value << 8) | n;
  }
  return value >>> 0;
}

function parseCidr(cidr: string): CidrInfo | null {
  const [ipPart, prefixPart] = cidr.trim().split("/");
  const prefix = Number(prefixPart);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32 || prefixPart === undefined || prefixPart === "") {
    return null;
  }
  const raw = ipToInt(ipPart);
  if (raw === null) return null;
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const network = raw & mask;
  const size = Math.pow(2, 32 - prefix);
  const last = prefix === 0 ? 0xffffffff : network + size - 1;
  const usable = prefix >= 31 ? size : size - 2;
  return { cidr: `${ipPart}/${prefix}`, prefix, first: network, last, usable };
}

function ipToString(int: number): string {
  return `${(int >>> 24) & 255}.${(int >>> 16) & 255}.${(int >>> 8) & 255}.${int & 255}`;
}

interface OverlapResult {
  a: string;
  b: string;
  aCidr: string;
  bCidr: string;
  kind: "containment" | "overlapping";
  sharedRange: string;
}

function findOverlaps(networks: { name: string; cidr: string }[]): OverlapResult[] {
  const parsed = networks.map((n) => ({ name: n.name, cidr: n.cidr, info: parseCidr(n.cidr) }));
  const results: OverlapResult[] = [];
  for (let i = 0; i < parsed.length; i++) {
    for (let j = i + 1; j < parsed.length; j++) {
      const A = parsed[i].info;
      const B = parsed[j].info;
      if (!A || !B) continue;
      // Overlap iff A.first <= B.last && B.first <= A.last
      if (A.first <= B.last && B.first <= A.last) {
        const sharedStart = Math.max(A.first, B.first);
        const sharedEnd = Math.min(A.last, B.last);
        const contained =
          (A.first <= B.first && A.last >= B.last) || (B.first <= A.first && B.last >= A.last);
        results.push({
          a: parsed[i].name,
          b: parsed[j].name,
          aCidr: parsed[i].cidr,
          bCidr: parsed[j].cidr,
          kind: contained ? "containment" : "overlapping",
          sharedRange: `${ipToString(sharedStart)} – ${ipToString(sharedEnd)}`,
        });
      }
    }
  }
  return results;
}

// --- Default topology: hub-and-spoke via Transit Gateway + hybrid on-prem ---
const DEFAULT_NODES: TopoNode[] = [
  { id: "tgw", label: "Transit Gateway", kind: "tgw", account: "own", cidr: "-", x: 50, y: 40 },
  { id: "prod", label: "Production VPC", kind: "vpc", account: "own", cidr: "10.0.0.0/16", x: 18, y: 22 },
  { id: "dev", label: "Development VPC", kind: "vpc", account: "own", cidr: "10.1.0.0/16", x: 82, y: 22 },
  { id: "shared", label: "Shared Services VPC", kind: "vpc", account: "own", cidr: "10.2.0.0/16", x: 16, y: 74 },
  { id: "partner", label: "Partner VPC (cross-account)", kind: "vpc", account: "cross", cidr: "10.0.1.0/24", x: 82, y: 72 },
  { id: "onprem", label: "On-premises DC", kind: "onprem", account: "own", cidr: "172.16.0.0/16", x: 44, y: 88 },
  { id: "dxgw", label: "Direct Connect Gateway", kind: "dx", account: "own", cidr: "-", x: 14, y: 44 },
];

const DEFAULT_LINKS: TopoLink[] = [
  { id: "l1", from: "prod", to: "tgw", type: "tgw" },
  { id: "l2", from: "dev", to: "tgw", type: "tgw" },
  { id: "l3", from: "shared", to: "tgw", type: "tgw" },
  { id: "l4", from: "partner", to: "tgw", type: "tgw" },
  { id: "l5", from: "prod", to: "dev", type: "peering" },
  { id: "l6", from: "onprem", to: "tgw", type: "vpn" },
  { id: "l7", from: "dxgw", to: "tgw", type: "dx" },
];

const NODE_W = 112;
const NODE_H = 64;
const CANVAS_H = 540;

const NODE_STYLE: Record<TopoNodeKind, string> = {
  tgw: "bg-indigo-500 border-indigo-300 shadow-indigo-900/30",
  vpc: "bg-blue-500 border-blue-300 shadow-blue-900/30",
  onprem: "bg-slate-600 border-slate-400 shadow-slate-900/30",
  dx: "bg-cyan-500 border-cyan-300 shadow-cyan-900/30",
};

const NODE_TEXT: Record<TopoNodeKind, string> = {
  tgw: "text-indigo-50",
  vpc: "text-blue-50",
  onprem: "text-slate-50",
  dx: "text-cyan-50",
};

const LINK_META: Record<ConnectionType, { stroke: string; chip: string; label: string }> = {
  tgw: { stroke: "bg-indigo-500", chip: "bg-indigo-500/10 text-indigo-700 border-indigo-300", label: "TGW attach" },
  peering: { stroke: "bg-blue-400", chip: "bg-blue-500/10 text-blue-700 border-blue-300", label: "VPC Peering" },
  vpn: { stroke: "bg-cyan-400", chip: "bg-cyan-500/10 text-cyan-800 border-cyan-300", label: "VPN tunnel" },
  dx: { stroke: "bg-emerald-400", chip: "bg-emerald-500/10 text-emerald-700 border-emerald-300", label: "Direct Connect" },
};

const CONNECTION_TYPE_OPTIONS: { id: ConnectionType; label: string; desc: string }[] = [
  { id: "tgw", label: "Transit Gateway attach", desc: "Hub-and-spoke routing via central TGW" },
  { id: "peering", label: "VPC peering", desc: "Direct 1:1 VPC pair (non-transitive)" },
  { id: "vpn", label: "VPN tunnel", desc: "IPsec site-to-site to on-premises" },
  { id: "dx", label: "Direct Connect", desc: "Private dedicated circuit into AWS" },
];

// ============================================================================
// Module 4: Route table seed data
// ============================================================================

type RtKey = "vpc-main" | "tgw" | "vpn-attach";

interface RouteRow {
  id: string;
  cidr: string;
  target: string;
  kind: "local" | "static" | "propagated";
}

interface RtTableDef {
  key: RtKey;
  title: string;
  region: string;
  scope: string;
  desc: string;
  base: RouteRow[];
  propagated: RouteRow[];
}

const RT_TABLES: Record<RtKey, RtTableDef> = {
  "vpc-main": {
    key: "vpc-main",
    title: "VPC Main Route Table",
    region: "us-east-1",
    scope: "Production VPC",
    desc: "The local VPC route is always present. Static + propagated routes decide how traffic leaves the VPC.",
    base: [{ id: "vplocal", cidr: "10.0.0.0/16", target: "Local", kind: "local" }],
    propagated: [
      { id: "vpprod", cidr: "10.1.0.0/16", target: "Transit Gateway Attach — vpc-dev", kind: "propagated" },
      { id: "vpshared", cidr: "10.2.0.0/16", target: "Transit Gateway Attach — shared-vpc", kind: "propagated" },
      { id: "vppartner", cidr: "10.0.1.0/24", target: "Transit Gateway Attach — partner-vpc", kind: "propagated" },
      { id: "vponprem", cidr: "172.16.0.0/16", target: "VPN Attachment (TGW)", kind: "propagated" },
    ],
  },
  tgw: {
    key: "tgw",
    title: "Transit Gateway Route Table",
    region: "us-east-1",
    scope: "tgw-0f2a1b3c",
    desc: "Attachment-specific associations. Propagated routes come from each attached VPC/VPN/DX gateway; identical prefixes from multiple attachments create conflicts.",
    base: [
      { id: "tgwblackhole", cidr: "0.0.0.0/0", target: "Blackhole (no default route)", kind: "static" },
    ],
    propagated: [
      { id: "tp-prod", cidr: "10.0.0.0/16", target: "vpc-prod attachment", kind: "propagated" },
      { id: "tp-dev", cidr: "10.1.0.0/16", target: "vpc-dev attachment", kind: "propagated" },
      { id: "tp-shared", cidr: "10.2.0.0/16", target: "shared-vpc attachment", kind: "propagated" },
      { id: "tp-partner", cidr: "10.0.1.0/24", target: "partner-vpc attachment (RAM-shared)", kind: "propagated" },
      { id: "tp-onprem", cidr: "172.16.0.0/16", target: "VPN attachment", kind: "propagated" },
      { id: "tp-dx", cidr: "172.16.0.0/16", target: "Direct Connect attachment", kind: "propagated" },
    ],
  },
  "vpn-attach": {
    key: "vpn-attach",
    title: "VPN Attachment Route Table",
    region: "us-east-1",
    scope: "VPN Connection vpn-0a11bb22",
    desc: "Routes learned over the BGP sessions from each tunneled CGW are propagated into the TGW.",
    base: [
      { id: "fnprem", cidr: "172.16.0.0/16", target: "BGP-learned via Tunnel A", kind: "propagated" },
    ],
    propagated: [
      { id: "fn-extra", cidr: "192.168.10.0/24", target: "BGP-learned via Tunnel B", kind: "propagated" },
    ],
  },
};

// ============================================================================
// Module 5: Direct Connect pricing / latency data
// ============================================================================

const DX_SPEEDS: Record<"dedicated" | "hosted", { id: string; label: string; rateUsdHr: number; note: string }[]> = {
  dedicated: [
    { id: "1g", label: "1 Gbps dedicated", rateUsdHr: 0.23, note: "100 Mbps → 1 Gbps port speeds" },
    { id: "10g", label: "10 Gbps dedicated", rateUsdHr: 2.25, note: "10 Gbps port (48 or 96 lanes)" },
    { id: "100g", label: "100 Gbps dedicated", rateUsdHr: 22.5, note: "Needs multiple 10G VIFs for >10 Gbps" },
  ],
  hosted: [
    { id: "50m", label: "50 Mbps hosted", rateUsdHr: 0.02, note: "Hosted (MACsec optional)" },
    { id: "500m", label: "500 Mbps hosted", rateUsdHr: 0.11, note: "Hosted via DX partner" },
    { id: "1g", label: "1 Gbps hosted", rateUsdHr: 0.23, note: "Hosted via DX partner" },
    { id: "10g", label: "10 Gbps hosted", rateUsdHr: 2.25, note: "Hosted via DX partner" },
  ],
};

const DX_REGIONS = [
  { id: "us-east-1", label: "us-east-1 (N. Virginia)", latencyMs: 2, pop: "Equinix DC2" },
  { id: "us-west-2", label: "us-west-2 (Oregon)", latencyMs: 4, pop: "CoreSite SV1" },
  { id: "eu-west-1", label: "eu-west-1 (Ireland)", latencyMs: 3, pop: "Equinix LD5" },
];

// ============================================================================
// Component
// ============================================================================

export default function AwsTransitGatewaySection() {
  // ============ Module 2: Topology builder state ============
  const [nodes, setNodes] = useState<TopoNode[]>(DEFAULT_NODES);
  const [links, setLinks] = useState<TopoLink[]>(DEFAULT_LINKS);
  const [linkType, setLinkType] = useState<ConnectionType>("tgw");
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<{ from: string; x: number; y: number } | null>(null);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>({ w: 960, h: CANVAS_H });
  const dragStart = useRef<{ px: number; py: number; startX: number; startY: number } | null>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      if (Math.abs(rect.width - canvasSizeRef.current.w) > 2 || Math.abs(rect.height - canvasSizeRef.current.h) > 2) {
        setCanvasSize({ w: rect.width || 960, h: rect.height || CANVAS_H });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const nodeById = useMemo(() => {
    const map = new Map<string, TopoNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  const linkConflicts = useMemo(() => {
    // Networks that share a path (direct link or via the hub) must not overlap.
    // Build connected components from the link graph, then compare CIDRs within each.
    const adj = new Map<string, string[]>();
    nodes.forEach((n) => adj.set(n.id, []));
    links.forEach((l) => {
      adj.get(l.from)?.push(l.to);
      adj.get(l.to)?.push(l.from);
    });
    const seen = new Set<string>();
    const components: string[][] = [];
    for (const n of nodes) {
      if (seen.has(n.id)) continue;
      const comp: string[] = [];
      const stack = [n.id];
      seen.add(n.id);
      while (stack.length > 0) {
        const id = stack.pop() as string;
        comp.push(id);
        for (const nb of adj.get(id) ?? []) {
          if (!seen.has(nb)) {
            seen.add(nb);
            stack.push(nb);
          }
        }
      }
      components.push(comp);
    }
    const conflicts = new Map<string, string>();
    for (const comp of components) {
      for (let i = 0; i < comp.length; i++) {
        for (let j = i + 1; j < comp.length; j++) {
          const a = nodeById.get(comp[i]);
          const b = nodeById.get(comp[j]);
          if (!a || !b || a.cidr === "-" || b.cidr === "-") continue;
          const ai = parseCidr(a.cidr);
          const bi = parseCidr(b.cidr);
          if (!ai || !bi) continue;
          if (ai.first <= bi.last && bi.first <= ai.last) {
            const msg = `${a.cidr} (${a.label}) overlaps ${b.cidr} (${b.label})`;
            conflicts.set(a.id, msg);
            conflicts.set(b.id, msg);
          }
        }
      }
    }
    return conflicts;
  }, [links, nodeById, nodes]);

  const toCanvasPoint = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  };

  const clampPoint = (x: number, y: number) => ({
    x: Math.min(92, Math.max(8, x)),
    y: Math.min(94, Math.max(6, y)),
  });

  const canvasSizeRef = useRef(canvasSize);
  canvasSizeRef.current = canvasSize;

  const startNodeDrag = (id: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    if (connecting) return;
    const pt = toCanvasPoint(e.clientX, e.clientY);
    const node = nodeById.get(id);
    if (!node) return;
    dragStart.current = { px: pt.x, py: pt.y, startX: node.x, startY: node.y };
    setDragNodeId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const moveNodeDrag = (e: React.PointerEvent) => {
    if (!dragStart.current || !dragNodeId) return;
    const pt = toCanvasPoint(e.clientX, e.clientY);
    const clamped = clampPoint(
      dragStart.current.startX + (pt.x - dragStart.current.px),
      dragStart.current.startY + (pt.y - dragStart.current.py)
    );
    setNodes((prev) => prev.map((n) => (n.id === dragNodeId ? { ...n, ...clamped } : n)));
  };

  const endNodeDrag = () => {
    setDragNodeId(null);
    dragStart.current = null;
  };

  // — dragging a connection from one node's handle to another —
  const startConnecting = (from: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    const pt = toCanvasPoint(e.clientX, e.clientY);
    setConnecting({ from, x: pt.x, y: pt.y });
    setCanvasError(null);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const moveConnecting = (e: React.PointerEvent) => {
    setConnecting((cur) => (cur ? { ...cur, ...toCanvasPoint(e.clientX, e.clientY) } : cur));
  };

  const canConnect = (fromId: string, toId: string, type: ConnectionType): string | null => {
    if (fromId === toId) return "Cannot attach a network to itself.";
    const from = nodeById.get(fromId);
    const to = nodeById.get(toId);
    if (!from || !to) return "Missing endpoint node.";
    if (links.some((l) => (l.from === fromId && l.to === toId) || (l.from === toId && l.to === fromId))) {
      return "A connection already exists between these two networks.";
    }
    if (type === "peering" && !(from.kind === "vpc" && to.kind === "vpc")) {
      return "VPC peering requires two VPCs (peering is non-transitive).";
    }
    if (type === "vpn" && !(from.kind === "onprem" || to.kind === "onprem")) {
      return "VPN tunnels attach from an on-premises site.";
    }
    if (type === "dx" && !(from.kind === "dx" || to.kind === "dx")) {
      return "Direct Connect must anchor at the DX gateway node.";
    }
    if (type === "tgw" && (from.kind === "dx" || to.kind === "dx")) {
      return "DX gateway links use Direct Connect, not a TGW attach.";
    }
    return null;
  };

  const endConnecting = (e?: React.PointerEvent) => {
    if (!connecting) return;
    let targetId: string | undefined;
    if (e) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const nodeEl = el?.closest("[data-node-id]") as HTMLElement | null;
      targetId = nodeEl?.dataset.nodeId;
    }
    const err = targetId ? canConnect(connecting.from, targetId, linkType) : null;
    if (targetId && !err) {
      const id = `l${Date.now().toString(36)}`;
      setLinks((prev) => [...prev, { id, from: connecting.from, to: targetId, type: linkType }]);
    } else if (err) {
      setCanvasError(err);
    }
    setConnecting(null);
  };

  const removeLink = (id: string) => setLinks((prev) => prev.filter((l) => l.id !== id));

  const setNodeCidr = (id: string, cidr: string) =>
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, cidr } : n)));

  // geometry for a link line
  const linkGeometry = (l: TopoLink) => {
    const a = nodeById.get(l.from);
    const b = nodeById.get(l.to);
    if (!a || !b) return null;
    const ax = (a.x / 100) * canvasSize.w;
    const ay = (a.y / 100) * canvasSize.h;
    const bx = (b.x / 100) * canvasSize.w;
    const by = (b.y / 100) * canvasSize.h;
    const dx = bx - ax;
    const dy = by - ay;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    const half = Math.hypot(NODE_W, NODE_H) / 2 + 6;
    const startX = ax + nx * half;
    const startY = ay + ny * half;
    const endX = bx - nx * half;
    const endY = by - ny * half;
    const len = Math.hypot(endX - startX, endY - startY);
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    return { startX, startY, endX, endY, len, angle: (Math.atan2(dy, dx) * 180) / Math.PI, midX, midY };
  };

  // ============ Module 3: CIDR overlap detector state ============
  const [networks, setNetworks] = useState<{ id: string; name: string; cidr: string }[]>([
    { id: "n1", name: "Production VPC", cidr: "10.0.0.0/16" },
    { id: "n2", name: "Dev VPC", cidr: "10.1.0.0/16" },
    { id: "n3", name: "Shared Services", cidr: "10.2.0.0/24" },
    { id: "n4", name: "Partner VPC", cidr: "10.0.1.0/24" },
    { id: "n5", name: "On-prem DC", cidr: "172.16.0.0/16" },
  ]);
  const [newNetName, setNewNetName] = useState("");
  const [newNetCidr, setNewNetCidr] = useState("10.3.0.0/24");
  const [netError, setNetError] = useState<string | null>(null);

  const networkInfos = useMemo(
    () => networks.map((n) => ({ ...n, info: parseCidr(n.cidr) })),
    [networks]
  );
  const overlapResults = useMemo(
    () => findOverlaps(networks.map((n) => ({ name: n.name, cidr: n.cidr }))),
    [networks]
  );

  const addNetwork = () => {
    if (!newNetName.trim()) {
      setNetError("Give the network a name before adding it.");
      return;
    }
    if (!parseCidr(newNetCidr)) {
      setNetError(`"${newNetCidr}" is not a valid IPv4 CIDR.`);
      return;
    }
    if (networks.some((n) => n.cidr === newNetCidr)) {
      setNetError(`A network with CIDR ${newNetCidr} already exists.`);
      return;
    }
    setNetworks((prev) => [...prev, { id: `n${Date.now().toString(36)}`, name: newNetName.trim(), cidr: newNetCidr }]);
    setNewNetName("");
    setNetError(null);
  };

  const removeNetwork = (id: string) => setNetworks((prev) => prev.filter((n) => n.id !== id));

  const syncFromTopology = () => {
    const synced = nodes
      .filter((n) => n.kind !== "tgw" && n.kind !== "dx" && n.cidr !== "-")
      .map((n, i) => ({ id: `sync${i}`, name: n.label, cidr: n.cidr }));
    setNetworks(synced);
    setNetError(null);
  };

  // ============ Module 4: VPN tunnel configurator state ============
  const [cgwIp, setCgwIp] = useState("203.0.113.10");
  const [bgpAsn, setBgpAsn] = useState("65000");
  const [onPremCidr, setOnPremCidr] = useState("172.16.0.0/16");
  const [vpnEnc, setVpnEnc] = useState<"AES128" | "AES256">("AES256");
  const [vpnIntegrity, setVpnIntegrity] = useState<"SHA1" | "SHA256">("SHA256");
  const [vpnDh, setVpnDh] = useState("14");
  const [vpnLifetime, setVpnLifetime] = useState("28800");
  const [ipsecLifetime, setIpsecLifetime] = useState("3600");
  const [psk, setPsk] = useState("TgM_D3m0_#2026_KeepMeSecret");
  const [dpd, setDpd] = useState(true);
  const [bgpEnabled, setBgpEnabled] = useState(true);
  const [activeTunnel, setActiveTunnel] = useState<"A" | "B">("A");
  const [tunnelInsideA, setTunnelInsideA] = useState("169.254.10.0/30");
  const [tunnelInsideB, setTunnelInsideB] = useState("169.254.11.0/30");

  const vpnConfigText = useMemo(() => {
    const awsSideA = "169.254.10.1";
    const cgwSideA = "169.254.10.2";
    const awsSideB = "169.254.11.1";
    const cgwSideB = "169.254.11.2";
    const pskObscured = psk.length > 8 ? `${psk.slice(0, 4)}…${psk.slice(-4)}` : "********";
    return `=== AWS Site-to-Site VPN · Generated Device Configuration ===
Customer Gateway (CGW)
  Public IP      : ${cgwIp}
  BGP ASN        : ${bgpAsn}
  On-prem CIDR   : ${onPremCidr}

Tunnel A (primary)
  Inside CIDR    : ${tunnelInsideA}
  AWS side IP    : ${awsSideA}
  CGW side IP    : ${cgwSideA}
  Phase 1 (IKE)  : ${vpnEnc}-${vpnIntegrity}, DH group ${vpnDh}, lifetime ${vpnLifetime}s
  Phase 2 (IPsec): ${vpnEnc}-${vpnIntegrity}, DH group ${vpnDh} (PFS), lifetime ${ipsecLifetime}s
  DPD            : ${dpd ? "enabled (restart)" : "disabled"}
  BGP over VPN   : ${bgpEnabled ? "enabled" : "disabled (static routes)"}
  PSK (demo only): ${pskObscured}

Tunnel B (redundant)
  Inside CIDR     : ${tunnelInsideB}
  AWS side IP    : ${awsSideB}
  CGW side IP    : ${cgwSideB}
  Same IKE/IPsec profile; independent endpoint (${cgwIp} secondary)

Route propagation: ${onPremCidr} → TGW route table via VPN attachment
Status           : Tunnel ${activeTunnel} ACTIVE · Tunnel ${activeTunnel === "A" ? "B" : "A"} STANDBY`;
  }, [cgwIp, bgpAsn, onPremCidr, vpnEnc, vpnIntegrity, vpnDh, vpnLifetime, ipsecLifetime, dpd, bgpEnabled, activeTunnel, tunnelInsideA, tunnelInsideB, psk]);

  // ============ Module 5: Route table viewer state ============
  const [rtKey, setRtKey] = useState<RtKey>("vpc-main");
  const [propagateOn, setPropagateOn] = useState<Record<RtKey, boolean>>({
    "vpc-main": true,
    tgw: true,
    "vpn-attach": true,
  });
  const [customRoutes, setCustomRoutes] = useState<{ id: string; table: RtKey; cidr: string; target: string }[]>([]);
  const [customCidr, setCustomCidr] = useState("192.168.5.0/24");
  const [customTarget, setCustomTarget] = useState("Transit Gateway Attach — vpc-prod");
  const [rtToast, setRtToast] = useState<string | null>(null);

  const rtRows = useMemo(() => {
    const table = RT_TABLES[rtKey];
    const rows: RouteRow[] = [...table.base];
    if (propagateOn[rtKey]) {
      rows.push(...table.propagated.map((r) => ({ ...r, id: `${r.id}-${rtKey}` })));
    }
    customRoutes
      .filter((c) => c.table === rtKey)
      .forEach((c, i) => rows.push({ id: `custom-${c.id}`, cidr: c.cidr, target: c.target, kind: "static" }));
    // mark blackhole: overlapping CIDRs with different targets
    const blackholed = new Set<string>();
    rows.forEach((r1, i) => {
      const a = parseCidr(r1.cidr);
      if (!a) return;
      rows.forEach((r2, j) => {
        if (i >= j) return;
        const b = parseCidr(r2.cidr);
        if (!b) return;
        if (a.first <= b.last && b.first <= a.last && r1.target !== r2.target) {
          blackholed.add(r1.id);
          blackholed.add(r2.id);
        }
      });
    });
    return rows.map((r) => ({ ...r, blackhole: blackholed.has(r.id) }));
  }, [rtKey, propagateOn, customRoutes]);

  const rtStats = useMemo(() => {
    const total = rtRows.length;
    const blackholes = rtRows.filter((r) => r.blackhole).length;
    const propagated = rtRows.filter((r) => r.kind === "propagated").length;
    const statics = rtRows.filter((r) => r.kind === "static").length;
    const local = rtRows.filter((r) => r.kind === "local").length;
    return { total, blackholes, propagated, statics, local };
  }, [rtRows]);

  const addCustomRoute = () => {
    const info = parseCidr(customCidr);
    if (!info) {
      setRtToast(`"${customCidr}" is not a valid IPv4 CIDR.`);
      return;
    }
    setCustomRoutes((prev) => [...prev, { id: `c${Date.now().toString(36)}`, table: rtKey, cidr: customCidr, target: customTarget }]);
    setRtToast(`Static route ${customCidr} → ${customTarget} added to ${RT_TABLES[rtKey].title}.`);
  };

  const removeCustomRoute = (id: string) => setCustomRoutes((prev) => prev.filter((c) => c.id !== id));

  // ============ Module 6: Direct Connect state ============
  const [dxMode, setDxMode] = useState<"dedicated" | "hosted">("dedicated");
  const [dxSpeedId, setDxSpeedId] = useState("10g");
  const [dxVif, setDxVif] = useState<"transit" | "private">("transit");
  const [dxRegion, setDxRegion] = useState("us-east-1");

  const dxSpeed = useMemo(
    () => DX_SPEEDS[dxMode].find((s) => s.id === dxSpeedId) ?? DX_SPEEDS[dxMode][1],
    [dxMode, dxSpeedId]
  );
  const dxRegionInfo = useMemo(
    () => DX_REGIONS.find((r) => r.id === dxRegion) ?? DX_REGIONS[0],
    [dxRegion]
  );
  const monthlyPort = useMemo(() => Math.round(dxSpeed.rateUsdHr * 24 * 30), [dxSpeed]);

  return (
    <div className="space-y-10">
      {/* ========================================================================= */}
      {/* MODULE 1: OVERVIEW — Transit Gateway & Hybrid Networking (#overview) */}
      {/* ========================================================================= */}
      <section
        id="overview"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 card-shadow shadow-xl space-y-8 hover:border-indigo-400/40 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono text-indigo-600 uppercase tracking-wider mb-1">
              Module 01 / Transit Gateway & Hybrid Networking
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              <span>🌐</span> AWS Transit Gateway & the Hybrid Network
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500">Gateway Type:</span>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold border bg-indigo-50 text-indigo-700 border-indigo-200">
              TGW · Route 53 · DX · VPN
            </span>
          </div>
        </div>

        <p className="text-sm text-slate-500 leading-relaxed">
          A <strong className="text-slate-900">Transit Gateway</strong> lets you connect VPCs, VPN tunnels, and
          Direct Connect virtual interfaces through one centrally-managed hub — replacing the{" "}
          <strong className="text-indigo-700">non-transitive</strong> mesh of VPC peering connections. This module
          builds a live multi-VPC topology, detects <strong className="text-blue-700">CIDR overlaps</strong>,
          configures redundant IPsec tunnels, inspects route tables, and maps the Direct Connect path into the cloud.
        </p>

        {/* Option cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: "🔗",
              title: "VPC Peering",
              color: "text-blue-600",
              tag: "1:1 pairing",
              best: "Two VPCs, simple needs",
              cons: "Non-transitive · no transitive routing",
            },
            {
              icon: "🧭",
              title: "Transit Gateway",
              color: "text-indigo-600",
              tag: "hub & spoke",
              best: "Many VPCs, cross-account, hybrid",
              cons: "Costs per attachment + GB processed",
            },
            {
              icon: "🔐",
              title: "VPN (IPsec)",
              color: "text-cyan-700",
              tag: "over the internet",
              best: "Quick hybrid link, encrypted",
              cons: "~100 Mbps per tunnel, internet-dependent",
            },
            {
              icon: "⚡",
              title: "Direct Connect",
              color: "text-emerald-600",
              tag: "private line",
              best: "Stable, low-latency, high-bandwidth",
              cons: "Weeks of physical provisioning",
            },
          ].map((c) => (
            <div key={c.title} className={`bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2`}>
              <div className="flex items-center justify-between">
                <span className="text-lg">{c.icon}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${c.color} border-current/30 bg-white`}>
                  {c.tag}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{c.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{c.best}</p>
              <p className={`text-[11px] font-mono ${c.color} leading-relaxed`}>{c.cons}</p>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden card-shadow">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
            <h4 className="text-xs font-mono font-bold text-slate-900">Feature Comparison — TGW vs Peering vs VPN vs Direct Connect</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-indigo-50 text-indigo-800 border-b border-slate-200">
                  <th className="px-4 py-2.5 font-bold">Capability</th>
                  <th className="px-4 py-2.5 font-bold">VPC Peering</th>
                  <th className="px-4 py-2.5 font-bold">Transit Gateway</th>
                  <th className="px-4 py-2.5 font-bold">Site‑to‑Site VPN</th>
                  <th className="px-4 py-2.5 font-bold">Direct Connect</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                {[
                  ["Transitive routing", "✗ no", "✓ central hub", "– per tunnel", "– per VIF"],
                  ["Cross-account / cross-region", "✓ accounts (peer role)", "✓ via Resource Access Manager, optional cross-region", "✓ to CGW anywhere", "✓ DX Gateway"],
                  ["Max scale (practical)", "125 peering conx / VPC", "hundreds of attachments", "~50 Mbps/Gbps tunneled", "1–100 Gbps ports"],
                  ["Latency", "low (direct VPC path)", "adds 1–2 ms hop", "internet fabric + ~30 ms", "single-digit ms private"],
                  ["Bandwidth", "up to ~1.4 Gbps / peer", "aggregated over SD-WAN 100 Gbps", "bandwidth of each tunnel", "up to 100 Gbps / 10 × VIFs"],
                  ["Cost model", "per GB for implicitly grouped", "$0.02/GW-hr per attachment + per-GB", "per-hour per-tunnel", "port-hour + $0.02/GB egress"],
                  ["Propagates routes", "no (manual route tables)", "✓ BGP-style propagation", "✓ BGP session per tunnel", "✓ BGP over VLAN (transit VIF)"],
                ].map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 text-slate-900 font-semibold">{row[0]}</td>
                    <td className="px-4 py-2.5">{row[1]}</td>
                    <td className="px-4 py-2.5">{row[2]}</td>
                    <td className="px-4 py-2.5">{row[3]}</td>
                    <td className="px-4 py-2.5">{row[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODULE 2: VPC TOPOLOGY BUILDER — drag-to-connect (#topology) */}
      {/* ========================================================================= */}
      <section
        id="topology"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 card-shadow shadow-xl space-y-6 hover:border-indigo-400/40 transition-colors"
      >
        <div className="border-b border-slate-200 pb-6">
          <div className="text-xs font-mono text-indigo-600 uppercase tracking-wider mb-1">
            Module 02 / VPC Topology Visualizer
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
            <span>🕸️</span> Drag-to-Connect Topology Builder
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed mt-3">
            Pick a connection type, then <strong className="text-indigo-700 font-mono">drag</strong> from a colored
            handle on one network to another to build peering, TGW, VPN and Direct Connect links. All nodes are
            draggable; overlapping CIDRs on linked networks are flagged in red.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Canvas */}
          <div className="lg:col-span-3">
            <div
              ref={canvasRef}
              className="relative rounded-xl border border-slate-200 bg-slate-50 overflow-hidden select-none touch-none"
              style={{ height: CANVAS_H }}
              onPointerMove={dragNodeId ? moveNodeDrag : moveConnecting}
              onPointerUp={() => {
                if (dragNodeId) endNodeDrag();
                else if (connecting) endConnecting();
              }}
              onPointerLeave={() => {
                if (dragNodeId) endNodeDrag();
                else if (connecting) endConnecting();
              }}
            >
              <div className="absolute inset-0 bg-dot-grid" />

              {/* connection lines */}
              {links.map((l) => {
                const g = linkGeometry(l);
                if (!g) return null;
                const meta = LINK_META[l.type];
                return (
                  <div key={l.id}>
                    <div
                      className={`absolute ${meta.stroke}`}
                      style={{
                        left: g.startX,
                        top: g.startY,
                        width: g.len,
                        height: 2,
                        transform: `rotate(${g.angle}deg)`,
                        transformOrigin: "0 50%",
                        borderRadius: 2,
                      }}
                    />
                    <div
                      className="absolute border rounded-full"
                      style={{ left: g.endX - 4, top: g.endY - 4, width: 8, height: 8, backgroundColor: meta.stroke, zIndex: 1 }}
                    />
                    <span
                      className={`absolute z-10 px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap border ${meta.chip}`}
                      style={{ left: g.midX, top: g.midY, transform: "translate(-50%, -50%)" }}
                    >
                      {meta.label}
                    </span>
                  </div>
                );
              })}

              {/* pending drag line */}
              {connecting &&
                (() => {
                  const from = nodeById.get(connecting.from);
                  if (!from) return null;
                  const ax = (from.x / 100) * canvasSize.w;
                  const ay = (from.y / 100) * canvasSize.h;
                  const bx = (connecting.x / 100) * canvasSize.w;
                  const by = (connecting.y / 100) * canvasSize.h;
                  const dx = bx - ax;
                  const dy = by - ay;
                  const dist = Math.hypot(dx, dy) || 1;
                  const half = Math.hypot(NODE_W, NODE_H) / 2 + 6;
                  const sx = ax + (dx / dist) * half;
                  const sy = ay + (dy / dist) * half;
                  const len = Math.hypot(bx - sx, by - sy);
                  const angle = (Math.atan2(by - sy, bx - sx) * 180) / Math.PI;
                  return (
                    <div className="absolute z-10 pointer-events-none">
                      <div
                        className="absolute border-t-2 border-dashed border-indigo-400"
                        style={{ left: sx, top: sy, width: len, transform: `rotate(${angle}deg)`, transformOrigin: "0 50%" }}
                      />
                      <div
                        className="absolute w-2 h-2 rounded-full bg-indigo-400"
                        style={{ left: bx - 4, top: by - 4 }}
                      />
                    </div>
                  );
                })()}

              {/* nodes */}
              {nodes.map((n) => {
                const style = NODE_STYLE[n.kind];
                const isDragging = dragNodeId === n.id;
                const conflict = linkConflicts.get(n.id);
                return (
                  <div
                    key={n.id}
                    data-node-id={n.id}
                    className="absolute"
                    style={{
                      left: `${n.x}%`,
                      top: `${n.y}%`,
                      width: NODE_W,
                      height: NODE_H,
                      transform: "translate(-50%, -50%)",
                      zIndex: 20,
                    }}
                    onPointerDown={startNodeDrag(n.id)}
                    onPointerMove={moveNodeDrag}
                    onPointerUp={(e) => {
                      if (dragNodeId === n.id) endNodeDrag();
                      else if (connecting) endConnecting(e);
                    }}
                  >
                    <div
                      className={`absolute inset-0 flex flex-col items-center justify-center rounded-xl border-2 shadow-lg cursor-grab transition-shadow ${
                        isDragging ? "shadow-xl ring-2 ring-indigo-300 cursor-grabbing" : ""
                      } ${style}`}
                      style={{ outline: conflict ? "2px solid #f43f5e" : "none" }}
                    >
                      <span className={`text-[10px] font-mono font-bold ${NODE_TEXT[n.kind]}`}>{n.label}</span>
                      <span className="text-[9px] font-mono text-white/70 mt-0.5">{n.cidr}</span>
                      {n.account === "cross" && (
                        <span className="absolute -top-2 right-1 text-[8px] font-mono px-1 rounded bg-amber-200 text-amber-800 border border-amber-300">
                          RAM-shared acct
                        </span>
                      )}
                    </div>
                    {/* connection handles */}
                    {[
                      { dx: 0, dy: -1, cls: "left-1/2 -top-2.5", label: "up" },
                      { dx: 0, dy: 1, cls: "left-1/2 -bottom-2.5", label: "down" },
                      { dx: 1, dy: 0, cls: "-right-2.5 top-1/2", label: "right" },
                      { dx: -1, dy: 0, cls: "-left-2.5 top-1/2", label: "left" },
                    ].map((h, i) => (
                      <div
                        key={i}
                        title={`drag to connect ${h.label}`}
                        className={`absolute ${h.cls} w-5 h-5 rounded-full border-2 bg-white z-30 cursor-crosshair ${
                          ["border-indigo-400", "border-blue-400", "border-cyan-400", "border-emerald-400"][i]
                        }`}
                        style={{ transform: "translate(-50%, -50%)" }}
                        onPointerDown={startConnecting(n.id)}
                        onPointerMove={moveConnecting}
                        onPointerUp={(e) => endConnecting(e)}
                      />
                    ))}
                  </div>
                );
              })}

              {/* legend */}
              <div className="absolute bottom-2 left-2 z-40 flex flex-wrap gap-2 px-2 py-1 rounded-lg bg-white/90 border border-slate-200 text-[10px] font-mono text-slate-600">
                {(Object.keys(LINK_META) as ConnectionType[]).map((t) => (
                  <span key={t} className="flex items-center gap-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${LINK_META[t].stroke}`} />
                    {LINK_META[t].label}
                  </span>
                ))}
              </div>
            </div>

            {linkConflicts.size > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-700">
                <strong className="font-mono">⚠ CIDR conflict:</strong>{" "}
                {Array.from(linkConflicts.values())[0]}
                <span className="text-rose-500/80"> — ambiguous routes will Blackhole until resolved.</span>
              </div>
            )}
            {canvasError && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-700 font-mono">
                {canvasError}
              </div>
            )}
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 card-shadow p-4 space-y-3">
              <h4 className="text-xs font-mono font-bold text-slate-900">Connection type</h4>
              <div className="space-y-2">
                {CONNECTION_TYPE_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setLinkType(o.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-mono transition-colors ${
                      linkType === o.id
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-lg"
                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                    }`}
                  >
                    <span className="block font-bold">{o.label}</span>
                    <span className={`block text-[10px] ${linkType === o.id ? "text-indigo-100" : "text-slate-400"}`}>
                      {o.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold text-slate-900">Links ({links.length})</h4>
                <button
                  onClick={() => setLinks(DEFAULT_LINKS)}
                  className="text-[10px] font-mono text-indigo-600 hover:underline"
                >
                  reset
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {links.map((l) => {
                  const a = nodeById.get(l.from)?.label;
                  const b = nodeById.get(l.to)?.label;
                  return (
                    <div key={l.id} className="flex items-center justify-between gap-2 text-[10px] font-mono bg-slate-50 border border-slate-200 rounded px-2 py-1.5">
                      <span className="truncate text-slate-600">
                        <span className={LINK_META[l.type].chip.split(" ")[0] + " px-1 rounded"}>{LINK_META[l.type].label}</span>{" "}
                        {a} ↔ {b}
                      </span>
                      <button
                        onClick={() => removeLink(l.id)}
                        className="text-rose-500 hover:text-rose-700 font-bold"
                        aria-label={`remove ${LINK_META[l.type].label}`}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
                {links.length === 0 && (
                  <p className="text-[10px] text-slate-400 font-mono">No connections yet — drag between handles.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <h4 className="text-xs font-mono font-bold text-slate-900">VPC CIDR assignments</h4>
              {nodes
                .filter((n) => n.kind !== "tgw" && n.kind !== "dx")
                .map((n) => (
                  <div key={n.id} className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-slate-500 truncate">{n.label}</span>
                    <select
                      value={n.cidr}
                      onChange={(e) => setNodeCidr(n.id, e.target.value)}
                      className="text-[10px] font-mono bg-white border border-slate-200 rounded px-1.5 py-1 text-slate-700 focus:border-indigo-400 focus:outline-none"
                    >
                      {CIDR_PRESETS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
                Overlapping CIDRs on networks that share a path (directly or via the hub) light up red on the canvas —
                the TGW would Blackhole those routes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODULE 3: CIDR OVERLAP DETECTOR (#cidr) */}
      {/* ========================================================================= */}
      <section
        id="cidr"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 card-shadow shadow-xl space-y-6 hover:border-blue-400/40 transition-colors"
      >
        <div className="border-b border-slate-200 pb-6">
          <div className="text-xs font-mono text-blue-600 uppercase tracking-wider mb-1">
            Module 03 / IP CIDR Overlap Detector
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
            <span>📐</span> Overlap & Collision Detector
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed mt-3">
            Networks that overlap cause <strong className="text-rose-600 font-mono">ambiguous-routing / Blackhole</strong>{" "}
            behavior in both VPC route tables and on-prem routers. Add your network plan and this tool computes the
            exact collision range for every pair.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* inputs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono font-bold text-slate-900">Network inventory</h4>
              <button
                onClick={syncFromTopology}
                className="text-[10px] font-mono text-blue-600 hover:underline"
              >
                ← import from topology
              </button>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {networkInfos.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                    n.info
                      ? n.info.first <= n.info.last
                        ? "border-slate-200 bg-slate-50"
                        : "border-rose-200 bg-rose-50"
                      : "border-rose-200 bg-rose-50"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-mono font-bold text-slate-900 truncate">{n.name}</div>
                    {n.info ? (
                      <div className="text-[10px] font-mono text-slate-500">
                        {n.cidr} · {ipToString(n.info.first)} – {ipToString(n.info.last)} · {n.info.usable.toLocaleString()} usable
                      </div>
                    ) : (
                      <div className="text-[10px] font-mono text-rose-500">INVALID CIDR: {n.cidr}</div>
                    )}
                  </div>
                  <button
                    onClick={() => removeNetwork(n.id)}
                    className="text-rose-400 hover:text-rose-600 font-bold text-xs"
                    aria-label={`remove ${n.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={newNetName}
                  onChange={(e) => setNewNetName(e.target.value)}
                  placeholder="Network name"
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:border-blue-400 focus:outline-none"
                />
                <input
                  value={newNetCidr}
                  onChange={(e) => setNewNetCidr(e.target.value)}
                  placeholder="10.3.0.0/24"
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:border-blue-400 focus:outline-none"
                />
              </div>
              <button
                onClick={addNetwork}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-mono font-bold transition-colors"
              >
                + Add network to plan
              </button>
              {netError && <p className="text-[10px] font-mono text-rose-600">{netError}</p>}
            </div>
          </div>

          {/* results */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono font-bold text-slate-900">
                Pairwise overlap results
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-[10px] border font-bold ${
                    overlapResults.length === 0
                      ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                      : "bg-rose-50 text-rose-600 border-rose-200"
                  }`}
                >
                  {overlapResults.length === 0 ? "✓ CLEAN" : `${overlapResults.length} COLLISION${overlapResults.length > 1 ? "S" : ""}`}
                </span>
              </h4>
            </div>

            {overlapResults.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {overlapResults.map((o, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border px-3 py-2.5 ${
                      o.kind === "containment" ? "border-amber-200 bg-amber-50" : "border-rose-200 bg-rose-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-slate-900">
                        {o.a} <span className="text-slate-400">with</span> {o.b}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                          o.kind === "containment"
                            ? "bg-amber-100 text-amber-700 border-amber-300"
                            : "bg-rose-100 text-rose-700 border-rose-300"
                        }`}
                      >
                        {o.kind === "containment" ? "CONTAINS" : "PARTIAL OVERLAP"}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-1">
                      {o.aCidr} ∩ {o.bCidr} → shared range <strong className="text-rose-600">{o.sharedRange}</strong>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {o.kind === "containment"
                        ? "One network is fully inside the other — the larger wins on longest-prefix-match."
                        : "Partially overlapping ranges — ambiguous routing unless one side is renumbered."}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs font-mono text-emerald-700">
                No overlapping CIDRs. Every pair of ranges is disjoint — routing will be unambiguous.
              </div>
            )}

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tools to renumber instead of colliding: supernet the shared range, or split with more specific
              prefixes so the longest-prefix-match decides deterministically.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODULE 4: VPN TUNNEL CONFIGURATOR (#vpn) */}
      {/* ========================================================================= */}
      <section
        id="vpn"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 card-shadow shadow-xl space-y-6 hover:border-indigo-400/40 transition-colors"
      >
        <div className="border-b border-slate-200 pb-6">
          <div className="text-xs font-mono text-indigo-600 uppercase tracking-wider mb-1">
            Module 04 / Site-to-Site VPN Tunnel Configurator
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
            <span>🔐</span> AWS Site-to-Site VPN Builder
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed mt-3">
            Generate a production-shaped dual-tunnel VPN (tunnel A + tunnel B) with IKE/IPSec phase settings and
            optional BGP failover. Wrong crypto values produce a classic "<strong className="text-rose-600 font-mono">Phase 1 mismatch</strong>" —
            so build carefully.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* CGW */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <h4 className="text-xs font-mono font-bold text-slate-900 border-b border-slate-200 pb-2">
                Customer Gateway (on-prem side)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block mb-1">CGW public IP</label>
                  <input
                    value={cgwIp}
                    onChange={(e) => setCgwIp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:border-indigo-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block mb-1">BGP ASN (CGW)</label>
                  <input
                    value={bgpAsn}
                    onChange={(e) => setBgpAsn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 block mb-1">On-premises CIDR (advertised)</label>
                <input
                  value={onPremCidr}
                  onChange={(e) => setOnPremCidr(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:border-indigo-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Crypto */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <h4 className="text-xs font-mono font-bold text-slate-900 border-b border-slate-200 pb-2">
                IKE & IPsec policies (both tunnels inherit)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block mb-1">Phase 1 encryption</label>
                  <select
                    value={vpnEnc}
                    onChange={(e) => setVpnEnc(e.target.value as "AES128" | "AES256")}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="AES128">AES-128-CBC</option>
                    <option value="AES256">AES-256-CBC</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block mb-1">Integrity</label>
                  <select
                    value={vpnIntegrity}
                    onChange={(e) => setVpnIntegrity(e.target.value as "SHA1" | "SHA256")}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="SHA1">SHA-1 (weaker)</option>
                    <option value="SHA256">SHA-256</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block mb-1">DH group</label>
                  <select
                    value={vpnDh}
                    onChange={(e) => setVpnDh(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="2">DH 2 (1024-bit, legacy)</option>
                    <option value="14">DH 14 (2048-bit, default)</option>
                    <option value="19">DH 19 (256-bit ECP)</option>
                    <option value="21">DH 21 (521-bit ECP)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block mb-1">Phase 1 lifetime (sec)</label>
                  <input
                    value={vpnLifetime}
                    onChange={(e) => setVpnLifetime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-xs font-mono text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={dpd} onChange={(e) => setDpd(e.target.checked)} className="accent-indigo-600" />
                  Dead Peer Detection (20s)
                </label>
                <label className="flex items-center gap-2 text-xs font-mono text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={bgpEnabled} onChange={(e) => setBgpEnabled(e.target.checked)} className="accent-indigo-600" />
                  BGP over VPN
                </label>
              </div>
            </div>

            {/* Tunnels */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <h4 className="text-xs font-mono font-bold text-slate-900 border-b border-slate-200 pb-2">
                Tunnel endpoints
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block mb-1">Tunnel A inside CIDR</label>
                  <input
                    value={tunnelInsideA}
                    onChange={(e) => setTunnelInsideA(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:border-indigo-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block mb-1">Tunnel B inside CIDR</label>
                  <input
                    value={tunnelInsideB}
                    onChange={(e) => setTunnelInsideB(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              </div>
              {/* active / standby */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] font-mono text-slate-500">Active path:</span>
                {(["A", "B"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTunnel(t)}
                    className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold border transition-colors ${
                      activeTunnel === t
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-500 border-slate-200"
                    }`}
                  >
                    Tunnel {t}
                  </button>
                ))}
                <span className="text-[10px] font-mono text-slate-400 ml-auto">
                  failover demo — routes flip on failure
                </span>
              </div>
            </div>
          </div>

          {/* Output */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 card-shadow overflow-hidden">
              <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-200 font-bold">Generated VPN summary</span>
                <span className="text-[10px] font-mono text-slate-400">demo-only, no real secrets</span>
              </div>
              <pre className="p-4 text-[11px] leading-relaxed font-mono text-indigo-200 bg-slate-900 overflow-x-auto max-h-[420px]">
                {vpnConfigText}
              </pre>
            </div>

            {/* tunnel health cards */}
            <div className="grid grid-cols-2 gap-3">
              {(["A", "B"] as const).map((t) => (
                <div
                  key={t}
                  className={`rounded-xl border p-3 space-y-1.5 ${
                    activeTunnel === t
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-900">Tunnel {t}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                        activeTunnel === t
                          ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {activeTunnel === t ? "ACTIVE" : "STANDBY"}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    {t === "A" ? tunnelInsideA : tunnelInsideB} · {t === "A" ? "169.254.10.2" : "169.254.11.2"} peer
                  </div>
                  {bgpEnabled && (
                    <div className="text-[10px] font-mono text-slate-400">
                      BGP AS {bgpAsn} ↔ 64512 · {t === "A" ? "primary" : "backup"} peer
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              AWS terminates the tunnel on two endpoints for HA. BGP (multi-VPN) detects the down path and rewrites
              routes within seconds — avoid pure static routing for production.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODULE 5: ROUTE TABLE VIEWER (#routes) */}
      {/* ========================================================================= */}
      <section
        id="routes"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 card-shadow shadow-xl space-y-6 hover:border-blue-400/40 transition-colors"
      >
        <div className="border-b border-slate-200 pb-6">
          <div className="text-xs font-mono text-blue-600 uppercase tracking-wider mb-1">
            Module 05 / Route Table Viewer
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
            <span>🧭</span> Route Table & Propagation Viewer
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed mt-3">
            Inspect how routes flow through VPC main tables, the TGW hub, and VPN attachments. Toggle propagation
            and add static routes — conflicting prefixes with mismatched targets turn <span className="text-rose-600 font-mono">BLACKHOLE</span>.
          </p>
        </div>

        {/* table tabs */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(RT_TABLES) as RtKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setRtKey(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                rtKey === k
                  ? "bg-indigo-600 text-white border-indigo-600 shadow"
                  : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
              }`}
            >
              {RT_TABLES[k].title}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* route rows */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 font-mono">{RT_TABLES[rtKey].title}</h4>
                <p className="text-[11px] font-mono text-slate-400">
                  {RT_TABLES[rtKey].scope} · region {RT_TABLES[rtKey].region}
                </p>
              </div>
              {/* propagation toggle */}
              <label className="flex items-center gap-2 text-[10px] font-mono text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={propagateOn[rtKey]}
                  onChange={(e) => setPropagateOn((p) => ({ ...p, [rtKey]: e.target.checked }))}
                  className="accent-indigo-600"
                />
                Propagate attachments
              </label>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">{RT_TABLES[rtKey].desc}</p>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 font-bold">Destination</th>
                    <th className="px-3 py-2 font-bold">Target</th>
                    <th className="px-3 py-2 font-bold">Type</th>
                    <th className="px-3 py-2 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600 divide-y divide-slate-100">
                  {rtRows.map((r) => (
                    <tr key={r.id} className={r.blackhole ? "bg-rose-50" : "hover:bg-slate-50/60"}>
                      <td className="px-3 py-2 text-slate-900">{r.cidr}</td>
                      <td className="px-3 py-2">{r.target}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] border font-bold ${
                            r.kind === "local"
                              ? "bg-slate-100 text-slate-500 border-slate-200"
                              : r.kind === "propagated"
                              ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                              : "bg-blue-50 text-blue-600 border-blue-200"
                          }`}
                        >
                          {r.kind.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] border font-bold ${
                            r.blackhole
                              ? "bg-rose-100 text-rose-700 border-rose-300"
                              : "bg-emerald-50 text-emerald-600 border-emerald-200"
                          }`}
                        >
                          {r.blackhole ? "BLACKHOLE" : "ACTIVE"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {rtRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                        No routes — enable propagation or add a static route.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {rtRows.some((r) => r.blackhole) && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-[11px] font-mono text-rose-700">
                ⚑ BLACKHOLE: overlapping prefixes with different targets cause the route to drop packets until the
                duplicate is removed (longest-prefix-match cannot pick a winner).
              </div>
            )}
          </div>

          {/* controls */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-4 space-y-2">
              <h4 className="text-xs font-mono font-bold text-slate-900">Add static route (this table)</h4>
              <input
                value={customCidr}
                onChange={(e) => setCustomCidr(e.target.value)}
                placeholder="10.99.0.0/24"
                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:border-blue-400 focus:outline-none"
              />
              <select
                value={customTarget}
                onChange={(e) => setCustomTarget(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:border-blue-400 focus:outline-none"
              >
                <option>Transit Gateway Attach — vpc-prod</option>
                <option>Transit Gateway Attach — vpc-dev</option>
                <option>VPN Attachment</option>
                <option>Direct Connect Attachment</option>
                <option>Blackhole (drop)</option>
              </select>
              <button
                onClick={addCustomRoute}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-mono font-bold transition-colors"
              >
                + Add static route
              </button>
              {rtToast && <p className="text-[10px] font-mono text-blue-700">{rtToast}</p>}
            </div>

            {customRoutes.length > 0 && (
              <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                <h4 className="text-xs font-mono font-bold text-slate-900">Your static routes</h4>
                {customRoutes.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 text-[10px] font-mono bg-slate-50 border border-slate-200 rounded px-2 py-1.5">
                    <span className="truncate text-slate-600">
                      {c.cidr} → {c.target}
                      <span className="text-slate-400"> · {RT_TABLES[c.table].title}</span>
                    </span>
                    <button onClick={() => removeCustomRoute(c.id)} className="text-rose-500 hover:text-rose-700 font-bold">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 p-4 space-y-2">
              <h4 className="text-xs font-mono font-bold text-slate-900">Table stats</h4>
              <div className="grid grid-cols-2 gap-2 text-center">
                {[
                  ["Routes", rtStats.total],
                  ["Active", rtStats.total - rtStats.blackholes],
                  ["Propagated", rtStats.propagated],
                  ["Blackhole", rtStats.blackholes],
                ].map(([label, val]) => (
                  <div key={label as string} className="rounded-lg bg-slate-50 border border-slate-200 py-2">
                    <div className="text-lg font-extrabold text-slate-900">{val}</div>
                    <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">{label}</div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
                TGW route tables also learn <strong className="text-slate-600">cross-account</strong> prefixes from
                RAM-shared attachments — the partner VPC route above is one example.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 space-y-1.5 text-[11px] font-mono text-slate-500">
              <div className="font-bold text-slate-700">Longest-prefix-match rules</div>
              <div>More specific wins: /24 beats /16 for the same destination.</div>
              <div>Equal prefix + different target → BLACKHOLE.</div>
              <div>Local route always outranks TGW for the VPC's own CIDR.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODULE 6: DIRECT CONNECT DIAGRAM (#directconnect) */}
      {/* ========================================================================= */}
      <section
        id="directconnect"
        className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 card-shadow shadow-xl space-y-6 hover:border-indigo-400/40 transition-colors"
      >
        <div className="border-b border-slate-200 pb-6">
          <div className="text-xs font-mono text-indigo-600 uppercase tracking-wider mb-1">
            Module 06 / Direct Connect Integration
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
            <span>⚡</span> Direct Connect Network Diagram
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed mt-3">
            A dedicated private path bypasses the internet on the way into AWS. Configure the port, the virtual
            interface (VIF), and watch the BGP session light up.
          </p>
        </div>

        {/* controls */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-xl border border-slate-200 p-4">
          <div>
            <label className="text-[10px] font-mono text-slate-500 block mb-1">Connection type</label>
            <div className="flex gap-1">
              {(["dedicated", "hosted"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setDxMode(m);
                    setDxSpeedId(m === "dedicated" ? "10g" : "1g");
                  }}
                  className={`flex-1 px-2 py-1.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                    dxMode === m ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200"
                  }`}
                >
                  {m === "dedicated" ? "Dedicated" : "Hosted"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono text-slate-500 block mb-1">Port speed</label>
            <select
              value={dxSpeedId}
              onChange={(e) => setDxSpeedId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:border-indigo-400 focus:outline-none"
            >
              {DX_SPEEDS[dxMode].map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-mono text-slate-500 block mb-1">Virtual interface</label>
            <select
              value={dxVif}
              onChange={(e) => setDxVif(e.target.value as "transit" | "private")}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:border-indigo-400 focus:outline-none"
            >
              <option value="transit">Transit VIF → TGW</option>
              <option value="private">Private VIF → VGW</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-mono text-slate-500 block mb-1">AWS region / DX location</label>
            <select
              value={dxRegion}
              onChange={(e) => setDxRegion(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:border-indigo-400 focus:outline-none"
            >
              {DX_REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* diagram */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 overflow-x-auto">
          <div className="flex items-stretch gap-2 min-w-max">
            {[
              {
                title: "On-premises",
                sub: "Customer router · AS 65000",
                detail: "BGP peer · VLAN 1523",
                color: "border-slate-300 bg-white",
                accent: "text-slate-700",
              },
              {
                title: "DX Location",
                sub: "Colocation cage + cross-connect",
                detail: `POP: ${dxRegionInfo.pop}`,
                color: "border-amber-300 bg-amber-50",
                accent: "text-amber-700",
              },
              {
                title: "AWS DX Network",
                sub: `Virtual interface · ${dxVif === "transit" ? "Transit" : "Private"} VIF`,
                detail: dxVif === "transit" ? "VLAN 1144 · transit VIF" : "VLAN 1104 · private VIF",
                color: "border-indigo-300 bg-indigo-50",
                accent: "text-indigo-700",
              },
              {
                title: dxVif === "transit" ? "Transit Gateway" : "Virtual Private GW",
                sub: dxVif === "transit" ? "tgw-0f2a1b9c" : "vgw-0f1e2d3c",
                detail: dxVif === "transit" ? "Attach: prod/partner" : "Attach: prod VPC",
                color: "border-blue-300 bg-blue-50",
                accent: "text-blue-700",
              },
              {
                title: "VPC attachments",
                sub: dxVif === "transit" ? "prod · dev · shared" : "prod",
                detail: "BGP: 10.0.0.0/16 + 10.0.1.0/24",
                color: "border-slate-300 bg-white",
                accent: "text-slate-700",
              },
            ].map((step, i, arr) => (
              <div key={step.title} className="flex items-center gap-2">
                <div className={`rounded-xl border-2 ${step.color} p-4 w-44 h-32 flex flex-col justify-center text-center`}>
                  <div className={`text-xs font-mono font-bold ${step.accent}`}>{step.title}</div>
                  <div className="text-[10px] font-mono text-slate-500 mt-1">{step.sub}</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1">{step.detail}</div>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex flex-col items-center text-indigo-400">
                    <span className="text-lg leading-none">→</span>
                    <span className="text-[9px] font-mono mt-1">BGP</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-lg font-extrabold text-slate-900 font-mono">{dxSpeed.label}</div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mt-1">Port</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-lg font-extrabold text-slate-900 font-mono">~${monthlyPort.toLocaleString()}/mo</div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mt-1">Port charge (approx, {dxSpeed.rateUsdHr}/hr)</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-lg font-extrabold text-slate-900 font-mono">{dxRegionInfo.latencyMs} ms</div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mt-1">P95 latency to {dxRegionInfo.id}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-lg font-extrabold text-slate-900 font-mono">{dxVif === "transit" ? "TGW" : "VGW"}</div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mt-1">
              {dxVif === "transit" ? "Transit VIF (up to 100 Gbps)" : "Private VIF (up to 10 Gbps)"}
            </div>
          </div>
        </div>

        {/* BGP session detail */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-900">BGP session (Internet-facing side of the VIF)</span>
            <span className="text-[10px] font-mono text-emerald-600">ESTABLISHED</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            <div className="p-4 space-y-1.5 text-xs font-mono">
              <div><span className="text-slate-400">Peer:</span> <span className="text-slate-800">169.254.4.1 (AWS)</span></div>
              <div><span className="text-slate-400">Local ASN:</span> <span className="text-slate-800">65000</span></div>
              <div><span className="text-slate-400">Advertised:</span> <span className="text-blue-700">172.16.0.0/16 (on-prem)</span></div>
              <div><span className="text-slate-400">Learned:</span> <span className="text-indigo-700">10.0.0.0/16, 10.1.0.0/16, 10.2.0.0/16</span></div>
            </div>
            <div className="p-4 space-y-2.5 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-base leading-none">🔒</span>
                <p className="text-slate-500 leading-relaxed text-[11px]">
                  AWS recommends <strong className="text-slate-800">MACsec</strong> on dedicated connections for
                  link-layer encryption, and always transport the VIF over a VPN or private network when regulatory
                  requirements demand it — DX itself is not encrypted at L2 by default.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-base leading-none">🔄</span>
                <p className="text-slate-500 leading-relaxed text-[11px]">
                  For mission-critical, keep a second DX connection at a different location — BGP multipath + failover
                  keeps the route table healthy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}