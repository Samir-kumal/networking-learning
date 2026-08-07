"use client";

import { useState, useRef, useEffect } from "react";

interface TerminalLine {
  id: string;
  type: "input" | "output" | "error" | "info" | "success" | "system";
  text: string;
}

interface CheatSheetItem {
  tool: string;
  name: string;
  badge: string;
  layer: string;
  description: string;
  syntax: string;
  flags: { flag: string; desc: string }[];
  example: string;
  useCase: string;
}

export default function DiagnosticsSection() {
  const [terminalBuffer, setTerminalBuffer] = useState<TerminalLine[]>([
    {
      id: "sys-1",
      type: "system",
      text: "========================================================================",
    },
    {
      id: "sys-2",
      type: "system",
      text: "  NETWORK DIAGNOSTICS & CLI SANDBOX v2.4 (Simulated Bash Kernel)",
    },
    {
      id: "sys-3",
      type: "system",
      text: "  Supported commands: ping, traceroute, mtr, iperf3, dig, nmap, clear, help",
    },
    {
      id: "sys-4",
      type: "system",
      text: "  Tip: Type commands directly or click preset buttons below!",
    },
    {
      id: "sys-5",
      type: "system",
      text: "========================================================================",
    },
  ]);

  const [inputVal, setInputVal] = useState<string>("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalBuffer]);

  // Execute CLI Command Logic
  const executeCommand = (cmdStr: string) => {
    const trimmed = cmdStr.trim();
    if (!trimmed) return;

    // Add input to buffer
    const inputLine: TerminalLine = {
      id: `in-${Date.now()}-${Math.random()}`,
      type: "input",
      text: `guest@net-sandbox:~$ ${trimmed}`,
    };

    setCommandHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    const parts = trimmed.split(/\s+/);
    const baseCmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    let outputLines: TerminalLine[] = [];

    switch (baseCmd) {
      case "clear":
        setTerminalBuffer([
          {
            id: `sys-${Date.now()}`,
            type: "system",
            text: "Terminal buffer cleared. Type 'help' for available diagnostic tools.",
          },
        ]);
        setInputVal("");
        return;

      case "help":
        outputLines = [
          {
            id: `out-help-1`,
            type: "info",
            text: "AVAILABLE DIAGNOSTIC COMMANDS:",
          },
          {
            id: `out-help-2`,
            type: "output",
            text: "  ping <host> [-c count]           - Test ICMP reachability and latency",
          },
          {
            id: `out-help-3`,
            type: "output",
            text: "  traceroute <host> / tracert     - Trace router hop path to target",
          },
          {
            id: `out-help-4`,
            type: "output",
            text: "  mtr <host>                      - Combined ping & traceroute live analysis",
          },
          {
            id: `out-help-5`,
            type: "output",
            text: "  iperf3 -c <host> [-p port]      - Measure network bandwidth throughput",
          },
          {
            id: `out-help-6`,
            type: "output",
            text: "  dig [<type>] <domain> [+short]   - Perform DNS domain queries (A, MX, NS, etc)",
          },
          {
            id: `out-help-7`,
            type: "output",
            text: "  nmap <target> [-sV] [-p ports]   - Audit open ports and service versions",
          },
          {
            id: `out-help-8`,
            type: "output",
            text: "  history                         - Show executed command history",
          },
          {
            id: `out-help-9`,
            type: "output",
            text: "  clear                           - Clear output buffer",
          },
        ];
        break;

      case "history":
        if (commandHistory.length === 0) {
          outputLines = [
            { id: `out-hist-none`, type: "info", text: "No command history yet." },
          ];
        } else {
          outputLines = commandHistory.map((cmd, i) => ({
            id: `out-hist-${i}`,
            type: "output",
            text: `  ${(i + 1).toString().padStart(3, " ")}  ${cmd}`,
          }));
        }
        break;

      case "ping": {
        const target = args.find((a) => !a.startsWith("-")) || "8.8.8.8";
        const isTimeout =
          target.includes("10.255") || target.includes("99.99") || target.includes("unreachable");

        if (isTimeout) {
          outputLines = [
            { id: "p1", type: "info", text: `PING ${target} (${target}) 56(84) bytes of data.` },
            { id: "p2", type: "error", text: `From 192.168.1.1 icmp_seq=1 Destination Host Unreachable` },
            { id: "p3", type: "error", text: `Request timeout for icmp_seq 2` },
            { id: "p4", type: "error", text: `Request timeout for icmp_seq 3` },
            { id: "p5", type: "error", text: `Request timeout for icmp_seq 4` },
            { id: "p6", type: "system", text: `--- ${target} ping statistics ---` },
            {
              id: "p7",
              type: "error",
              text: `4 packets transmitted, 0 received, +1 errors, 100% packet loss, time 3012ms`,
            },
          ];
        } else {
          outputLines = [
            { id: "p1", type: "info", text: `PING ${target} (${target}) 56(84) bytes of data.` },
            { id: "p2", type: "success", text: `64 bytes from ${target}: icmp_seq=1 ttl=117 time=11.4 ms` },
            { id: "p3", type: "success", text: `64 bytes from ${target}: icmp_seq=2 ttl=117 time=12.1 ms` },
            { id: "p4", type: "success", text: `64 bytes from ${target}: icmp_seq=3 ttl=117 time=10.8 ms` },
            { id: "p5", type: "success", text: `64 bytes from ${target}: icmp_seq=4 ttl=117 time=11.9 ms` },
            { id: "p6", type: "system", text: `--- ${target} ping statistics ---` },
            {
              id: "p7",
              type: "success",
              text: `4 packets transmitted, 4 received, 0% packet loss, time 3004ms`,
            },
            { id: "p8", type: "info", text: `rtt min/avg/max/mdev = 10.812/11.550/12.104/0.485 ms` },
          ];
        }
        break;
      }

      case "traceroute":
      case "tracert": {
        const target = args.find((a) => !a.startsWith("-")) || "8.8.8.8";
        outputLines = [
          {
            id: "t1",
            type: "info",
            text: `traceroute to ${target} (${target}), 30 hops max, 60 byte packets`,
          },
          { id: "t2", type: "output", text: ` 1  gateway (192.168.1.1)  1.124 ms  1.089 ms  1.150 ms` },
          { id: "t3", type: "output", text: ` 2  10.240.0.1 (10.240.0.1)  8.432 ms  8.112 ms  8.350 ms` },
          { id: "t4", type: "output", text: ` 3  72.14.214.89 (72.14.214.89)  12.110 ms  11.954 ms  12.040 ms` },
          { id: "t5", type: "output", text: ` 4  108.170.244.1 (108.170.244.1)  12.302 ms  12.115 ms  12.240 ms` },
          { id: "t6", type: "success", text: ` 5  dns.google (${target})  12.415 ms  12.190 ms  12.285 ms` },
        ];
        break;
      }

      case "mtr": {
        const target = args.find((a) => !a.startsWith("-")) || "8.8.8.8";
        outputLines = [
          { id: "m1", type: "info", text: `My traceroute [v0.95] (target: ${target})` },
          {
            id: "m2",
            type: "system",
            text: `Host                                     Loss%   Snt   Last   Avg  Best  Wrst StDev`,
          },
          {
            id: "m3",
            type: "output",
            text: ` 1. 192.168.1.1                           0.0%    10    1.1   1.2   1.0   1.8   0.2`,
          },
          {
            id: "m4",
            type: "output",
            text: ` 2. 10.240.0.1                            0.0%    10    8.3   8.5   8.1  10.2   0.6`,
          },
          {
            id: "m5",
            type: "output",
            text: ` 3. 142.250.212.1                         0.0%    10   11.5  11.8  11.2  13.4   0.5`,
          },
          {
            id: "m6",
            type: "success",
            text: ` 4. dns.google (${target})                  0.0%    10   12.1  12.3  11.9  12.8   0.3`,
          },
        ];
        break;
      }

      case "iperf3": {
        const hostIndex = args.indexOf("-c");
        const targetHost = hostIndex !== -1 && args[hostIndex + 1] ? args[hostIndex + 1] : "10.0.0.5";
        const isServerMode = args.includes("-s");

        if (isServerMode) {
          outputLines = [
            { id: "ip1", type: "info", text: `-----------------------------------------------------------` },
            { id: "ip2", type: "info", text: `Server listening on 5201 (TCP/UDP)` },
            { id: "ip3", type: "info", text: `-----------------------------------------------------------` },
            { id: "ip4", type: "success", text: `Accepted connection from 10.0.0.100, port 41258` },
            { id: "ip5", type: "output", text: `[  5] local 10.0.0.5 port 5201 connected to 10.0.0.100 port 41258` },
            { id: "ip6", type: "output", text: `[ ID] Interval           Transfer     Bitrate` },
            { id: "ip7", type: "output", text: `[  5]   0.00-5.00   sec   561 MBytes  941 Mbits/sec                  receiver` },
          ];
        } else {
          outputLines = [
            { id: "ip1", type: "info", text: `Connecting to host ${targetHost}, port 5201` },
            {
              id: "ip2",
              type: "output",
              text: `[  5] local 10.0.0.100 port 43210 connected to ${targetHost} port 5201`,
            },
            {
              id: "ip3",
              type: "system",
              text: `[ ID] Interval           Transfer     Bitrate         Retr  Cwnd`,
            },
            {
              id: "ip4",
              type: "output",
              text: `[  5]   0.00-1.00   sec   112 MBytes  940 Mbits/sec    0    345 KBytes`,
            },
            {
              id: "ip5",
              type: "output",
              text: `[  5]   1.00-2.00   sec   113 MBytes  948 Mbits/sec    0    350 KBytes`,
            },
            {
              id: "ip6",
              type: "output",
              text: `[  5]   2.00-3.00   sec   111 MBytes  931 Mbits/sec    1    310 KBytes`,
            },
            {
              id: "ip7",
              type: "output",
              text: `[  5]   3.00-4.00   sec   113 MBytes  945 Mbits/sec    0    360 KBytes`,
            },
            {
              id: "ip8",
              type: "output",
              text: `[  5]   4.00-5.00   sec   112 MBytes  941 Mbits/sec    0    360 KBytes`,
            },
            {
              id: "ip9",
              type: "system",
              text: `- - - - - - - - - - - - - - - - - - - - - - - - -`,
            },
            {
              id: "ip10",
              type: "success",
              text: `[  5]   0.00-5.00   sec   561 MBytes  941 Mbits/sec    1    sender`,
            },
            {
              id: "ip11",
              type: "success",
              text: `[  5]   0.00-5.00   sec   559 MBytes  938 Mbits/sec         receiver`,
            },
          ];
        }
        break;
      }

      case "dig": {
        const isShort = args.includes("+short");
        const isTrace = args.includes("+trace");
        const recType =
          args.find((a) => ["A", "AAAA", "MX", "NS", "TXT", "CNAME"].includes(a.toUpperCase())) || "A";
        const domain = args.find((a) => !a.startsWith("-") && !a.startsWith("+") && a.toUpperCase() !== recType) || "google.com";

        if (isShort) {
          if (recType.toUpperCase() === "MX") {
            outputLines = [
              { id: "d1", type: "success", text: `10 smtp.google.com.` },
              { id: "d2", type: "success", text: `20 alt1.smtp.google.com.` },
            ];
          } else {
            outputLines = [{ id: "d1", type: "success", text: `142.250.190.46` }];
          }
        } else if (isTrace) {
          outputLines = [
            { id: "dt1", type: "info", text: `; <<>> DiG 9.18.28 <<>> ${domain} ${recType} +trace` },
            { id: "dt2", type: "output", text: `.			518400	IN	NS	a.root-servers.net.` },
            { id: "dt3", type: "output", text: `com.			172800	IN	NS	a.gtld-servers.net.` },
            { id: "dt4", type: "success", text: `${domain}.		300	IN	A	142.250.190.46` },
            { id: "dt5", type: "info", text: `;; Received 56 bytes from 192.5.6.30#53(a.gtld-servers.net)` },
          ];
        } else {
          outputLines = [
            { id: "d1", type: "info", text: `; <<>> DiG 9.18.28 <<>> ${domain} ${recType.toUpperCase()}` },
            { id: "d2", type: "output", text: `;; global options: +cmd` },
            { id: "d3", type: "output", text: `;; Got answer:` },
            { id: "d4", type: "system", text: `;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 41258` },
            { id: "d5", type: "output", text: `;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1` },
            { id: "d6", type: "info", text: `\n;; QUESTION SECTION:` },
            { id: "d7", type: "output", text: `;${domain}.\t\t\tIN\t${recType.toUpperCase()}` },
            { id: "d8", type: "info", text: `\n;; ANSWER SECTION:` },
            {
              id: "d9",
              type: "success",
              text: `${domain}.\t\t300\tIN\t${recType.toUpperCase()}\t${
                recType.toUpperCase() === "MX" ? "10 smtp.google.com." : "142.250.190.46"
              }`,
            },
            { id: "d10", type: "system", text: `\n;; Query time: 14 msec` },
            { id: "d11", type: "output", text: `;; SERVER: 127.0.0.53#53(127.0.0.53) (UDP)` },
          ];
        }
        break;
      }

      case "nmap": {
        const target = args.find((a) => !a.startsWith("-")) || "192.168.1.1";
        outputLines = [
          { id: "n1", type: "info", text: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-08-08 14:35 UTC` },
          { id: "n2", type: "output", text: `Nmap scan report for ${target}` },
          { id: "n3", type: "output", text: `Host is up (0.0012s latency).` },
          { id: "n4", type: "output", text: `Not shown: 996 closed tcp ports (reset)` },
          { id: "n5", type: "system", text: `PORT     STATE SERVICE    VERSION` },
          { id: "n6", type: "success", text: `22/tcp   open  ssh        OpenSSH 8.9p1 Ubuntu` },
          { id: "n7", type: "success", text: `80/tcp   open  http       nginx 1.18.0` },
          { id: "n8", type: "success", text: `443/tcp  open  ssl/https  nginx 1.18.0` },
          { id: "n9", type: "success", text: `53/tcp   open  domain     dnsmasq 2.86` },
          { id: "n10", type: "output", text: `MAC Address: 00:11:32:8A:9B:CC (Synology Inc.)` },
          { id: "n11", type: "info", text: `Nmap done: 1 IP address (1 host up) scanned in 1.42 seconds` },
        ];
        break;
      }

      default:
        outputLines = [
          {
            id: `err-${Date.now()}`,
            type: "error",
            text: `bash: command not found: '${baseCmd}'. Type 'help' for supported diagnostic commands.`,
          },
        ];
    }

    setTerminalBuffer((prev) => [...prev, inputLine, ...outputLines]);
    setInputVal("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      executeCommand(inputVal);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx < commandHistory.length) {
        setHistoryIndex(nextIdx);
        setInputVal(commandHistory[commandHistory.length - 1 - nextIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputVal(commandHistory[commandHistory.length - 1 - nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputVal("");
      }
    }
  };

  const handlePresetClick = (cmd: string) => {
    setInputVal(cmd);
    executeCommand(cmd);
    inputRef.current?.focus();
  };

  const handleCopyCmd = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const presetCommands = [
    { label: "ping (ICMP Echo)", cmd: "ping -c 4 8.8.8.8", tag: "Layer 3" },
    { label: "traceroute (Hop Path)", cmd: "traceroute 8.8.8.8", tag: "Layer 3" },
    { label: "mtr (Live Stats)", cmd: "mtr 8.8.8.8", tag: "Layer 3" },
    { label: "iperf3 (Bandwidth)", cmd: "iperf3 -c 10.0.0.5 -p 5201", tag: "Layer 4" },
    { label: "dig (DNS Trace)", cmd: "dig A google.com +trace", tag: "Layer 7" },
    { label: "dig (MX Query)", cmd: "dig MX github.com +short", tag: "Layer 7" },
    { label: "nmap (Port Scan)", cmd: "nmap -sV -p 22,80,443 192.168.1.1", tag: "Security" },
    { label: "ping (Simulate Loss)", cmd: "ping -c 4 10.255.255.1", tag: "Timeout" },
  ];

  const cheatSheetItems: CheatSheetItem[] = [
    {
      tool: "ping",
      name: "ping (Packet InterNet Groper)",
      badge: "ICMP / Layer 3",
      layer: "Layer 3 (Network)",
      description: "Sends ICMP Echo Request packets to verify end-to-end IP reachability, latency (RTT), and packet loss percentage.",
      syntax: "ping [options] <destination_ip_or_hostname>",
      flags: [
        { flag: "-c <count>", desc: "Stop after sending specified number of ECHO_REQUEST packets." },
        { flag: "-i <interval>", desc: "Wait specified seconds between sending each packet (default: 1s)." },
        { flag: "-s <bytes>", desc: "Specify number of payload data bytes to send (useful for MTU test)." },
        { flag: "-t <ttl>", desc: "Set IP Time To Live (TTL) hop count limit." },
      ],
      example: "ping -c 4 -s 1472 8.8.8.8",
      useCase: "Quick sanity check for gateway reachability and testing MTU fragment limits without path discovery.",
    },
    {
      tool: "traceroute",
      name: "traceroute / tracert",
      badge: "ICMP & UDP / Layer 3",
      layer: "Layer 3 (Network)",
      description: "Maps every intermediate router hop along the packet path by incrementing IP TTL field from 1 up to destination.",
      syntax: "traceroute [options] <destination_host>",
      flags: [
        { flag: "-n", desc: "Print hop addresses numerically without executing slow DNS reverse lookups." },
        { flag: "-m <max_ttl>", desc: "Set maximum number of hops (TTL) to search (default 30)." },
        { flag: "-I", desc: "Use ICMP ECHO requests instead of default UDP datagrams." },
        { flag: "-p <port>", desc: "Specify destination base port for UDP probes." },
      ],
      example: "traceroute -n -m 20 1.1.1.1",
      useCase: "Isolating which specific ISP router or inter-subnet hop is introducing latency spikes or packet drops.",
    },
    {
      tool: "mtr",
      name: "mtr (My TraceRoute)",
      badge: "ICMP & UDP / Layer 3",
      layer: "Layer 3 (Network)",
      description: "Combines the functionality of ping and traceroute into a single continuous real-time network diagnostic tool.",
      syntax: "mtr [options] <target_host>",
      flags: [
        { flag: "-r", desc: "Report mode: output continuous stats after running set packet count." },
        { flag: "-c <count>", desc: "Set number of pings sent per hop before generating final report." },
        { flag: "-w", desc: "Wide report mode: print full hostnames without truncating." },
        { flag: "-n", desc: "No DNS resolution on hop IP addresses." },
      ],
      example: "mtr -r -c 10 github.com",
      useCase: "Generating non-interactive diagnostic reports for ISPs to prove intermittent packet loss over time.",
    },
    {
      tool: "iperf3",
      name: "iperf3 (Bandwidth Benchmark)",
      badge: "TCP & UDP / Layer 4",
      layer: "Layer 4 (Transport)",
      description: "Measures maximum attainable TCP and UDP network bandwidth, packet jitter, and datagram loss between two hosts.",
      syntax: "iperf3 -c <server_ip> [options] | iperf3 -s",
      flags: [
        { flag: "-c <host>", desc: "Run in client mode, connecting to specified iperf3 server host." },
        { flag: "-s", desc: "Run in server daemon mode listening for incoming benchmark connections." },
        { flag: "-p <port>", desc: "Set server port to listen/connect on (default 5201)." },
        { flag: "-u", desc: "Use UDP packets instead of default TCP streams for jitter/loss test." },
        { flag: "-b <rate>", desc: "Set target UDP bandwidth constraint (e.g. 1G, 100M)." },
      ],
      example: "iperf3 -c 10.0.0.5 -p 5201 -t 10",
      useCase: "Verifying actual throughput capacity across VPN tunnels, 10GbE links, or Wi-Fi subnets.",
    },
    {
      tool: "dig",
      name: "dig (Domain Information Groper)",
      badge: "DNS / Layer 7",
      layer: "Layer 7 (Application)",
      description: "Flexible DNS lookup utility that queries Domain Name System servers directly and prints exact response records.",
      syntax: "dig [@server] <domain> [type] [options]",
      flags: [
        { flag: "+short", desc: "Print clean, concise answer records only without header noise." },
        { flag: "+trace", desc: "Follow authoritative DNS delegation path from root servers down." },
        { flag: "@server", desc: "Query specific DNS resolver IP instead of default system DNS." },
        { flag: "ANY / A / MX", desc: "Specify query record type (A, AAAA, MX, NS, TXT, CNAME, SOA)." },
      ],
      example: "dig @8.8.8.8 google.com MX +short",
      useCase: "Troubleshooting email routing failures, verifying DNS propagation, and auditing SPF/TXT records.",
    },
    {
      tool: "nmap",
      name: "nmap (Network Mapper)",
      badge: "TCP & UDP / Layer 4 & 7",
      layer: "Layer 4 & 7 (Security)",
      description: "Industry-standard port scanner and network security auditor used for host discovery and service enumeration.",
      syntax: "nmap [scan_type] [options] <target>",
      flags: [
        { flag: "-sS", desc: "TCP SYN Stealth Scan (half-open scan, does not complete 3-way handshake)." },
        { flag: "-sV", desc: "Probe open ports to determine service name and software version info." },
        { flag: "-p <ports>", desc: "Scan target ports only (e.g. -p 22,80,443 or -p 1-1024)." },
        { flag: "-O", desc: "Enable remote operating system fingerprint detection." },
      ],
      example: "nmap -sV -p 22,80,443 192.168.1.1",
      useCase: "Auditing firewall rule enforcement, finding rogue listening daemons, and mapping open subnet ports.",
    },
  ];

  const filteredCheatSheet =
    activeTab === "all"
      ? cheatSheetItems
      : cheatSheetItems.filter((item) => item.tool === activeTab);

  const diagnosticWorkflow = [
    {
      step: "01",
      title: "Layer 3 ICMP Ping Test",
      tool: "ping -c 4 <target>",
      desc: "Verify IP layer connectivity and physical/link layer reachability.",
      badge: "Reachability",
    },
    {
      step: "02",
      title: "Hop Path & Delay Pinpoint",
      tool: "traceroute / mtr <target>",
      desc: "Identify exact router hop or provider link dropping packets.",
      badge: "Path Analysis",
    },
    {
      step: "03",
      title: "DNS Resolution Audit",
      tool: "dig <domain> +trace",
      desc: "Confirm whether issue is IP routing or domain name resolution failure.",
      badge: "DNS Audit",
    },
    {
      step: "04",
      title: "Firewall & Port Check",
      tool: "nmap -sV -p <ports> <target>",
      desc: "Detect blocked TCP/UDP ports, stateful firewall drops, or down services.",
      badge: "Port Security",
    },
    {
      step: "05",
      title: "Bandwidth & Throughput",
      tool: "iperf3 -c <server_ip>",
      desc: "Measure maximum transmission rate, TCP window size, and UDP packet loss.",
      badge: "Throughput",
    },
  ];

  return (
    <section
      id="diagnostics"
      className="scroll-mt-24 rounded-2xl bg-[#161b22] border border-[#30363d] p-6 sm:p-8 transition-colors hover:border-[#58a6ff]/40"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-md bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20 text-xs font-mono font-semibold">
          #diagnostics
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#e6edf3]">
          22. Network Diagnostics & CLI Sandbox
        </h2>
      </div>

      <p className="text-[#8b949e] text-base leading-relaxed mb-8 max-w-4xl">
        Master essential network troubleshooting CLI utilities (<code className="text-[#7ee787] bg-[#1c2333] px-1.5 py-0.5 rounded font-mono text-sm">ping</code>, <code className="text-[#7ee787] bg-[#1c2333] px-1.5 py-0.5 rounded font-mono text-sm">traceroute</code>, <code className="text-[#7ee787] bg-[#1c2333] px-1.5 py-0.5 rounded font-mono text-sm">mtr</code>, <code className="text-[#7ee787] bg-[#1c2333] px-1.5 py-0.5 rounded font-mono text-sm">iperf3</code>, <code className="text-[#7ee787] bg-[#1c2333] px-1.5 py-0.5 rounded font-mono text-sm">dig</code>, <code className="text-[#7ee787] bg-[#1c2333] px-1.5 py-0.5 rounded font-mono text-sm">nmap</code>). Test commands interactively in the simulated bash terminal sandbox, execute instant command presets, and reference the diagnostic cheat sheet.
      </p>

      {/* Interactive CLI Terminal Sandbox Container */}
      <div className="mb-10 rounded-xl bg-[#0d1117] border border-[#30363d] overflow-hidden shadow-2xl">
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between bg-[#161b22] px-4 py-3 border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ff7b72] inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-[#ffa657] inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-[#7ee787] inline-block"></span>
            <span className="ml-2 text-xs font-mono text-[#8b949e]">guest@net-sandbox: ~ (bash)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => executeCommand("clear")}
              className="text-xs text-[#8b949e] hover:text-[#e6edf3] font-mono px-2 py-1 rounded bg-[#0d1117] border border-[#30363d] transition-colors"
            >
              Clear Output
            </button>
            <button
              onClick={() => executeCommand("help")}
              className="text-xs text-[#58a6ff] hover:underline font-mono px-2 py-1 rounded bg-[#58a6ff]/10 border border-[#58a6ff]/30 transition-colors"
            >
              Help Menu
            </button>
          </div>
        </div>

        {/* Terminal Buffer Output Window */}
        <div className="p-4 sm:p-6 font-mono text-xs sm:text-sm h-80 sm:h-96 overflow-y-auto space-y-1.5 bg-[#0a0d12] text-[#e6edf3]">
          {terminalBuffer.map((line) => {
            if (line.type === "input") {
              return (
                <div key={line.id} className="text-[#e6edf3] font-semibold flex items-start gap-1">
                  <span className="text-[#7ee787]">{line.text}</span>
                </div>
              );
            }
            if (line.type === "system") {
              return (
                <div key={line.id} className="text-[#58a6ff] font-semibold">
                  {line.text}
                </div>
              );
            }
            if (line.type === "success") {
              return (
                <div key={line.id} className="text-[#7ee787]">
                  {line.text}
                </div>
              );
            }
            if (line.type === "error") {
              return (
                <div key={line.id} className="text-[#ff7b72]">
                  {line.text}
                </div>
              );
            }
            if (line.type === "info") {
              return (
                <div key={line.id} className="text-[#ffa657]">
                  {line.text}
                </div>
              );
            }
            return (
              <div key={line.id} className="text-[#c9d1d9]">
                {line.text}
              </div>
            );
          })}
          <div ref={terminalEndRef} />
        </div>

        {/* Terminal Prompt Input Bar */}
        <div className="flex items-center bg-[#161b22] px-4 py-3 border-t border-[#30363d]">
          <span className="text-[#7ee787] font-mono text-xs sm:text-sm font-bold mr-2 whitespace-nowrap">
            guest@net-sandbox:~$
          </span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type CLI command (e.g. ping -c 4 8.8.8.8, dig google.com, nmap 192.168.1.1)..."
            className="flex-1 bg-transparent text-[#e6edf3] font-mono text-xs sm:text-sm focus:outline-none placeholder-[#484f58]"
          />
          <button
            onClick={() => executeCommand(inputVal)}
            className="ml-2 px-3 py-1.5 rounded-lg bg-[#58a6ff] hover:bg-[#58a6ff]/80 text-[#0d1117] font-semibold text-xs font-mono transition-colors"
          >
            Run
          </button>
        </div>
      </div>

      {/* Preset Command Buttons Bar */}
      <div className="mb-10">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#8b949e] mb-3">
          Instant Execution Presets (Click to Run):
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {presetCommands.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handlePresetClick(preset.cmd)}
              className="group flex flex-col p-2.5 rounded-lg bg-[#1c2333] border border-[#30363d] hover:border-[#58a6ff] text-left transition-all hover:bg-[#1c2333]/80"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-bold text-[#e6edf3] group-hover:text-[#58a6ff]">
                  {preset.label}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#30363d] text-[#8b949e] font-mono">
                  {preset.tag}
                </span>
              </div>
              <code className="text-[11px] font-mono text-[#7ee787] truncate">
                {preset.cmd}
              </code>
            </button>
          ))}
        </div>
      </div>

      {/* Interactive 5-Step Diagnostic Workflow Matrix */}
      <div className="mb-12">
        <h3 className="text-lg font-bold text-[#e6edf3] mb-4">
          Structured Troubleshooting Workflow Matrix
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {diagnosticWorkflow.map((wf) => (
            <div
              key={wf.step}
              className="p-3.5 rounded-xl bg-[#1c2333] border border-[#30363d] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-[#58a6ff]">
                    Step {wf.step}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20">
                    {wf.badge}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-[#e6edf3] mb-1">{wf.title}</h4>
                <p className="text-[11px] text-[#8b949e] leading-snug mb-3">{wf.desc}</p>
              </div>
              <button
                onClick={() => handlePresetClick(wf.tool.replace("<target>", "8.8.8.8").replace("<domain>", "google.com").replace("<ports>", "80,443").replace("<server_ip>", "10.0.0.5"))}
                className="w-full text-left font-mono text-[10px] bg-[#0d1117] p-1.5 rounded border border-[#30363d] text-[#7ee787] hover:border-[#7ee787] truncate"
              >
                $ {wf.tool}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Command Cheat Sheet Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="text-xl font-bold text-[#e6edf3]">
              Diagnostic Tools Command Cheat Sheet
            </h3>
            <p className="text-xs text-[#8b949e] mt-1">
              Comprehensive reference of syntax, flags, OSI layers, and practical use-cases.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 bg-[#0d1117] p-1 rounded-lg border border-[#30363d]">
            {["all", "ping", "traceroute", "mtr", "iperf3", "dig", "nmap"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono capitalize transition-colors ${
                  activeTab === tab
                    ? "bg-[#58a6ff] text-[#0d1117] font-semibold"
                    : "text-[#8b949e] hover:text-[#e6edf3]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Cheat Sheet Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredCheatSheet.map((item) => (
            <div
              key={item.tool}
              className="p-5 rounded-xl bg-[#1c2333] border border-[#30363d] flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-base font-bold text-[#e6edf3]">{item.name}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-[#bc8cff]/10 text-[#bc8cff] border border-[#bc8cff]/30">
                    {item.badge}
                  </span>
                </div>

                <p className="text-xs text-[#8b949e] leading-relaxed mb-4">
                  {item.description}
                </p>

                {/* Syntax */}
                <div className="mb-4 bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d]">
                  <span className="text-[10px] font-mono text-[#8b949e] uppercase block mb-1">
                    Syntax:
                  </span>
                  <code className="text-xs font-mono text-[#e6edf3]">{item.syntax}</code>
                </div>

                {/* Common Flags */}
                <div className="mb-4">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8b949e] block mb-2">
                    Key Command Options & Flags:
                  </span>
                  <div className="space-y-1.5">
                    {item.flags.map((flg, fIdx) => (
                      <div
                        key={fIdx}
                        className="flex items-start gap-2 text-xs font-mono text-[#c9d1d9]"
                      >
                        <span className="text-[#ffa657] font-bold min-w-[80px]">
                          {flg.flag}
                        </span>
                        <span className="text-[#8b949e] font-sans text-xs">
                          {flg.desc}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Use Case */}
                <div className="mb-4 text-xs text-[#8b949e] bg-[#161b22] p-2.5 rounded border border-[#30363d]">
                  <span className="text-[#7ee787] font-semibold">Practical Use-Case: </span>
                  {item.useCase}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-[#30363d]/60">
                <button
                  onClick={() => handlePresetClick(item.example)}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-[#58a6ff]/10 hover:bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/30 text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  ⚡ Try in Terminal: <code className="text-xs">{item.example}</code>
                </button>

                <button
                  onClick={() => handleCopyCmd(item.example)}
                  className="py-1.5 px-3 rounded-lg bg-[#0d1117] hover:bg-[#30363d] text-[#8b949e] hover:text-[#e6edf3] border border-[#30363d] text-xs font-mono transition-colors"
                >
                  {copiedCmd === item.example ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
