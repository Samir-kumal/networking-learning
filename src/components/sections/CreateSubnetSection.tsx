"use client";

import { useState } from "react";

export default function CreateSubnetSection() {
  const [activeOsTab, setActiveOsTab] = useState<"windows" | "linux">("windows");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Clipboard access may be unavailable or denied; do not report a false success.
    }
  };

  const ciscoCode = `! Step 2: Configure Router Sub-Interfaces (Router-on-a-Stick)
interface GigabitEthernet0/0.10
 description LAN_Subnet_Staff
 encapsulation dot1Q 10
 ip address 192.168.10.1 255.255.255.0
 no shutdown
!
interface GigabitEthernet0/0.20
 description LAN_Subnet_Guest
 encapsulation dot1Q 20
 ip address 192.168.20.1 255.255.255.0
 no shutdown`;

  const windowsCode = `# Assign Static IP & Netmask on Windows via Netsh
netsh interface ip set address name="Ethernet" static 192.168.10.50 255.255.255.0 192.168.10.1

# Configure Primary DNS Server
netsh interface ip set dns name="Ethernet" static 1.1.1.1`;

  const linuxCode = `# Assign Static IP with CIDR Notation on Linux
sudo ip addr add 192.168.10.50/24 dev eth0

# Bring the interface UP
sudo ip link set eth0 up

# Configure Default Router Gateway
sudo ip route add default via 192.168.10.1 dev eth0`;

  const testCode = `# 1. Verify Gateway Reachability
ping 192.168.10.1

# 2. Test Inter-Subnet Routing to Guest Subnet
ping 192.168.20.50

# 3. Trace Route Path across Gateway (Windows / Linux)
tracert 192.168.20.50   # Windows
traceroute 192.168.20.50 # Linux / macOS`;

  return (
    <section
      id="create"
      className="scroll-mt-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 text-[11px] font-semibold">
          #create
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
          <span className="text-indigo-500 dark:text-indigo-400" aria-hidden="true">⊞</span>
          5. Creating Subnets on Your Local Network
        </h2>
      </div>

      <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed mb-8 max-w-4xl">
        Building custom subnets on a local area network requires methodical planning and accurate configuration across your gateway router, managed switches, and endpoint operating systems. Follow this 4-step workflow to partition and verify your subnets.
      </p>

      {/* 4 Numbered Step Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* STEP 1 */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow flex flex-col justify-between hover:border-indigo-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-sm flex items-center justify-center border border-indigo-200 dark:border-indigo-700">
                01
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700">
                Architecture & Sizing
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Step 1: Plan Address Space & CIDR Blocks
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Select a private RFC 1918 base network (e.g. <code className="text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-700 px-1 py-0.5 rounded font-mono text-xs">192.168.0.0/16</code>) and divide it into subnets based on required host capacity and isolation goals.
            </p>

            <div className="space-y-2 text-xs font-mono bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                <span className="text-emerald-600 dark:text-emerald-400">VLAN 10 (Staff):</span>
                <span>192.168.10.0/24 (254 hosts)</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5 pt-0.5">
                <span className="text-amber-600 dark:text-amber-400">VLAN 20 (Guest):</span>
                <span>192.168.20.0/24 (254 hosts)</span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span className="text-[#d2a8ff]">VLAN 30 (Servers):</span>
                <span>192.168.30.0/28 (14 hosts)</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            💡 In this example, .0 is the network address, .1 is chosen as a gateway convention, and .255 is the directed-broadcast address for a /24. Actual gateway selection and address reservations depend on the platform and design.
          </div>
        </div>

        {/* STEP 2 */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow flex flex-col justify-between hover:border-indigo-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-sm flex items-center justify-center border border-emerald-200 dark:border-emerald-700">
                02
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700">
                Cisco IOS / Switch Config
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Step 2: Configure Router/Switch Gateways
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
              Configure 802.1Q sub-interfaces on your router (Router-on-a-Stick) or SVIs on a Layer 3 switch to act as default gateways.
            </p>

            <div className="relative">
              <pre className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-3 font-mono text-xs text-slate-900 dark:text-slate-100 overflow-x-auto leading-relaxed">
                {ciscoCode}
              </pre>
              <button
                onClick={() => handleCopy(ciscoCode, 2)}
                className="absolute top-2 right-2 px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-white dark:text-slate-100 hover:text-white rounded text-xs transition-colors border border-slate-200 dark:border-slate-700"
              >
                {copiedIndex === 2 ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        {/* STEP 3 */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow flex flex-col justify-between hover:border-indigo-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="w-8 h-8 rounded-lg bg-[#ffa657]/20 text-amber-600 dark:text-amber-400 font-mono font-bold text-sm flex items-center justify-center border border-amber-200 dark:border-amber-700">
                03
              </span>
              <div className="flex gap-1 bg-slate-50 dark:bg-slate-700 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setActiveOsTab("windows")}
                  className={`px-2.5 py-0.5 rounded text-xs font-mono transition-colors ${
                    activeOsTab === "windows"
                      ? "bg-indigo-600 text-black font-semibold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100"
                  }`}
                >
                  Windows (netsh)
                </button>
                <button
                  onClick={() => setActiveOsTab("linux")}
                  className={`px-2.5 py-0.5 rounded text-xs font-mono transition-colors ${
                    activeOsTab === "linux"
                      ? "bg-emerald-500 text-black font-semibold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100"
                  }`}
                >
                  Linux (ip)
                </button>
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Step 3: Assign IP Addresses to Host Interfaces
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
              Configure static IP address parameters, netmasks, and default gateways directly on host machines via OS CLI tools.
            </p>

            <div className="relative">
              <pre className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-3 font-mono text-xs text-slate-900 dark:text-slate-100 overflow-x-auto leading-relaxed">
                {activeOsTab === "windows" ? windowsCode : linuxCode}
              </pre>
              <button
                onClick={() => handleCopy(activeOsTab === "windows" ? windowsCode : linuxCode, 3)}
                className="absolute top-2 right-2 px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-white dark:text-slate-100 hover:text-white rounded text-xs transition-colors border border-slate-200 dark:border-slate-700"
              >
                {copiedIndex === 3 ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        {/* STEP 4 */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow flex flex-col justify-between hover:border-indigo-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="w-8 h-8 rounded-lg bg-[#d2a8ff]/20 text-[#d2a8ff] font-mono font-bold text-sm flex items-center justify-center border border-[#d2a8ff]/30">
                04
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700">
                ICMP & Diagnostics
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Step 4: Verify & Test Inter-Subnet Routing
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
              Confirm local gateway reachability, test cross-subnet packet forwarding, and inspect hop pathways using standard diagnostic utilities.
            </p>

            <div className="relative">
              <pre className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-3 font-mono text-xs text-slate-900 dark:text-slate-100 overflow-x-auto leading-relaxed">
                {testCode}
              </pre>
              <button
                onClick={() => handleCopy(testCode, 4)}
                className="absolute top-2 right-2 px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-white dark:text-slate-100 hover:text-white rounded text-xs transition-colors border border-slate-200 dark:border-slate-700"
              >
                {copiedIndex === 4 ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
