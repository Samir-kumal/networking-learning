"use client";

import { useState, useMemo } from "react";

// --- TYPES ---
interface OsiLayer {
  number: number;
  name: string;
  tcpIpEquivalent: string;
  pdu: string;
  protocols: string[];
  addressing: string;
  headerAdded: string;
  description: string;
  color: string;
}

interface HeaderField {
  id: string;
  name: string;
  sizeBits: number;
  offsetBytes: string;
  sampleHex: string;
  sampleDec: string;
  purpose: string;
  color: string;
}

interface PacketDetailNode {
  label: string;
  value?: string;
  children?: PacketDetailNode[];
  hexOffsetStart?: number;
  hexOffsetEnd?: number;
}

interface WiresharkPacket {
  no: number;
  time: string;
  source: string;
  destination: string;
  protocol: "HTTP" | "DNS" | "TCP" | "ICMP" | "TLS";
  length: number;
  info: string;
  colorClass: string;
  details: PacketDetailNode[];
  rawHex: string;
}

// --- DATA DEFINITIONS ---
const OSI_LAYERS: OsiLayer[] = [
  {
    number: 7,
    name: "Application",
    tcpIpEquivalent: "Application Layer",
    pdu: "Data / Payload",
    protocols: ["HTTP", "HTTPS", "DNS", "SSH", "FTP", "SMTP"],
    addressing: "URL / Hostname / API Endpoints",
    headerAdded: "Application Data / Payload (e.g. HTTP GET /index.html)",
    description: "Provides network services directly to end-user applications and software processes.",
    color: "#58a6ff",
  },
  {
    number: 6,
    name: "Presentation",
    tcpIpEquivalent: "Application Layer",
    pdu: "Data / Payload",
    protocols: ["TLS/SSL", "ASCII", "JPEG", "JSON", "MIME"],
    addressing: "Character Encoding / Syntax Spec",
    headerAdded: "Encryption/Compression formatting wrapper",
    description: "Translates, encrypts, and compresses data formatting so data is readable across disparate operating systems.",
    color: "#7ee787",
  },
  {
    number: 5,
    name: "Session",
    tcpIpEquivalent: "Application Layer",
    pdu: "Data / Payload",
    protocols: ["RPC", "NetBIOS", "PPTP", "Sockets"],
    addressing: "Session IDs / Socket Pairs",
    headerAdded: "Session Token / RPC Context Header",
    description: "Establishes, manages, synchronizes, and terminates interactive session connections between applications.",
    color: "#ffa657",
  },
  {
    number: 4,
    name: "Transport",
    tcpIpEquivalent: "Transport Layer",
    pdu: "Segment (TCP) / Datagram (UDP)",
    protocols: ["TCP", "UDP", "SCTP", "QUIC"],
    addressing: "Port Numbers (e.g. Src: 54321, Dst: 443)",
    headerAdded: "Transport Header (Src/Dst Ports, Seq/Ack, Flags, Checksum)",
    description: "Provides end-to-end process-to-process data delivery, flow control, error recovery, and multiplexing.",
    color: "#bc8cff",
  },
  {
    number: 3,
    name: "Network",
    tcpIpEquivalent: "Internet Layer",
    pdu: "Packet",
    protocols: ["IPv4", "IPv6", "ICMP", "IPsec", "IGMP"],
    addressing: "IP Addresses (e.g. 192.168.1.50 -> 93.184.216.34)",
    headerAdded: "Network IP Header (Src/Dst IP, TTL, Protocol, ID, Checksum)",
    description: "Determines optimal routing paths across logically separate networks and handles logical IP addressing.",
    color: "#ff7b72",
  },
  {
    number: 2,
    name: "Data Link",
    tcpIpEquivalent: "Network Access Layer",
    pdu: "Frame",
    protocols: ["Ethernet (802.3)", "Wi-Fi (802.11)", "VLAN (802.1Q)", "ARP"],
    addressing: "MAC Addresses (e.g. 00:1A:2B:3C:4D:5E)",
    headerAdded: "Ethernet Header (Src/Dst MAC, Type) + Trailer (FCS / CRC32)",
    description: "Handles physical node-to-node node transfer on the same local physical broadcast domain.",
    color: "#d2a8ff",
  },
  {
    number: 1,
    name: "Physical",
    tcpIpEquivalent: "Network Access Layer",
    pdu: "Bits / Signals",
    protocols: ["NRZ", "PAM4", "1000BASE-T", "Single-Mode Fiber"],
    addressing: "Pins, Voltages, Frequencies, Light Pulses",
    headerAdded: "Preamble (7 Bytes) + Start Frame Delimiter SFD (1 Byte)",
    description: "Transmits raw unstructured binary stream over physical copper cables, optical fibers, or wireless radio frequencies.",
    color: "#8b949e",
  },
];

const ETHERNET_HEADER: HeaderField[] = [
  {
    id: "eth-dst",
    name: "Destination MAC Address",
    sizeBits: 48,
    offsetBytes: "00-05 (6 Bytes)",
    sampleHex: "70 3A 0E 99 88 77",
    sampleDec: "70:3a:0e:99:88:77 (Gateway Router MAC)",
    purpose: "Physical Layer 2 address of the next-hop network interface card (NIC) on the local Ethernet segment.",
    color: "#58a6ff",
  },
  {
    id: "eth-src",
    name: "Source MAC Address",
    sizeBits: 48,
    offsetBytes: "06-11 (6 Bytes)",
    sampleHex: "00 1A 2B 3C 4D 5E",
    sampleDec: "00:1a:2b:3c:4d:5e (Client Host MAC)",
    purpose: "Hardware burned-in MAC address of the local transmitting device NIC.",
    color: "#7ee787",
  },
  {
    id: "eth-type",
    name: "EtherType / Length",
    sizeBits: 16,
    offsetBytes: "12-13 (2 Bytes)",
    sampleHex: "08 00",
    sampleDec: "0x0800 (IPv4)",
    purpose: "Indicates which upper-layer network protocol is encapsulated inside the frame payload (0x0800 = IPv4, 0x86DD = IPv6, 0x0806 = ARP).",
    color: "#ffa657",
  },
  {
    id: "eth-payload",
    name: "Frame Payload (Data)",
    sizeBits: 12000,
    offsetBytes: "14-1513 (46-1500 Bytes)",
    sampleHex: "45 00 00 3C 1C 46 40 00 40 06...",
    sampleDec: "Encapsulated IPv4 Packet",
    purpose: "The higher layer PDU payload (IP packet). Must be at least 46 bytes (padded if necessary) up to maximum MTU (1500 bytes).",
    color: "#bc8cff",
  },
  {
    id: "eth-fcs",
    name: "Frame Check Sequence (FCS)",
    sizeBits: 32,
    offsetBytes: "Trailer: Last 4 Bytes",
    sampleHex: "9B E2 4A 1F",
    sampleDec: "CRC32 Checksum Hash",
    purpose: "32-bit Cyclic Redundancy Check (CRC32) calculated over frame fields. Recipient drops frame if CRC mismatch indicates corruption.",
    color: "#ff7b72",
  },
];

const IPV4_HEADER: HeaderField[] = [
  {
    id: "ip-ver-ihl",
    name: "Version (4b) & IHL (4b)",
    sizeBits: 8,
    offsetBytes: "00 (1 Byte)",
    sampleHex: "45",
    sampleDec: "Ver: 4 | IHL: 5 (20 Bytes)",
    purpose: "Version 4 specifies IPv4 protocol. Internet Header Length (IHL) specifies total header size in 32-bit words (5 * 4 = 20 bytes).",
    color: "#58a6ff",
  },
  {
    id: "ip-dscp-ecn",
    name: "DSCP (6b) & ECN (2b)",
    sizeBits: 8,
    offsetBytes: "01 (1 Byte)",
    sampleHex: "00",
    sampleDec: "Standard Best Effort (CS0)",
    purpose: "Differentiated Services Code Point for QoS traffic prioritization, and Explicit Congestion Notification for network congestion signaling.",
    color: "#7ee787",
  },
  {
    id: "ip-totlen",
    name: "Total Length",
    sizeBits: 16,
    offsetBytes: "02-03 (2 Bytes)",
    sampleHex: "00 3C",
    sampleDec: "60 Bytes total packet size",
    purpose: "Entire IP packet length in bytes, including header and data payload (max 65,535 bytes).",
    color: "#ffa657",
  },
  {
    id: "ip-id",
    name: "Identification",
    sizeBits: 16,
    offsetBytes: "04-05 (2 Bytes)",
    sampleHex: "1C 46",
    sampleDec: "7238 (Fragment Sequence ID)",
    purpose: "Unique sequence number assigned by sender to identify all fragmented pieces belonging to the original IP datagram.",
    color: "#bc8cff",
  },
  {
    id: "ip-flags-frag",
    name: "Flags (3b) & Fragment Offset (13b)",
    sizeBits: 16,
    offsetBytes: "06-07 (2 Bytes)",
    sampleHex: "40 00",
    sampleDec: "DF Flag = 1 (Don't Fragment), Offset = 0",
    purpose: "Flags (Reserved, Don't Fragment DF, More Fragments MF) control router fragmentation behavior; offset places fragment in order.",
    color: "#ff7b72",
  },
  {
    id: "ip-ttl",
    name: "Time to Live (TTL)",
    sizeBits: 8,
    offsetBytes: "08 (1 Byte)",
    sampleHex: "40",
    sampleDec: "64 Hop Limit",
    purpose: "Decremented by 1 at each router hop. When TTL reaches 0, the packet is discarded and an ICMP Time Exceeded is returned, preventing routing loops.",
    color: "#d2a8ff",
  },
  {
    id: "ip-proto",
    name: "Protocol",
    sizeBits: 8,
    offsetBytes: "09 (1 Byte)",
    sampleHex: "06",
    sampleDec: "6 (TCP)",
    purpose: "Specifies the encapsulated Transport layer protocol payload (6 = TCP, 17 = UDP, 1 = ICMP, 47 = GRE, 50 = ESP).",
    color: "#58a6ff",
  },
  {
    id: "ip-chksum",
    name: "Header Checksum",
    sizeBits: 16,
    offsetBytes: "10-11 (2 Bytes)",
    sampleHex: "7C 2D",
    sampleDec: "1's Complement Validation",
    purpose: "Error-checking checksum calculated over the IP header fields only. Recalculated at every router hop as TTL decreases.",
    color: "#7ee787",
  },
  {
    id: "ip-src",
    name: "Source IP Address",
    sizeBits: 32,
    offsetBytes: "12-15 (4 Bytes)",
    sampleHex: "C0 A8 01 32",
    sampleDec: "192.168.1.50",
    purpose: "32-bit IPv4 address of the originating sender host device.",
    color: "#ffa657",
  },
  {
    id: "ip-dst",
    name: "Destination IP Address",
    sizeBits: 32,
    offsetBytes: "16-19 (4 Bytes)",
    sampleHex: "5D B8 D8 22",
    sampleDec: "93.184.216.34",
    purpose: "32-bit IPv4 address of the final intended destination receiver target host.",
    color: "#bc8cff",
  },
];

const TCP_HEADER: HeaderField[] = [
  {
    id: "tcp-srcport",
    name: "Source Port",
    sizeBits: 16,
    offsetBytes: "00-01 (2 Bytes)",
    sampleHex: "D4 31",
    sampleDec: "54321 (Ephemeral Client Port)",
    purpose: "Port number assigned on the local sender machine identifying the originating client socket process.",
    color: "#58a6ff",
  },
  {
    id: "tcp-dstport",
    name: "Destination Port",
    sizeBits: 16,
    offsetBytes: "02-03 (2 Bytes)",
    sampleHex: "00 50",
    sampleDec: "80 (HTTP Web Server Port)",
    purpose: "Well-known or registered port number listening on target server machine (80=HTTP, 443=HTTPS, 22=SSH).",
    color: "#7ee787",
  },
  {
    id: "tcp-seq",
    name: "Sequence Number (Seq)",
    sizeBits: 32,
    offsetBytes: "04-07 (4 Bytes)",
    sampleHex: "3A 9F 12 00",
    sampleDec: "983503360 (Initial Seq Num ISN)",
    purpose: "Tracks byte offset sequence position of data sent. Guarantees in-order reassembly and duplicate packet elimination.",
    color: "#ffa657",
  },
  {
    id: "tcp-ack",
    name: "Acknowledgment Number (Ack)",
    sizeBits: 32,
    offsetBytes: "08-11 (4 Bytes)",
    sampleHex: "00 00 00 00",
    sampleDec: "0 (Next expected byte from peer)",
    purpose: "If ACK flag is set, contains the next sequence number sender expects to receive, confirming receipt of previous bytes.",
    color: "#bc8cff",
  },
  {
    id: "tcp-offset-flags",
    name: "Data Offset (4b) + Flags (9b)",
    sizeBits: 16,
    offsetBytes: "12-13 (2 Bytes)",
    sampleHex: "80 02",
    sampleDec: "Header Len: 32B | Flags: SYN=1",
    purpose: "Data Offset defines header size in 32-bit words. Control Flags control session state (URG, ACK, PSH, RST, SYN, FIN).",
    color: "#ff7b72",
  },
  {
    id: "tcp-window",
    name: "Window Size",
    sizeBits: 16,
    offsetBytes: "14-15 (2 Bytes)",
    sampleHex: "FA F0",
    sampleDec: "64,240 Bytes (Flow Control Buffer)",
    purpose: "Advertises recipient receive buffer availability to sender for TCP dynamic sliding window flow control.",
    color: "#d2a8ff",
  },
  {
    id: "tcp-checksum",
    name: "TCP Checksum",
    sizeBits: 16,
    offsetBytes: "16-17 (2 Bytes)",
    sampleHex: "E2 A1",
    sampleDec: "Calculated over Pseudo-Header + Data",
    purpose: "Mandatory 16-bit error check covering TCP header, payload data, and IP pseudo-header (Src/Dst IP, Protocol, TCP length).",
    color: "#58a6ff",
  },
  {
    id: "tcp-urgptr",
    name: "Urgent Pointer",
    sizeBits: 16,
    offsetBytes: "18-19 (2 Bytes)",
    sampleHex: "00 00",
    sampleDec: "0 (Not urgent)",
    purpose: "If URG flag is set, specifies byte offset from sequence number where urgent out-of-band data ends.",
    color: "#7ee787",
  },
];

// Wireshark Sample Packets
const SAMPLE_PACKETS: WiresharkPacket[] = [
  {
    no: 1,
    time: "0.000000",
    source: "192.168.1.50",
    destination: "93.184.216.34",
    protocol: "TCP",
    length: 74,
    info: "54321 → 80 [SYN] Seq=0 Win=64240 Len=0 MSS=1460 SACK_PERM=1",
    colorClass: "bg-[#1f293d] border-indigo-300 text-indigo-600 dark:text-indigo-400",
    rawHex: "703a0e998877001a2b3c4d5e08004500003c1c46400040067c2dc0a801325db8d822d43100503a9f1200000000008002faf0e2a10000020405b40402080a00000000",
    details: [
      {
        label: "Frame 1: 74 bytes on wire (592 bits), 74 bytes captured",
        hexOffsetStart: 0,
        hexOffsetEnd: 74,
        children: [
          { label: "Encapsulation type: Ethernet (1)" },
          { label: "Arrival Time: Aug 8, 2026 14:22:01.000000000 UTC" },
          { label: "Frame Length: 74 bytes (592 bits)" },
          { label: "Capture Length: 74 bytes (592 bits)" },
        ],
      },
      {
        label: "Ethernet II, Src: 00:1a:2b:3c:4d:5e, Dst: 70:3a:0e:99:88:77",
        hexOffsetStart: 0,
        hexOffsetEnd: 14,
        children: [
          { label: "Destination: Router_70:3a:0e (70:3a:0e:99:88:77)", hexOffsetStart: 0, hexOffsetEnd: 6 },
          { label: "Source: Apple_00:1a:2b (00:1a:2b:3c:4d:5e)", hexOffsetStart: 6, hexOffsetEnd: 12 },
          { label: "Type: IPv4 (0x0800)", hexOffsetStart: 12, hexOffsetEnd: 14 },
        ],
      },
      {
        label: "Internet Protocol Version 4, Src: 192.168.1.50, Dst: 93.184.216.34",
        hexOffsetStart: 14,
        hexOffsetEnd: 34,
        children: [
          { label: "0100 .... = Version: 4", hexOffsetStart: 14, hexOffsetEnd: 15 },
          { label: ".... 0101 = Header Length: 20 bytes (5)", hexOffsetStart: 14, hexOffsetEnd: 15 },
          { label: "Total Length: 60 bytes", hexOffsetStart: 16, hexOffsetEnd: 18 },
          { label: "Identification: 0x1c46 (7238)", hexOffsetStart: 18, hexOffsetEnd: 20 },
          { label: "Flags: 0x4000, Don't fragment", hexOffsetStart: 20, hexOffsetEnd: 22 },
          { label: "Time to Live: 64", hexOffsetStart: 22, hexOffsetEnd: 23 },
          { label: "Protocol: TCP (6)", hexOffsetStart: 23, hexOffsetEnd: 24 },
          { label: "Header Checksum: 0x7c2d [validation disabled]", hexOffsetStart: 24, hexOffsetEnd: 26 },
          { label: "Source Address: 192.168.1.50", hexOffsetStart: 26, hexOffsetEnd: 30 },
          { label: "Destination Address: 93.184.216.34", hexOffsetStart: 30, hexOffsetEnd: 34 },
        ],
      },
      {
        label: "Transmission Control Protocol, Src Port: 54321, Dst Port: 80, Seq: 0, Flags: [SYN]",
        hexOffsetStart: 34,
        hexOffsetEnd: 74,
        children: [
          { label: "Source Port: 54321", hexOffsetStart: 34, hexOffsetEnd: 36 },
          { label: "Destination Port: 80", hexOffsetStart: 36, hexOffsetEnd: 38 },
          { label: "Sequence Number: 0 (raw: 983503360)", hexOffsetStart: 38, hexOffsetEnd: 42 },
          { label: "Acknowledgment Number: 0", hexOffsetStart: 42, hexOffsetEnd: 46 },
          { label: "1000 .... = Header Length: 32 bytes (8)", hexOffsetStart: 46, hexOffsetEnd: 47 },
          { label: "Flags: 0x002 (SYN)", hexOffsetStart: 47, hexOffsetEnd: 48 },
          { label: "Window: 64240", hexOffsetStart: 48, hexOffsetEnd: 50 },
          { label: "Checksum: 0xe2a1 [correct]", hexOffsetStart: 50, hexOffsetEnd: 52 },
          { label: "TCP Options: (12 bytes) MSS=1460, SACK_PERM=1", hexOffsetStart: 54, hexOffsetEnd: 74 },
        ],
      },
    ],
  },
  {
    no: 2,
    time: "0.024115",
    source: "93.184.216.34",
    destination: "192.168.1.50",
    protocol: "TCP",
    length: 74,
    info: "80 → 54321 [SYN, ACK] Seq=0 Ack=1 Win=29200 Len=0 MSS=1460",
    colorClass: "bg-[#1f293d] border-indigo-300 text-indigo-600 dark:text-indigo-400",
    rawHex: "001a2b3c4d5e703a0e99887708004500003c51a24000340647d15db8d822c0a801320050d43141f2a0003a9f1201801272109bc40000020405b401010402",
    details: [
      {
        label: "Frame 2: 74 bytes on wire (592 bits)",
        hexOffsetStart: 0,
        hexOffsetEnd: 74,
        children: [
          { label: "Arrival Time: Aug 8, 2026 14:22:01.024115000 UTC" },
        ],
      },
      {
        label: "Ethernet II, Src: 70:3a:0e:99:88:77, Dst: 00:1a:2b:3c:4d:5e",
        hexOffsetStart: 0,
        hexOffsetEnd: 14,
      },
      {
        label: "Internet Protocol Version 4, Src: 93.184.216.34, Dst: 192.168.1.50",
        hexOffsetStart: 14,
        hexOffsetEnd: 34,
      },
      {
        label: "Transmission Control Protocol, Src Port: 80, Dst Port: 54321, Seq: 0, Ack: 1, Flags: [SYN, ACK]",
        hexOffsetStart: 34,
        hexOffsetEnd: 74,
        children: [
          { label: "Sequence Number: 0 (raw: 1106427904)" },
          { label: "Acknowledgment Number: 1 (raw: 983503361)" },
          { label: "Flags: 0x012 (SYN, ACK)" },
        ],
      },
    ],
  },
  {
    no: 3,
    time: "0.024210",
    source: "192.168.1.50",
    destination: "93.184.216.34",
    protocol: "TCP",
    length: 66,
    info: "54321 → 80 [ACK] Seq=1 Ack=1 Win=64240 Len=0",
    colorClass: "bg-[#1f293d] border-indigo-300 text-indigo-600 dark:text-indigo-400",
    rawHex: "703a0e998877001a2b3c4d5e0800450000341c47400040067c34c0a801325db8d822d43100503a9f120141f2a0018010faf0d1e000000101080a00000000",
    details: [
      {
        label: "Transmission Control Protocol, Src Port: 54321, Dst Port: 80, Seq: 1, Ack: 1, Flags: [ACK]",
        hexOffsetStart: 34,
        hexOffsetEnd: 66,
        children: [
          { label: "Flags: 0x010 (ACK)" },
          { label: "Window Size: 64240" },
        ],
      },
    ],
  },
  {
    no: 4,
    time: "0.025102",
    source: "192.168.1.50",
    destination: "93.184.216.34",
    protocol: "HTTP",
    length: 144,
    info: "GET /index.html HTTP/1.1",
    colorClass: "bg-[#193226] border-emerald-400/40 text-emerald-600 dark:text-emerald-400",
    rawHex: "703a0e998877001a2b3c4d5e0800450000821c48400040067be5c0a801325db8d822d43100503a9f120141f2a0018018faf0e14a0000474554202f696e6465782e68746d6c20485454502f312e310d0a486f73743a206578616d706c652e636f6d0d0a",
    details: [
      {
        label: "Hypertext Transfer Protocol",
        hexOffsetStart: 54,
        hexOffsetEnd: 144,
        children: [
          { label: "GET /index.html HTTP/1.1\\r\\n", hexOffsetStart: 54, hexOffsetEnd: 77 },
          { label: "Host: example.com\\r\\n", hexOffsetStart: 77, hexOffsetEnd: 96 },
          { label: "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", hexOffsetStart: 96, hexOffsetEnd: 144 },
        ],
      },
    ],
  },
  {
    no: 5,
    time: "0.026401",
    source: "192.168.1.50",
    destination: "1.1.1.1",
    protocol: "DNS",
    length: 83,
    info: "Standard query 0x1a2b A api.example.com",
    colorClass: "bg-[#18303d] border-[#70b8ff]/40 text-[#70b8ff]",
    rawHex: "703a0e998877001a2b3c4d5e0800450000451c49400040117c20c0a8013201010101d2a1003500311a2b1a2b0100000100000000000003617069076578616d706c6503636f6d0000010001",
    details: [
      {
        label: "Domain Name System (query)",
        hexOffsetStart: 42,
        hexOffsetEnd: 83,
        children: [
          { label: "Transaction ID: 0x1a2b" },
          { label: "Flags: 0x0100 Standard query" },
          { label: "Queries: 1 (api.example.com: type A, class IN)" },
        ],
      },
    ],
  },
  {
    no: 6,
    time: "0.038920",
    source: "192.168.1.50",
    destination: "8.8.8.8",
    protocol: "ICMP",
    length: 98,
    info: "Echo (ping) request id=0x1234, seq=1, ttl=64",
    colorClass: "bg-[#331c2c] border-rose-400/40 text-rose-600 dark:text-rose-400",
    rawHex: "703a0e998877001a2b3c4d5e0800450000541c4a400040017c10c0a801320808080808008892123400016162636465666768696a6b6c6d6e6f707172737475767778797a",
    details: [
      {
        label: "Internet Control Message Protocol",
        hexOffsetStart: 34,
        hexOffsetEnd: 98,
        children: [
          { label: "Type: 8 (Echo (ping) request)" },
          { label: "Code: 0" },
          { label: "Checksum: 0x8892" },
          { label: "Identifier: 0x1234 (4660)" },
          { label: "Sequence Number: 1" },
        ],
      },
    ],
  },
];

export default function PacketSection() {
  // --- STATE FOR OSI / TCP STACK ---
  const [selectedOsiLayer, setSelectedOsiLayer] = useState<number>(4);
  const [encapStep, setEncapStep] = useState<number>(0);
  const [isEncapAuto, setIsEncapAuto] = useState<boolean>(false);

  // --- STATE FOR HEADER ANATOMY ---
  const [activeHeaderTab, setActiveHeaderTab] = useState<"ethernet" | "ipv4" | "tcp">("tcp");
  const [selectedFieldId, setSelectedFieldId] = useState<string>("tcp-offset-flags");

  // --- STATE FOR TCP HANDSHAKE ---
  const [handshakeStep, setHandshakeStep] = useState<number>(1);
  const [handshakeMode, setHandshakeMode] = useState<"est" | "fin">("est");

  // --- STATE FOR WIRESHARK SIMULATOR ---
  const [selectedPacketNo, setSelectedPacketNo] = useState<number>(1);
  const [protocolFilter, setProtocolFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedHexOffset, setSelectedHexOffset] = useState<{ start: number; end: number } | null>({
    start: 34,
    end: 74,
  });

  // Current selected layer info
  const activeOsiLayer = useMemo(
    () => OSI_LAYERS.find((l) => l.number === selectedOsiLayer) || OSI_LAYERS[3],
    [selectedOsiLayer]
  );

  // Active header field array based on tab
  const currentHeaderFields = useMemo(() => {
    if (activeHeaderTab === "ethernet") return ETHERNET_HEADER;
    if (activeHeaderTab === "ipv4") return IPV4_HEADER;
    return TCP_HEADER;
  }, [activeHeaderTab]);

  const activeField = useMemo(
    () => currentHeaderFields.find((f) => f.id === selectedFieldId) || currentHeaderFields[0],
    [currentHeaderFields, selectedFieldId]
  );

  // Wireshark Filter Logic
  const filteredPackets = useMemo(() => {
    return SAMPLE_PACKETS.filter((p) => {
      if (protocolFilter !== "ALL" && p.protocol !== protocolFilter) return false;
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        return (
          p.info.toLowerCase().includes(q) ||
          p.source.toLowerCase().includes(q) ||
          p.destination.toLowerCase().includes(q) ||
          p.protocol.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [protocolFilter, searchQuery]);

  const activePacket = useMemo(
    () => SAMPLE_PACKETS.find((p) => p.no === selectedPacketNo) || SAMPLE_PACKETS[0],
    [selectedPacketNo]
  );

  // Format Hex string nicely with spaces and line splits
  const formattedHexBytes = useMemo(() => {
    const hex = activePacket.rawHex;
    const bytes: string[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(hex.substring(i, i + 2).toUpperCase());
    }
    const lines: { offset: string; hexStr: string; asciiStr: string; byteRangeStart: number }[] = [];
    for (let i = 0; i < bytes.length; i += 16) {
      const lineBytes = bytes.slice(i, i + 16);
      const hexStr = lineBytes.join(" ");
      const asciiStr = lineBytes
        .map((b) => {
          const code = parseInt(b, 16);
          return code >= 32 && code <= 126 ? String.fromCharCode(code) : ".";
        })
        .join("");
      const offsetHex = i.toString(16).padStart(4, "0").toUpperCase();
      lines.push({
        offset: offsetHex,
        hexStr,
        asciiStr,
        byteRangeStart: i,
      });
    }
    return lines;
  }, [activePacket]);

  // Handshake Step Details Calculation
  const handshakeStepsData = useMemo(() => {
    if (handshakeMode === "est") {
      return [
        {
          step: 1,
          label: "1. Client Sends [SYN]",
          dir: "client-to-server",
          packetName: "TCP SYN Segment",
          seq: 1000,
          ack: 0,
          flags: { URG: 0, ACK: 0, PSH: 0, RST: 0, SYN: 1, FIN: 0 },
          clientState: "SYN_SENT",
          serverState: "LISTEN → SYN_RCVD",
          desc: "Client picks an Initial Sequence Number (ISN=1000), sets SYN=1 flag, and sends connection request to Server port 443.",
        },
        {
          step: 2,
          label: "2. Server Responds [SYN, ACK]",
          dir: "server-to-client",
          packetName: "TCP SYN-ACK Segment",
          seq: 5000,
          ack: 1001,
          flags: { URG: 0, ACK: 1, PSH: 0, RST: 0, SYN: 1, FIN: 0 },
          clientState: "SYN_SENT → ESTABLISHED",
          serverState: "SYN_RCVD",
          desc: "Server acknowledges Client ISN (Ack = 1000 + 1 = 1001), picks its own Server ISN=5000, sets SYN=1 and ACK=1.",
        },
        {
          step: 3,
          label: "3. Client Acknowledges [ACK]",
          dir: "client-to-server",
          packetName: "TCP ACK Segment",
          seq: 1001,
          ack: 5001,
          flags: { URG: 0, ACK: 1, PSH: 0, RST: 0, SYN: 0, FIN: 0 },
          clientState: "ESTABLISHED",
          serverState: "SYN_RCVD → ESTABLISHED",
          desc: "Client acknowledges Server ISN (Ack = 5000 + 1 = 5001). Connection is now ESTABLISHED for bidirectional data transfer!",
        },
        {
          step: 4,
          label: "4. Data Payload Exchange",
          dir: "client-to-server",
          packetName: "HTTP GET Request (Data Payload)",
          seq: 1001,
          ack: 5001,
          flags: { URG: 0, ACK: 1, PSH: 1, RST: 0, SYN: 0, FIN: 0 },
          clientState: "ESTABLISHED",
          serverState: "ESTABLISHED",
          desc: "Client streams application payload (HTTP GET /index.html, PSH=1). TCP window buffer manages flow control.",
        },
      ];
    } else {
      return [
        {
          step: 1,
          label: "1. Client Sends [FIN, ACK]",
          dir: "client-to-server",
          packetName: "TCP FIN-ACK Segment",
          seq: 2050,
          ack: 6200,
          flags: { URG: 0, ACK: 1, PSH: 0, RST: 0, SYN: 0, FIN: 1 },
          clientState: "FIN_WAIT_1",
          serverState: "ESTABLISHED → CLOSE_WAIT",
          desc: "Client initiates active close, sends FIN=1 flag to signal no more data will be transmitted.",
        },
        {
          step: 2,
          label: "2. Server Responds [ACK]",
          dir: "server-to-client",
          packetName: "TCP ACK Segment",
          seq: 6200,
          ack: 2051,
          flags: { URG: 0, ACK: 1, PSH: 0, RST: 0, SYN: 0, FIN: 0 },
          clientState: "FIN_WAIT_2",
          serverState: "CLOSE_WAIT",
          desc: "Server acknowledges receipt of FIN (Ack = 2050 + 1 = 2051). Server application prepares to close session.",
        },
        {
          step: 3,
          label: "3. Server Sends [FIN, ACK]",
          dir: "server-to-client",
          packetName: "TCP FIN-ACK Segment",
          seq: 6200,
          ack: 2051,
          flags: { URG: 0, ACK: 1, PSH: 0, RST: 0, SYN: 0, FIN: 1 },
          clientState: "TIME_WAIT",
          serverState: "LAST_ACK",
          desc: "Server finishes sending pending buffer, issues its own FIN=1 packet to request connection teardown.",
        },
        {
          step: 4,
          label: "4. Client Final [ACK]",
          dir: "client-to-server",
          packetName: "TCP Final ACK",
          seq: 2051,
          ack: 6201,
          flags: { URG: 0, ACK: 1, PSH: 0, RST: 0, SYN: 0, FIN: 0 },
          clientState: "TIME_WAIT (2MSL timer) → CLOSED",
          serverState: "CLOSED",
          desc: "Client acknowledges final FIN. Client enters TIME_WAIT (2x Maximum Segment Lifetime) before closing socket.",
        },
      ];
    }
  }, [handshakeMode]);

  const currentHandshakeStep = handshakeStepsData[handshakeStep - 1] || handshakeStepsData[0];

  return (
    <section
      id="packets"
      className="scroll-mt-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* SECTION HEADER */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 text-[11px] font-semibold">
          #packets
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
          <span className="text-indigo-500 dark:text-indigo-400" aria-hidden="true">◈</span>
          20. Packet Encapsulation & Analysis
        </h2>
      </div>

      <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed mb-8 max-w-4xl">
        Every interaction on the internet depends on <strong className="text-indigo-600 dark:text-indigo-400">Packet Encapsulation</strong>—the process where raw application data is wrapped layer-by-layer with Transport headers, IP headers, and Ethernet frames before physical transmission over the wire. Understanding header bit fields, stateful TCP handshakes, and PCAP analysis tools like <strong className="text-emerald-600 dark:text-emerald-400">Wireshark</strong> is essential for network engineering and security analysis.
      </p>

      {/* ==================================================================== */}
      {/* 1. INTERACTIVE OSI vs TCP/IP LAYER STACK VISUAL INSPECTOR */}
      {/* ==================================================================== */}
      <div className="mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400">1.</span> Interactive OSI vs TCP/IP Layer Stack Inspector
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select any layer to inspect protocol mapping, PDU names, headers attached, and addressing units.
            </p>
          </div>

          {/* Encapsulation Simulation Toggle Controls */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-1.5 rounded-lg">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 px-2">Encapsulation Step:</span>
            <button
              onClick={() => setEncapStep((prev) => Math.max(0, prev - 1))}
              disabled={encapStep === 0}
              className="px-2.5 py-1 text-xs font-mono rounded bg-[#30363d] text-slate-900 dark:text-slate-100 hover:bg-indigo-600/30 disabled:opacity-40 transition"
            >
              ◀ Back
            </button>
            <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold px-1">
              {encapStep === 0
                ? "Data"
                : encapStep === 1
                ? "+TCP Header"
                : encapStep === 2
                ? "+IP Header"
                : encapStep === 3
                ? "+Ethernet Header/Trailer"
                : "Bits (Wire)"}
            </span>
            <button
              onClick={() => setEncapStep((prev) => Math.min(4, prev + 1))}
              disabled={encapStep === 4}
              className="px-2.5 py-1 text-xs font-mono rounded bg-indigo-100 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/30 disabled:opacity-40 transition"
            >
              Next Encapsulate ▶
            </button>
          </div>
        </div>

        {/* Encapsulation Live Banner */}
        <div className="mb-6 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-mono font-bold text-sm">
              📦
            </div>
            <div>
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400">PDU Encapsulation State</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {encapStep === 0 && "1. Application Data (HTTP GET /index.html)"}
                {encapStep === 1 && "2. Transport Segment (TCP Port 54321 → 80 + Seq/Ack)"}
                {encapStep === 2 && "3. Network Packet (IPv4 192.168.1.50 → 93.184.216.34)"}
                {encapStep === 3 && "4. Data Link Frame (Ethernet MAC 00:1a:2b... → 70:3a:0e... + FCS)"}
                {encapStep === 4 && "5. Physical Bits (Electrical Volts / Light Pulses over 1000BASE-T)"}
              </div>
            </div>
          </div>

          {/* Visual PDU Wrapper Preview */}
          <div className="flex items-center gap-1 font-mono text-xs overflow-x-auto max-w-full py-1">
            {encapStep >= 3 && (
              <span className="px-2 py-1 rounded bg-[#d2a8ff]/20 text-[#d2a8ff] border border-[#d2a8ff]/30 animate-fade-in">
                [Eth Header]
              </span>
            )}
            {encapStep >= 2 && (
              <span className="px-2 py-1 rounded bg-[#ff7b72]/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-700 animate-fade-in">
                [IP Header]
              </span>
            )}
            {encapStep >= 1 && (
              <span className="px-2 py-1 rounded bg-[#bc8cff]/20 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-700 animate-fade-in">
                [TCP Header]
              </span>
            )}
            <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 font-semibold">
              Payload: GET /index.html
            </span>
            {encapStep >= 3 && (
              <span className="px-2 py-1 rounded bg-[#d2a8ff]/20 text-[#d2a8ff] border border-[#d2a8ff]/30 animate-fade-in">
                [FCS Trailer]
              </span>
            )}
          </div>
        </div>

        {/* Side by Side Model Grid & Detailed Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* OSI 7-Layer Stack */}
          <div className="lg:col-span-5 flex flex-col gap-2">
            <div className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex justify-between">
              <span>OSI 7-Layer Model</span>
              <span>TCP/IP 4-Layer Equivalent</span>
            </div>

            {OSI_LAYERS.map((layer) => {
              const isSelected = selectedOsiLayer === layer.number;
              return (
                <button
                  key={layer.number}
                  onClick={() => setSelectedOsiLayer(layer.number)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? "bg-slate-50 dark:bg-slate-700 border-indigo-400 shadow-lg shadow-[#58a6ff]/10 scale-[1.01]"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-[#8b949e]/50 opacity-90 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-7 h-7 rounded-lg text-xs font-bold font-mono flex items-center justify-center text-white"
                      style={{ backgroundColor: layer.color }}
                    >
                      L{layer.number}
                    </span>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{layer.name}</div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">PDU: {layer.pdu}</div>
                    </div>
                  </div>

                  <span className="text-xs font-mono px-2 py-1 rounded bg-[#30363d]/60 text-slate-900 dark:text-slate-100">
                    {layer.tcpIpEquivalent}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Layer Detail Inspector Card */}
          <div className="lg:col-span-7 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <span
                    className="px-3 py-1 rounded-lg text-sm font-bold font-mono text-white"
                    style={{ backgroundColor: activeOsiLayer.color }}
                  >
                    OSI Layer {activeOsiLayer.number}
                  </span>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100">{activeOsiLayer.name} Layer</h4>
                </div>
                <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 px-2.5 py-1 rounded">
                  {activeOsiLayer.tcpIpEquivalent}
                </span>
              </div>

              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                {activeOsiLayer.description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3.5 rounded-lg">
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mb-1">Protocol Data Unit (PDU)</div>
                  <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">{activeOsiLayer.pdu}</div>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3.5 rounded-lg">
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mb-1">Addressing Scheme</div>
                  <div className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">{activeOsiLayer.addressing}</div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-lg mb-6">
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                  Encapsulation Header / Trailer Action
                </div>
                <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 p-2.5 rounded border border-indigo-200 dark:border-indigo-700 font-medium">
                  {activeOsiLayer.headerAdded}
                </div>
              </div>

              <div>
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mb-2 font-semibold">Key Protocols & Standards</div>
                <div className="flex flex-wrap gap-2">
                  {activeOsiLayer.protocols.map((proto) => (
                    <span
                      key={proto}
                      className="px-2.5 py-1 rounded-md text-xs font-mono bg-[#30363d] text-slate-900 dark:text-slate-100 border border-[#8b949e]/30"
                    >
                      {proto}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-500 dark:text-slate-400 flex justify-between">
              <span>Encapsulation Direction: Top-Down (L7 → L1)</span>
              <span>Decapsulation: Bottom-Up (L1 → L7)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. FRAME / PACKET / SEGMENT HEADER ANATOMY */}
      {/* ==================================================================== */}
      <div className="mb-12">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-indigo-600 dark:text-indigo-400">2.</span> Frame, Packet & Segment Header Anatomy
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            RFC Bit/Byte layout visualizer for Ethernet II Frames (Layer 2), IPv4 Packets (Layer 3), and TCP Segments (Layer 4).
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-slate-700 pb-3 overflow-x-auto">
          <button
            onClick={() => {
              setActiveHeaderTab("tcp");
              setSelectedFieldId("tcp-offset-flags");
            }}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition ${
              activeHeaderTab === "tcp"
                ? "bg-[#bc8cff]/20 text-violet-600 dark:text-violet-400 border border-violet-400/40"
                : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:text-slate-100"
            }`}
          >
            TCP Segment Header (L4 - Transport)
          </button>

          <button
            onClick={() => {
              setActiveHeaderTab("ipv4");
              setSelectedFieldId("ip-src");
            }}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition ${
              activeHeaderTab === "ipv4"
                ? "bg-[#ff7b72]/20 text-rose-600 dark:text-rose-400 border border-rose-400/40"
                : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:text-slate-100"
            }`}
          >
            IPv4 Packet Header (L3 - Internet)
          </button>

          <button
            onClick={() => {
              setActiveHeaderTab("ethernet");
              setSelectedFieldId("eth-dst");
            }}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition ${
              activeHeaderTab === "ethernet"
                ? "bg-indigo-100 text-indigo-600 dark:text-indigo-400 border border-indigo-300"
                : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:text-slate-100"
            }`}
          >
            Ethernet II Frame Header (L2 - Data Link)
          </button>
        </div>

        {/* RFC Bit Grid Representation */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow mb-6">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">
            <span>Bit Offset: 0</span>
            <span>Bit 15</span>
            <span>Bit 31 (32-Bit Width Word)</span>
          </div>

          <div className="grid grid-cols-12 gap-2 mb-6">
            {currentHeaderFields.map((field) => {
              const isSelected = field.id === activeField.id;
              // Map size to grid span
              let colSpan = "col-span-12";
              if (field.sizeBits === 16) colSpan = "col-span-6";
              if (field.sizeBits === 8) colSpan = "col-span-3";
              if (field.sizeBits === 32) colSpan = "col-span-12";
              if (field.sizeBits === 48) colSpan = "col-span-12";

              return (
                <button
                  key={field.id}
                  onClick={() => setSelectedFieldId(field.id)}
                  className={`${colSpan} p-3 rounded-lg border transition-all text-left flex flex-col justify-between min-h-[70px] ${
                    isSelected
                      ? "ring-2 ring-[#58a6ff] bg-white dark:bg-slate-800 scale-[1.01]"
                      : "bg-white/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:border-[#8b949e]/60"
                  }`}
                  style={{ borderLeftColor: field.color, borderLeftWidth: "4px" }}
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{field.name}</div>
                  <div className="flex items-center justify-between mt-2 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                    <span>{field.offsetBytes}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{field.sampleHex}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Field Details Box */}
          <div className="rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: activeField.color }}
                />
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{activeField.name}</h4>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#30363d] text-indigo-600 dark:text-indigo-400">
                Offset: {activeField.offsetBytes} ({activeField.sizeBits} bits)
              </span>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">{activeField.purpose}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-3 rounded-lg font-mono text-xs">
                <span className="text-slate-500 dark:text-slate-400 block mb-1">Sample Hex Raw Bytes:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{activeField.sampleHex}</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-3 rounded-lg font-mono text-xs">
                <span className="text-slate-500 dark:text-slate-400 block mb-1">Decoded / Value:</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold text-sm">{activeField.sampleDec}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. TCP 3-WAY HANDSHAKE SEQUENCE DIAGRAM */}
      {/* ==================================================================== */}
      <div className="mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400">3.</span> TCP 3-Way Handshake & Connection Teardown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Step-by-step TCP sequence number arithmetic, flag bitmask inspection, and TCP socket state transitions.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-1.5 rounded-lg">
            <button
              onClick={() => {
                setHandshakeMode("est");
                setHandshakeStep(1);
              }}
              className={`px-3 py-1.5 text-xs font-mono rounded font-bold transition ${
                handshakeMode === "est"
                  ? "bg-indigo-600 text-slate-900 dark:text-slate-100"
                  : "bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100"
              }`}
            >
              3-Way Handshake (Establish)
            </button>
            <button
              onClick={() => {
                setHandshakeMode("fin");
                setHandshakeStep(1);
              }}
              className={`px-3 py-1.5 text-xs font-mono rounded font-bold transition ${
                handshakeMode === "fin"
                  ? "bg-[#ff7b72] text-slate-900 dark:text-slate-100"
                  : "bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100"
              }`}
            >
              4-Way Teardown (Terminate)
            </button>
          </div>
        </div>

        {/* Interactive Sequence Diagram Canvas */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow mb-6">
          {/* Top Host Nodes */}
          <div className="grid grid-cols-2 gap-8 mb-8 pb-4 border-b border-slate-200 dark:border-slate-700">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 flex items-center justify-center text-lg">
                💻
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Client Host</div>
                <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400">192.168.1.50 : 54321</div>
                <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  State: <span className="font-bold">{currentHandshakeStep.clientState}</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 flex items-center justify-center text-lg">
                🌐
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Web Server</div>
                <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">93.184.216.34 : 443</div>
                <div className="text-[11px] font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                  State: <span className="font-bold">{currentHandshakeStep.serverState}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stepper Steps Selection Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {handshakeStepsData.map((s) => (
              <button
                key={s.step}
                onClick={() => setHandshakeStep(s.step)}
                className={`p-3 rounded-lg border text-left font-mono transition-all ${
                  handshakeStep === s.step
                    ? "bg-white dark:bg-slate-800 border-indigo-400 ring-2 ring-[#58a6ff]/40"
                    : "bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-[#8b949e]/50 opacity-80"
                }`}
              >
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Step {s.step}</div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">{s.label}</div>
              </button>
            ))}
          </div>

          {/* Sequence Arrow & Packet Inspector */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Arrow Visualization */}
              <div className="w-full md:w-1/2 flex flex-col items-center justify-center py-4">
                <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mb-2 font-bold uppercase tracking-wider">
                  {currentHandshakeStep.packetName}
                </div>

                <div className="w-full flex items-center gap-2 my-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-600" />
                  <div className="flex-1 h-0.5 bg-gradient-to-r from-[#58a6ff] via-[#7ee787] to-[#58a6ff] relative">
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-indigo-600 shadow-lg shadow-[#58a6ff] transition-all duration-500 ${
                        currentHandshakeStep.dir === "client-to-server" ? "right-0" : "left-0"
                      }`}
                    />
                  </div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>

                <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-2">
                  Direction: {currentHandshakeStep.dir === "client-to-server" ? "Client ➔ Server" : "Server ➔ Client"}
                </div>
              </div>

              {/* Flags & Seq/Ack Numbers Panel */}
              <div className="w-full md:w-1/2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-4 rounded-lg">
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold mb-3 border-b border-slate-200 dark:border-slate-700 pb-2 flex justify-between">
                  <span>TCP Control Flags Bitmask</span>
                  <span className="text-indigo-600 dark:text-indigo-400">Header Field</span>
                </div>

                {/* Flags Matrix */}
                <div className="grid grid-cols-6 gap-1.5 mb-4 text-center font-mono text-xs">
                  {Object.entries(currentHandshakeStep.flags).map(([flag, value]) => (
                    <div
                      key={flag}
                      className={`p-2 rounded border ${
                        value === 1
                          ? "bg-indigo-100 border-indigo-400 text-indigo-600 dark:text-indigo-400 font-bold"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500/50 dark:text-slate-400/50"
                      }`}
                    >
                      <div className="text-[10px]">{flag}</div>
                      <div className="text-xs font-bold mt-0.5">{value}</div>
                    </div>
                  ))}
                </div>

                {/* Seq and Ack Numbers */}
                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] block">Sequence Num (Seq):</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{currentHandshakeStep.seq}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] block">Ack Num (Ack):</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold text-sm">{currentHandshakeStep.ack}</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <strong className="text-slate-900 dark:text-slate-100">Step Explanation:</strong> {currentHandshakeStep.desc}
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. INTERACTIVE WIRESHARK PCAP PACKET VIEWER SIMULATOR */}
      {/* ==================================================================== */}
      <div>
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-indigo-600 dark:text-indigo-400">4.</span> Interactive Wireshark PCAP Packet Viewer Simulator
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Inspect real network trace packets, expand nested protocol headers, and analyze byte hex dumps.
          </p>
        </div>

        {/* Wireshark Window Container */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow shadow-2xl overflow-hidden">
          {/* Top Wireshark Titlebar & Filter Controls */}
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Window Dots & Title */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff7b72]" />
                <div className="w-3 h-3 rounded-full bg-[#ffa657]" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                Wireshark Packet Capture Trace - capture_01.pcap
              </span>
            </div>

            {/* Quick Protocol Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 font-mono text-xs">
              {["ALL", "HTTP", "DNS", "TCP", "ICMP"].map((proto) => (
                <button
                  key={proto}
                  onClick={() => setProtocolFilter(proto)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                    protocolFilter === proto
                      ? "bg-indigo-600 text-slate-900 dark:text-slate-100"
                      : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {proto}
                </button>
              ))}
            </div>
          </div>

          {/* Wireshark Display Filter Input Bar */}
          <div className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-700 px-3 py-2 flex items-center gap-2">
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">Apply a display filter:</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. 192.168.1.50, SYN, HTTP GET..."
              className="flex-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-3 py-1 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs font-mono text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 px-2"
              >
                Clear
              </button>
            )}
          </div>

          {/* PANE 1: PACKET LIST TABLE */}
          <div className="max-h-56 overflow-y-auto border-b border-slate-200 dark:border-slate-700">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2 px-3 w-12 text-center">No.</th>
                  <th className="py-2 px-3 w-24">Time (s)</th>
                  <th className="py-2 px-3 w-32">Source</th>
                  <th className="py-2 px-3 w-32">Destination</th>
                  <th className="py-2 px-3 w-20">Protocol</th>
                  <th className="py-2 px-3 w-16 text-right">Length</th>
                  <th className="py-2 px-3">Info</th>
                </tr>
              </thead>
              <tbody>
                {filteredPackets.map((packet) => {
                  const isSelected = packet.no === selectedPacketNo;
                  return (
                    <tr
                      key={packet.no}
                      onClick={() => {
                        setSelectedPacketNo(packet.no);
                        setSelectedHexOffset(null);
                      }}
                      className={`cursor-pointer border-b border-slate-200/40 dark:border-slate-700/40 transition ${
                        isSelected
                          ? "bg-indigo-100 text-slate-900 dark:text-slate-100 font-bold"
                          : `${packet.colorClass} hover:brightness-125`
                      }`}
                    >
                      <td className="py-1.5 px-3 text-center">{packet.no}</td>
                      <td className="py-1.5 px-3">{packet.time}</td>
                      <td className="py-1.5 px-3">{packet.source}</td>
                      <td className="py-1.5 px-3">{packet.destination}</td>
                      <td className="py-1.5 px-3 font-bold">{packet.protocol}</td>
                      <td className="py-1.5 px-3 text-right">{packet.length}</td>
                      <td className="py-1.5 px-3 truncate max-w-xs">{packet.info}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PANE 2 & PANE 3: PACKET DETAILS TREE & HEX DUMP (SPLIT VIEW) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-[#30363d]">
            {/* PANE 2: DECODED PROTOCOL TREE */}
            <div className="p-4 bg-white dark:bg-slate-800 max-h-72 overflow-y-auto font-mono text-xs">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">
                Packet Details Tree (Packet #{activePacket.no})
              </div>

              <div className="flex flex-col gap-2">
                {activePacket.details.map((node, i) => (
                  <div key={i} className="rounded bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-2.5">
                    <button
                      onClick={() => {
                        if (node.hexOffsetStart !== undefined && node.hexOffsetEnd !== undefined) {
                          setSelectedHexOffset({ start: node.hexOffsetStart, end: node.hexOffsetEnd });
                        }
                      }}
                      className="text-left w-full font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:text-indigo-400 transition flex items-center justify-between"
                    >
                      <span>{node.label}</span>
                      {node.hexOffsetStart !== undefined && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                          {node.hexOffsetStart}-{node.hexOffsetEnd}B
                        </span>
                      )}
                    </button>

                    {node.children && (
                      <div className="mt-2 pl-4 border-l border-slate-200 dark:border-slate-700 flex flex-col gap-1 text-slate-500 dark:text-slate-400">
                        {node.children.map((child, j) => (
                          <div
                            key={j}
                            onClick={() => {
                              if (child.hexOffsetStart !== undefined && child.hexOffsetEnd !== undefined) {
                                setSelectedHexOffset({ start: child.hexOffsetStart, end: child.hexOffsetEnd });
                              }
                            }}
                            className="hover:text-slate-900 dark:text-slate-100 cursor-pointer py-0.5 text-[11px]"
                          >
                            • {child.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* PANE 3: RAW HEX DUMP & ASCII VIEW */}
            <div className="p-4 bg-slate-50 dark:bg-slate-700 max-h-72 overflow-y-auto font-mono text-xs">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2 border-b border-slate-200 dark:border-slate-700 pb-1 flex justify-between">
                <span>Packet Bytes (Hex Dump)</span>
                {selectedHexOffset ? (
                  <span className="text-amber-600 dark:text-amber-400">
                    Selected Range: {selectedHexOffset.start} - {selectedHexOffset.end} Bytes
                  </span>
                ) : (
                  <span>Click field to highlight bytes</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                {formattedHexBytes.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100">
                    {/* Offset */}
                    <span className="text-indigo-600 dark:text-indigo-400 w-12 font-bold">{line.offset}</span>

                    {/* Hex Bytes */}
                    <span className="flex-1 font-mono text-slate-900 dark:text-slate-100 tracking-wider">
                      {line.hexStr}
                    </span>

                    {/* ASCII preview */}
                    <span className="w-32 text-emerald-600 dark:text-emerald-400 border-l border-slate-200 dark:border-slate-700 pl-3 truncate">
                      {line.asciiStr}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Wireshark Footer Statusbar */}
          <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
            <span>Packets: {SAMPLE_PACKETS.length} • Displayed: {filteredPackets.length}</span>
            <span className="text-emerald-600 dark:text-emerald-400">Profile: Default Wireshark Decoders Active</span>
          </div>
        </div>
      </div>
    </section>
  );
}
