export default function BasicsSection() {
  return (
    <section
      id="basics"
      className="scroll-mt-24 rounded-2xl bg-[#161b22] border border-[#30363d] p-6 sm:p-8 transition-colors hover:border-[#58a6ff]/40"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-md bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20 text-xs font-mono font-semibold">
          #basics
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#e6edf3]">
          1. What is a Subnet?
        </h2>
      </div>

      <p className="text-[#8b949e] text-base leading-relaxed mb-8 max-w-4xl">
        A <strong className="text-[#e6edf3]">Subnet (Subnetwork)</strong> is a logical subdivision of an IP network. 
        By partitioning a large network into smaller, isolated sub-networks, organization network administrators 
        minimize broadcast noise, enhance security isolation, and optimize Layer 3 routing efficiency across local and cloud environments.
      </p>

      {/* 3 Benefit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Card 1: Performance */}
        <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-6 hover:border-[#58a6ff]/50 transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-[#58a6ff]/10 border border-[#58a6ff]/30 flex items-center justify-center text-[#58a6ff] font-bold text-lg mb-4">
              ⚡
            </div>
            <h3 className="text-lg font-semibold text-[#e6edf3] mb-2">
              Performance & Traffic Control
            </h3>
            <p className="text-[#8b949e] text-sm leading-relaxed">
              Subnetting constrains Layer 2 broadcast domains. Without subnets, broadcast frames (ARP, DHCP) flood every host on the switch, causing broadcast storms and high network latency.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#30363d] flex items-center justify-between text-xs font-mono text-[#58a6ff]">
            <span>Broadcast Scope</span>
            <span>Local Only</span>
          </div>
        </div>

        {/* Card 2: Security */}
        <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-6 hover:border-[#7ee787]/50 transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-[#7ee787]/10 border border-[#7ee787]/30 flex items-center justify-center text-[#7ee787] font-bold text-lg mb-4">
              🛡️
            </div>
            <h3 className="text-lg font-semibold text-[#e6edf3] mb-2">
              Enhanced Security Isolation
            </h3>
            <p className="text-[#8b949e] text-sm leading-relaxed">
              Enforces Zero-Trust boundary controls between host groups. Isolates sensitive infrastructure (Database, Payment Gateways, Admin) from public-facing web servers and Guest Wi-Fi.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#30363d] flex items-center justify-between text-xs font-mono text-[#7ee787]">
            <span>Access Control</span>
            <span>L3 ACL / Firewall</span>
          </div>
        </div>

        {/* Card 3: Organization */}
        <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-6 hover:border-[#bc8cff]/50 transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-[#bc8cff]/10 border border-[#bc8cff]/30 flex items-center justify-center text-[#bc8cff] font-bold text-lg mb-4">
              📐
            </div>
            <h3 className="text-lg font-semibold text-[#e6edf3] mb-2">
              Logical Addressing & Scale
            </h3>
            <p className="text-[#8b949e] text-sm leading-relaxed">
              Enables structured IP Address Management (IPAM). Facilitates route summarization, simplified troubleshooting, and scalable allocation across physical buildings or cloud Availability Zones.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#30363d] flex items-center justify-between text-xs font-mono text-[#bc8cff]">
            <span>IP Architecture</span>
            <span>Structured Hierarchy</span>
          </div>
        </div>
      </div>

      {/* Visual Home/Office Network 3-Subnet Diagram */}
      <div className="rounded-xl bg-[#0d1117] border border-[#30363d] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-[#30363d]">
          <div>
            <h3 className="text-lg font-bold text-[#e6edf3]">
              Network Topology Example: 192.168.1.0/24 Subnet Partitioning
            </h3>
            <p className="text-xs text-[#8b949e]">
              A single Class C block divided into 3 distinct functional subnets with a central Layer 3 Gateway Router.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#1c2333] border border-[#30363d] text-xs font-mono text-[#7ee787] whitespace-nowrap self-start sm:self-auto">
            Total IPs: 256
          </span>
        </div>

        {/* Central Router Node */}
        <div className="flex justify-center mb-8">
          <div className="relative group px-6 py-3 rounded-xl bg-[#161b22] border-2 border-[#58a6ff] text-center shadow-lg shadow-[#58a6ff]/10">
            <div className="text-xs font-mono text-[#58a6ff] uppercase tracking-wider mb-1">
              Core Gateway Router
            </div>
            <div className="text-sm font-mono font-bold text-[#e6edf3]">
              192.168.1.1 / 24
            </div>
            <div className="text-[11px] text-[#8b949e] mt-1">
              Inter-Subnet Layer 3 Routing & NAT
            </div>
          </div>
        </div>

        {/* 3 Subnet Nodes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connection Lines styling representation */}
          
          {/* Subnet A */}
          <div className="rounded-xl bg-[#161b22] border border-[#58a6ff]/40 p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#58a6ff]" />
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded bg-[#58a6ff]/20 text-[#58a6ff] text-xs font-mono font-semibold">
                Subnet A
              </span>
              <span className="text-xs font-mono text-[#8b949e]">VLAN 10</span>
            </div>
            <h4 className="text-base font-bold text-[#e6edf3] mb-1">
              Management & Admin
            </h4>
            <div className="font-mono text-sm text-[#58a6ff] font-semibold mb-3">
              192.168.1.0 / 26
            </div>
            
            <div className="space-y-2 text-xs font-mono bg-[#0d1117] p-3 rounded-lg border border-[#30363d] mb-4">
              <div className="flex justify-between text-[#8b949e]">
                <span>Mask:</span>
                <span className="text-[#e6edf3]">255.255.255.192</span>
              </div>
              <div className="flex justify-between text-[#8b949e]">
                <span>Usable IPs:</span>
                <span className="text-[#7ee787]">.1 — .62 (62 hosts)</span>
              </div>
              <div className="flex justify-between text-[#8b949e]">
                <span>Gateway:</span>
                <span className="text-[#58a6ff]">192.168.1.1</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-[#8b949e]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#58a6ff]" />
                <span>Admin Workstation (192.168.1.10)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#58a6ff]" />
                <span>Core Switch Mgmt (192.168.1.2)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#58a6ff]" />
                <span>NAS Backup Vault (192.168.1.15)</span>
              </div>
            </div>
          </div>

          {/* Subnet B */}
          <div className="rounded-xl bg-[#161b22] border border-[#7ee787]/40 p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#7ee787]" />
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded bg-[#7ee787]/20 text-[#7ee787] text-xs font-mono font-semibold">
                Subnet B
              </span>
              <span className="text-xs font-mono text-[#8b949e]">VLAN 20</span>
            </div>
            <h4 className="text-base font-bold text-[#e6edf3] mb-1">
              Staff Workstations
            </h4>
            <div className="font-mono text-sm text-[#7ee787] font-semibold mb-3">
              192.168.1.64 / 26
            </div>
            
            <div className="space-y-2 text-xs font-mono bg-[#0d1117] p-3 rounded-lg border border-[#30363d] mb-4">
              <div className="flex justify-between text-[#8b949e]">
                <span>Mask:</span>
                <span className="text-[#e6edf3]">255.255.255.192</span>
              </div>
              <div className="flex justify-between text-[#8b949e]">
                <span>Usable IPs:</span>
                <span className="text-[#7ee787]">.65 — .126 (62 hosts)</span>
              </div>
              <div className="flex justify-between text-[#8b949e]">
                <span>Gateway:</span>
                <span className="text-[#58a6ff]">192.168.1.65</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-[#8b949e]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7ee787]" />
                <span>Office PC-01 (192.168.1.70)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7ee787]" />
                <span>Dev Laptop-04 (192.168.1.85)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7ee787]" />
                <span>VoIP Desk Phone (192.168.1.90)</span>
              </div>
            </div>
          </div>

          {/* Subnet C */}
          <div className="rounded-xl bg-[#161b22] border border-[#ffa657]/40 p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#ffa657]" />
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded bg-[#ffa657]/20 text-[#ffa657] text-xs font-mono font-semibold">
                Subnet C
              </span>
              <span className="text-xs font-mono text-[#8b949e]">VLAN 30</span>
            </div>
            <h4 className="text-base font-bold text-[#e6edf3] mb-1">
              IoT & Guest Wi-Fi
            </h4>
            <div className="font-mono text-sm text-[#ffa657] font-semibold mb-3">
              192.168.1.128 / 25
            </div>
            
            <div className="space-y-2 text-xs font-mono bg-[#0d1117] p-3 rounded-lg border border-[#30363d] mb-4">
              <div className="flex justify-between text-[#8b949e]">
                <span>Mask:</span>
                <span className="text-[#e6edf3]">255.255.255.128</span>
              </div>
              <div className="flex justify-between text-[#8b949e]">
                <span>Usable IPs:</span>
                <span className="text-[#7ee787]">.129 — .254 (126 hosts)</span>
              </div>
              <div className="flex justify-between text-[#8b949e]">
                <span>Gateway:</span>
                <span className="text-[#58a6ff]">192.168.1.129</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-[#8b949e]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffa657]" />
                <span>Smart TV (192.168.1.135)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffa657]" />
                <span>Guest Phone (192.168.1.142)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffa657]" />
                <span>IP Security Camera (192.168.1.200)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
