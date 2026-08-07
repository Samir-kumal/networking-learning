export default function VlanSection() {
  return (
    <section
      id="vlans"
      className="scroll-mt-24 rounded-2xl bg-[#161b22] border border-[#30363d] p-6 sm:p-8 transition-colors hover:border-[#58a6ff]/40"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-md bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20 text-xs font-mono font-semibold">
          #vlans
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#e6edf3]">
          5. VLANs & Subnets — How They Connect
        </h2>
      </div>

      <p className="text-[#8b949e] text-base leading-relaxed mb-8 max-w-4xl">
        While both <strong className="text-[#58a6ff]">VLANs (Virtual LANs)</strong> and <strong className="text-[#7ee787]">Subnets</strong> isolate network traffic, they operate at different layers of the OSI model. Understanding how Layer 2 physical switch isolation pairs with Layer 3 IP addressing is essential for modern enterprise network design.
      </p>

      {/* Layer 2 vs Layer 3 Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Layer 2 VLAN Card */}
        <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-6 hover:border-[#58a6ff]/50 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 rounded bg-[#58a6ff]/20 text-[#58a6ff] font-mono text-xs font-bold">
                OSI Layer 2 (Data Link)
              </span>
              <span className="text-xs font-mono text-[#8b949e]">IEEE 802.1Q</span>
            </div>
            <h3 className="text-xl font-bold text-[#e6edf3] mb-3">
              VLAN (Virtual Local Area Network)
            </h3>
            <p className="text-sm text-[#8b949e] leading-relaxed mb-4">
              Partitioning at the physical switch level. Inserts a 4-byte 802.1Q tag into Ethernet frame headers to divide a single switch into multiple virtual broadcast domains.
            </p>
            <div className="space-y-2 text-xs font-mono bg-[#0d1117] p-3 rounded-lg border border-[#30363d] text-[#8b949e]">
              <div className="flex justify-between">
                <span>Hardware Scope:</span>
                <span className="text-[#e6edf3]">Ethernet Switches & Trunks</span>
              </div>
              <div className="flex justify-between">
                <span>Identifier:</span>
                <span className="text-[#58a6ff]">VLAN ID (1 — 4094)</span>
              </div>
              <div className="flex justify-between">
                <span>Isolation Layer:</span>
                <span className="text-[#7ee787]">MAC / Frame Broadcast Scope</span>
              </div>
            </div>
          </div>
        </div>

        {/* Layer 3 Subnet Card */}
        <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-6 hover:border-[#7ee787]/50 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 rounded bg-[#7ee787]/20 text-[#7ee787] font-mono text-xs font-bold">
                OSI Layer 3 (Network)
              </span>
              <span className="text-xs font-mono text-[#8b949e]">IPv4 / IPv6</span>
            </div>
            <h3 className="text-xl font-bold text-[#e6edf3] mb-3">
              IP Subnet (Subnetwork)
            </h3>
            <p className="text-sm text-[#8b949e] leading-relaxed mb-4">
              Logical IP address grouping defined by subnet masks (e.g., <code className="text-[#7ee787]">255.255.255.0</code>). Determines whether a packet stays local or must be routed through a gateway.
            </p>
            <div className="space-y-2 text-xs font-mono bg-[#0d1117] p-3 rounded-lg border border-[#30363d] text-[#8b949e]">
              <div className="flex justify-between">
                <span>Hardware Scope:</span>
                <span className="text-[#e6edf3]">Routers & L3 Switches</span>
              </div>
              <div className="flex justify-between">
                <span>Identifier:</span>
                <span className="text-[#7ee787]">Network IP & CIDR Prefix</span>
              </div>
              <div className="flex justify-between">
                <span>Isolation Layer:</span>
                <span className="text-[#bc8cff]">IP Packet Routing Boundaries</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1:1 Mapping & Inter-VLAN Routing Diagram */}
      <div className="rounded-xl bg-[#0d1117] border border-[#30363d] p-6 mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-[#30363d]">
          <div>
            <h3 className="text-lg font-bold text-[#e6edf3]">
              Industry Standard: 1:1 Mapping & Inter-VLAN Routing
            </h3>
            <p className="text-xs text-[#8b949e]">
              Best practice dictates mapping exactly one IP Subnet to one VLAN. Communication between VLANs requires a Layer 3 Router or L3 Switch.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#161b22] border border-[#30363d] text-xs font-mono text-[#58a6ff]">
            802.1Q Trunking
          </span>
        </div>

        {/* Router Gateway Central */}
        <div className="flex justify-center mb-8">
          <div className="px-6 py-3 rounded-xl bg-[#161b22] border-2 border-[#bc8cff] text-center shadow-lg shadow-[#bc8cff]/10">
            <div className="text-xs font-mono text-[#bc8cff] uppercase tracking-wider mb-0.5">
              Layer 3 Gateway (Router / L3 Switch)
            </div>
            <div className="text-sm font-mono font-bold text-[#e6edf3]">
              Inter-VLAN Routing ("Router-on-a-Stick")
            </div>
            <div className="text-[11px] text-[#8b949e] mt-1">
              Evaluates Firewall ACLs before forwarding packets between subnets
            </div>
          </div>
        </div>

        {/* 3 VLAN Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* VLAN 10 */}
          <div className="rounded-xl bg-[#161b22] border border-[#58a6ff]/40 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded bg-[#58a6ff]/20 text-[#58a6ff] text-xs font-mono font-bold">
                VLAN 10
              </span>
              <span className="text-xs font-mono text-[#8b949e]">Layer 2</span>
            </div>
            <div className="text-base font-bold text-[#e6edf3] mb-1">Finance Dept</div>
            <div className="font-mono text-xs text-[#58a6ff] mb-3">Subnet: 10.10.10.0 / 24</div>
            <div className="text-xs text-[#8b949e] bg-[#0d1117] p-2.5 rounded border border-[#30363d] font-mono space-y-1">
              <div>Gateway: 10.10.10.1</div>
              <div>Switch Ports: FastEthernet 0/1 - 0/10</div>
            </div>
          </div>

          {/* VLAN 20 */}
          <div className="rounded-xl bg-[#161b22] border border-[#7ee787]/40 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded bg-[#7ee787]/20 text-[#7ee787] text-xs font-mono font-bold">
                VLAN 20
              </span>
              <span className="text-xs font-mono text-[#8b949e]">Layer 2</span>
            </div>
            <div className="text-base font-bold text-[#e6edf3] mb-1">Engineering</div>
            <div className="font-mono text-xs text-[#7ee787] mb-3">Subnet: 10.10.20.0 / 24</div>
            <div className="text-xs text-[#8b949e] bg-[#0d1117] p-2.5 rounded border border-[#30363d] font-mono space-y-1">
              <div>Gateway: 10.10.20.1</div>
              <div>Switch Ports: FastEthernet 0/11 - 0/20</div>
            </div>
          </div>

          {/* VLAN 30 */}
          <div className="rounded-xl bg-[#161b22] border border-[#ffa657]/40 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded bg-[#ffa657]/20 text-[#ffa657] text-xs font-mono font-bold">
                VLAN 30
              </span>
              <span className="text-xs font-mono text-[#8b949e]">Layer 2</span>
            </div>
            <div className="text-base font-bold text-[#e6edf3] mb-1">Guest Wi-Fi</div>
            <div className="font-mono text-xs text-[#ffa657] mb-3">Subnet: 10.10.30.0 / 24</div>
            <div className="text-xs text-[#8b949e] bg-[#0d1117] p-2.5 rounded border border-[#30363d] font-mono space-y-1">
              <div>Gateway: 10.10.30.1</div>
              <div>Switch Ports: Wireless AP Trunk</div>
            </div>
          </div>
        </div>
      </div>

      {/* Access Ports vs Trunk Ports Rule Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-5">
          <h4 className="text-base font-bold text-[#e6edf3] mb-2">
            Access Ports (End Devices)
          </h4>
          <p className="text-xs text-[#8b949e] leading-relaxed">
            Switch ports configured as <strong className="text-[#58a6ff]">Access Ports</strong> belong to a single native VLAN. They send and receive standard untagged Ethernet frames directly to workstations, printers, and IP phones.
          </p>
        </div>

        <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-5">
          <h4 className="text-base font-bold text-[#e6edf3] mb-2">
            Trunk Ports (IEEE 802.1Q Inter-Switch Links)
          </h4>
          <p className="text-xs text-[#8b949e] leading-relaxed">
            Switch ports configured as <strong className="text-[#7ee787]">Trunk Ports</strong> multiplex traffic from multiple VLANs over a single physical link by appending a 4-byte 802.1Q VLAN ID tag to each Ethernet frame header.
          </p>
        </div>
      </div>
    </section>
  );
}
