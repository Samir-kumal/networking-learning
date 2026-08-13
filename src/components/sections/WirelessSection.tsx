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
      color: "text-indigo-600 dark:text-indigo-400",
      bgBadge: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700",
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
      color: "text-amber-600 dark:text-amber-400",
      bgBadge: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700",
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
      auth: "WPA3-SAE (PMF required)",
      priority: "Best Effort",
      color: "text-emerald-600 dark:text-emerald-400",
      bgBadge: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700",
      border: "border-emerald-400",
      acl: "MQTT Broker & CoAP Gateway Only",
      gateway: "172.16.30.1",
      desc: "Dedicated segment for smart lights, thermostats, and industrial sensors. Peer-to-peer access is a policy choice enforced by the WLAN and network controls.",
    },
    voice: {
      id: "voice",
      name: "Executive-VoIP",
      vlanId: 40,
      subnet: "10.40.0.0/24",
      auth: "WPA2-Enterprise (PEAP-MSCHAPv2)",
      priority: "Voice (WMM / optional 802.11r)",
      color: "text-violet-600 dark:text-violet-400",
      bgBadge: "bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-700",
      border: "border-violet-400",
      acl: "SIP PBX & Telephony Servers",
      gateway: "10.40.0.1",
      desc: "Can support wireless IP phones and Wi-Fi calling with QoS and, where supported, 802.11r fast transition; handoff time depends on the client and WLAN design.",
    },
  };

  const currentSsid = ssidConfigs[selectedSsid];

  // Frequency Bands Data
  const bandData: Record<"2.4ghz" | "5ghz" | "6ghz", BandInfo> = {
    "2.4ghz": {
      name: "2.4 GHz Band (Legacy & IoT)",
      spectrum: "2.400 - 2.4835 GHz (regulatory-domain dependent channel use)",
      channels: "Channels 1, 6, and 11 are a common non-overlapping 20 MHz plan in North America",
      maxWidth: "20 MHz is common; 40 MHz may be available but is often avoided in dense deployments",
      range: "Often longer reach than higher bands; distance depends on power, antennas, and the environment",
      penetration: "Often less attenuated than higher frequencies, but building materials vary",
      maxPhy: "PHY rate depends on Wi-Fi generation, channel width, streams, and modulation",
      interference: "Unlicensed users, microwaves, Bluetooth, Zigbee, and neighboring WLANs",
      keyTech: "DSSS / CCK (802.11b), OFDM (802.11g), OFDM/OFDMA (802.11n/ax)",
      useCase: "Broad-compatibility devices, IoT, and coverage where capacity demands are modest.",
      pros: ["Often better reach through typical indoor obstacles", "Broad client compatibility"],
      cons: ["Fewer clean 20 MHz planning choices", "Often congested in homes and dense deployments"],
    },
    "5ghz": {
      name: "5 GHz Band (Enterprise Workhorse)",
      spectrum: "5 GHz channels and permitted power vary by regulatory domain",
      channels: "More 20 MHz planning choices than 2.4 GHz; exact count depends on the region and DFS rules",
      maxWidth: "20 / 40 / 80 / 160 MHz where permitted by the AP, client, and regulatory domain",
      range: "Often shorter reach than 2.4 GHz at the same conditions; environment and power dominate",
      penetration: "Often more attenuated by walls than 2.4 GHz",
      maxPhy: "PHY rate depends on Wi-Fi generation, channel width, streams, and modulation",
      interference: "Neighboring WLANs and, on DFS channels, radar-detection requirements",
      keyTech: "802.11a/n/ac/ax, DFS, MU-MIMO, and beamforming",
      useCase: "Higher-capacity client access when the site supports suitable channel reuse.",
      pros: ["More spectrum for channel reuse", "Supports wider channels where appropriate"],
      cons: ["DFS behavior can require channel changes", "Higher wall attenuation than 2.4 GHz is common"],
    },
    "6ghz": {
      name: "6 GHz Band (Wi-Fi 6E & Wi-Fi 7)",
      spectrum: "5.925 - 7.125 GHz where the regulatory domain permits the full band",
      channels: "Channel count and power rules vary by country; 20/160/320 MHz availability is regulatory- and device-dependent",
      maxWidth: "20 / 40 / 80 / 160 / 320 MHz where supported",
      range: "Often shorter reach than 5 GHz at the same conditions; design depends on power and environment",
      penetration: "Higher free-space and material loss than lower bands is common",
      maxPhy: "Wi-Fi 7 can advertise multi-gigabit theoretical PHY rates; actual throughput is lower and configuration-dependent",
      interference: "No legacy 2.4/5 GHz clients on the band, but neighboring 6 GHz WLANs and incumbent users still matter",
      keyTech: "Wi-Fi 6E / Wi-Fi 7, Multi-Link Operation, AFC where required, and 4096-QAM",
      useCase: "Newer clients needing additional capacity and wider channels.",
      pros: ["Additional spectrum in supported regions", "No legacy 2.4/5 GHz clients competing on the band"],
      cons: ["Requires compatible clients and APs", "Shorter reach and regulatory limits can constrain coverage"],
    },
  };

  const currentBand = bandData[activeBandTab];

  // --- Part 3 Logic: 2.4 GHz Channel Overlap Calculator ---
  const calculate24GhzInterference = (ch1: number, ch2: number) => {
    const diff = Math.abs(ch1 - ch2);
    if (diff === 0) {
      return {
        type: "Co-Channel Interference (CCI)",
        badge: "bg-[#ffa657]/20 text-amber-600 dark:text-amber-400 border-amber-400/40",
        desc: "Both APs use the same channel and therefore share airtime through CSMA/CA. Capacity depends on load and contention; there is no fixed percentage loss and frames may still be retransmitted.",
        severity: "Shared Airtime",
      };
    } else if (diff < 5) {
      return {
        type: "Possible Adjacent-Channel Overlap",
        badge: "bg-[#ff7b72]/20 text-rose-600 dark:text-rose-400 border-rose-400/40",
        desc: "This simplified 20 MHz channel-number heuristic flags nearby channels that may overlap. Actual interference depends on channel width, regulatory plan, radio filters, and local RF energy.",
        severity: "Review Channel Plan",
      };
    } else {
      return {
        type: "Separated in This Simplified Model",
        badge: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-400/40",
        desc: "The selected channels are separated by at least five channel numbers in this 20 MHz model. Validate the result against the actual regulatory channel plan and width.",
        severity: "Lower Overlap Risk",
      };
    }
  };
  // This is an educational channel-number heuristic, not an RF propagation model.
  const simChDiff = Math.abs(simAp1Ch - simAp2Ch);
  let overlapStatus = "Separated in simplified model";
  let overlapBadge = "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400";

  if (simChDiff === 0) {
    overlapStatus = "Co-channel airtime sharing";
    overlapBadge = "bg-[#ffa657]/20 text-amber-600 dark:text-amber-400";
  } else if (simBand === "2.4" && simChDiff < 5) {
    overlapStatus = "Possible adjacent-channel overlap";
    overlapBadge = "bg-[#ff7b72]/20 text-rose-600 dark:text-rose-400";
  } else if ((simBand === "5" || simBand === "6") && simChDiff < 4) {
    overlapStatus = "Possible channel-width overlap";
    overlapBadge = "bg-[#ff7b72]/20 text-rose-600 dark:text-rose-400";
  }

  const chInterference = calculate24GhzInterference(ap1Channel, ap2Channel);

  // --- Part 4 Logic: Path Loss & SNR Calculator ---
  // Free-space path-loss estimate with a configurable illustrative obstacle penalty.
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
  let linkColor = "text-slate-500 dark:text-slate-400";

  if (snr >= 35) {
    mcsIndex = "MCS 11 (Wi-Fi 6)";
    qamModulation = "1024-QAM";
    phySpeed = simBand === "6" ? 2400 : simBand === "5" ? 1201 : 286;
    linkQuality = "Excellent (Pristine Link)";
    linkColor = "text-emerald-600 dark:text-emerald-400";
  } else if (snr >= 25) {
    mcsIndex = "MCS 9";
    qamModulation = "256-QAM";
    phySpeed = simBand === "6" ? 1800 : simBand === "5" ? 864 : 200;
    linkQuality = "Very Good (High Throughput)";
    linkColor = "text-indigo-600 dark:text-indigo-400";
  } else if (snr >= 15) {
    mcsIndex = "MCS 6";
    qamModulation = "64-QAM";
    phySpeed = simBand === "6" ? 1080 : simBand === "5" ? 540 : 120;
    linkQuality = "Fair (Moderate Speed)";
    linkColor = "text-amber-600 dark:text-amber-400";
  } else if (snr >= 8) {
    mcsIndex = "MCS 2";
    qamModulation = "QPSK";
    phySpeed = simBand === "6" ? 300 : simBand === "5" ? 150 : 30;
    linkQuality = "Marginal (Low Throughput & Retries)";
    linkColor = "text-amber-600 dark:text-amber-400";
  } else {
    mcsIndex = "MCS 0";
    qamModulation = "BPSK";
    phySpeed = 10;
    linkQuality = "Unusable / High Packet Loss";
    linkColor = "text-rose-600 dark:text-rose-400";
  }


  return (
    <section
      id="wireless"
      className="scroll-mt-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow sm:p-8 card-shadow transition-colors hover:border-indigo-300 card-shadow"
    >
      {/* --- Section Header --- */}
      <div className="flex items-center gap-3 mb-4">
        <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 text-[11px] font-semibold">
          #wireless
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
          <span className="text-indigo-500 dark:text-indigo-400" aria-hidden="true">⬡</span>
          13. Wireless & WLAN Integration
        </h2>
      </div>

      <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed mb-8 max-w-4xl">
        Modern enterprise wireless LANs bridge 802.11 radio networks to wired Ethernet through access points and, in many designs, a wireless LAN controller. This section explores <strong className="text-indigo-600 dark:text-indigo-400">SSID-to-VLAN mapping</strong>, <strong className="text-emerald-600 dark:text-emerald-400">WLC topologies</strong>, <strong className="text-amber-600 dark:text-amber-400">2.4GHz, 5GHz, and 6GHz bands</strong>, <strong className="text-violet-600 dark:text-violet-400">RF planning</strong>, and <strong className="text-rose-600 dark:text-rose-400">Wi-Fi 6/6E/7 behavior</strong>.
      </p>

      {/* ========================================================================= */}
      {/* PART 1: SSID-to-VLAN Mapping & Enterprise WLC Topology */}
      {/* ========================================================================= */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-bold">
                Part 1 Architecture
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">CAPWAP & 802.1Q Trunking</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              SSID-to-VLAN Mapping & WLC Topology
            </h3>
          </div>

          {/* Topology Mode Switcher */}
          <div className="flex items-center bg-slate-50 dark:bg-slate-700 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setWlcTopology("centralized")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                wlcTopology === "centralized"
                  ? "bg-indigo-600 text-slate-900 dark:text-slate-100 shadow"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100"
              }`}
            >
              Centralized WLC (Split MAC)
            </button>
            <button
              onClick={() => setWlcTopology("flexconnect")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                wlcTopology === "flexconnect"
                  ? "bg-indigo-600 text-slate-900 dark:text-slate-100 shadow"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100"
              }`}
            >
              FlexConnect / Local Switching
            </button>
          </div>
        </div>

        {/* SSID Selector Buttons */}
        <div className="mb-6">
          <label className="block text-xs font-mono text-slate-500 dark:text-slate-400 mb-2">
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
                    : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300"
                }`}
              >
                <div>
                  <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">{s.name}</div>
                  <span className="text-[11px] font-mono opacity-80">VLAN {s.vlanId}</span>
                </div>
                <div className="text-[10px] font-mono mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-between">
                  <span>Subnet:</span>
                  <span className={s.color}>{s.subnet.split("/")[0]}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Topology & Data Path Visualizer */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
              Live Frame Flow for SSID: <span className={currentSsid.color}>{currentSsid.name}</span>
            </h4>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700">
              {wlcTopology === "centralized" ? "CAPWAP Data Tunneling (UDP 5247)" : "Local L2 Switching at AP Switchport"}
            </span>
          </div>

          {/* Interactive Topology Node Flow */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center my-4">
            {/* Step 1: Wireless Client */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Step 1: Client</span>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">Wi-Fi Device</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">802.11 Radio Frame</div>
              </div>
              <div className="mt-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700">
                SSID: {currentSsid.name}
              </div>
            </div>

            {/* Step 2: Access Point */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Step 2: Access Point</span>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">Enterprise AP</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {wlcTopology === "centralized" ? "Encapsulate CAPWAP" : "Inject 802.1Q Tag"}
                </div>
              </div>
              <div className="mt-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-400/20">
                {wlcTopology === "centralized" ? "CAPWAP Payload" : `VLAN ${currentSsid.vlanId} Tagged`}
              </div>
            </div>

            {/* Step 3: WLC / Switch */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                  {wlcTopology === "centralized" ? "Step 3: WLC" : "Step 3: Access Switch"}
                </span>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {wlcTopology === "centralized" ? "Wireless Controller" : "L2 Switch Trunk Port"}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {wlcTopology === "centralized" ? "Strip CAPWAP & Tag 802.1Q" : "Forward 802.1Q Trunk"}
                </div>
              </div>
              <div className="mt-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-400/20">
                Dot1Q Tag: VLAN {currentSsid.vlanId}
              </div>
            </div>

            {/* Step 4: Router Gateway */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Step 4: L3 Gateway</span>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">Core Switch / Router</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Default Gateway SVI</div>
              </div>
              <div className="mt-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border border-violet-400/20">
                {currentSsid.gateway}
              </div>
            </div>
          </div>

          {/* Active Policy Details Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Authentication:</span>
              <div className="text-slate-900 dark:text-slate-100 font-semibold mt-0.5">{currentSsid.auth}</div>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Subnet CIDR:</span>
              <div className="text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">{currentSsid.subnet}</div>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">QoS & Priority:</span>
              <div className="text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">{currentSsid.priority}</div>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">ACL Policy:</span>
              <div className="text-amber-600 dark:text-amber-400 font-semibold mt-0.5">{currentSsid.acl}</div>
            </div>
          </div>
        </div>

        {/* WLC Architecture Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Centralized WLC (Split MAC Architecture)</h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 dark:text-indigo-400">CAPWAP Tunnel</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              The AP handles time-sensitive 802.11 radio work. In a centralized forwarding design, user traffic commonly travels in CAPWAP data (UDP 5247) to the WLC, while authentication and policy placement depend on the controller design.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">FlexConnect (Local Switching Architecture)</h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">Branch & Remote APs</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              In local-switching designs, CAPWAP control traffic (UDP 5246) reaches the WLC while user payload is switched onto local VLANs. Continued branch service during a WAN outage depends on the AP, authentication, and site configuration.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PART 2: Spectrum & Frequency Bands (2.4GHz, 5GHz, 6GHz Wi-Fi 6E/7) */}
      {/* ========================================================================= */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold">
                Part 2 Spectrum Analysis
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">2.4 GHz vs 5 GHz vs 6 GHz (Wi-Fi 6E/7)</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Wi-Fi Frequency Bands & Technical Comparison
            </h3>
          </div>

          {/* Band Selection Tabs */}
          <div className="flex items-center bg-slate-50 dark:bg-slate-700 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveBandTab("2.4ghz")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeBandTab === "2.4ghz"
                  ? "bg-[#ffa657] text-slate-900 dark:text-slate-100 shadow"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100"
              }`}
            >
              2.4 GHz
            </button>
            <button
              onClick={() => setActiveBandTab("5ghz")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeBandTab === "5ghz"
                  ? "bg-indigo-600 text-slate-900 dark:text-slate-100 shadow"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100"
              }`}
            >
              5 GHz
            </button>
            <button
              onClick={() => setActiveBandTab("6ghz")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeBandTab === "6ghz"
                  ? "bg-[#bc8cff] text-slate-900 dark:text-slate-100 shadow"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100"
              }`}
            >
              6 GHz (Wi-Fi 6E/7)
            </button>
          </div>
        </div>

        {/* Selected Band Focus Card */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">{currentBand.name}</h4>
            <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-700 px-3 py-1 rounded-md border border-slate-200 dark:border-slate-700">
              {currentBand.spectrum}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1 font-mono">
              <div className="text-slate-500 dark:text-slate-400">Max Channel Width:</div>
              <div className="text-emerald-600 dark:text-emerald-400 font-bold">{currentBand.maxWidth}</div>
              <div className="text-slate-500 dark:text-slate-400 pt-2">Max PHY Speed:</div>
              <div className="text-indigo-600 dark:text-indigo-400 font-bold">{currentBand.maxPhy}</div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1 font-mono">
              <div className="text-slate-500 dark:text-slate-400">Range & Wall Penetration:</div>
              <div className="text-amber-600 dark:text-amber-400 font-bold">{currentBand.penetration}</div>
              <div className="text-slate-500 dark:text-slate-400 pt-2">Interference Risk:</div>
              <div className="text-rose-600 dark:text-rose-400 font-bold">{currentBand.interference}</div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1 font-mono">
              <div className="text-slate-500 dark:text-slate-400">Non-Overlapping Channels:</div>
              <div className="text-violet-600 dark:text-violet-400 font-bold">{currentBand.channels}</div>
              <div className="text-slate-500 dark:text-slate-400 pt-2">Key Technologies:</div>
              <div className="text-slate-900 dark:text-slate-100 font-semibold">{currentBand.keyTech}</div>
            </div>
          </div>

          {/* Pros & Cons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50/80 dark:bg-slate-700/80 p-3 rounded-lg border border-emerald-200 dark:border-emerald-700 text-xs">
              <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Advantages
              </div>
              <ul className="space-y-1 text-slate-500 dark:text-slate-400">
                {currentBand.pros.map((pro, i) => (
                  <li key={i}>• {pro}</li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-50/80 dark:bg-slate-700/80 p-3 rounded-lg border border-rose-200 dark:border-rose-700 text-xs">
              <div className="font-bold text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ff7b72]"></span> Disadvantages & Limitations
              </div>
              <ul className="space-y-1 text-slate-500 dark:text-slate-400">
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
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100">
                <th className="p-3">Specification / Metric</th>
                <th className="p-3 text-amber-600 dark:text-amber-400">2.4 GHz Band</th>
                <th className="p-3 text-indigo-600 dark:text-indigo-400">5 GHz Band</th>
                <th className="p-3 text-violet-600 dark:text-violet-400">6 GHz Band (Wi-Fi 6E/7)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d] text-slate-500 dark:text-slate-400">
              <tr>
                <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Frequency Range</td>
                <td className="p-3">2.400 - 2.4835 GHz (region-dependent use)</td>
                <td className="p-3">5 GHz ranges vary by regulatory domain</td>
                <td className="p-3">5.925 - 7.125 GHz where the region permits the full band</td>
              </tr>
              <tr className="bg-white/50 dark:bg-slate-800/50">
                <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Available Spectrum</td>
                <td className="p-3 text-amber-600 dark:text-amber-400">About 83.5 MHz of band space</td>
                <td className="p-3 text-indigo-600 dark:text-indigo-400">Varies by region and permitted channels</td>
                <td className="p-3 text-violet-600 dark:text-violet-400 font-bold">Up to about 1,200 MHz in regions with the full allocation</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-slate-900 dark:text-slate-100">20 MHz Planning Choices</td>
                <td className="p-3">1, 6, and 11 are a common North American plan</td>
                <td className="p-3">Count varies by region, DFS, and channel availability</td>
                <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">Count varies by region and power class</td>
              </tr>
              <tr className="bg-white/50 dark:bg-slate-800/50">
                <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Channel Width</td>
                <td className="p-3">20 MHz common; 40 MHz may be supported</td>
                <td className="p-3">20 / 40 / 80 / 160 MHz where permitted</td>
                <td className="p-3 font-bold text-violet-600 dark:text-violet-400">Up to 320 MHz with supported Wi-Fi 7 devices and rules</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Coverage</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400">Often longer reach in the same environment</td>
                <td className="p-3 text-indigo-600 dark:text-indigo-400">Often shorter reach than 2.4 GHz at the same conditions</td>
                <td className="p-3 text-rose-600 dark:text-rose-400">Often shorter reach than 5 GHz at the same conditions</td>
              </tr>
              <tr className="bg-white/50 dark:bg-slate-800/50">
                <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Interference Sources</td>
                <td className="p-3 text-rose-600 dark:text-rose-400">Neighboring WLANs, microwaves, Bluetooth, and Zigbee</td>
                <td className="p-3 text-amber-600 dark:text-amber-400">Neighboring WLANs and radar rules on DFS channels</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400 font-bold">No legacy 2.4/5 GHz clients; other 6 GHz users still contend</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-slate-900 dark:text-slate-100">Theoretical PHY Rate</td>
                <td className="p-3">Depends on Wi-Fi generation, width, streams, and modulation</td>
                <td className="p-3">Depends on Wi-Fi generation, width, streams, and modulation</td>
                <td className="p-3 text-violet-600 dark:text-violet-400 font-bold">Wi-Fi 7 advertises multi-gigabit rates; actual throughput varies</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PART 3: Non-Overlapping Channel Planner & Channel Bonding */}
      {/* ========================================================================= */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow mb-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded bg-[#ffa657]/20 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold">
            Part 3 Channel Planning
          </span>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Channels 1, 6, 11 & Bonding Tree</span>
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
          2.4 GHz Channel Planner & 5/6 GHz Bonding
        </h3>

        {/* 2.4 GHz Interactive Channel Planner */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow p-5 mb-8">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center justify-between">
            <span>2.4 GHz Channel Overlap Calculator (Channels 1 to 11)</span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">20 MHz Width / 5 MHz Spacing</span>
          </h4>

          {/* Controls for AP 1 and AP 2 Channel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <label className="block text-xs font-mono text-indigo-600 dark:text-indigo-400 mb-1">
                Access Point 1 Channel: <span className="text-slate-900 dark:text-slate-100 font-bold">{ap1Channel}</span>
              </label>
              <input
                type="range"
                aria-label="Access Point 1 channel"
                min="1"
                max="11"
                value={ap1Channel}
                onChange={(e) => setAp1Channel(parseInt(e.target.value))}
                className="w-full accent-[#58a6ff]"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                <span>Ch 1 (2412MHz)</span>
                <span>Ch 6 (2437MHz)</span>
                <span>Ch 11 (2462MHz)</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <label className="block text-xs font-mono text-amber-600 dark:text-amber-400 mb-1">
                Access Point 2 Channel: <span className="text-slate-900 dark:text-slate-100 font-bold">{ap2Channel}</span>
              </label>
              <input
                type="range"
                aria-label="Access Point 2 channel"
                min="1"
                max="11"
                value={ap2Channel}
                onChange={(e) => setAp2Channel(parseInt(e.target.value))}
                className="w-full accent-[#ffa657]"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                <span>Ch 1 (2412MHz)</span>
                <span>Ch 6 (2437MHz)</span>
                <span>Ch 11 (2462MHz)</span>
              </div>
            </div>
          </div>

          {/* Interference Result Card */}
          <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg border border-slate-200 dark:border-slate-700 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Calculated Interaction:</span>
              <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${chInterference.badge}`}>
                {chInterference.type} ({chInterference.severity})
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{chInterference.desc}</p>
          </div>

          {/* Visual Channel Spectral Bar */}
          <div className="relative pt-6 pb-2">
            <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1 px-1">
              {Array.from({ length: 11 }, (_, i) => i + 1).map((ch) => (
                <span
                  key={ch}
                  className={`cursor-pointer transition-colors ${
                    ch === 1 || ch === 6 || ch === 11
                      ? "text-emerald-600 dark:text-emerald-400 font-bold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100"
                  }`}
                  onClick={() => setAp1Channel(ch)}
                >
                  Ch {ch}
                </span>
              ))}
            </div>

            {/* Spectrum Range Bar */}
            <div className="h-6 w-full bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 relative overflow-hidden flex items-center px-1">
              {/* Highlight non-overlapping 1, 6, 11 zones */}
              <div className="absolute left-[0%] width-[20%] h-full bg-emerald-50 dark:bg-emerald-900/30 border-r border-emerald-200 dark:border-emerald-700"></div>
              <div className="absolute left-[45%] width-[20%] h-full bg-emerald-50 dark:bg-emerald-900/30 border-x border-emerald-200 dark:border-emerald-700"></div>
              <div className="absolute left-[80%] width-[20%] h-full bg-emerald-50 dark:bg-emerald-900/30 border-l border-emerald-200 dark:border-emerald-700"></div>

              {/* AP 1 Marker */}
              <div
                className="absolute h-4 w-12 rounded bg-indigo-600/80 text-slate-900 dark:text-slate-100 text-[10px] font-mono font-bold flex items-center justify-center transition-all shadow"
                style={{ left: `${((ap1Channel - 1) / 10) * 85}%` }}
              >
                AP1
              </div>

              {/* AP 2 Marker */}
              <div
                className="absolute h-4 w-12 rounded bg-[#ffa657]/80 text-slate-900 dark:text-slate-100 text-[10px] font-mono font-bold flex items-center justify-center transition-all shadow"
                style={{ left: `${((ap2Channel - 1) / 10) * 85}%` }}
              >
                AP2
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-2 text-center">
              Green shaded zones indicate standard non-overlapping channels (1, 6, 11).
            </div>
          </div>
        </div>

        {/* Channel Bonding Explorer (5GHz & 6GHz) */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                5 GHz & 6 GHz Channel Bonding Hierarchy
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Combines contiguous 20MHz channels to multiply throughput at the expense of spectrum density and SNR.
              </p>
            </div>

            {/* Bonding Width Selector */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              {([20, 40, 80, 160, 320] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => setBondingWidth(w)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
                    bondingWidth === w
                      ? "bg-[#bc8cff] text-slate-900 dark:text-slate-100 font-bold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100"
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
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">Base 20 MHz Channels:</div>
              <div className="grid grid-cols-8 gap-1 text-center">
                {["36", "40", "44", "48", "52 (DFS)", "56 (DFS)", "60 (DFS)", "64 (DFS)"].map((ch, idx) => (
                  <div
                    key={ch}
                    className={`p-1.5 rounded border ${
                      ch.includes("DFS")
                        ? "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400"
                        : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
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
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">Bonded 40 MHz Channels:</div>
                <div className="grid grid-cols-4 gap-1 text-center">
                  <div className="p-1.5 rounded bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 font-bold">
                    Ch 38 (36+40)
                  </div>
                  <div className="p-1.5 rounded bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 font-bold">
                    Ch 46 (44+48)
                  </div>
                  <div className="p-1.5 rounded bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 font-bold">
                    Ch 54 (52+56 DFS)
                  </div>
                  <div className="p-1.5 rounded bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 font-bold">
                    Ch 62 (60+64 DFS)
                  </div>
                </div>
              </div>
            )}

            {/* 80 MHz Bonded */}
            {(bondingWidth >= 80) && (
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">Bonded 80 MHz Channels:</div>
                <div className="grid grid-cols-2 gap-1 text-center">
                  <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 font-bold">
                    Ch 42 (36+40+44+48)
                  </div>
                  <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 font-bold">
                    Ch 58 (52+56+60+64 DFS)
                  </div>
                </div>
              </div>
            )}

            {/* 160 MHz Bonded */}
            {(bondingWidth >= 160) && (
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">Bonded 160 MHz Channel:</div>
                <div className="p-2.5 rounded bg-violet-50 dark:bg-violet-900/30 border border-violet-400/40 text-violet-600 dark:text-violet-400 font-bold text-center">
                  Ch 50 (36 + 40 + 44 + 48 + 52 + 56 + 60 + 64)
                </div>
              </div>
            )}

            {/* 320 MHz Bonded Note */}
            {(bondingWidth === 320) && (
              <div className="p-3 rounded-lg bg-[#bc8cff]/20 border border-violet-300 text-xs text-slate-900 dark:text-slate-100">
                <div className="font-bold text-violet-600 dark:text-violet-400 mb-1">Wi-Fi 7 (802.11be) 320 MHz Channel (6 GHz Only)</div>
                A 320 MHz channel combines sixteen contiguous 20 MHz channels. It can support multi-gigabit PHY rates with favorable modulation and coding; actual throughput depends on signal quality, client capability, and airtime sharing.
              </div>
            )}
          </div>

          {/* SNR Tradeoff Callout */}
          <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs flex items-center justify-between">
            <div className="text-slate-500 dark:text-slate-400">
              <strong className="text-rose-600 dark:text-rose-400">Thermal Noise Penalty:</strong> Doubling channel width doubles noise floor (+3 dB noise).
            </div>
            <div className="font-mono text-amber-600 dark:text-amber-400 font-bold">
              {bondingWidth === 20 ? "+0 dB (Baseline)" : bondingWidth === 40 ? "+3 dB Noise" : bondingWidth === 80 ? "+6 dB Noise" : bondingWidth === 160 ? "+9 dB Noise" : "+12 dB Noise"}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PART 4: Interactive Wi-Fi Signal & Channel Overlap Visualizer */}
      {/* ========================================================================= */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded bg-[#ff7b72]/20 text-rose-600 dark:text-rose-400 font-mono text-xs font-bold">
            Part 4 Simulator
          </span>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">RSSI, Noise Floor, SNR & Spectrum Mask</span>
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
          Interactive Wi-Fi Signal & Spectrum Overlap Visualizer
        </h3>

        {/* Visualizer Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Column 1: Radio & Environment Parameters */}
          <div className="space-y-4 bg-slate-50 dark:bg-slate-700 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <h4 className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase">1. Transmitter & Environment</h4>

            {/* Band Select */}
            <div>
              <label className="block text-xs font-mono text-slate-500 dark:text-slate-400 mb-1">Frequency Band:</label>
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
                      simBand === b ? "bg-indigo-600 text-slate-900 dark:text-slate-100" : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {b} GHz
                  </button>
                ))}
              </div>
            </div>

            {/* TX Power Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-500 dark:text-slate-400 mb-1">
                <span>TX Power:</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">{txPower} dBm ({Math.round(Math.pow(10, txPower / 10))} mW)</span>
              </div>
              <input
                type="range"
                aria-label="Transmit power"
                min="5"
                max="30"
                value={txPower}
                onChange={(e) => setTxPower(parseInt(e.target.value))}
                className="w-full accent-[#58a6ff]"
              />
            </div>

            {/* Distance Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-500 dark:text-slate-400 mb-1">
                <span>Distance:</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">{distance} meters</span>
              </div>
              <input
                type="range"
                aria-label="Wireless signal distance"
                min="1"
                max="60"
                value={distance}
                onChange={(e) => setDistance(parseInt(e.target.value))}
                className="w-full accent-[#58a6ff]"
              />
            </div>

            {/* Obstacle Select */}
            <div>
              <label className="block text-xs font-mono text-slate-500 dark:text-slate-400 mb-1">Obstacles / Walls:</label>
              <select
                aria-label="Obstacles and walls"
                value={obstacleLoss}
                onChange={(e) => setObstacleLoss(parseInt(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded p-2 text-xs font-mono text-slate-900 dark:text-slate-100"
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
          <div className="space-y-4 bg-slate-50 dark:bg-slate-700 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <h4 className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase">2. AP Channels & Noise</h4>

            {/* Noise Floor Preset */}
            <div>
              <label className="block text-xs font-mono text-slate-500 dark:text-slate-400 mb-1">RF Noise Floor Preset:</label>
              <select
                aria-label="RF noise floor preset"
                value={noiseFloor}
                onChange={(e) => setNoiseFloor(parseInt(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded p-2 text-xs font-mono text-slate-900 dark:text-slate-100"
              >
                <option value={-95}>Quiet Rural Environment (-95 dBm)</option>
                <option value={-90}>Standard Enterprise Office (-90 dBm)</option>
                <option value={-82}>High Density Auditorium (-82 dBm)</option>
                <option value={-75}>Noisy Industrial Factory (-75 dBm)</option>
              </select>
            </div>

            {/* AP1 Channel Selection */}
            <div>
              <label className="block text-xs font-mono text-indigo-600 dark:text-indigo-400 mb-1">AP 1 Primary Channel:</label>
              <select
                aria-label="Access point 1 primary channel"
                value={simAp1Ch}
                onChange={(e) => setSimAp1Ch(parseInt(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded p-2 text-xs font-mono text-slate-900 dark:text-slate-100"
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
              <label className="block text-xs font-mono text-amber-600 dark:text-amber-400 mb-1">AP 2 Co-Located Channel:</label>
              <select
                aria-label="Access point 2 co-located channel"
                value={simAp2Ch}
                onChange={(e) => setSimAp2Ch(parseInt(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded p-2 text-xs font-mono text-slate-900 dark:text-slate-100"
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
          <div className="space-y-3 bg-slate-50 dark:bg-slate-700 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between font-mono text-xs">
            <div>
              <h4 className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-3">3. Derived Signal Quality</h4>

              <div className="space-y-2">
                <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                  <span className="text-slate-500 dark:text-slate-400">Free-space + obstacle estimate:</span>
                  <span className="text-rose-600 dark:text-rose-400 font-bold">-{pathLoss} dB</span>
                </div>

                <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                  <span className="text-slate-500 dark:text-slate-400">RSSI (Signal):</span>
                  <span className={`font-bold ${rssi > -65 ? "text-emerald-600 dark:text-emerald-400" : rssi > -78 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {rssi} dBm
                  </span>
                </div>

                <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                  <span className="text-slate-500 dark:text-slate-400">Signal-to-Noise (SNR):</span>
                  <span className={`font-bold ${snr >= 25 ? "text-emerald-600 dark:text-emerald-400" : snr >= 15 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {snr} dB
                  </span>
                </div>

                <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                  <span className="text-slate-500 dark:text-slate-400">Est. MCS Index:</span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold">{mcsIndex} ({qamModulation})</span>
                </div>

                <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                  <span className="text-slate-500 dark:text-slate-400">Illustrative PHY Estimate:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{phySpeed} Mbps</span>
                </div>
              </div>
            </div>

            <div className={`p-2.5 rounded-lg border text-center text-xs font-bold ${linkColor} bg-slate-50 dark:bg-slate-700`}>
              {linkQuality}
            </div>
          </div>
        </div>

        {/* Real-time Spectrum Curve SVG Graph */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Real-Time RF Spectrum Mask & Signal Shape
            </h4>
            <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${overlapBadge}`}>
              {overlapStatus}
            </span>
          </div>

          {/* SVG Spectrum Graph */}
          <div className="w-full h-48 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 p-4 relative flex flex-col justify-between">
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
            <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
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
