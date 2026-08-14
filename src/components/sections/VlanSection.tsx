import NetworkingModuleHeader from "@/components/networking/NetworkingModuleHeader";
import NetworkingPanel from "@/components/networking/NetworkingPanel";
import NetworkingExample from "@/components/networking/NetworkingExample";
export default function VlanSection() {
  return (
    <section
      id="vlans"
      className="networking-module scroll-mt-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Section Header */}
      <NetworkingModuleHeader
        anchor="#vlans"
        icon={<span className="text-indigo-500 dark:text-indigo-400" aria-hidden="true">⬡</span>}
        title={<>8. VLANs & Subnets — How They Connect</>}
        description={<>While both <strong className="text-indigo-600 dark:text-indigo-400">VLANs (Virtual LANs)</strong> and <strong className="text-emerald-600 dark:text-emerald-400">Subnets</strong> isolate network traffic, they operate at different layers of the OSI model. Understanding how Layer 2 physical switch isolation pairs with Layer 3 IP addressing is essential for modern enterprise network design.</>}
      />
      <div className="module-content networking-module-content">

      {/* Layer 2 vs Layer 3 Comparison Cards */}
      <NetworkingPanel className="mb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Layer 2 VLAN Card */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow hover:card-shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 rounded bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-bold">
                OSI Layer 2 (Data Link)
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">IEEE 802.1Q</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
              VLAN (Virtual Local Area Network)
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Partitioning at the physical switch level. Inserts a 4-byte 802.1Q tag into Ethernet frame headers to divide a single switch into multiple virtual broadcast domains.
            </p>
            <div className="space-y-2 text-xs font-mono bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Hardware Scope:</span>
                <span className="text-slate-900 dark:text-slate-100">Ethernet Switches & Trunks</span>
              </div>
              <div className="flex justify-between">
                <span>Identifier:</span>
                <span className="text-indigo-600 dark:text-indigo-400">VLAN ID (1 — 4094)</span>
              </div>
              <div className="flex justify-between">
                <span>Isolation Layer:</span>
                <span className="text-emerald-600 dark:text-emerald-400">MAC / Frame Broadcast Scope</span>
              </div>
            </div>
          </div>
        </div>

        {/* Layer 3 Subnet Card */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold">
                OSI Layer 3 (Network)
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">IPv4 / IPv6</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
              IP Subnet (Subnetwork)
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Logical IP address grouping defined by subnet masks (e.g., <code className="text-emerald-600 dark:text-emerald-400">255.255.255.0</code>). Determines whether a packet stays local or must be routed through a gateway.
            </p>
            <div className="space-y-2 text-xs font-mono bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Hardware Scope:</span>
                <span className="text-slate-900 dark:text-slate-100">Routers & L3 Switches</span>
              </div>
              <div className="flex justify-between">
                <span>Identifier:</span>
                <span className="text-emerald-600 dark:text-emerald-400">Network IP & CIDR Prefix</span>
              </div>
              <div className="flex justify-between">
                <span>Isolation Layer:</span>
                <span className="text-violet-600 dark:text-violet-400">IP Packet Routing Boundaries</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </NetworkingPanel>

      {/* 1:1 Mapping & Inter-VLAN Routing Diagram */}
      <NetworkingExample title="1:1 VLAN and subnet mapping" description="One IP subnet commonly maps to one VLAN; Layer 3 routing connects them." tone="cyan">
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Industry Standard: 1:1 Mapping & Inter-VLAN Routing
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Best practice commonly maps one IP subnet to one VLAN. Communication between VLANs requires a Layer 3 router or Layer 3 switch.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-indigo-600 dark:text-indigo-400">
            802.1Q Trunking
          </span>
        </div>

        {/* Router Gateway Central */}
        <div className="flex justify-center mb-8">
          <div className="px-6 py-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-violet-400 text-center shadow-lg shadow-[#bc8cff]/10">
            <div className="text-xs font-mono text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-0.5">
              Layer 3 Gateway (Router / L3 Switch)
            </div>
            <div className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
              Inter-VLAN Routing (&quot;Router-on-a-Stick&quot;)
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Evaluates Firewall ACLs before forwarding packets between subnets
            </div>
          </div>
        </div>

        {/* 3 VLAN Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* VLAN 10 */}
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-indigo-300 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-mono font-bold">
                VLAN 10
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Layer 2</span>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Finance Dept</div>
            <div className="font-mono text-xs text-indigo-600 dark:text-indigo-400 mb-3">Subnet: 10.10.10.0 / 24</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 p-2.5 rounded border border-slate-200 dark:border-slate-700 font-mono space-y-1">
              <div>Gateway: 10.10.10.1</div>
              <div>Switch Ports: FastEthernet 0/1 - 0/10</div>
            </div>
          </div>

          {/* VLAN 20 */}
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-emerald-400/40 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold">
                VLAN 20
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Layer 2</span>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Engineering</div>
            <div className="font-mono text-xs text-emerald-600 dark:text-emerald-400 mb-3">Subnet: 10.10.20.0 / 24</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 p-2.5 rounded border border-slate-200 dark:border-slate-700 font-mono space-y-1">
              <div>Gateway: 10.10.20.1</div>
              <div>Switch Ports: FastEthernet 0/11 - 0/20</div>
            </div>
          </div>

          {/* VLAN 30 */}
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-amber-400/40 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded bg-[#ffa657]/20 text-amber-600 dark:text-amber-400 text-xs font-mono font-bold">
                VLAN 30
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Layer 2</span>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Guest Wi-Fi</div>
            <div className="font-mono text-xs text-amber-600 dark:text-amber-400 mb-3">Subnet: 10.10.30.0 / 24</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 p-2.5 rounded border border-slate-200 dark:border-slate-700 font-mono space-y-1">
              <div>Gateway: 10.10.30.1</div>
              <div>Switch Ports: Wireless AP Trunk</div>
            </div>
          </div>
        </div>
      </div>
      </NetworkingExample>

      {/* Access Ports vs Trunk Ports Rule Card */}
        <NetworkingPanel>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow p-5">
          <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
            Access Ports (End Devices)
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Switch ports configured as <strong className="text-indigo-600 dark:text-indigo-400">Access Ports</strong> belong to a single native VLAN. They send and receive standard untagged Ethernet frames directly to workstations, printers, and IP phones.
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow p-5">
          <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
            Trunk Ports (IEEE 802.1Q Inter-Switch Links)
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Switch ports configured as <strong className="text-emerald-600 dark:text-emerald-400">Trunk Ports</strong> multiplex traffic from multiple VLANs over a single physical link by appending a 4-byte 802.1Q VLAN ID tag to each Ethernet frame header.
          </p>
        </div>
      </div>
        </NetworkingPanel>
      </div>
    </section>
  );
}
