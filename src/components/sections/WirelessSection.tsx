"use client";

import { useState } from "react";

// --- Types & Interfaces ---
interface SsidConfig {
  id: string;
  name: string;
  vlanId: number;
  subnet: string;
  auth: string;
  priority: string;
  color: string;
  bgBadge: string;
  border: string;
  acl: string;
  gateway: string;
  desc: string;
}

interface BandInfo {
  name: string;
  spectrum: string;
  channels: string;
  maxWidth: string;
  range: string;
  penetration: string;
  maxPhy: string;
  interference: string;
  keyTech: string;
  useCase: string;
  pros: string[];
  cons: string[];
}

export default function WirelessSection() {
  // --- Part 1 State: SSID to VLAN Mapping ---
  const [selectedSsid, setSelectedSsid] = useState<string>("corp");
  const [wlcTopology, setWlcTopology] = useState<"centralized" | "flexconnect">("centralized");

  // --- Part 2 State: Spectrum Tabs ---
  const [activeBandTab, setActiveBandTab] = useState<"2.4ghz" | "5ghz" | "6ghz">("2.4ghz");

  // --- Part 3 State: Channel Planner & Bonding ---
  const [ap1Channel, setAp1Channel] = useState<number>(1);
  const [ap2Channel, setAp2Channel] = useState<number>(6);
  const [bondingWidth, setBondingWidth] = useState<20 | 40 | 80 | 160 | 320>(80);

  // --- Part 4 State: Signal & Overlap Visualizer ---
  const [simBand, setSimBand] = useState<"2.4" | "5" | "6">("5");
  const [txPower, setTxPower] = useState<number>(20); // dBm
  const [distance, setDistance] = useState<number>(15); // meters
  const [obstacleLoss, setObstacleLoss] = useState<number>(4); // dB (Drywall)
  const [noiseFloor, setNoiseFloor] = useState<number>(-90); // dBm
  const [simAp1Ch, setSimAp1Ch] = useState<number>(36);
  const [simAp2Ch, setSimAp2Ch] = useState<number>(40);

  // --- Data Definitions ---

  // SSIDs Data
  const ssidConfigs: Record<string, SsidConfig> = {
    corp: {
      id: "corp",
      name: "Corp-Enterprise",
      vlanId: 10,
      subnet: "10.10.0.0/24",
      auth: "802.1X RADIUS (EAP-TLS)",
      priority: "High (DSCP EF / Voice & Video)",
      color: "text-indigo-600",
      bgBadge: "bg-indigo-50 text-indigo-600 border-indigo-200",
      border: "border-indigo-400",
      acl: "Full Access to Internal LAN & ERP",
      gateway: "10.10.0.1",
      desc: "Secure corporate network with dynamic per-user RADIUS VLAN assignment, certificate authentication, and high QoS priority.",
    },
    guest: {
      id: "guest",
      name: "Guest-Internet",
      vlanId: 20,
      subnet: "192.168.20.0/24",
      auth: "Captive Portal / WPA2-PSK",
      priority: "Low / Rate-Limited (10 Mbps)",
      color: "text-amber-600",
      bgBadge: "bg-amber-50 text-amber-600 border-amber-200",
      border: "border-amber-400",
      acl: "Strict Internet Only (Block 10.0.0.0/8 & 172.16.0.0/12)",
      gateway: "192.168.20.1",
      desc: "Isolated guest network routed directly to NAT gateway. Client isolation prevents guests from seeing each other's traffic.",
    },
    iot: {
      id: "iot",
      name: "IoT-Sensors",
      vlanId: 30,
      subnet: "172.16.30.0/24",
      auth: "WPA3-SAE / MUP (Pre-Shared Key)",
      priority: "Best Effort",
      color: "text-emerald-600",
      bgBadge: "bg-emerald-50 text-emerald-600 border-emerald-200",
      border: "border-emerald-400",
      acl: "MQTT Broker & CoAP Gateway Only",
      gateway: "172.16.30.1",
      desc: "Dedicated segment for smart lights, thermostats, and industrial sensors with zero peer-to-peer communication allowed.",
    },
    voice: {
      id: "voice",
      name: "Executive-VoIP",
      vlanId: 40,
      subnet: "10.40.0.0/24",
      auth: "WPA2-Enterprise (PEAP-MSCHAPv2)",
      priority: "Voice (WMM / 802.11r Fast BSS)",
      color: "text-violet-600",
      bgBadge: "bg-violet-50 text-violet-600 border-violet-200",
      border: "border-violet-400",
      acl: "SIP PBX & Telephony Servers",
      gateway: "10.40.0.1",
      desc: "Optimized for wireless IP phones and Wi-Fi calling with 802.11r seamless roaming (<50ms handoff delay).",
    },
  };

  const currentSsid = ssidConfigs[selectedSsid];

  // Frequency Bands Data
  const bandData: Record<"2.4ghz" | "5ghz" | "6ghz", BandInfo> = {
    "2.4ghz": {
      name: "2.4 GHz Band (Legacy & IoT)",
      spectrum: "2.412 - 2.484 GHz (~83.5 MHz)",
      channels: "3 Non-overlapping (1, 6, 11 @ 20MHz)",
      maxWidth: "20 MHz (40 MHz not recommended)",
      range: "Long (~100 meters outdoors / 35m indoor)",
      penetration: "Excellent (Passes through concrete & drywall easily)",
      maxPhy: "Up to 286 - 1,148 Mbps (Wi-Fi 6 4x4)",
      interference: "Extremely High (Microwaves, Bluetooth, Zigbee, Baby monitors)",
      keyTech: "DSSS / CCK (802.11b), OFDM (802.11g/n), OFDMA (802.11ax)",
      useCase: "Smart home devices, IoT sensors, legacy hardware, long-range outdoor coverage.",
      pros: ["Maximum signal range and wall penetration", "Compatible with 100% of Wi-Fi hardware"],
      cons: ["Only 3 non-overlapping channels (Heavy congestion)", "Severe Bluetooth & Microwave interference"],
    },
    "5ghz": {
      name: "5 GHz Band (Enterprise Workhorse)",
      spectrum: "5.150 - 5.850 GHz (~500+ MHz)",
      channels: "Up to 25 Non-overlapping 20MHz channels",
      maxWidth: "20 / 40 / 80 / 160 MHz",
      range: "Medium (~35 meters indoor / line of sight)",
      penetration: "Moderate (Attenuated by concrete and brick walls)",
      maxPhy: "Up to 4.8 - 9.6 Gbps (Wi-Fi 6 8x8)",
      interference: "Low to Moderate (Radar / DFS channels in UNII-2)",
      keyTech: "802.11a/n/ac/ax, DFS, MU-MIMO, Explicit Beamforming",
      useCase: "High-density office laptops, corporate smartphones, 4K streaming, low-latency applications.",
      pros: ["Abundant non-overlapping spectrum", "High throughput with 40MHz / 80MHz channel bonding"],
      cons: ["DFS channels require radar evacuation checks", "Higher signal loss through solid walls vs 2.4GHz"],
    },
    "6ghz": {
      name: "6 GHz Band (Wi-Fi 6E & Wi-Fi 7 Next-Gen)",
      spectrum: "5.925 - 7.125 GHz (~1,200 MHz spectrum!)",
      channels: "Up to 59 Non-overlapping 20MHz (or 7x 160MHz / 3x 320MHz)",
      maxWidth: "20 / 40 / 80 / 160 / 320 MHz (Wi-Fi 7 Ultra-wide)",
      range: "Short to Medium (~15 - 25 meters indoor)",
      penetration: "Low (Requires dense Access Point placement)",
      maxPhy: "Up to 46.1 Gbps (Wi-Fi 7 320MHz 4096-QAM MLO)",
      interference: "Zero Legacy Interference (No 802.11b/a/g/n/ac devices allowed)",
      keyTech: "Wi-Fi 6E / Wi-Fi 7 (802.11be), Multi-Link Operation (MLO), AFC (Automated Frequency Coordination), 4096-QAM",
      useCase: "AR/VR headsets, ultra-low-latency financial trading, uncompressed 8K video, high-density auditoriums.",
      pros: ["Massive 1.2 GHz clean spectrum pool", "Zero legacy slow devices allowed on 6GHz radio", "Supports 320 MHz channels & MLO"],
      cons: ["Shortest physical propagation distance", "Requires Wi-Fi 6E/7 client support"],
    },
  };

  const currentBand = bandData[activeBandTab];

  // --- Part 3 Logic: 2.4 GHz Channel Overlap Calculator ---
  const calculate24GhzInterference = (ch1: number, ch2: number) => {
    const diff = Math.abs(ch1 - ch2);
    if (diff === 0) {
      return {
        type: "Co-Channel Interference (CCI)",
        badge: "bg-[#ffa657]/20 text-amber-600 border-amber-400/40",
        desc: "Both APs share the exact same radio channel. APs use CSMA/CA to coordinate airtime. Throughput drops by ~50%, but data packets remain uncorrupted.",
        severity: "Moderate Interference",
      };
    } else if (diff < 5) {
      return {
        type: "Adjacent Channel Interference (ACI)",
        badge: "bg-[#ff7b72]/20 text-rose-600 border-rose-400/40",
        desc: "CRITICAL: Spectral sidebands overlap directly! Transmissions distort each other's preambles, causing severe frame corruption, high CRC errors, and massive packet retries.",
        severity: "Severe Interference (Avoid!)",
      };
    } else {
      return {
        type: "Clean / Zero Overlap",
        badge: "bg-emerald-500/20 text-emerald-600 border-emerald-400/40",
        desc: "Channels are separated by at least 25 MHz (5 channel numbers). Zero spectral overlap. Optimal cellular AP deployment!",
        severity: "Optimal",
      };
    }
  };

  const chInterference = calculate24GhzInterference(ap1Channel, ap2Channel);

  // --- Part 4 Logic: Path Loss & SNR Calculator ---
  // Free Space Path Loss: FSPL = 20*log10(d) + 20*log10(f_GHz) + 32.44
  const fGHz = simBand === "2.4" ? 2.437 : simBand === "5" ? 5.24 : 6.175;
  const pathLoss = Math.round(
    20 * Math.log10(Math.max(1, distance)) + 20 * Math.log10(fGHz) + 32.44 + obstacleLoss
  );
  const rssi = txPower - pathLoss;
  const snr = rssi - noiseFloor;

  // Derive Link Quality & Throughput estimation
  let mcsIndex = "MCS 0";
  let qamModulation = "BPSK";
  let phySpeed = 0;
  let linkQuality = "Disconnected / No Link";
  let linkColor = "text-rose-600";

  if (snr >= 35) {
    mcsIndex = "MCS 11 (Wi-Fi 6)";
    qamModulation = "1024-QAM";
    phySpeed = simBand === "6" ? 2400 : simBand === "5" ? 1201 : 286;
    linkQuality = "Excellent (Pristine Link)";
    linkColor = "text-emerald-600";
  } else if (snr >= 25) {
    mcsIndex = "MCS 9";
    qamModulation = "256-QAM";
    phySpeed = simBand === "6" ? 1800 : simBand === "5" ? 864 : 200;
    linkQuality = "Very Good (High Throughput)";
    linkColor = "text-indigo-600";
  } else if (snr >= 15) {
    mcsIndex = "MCS 6";
    qamModulation = "64-QAM";
    phySpeed = simBand === "6" ? 1080 : simBand === "5" ? 540 : 120;
    linkQuality = "Fair (Moderate Speed)";
    linkColor = "text-amber-600";
  } else if (snr >= 8) {
    mcsIndex = "MCS 2";
    qamModulation = "QPSK";
    phySpeed = simBand === "6" ? 300 : simBand === "5" ? 150 : 30;
    linkQuality = "Marginal (Low Throughput & Retries)";
    linkColor = "text-amber-600";
  } else {
    mcsIndex = "MCS 0";
    qamModulation = "BPSK";
    phySpeed = 10;
    linkQuality = "Unusable / High Packet Loss";
    linkColor = "text-rose-600";
  }

  // Calculate AP1 vs AP2 Channel Overlap in visualizer
  const simChDiff = Math.abs(simAp1Ch - simAp2Ch);
  let overlapStatus = "No Overlap";
  let overlapBadge = "bg-emerald-500/20 text-emerald-600";

  if (simChDiff === 0) {
    overlapStatus = "Co-Channel Interference (100% Channel Collision)";
    overlapBadge = "bg-[#ffa657]/20 text-amber-600";
  } else if (simBand === "2.4" && simChDiff < 5) {
    overlapStatus = `Adjacent Channel Collision (${(5 - simChDiff) * 20}% Spectral Overlap)`;
    overlapBadge = "bg-[#ff7b72]/20 text-rose-600";
  } else if ((simBand === "5" || simBand === "6") && simChDiff < 4) {
    overlapStatus = "Bonded Channel Segment Overlap";
    overlapBadge = "bg-[#ff7b72]/20 text-rose-600";
  }

  return (
    <section
      id="wireless"
      className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* --- Section Header --- */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold">
          #wireless
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          23. Wireless & WLAN Integration
        </h2>
      </div>

      <p className="text-slate-500 text-base leading-relaxed mb-8 max-w-4xl">
        Modern Enterprise Wireless LANs (WLANs) seamlessly bridge unguided RF radio signals to wired Ethernet infrastructures. This section explores <strong className="text-indigo-600">SSID-to-VLAN mapping</strong>, <strong className="text-emerald-600">Wireless LAN Controller (WLC) topologies</strong>, <strong className="text-amber-600">RF spectrum frequency bands (2.4GHz, 5GHz, 6GHz)</strong>, <strong className="text-violet-600">Channel Bonding</strong>, and real-time <strong className="text-rose-600">Signal Propagation & Interference dynamics</strong>.
      </p>

      {/* ========================================================================= */}
      {/* PART 1: SSID-to-VLAN Mapping & Enterprise WLC Topology */}
      {/* ========================================================================= */}
      <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 font-mono text-xs font-bold">
                Part 1 Architecture
              </span>
              <span className="text-xs font-mono text-slate-500">CAPWAP & 802.1Q Trunking</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              SSID-to-VLAN Mapping & WLC Topology
            </h3>
          </div>

          {/* Topology Mode Switcher */}
          <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setWlcTopology("centralized")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                wlcTopology === "centralized"
                  ? "bg-indigo-600 text-slate-900 shadow"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Centralized WLC (Split MAC)
            </button>
            <button
              onClick={() => setWlcTopology("flexconnect")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                wlcTopology === "flexconnect"
                  ? "bg-indigo-600 text-slate-900 shadow"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              FlexConnect / Local Switching
            </button>
          </div>
        </div>

        {/* SSID Selector Buttons */}
        <div className="mb-6">
          <label className="block text-xs font-mono text-slate-500 mb-2">
            SELECT AN ENTERPRISE SSID TO INSPECT ITS NETWORK PATH & POLICY:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.values(ssidConfigs).map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSsid(s.id)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  selectedSsid === s.id
                    ? `${s.bgBadge} ${s.border} ring-1 ring-current`
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-300"
                }`}
              >
                <div>
                  <div className="font-mono text-xs font-bold text-slate-900 mb-1">{s.name}</div>
                  <span className="text-[11px] font-mono opacity-80">VLAN {s.vlanId}</span>
                </div>
                <div className="text-[10px] font-mono mt-2 pt-2 border-t border-slate-200/50 flex justify-between">
                  <span>Subnet:</span>
                  <span className={s.color}>{s.subnet.split("/")[0]}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Topology & Data Path Visualizer */}
        <div className="rounded-xl bg-white border border-slate-200 card-shadow p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
              Live Frame Flow for SSID: <span className={currentSsid.color}>{currentSsid.name}</span>
            </h4>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-50 text-emerald-600 border border-slate-200">
              {wlcTopology === "centralized" ? "CAPWAP Data Tunneling (UDP 5247)" : "Local L2 Switching at AP Switchport"}
            </span>
          </div>

          {/* Interactive Topology Node Flow */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center my-4">
            {/* Step 1: Wireless Client */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase">Step 1: Client</span>
                <div className="text-xs font-bold text-slate-900 mt-1">Wi-Fi Device</div>
                <div className="text-[11px] text-slate-500 mt-1">802.11 Radio Frame</div>
              </div>
              <div className="mt-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200">
                SSID: {currentSsid.name}
              </div>
            </div>

            {/* Step 2: Access Point */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase">Step 2: Access Point</span>
                <div className="text-xs font-bold text-slate-900 mt-1">Enterprise AP</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {wlcTopology === "centralized" ? "Encapsulate CAPWAP" : "Inject 802.1Q Tag"}
                </div>
              </div>
              <div className="mt-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-400/20">
                {wlcTopology === "centralized" ? "CAPWAP Payload" : `VLAN ${currentSsid.vlanId} Tagged`}
              </div>
            </div>

            {/* Step 3: WLC / Switch */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase">
                  {wlcTopology === "centralized" ? "Step 3: WLC" : "Step 3: Access Switch"}
                </span>
                <div className="text-xs font-bold text-slate-900 mt-1">
                  {wlcTopology === "centralized" ? "Wireless Controller" : "L2 Switch Trunk Port"}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {wlcTopology === "centralized" ? "Strip CAPWAP & Tag 802.1Q" : "Forward 802.1Q Trunk"}
                </div>
              </div>
              <div className="mt-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-400/20">
                Dot1Q Tag: VLAN {currentSsid.vlanId}
              </div>
            </div>

            {/* Step 4: Router Gateway */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase">Step 4: L3 Gateway</span>
                <div className="text-xs font-bold text-slate-900 mt-1">Core Switch / Router</div>
                <div className="text-[11px] text-slate-500 mt-1">Default Gateway SVI</div>
              </div>
              <div className="mt-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 border border-violet-400/20">
                {currentSsid.gateway}
              </div>
            </div>
          </div>

          {/* Active Policy Details Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-500">Authentication:</span>
              <div className="text-slate-900 font-semibold mt-0.5">{currentSsid.auth}</div>
            </div>
            <div>
              <span className="text-slate-500">Subnet CIDR:</span>
              <div className="text-indigo-600 font-semibold mt-0.5">{currentSsid.subnet}</div>
            </div>
            <div>
              <span className="text-slate-500">QoS & Priority:</span>
              <div className="text-emerald-600 font-semibold mt-0.5">{currentSsid.priority}</div>
            </div>
            <div>
              <span className="text-slate-500">ACL Policy:</span>
              <div className="text-amber-600 font-semibold mt-0.5">{currentSsid.acl}</div>
            </div>
          </div>
        </div>

        {/* WLC Architecture Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 card-shadow">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-900">Centralized WLC (Split MAC Architecture)</h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-600">CAPWAP Tunnel</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              AP handles real-time 802.11 beaconing and frame acknowledgments (Local MAC). All user data packets are encapsulated in <strong>CAPWAP tunnels (UDP 5247)</strong> and sent to the WLC. WLC performs centralized 802.1X authentication, L2 VLAN tagging, and firewall policy enforcement.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 card-shadow">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-900">FlexConnect (Local Switching Architecture)</h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600">Branch & Remote APs</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Designed for branch offices over WAN. Management and control traffic (CAPWAP Control UDP 5246) goes to the central WLC, but user payload traffic is <strong>switched locally onto the local switch VLANs</strong>. If WAN disconnects, branch APs remain operational locally.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PART 2: Spectrum & Frequency Bands (2.4GHz, 5GHz, 6GHz Wi-Fi 6E/7) */}
      {/* ========================================================================= */}
      <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 font-mono text-xs font-bold">
                Part 2 Spectrum Analysis
              </span>
              <span className="text-xs font-mono text-slate-500">2.4 GHz vs 5 GHz vs 6 GHz (Wi-Fi 6E/7)</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              Wi-Fi Frequency Bands & Technical Comparison
            </h3>
          </div>

          {/* Band Selection Tabs */}
          <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveBandTab("2.4ghz")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeBandTab === "2.4ghz"
                  ? "bg-[#ffa657] text-slate-900 shadow"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              2.4 GHz
            </button>
            <button
              onClick={() => setActiveBandTab("5ghz")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeBandTab === "5ghz"
                  ? "bg-indigo-600 text-slate-900 shadow"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              5 GHz
            </button>
            <button
              onClick={() => setActiveBandTab("6ghz")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeBandTab === "6ghz"
                  ? "bg-[#bc8cff] text-slate-900 shadow"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              6 GHz (Wi-Fi 6E/7)
            </button>
          </div>
        </div>

        {/* Selected Band Focus Card */}
        <div className="rounded-xl bg-white border border-slate-200 card-shadow p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200">
            <h4 className="text-lg font-bold text-slate-900">{currentBand.name}</h4>
            <span className="text-xs font-mono text-indigo-600 bg-slate-50 px-3 py-1 rounded-md border border-slate-200">
              {currentBand.spectrum}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1 font-mono">
              <div className="text-slate-500">Max Channel Width:</div>
              <div className="text-emerald-600 font-bold">{currentBand.maxWidth}</div>
              <div className="text-slate-500 pt-2">Max PHY Speed:</div>
              <div className="text-indigo-600 font-bold">{currentBand.maxPhy}</div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1 font-mono">
              <div className="text-slate-500">Range & Wall Penetration:</div>
              <div className="text-amber-600 font-bold">{currentBand.penetration}</div>
              <div className="text-slate-500 pt-2">Interference Risk:</div>
              <div className="text-rose-600 font-bold">{currentBand.interference}</div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1 font-mono">
              <div className="text-slate-500">Non-Overlapping Channels:</div>
              <div className="text-violet-600 font-bold">{currentBand.channels}</div>
              <div className="text-slate-500 pt-2">Key Technologies:</div>
              <div className="text-slate-900 font-semibold">{currentBand.keyTech}</div>
            </div>
          </div>

          {/* Pros & Cons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50/80 p-3 rounded-lg border border-emerald-200 text-xs">
              <div className="font-bold text-emerald-600 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Advantages
              </div>
              <ul className="space-y-1 text-slate-500">
                {currentBand.pros.map((pro, i) => (
                  <li key={i}>• {pro}</li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-50/80 p-3 rounded-lg border border-rose-200 text-xs">
              <div className="font-bold text-rose-600 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ff7b72]"></span> Disadvantages & Limitations
              </div>
              <ul className="space-y-1 text-slate-500">
                {currentBand.cons.map((con, i) => (
                  <li key={i}>• {con}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Master Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-900">
                <th className="p-3">Specification / Metric</th>
                <th className="p-3 text-amber-600">2.4 GHz Band</th>
                <th className="p-3 text-indigo-600">5 GHz Band</th>
                <th className="p-3 text-violet-600">6 GHz Band (Wi-Fi 6E/7)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d] text-slate-500">
              <tr>
                <td className="p-3 font-bold text-slate-900">Frequency Range</td>
                <td className="p-3">2.412 - 2.484 GHz</td>
                <td className="p-3">5.150 - 5.850 GHz</td>
                <td className="p-3">5.925 - 7.125 GHz</td>
              </tr>
              <tr className="bg-white/50">
                <td className="p-3 font-bold text-slate-900">Total Spectrum Pool</td>
                <td className="p-3 text-amber-600">~83.5 MHz</td>
                <td className="p-3 text-indigo-600">~500 MHz</td>
                <td className="p-3 text-violet-600 font-bold">~1,200 MHz (Massive)</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-slate-900">20MHz Non-Overlapping Ch.</td>
                <td className="p-3">3 Channels (1, 6, 11)</td>
                <td className="p-3">Up to 25 Channels</td>
                <td className="p-3 font-bold text-emerald-600">Up to 59 Channels</td>
              </tr>
              <tr className="bg-white/50">
                <td className="p-3 font-bold text-slate-900">Max Supported Channel Width</td>
                <td className="p-3">20 MHz (40MHz unsafe)</td>
                <td className="p-3">20 / 40 / 80 / 160 MHz</td>
                <td className="p-3 font-bold text-violet-600">Up to 320 MHz (Wi-Fi 7)</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-slate-900">Indoor Coverage Distance</td>
                <td className="p-3 text-emerald-600">~35m (High penetration)</td>
                <td className="p-3 text-indigo-600">~25m (Moderate penetration)</td>
                <td className="p-3 text-rose-600">~15m (Line-of-sight preferred)</td>
              </tr>
              <tr className="bg-white/50">
                <td className="p-3 font-bold text-slate-900">Interference Sources</td>
                <td className="p-3 text-rose-600">Microwaves, Bluetooth, Zigbee</td>
                <td className="p-3 text-amber-600">DFS Weather Radars</td>
                <td className="p-3 text-emerald-600 font-bold">Zero Legacy Devices (Clean)</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-slate-900">Max Theoretical PHY Speed</td>
                <td className="p-3">1.1 Gbps (Wi-Fi 6)</td>
                <td className="p-3">9.6 Gbps (Wi-Fi 6)</td>
                <td className="p-3 text-violet-600 font-bold">46.1 Gbps (Wi-Fi 7 MLO)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PART 3: Non-Overlapping Channel Planner & Channel Bonding */}
      {/* ========================================================================= */}
      <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow mb-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded bg-[#ffa657]/20 text-amber-600 font-mono text-xs font-bold">
            Part 3 Channel Planning
          </span>
          <span className="text-xs font-mono text-slate-500">Channels 1, 6, 11 & Bonding Tree</span>
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-6">
          2.4 GHz Channel Planner & 5/6 GHz Bonding
        </h3>

        {/* 2.4 GHz Interactive Channel Planner */}
        <div className="rounded-xl bg-white border border-slate-200 card-shadow p-5 mb-8">
          <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
            <span>2.4 GHz Channel Overlap Calculator (Channels 1 to 11)</span>
            <span className="text-xs font-mono text-slate-500">20 MHz Width / 5 MHz Spacing</span>
          </h4>

          {/* Controls for AP 1 and AP 2 Channel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="block text-xs font-mono text-indigo-600 mb-1">
                Access Point 1 Channel: <span className="text-slate-900 font-bold">{ap1Channel}</span>
              </label>
              <input
                type="range"
                min="1"
                max="11"
                value={ap1Channel}
                onChange={(e) => setAp1Channel(parseInt(e.target.value))}
                className="w-full accent-[#58a6ff]"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>Ch 1 (2412MHz)</span>
                <span>Ch 6 (2437MHz)</span>
                <span>Ch 11 (2462MHz)</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="block text-xs font-mono text-amber-600 mb-1">
                Access Point 2 Channel: <span className="text-slate-900 font-bold">{ap2Channel}</span>
              </label>
              <input
                type="range"
                min="1"
                max="11"
                value={ap2Channel}
                onChange={(e) => setAp2Channel(parseInt(e.target.value))}
                className="w-full accent-[#ffa657]"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>Ch 1 (2412MHz)</span>
                <span>Ch 6 (2437MHz)</span>
                <span>Ch 11 (2462MHz)</span>
              </div>
            </div>
          </div>

          {/* Interference Result Card */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-500">Calculated Interaction:</span>
              <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${chInterference.badge}`}>
                {chInterference.type} ({chInterference.severity})
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{chInterference.desc}</p>
          </div>

          {/* Visual Channel Spectral Bar */}
          <div className="relative pt-6 pb-2">
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1 px-1">
              {Array.from({ length: 11 }, (_, i) => i + 1).map((ch) => (
                <span
                  key={ch}
                  className={`cursor-pointer transition-colors ${
                    ch === 1 || ch === 6 || ch === 11
                      ? "text-emerald-600 font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                  onClick={() => setAp1Channel(ch)}
                >
                  Ch {ch}
                </span>
              ))}
            </div>

            {/* Spectrum Range Bar */}
            <div className="h-6 w-full bg-slate-50 rounded-lg border border-slate-200 relative overflow-hidden flex items-center px-1">
              {/* Highlight non-overlapping 1, 6, 11 zones */}
              <div className="absolute left-[0%] width-[20%] h-full bg-emerald-50 border-r border-emerald-200"></div>
              <div className="absolute left-[45%] width-[20%] h-full bg-emerald-50 border-x border-emerald-200"></div>
              <div className="absolute left-[80%] width-[20%] h-full bg-emerald-50 border-l border-emerald-200"></div>

              {/* AP 1 Marker */}
              <div
                className="absolute h-4 w-12 rounded bg-indigo-600/80 text-slate-900 text-[10px] font-mono font-bold flex items-center justify-center transition-all shadow"
                style={{ left: `${((ap1Channel - 1) / 10) * 85}%` }}
              >
                AP1
              </div>

              {/* AP 2 Marker */}
              <div
                className="absolute h-4 w-12 rounded bg-[#ffa657]/80 text-slate-900 text-[10px] font-mono font-bold flex items-center justify-center transition-all shadow"
                style={{ left: `${((ap2Channel - 1) / 10) * 85}%` }}
              >
                AP2
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-2 text-center">
              Green shaded zones indicate standard non-overlapping channels (1, 6, 11).
            </div>
          </div>
        </div>

        {/* Channel Bonding Explorer (5GHz & 6GHz) */}
        <div className="rounded-xl bg-white border border-slate-200 card-shadow p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                5 GHz & 6 GHz Channel Bonding Hierarchy
              </h4>
              <p className="text-xs text-slate-500">
                Combines contiguous 20MHz channels to multiply throughput at the expense of spectrum density and SNR.
              </p>
            </div>

            {/* Bonding Width Selector */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
              {([20, 40, 80, 160, 320] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => setBondingWidth(w)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
                    bondingWidth === w
                      ? "bg-[#bc8cff] text-slate-900 font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {w} MHz
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Bonding Hierarchy Diagram */}
          <div className="space-y-3 font-mono text-xs">
            {/* 20 MHz Base Channels */}
            <div>
              <div className="text-[10px] text-slate-500 mb-1">Base 20 MHz Channels:</div>
              <div className="grid grid-cols-8 gap-1 text-center">
                {["36", "40", "44", "48", "52 (DFS)", "56 (DFS)", "60 (DFS)", "64 (DFS)"].map((ch, idx) => (
                  <div
                    key={ch}
                    className={`p-1.5 rounded border ${
                      ch.includes("DFS")
                        ? "bg-amber-50 border-amber-200 text-amber-600"
                        : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  >
                    Ch {ch}
                  </div>
                ))}
              </div>
            </div>

            {/* 40 MHz Bonded */}
            {(bondingWidth >= 40) && (
              <div>
                <div className="text-[10px] text-slate-500 mb-1">Bonded 40 MHz Channels:</div>
                <div className="grid grid-cols-4 gap-1 text-center">
                  <div className="p-1.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-600 font-bold">
                    Ch 38 (36+40)
                  </div>
                  <div className="p-1.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-600 font-bold">
                    Ch 46 (44+48)
                  </div>
                  <div className="p-1.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-600 font-bold">
                    Ch 54 (52+56 DFS)
                  </div>
                  <div className="p-1.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-600 font-bold">
                    Ch 62 (60+64 DFS)
                  </div>
                </div>
              </div>
            )}

            {/* 80 MHz Bonded */}
            {(bondingWidth >= 80) && (
              <div>
                <div className="text-[10px] text-slate-500 mb-1">Bonded 80 MHz Channels:</div>
                <div className="grid grid-cols-2 gap-1 text-center">
                  <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-600 font-bold">
                    Ch 42 (36+40+44+48)
                  </div>
                  <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-600 font-bold">
                    Ch 58 (52+56+60+64 DFS)
                  </div>
                </div>
              </div>
            )}

            {/* 160 MHz Bonded */}
            {(bondingWidth >= 160) && (
              <div>
                <div className="text-[10px] text-slate-500 mb-1">Bonded 160 MHz Channel:</div>
                <div className="p-2.5 rounded bg-violet-50 border border-violet-400/40 text-violet-600 font-bold text-center">
                  Ch 50 (36 + 40 + 44 + 48 + 52 + 56 + 60 + 64)
                </div>
              </div>
            )}

            {/* 320 MHz Bonded Note */}
            {(bondingWidth === 320) && (
              <div className="p-3 rounded-lg bg-[#bc8cff]/20 border border-violet-300 text-xs text-slate-900">
                <div className="font-bold text-violet-600 mb-1">Wi-Fi 7 (802.11be) 320 MHz Channel (6 GHz Only)</div>
                Bonding 16x contiguous 20MHz channels into a single 320 MHz pipe delivers up to 4.8 Gbps per single spatial stream! Requires pristine SNR and line of sight.
              </div>
            )}
          </div>

          {/* SNR Tradeoff Callout */}
          <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
            <div className="text-slate-500">
              <strong className="text-rose-600">Thermal Noise Penalty:</strong> Doubling channel width doubles noise floor (+3 dB noise).
            </div>
            <div className="font-mono text-amber-600 font-bold">
              {bondingWidth === 20 ? "+0 dB (Baseline)" : bondingWidth === 40 ? "+3 dB Noise" : bondingWidth === 80 ? "+6 dB Noise" : bondingWidth === 160 ? "+9 dB Noise" : "+12 dB Noise"}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PART 4: Interactive Wi-Fi Signal & Channel Overlap Visualizer */}
      {/* ========================================================================= */}
      <div className="rounded-xl bg-white border border-slate-200 p-6 card-shadow">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded bg-[#ff7b72]/20 text-rose-600 font-mono text-xs font-bold">
            Part 4 Simulator
          </span>
          <span className="text-xs font-mono text-slate-500">RSSI, Noise Floor, SNR & Spectrum Mask</span>
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-6">
          Interactive Wi-Fi Signal & Spectrum Overlap Visualizer
        </h3>

        {/* Visualizer Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Column 1: Radio & Environment Parameters */}
          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-mono font-bold text-indigo-600 uppercase">1. Transmitter & Environment</h4>

            {/* Band Select */}
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">Frequency Band:</label>
              <div className="grid grid-cols-3 gap-1">
                {(["2.4", "5", "6"] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => {
                      setSimBand(b);
                      if (b === "2.4") {
                        setSimAp1Ch(1);
                        setSimAp2Ch(6);
                      } else {
                        setSimAp1Ch(36);
                        setSimAp2Ch(40);
                      }
                    }}
                    className={`py-1 rounded text-xs font-mono font-semibold transition-all ${
                      simBand === b ? "bg-indigo-600 text-slate-900" : "bg-slate-50 text-slate-500"
                    }`}
                  >
                    {b} GHz
                  </button>
                ))}
              </div>
            </div>

            {/* TX Power Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-500 mb-1">
                <span>TX Power:</span>
                <span className="text-slate-900 font-bold">{txPower} dBm ({Math.round(Math.pow(10, txPower / 10))} mW)</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={txPower}
                onChange={(e) => setTxPower(parseInt(e.target.value))}
                className="w-full accent-[#58a6ff]"
              />
            </div>

            {/* Distance Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-500 mb-1">
                <span>Distance:</span>
                <span className="text-slate-900 font-bold">{distance} meters</span>
              </div>
              <input
                type="range"
                min="1"
                max="60"
                value={distance}
                onChange={(e) => setDistance(parseInt(e.target.value))}
                className="w-full accent-[#58a6ff]"
              />
            </div>

            {/* Obstacle Select */}
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">Obstacles / Walls:</label>
              <select
                value={obstacleLoss}
                onChange={(e) => setObstacleLoss(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono text-slate-900"
              >
                <option value={0}>Direct Line of Sight (0 dB loss)</option>
                <option value={4}>Drywall / Office Partition (+4 dB loss)</option>
                <option value={10}>Double Drywall + Wood (+10 dB loss)</option>
                <option value={16}>Concrete / Brick Wall (+16 dB loss)</option>
                <option value={24}>Shielded Elevator / Metal (+24 dB loss)</option>
              </select>
            </div>
          </div>

          {/* Column 2: Receiver & Channel Placement */}
          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-mono font-bold text-amber-600 uppercase">2. AP Channels & Noise</h4>

            {/* Noise Floor Preset */}
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">RF Noise Floor Preset:</label>
              <select
                value={noiseFloor}
                onChange={(e) => setNoiseFloor(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono text-slate-900"
              >
                <option value={-95}>Quiet Rural Environment (-95 dBm)</option>
                <option value={-90}>Standard Enterprise Office (-90 dBm)</option>
                <option value={-82}>High Density Auditorium (-82 dBm)</option>
                <option value={-75}>Noisy Industrial Factory (-75 dBm)</option>
              </select>
            </div>

            {/* AP1 Channel Selection */}
            <div>
              <label className="block text-xs font-mono text-indigo-600 mb-1">AP 1 Primary Channel:</label>
              <select
                value={simAp1Ch}
                onChange={(e) => setSimAp1Ch(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono text-slate-900"
              >
                {simBand === "2.4"
                  ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((c) => (
                      <option key={c} value={c}>Channel {c} (2412 + {(c - 1) * 5} MHz)</option>
                    ))
                  : [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 149, 153, 157, 161].map((c) => (
                      <option key={c} value={c}>Channel {c}</option>
                    ))}
              </select>
            </div>

            {/* AP2 Channel Selection */}
            <div>
              <label className="block text-xs font-mono text-amber-600 mb-1">AP 2 Co-Located Channel:</label>
              <select
                value={simAp2Ch}
                onChange={(e) => setSimAp2Ch(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono text-slate-900"
              >
                {simBand === "2.4"
                  ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((c) => (
                      <option key={c} value={c}>Channel {c} (2412 + {(c - 1) * 5} MHz)</option>
                    ))
                  : [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 149, 153, 157, 161].map((c) => (
                      <option key={c} value={c}>Channel {c}</option>
                    ))}
              </select>
            </div>
          </div>

          {/* Column 3: Live Real-Time Calculation Metrics */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between font-mono text-xs">
            <div>
              <h4 className="text-xs font-mono font-bold text-emerald-600 uppercase mb-3">3. Derived Signal Quality</h4>

              <div className="space-y-2">
                <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">Path Loss (FSPL):</span>
                  <span className="text-rose-600 font-bold">-{pathLoss} dB</span>
                </div>

                <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">RSSI (Signal):</span>
                  <span className={`font-bold ${rssi > -65 ? "text-emerald-600" : rssi > -78 ? "text-amber-600" : "text-rose-600"}`}>
                    {rssi} dBm
                  </span>
                </div>

                <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">Signal-to-Noise (SNR):</span>
                  <span className={`font-bold ${snr >= 25 ? "text-emerald-600" : snr >= 15 ? "text-indigo-600" : "text-rose-600"}`}>
                    {snr} dB
                  </span>
                </div>

                <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">Est. MCS Index:</span>
                  <span className="text-slate-900 font-bold">{mcsIndex} ({qamModulation})</span>
                </div>

                <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">Max PHY Throughput:</span>
                  <span className="text-emerald-600 font-bold">{phySpeed} Mbps</span>
                </div>
              </div>
            </div>

            <div className={`p-2.5 rounded-lg border text-center text-xs font-bold ${linkColor} bg-slate-50`}>
              {linkQuality}
            </div>
          </div>
        </div>

        {/* Real-time Spectrum Curve SVG Graph */}
        <div className="rounded-xl bg-white border border-slate-200 card-shadow p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200">
            <h4 className="text-sm font-bold text-slate-900">
              Real-Time RF Spectrum Mask & Signal Shape
            </h4>
            <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${overlapBadge}`}>
              {overlapStatus}
            </span>
          </div>

          {/* SVG Spectrum Graph */}
          <div className="w-full h-48 bg-slate-50 rounded-lg border border-slate-200 p-4 relative flex flex-col justify-between">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150">
              {/* Grid Lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="#30363d" strokeDasharray="3 3" />
              <line x1="0" y1="75" x2="500" y2="75" stroke="#30363d" strokeDasharray="3 3" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="#30363d" />

              {/* Noise Floor Threshold Line */}
              <line
                x1="0"
                y1={Math.max(10, Math.min(140, 140 - (Math.abs(noiseFloor) - 50) * 1.8))}
                x2="500"
                y2={Math.max(10, Math.min(140, 140 - (Math.abs(noiseFloor) - 50) * 1.8))}
                stroke="#ff7b72"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text
                x="10"
                y={Math.max(20, Math.min(135, 135 - (Math.abs(noiseFloor) - 50) * 1.8))}
                fill="#ff7b72"
                fontSize="10"
                fontFamily="monospace"
              >
                Noise Floor ({noiseFloor} dBm)
              </text>

              {/* AP 1 Spectral Curve */}
              {(() => {
                const ap1X = Math.max(50, Math.min(450, (simAp1Ch / (simBand === "2.4" ? 11 : 161)) * 400 + 40));
                const ap1H = Math.max(20, Math.min(110, (Math.abs(rssi) < 95 ? (95 - Math.abs(rssi)) * 2 + 20 : 15)));
                return (
                  <g>
                    <path
                      d={`M ${ap1X - 40} 140 Q ${ap1X} ${140 - ap1H} ${ap1X + 40} 140`}
                      fill="rgba(88, 166, 255, 0.25)"
                      stroke="#58a6ff"
                      strokeWidth="2.5"
                    />
                    <text x={ap1X - 15} y={135 - ap1H} fill="#58a6ff" fontSize="11" fontWeight="bold" fontFamily="monospace">
                      AP1 (Ch {simAp1Ch})
                    </text>
                  </g>
                );
              })()}

              {/* AP 2 Spectral Curve */}
              {(() => {
                const ap2X = Math.max(50, Math.min(450, (simAp2Ch / (simBand === "2.4" ? 11 : 161)) * 400 + 40));
                const ap2H = 75; // Baseline AP2 signal
                return (
                  <g>
                    <path
                      d={`M ${ap2X - 40} 140 Q ${ap2X} ${140 - ap2H} ${ap2X + 40} 140`}
                      fill="rgba(255, 166, 87, 0.25)"
                      stroke="#ffa657"
                      strokeWidth="2.5"
                    />
                    <text x={ap2X - 15} y={135 - ap2H} fill="#ffa657" fontSize="11" fontWeight="bold" fontFamily="monospace">
                      AP2 (Ch {simAp2Ch})
                    </text>
                  </g>
                );
              })()}
            </svg>

            {/* Spectrum Axis Footer */}
            <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-200">
              <span>Frequency Start</span>
              <span>Primary Operating Channels</span>
              <span>Frequency End</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
