export default function VlanSection() {
  return (
    <section
      id="vlans"
      className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold">
          #vlans
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          5. VLANs & Subnets — How They Connect
        </h2>
      </div>

      <p className="text-slate-500 text-base leading-relaxed mb-8 max-w-4xl">
        While both <strong className="text-indigo-600">VLANs (Virtual LANs)</strong> and <strong className="text-emerald-600">Subnets</strong> isolate network traffic, they operate at different layers of the OSI model. Understanding how Layer 2 physical switch isolation pairs with Layer 3 IP addressing is essential for modern enterprise network design.
      </p>

      {/* Layer 2 vs Layer 3 Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Layer 2 VLAN Card */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow hover:card-shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 rounded bg-indigo-100 text-indigo-600 font-mono text-xs font-bold">
                OSI Layer 2 (Data Link)
              </span>
              <span className="text-xs font-mono text-slate-500">IEEE 802.1Q</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">
              VLAN (Virtual Local Area Network)
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              Partitioning at the physical switch level. Inserts a 4-byte 802.1Q tag into Ethernet frame headers to divide a single switch into multiple virtual broadcast domains.
            </p>
            <div className="space-y-2 text-xs font-mono bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-500">
              <div className="flex justify-between">
                <span>Hardware Scope:</span>
                <span className="text-slate-900">Ethernet Switches & Trunks</span>
              </div>
              <div className="flex justify-between">
                <span>Identifier:</span>
                <span className="text-indigo-600">VLAN ID (1 — 4094)</span>
              </div>
              <div className="flex justify-between">
                <span>Isolation Layer:</span>
                <span className="text-emerald-600">MAC / Frame Broadcast Scope</span>
              </div>
            </div>
          </div>
        </div>

        {/* Layer 3 Subnet Card */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-600 font-mono text-xs font-bold">
                OSI Layer 3 (Network)
              </span>
              <span className="text-xs font-mono text-slate-500">IPv4 / IPv6</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">
              IP Subnet (Subnetwork)
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              Logical IP address grouping defined by subnet masks (e.g., <code className="text-emerald-600">255.255.255.0</code>). Determines whether a packet stays local or must be routed through a gateway.
            </p>
            <div className="space-y-2 text-xs font-mono bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-500">
              <div className="flex justify-between">
                <span>Hardware Scope:</span>
                <span className="text-slate-900">Routers & L3 Switches</span>
              </div>
              <div className="flex justify-between">
                <span>Identifier:</span>
                <span className="text-emerald-600">Network IP & CIDR Prefix</span>
              </div>
              <div className="flex justify-between">
                <span>Isolation Layer:</span>
                <span className="text-violet-600">IP Packet Routing Boundaries</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1:1 Mapping & Inter-VLAN Routing Diagram */}
      <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Industry Standard: 1:1 Mapping & Inter-VLAN Routing
            </h3>
            <p className="text-xs text-slate-500">
              Best practice dictates mapping exactly one IP Subnet to one VLAN. Communication between VLANs requires a Layer 3 Router or L3 Switch.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-mono text-indigo-600">
            802.1Q Trunking
          </span>
        </div>

        {/* Router Gateway Central */}
        <div className="flex justify-center mb-8">
          <div className="px-6 py-3 rounded-xl bg-white border-2 border-violet-400 text-center shadow-lg shadow-[#bc8cff]/10">
            <div className="text-xs font-mono text-violet-600 uppercase tracking-wider mb-0.5">
              Layer 3 Gateway (Router / L3 Switch)
            </div>
            <div className="text-sm font-mono font-bold text-slate-900">
              Inter-VLAN Routing ("Router-on-a-Stick")
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Evaluates Firewall ACLs before forwarding packets between subnets
            </div>
          </div>
        </div>

        {/* 3 VLAN Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* VLAN 10 */}
          <div className="rounded-xl bg-white border border-indigo-300 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 text-xs font-mono font-bold">
                VLAN 10
              </span>
              <span className="text-xs font-mono text-slate-500">Layer 2</span>
            </div>
            <div className="text-base font-bold text-slate-900 mb-1">Finance Dept</div>
            <div className="font-mono text-xs text-indigo-600 mb-3">Subnet: 10.10.10.0 / 24</div>
            <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200 font-mono space-y-1">
              <div>Gateway: 10.10.10.1</div>
              <div>Switch Ports: FastEthernet 0/1 - 0/10</div>
            </div>
          </div>

          {/* VLAN 20 */}
          <div className="rounded-xl bg-white border border-emerald-400/40 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 text-xs font-mono font-bold">
                VLAN 20
              </span>
              <span className="text-xs font-mono text-slate-500">Layer 2</span>
            </div>
            <div className="text-base font-bold text-slate-900 mb-1">Engineering</div>
            <div className="font-mono text-xs text-emerald-600 mb-3">Subnet: 10.10.20.0 / 24</div>
            <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200 font-mono space-y-1">
              <div>Gateway: 10.10.20.1</div>
              <div>Switch Ports: FastEthernet 0/11 - 0/20</div>
            </div>
          </div>

          {/* VLAN 30 */}
          <div className="rounded-xl bg-white border border-amber-400/40 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded bg-[#ffa657]/20 text-amber-600 text-xs font-mono font-bold">
                VLAN 30
              </span>
              <span className="text-xs font-mono text-slate-500">Layer 2</span>
            </div>
            <div className="text-base font-bold text-slate-900 mb-1">Guest Wi-Fi</div>
            <div className="font-mono text-xs text-amber-600 mb-3">Subnet: 10.10.30.0 / 24</div>
            <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200 font-mono space-y-1">
              <div>Gateway: 10.10.30.1</div>
              <div>Switch Ports: Wireless AP Trunk</div>
            </div>
          </div>
        </div>
      </div>

      {/* Access Ports vs Trunk Ports Rule Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl bg-white border border-slate-200 card-shadow p-5">
          <h4 className="text-base font-bold text-slate-900 mb-2">
            Access Ports (End Devices)
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Switch ports configured as <strong className="text-indigo-600">Access Ports</strong> belong to a single native VLAN. They send and receive standard untagged Ethernet frames directly to workstations, printers, and IP phones.
          </p>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 card-shadow p-5">
          <h4 className="text-base font-bold text-slate-900 mb-2">
            Trunk Ports (IEEE 802.1Q Inter-Switch Links)
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Switch ports configured as <strong className="text-emerald-600">Trunk Ports</strong> multiplex traffic from multiple VLANs over a single physical link by appending a 4-byte 802.1Q VLAN ID tag to each Ethernet frame header.
          </p>
        </div>
      </div>
    </section>
  );
}
