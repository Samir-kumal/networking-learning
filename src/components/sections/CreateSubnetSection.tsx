"use client";

import { useState } from "react";

export default function CreateSubnetSection() {
  const [activeOsTab, setActiveOsTab] = useState<"windows" | "linux">("windows");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
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
      className="scroll-mt-24 rounded-2xl bg-[#161b22] border border-[#30363d] p-6 sm:p-8 transition-colors hover:border-[#58a6ff]/40"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-md bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20 text-xs font-mono font-semibold">
          #create
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#e6edf3]">
          9. Creating Subnets on Your Local Network
        </h2>
      </div>

      <p className="text-[#8b949e] text-base leading-relaxed mb-8 max-w-4xl">
        Building custom subnets on a local area network requires methodical planning and accurate configuration across your gateway router, managed switches, and endpoint operating systems. Follow this 4-step workflow to partition and verify your subnets.
      </p>

      {/* 4 Numbered Step Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* STEP 1 */}
        <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-6 flex flex-col justify-between hover:border-[#58a6ff]/40 transition-all">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="w-8 h-8 rounded-lg bg-[#58a6ff]/20 text-[#58a6ff] font-mono font-bold text-sm flex items-center justify-center border border-[#58a6ff]/30">
                01
              </span>
              <span className="text-xs font-mono text-[#8b949e] bg-[#0d1117] px-2.5 py-1 rounded border border-[#30363d]">
                Architecture & Sizing
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#e6edf3] mb-2">
              Step 1: Plan Address Space & CIDR Blocks
            </h3>
            <p className="text-sm text-[#8b949e] leading-relaxed mb-4">
              Select a private RFC 1918 base network (e.g. <code className="text-[#58a6ff] bg-[#0d1117] px-1 py-0.5 rounded font-mono text-xs">192.168.0.0/16</code>) and divide it into subnets based on required host capacity and isolation goals.
            </p>

            <div className="space-y-2 text-xs font-mono bg-[#0d1117] p-3 rounded-lg border border-[#30363d] text-[#e6edf3]">
              <div className="flex justify-between border-b border-[#30363d] pb-1.5">
                <span className="text-[#7ee787]">VLAN 10 (Staff):</span>
                <span>192.168.10.0/24 (254 hosts)</span>
              </div>
              <div className="flex justify-between border-b border-[#30363d] pb-1.5 pt-0.5">
                <span className="text-[#ffa657]">VLAN 20 (Guest):</span>
                <span>192.168.20.0/24 (254 hosts)</span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span className="text-[#d2a8ff]">VLAN 30 (Servers):</span>
                <span>192.168.30.0/28 (14 hosts)</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#30363d] text-xs text-[#8b949e]">
            💡 Always reserve <code className="text-[#e6edf3]">.0</code> (Network), <code className="text-[#e6edf3]">.1</code> (Default Gateway), and <code className="text-[#e6edf3]">.255</code> (Broadcast).
          </div>
        </div>

        {/* STEP 2 */}
        <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-6 flex flex-col justify-between hover:border-[#58a6ff]/40 transition-all">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="w-8 h-8 rounded-lg bg-[#7ee787]/20 text-[#7ee787] font-mono font-bold text-sm flex items-center justify-center border border-[#7ee787]/30">
                02
              </span>
              <span className="text-xs font-mono text-[#8b949e] bg-[#0d1117] px-2.5 py-1 rounded border border-[#30363d]">
                Cisco IOS / Switch Config
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#e6edf3] mb-2">
              Step 2: Configure Router/Switch Gateways
            </h3>
            <p className="text-sm text-[#8b949e] leading-relaxed mb-3">
              Configure 802.1Q sub-interfaces on your router (Router-on-a-Stick) or SVIs on a Layer 3 switch to act as default gateways.
            </p>

            <div className="relative">
              <pre className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 font-mono text-xs text-[#e6edf3] overflow-x-auto leading-relaxed">
                {ciscoCode}
              </pre>
              <button
                onClick={() => handleCopy(ciscoCode, 2)}
                className="absolute top-2 right-2 px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#e6edf3] rounded text-xs transition-colors border border-[#30363d]"
              >
                {copiedIndex === 2 ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        {/* STEP 3 */}
        <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-6 flex flex-col justify-between hover:border-[#58a6ff]/40 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="w-8 h-8 rounded-lg bg-[#ffa657]/20 text-[#ffa657] font-mono font-bold text-sm flex items-center justify-center border border-[#ffa657]/30">
                03
              </span>
              <div className="flex gap-1 bg-[#0d1117] p-1 rounded-lg border border-[#30363d]">
                <button
                  onClick={() => setActiveOsTab("windows")}
                  className={`px-2.5 py-0.5 rounded text-xs font-mono transition-colors ${
                    activeOsTab === "windows"
                      ? "bg-[#58a6ff] text-black font-semibold"
                      : "text-[#8b949e] hover:text-[#e6edf3]"
                  }`}
                >
                  Windows (netsh)
                </button>
                <button
                  onClick={() => setActiveOsTab("linux")}
                  className={`px-2.5 py-0.5 rounded text-xs font-mono transition-colors ${
                    activeOsTab === "linux"
                      ? "bg-[#7ee787] text-black font-semibold"
                      : "text-[#8b949e] hover:text-[#e6edf3]"
                  }`}
                >
                  Linux (ip)
                </button>
              </div>
            </div>
            <h3 className="text-lg font-bold text-[#e6edf3] mb-2">
              Step 3: Assign IP Addresses to Host Interfaces
            </h3>
            <p className="text-sm text-[#8b949e] leading-relaxed mb-3">
              Configure static IP address parameters, netmasks, and default gateways directly on host machines via OS CLI tools.
            </p>

            <div className="relative">
              <pre className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 font-mono text-xs text-[#e6edf3] overflow-x-auto leading-relaxed">
                {activeOsTab === "windows" ? windowsCode : linuxCode}
              </pre>
              <button
                onClick={() => handleCopy(activeOsTab === "windows" ? windowsCode : linuxCode, 3)}
                className="absolute top-2 right-2 px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#e6edf3] rounded text-xs transition-colors border border-[#30363d]"
              >
                {copiedIndex === 3 ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        {/* STEP 4 */}
        <div className="rounded-xl bg-[#1c2333] border border-[#30363d] p-6 flex flex-col justify-between hover:border-[#58a6ff]/40 transition-all">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="w-8 h-8 rounded-lg bg-[#d2a8ff]/20 text-[#d2a8ff] font-mono font-bold text-sm flex items-center justify-center border border-[#d2a8ff]/30">
                04
              </span>
              <span className="text-xs font-mono text-[#8b949e] bg-[#0d1117] px-2.5 py-1 rounded border border-[#30363d]">
                ICMP & Diagnostics
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#e6edf3] mb-2">
              Step 4: Verify & Test Inter-Subnet Routing
            </h3>
            <p className="text-sm text-[#8b949e] leading-relaxed mb-3">
              Confirm local gateway reachability, test cross-subnet packet forwarding, and inspect hop pathways using standard diagnostic utilities.
            </p>

            <div className="relative">
              <pre className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 font-mono text-xs text-[#e6edf3] overflow-x-auto leading-relaxed">
                {testCode}
              </pre>
              <button
                onClick={() => handleCopy(testCode, 4)}
                className="absolute top-2 right-2 px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#e6edf3] rounded text-xs transition-colors border border-[#30363d]"
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
