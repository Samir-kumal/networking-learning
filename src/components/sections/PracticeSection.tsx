"use client";

import { useState } from "react";

interface Problem {
  id: number;
  title: string;
  badge: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Real-World";
  targetIp: string;
  question: string;
  summary: {
    networkAddress: string;
    subnetMask: string;
    firstUsable: string;
    lastUsable: string;
    broadcastAddress: string;
    usableHosts: string;
    extraNote?: string;
  };
  steps: {
    step: string;
    explanation: string;
  }[];
  subnetsTable?: {
    name: string;
    network: string;
    mask: string;
    range: string;
    broadcast: string;
    hosts: string;
  }[];
  scenarioAnalysis?: {
    pingStatus: "SUCCESS" | "FAIL";
    resultTitle: string;
    reasoning: string;
  };
}

export default function PracticeSection() {
  const [openState, setOpenState] = useState<Record<number, boolean>>({});

  const toggleProblem = (id: number) => {
    setOpenState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    setOpenState({ 1: true, 2: true, 3: true, 4: true, 5: true });
  };

  const collapseAll = () => {
    setOpenState({});
  };

  const problems: Problem[] = [
    {
      id: 1,
      title: "Problem 1: Basic Subnetting",
      badge: "172.16.5.0/24",
      difficulty: "Easy",
      targetIp: "172.16.5.0/24",
      question:
        "You are given the network address 172.16.5.0/24. Calculate the Network ID, Subnet Mask, First Usable Host IP, Last Usable Host IP, Broadcast Address, and Total Usable Hosts.",
      summary: {
        networkAddress: "172.16.5.0",
        subnetMask: "255.255.255.0",
        firstUsable: "172.16.5.1",
        lastUsable: "172.16.5.254",
        broadcastAddress: "172.16.5.255",
        usableHosts: "254",
      },
      steps: [
        {
          step: "1. Calculate Host & Network Bits",
          explanation:
            "A /24 prefix uses 24 bits for the network and leaves 8 bits for hosts (32 - 24 = 8 host bits). Total addresses = 2^8 = 256.",
        },
        {
          step: "2. Determine Subnet Mask",
          explanation:
            "24 network bits set to 1 in binary (11111111.11111111.11111111.00000000) yields the dotted decimal mask 255.255.255.0.",
        },
        {
          step: "3. Identify Host Boundary & Broadcast",
          explanation:
            "The network starts at 172.16.5.0. The first host is .1, the last host before broadcast is .254, and the broadcast address (all 8 host bits set to 1) is 172.16.5.255.",
        },
        {
          step: "4. Compute Usable Host Count",
          explanation:
            "Usable Hosts = 2^8 - 2 = 256 - 2 = 254 (subtracting Network .0 and Broadcast .255).",
        },
      ],
    },
    {
      id: 2,
      title: "Problem 2: Subnet Division",
      badge: "10.1.1.0/24 into 4 Subnets",
      difficulty: "Medium",
      targetIp: "10.1.1.0/24",
      question:
        "Divide the network 10.1.1.0/24 into 4 equal subnets. Determine the new CIDR prefix length, Subnet Mask, Block Size, and list each created subnet with its Network ID, Usable Range, and Broadcast Address.",
      summary: {
        networkAddress: "10.1.1.0/24",
        subnetMask: "255.255.255.192 (/26)",
        firstUsable: "Subnet 1: 10.1.1.1",
        lastUsable: "Subnet 4: 10.1.1.254",
        broadcastAddress: "Subnet 4: 10.1.1.255",
        usableHosts: "62 per subnet (248 total)",
        extraNote: "Borrowed 2 bits from host portion (2^2 = 4 subnets).",
      },
      steps: [
        {
          step: "1. Calculate Borrowed Bits & New Prefix",
          explanation:
            "To create 4 subnets, solve 2^n >= 4 => n = 2 bits. Add 2 borrowed bits to original /24 prefix: New Prefix = /26 (24 + 2).",
        },
        {
          step: "2. Derive Subnet Mask & Block Size",
          explanation:
            "A /26 mask has binary 11000000 in the 4th octet = 128 + 64 = 192. Dotted mask: 255.255.255.192. Block size = 256 - 192 = 64.",
        },
        {
          step: "3. List Subnet Increments",
          explanation:
            "Starting at 10.1.1.0, add block size of 64 for each network boundary: .0, .64, .128, .192.",
        },
      ],
      subnetsTable: [
        {
          name: "Subnet 1",
          network: "10.1.1.0/26",
          mask: "255.255.255.192",
          range: "10.1.1.1 – 10.1.1.62",
          broadcast: "10.1.1.63",
          hosts: "62",
        },
        {
          name: "Subnet 2",
          network: "10.1.1.64/26",
          mask: "255.255.255.192",
          range: "10.1.1.65 – 10.1.1.126",
          broadcast: "10.1.1.127",
          hosts: "62",
        },
        {
          name: "Subnet 3",
          network: "10.1.1.128/26",
          mask: "255.255.255.192",
          range: "10.1.1.129 – 10.1.1.190",
          broadcast: "10.1.1.191",
          hosts: "62",
        },
        {
          name: "Subnet 4",
          network: "10.1.1.192/26",
          mask: "255.255.255.192",
          range: "10.1.1.193 – 10.1.1.254",
          broadcast: "10.1.1.255",
          hosts: "62",
        },
      ],
    },
    {
      id: 3,
      title: "Problem 3: Find the Network",
      badge: "192.168.10.150/27",
      difficulty: "Medium",
      targetIp: "192.168.10.150/27",
      question:
        "An engineer discovers a workstation configured with IP address 192.168.10.150/27. Determine the Network ID, Subnet Mask, First & Last Usable Host IPs, and Broadcast Address for the subnet block it belongs to. Is 192.168.10.150 a valid host address?",
      summary: {
        networkAddress: "192.168.10.128/27",
        subnetMask: "255.255.255.224",
        firstUsable: "192.168.10.129",
        lastUsable: "192.168.10.158",
        broadcastAddress: "192.168.10.159",
        usableHosts: "30",
        extraNote: "192.168.10.150 is a VALID host IP within the .129–.158 usable range.",
      },
      steps: [
        {
          step: "1. Identify Subnet Mask & Magic Number",
          explanation:
            "A /27 prefix corresponds to mask 255.255.255.224 (224 = 128 + 64 + 32). The block size (Magic Number) is 256 - 224 = 32.",
        },
        {
          step: "2. Generate Subnet Boundaries",
          explanation:
            "Multiples of 32 in the 4th octet: 0, 32, 64, 96, 128, 160, 192, 224.",
        },
        {
          step: "3. Locate Target IP Range",
          explanation:
            "The host 4th octet value 150 falls between 128 and 159. Therefore, Network ID = 192.168.10.128/27.",
        },
        {
          step: "4. Verify Host Validity",
          explanation:
            "First Usable = 192.168.10.129, Last Usable = 192.168.10.158, Broadcast = 192.168.10.159. Since .150 falls between .129 and .158, it is a valid, assignable host address.",
        },
      ],
    },
    {
      id: 4,
      title: "Problem 4: VLSM Challenge",
      badge: "192.168.1.0/24 (WAN, Mkt, Fin)",
      difficulty: "Hard",
      targetIp: "192.168.1.0/24",
      question:
        "Given the single base network block 192.168.1.0/24, design a Variable Length Subnet Masking (VLSM) allocation for three subnets: Finance (25 hosts needed), Marketing (12 hosts needed), and WAN Link (2 hosts needed). Order from largest to smallest requirement to avoid address overlap.",
      summary: {
        networkAddress: "192.168.1.0/24 Base Block",
        subnetMask: "Varied (/27, /28, /30)",
        firstUsable: "Fin: .1, Mkt: .33, WAN: .49",
        lastUsable: "Fin: .30, Mkt: .46, WAN: .50",
        broadcastAddress: "Fin: .31, Mkt: .47, WAN: .51",
        usableHosts: "Finance: 30, Marketing: 14, WAN: 2",
        extraNote: "Remaining unallocated addresses: 192.168.1.52 to 192.168.1.255.",
      },
      steps: [
        {
          step: "1. Sort Requirements Largest to Smallest",
          explanation:
            "1. Finance: 25 hosts | 2. Marketing: 12 hosts | 3. WAN Link: 2 hosts. VLSM mandates allocating largest subnets first.",
        },
        {
          step: "2. Allocate Subnet 1 (Finance - 25 hosts)",
          explanation:
            "Needs 25 + 2 = 27 addresses. Next power of 2 is 32 (2^5). Host bits = 5 => Prefix = /27 (32-5). Subnet: 192.168.1.0/27. Mask: 255.255.255.224. Usable: .1 – .30, Broadcast: .31.",
        },
        {
          step: "3. Allocate Subnet 2 (Marketing - 12 hosts)",
          explanation:
            "Starts at next boundary 192.168.1.32. Needs 12 + 2 = 14 addresses. Next power of 2 is 16 (2^4). Host bits = 4 => Prefix = /28 (32-4). Subnet: 192.168.1.32/28. Mask: 255.255.255.240. Usable: .33 – .46, Broadcast: .47.",
        },
        {
          step: "4. Allocate Subnet 3 (WAN Link - 2 hosts)",
          explanation:
            "Starts at next boundary 192.168.1.48. Needs 2 + 2 = 4 addresses. Next power of 2 is 4 (2^2). Host bits = 2 => Prefix = /30 (32-2). Subnet: 192.168.1.48/30. Mask: 255.255.255.252. Usable: .49 – .50, Broadcast: .51.",
        },
      ],
      subnetsTable: [
        {
          name: "Finance Dept (25 hosts)",
          network: "192.168.1.0/27",
          mask: "255.255.255.224",
          range: "192.168.1.1 – 192.168.1.30",
          broadcast: "192.168.1.31",
          hosts: "30 usable (32 block)",
        },
        {
          name: "Marketing Dept (12 hosts)",
          network: "192.168.1.32/28",
          mask: "255.255.255.240",
          range: "192.168.1.33 – 192.168.1.46",
          broadcast: "192.168.1.47",
          hosts: "14 usable (16 block)",
        },
        {
          name: "WAN P2P Link (2 hosts)",
          network: "192.168.1.48/30",
          mask: "255.255.255.252",
          range: "192.168.1.49 – 192.168.1.50",
          broadcast: "192.168.1.51",
          hosts: "2 usable (4 block)",
        },
      ],
    },
    {
      id: 5,
      title: "Problem 5: Real-World Scenario",
      badge: "10.0.5.100/28 vs 10.0.5.113",
      difficulty: "Real-World",
      targetIp: "10.0.5.100/28",
      question:
        "A database server is assigned IP 10.0.5.100/28. A system administrator attempts to ping a default gateway at 10.0.5.113. Will this ping succeed directly on the local Layer 2 broadcast domain without passing through a router? Determine the exact subnet boundary for 10.0.5.100/28.",
      summary: {
        networkAddress: "Server Subnet: 10.0.5.96/28",
        subnetMask: "255.255.255.240",
        firstUsable: "10.0.5.97",
        lastUsable: "10.0.5.110",
        broadcastAddress: "10.0.5.111",
        usableHosts: "14 usable per block",
        extraNote: "Gateway IP 10.0.5.113 resides in next subnet block (10.0.5.112/28).",
      },
      steps: [
        {
          step: "1. Calculate Subnet Mask & Block Size",
          explanation:
            "A /28 prefix uses subnet mask 255.255.255.240. Block size = 256 - 240 = 16.",
        },
        {
          step: "2. Determine Server Subnet Range (10.0.5.100)",
          explanation:
            "Multiples of 16 in 4th octet: 0, 16, 32, 48, 64, 80, 96, 112. The value 100 lies between 96 and 111. Server Subnet ID = 10.0.5.96/28. Usable Range = 10.0.5.97 to 10.0.5.110. Broadcast = 10.0.5.111.",
        },
        {
          step: "3. Locate Gateway IP (10.0.5.113)",
          explanation:
            "The gateway IP 10.0.5.113 falls in the NEXT subnet block 10.0.5.112/28 (Network: 10.0.5.112, Usable: 10.0.5.113 to 10.0.5.126).",
        },
        {
          step: "4. Layer 2 Connectivity Analysis",
          explanation:
            "Because 10.0.5.100 and 10.0.5.113 belong to distinct broadcast domains, direct L2 ARP resolution will fail for local delivery. Communication requires a router configured between 10.0.5.96/28 and 10.0.5.112/28.",
        },
      ],
      scenarioAnalysis: {
        pingStatus: "FAIL",
        resultTitle: "DIRECT LAYER 2 PING FAILS — DIFFERENT SUBNET BOUNDARIES",
        reasoning:
          "The server (10.0.5.100/28) belongs to subnet 10.0.5.96/28 (usable host range .97 to .110). The target gateway address (10.0.5.113) belongs to subnet 10.0.5.112/28 (usable host range .113 to .126). Without inter-subnet routing, direct Layer 2 Ethernet delivery cannot take place.",
      },
    },
  ];

  const getDifficultyBadgeClass = (diff: Problem["difficulty"]) => {
    switch (diff) {
      case "Easy":
        return "bg-[#7ee787]/10 text-[#7ee787] border-[#7ee787]/30";
      case "Medium":
        return "bg-[#58a6ff]/10 text-[#58a6ff] border-[#58a6ff]/30";
      case "Hard":
        return "bg-[#f0883e]/10 text-[#f0883e] border-[#f0883e]/30";
      case "Real-World":
        return "bg-[#d2a8ff]/10 text-[#d2a8ff] border-[#d2a8ff]/30";
      default:
        return "bg-[#58a6ff]/10 text-[#58a6ff] border-[#58a6ff]/30";
    }
  };

  return (
    <section
      id="practice"
      className="scroll-mt-24 rounded-2xl bg-[#161b22] border border-[#30363d] p-6 sm:p-8 transition-colors hover:border-[#58a6ff]/40"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-md bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20 text-xs font-mono font-semibold">
            #practice
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#e6edf3]">
            14. Practice Problems
          </h2>
        </div>

        {/* Global Expand/Collapse Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 rounded-lg bg-[#21262d] border border-[#30363d] text-xs font-medium text-[#e6edf3] hover:border-[#58a6ff]/50 hover:bg-[#30363d] transition-all"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 rounded-lg bg-[#21262d] border border-[#30363d] text-xs font-medium text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#30363d] transition-all"
          >
            Collapse All
          </button>
        </div>
      </div>

      <p className="text-[#8b949e] text-base leading-relaxed mb-8 max-w-4xl">
        Master subnetting with real-world scenarios and certification-style drill questions. Test your calculations for network boundaries, host ranges, broadcast addresses, and VLSM allocations, then toggle answers to verify your steps.
      </p>

      {/* Cards Container */}
      <div className="space-y-6">
        {problems.map((prob) => {
          const isOpen = !!openState[prob.id];

          return (
            <div
              key={prob.id}
              className={`rounded-xl border transition-all ${
                isOpen
                  ? "bg-[#1c2333] border-[#58a6ff]/50 shadow-lg shadow-[#58a6ff]/5"
                  : "bg-[#161b22] border-[#30363d] hover:border-[#30363d]/80"
              }`}
            >
              {/* Question Header */}
              <div className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${getDifficultyBadgeClass(
                        prob.difficulty
                      )}`}
                    >
                      {prob.difficulty}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-[#0d1117] border border-[#30363d] font-mono text-xs text-[#58a6ff]">
                      {prob.badge}
                    </span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-[#e6edf3] mb-2">
                  {prob.title}
                </h3>
                <p className="text-[#8b949e] text-sm sm:text-base leading-relaxed mb-4">
                  {prob.question}
                </p>

                {/* Reveal Answer Toggle Button */}
                <button
                  onClick={() => toggleProblem(prob.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isOpen
                      ? "bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/40"
                      : "bg-[#21262d] text-[#e6edf3] border border-[#30363d] hover:border-[#58a6ff]/40 hover:bg-[#30363d]"
                  }`}
                >
                  <span>{isOpen ? "Hide Answer" : "Reveal Answer"}</span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>

              {/* Accordion Solution Content */}
              {isOpen && (
                <div className="border-t border-[#30363d] p-6 bg-[#0d1117]/80 rounded-b-xl space-y-6">
                  {/* Scenario Banner if applicable */}
                  {prob.scenarioAnalysis && (
                    <div
                      className={`p-4 rounded-xl border ${
                        prob.scenarioAnalysis.pingStatus === "FAIL"
                          ? "bg-[#ff7b72]/10 border-[#ff7b72]/30 text-[#ff7b72]"
                          : "bg-[#7ee787]/10 border-[#7ee787]/30 text-[#7ee787]"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-sm mb-1">
                        <span>{prob.scenarioAnalysis.pingStatus === "FAIL" ? "❌" : "✅"}</span>
                        <span>{prob.scenarioAnalysis.resultTitle}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#e6edf3]/90 leading-relaxed">
                        {prob.scenarioAnalysis.reasoning}
                      </p>
                    </div>
                  )}

                  {/* Summary Key-Value Cards */}
                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-bold text-[#8b949e] mb-3">
                      Key Network Parameters
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-lg">
                        <div className="text-[11px] text-[#8b949e] uppercase font-semibold">
                          Network ID
                        </div>
                        <div className="text-xs font-mono font-bold text-[#58a6ff] truncate mt-1">
                          {prob.summary.networkAddress}
                        </div>
                      </div>

                      <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-lg">
                        <div className="text-[11px] text-[#8b949e] uppercase font-semibold">
                          Subnet Mask
                        </div>
                        <div className="text-xs font-mono font-bold text-[#e6edf3] truncate mt-1">
                          {prob.summary.subnetMask}
                        </div>
                      </div>

                      <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-lg">
                        <div className="text-[11px] text-[#8b949e] uppercase font-semibold">
                          First Usable
                        </div>
                        <div className="text-xs font-mono font-bold text-[#7ee787] truncate mt-1">
                          {prob.summary.firstUsable}
                        </div>
                      </div>

                      <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-lg">
                        <div className="text-[11px] text-[#8b949e] uppercase font-semibold">
                          Last Usable
                        </div>
                        <div className="text-xs font-mono font-bold text-[#7ee787] truncate mt-1">
                          {prob.summary.lastUsable}
                        </div>
                      </div>

                      <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-lg">
                        <div className="text-[11px] text-[#8b949e] uppercase font-semibold">
                          Broadcast IP
                        </div>
                        <div className="text-xs font-mono font-bold text-[#ff7b72] truncate mt-1">
                          {prob.summary.broadcastAddress}
                        </div>
                      </div>

                      <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-lg">
                        <div className="text-[11px] text-[#8b949e] uppercase font-semibold">
                          Usable Hosts
                        </div>
                        <div className="text-xs font-mono font-bold text-[#d2a8ff] truncate mt-1">
                          {prob.summary.usableHosts}
                        </div>
                      </div>
                    </div>

                    {prob.summary.extraNote && (
                      <p className="text-xs text-[#58a6ff] mt-2 font-mono italic">
                        * {prob.summary.extraNote}
                      </p>
                    )}
                  </div>

                  {/* Subnets Breakdown Table if present */}
                  {prob.subnetsTable && (
                    <div>
                      <h4 className="text-xs uppercase tracking-wider font-bold text-[#8b949e] mb-3">
                        Subnet Allocation Breakdown
                      </h4>
                      <div className="overflow-x-auto rounded-lg border border-[#30363d]">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-[#161b22] text-[#8b949e] border-b border-[#30363d]">
                            <tr>
                              <th className="p-3">Subnet / Name</th>
                              <th className="p-3">Network Address</th>
                              <th className="p-3">Subnet Mask</th>
                              <th className="p-3">Usable Range</th>
                              <th className="p-3">Broadcast</th>
                              <th className="p-3">Hosts</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#30363d] bg-[#0d1117]">
                            {prob.subnetsTable.map((sub, idx) => (
                              <tr key={idx} className="hover:bg-[#161b22]/50">
                                <td className="p-3 font-bold text-[#e6edf3]">
                                  {sub.name}
                                </td>
                                <td className="p-3 text-[#58a6ff]">{sub.network}</td>
                                <td className="p-3 text-[#8b949e]">{sub.mask}</td>
                                <td className="p-3 text-[#7ee787]">{sub.range}</td>
                                <td className="p-3 text-[#ff7b72]">{sub.broadcast}</td>
                                <td className="p-3 text-[#d2a8ff]">{sub.hosts}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Step-by-Step Solution Breakdown */}
                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-bold text-[#8b949e] mb-3">
                      Step-by-Step Calculation Rationale
                    </h4>
                    <div className="space-y-3">
                      {prob.steps.map((st, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]"
                        >
                          <div className="text-xs font-bold text-[#58a6ff] mb-1">
                            {st.step}
                          </div>
                          <div className="text-xs sm:text-sm text-[#8b949e] leading-relaxed">
                            {st.explanation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
