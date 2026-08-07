export default function VlsmSection() {
  return (
    <section
      id="vlsm"
      className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold">
          #vlsm
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          4. VLSM — Variable Length Subnet Masking
        </h2>
      </div>

      <p className="text-slate-500 text-base leading-relaxed mb-8 max-w-4xl">
        <strong className="text-slate-900">Variable Length Subnet Masking (VLSM)</strong> allows network engineers to subdivide an IP address space into non-uniform subnets tailored to exact host requirements. Instead of assigning a fixed mask (like `/24`) everywhere, VLSM prevents IP address exhaustion by assigning larger masks (e.g., `/26`, `/27`, `/30`) where fewer hosts reside.
      </p>

      {/* Prefix Cards (/30, /27, /24) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* /30 Card */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow hover:border-amber-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-1 rounded bg-[#ffa657]/20 text-amber-600 font-mono text-xs font-bold">
                /30 Prefix
              </span>
              <span className="text-xs font-mono text-slate-500">255.255.255.252</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Point-to-Point Router Links
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Provides exactly 4 total IP addresses ($2^2$), yielding <strong className="text-emerald-600">2 usable hosts</strong>. Ideal for point-to-point links between two core routers, eliminating address wastage.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-xs font-mono">
            <span className="text-slate-500">Usable Efficiency:</span>
            <span className="text-amber-600 font-bold">50% (2 of 4)</span>
          </div>
        </div>

        {/* /27 Card */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow hover:card-shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-1 rounded bg-indigo-100 text-indigo-600 font-mono text-xs font-bold">
                /27 Prefix
              </span>
              <span className="text-xs font-mono text-slate-500">255.255.255.224</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Branch & Small Departments
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Provides 32 total IP addresses ($2^5$), yielding <strong className="text-emerald-600">30 usable hosts</strong>. Perfect for small department teams, remote office locations, or server racks.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-xs font-mono">
            <span className="text-slate-500">Usable Efficiency:</span>
            <span className="text-indigo-600 font-bold">93.75% (30 of 32)</span>
          </div>
        </div>

        {/* /24 Card */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-600 font-mono text-xs font-bold">
                /24 Prefix
              </span>
              <span className="text-xs font-mono text-slate-500">255.255.255.0</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Standard Building / LAN
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Provides 256 total IP addresses ($2^8$), yielding <strong className="text-emerald-600">254 usable hosts</strong>. Standard default allocation size for corporate office floors and DHCP user pools.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-xs font-mono">
            <span className="text-slate-500">Usable Efficiency:</span>
            <span className="text-emerald-600 font-bold">99.2% (254 of 256)</span>
          </div>
        </div>
      </div>

      {/* Worked Example Table */}
      <div className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Worked VLSM Example: Subnetting a 192.168.1.0/24 Block
            </h3>
            <p className="text-xs text-slate-500">
              Requirement: Allocate subnets for Engineering (50 hosts), Sales (25 hosts), Executive (10 hosts), and 2 Router Links.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded bg-white border border-slate-200 text-xs font-mono text-indigo-600">
            Rule: Always allocate largest requirements first!
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-slate-50 mb-6">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-white text-slate-500 border-b border-slate-200">
                <th className="p-3">Department</th>
                <th className="p-3">Needed Hosts</th>
                <th className="p-3">Allocated CIDR</th>
                <th className="p-3">Subnet Mask</th>
                <th className="p-3">Network Address</th>
                <th className="p-3">Usable Host Range</th>
                <th className="p-3">Broadcast Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d] text-slate-900">
              <tr className="hover:bg-white/50 transition-colors">
                <td className="p-3 font-bold text-indigo-600">Engineering</td>
                <td className="p-3">50 hosts</td>
                <td className="p-3 font-bold text-emerald-600">/26 (64 IPs)</td>
                <td className="p-3 text-slate-500">255.255.255.192</td>
                <td className="p-3 text-indigo-600">192.168.1.0</td>
                <td className="p-3">192.168.1.1 — 192.168.1.62</td>
                <td className="p-3 text-rose-600">192.168.1.63</td>
              </tr>
              <tr className="hover:bg-white/50 transition-colors">
                <td className="p-3 font-bold text-emerald-600">Sales</td>
                <td className="p-3">25 hosts</td>
                <td className="p-3 font-bold text-emerald-600">/27 (32 IPs)</td>
                <td className="p-3 text-slate-500">255.255.255.224</td>
                <td className="p-3 text-indigo-600">192.168.1.64</td>
                <td className="p-3">192.168.1.65 — 192.168.1.94</td>
                <td className="p-3 text-rose-600">192.168.1.95</td>
              </tr>
              <tr className="hover:bg-white/50 transition-colors">
                <td className="p-3 font-bold text-violet-600">Executive</td>
                <td className="p-3">10 hosts</td>
                <td className="p-3 font-bold text-emerald-600">/28 (16 IPs)</td>
                <td className="p-3 text-slate-500">255.255.255.240</td>
                <td className="p-3 text-indigo-600">192.168.1.96</td>
                <td className="p-3">192.168.1.97 — 192.168.1.110</td>
                <td className="p-3 text-rose-600">192.168.1.111</td>
              </tr>
              <tr className="hover:bg-white/50 transition-colors">
                <td className="p-3 font-bold text-amber-600">Router Link 1</td>
                <td className="p-3">2 hosts</td>
                <td className="p-3 font-bold text-emerald-600">/30 (4 IPs)</td>
                <td className="p-3 text-slate-500">255.255.255.252</td>
                <td className="p-3 text-indigo-600">192.168.1.112</td>
                <td className="p-3">192.168.1.113 — 192.168.1.114</td>
                <td className="p-3 text-rose-600">192.168.1.115</td>
              </tr>
              <tr className="hover:bg-white/50 transition-colors">
                <td className="p-3 font-bold text-amber-600">Router Link 2</td>
                <td className="p-3">2 hosts</td>
                <td className="p-3 font-bold text-emerald-600">/30 (4 IPs)</td>
                <td className="p-3 text-slate-500">255.255.255.252</td>
                <td className="p-3 text-indigo-600">192.168.1.116</td>
                <td className="p-3">192.168.1.117 — 192.168.1.118</td>
                <td className="p-3 text-rose-600">192.168.1.119</td>
              </tr>
              <tr className="hover:bg-white/50 transition-colors bg-white/30">
                <td className="p-3 font-bold text-slate-500">Unassigned Pool</td>
                <td className="p-3 text-slate-500">Future expansion</td>
                <td className="p-3 text-slate-500">136 IPs free</td>
                <td className="p-3 text-slate-500">Various</td>
                <td className="p-3 text-slate-500">192.168.1.120</td>
                <td className="p-3 text-slate-500">192.168.1.120 — 192.168.1.255</td>
                <td className="p-3 text-slate-500">192.168.1.255</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tree Allocation Visual Code Block */}
        <div className="rounded-xl bg-white border border-slate-200 card-shadow p-5">
          <div className="text-xs font-mono text-slate-500 mb-2 uppercase">
            Address Space Allocation Tree (192.168.1.0/24)
          </div>
          <pre className="font-mono text-xs text-emerald-600 bg-white p-4 rounded-lg border border-slate-200 overflow-x-auto">
{`192.168.1.0/24 (256 Total IPs)
├── 192.168.1.0/26   [Engineering: 50 hosts required, 62 usable (.1-.62)]
├── 192.168.1.64/27  [Sales:       25 hosts required, 30 usable (.65-.94)]
├── 192.168.1.96/28  [Executive:   10 hosts required, 14 usable (.97-.110)]
├── 192.168.1.112/30 [Router Link 1: 2 hosts required, 2 usable (.113-.114)]
├── 192.168.1.116/30 [Router Link 2: 2 hosts required, 2 usable (.117-.118)]
└── 192.168.1.120/24 [Reserved Future Allocation Pool: 136 IPs remaining]`}</pre>
        </div>
      </div>

      {/* RFC 3021 /31 Point-to-Point Explanation Card */}
      <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2.5 py-1 rounded bg-[#bc8cff]/20 text-violet-600 text-xs font-mono font-bold">
            RFC 3021 Standard
          </span>
          <h3 className="text-lg font-bold text-slate-900">
            /31 Subnet Prefixes on Point-to-Point Links
          </h3>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed mb-4">
          Under standard IPv4 rules, a <code className="text-amber-600">/30</code> subnet uses 4 addresses to supply only 2 usable host IPs (a 50% loss due to dedicated network and broadcast IPs). 
          <strong className="text-slate-900"> RFC 3021</strong> eliminates this waste by allowing <code className="text-emerald-600">/31</code> prefix masks on point-to-point links.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="text-rose-600 font-bold mb-1">Standard /30 Link (4 IPs):</div>
            <div className="text-slate-500">.0 (Network ID - Unusable)</div>
            <div className="text-emerald-600">.1 (Router A Interface)</div>
            <div className="text-emerald-600">.2 (Router B Interface)</div>
            <div className="text-slate-500">.3 (Broadcast - Unusable)</div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-emerald-400/40">
            <div className="text-emerald-600 font-bold mb-1">RFC 3021 /31 Link (2 IPs - 100% Efficient):</div>
            <div className="text-emerald-600">.0 (Router A Interface)</div>
            <div className="text-emerald-600">.1 (Router B Interface)</div>
            <div className="text-slate-500 mt-1 text-[11px] font-sans">
              No broadcast or network ID overhead required!
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
