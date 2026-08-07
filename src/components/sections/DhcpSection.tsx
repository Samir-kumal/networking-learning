"use client";

import { useState } from "react";

interface DoraStep {
  id: number;
  code: string;
  name: string;
  sender: string;
  receiver: string;
  srcIp: string;
  dstIp: string;
  srcMac: string;
  dstMac: string;
  srcPort: number;
  dstPort: number;
  castType: "Broadcast" | "Unicast";
  color: string;
  badgeBg: string;
  badgeText: string;
  summary: string;
  options: { key: string; value: string; desc: string }[];
  details: string;
}

interface DhcpOption {
  id: number;
  name: string;
  category: "Core Networking" | "Identification" | "PXE & Boot" | "Advanced Routing";
  hexCode: string;
  length: string;
  sampleValue: string;
  description: string;
  enterpriseUseCase: string;
  rfc: string;
}

export default function DhcpSection() {
  // ---------------------------------------------------------------------------
  // State 1: DORA Handshake
  // ---------------------------------------------------------------------------
  const [activeDoraStep, setActiveDoraStep] = useState<number>(1);

  const doraSteps: DoraStep[] = [
    {
      id: 1,
      code: "D",
      name: "DHCP DISCOVER",
      sender: "Client Workstation",
      receiver: "DHCP Server / Broadcast",
      srcIp: "0.0.0.0",
      dstIp: "255.255.255.255",
      srcMac: "00:1A:2B:3C:4D:5E",
      dstMac: "FF:FF:FF:FF:FF:FF",
      srcPort: 68,
      dstPort: 67,
      castType: "Broadcast",
      color: "#58a6ff",
      badgeBg: "bg-[#58a6ff]/10",
      badgeText: "text-[#58a6ff]",
      summary: "Client broadcasts onto the local LAN seeking any available DHCP server.",
      options: [
        { key: "Option 53", value: "DHCP Message Type = Discover (1)", desc: "Identifies the packet type" },
        { key: "Option 55", value: "Parameter Request List (1, 3, 6, 15, 121)", desc: "Options client is asking for" },
        { key: "Option 61", value: "Client Identifier (MAC)", desc: "Unique hardware identity" },
        { key: "Option 12", value: "Host Name = 'MacBook-Pro'", desc: "Client hostname declaration" },
      ],
      details:
        "When an unconfigured device connects to a network, it has no IP address. It sends a Layer 3 UDP broadcast to 255.255.255.255 on port 67. Since the client has no IP yet, its source IP is 0.0.0.0 and UDP source port is 68.",
    },
    {
      id: 2,
      code: "O",
      name: "DHCP OFFER",
      sender: "DHCP Server (192.168.10.1)",
      receiver: "Client Workstation",
      srcIp: "192.168.10.1",
      dstIp: "192.168.10.50 (or 255.255.255.255)",
      srcMac: "00:00:0C:9F:F0:01",
      dstMac: "00:1A:2B:3C:4D:5E (or FF:FF:FF:...)",
      srcPort: 67,
      dstPort: 68,
      castType: "Unicast",
      color: "#7ee787",
      badgeBg: "bg-[#7ee787]/10",
      badgeText: "text-[#7ee787]",
      summary: "DHCP Server reserves an available IP and offers it to the client with parameters.",
      options: [
        { key: "yiaddr", value: "Your (Client) IP = 192.168.10.50", desc: "The proposed IP allocation" },
        { key: "Option 53", value: "DHCP Message Type = Offer (2)", desc: "Message type indicator" },
        { key: "Option 1", value: "Subnet Mask = 255.255.255.0", desc: "Network mask (/24)" },
        { key: "Option 3", value: "Router = 192.168.10.1", desc: "Default gateway address" },
        { key: "Option 6", value: "DNS Servers = 1.1.1.1, 8.8.8.8", desc: "Domain name servers" },
        { key: "Option 51", value: "Lease Time = 86400s (24 Hours)", desc: "Duration of IP lease" },
        { key: "Option 54", value: "Server Identifier = 192.168.10.1", desc: "IP of offering server" },
      ],
      details:
        "The DHCP server intercepts the Discover broadcast, checks its address pool for an unallocated IP (or existing static reservation), temporarily places a ping probe check to prevent conflict, and sends back a DHCP OFFER with network parameters.",
    },
    {
      id: 3,
      code: "R",
      name: "DHCP REQUEST",
      sender: "Client Workstation",
      receiver: "Broadcast / DHCP Server",
      srcIp: "0.0.0.0",
      dstIp: "255.255.255.255",
      srcMac: "00:1A:2B:3C:4D:5E",
      dstMac: "FF:FF:FF:FF:FF:FF",
      srcPort: 68,
      dstPort: 67,
      castType: "Broadcast",
      color: "#ffa657",
      badgeBg: "bg-[#ffa657]/10",
      badgeText: "text-[#ffa657]",
      summary: "Client accepts the offer by broadcasting a Request specifying chosen Server ID.",
      options: [
        { key: "Option 53", value: "DHCP Message Type = Request (3)", desc: "Formal lease request" },
        { key: "Option 50", value: "Requested IP = 192.168.10.50", desc: "IP accepted by client" },
        { key: "Option 54", value: "Server Identifier = 192.168.10.1", desc: "Explicitly notifies chosen server" },
      ],
      details:
        "Why broadcast? If multiple DHCP servers sent OFFER packets, broadcasting Option 54 (Server Identifier) informs the chosen server that its offer is accepted, while implicitly notifying other servers to release their reserved offers back into their available pools.",
    },
    {
      id: 4,
      code: "A",
      name: "DHCP ACKNOWLEDGE (ACK)",
      sender: "DHCP Server (192.168.10.1)",
      receiver: "Client Workstation",
      srcIp: "192.168.10.1",
      dstIp: "192.168.10.50 (or Broadcast)",
      srcMac: "00:00:0C:9F:F0:01",
      dstMac: "00:1A:2B:3C:4D:5E",
      srcPort: 67,
      dstPort: 68,
      castType: "Unicast",
      color: "#bc8cff",
      badgeBg: "bg-[#bc8cff]/10",
      badgeText: "text-[#bc8cff]",
      summary: "Server commits the lease to database and sends final confirmation to client.",
      options: [
        { key: "Option 53", value: "DHCP Message Type = ACK (5)", desc: "Final binding acknowledgment" },
        { key: "Option 51", value: "Lease Time = 86400s (24 Hours)", desc: "Confirmed lease duration" },
        { key: "Option 58", value: "T1 Renewal Time = 43200s (50%)", desc: "Time client starts unicast renewal" },
        { key: "Option 59", value: "T2 Rebinding Time = 75600s (87.5%)", desc: "Time client broadcasts rebinding" },
      ],
      details:
        "The DHCP server receives the Request, commits the binding (MAC ↔ IP) into its IPAM lease database, and sends an ACK packet. Upon receiving ACK, the client performs Gratuitous ARP (GARP) to ensure no IP collision, then binds 192.168.10.50 to its network interface.",
    },
  ];

  const currentDora = doraSteps[activeDoraStep - 1];

  // ---------------------------------------------------------------------------
  // State 2: Relay Agent (`ip helper-address`)
  // ---------------------------------------------------------------------------
  const [relayMode, setRelayMode] = useState<"with_relay" | "without_relay">("with_relay");
  const [copiedConfig, setCopiedConfig] = useState<boolean>(false);

  const ciscoRelayConfig = `! Cisco IOS DHCP Relay Agent Configuration
! 1. Enter Gateway Subnet Interface (VLAN 10)
interface GigabitEthernet0/0.10
 description LAN-VLAN10-GATEWAY
 ip address 192.168.10.1 255.255.255.0

! 2. Configure Primary & Secondary DHCP Server Relays
! Helper-address converts L2/L3 Broadcasts into Unicast to target IP
 ip helper-address 10.0.0.100
 ip helper-address 10.0.0.101

! 3. (Optional) Fine-tune Relay Security & Option 82 Insertion
 ip dhcp relay information option
 ip dhcp relay information trust-all`;

  const copyCode = () => {
    navigator.clipboard.writeText(ciscoRelayConfig);
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  // ---------------------------------------------------------------------------
  // State 3: Essential DHCP Options
  // ---------------------------------------------------------------------------
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const dhcpOptions: DhcpOption[] = [
    {
      id: 1,
      name: "Subnet Mask",
      category: "Core Networking",
      hexCode: "0x01",
      length: "4 bytes",
      sampleValue: "255.255.255.0",
      description: "Specifies the subnet mask of the client's subnet according to dotted decimal notation.",
      enterpriseUseCase: "Defines network vs host portion boundary for routing decisions.",
      rfc: "RFC 2132 Section 3.3",
    },
    {
      id: 3,
      name: "Router (Default Gateway)",
      category: "Core Networking",
      hexCode: "0x03",
      length: "4 * n bytes",
      sampleValue: "192.168.10.1",
      description: "List of IP addresses for routers on the client's subnet. Must be listed in preference order.",
      enterpriseUseCase: "Allows hosts to route traffic destined for external networks and the Internet.",
      rfc: "RFC 2132 Section 3.5",
    },
    {
      id: 6,
      name: "Domain Name Server (DNS)",
      category: "Core Networking",
      hexCode: "0x06",
      length: "4 * n bytes",
      sampleValue: "10.0.0.10, 1.1.1.1",
      description: "List of DNS recursive name servers available to the client.",
      enterpriseUseCase: "Directs client domain name lookups to internal Active Directory DNS and public fallbacks.",
      rfc: "RFC 2132 Section 3.8",
    },
    {
      id: 12,
      name: "Host Name",
      category: "Identification",
      hexCode: "0x0C",
      length: "Variable",
      sampleValue: "'FINANCE-PC-042'",
      description: "Specifies the name of the client host, often populated automatically into Dynamic DNS (DDNS).",
      enterpriseUseCase: "Enables corporate DNS servers to auto-register hostnames for internal resolution.",
      rfc: "RFC 2132 Section 3.14",
    },
    {
      id: 15,
      name: "Domain Name",
      category: "Identification",
      hexCode: "0x0F",
      length: "Variable",
      sampleValue: "'corp.internal.example.com'",
      description: "Specifies the domain name that client should use when resolving unqualified hostnames.",
      enterpriseUseCase: "Allows staff to type 'server01' and automatically expand to 'server01.corp.internal'.",
      rfc: "RFC 2132 Section 3.17",
    },
    {
      id: 66,
      name: "TFTP Server Name (PXE)",
      category: "PXE & Boot",
      hexCode: "0x42",
      length: "Variable",
      sampleValue: "'10.0.0.50' / 'tftp.corp.net'",
      description: "Identifies TFTP boot server used for PXE network operating system deployment.",
      enterpriseUseCase: "Used by WDS / SCCM / iPXE to automate OS installation over bare-metal network boot.",
      rfc: "RFC 2132 Section 9.4",
    },
    {
      id: 67,
      name: "Bootfile Name (PXE)",
      category: "PXE & Boot",
      hexCode: "0x43",
      length: "Variable",
      sampleValue: "'pxelinux.0' / 'boot\\x64\\wdsmgfw.efi'",
      description: "Specifies the executable filename location on the TFTP server to initiate PXE boot.",
      enterpriseUseCase: "Instructs UEFI / BIOS firmware which NBP (Network Boot Program) binary to load.",
      rfc: "RFC 2132 Section 9.5",
    },
    {
      id: 121,
      name: "Classless Static Routes",
      category: "Advanced Routing",
      hexCode: "0x79",
      length: "Variable",
      sampleValue: "Dst: 10.50.0.0/16 -> Gateway: 192.168.10.254",
      description: "Injects specific static routing table entries directly into client operating systems.",
      enterpriseUseCase: "Directs internal VPN / MPLS traffic to dedicated security gateways without overriding default Internet gateway.",
      rfc: "RFC 3442",
    },
  ];

  const filteredOptions =
    selectedCategory === "All"
      ? dhcpOptions
      : dhcpOptions.filter((opt) => opt.category === selectedCategory);

  // ---------------------------------------------------------------------------
  // State 4: Enterprise IPAM & Pool Exhaustion Calculator
  // ---------------------------------------------------------------------------
  const [cidrPrefix, setCidrPrefix] = useState<number>(24);
  const [reservedCount, setReservedCount] = useState<number>(30);
  const [activeLeases, setActiveLeases] = useState<number>(180);
  const [dailyChurn, setDailyChurn] = useState<number>(45);
  const [leaseDurationHours, setLeaseDurationHours] = useState<number>(24);

  // Calculations
  const totalSubnetIps = Math.pow(2, 32 - cidrPrefix);
  const usableTotalIps = Math.max(0, totalSubnetIps - 2); // Network & Broadcast
  const usablePoolSize = Math.max(0, usableTotalIps - reservedCount);
  const freeIps = Math.max(0, usablePoolSize - activeLeases);
  const utilizationPct = usablePoolSize > 0 ? Math.min(100, (activeLeases / usablePoolSize) * 100) : 100;

  // Exhaustion time estimate (hours until pool depletion if churn continues without leases expiring)
  const churnPerHour = dailyChurn / 24;
  const hoursUntilExhaustion =
    churnPerHour > 0 && freeIps > 0 ? Math.round((freeIps / churnPerHour) * 10) / 10 : 0;

  // Status Badge
  let riskStatus: { label: string; color: string; bg: string; text: string; message: string } = {
    label: "HEALTHY",
    color: "#7ee787",
    bg: "bg-[#7ee787]/10 border-[#7ee787]/30",
    text: "text-[#7ee787]",
    message: "Address pool has sufficient headroom. Current lease duration and subnet size are well balanced.",
  };

  if (utilizationPct >= 90 || activeLeases > usablePoolSize) {
    riskStatus = {
      label: "CRITICAL EXHAUSTION",
      color: "#ff7b72",
      bg: "bg-[#ff7b72]/15 border-[#ff7b72]/40",
      text: "text-[#ff7b72]",
      message: "ALERT: Pool is nearly exhausted! New devices will fail DHCP binding (APIPA 169.254.x.x fallback). Immediate mitigation required.",
    };
  } else if (utilizationPct >= 75) {
    riskStatus = {
      label: "HIGH UTILIZATION WARNING",
      color: "#ffa657",
      bg: "bg-[#ffa657]/15 border-[#ffa657]/40",
      text: "text-[#ffa657]",
      message: "WARNING: High pool usage. High churn during peak hours may trigger address depletion.",
    };
  }

  return (
    <section
      id="dhcp"
      className="scroll-mt-24 rounded-2xl bg-[#161b22] border border-[#30363d] p-6 sm:p-8 transition-colors hover:border-[#58a6ff]/40 space-y-10"
    >
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="px-2.5 py-1 rounded-md bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20 text-xs font-mono font-semibold">
            #dhcp-ipam
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#e6edf3]">
            19. DHCP & IP Address Management (IPAM)
          </h2>
        </div>
        <p className="text-[#8b949e] text-base leading-relaxed max-w-4xl">
          Dynamic Host Configuration Protocol (DHCP) automates IPv4/IPv6 allocation across local networks.
          Explore the step-by-step DORA handshake, Layer 3 relay agent forwarding across subnets, core DHCP options, and enterprise IPAM pool sizing.
        </p>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 1. DORA HANDSHAKE FLOW */}
      {/* -------------------------------------------------------------------- */}
      <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#30363d] pb-4">
          <div>
            <span className="text-xs uppercase font-mono tracking-wider text-[#58a6ff]">Interactive Protocol Flow</span>
            <h3 className="text-xl font-bold text-[#e6edf3] flex items-center gap-2">
              <span>The 4-Step DORA Handshake</span>
            </h3>
          </div>
          <div className="text-xs text-[#8b949e] font-mono">
            UDP Ports: Server <span className="text-[#7ee787]">67</span> | Client <span className="text-[#58a6ff]">68</span>
          </div>
        </div>

        {/* Step Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {doraSteps.map((step) => {
            const isActive = activeDoraStep === step.id;
            return (
              <button
                key={step.id}
                onClick={() => setActiveDoraStep(step.id)}
                className={`flex flex-col p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#1c2333] border-[#58a6ff] shadow-md shadow-[#58a6ff]/10 scale-[1.02]"
                    : "bg-[#161b22] border-[#30363d] hover:border-[#8b949e]/50 opacity-80 hover:opacity-100"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-[#0d1117]"
                    style={{ backgroundColor: step.color }}
                  >
                    {step.code}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${step.badgeBg} ${step.badgeText}`}>
                    Step {step.id}
                  </span>
                </div>
                <span className="text-sm font-semibold text-[#e6edf3] mt-1">{step.name}</span>
                <span className="text-[11px] text-[#8b949e] line-clamp-1">{step.castType}</span>
              </button>
            );
          })}
        </div>

        {/* Handshake Visual Stage Diagram */}
        <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 text-center">
            {/* Host */}
            <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-[#58a6ff]/10 border border-[#58a6ff]/30 flex items-center justify-center text-2xl mb-2">
                💻
              </div>
              <div className="text-sm font-bold text-[#e6edf3]">Client Workstation</div>
              <div className="text-xs font-mono text-[#8b949e]">MAC: 00:1A:2B:3C:4D:5E</div>
              <div className="mt-2 text-[11px] px-2 py-0.5 rounded bg-[#30363d] font-mono text-[#7ee787]">
                {currentDora.id === 1 || currentDora.id === 3 ? "IP: 0.0.0.0" : "IP: 192.168.10.50 (Allocated)"}
              </div>
            </div>

            {/* Transmission Path */}
            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#0d1117]/50 border border-[#30363d]/50 relative overflow-hidden">
              <div className="text-xs font-mono text-[#8b949e] mb-1">
                Direction: <span className="text-[#e6edf3] font-semibold">{currentDora.sender} ➔ {currentDora.receiver}</span>
              </div>
              <div className="w-full flex items-center justify-between text-xs font-mono py-2 px-3 rounded bg-[#0d1117] border border-[#30363d]">
                <span className="text-[#58a6ff]">{currentDora.srcIp}:{currentDora.srcPort}</span>
                <div className="flex-1 mx-2 flex items-center justify-center">
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-[#58a6ff] via-[#7ee787] to-[#58a6ff] animate-pulse"></div>
                  <span className="px-2 text-[10px] font-bold font-mono rounded bg-[#30363d] text-[#e6edf3]">
                    {currentDora.code}
                  </span>
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-[#58a6ff] via-[#7ee787] to-[#58a6ff] animate-pulse"></div>
                </div>
                <span className="text-[#7ee787]">{currentDora.dstIp}:{currentDora.dstPort}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${currentDora.badgeBg} ${currentDora.badgeText} border border-current/20`}>
                  Type: {currentDora.castType}
                </span>
                <span className="text-[10px] font-mono text-[#8b949e]">
                  Dst MAC: {currentDora.dstMac}
                </span>
              </div>
            </div>

            {/* Server */}
            <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-[#7ee787]/10 border border-[#7ee787]/30 flex items-center justify-center text-2xl mb-2">
                🖥️
              </div>
              <div className="text-sm font-bold text-[#e6edf3]">DHCP Server</div>
              <div className="text-xs font-mono text-[#8b949e]">IP: 192.168.10.1</div>
              <div className="mt-2 text-[11px] px-2 py-0.5 rounded bg-[#30363d] font-mono text-[#58a6ff]">
                Listening UDP 67
              </div>
            </div>
          </div>

          {/* Active Step Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4 border-t border-[#30363d]">
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-[#e6edf3] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentDora.color }}></span>
                {currentDora.name} Summary
              </h4>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                {currentDora.details}
              </p>
              <div className="p-3 rounded bg-[#0d1117] border border-[#30363d] text-xs font-mono text-[#e6edf3]">
                <div className="text-[10px] text-[#8b949e] uppercase mb-1">Packet Header Payload</div>
                <div>Source MAC: <span className="text-[#58a6ff]">{currentDora.srcMac}</span></div>
                <div>Dest MAC: <span className="text-[#ffa657]">{currentDora.dstMac}</span></div>
                <div>Source IP: <span className="text-[#7ee787]">{currentDora.srcIp}</span></div>
                <div>Dest IP: <span className="text-[#bc8cff]">{currentDora.dstIp}</span></div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-[#e6edf3]">
                Payload Parameters & Options
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {currentDora.options.map((opt, i) => (
                  <div key={i} className="p-2.5 rounded bg-[#0d1117] border border-[#30363d] flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                    <span className="font-mono text-[#58a6ff] font-bold min-w-[90px]">{opt.key}</span>
                    <span className="font-mono text-[#e6edf3] flex-1">{opt.value}</span>
                    <span className="text-[11px] text-[#8b949e]">{opt.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Step Navigation Controls */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setActiveDoraStep((prev) => Math.max(1, prev - 1))}
            disabled={activeDoraStep === 1}
            className="px-4 py-2 rounded-lg bg-[#161b22] border border-[#30363d] text-xs font-semibold text-[#e6edf3] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#30363d]/50 transition-colors cursor-pointer"
          >
            ← Previous Step
          </button>
          <div className="text-xs font-mono text-[#8b949e]">
            Step <span className="text-[#58a6ff] font-bold">{activeDoraStep}</span> of 4
          </div>
          <button
            onClick={() => setActiveDoraStep((prev) => Math.min(4, prev + 1))}
            disabled={activeDoraStep === 4}
            className="px-4 py-2 rounded-lg bg-[#58a6ff] text-[#0d1117] text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#58a6ff]/90 transition-colors cursor-pointer"
          >
            Next Step →
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 2. DHCP RELAY AGENT (`ip helper-address`) */}
      {/* -------------------------------------------------------------------- */}
      <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#30363d] pb-4">
          <div>
            <span className="text-xs uppercase font-mono tracking-wider text-[#7ee787]">Cross-Subnet Forwarding</span>
            <h3 className="text-xl font-bold text-[#e6edf3]">
              DHCP Relay Agent (<code className="text-[#7ee787]">ip helper-address</code>)
            </h3>
          </div>
          {/* Mode Switcher */}
          <div className="flex items-center p-1 rounded-lg bg-[#161b22] border border-[#30363d]">
            <button
              onClick={() => setRelayMode("with_relay")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                relayMode === "with_relay"
                  ? "bg-[#7ee787] text-[#0d1117]"
                  : "text-[#8b949e] hover:text-[#e6edf3]"
              }`}
            >
              With Relay Agent
            </button>
            <button
              onClick={() => setRelayMode("without_relay")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                relayMode === "without_relay"
                  ? "bg-[#ff7b72] text-[#0d1117]"
                  : "text-[#8b949e] hover:text-[#e6edf3]"
              }`}
            >
              Without Relay
            </button>
          </div>
        </div>

        {/* Diagram Area */}
        <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
            {/* Client Subnet */}
            <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] text-center space-y-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#58a6ff]/10 text-[#58a6ff]">VLAN 10 Subnet (192.168.10.0/24)</span>
              <div className="text-2xl pt-1">💻</div>
              <div className="text-sm font-bold text-[#e6edf3]">Client Host</div>
              <div className="text-xs font-mono text-[#8b949e]">Sends L3 Broadcast:</div>
              <div className="text-xs font-mono text-[#ffa657] font-semibold bg-[#161b22] p-1.5 rounded border border-[#30363d]">
                255.255.255.255:67
              </div>
            </div>

            {/* Router / Relay Agent */}
            <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] text-center space-y-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#bc8cff]/10 text-[#bc8cff]">L3 Router (Gateway 192.168.10.1)</span>
              <div className="text-2xl pt-1">🛣️</div>
              <div className="text-sm font-bold text-[#e6edf3]">Interface G0/0.10</div>
              {relayMode === "with_relay" ? (
                <div className="text-xs font-mono text-[#7ee787] bg-[#7ee787]/10 p-2 rounded border border-[#7ee787]/30">
                  ✓ Converts Broadcast to Unicast to 10.0.0.100 (GIADDR: 192.168.10.1)
                </div>
              ) : (
                <div className="text-xs font-mono text-[#ff7b72] bg-[#ff7b72]/10 p-2 rounded border border-[#ff7b72]/30">
                  ✗ Router drops 255.255.255.255 broadcast packet! (Client times out)
                </div>
              )}
            </div>

            {/* Central DHCP Server */}
            <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] text-center space-y-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#7ee787]/10 text-[#7ee787]">Central Management Subnet</span>
              <div className="text-2xl pt-1">🖥️</div>
              <div className="text-sm font-bold text-[#e6edf3]">Central DHCP Server</div>
              <div className="text-xs font-mono text-[#8b949e]">IP: 10.0.0.100</div>
              {relayMode === "with_relay" ? (
                <div className="text-xs font-mono text-[#7ee787] bg-[#161b22] p-1.5 rounded border border-[#30363d]">
                  Receives Unicast & Allocates from Pool 192.168.10.0/24
                </div>
              ) : (
                <div className="text-xs font-mono text-[#8b949e] bg-[#161b22] p-1.5 rounded border border-[#30363d]">
                  Never receives DISCOVER packet
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs text-[#8b949e] leading-relaxed">
            <strong className="text-[#e6edf3] font-mono">Why DHCP Relay is Required:</strong> Routers drop Layer 3 broadcast packets (255.255.255.255) by default to prevent broadcast storms. 
            When clients reside on separate VLANs from the central DHCP server, the router&apos;s interface acts as a <strong className="text-[#7ee787]">DHCP Relay Agent</strong>. 
            It intercepts the local broadcast, sets the <code className="text-[#58a6ff]">GIADDR</code> (Gateway IP Address) field to <code className="text-[#58a6ff]">192.168.10.1</code>, and forwards a unicast packet across subnets directly to <code className="text-[#58a6ff]">10.0.0.100</code>.
          </div>
        </div>

        {/* Cisco IOS Config Code Block */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#e6edf3] font-semibold">Cisco IOS Relay Agent Configuration</span>
            <button
              onClick={copyCode}
              className="px-3 py-1 rounded bg-[#30363d] hover:bg-[#30363d]/80 text-[#e6edf3] text-xs font-mono transition-colors cursor-pointer"
            >
              {copiedConfig ? "✓ Copied!" : "Copy Configuration"}
            </button>
          </div>
          <pre className="p-4 rounded-lg bg-[#161b22] border border-[#30363d] text-xs font-mono text-[#7ee787] overflow-x-auto leading-relaxed">
            {ciscoRelayConfig}
          </pre>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 3. ESSENTIAL DHCP OPTIONS */}
      {/* -------------------------------------------------------------------- */}
      <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#30363d] pb-4">
          <div>
            <span className="text-xs uppercase font-mono tracking-wider text-[#ffa657]">Network Configuration Parameters</span>
            <h3 className="text-xl font-bold text-[#e6edf3]">
              Essential DHCP Options
            </h3>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {["All", "Core Networking", "Identification", "PXE & Boot", "Advanced Routing"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-[#ffa657] text-[#0d1117] font-bold"
                    : "bg-[#161b22] text-[#8b949e] border border-[#30363d] hover:text-[#e6edf3]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOptions.map((opt) => (
            <div
              key={opt.id}
              className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-[#ffa657]/40 transition-colors space-y-3"
            >
              <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#ffa657]/10 text-[#ffa657] text-xs font-mono font-bold border border-[#ffa657]/20">
                    Option {opt.id}
                  </span>
                  <span className="text-sm font-bold text-[#e6edf3]">{opt.name}</span>
                </div>
                <span className="text-[10px] font-mono text-[#8b949e]">{opt.hexCode}</span>
              </div>

              <p className="text-xs text-[#8b949e] leading-relaxed">
                {opt.description}
              </p>

              <div className="space-y-1 text-[11px] font-mono bg-[#0d1117] p-2.5 rounded border border-[#30363d]">
                <div className="text-[#7ee787]">
                  Sample Payload: <span className="text-[#e6edf3]">{opt.sampleValue}</span>
                </div>
                <div className="text-[#8b949e]">
                  Data Length: <span className="text-[#58a6ff]">{opt.length}</span> | {opt.rfc}
                </div>
              </div>

              <div className="text-[11px] text-[#e6edf3] font-sans pt-1">
                <strong className="text-[#ffa657]">Enterprise Use Case:</strong> {opt.enterpriseUseCase}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 4. ENTERPRISE IPAM & POOL EXHAUSTION CALCULATOR */}
      {/* -------------------------------------------------------------------- */}
      <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#30363d] pb-4">
          <div>
            <span className="text-xs uppercase font-mono tracking-wider text-[#bc8cff]">Capacity & Planning</span>
            <h3 className="text-xl font-bold text-[#e6edf3]">
              Enterprise IPAM & Pool Exhaustion Calculator
            </h3>
          </div>

          {/* Status Badge */}
          <div className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold ${riskStatus.bg} ${riskStatus.text}`}>
            {riskStatus.label}
          </div>
        </div>

        {/* Input Parameters Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Subnet CIDR */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#8b949e]">Subnet Size (CIDR Prefix)</label>
            <select
              value={cidrPrefix}
              onChange={(e) => setCidrPrefix(Number(e.target.value))}
              className="w-full p-2.5 rounded-lg bg-[#161b22] border border-[#30363d] text-xs font-mono text-[#e6edf3] focus:border-[#58a6ff] outline-none cursor-pointer"
            >
              <option value={26}>/26 (64 Total IPs / 62 Usable)</option>
              <option value={25}>/25 (128 Total IPs / 126 Usable)</option>
              <option value={24}>/24 (256 Total IPs / 254 Usable)</option>
              <option value={23}>/23 (512 Total IPs / 510 Usable)</option>
              <option value={22}>/22 (1024 Total IPs / 1022 Usable)</option>
            </select>
          </div>

          {/* Reserved IPs */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#8b949e]">Reserved Static IPs (Gateways/Servers)</label>
            <input
              type="number"
              min={0}
              max={usableTotalIps}
              value={reservedCount}
              onChange={(e) => setReservedCount(Math.max(0, Number(e.target.value)))}
              className="w-full p-2.5 rounded-lg bg-[#161b22] border border-[#30363d] text-xs font-mono text-[#e6edf3] focus:border-[#58a6ff] outline-none"
            />
          </div>

          {/* Active Leases */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#8b949e]">Active Concurrent Leases</label>
            <input
              type="number"
              min={0}
              max={totalSubnetIps}
              value={activeLeases}
              onChange={(e) => setActiveLeases(Math.max(0, Number(e.target.value)))}
              className="w-full p-2.5 rounded-lg bg-[#161b22] border border-[#30363d] text-xs font-mono text-[#e6edf3] focus:border-[#58a6ff] outline-none"
            />
          </div>

          {/* Daily Churn Rate */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#8b949e]">Daily Device Turnover (New MACs/Day)</label>
            <input
              type="number"
              min={0}
              max={500}
              value={dailyChurn}
              onChange={(e) => setDailyChurn(Math.max(0, Number(e.target.value)))}
              className="w-full p-2.5 rounded-lg bg-[#161b22] border border-[#30363d] text-xs font-mono text-[#e6edf3] focus:border-[#58a6ff] outline-none"
            />
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#8b949e]">Pool Allocation Distribution</span>
            <span className="text-[#e6edf3] font-bold">{utilizationPct.toFixed(1)}% Utilization</span>
          </div>

          <div className="w-full h-4 rounded-full bg-[#161b22] border border-[#30363d] overflow-hidden flex">
            {/* Reserved Static */}
            <div
              style={{ width: `${(reservedCount / usableTotalIps) * 100}%` }}
              className="h-full bg-[#ffa657] transition-all"
              title={`Reserved Static IPs: ${reservedCount}`}
            ></div>
            {/* Active Leases */}
            <div
              style={{ width: `${(activeLeases / usableTotalIps) * 100}%` }}
              className="h-full bg-[#58a6ff] transition-all"
              title={`Active DHCP Leases: ${activeLeases}`}
            ></div>
            {/* Free IPs */}
            <div
              style={{ width: `${(freeIps / usableTotalIps) * 100}%` }}
              className="h-full bg-[#7ee787]/40 transition-all"
              title={`Free Available Pool: ${freeIps}`}
            ></div>
          </div>

          {/* Progress Legend */}
          <div className="flex flex-wrap gap-4 text-xs font-mono pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#ffa657]"></span>
              <span className="text-[#8b949e]">Static Reserved: <strong className="text-[#e6edf3]">{reservedCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#58a6ff]"></span>
              <span className="text-[#8b949e]">Active Leases: <strong className="text-[#e6edf3]">{activeLeases}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#7ee787]/40"></span>
              <span className="text-[#8b949e]">Free Available: <strong className="text-[#e6edf3]">{freeIps}</strong></span>
            </div>
          </div>
        </div>

        {/* Calculated Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] space-y-1">
            <div className="text-xs font-mono text-[#8b949e]">Total Usable Pool Size</div>
            <div className="text-2xl font-bold text-[#e6edf3] font-mono">{usablePoolSize} IPs</div>
            <div className="text-[11px] text-[#8b949e]">
              Excluding network & broadcast address
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] space-y-1">
            <div className="text-xs font-mono text-[#8b949e]">Available Free Pool</div>
            <div className="text-2xl font-bold text-[#7ee787] font-mono">{freeIps} IPs</div>
            <div className="text-[11px] text-[#8b949e]">Unallocated available leases</div>
          </div>

          <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] space-y-1">
            <div className="text-xs font-mono text-[#8b949e]">Est. Time to Pool Exhaustion</div>
            <div className="text-2xl font-bold text-[#bc8cff] font-mono">
              {freeIps > 0 ? `${hoursUntilExhaustion} Hours` : "Exhausted"}
            </div>
            <div className="text-[11px] text-[#8b949e]">Based on daily device churn rate</div>
          </div>
        </div>

        {/* IPAM Recommendation Box */}
        <div className={`p-4 rounded-xl border text-xs leading-relaxed space-y-2 ${riskStatus.bg}`}>
          <div className="font-bold font-mono text-sm flex items-center gap-2">
            <span>💡 IPAM Health Recommendation</span>
          </div>
          <p className="text-[#e6edf3]">{riskStatus.message}</p>
          <div className="pt-2 border-t border-current/20 text-[11px] text-[#8b949e]">
            <strong>Best Practice Tip:</strong> For guest Wi-Fi networks with high turnover, set lease duration to <strong className="text-[#e6edf3]">2 to 4 hours</strong>. For enterprise office desktops, set lease duration to <strong className="text-[#e6edf3]">8 days</strong>.
          </div>
        </div>
      </div>
    </section>
  );
}
