"use client";

import NetworkingModuleHeader from "@/components/networking/NetworkingModuleHeader";
import NetworkingPanel from "@/components/networking/NetworkingPanel";
import NetworkingExample from "@/components/networking/NetworkingExample";
import NetworkingTable from "@/components/networking/NetworkingTable";
import { useState } from "react";

interface PrefixRow {
  cidr: string;
  mask: string;
  totalHosts: string;
  usableHosts: string;
  blockSize: string;
  interestingOctet: string;
  useCase: string;
  badge?: string;
  highlight?: boolean;
}

export default function CheatSheetSection() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(id);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Clipboard access may be unavailable or denied; do not report a false success.
    }
  };

  const coreFormulas = [
    {
      id: "total-ips",
      title: "Total IP Addresses",
      formula: "2^(32 - CIDR) = 2^H",
      example: "For /24: 32 - 24 = 8 host bits => 2^8 = 256 IPs",
      description: "Calculates total raw IP addresses in block including network & broadcast.",
    },
    {
      id: "usable-hosts",
      title: "Usable Host Count",
      formula: "2^H - 2 (conventional IPv4 subnet, H >= 2)",
      example: "For /24: 256 - 2 = 254 conventional usable host addresses",
      description: "Subtracts the conventional network and directed-broadcast addresses; /31 point-to-point and /32 host routes use special semantics.",
    },
    {
      id: "block-size",
      title: "Block Size (Magic Number)",
      formula: "256 - Mask Octet  OR  2^H (in target octet)",
      example: "Mask 255.255.255.224 => 256 - 224 = 32 increment step",
      description: "Determines the exact step size between adjacent network boundaries.",
    },
    {
      id: "wildcard-mask",
      title: "Wildcard Mask (Inverse)",
      formula: "255.255.255.255 - Subnet Mask",
      example: "255.255.255.255 - 255.255.255.240 = 0.0.0.15",
      description: "Used in Cisco Access Control Lists (ACLs) and OSPF network commands.",
    },
    {
      id: "net-address",
      title: "Network Address",
      formula: "IP Address  AND  Subnet Mask",
      example: "192.168.10.150 AND 255.255.255.224 = 192.168.10.128",
      description: "Performs bitwise AND matching between IP address and subnet mask.",
    },
    {
      id: "bcast-address",
      title: "Broadcast Address",
      formula: "Network Address + (Block Size - 1)",
      example: "192.168.10.128 + (32 - 1) = 192.168.10.159",
      description: "Last address in the subnet block where all host bits equal binary 1.",
    },
    {
      id: "first-usable",
      title: "First Usable Host",
      formula: "Network Address + 1",
      example: "192.168.10.128 + 1 = 192.168.10.129",
      description: "First assignable IP address for network interfaces/endpoints.",
    },
    {
      id: "last-usable",
      title: "Last Usable Host",
      formula: "Broadcast Address - 1",
      example: "192.168.10.159 - 1 = 192.168.10.158",
      description: "Final assignable IP address before the broadcast boundary.",
    },
    {
      id: "subnets-created",
      title: "Subnets Created",
      formula: "2^(Borrowed Bits)",
      example: "Borrow 3 bits from /24 => 2^3 = 8 subnets (/27)",
      description: "Calculates total equal subnets created when extending network prefix.",
    },
  ];

  const prefixData: PrefixRow[] = [
    {
      cidr: "/8",
      mask: "255.0.0.0",
      totalHosts: "16,777,216",
      usableHosts: "16,777,214",
      blockSize: "256 (Octet 1)",
      interestingOctet: "Octet 1",
      useCase: "Historic classful /8 boundary; modern networks use CIDR",
      badge: "Historic Class A",
      highlight: true,
    },
    {
      cidr: "/9",
      mask: "255.128.0.0",
      totalHosts: "8,388,608",
      usableHosts: "8,388,606",
      blockSize: "128 (Octet 2)",
      interestingOctet: "Octet 2",
      useCase: "Telco Backbones & Regional Supernets",
    },
    {
      cidr: "/10",
      mask: "255.192.0.0",
      totalHosts: "4,194,304",
      usableHosts: "4,194,302",
      blockSize: "64 (Octet 2)",
      interestingOctet: "Octet 2",
      useCase: "Carrier-Grade NAT (CGNAT 100.64.0.0/10)",
    },
    {
      cidr: "/11",
      mask: "255.224.0.0",
      totalHosts: "2,097,152",
      usableHosts: "2,097,150",
      blockSize: "32 (Octet 2)",
      interestingOctet: "Octet 2",
      useCase: "Large Enterprise Data Centers",
    },
    {
      cidr: "/12",
      mask: "255.240.0.0",
      totalHosts: "1,048,576",
      usableHosts: "1,048,574",
      blockSize: "16 (Octet 2)",
      interestingOctet: "Octet 2",
      useCase: "Cloud VPC Private Allocations (RFC 1918 172.16.0.0/12)",
      highlight: true,
    },
    {
      cidr: "/13",
      mask: "255.248.0.0",
      totalHosts: "524,288",
      usableHosts: "524,286",
      blockSize: "8 (Octet 2)",
      interestingOctet: "Octet 2",
      useCase: "Multi-Region Cloud Supernets",
    },
    {
      cidr: "/14",
      mask: "255.252.0.0",
      totalHosts: "262,144",
      usableHosts: "262,142",
      blockSize: "4 (Octet 2)",
      interestingOctet: "Octet 2",
      useCase: "Large Service Provider Blocks",
    },
    {
      cidr: "/15",
      mask: "255.254.0.0",
      totalHosts: "131,072",
      usableHosts: "131,070",
      blockSize: "2 (Octet 2)",
      interestingOctet: "Octet 2",
      useCase: "Regional Metro Networks",
    },
    {
      cidr: "/16",
      mask: "255.255.0.0",
      totalHosts: "65,536",
      usableHosts: "65,534",
      blockSize: "1 (Octet 2) / 256 (Octet 3)",
      interestingOctet: "Octet 2",
      useCase: "Historic classful /16 boundary; a /16 can still be chosen by design",
      badge: "Historic Class B",
    },
    {
      cidr: "/17",
      mask: "255.255.128.0",
      totalHosts: "32,768",
      usableHosts: "32,766",
      blockSize: "128 (Octet 3)",
      interestingOctet: "Octet 3",
      useCase: "University & Large Campus LANs",
    },
    {
      cidr: "/18",
      mask: "255.255.192.0",
      totalHosts: "16,384",
      usableHosts: "16,382",
      blockSize: "64 (Octet 3)",
      interestingOctet: "Octet 3",
      useCase: "Enterprise Office Hubs",
    },
    {
      cidr: "/19",
      mask: "255.255.224.0",
      totalHosts: "8,192",
      usableHosts: "8,190",
      blockSize: "32 (Octet 3)",
      interestingOctet: "Octet 3",
      useCase: "Regional Corporate Buildings",
    },
    {
      cidr: "/20",
      mask: "255.255.240.0",
      totalHosts: "4,096",
      usableHosts: "4,094",
      blockSize: "16 (Octet 3)",
      interestingOctet: "Octet 3",
      useCase: "Example cloud or campus allocation; provider limits vary",
    },
    {
      cidr: "/21",
      mask: "255.255.248.0",
      totalHosts: "2,048",
      usableHosts: "2,046",
      blockSize: "8 (Octet 3)",
      interestingOctet: "Octet 3",
      useCase: "Large Office Campus Subnets",
    },
    {
      cidr: "/22",
      mask: "255.255.252.0",
      totalHosts: "1,024",
      usableHosts: "1,022",
      blockSize: "4 (Octet 3)",
      interestingOctet: "Octet 3",
      useCase: "Example Kubernetes node or Pod allocation; CNI and cluster sizing vary",
    },
    {
      cidr: "/23",
      mask: "255.255.254.0",
      totalHosts: "512",
      usableHosts: "510",
      blockSize: "2 (Octet 3)",
      interestingOctet: "Octet 3",
      useCase: "Medium Branch Office Networks",
    },
    {
      cidr: "/24",
      mask: "255.255.255.0",
      totalHosts: "256",
      usableHosts: "254",
      blockSize: "1 (Octet 3) / 256 (Octet 4)",
      interestingOctet: "Octet 3",
      useCase: "Historic classful /24 boundary; common LAN example today",
      badge: "Historic Class C",
    },
    {
      cidr: "/25",
      mask: "255.255.255.128",
      totalHosts: "128",
      usableHosts: "126",
      blockSize: "128 (Octet 4)",
      interestingOctet: "Octet 4",
      useCase: "Half /24 Subnet / Office Department",
    },
    {
      cidr: "/26",
      mask: "255.255.255.192",
      totalHosts: "64",
      usableHosts: "62",
      blockSize: "64 (Octet 4)",
      interestingOctet: "Octet 4",
      useCase: "Standard Corporate Department Subnet",
    },
    {
      cidr: "/27",
      mask: "255.255.255.224",
      totalHosts: "32",
      usableHosts: "30",
      blockSize: "32 (Octet 4)",
      interestingOctet: "Octet 4",
      useCase: "Small Team Subnet / Wireless Segment",
      badge: "Popular",
    },
    {
      cidr: "/28",
      mask: "255.255.255.240",
      totalHosts: "16",
      usableHosts: "14",
      blockSize: "16 (Octet 4)",
      interestingOctet: "Octet 4",
      useCase: "Server Rack / Database Cluster",
    },
    {
      cidr: "/29",
      mask: "255.255.255.248",
      totalHosts: "8",
      usableHosts: "6",
      blockSize: "8 (Octet 4)",
      interestingOctet: "Octet 4",
      useCase: "Small infrastructure segment or virtual-router example",
    },
    {
      cidr: "/30",
      mask: "255.255.255.252",
      totalHosts: "4",
      usableHosts: "2",
      blockSize: "4 (Octet 4)",
      interestingOctet: "Octet 4",
      useCase: "Traditional Point-to-Point Router Link (2 Usable / 2 Reserved)",
      badge: "Legacy P2P",
      highlight: true,
    },
    {
      cidr: "/31",
      mask: "255.255.255.254",
      totalHosts: "2",
      usableHosts: "2",
      blockSize: "2 (Octet 4)",
      interestingOctet: "Octet 4",
      useCase: "Point-to-Point Link (RFC 3021 - 0 Network/Broadcast Overhead)",
      badge: "RFC 3021",
      highlight: true,
    },
    {
      cidr: "/32",
      mask: "255.255.255.255",
      totalHosts: "1",
      usableHosts: "1",
      blockSize: "1 (Octet 4)",
      interestingOctet: "Octet 4",
      useCase: "Host route, loopback interface, or single-address policy object",
      badge: "Host Route",
      highlight: true,
    },
  ];

  const filteredPrefixes = prefixData.filter((item) => {
    const matchesSearch =
      item.cidr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.mask.includes(searchQuery) ||
      item.useCase.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterCategory === "common") {
      return ["/8", "/16", "/24", "/27", "/30", "/31", "/32"].includes(item.cidr);
    }
    if (filterCategory === "p2p") {
      return ["/30", "/31", "/32"].includes(item.cidr);
    }
    if (filterCategory === "octet4") {
      return item.interestingOctet === "Octet 4";
    }

    return true;
  });

  const mentalMathTricks = [
    {
      title: "1. The Magic 256 Rule",
      icon: "🪄",
      badge: "Step Size",
      tagline: "Instant Subnet Increment Step",
      description:
        "Subtract the non-255 subnet mask octet from 256 to calculate the exact block size (subnet increment) in seconds.",
      formulaSnippet: "Block Size = 256 - (Interesting Octet Mask)",
      example: "Mask 255.255.255.224 => 256 - 224 = 32 step size. Subnets: .0, .32, .64, .96, .128, .160, .192, .224.",
    },
    {
      title: "2. Finger-Counting Bit Borrowing",
      icon: "🖐️",
      badge: "Subnet Doubling",
      tagline: "Double Subnets, Halve Host Capacity",
      description:
        "Every bit borrowed doubles the created subnets (2^n) and halves host capacity per subnet. Count on fingers from 1 to 6 bits.",
      formulaSnippet: "1 bit=2 | 2 bits=4 | 3 bits=8 | 4 bits=16 | 5 bits=32 | 6 bits=64",
      example: "Starting at /24: Borrowing 3 bits yields /27 prefix (2^3 = 8 subnets with 32 IPs each).",
    },
    {
      title: "3. Octet Jump Shortcuts",
      icon: "🎯",
      badge: "Target Octet",
      tagline: "Locate the 'Interesting Octet' Instantly",
      description:
        "Quickly map CIDR prefixes to their active working octet without converting binary digits:",
      formulaSnippet: "/8 to /15 => Octet 2  |  /16 to /23 => Octet 3  |  /24 to /30 => Octet 4",
      example: "CIDR /20 falls in Octet 3 (255.255.240.0). Octet 1 & 2 are 255, Octet 4 is 0.",
    },
    {
      title: "4. Quick Wildcard Mask Inversion",
      icon: "⚡",
      badge: "ACL & OSPF",
      tagline: "Subtract Subnet Mask from 255.255.255.255",
      description:
        "Derive Cisco ACL wildcard masks instantly by subtracting each mask octet from 255.",
      formulaSnippet: "Wildcard = (255 - Mask Octet) for each of 4 octets",
      example: "Subnet Mask 255.255.255.240 (/28) => (255-255).(255-255).(255-255).(255-240) = 0.0.0.15.",
    },
  ];

  return (
    <section
      id="cheatsheet"
      className="networking-module scroll-mt-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* Header */}
      <NetworkingModuleHeader
        anchor="#cheatsheet"
        icon={<span className="text-indigo-500 dark:text-indigo-400" aria-hidden="true">⊞</span>}
        title={<>22. Subnetting Cheat Sheet</>}
        description={<>Quick-reference hub containing essential subnet formulas, comprehensive CIDR prefix lookup tables (/8 through /32), and mental math shortcuts for rapid network calculations in exams and production deployments.</>}
      />
      <div className="module-content networking-module-content">

      {/* SECTION 1: CORE FORMULAS GRID */}
      <div className="mb-12">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <span>📐</span>
          <span>Core Subnetting Formulas</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {coreFormulas.map((item) => (
            <NetworkingPanel
              key={item.id}
              className="rounded-xl border bg-white dark:bg-slate-800 p-5 hover:border-indigo-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.title}</h4>
                  <button
                    onClick={() => copyToClipboard(item.formula, item.id)}
                    className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#21262d] text-white dark:text-slate-100 hover:text-white hover:bg-[#30363d] border border-slate-200 dark:border-slate-700 transition-all"
                  >
                    {copiedIndex === item.id ? "Copied!" : "Copy"}
                  </button>
                </div>

                <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-3">
                  {item.formula}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                  {item.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                <span className="text-slate-500 dark:text-slate-400">Ex: </span>
                <span>{item.example}</span>
              </div>
            </NetworkingPanel>
          ))}
        </div>
      </div>

      {/* SECTION 2: PREFIX QUICK REFERENCE TABLE */}
      <div className="mb-12">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>📊</span>
              <span>Prefix Quick Reference Table (/8 to /32)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Complete CIDR lookup listing netmasks, host counts, magic numbers, and practical RFC use-cases.
            </p>
          </div>

          {/* Search & Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search /24 or 255..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search subnetting reference table"
              className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs text-slate-900 dark:text-slate-100 placeholder-[#8b949e] focus:outline-none focus:border-indigo-400 font-mono"
            />

            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setFilterCategory("all")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  filterCategory === "all"
                    ? "bg-indigo-600 text-slate-900 dark:text-slate-100 font-bold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterCategory("common")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  filterCategory === "common"
                    ? "bg-indigo-600 text-slate-900 dark:text-slate-100 font-bold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100"
                }`}
              >
                Popular
              </button>
              <button
                onClick={() => setFilterCategory("p2p")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  filterCategory === "p2p"
                    ? "bg-indigo-600 text-slate-900 dark:text-slate-100 font-bold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100"
                }`}
              >
                P2P / Host
              </button>
            </div>
          </div>
        </div>

        {/* Special RFC Note Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <NetworkingExample
            title={<>⚡ /31 Prefix Note <span className="text-xs font-mono font-normal">RFC 3021</span></>}
            tone="cyan"
          >
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              RFC 3021 enables <strong className="text-slate-900 dark:text-slate-100">2 usable IP addresses</strong> on point-to-point links with zero overhead (no reserved network or broadcast addresses), doubling IPv4 address efficiency on WAN links compared to traditional /30.
            </p>
          </NetworkingExample>

          <NetworkingExample
            title={<>📌 /32 Prefix Note <span className="text-xs font-mono font-normal">Single Host Route</span></>}
            tone="violet"
          >
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              A /32 prefix represents a <strong className="text-slate-900 dark:text-slate-100">single host route (255.255.255.255)</strong>. Used for router loopback interfaces (Router IDs in OSPF/BGP) and explicit single-IP host firewall rules.
            </p>
          </NetworkingExample>
        </div>

        {/* Table */}
        <NetworkingTable className="rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3">CIDR</th>
                <th className="p-3">Subnet Mask</th>
                <th className="p-3">Total IPs</th>
                <th className="p-3">Usable Hosts</th>
                <th className="p-3">Block Size (Increment)</th>
                <th className="p-3">Primary RFC / Production Use Case</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d] bg-slate-50 dark:bg-slate-700">
              {filteredPrefixes.map((row) => (
                <tr
                  key={row.cidr}
                  className={`hover:bg-slate-50/80 dark:bg-slate-700/80 transition-colors ${
                    row.highlight ? "bg-white/70 dark:bg-slate-800/70 font-semibold" : ""
                  }`}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">{row.cidr}</span>
                      {row.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 text-[10px]">
                          {row.badge}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-slate-900 dark:text-slate-100">{row.mask}</td>
                  <td className="p-3 text-slate-500 dark:text-slate-400">{row.totalHosts}</td>
                  <td className="p-3 text-emerald-600 dark:text-emerald-400 font-bold">{row.usableHosts}</td>
                  <td className="p-3 text-[#f0883e]">{row.blockSize}</td>
                  <td className="p-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">{row.useCase}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </NetworkingTable>
      </div>

      {/* SECTION 3: MENTAL MATH TRICKS GRID */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <span>🧠</span>
          <span>Mental Math Tricks Grid (4 Cards)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mentalMathTricks.map((trick, idx) => (
            <NetworkingPanel
              key={idx}
              className="rounded-xl bg-white dark:bg-slate-800 p-6 hover:border-indigo-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{trick.icon}</span>
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {trick.title}
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 text-[11px] font-mono font-semibold">
                    {trick.badge}
                  </span>
                </div>

                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 font-mono">
                  {trick.tagline}
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  {trick.description}
                </p>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-mono text-xs text-indigo-600 dark:text-indigo-400 mb-4">
                  {trick.formulaSnippet}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-mono">
                <strong className="text-slate-900 dark:text-slate-100">Example: </strong>
                <span>{trick.example}</span>
              </div>
            </NetworkingPanel>
          ))}
        </div>
      </div>
      </div>
    </section>
  );
}
