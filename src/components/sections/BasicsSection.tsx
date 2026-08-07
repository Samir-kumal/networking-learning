export default function BasicsSection() {
  return (
    <section
      id="basics"
      className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold">
          #basics
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          1. What is a Subnet?
        </h2>
      </div>

      <p className="text-slate-500 text-base leading-relaxed mb-8 max-w-4xl">
        A <strong className="text-slate-900">Subnet (Subnetwork)</strong> is a logical subdivision of an IP network. 
        By partitioning a large network into smaller, isolated sub-networks, organization network administrators 
        minimize broadcast noise, enhance security isolation, and optimize Layer 3 routing efficiency across local and cloud environments.
      </p>

      {/* 3 Benefit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Card 1: Performance */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow hover:card-shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-lg mb-4">
              ⚡
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Performance & Traffic Control
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Subnetting constrains Layer 2 broadcast domains. Without subnets, broadcast frames (ARP, DHCP) flood every host on the switch, causing broadcast storms and high network latency.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-mono text-indigo-600">
            <span>Broadcast Scope</span>
            <span>Local Only</span>
          </div>
        </div>

        {/* Card 2: Security */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold text-lg mb-4">
              🛡️
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Enhanced Security Isolation
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Enforces Zero-Trust boundary controls between host groups. Isolates sensitive infrastructure (Database, Payment Gateways, Admin) from public-facing web servers and Guest Wi-Fi.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-mono text-emerald-600">
            <span>Access Control</span>
            <span>L3 ACL / Firewall</span>
          </div>
        </div>

        {/* Card 3: Organization */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow hover:border-violet-300 transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600 font-bold text-lg mb-4">
              📐
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Logical Addressing & Scale
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Enables structured IP Address Management (IPAM). Facilitates route summarization, simplified troubleshooting, and scalable allocation across physical buildings or cloud Availability Zones.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-mono text-violet-600">
            <span>IP Architecture</span>
            <span>Structured Hierarchy</span>
          </div>
        </div>
      </div>

      {/* Visual Home/Office Network 3-Subnet Diagram */}
      <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Network Topology Example: 192.168.1.0/24 Subnet Partitioning
            </h3>
            <p className="text-xs text-slate-500">
              A single Class C block divided into 3 distinct functional subnets with a central Layer 3 Gateway Router.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-mono text-emerald-600 whitespace-nowrap self-start sm:self-auto">
            Total IPs: 256
          </span>
        </div>

        {/* Central Router Node */}
        <div className="flex justify-center mb-8">
          <div className="relative group px-6 py-3 rounded-xl bg-white border-2 border-indigo-400 text-center shadow-lg shadow-[#58a6ff]/10">
            <div className="text-xs font-mono text-indigo-600 uppercase tracking-wider mb-1">
              Core Gateway Router
            </div>
            <div className="text-sm font-mono font-bold text-slate-900">
              192.168.1.1 / 24
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Inter-Subnet Layer 3 Routing & NAT
            </div>
          </div>
        </div>

        {/* 3 Subnet Nodes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connection Lines styling representation */}
          
          {/* Subnet A */}
          <div className="rounded-xl bg-white border border-indigo-300 p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600" />
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 text-xs font-mono font-semibold">
                Subnet A
              </span>
              <span className="text-xs font-mono text-slate-500">VLAN 10</span>
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-1">
              Management & Admin
            </h4>
            <div className="font-mono text-sm text-indigo-600 font-semibold mb-3">
              192.168.1.0 / 26
            </div>
            
            <div className="space-y-2 text-xs font-mono bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
              <div className="flex justify-between text-slate-500">
                <span>Mask:</span>
                <span className="text-slate-900">255.255.255.192</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Usable IPs:</span>
                <span className="text-emerald-600">.1 — .62 (62 hosts)</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Gateway:</span>
                <span className="text-indigo-600">192.168.1.1</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                <span>Admin Workstation (192.168.1.10)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                <span>Core Switch Mgmt (192.168.1.2)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                <span>NAS Backup Vault (192.168.1.15)</span>
              </div>
            </div>
          </div>

          {/* Subnet B */}
          <div className="rounded-xl bg-white border border-emerald-400/40 p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 text-xs font-mono font-semibold">
                Subnet B
              </span>
              <span className="text-xs font-mono text-slate-500">VLAN 20</span>
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-1">
              Staff Workstations
            </h4>
            <div className="font-mono text-sm text-emerald-600 font-semibold mb-3">
              192.168.1.64 / 26
            </div>
            
            <div className="space-y-2 text-xs font-mono bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
              <div className="flex justify-between text-slate-500">
                <span>Mask:</span>
                <span className="text-slate-900">255.255.255.192</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Usable IPs:</span>
                <span className="text-emerald-600">.65 — .126 (62 hosts)</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Gateway:</span>
                <span className="text-indigo-600">192.168.1.65</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Office PC-01 (192.168.1.70)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Dev Laptop-04 (192.168.1.85)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>VoIP Desk Phone (192.168.1.90)</span>
              </div>
            </div>
          </div>

          {/* Subnet C */}
          <div className="rounded-xl bg-white border border-amber-400/40 p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#ffa657]" />
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded bg-[#ffa657]/20 text-amber-600 text-xs font-mono font-semibold">
                Subnet C
              </span>
              <span className="text-xs font-mono text-slate-500">VLAN 30</span>
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-1">
              IoT & Guest Wi-Fi
            </h4>
            <div className="font-mono text-sm text-amber-600 font-semibold mb-3">
              192.168.1.128 / 25
            </div>
            
            <div className="space-y-2 text-xs font-mono bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
              <div className="flex justify-between text-slate-500">
                <span>Mask:</span>
                <span className="text-slate-900">255.255.255.128</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Usable IPs:</span>
                <span className="text-emerald-600">.129 — .254 (126 hosts)</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Gateway:</span>
                <span className="text-indigo-600">192.168.1.129</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-500">
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
