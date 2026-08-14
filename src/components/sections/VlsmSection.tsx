import NetworkingModuleHeader from "@/components/networking/NetworkingModuleHeader";
import NetworkingPanel from "@/components/networking/NetworkingPanel";
import NetworkingExample from "@/components/networking/NetworkingExample";
export default function VlsmSection() {
  return (
    <section
      id="vlsm"
      className="networking-module scroll-mt-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Section Header */}
      <NetworkingModuleHeader
        anchor="#vlsm"
        icon={<span className="text-indigo-500 dark:text-indigo-400" aria-hidden="true">◐</span>}
        title={<>6. VLSM — Variable Length Subnet Masking</>}
        description={<><strong className="text-slate-900 dark:text-slate-100">Variable Length Subnet Masking (VLSM)</strong> allows network engineers to subdivide an address block into non-uniform subnets sized for different host requirements. Longer prefixes such as <code className="text-indigo-600 dark:text-indigo-400">/27</code> and <code className="text-indigo-600 dark:text-indigo-400">/30</code> create smaller subnets; allocating the smallest suitable block avoids wasting addresses.</>}
      />
      <div className="module-content networking-module-content">

      {/* Prefix Cards (/30, /27, /24) */}
        <NetworkingPanel>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* /30 Card */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow hover:border-amber-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-1 rounded bg-[#ffa657]/20 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold">
                /30 Prefix
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">255.255.255.252</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Point-to-Point Router Links
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Provides exactly 4 total IPv4 addresses (2<sup>2</sup>), yielding <strong className="text-emerald-600 dark:text-emerald-400">2 conventional host addresses</strong>. It is common for two-endpoint links, while RFC 3021 <code>/31</code> can use both addresses on supported point-to-point interfaces.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs font-mono">
            <span className="text-slate-500 dark:text-slate-400">Usable Efficiency:</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">50% (2 of 4)</span>
          </div>
        </div>

        {/* /27 Card */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow hover:card-shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-1 rounded bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-bold">
                /27 Prefix
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">255.255.255.224</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Branch & Small Departments
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Provides 32 total IP addresses (2<sup>5</sup>), yielding <strong className="text-emerald-600 dark:text-emerald-400">30 usable hosts</strong>. Perfect for small department teams, remote office locations, or server racks.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs font-mono">
            <span className="text-slate-500 dark:text-slate-400">Usable Efficiency:</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">93.75% (30 of 32)</span>
          </div>
        </div>

        {/* /24 Card */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold">
                /24 Prefix
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">255.255.255.0</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Standard Building / LAN
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Provides 256 total IPv4 addresses (2<sup>8</sup>), yielding <strong className="text-emerald-600 dark:text-emerald-400">254 conventional host addresses</strong>. It is a common LAN example, not a universal allocation size.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs font-mono">
            <span className="text-slate-500 dark:text-slate-400">Usable Efficiency:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">99.2% (254 of 256)</span>
          </div>
        </div>
      </div>
        </NetworkingPanel>
      <NetworkingExample title="Worked VLSM Example: Subnetting a 192.168.1.0/24 Block" description="Requirement: Allocate subnets for Engineering (50 hosts), Sales (25 hosts), Executive (10 hosts), and 2 Router Links." footer="Heuristic: allocate largest requirements first to simplify alignment" tone="cyan">

      {/* Worked Example Table */}
      <div className="mb-10">

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-700 mb-6">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="p-3">Department</th>
                <th className="p-3">Needed Hosts</th>
                <th className="p-3">Allocated CIDR</th>
                <th className="p-3">Subnet Mask</th>
                <th className="p-3">Network Address</th>
                <th className="p-3">Usable Host Range</th>
                <th className="p-3">Broadcast Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d] text-slate-900 dark:text-slate-100">
              <tr className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">Engineering</td>
                <td className="p-3">50 hosts</td>
                <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">/26 (64 IPs)</td>
                <td className="p-3 text-slate-500 dark:text-slate-400">255.255.255.192</td>
                <td className="p-3 text-indigo-600 dark:text-indigo-400">192.168.1.0</td>
                <td className="p-3">192.168.1.1 — 192.168.1.62</td>
                <td className="p-3 text-rose-600 dark:text-rose-400">192.168.1.63</td>
              </tr>
              <tr className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">Sales</td>
                <td className="p-3">25 hosts</td>
                <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">/27 (32 IPs)</td>
                <td className="p-3 text-slate-500 dark:text-slate-400">255.255.255.224</td>
                <td className="p-3 text-indigo-600 dark:text-indigo-400">192.168.1.64</td>
                <td className="p-3">192.168.1.65 — 192.168.1.94</td>
                <td className="p-3 text-rose-600 dark:text-rose-400">192.168.1.95</td>
              </tr>
              <tr className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-3 font-bold text-violet-600 dark:text-violet-400">Executive</td>
                <td className="p-3">10 hosts</td>
                <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">/28 (16 IPs)</td>
                <td className="p-3 text-slate-500 dark:text-slate-400">255.255.255.240</td>
                <td className="p-3 text-indigo-600 dark:text-indigo-400">192.168.1.96</td>
                <td className="p-3">192.168.1.97 — 192.168.1.110</td>
                <td className="p-3 text-rose-600 dark:text-rose-400">192.168.1.111</td>
              </tr>
              <tr className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-3 font-bold text-amber-600 dark:text-amber-400">Router Link 1</td>
                <td className="p-3">2 hosts</td>
                <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">/30 (4 IPs)</td>
                <td className="p-3 text-slate-500 dark:text-slate-400">255.255.255.252</td>
                <td className="p-3 text-indigo-600 dark:text-indigo-400">192.168.1.112</td>
                <td className="p-3">192.168.1.113 — 192.168.1.114</td>
                <td className="p-3 text-rose-600 dark:text-rose-400">192.168.1.115</td>
              </tr>
              <tr className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-3 font-bold text-amber-600 dark:text-amber-400">Router Link 2</td>
                <td className="p-3">2 hosts</td>
                <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">/30 (4 IPs)</td>
                <td className="p-3 text-slate-500 dark:text-slate-400">255.255.255.252</td>
                <td className="p-3 text-indigo-600 dark:text-indigo-400">192.168.1.116</td>
                <td className="p-3">192.168.1.117 — 192.168.1.118</td>
                <td className="p-3 text-rose-600 dark:text-rose-400">192.168.1.119</td>
              </tr>
              <tr className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors bg-white/30 dark:bg-slate-800/30">
                <td className="p-3 font-bold text-slate-500 dark:text-slate-400">Unassigned Pool</td>
                <td className="p-3 text-slate-500 dark:text-slate-400">Future expansion</td>
                <td className="p-3 text-slate-500 dark:text-slate-400">136 IPs free</td>
                <td className="p-3 text-slate-500 dark:text-slate-400">/29 + /25</td>
                <td className="p-3 text-slate-500 dark:text-slate-400">192.168.1.120/29 + 192.168.1.128/25</td>
                <td className="p-3 text-slate-500 dark:text-slate-400">192.168.1.120–.127; .128–.255 (136 raw addresses)</td>
                <td className="p-3 text-slate-500 dark:text-slate-400">Free range, no broadcast assignment</td>
              </tr>
            </tbody>
          </table>
        </div>
          <NetworkingPanel variant="console" className="p-0">

        {/* Tree Allocation Visual Code Block */}
        <div className="rounded-xl bg-transparent border border-slate-200 dark:border-slate-700 card-shadow p-5">
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mb-2 uppercase">
            Address Space Allocation Tree (192.168.1.0/24)
          </div>
          <pre className="font-mono text-xs text-emerald-600 dark:text-emerald-400 bg-transparent p-4 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto">
{`192.168.1.0/24 (256 Total IPs)
├── 192.168.1.0/26   [Engineering: 50 hosts required, 62 usable (.1-.62)]
├── 192.168.1.64/27  [Sales:       25 hosts required, 30 usable (.65-.94)]
├── 192.168.1.96/28  [Executive:   10 hosts required, 14 usable (.97-.110)]
├── 192.168.1.112/30 [Router Link 1: 2 hosts required, 2 usable (.113-.114)]
├── 192.168.1.116/30 [Router Link 2: 2 hosts required, 2 usable (.117-.118)]
└── 192.168.1.120/29 + 192.168.1.128/25 [Reserved Future Allocation Pool: 136 raw addresses (.120-.127 and .128-.255)]`}</pre>
        </div>
          </NetworkingPanel>
      </div>
      </NetworkingExample>

      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2.5 py-1 rounded bg-[#bc8cff]/20 text-violet-600 dark:text-violet-400 text-xs font-mono font-bold">
            RFC 3021 Standard
          </span>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            /31 Subnet Prefixes on Point-to-Point Links
          </h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
          Under conventional IPv4 subnet rules, a <code className="text-amber-600 dark:text-amber-400">/30</code> block uses 4 addresses to supply 2 host addresses. <strong className="text-slate-900 dark:text-slate-100">RFC 3021</strong> defines a limited <code className="text-emerald-600 dark:text-emerald-400">/31</code> interpretation for point-to-point links so both addresses can identify the two endpoints.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-rose-600 dark:text-rose-400 font-bold mb-1">Standard /30 Link (4 IPs):</div>
            <div className="text-slate-500 dark:text-slate-400">.0 (Network ID - Unusable)</div>
            <div className="text-emerald-600 dark:text-emerald-400">.1 (Router A Interface)</div>
            <div className="text-emerald-600 dark:text-emerald-400">.2 (Router B Interface)</div>
            <div className="text-slate-500 dark:text-slate-400">.3 (Broadcast - Unusable)</div>
          </div>

            <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border border-emerald-400/40">
              <div className="text-emerald-600 dark:text-emerald-400 font-bold mb-1">RFC 3021 /31 Link (2 IPs - 100% Efficient):</div>
              <div className="text-emerald-600 dark:text-emerald-400">.0 (Router A Interface)</div>
              <div className="text-emerald-600 dark:text-emerald-400">.1 (Router B Interface)</div>
              <div className="text-slate-500 dark:text-slate-400 mt-1 text-[11px] font-sans">
                Network and directed-broadcast semantics are not used for these two endpoints on the point-to-point link.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
