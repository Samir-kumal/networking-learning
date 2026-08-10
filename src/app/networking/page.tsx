import type { Metadata } from "next";
import Hero from "@/components/Hero";
import NetworkingSubsection from "@/components/NetworkingSubsection";
import BasicsSection from "@/components/sections/BasicsSection";
import BinarySection from "@/components/sections/BinarySection";
import CidrSection from "@/components/sections/CidrSection";
import VlsmSection from "@/components/sections/VlsmSection";
import VlanSection from "@/components/sections/VlanSection";
import Ipv6Section from "@/components/sections/Ipv6Section";
import NatSection from "@/components/sections/NatSection";
import SubnetCalculator from "@/components/sections/SubnetCalculator";
import CreateSubnetSection from "@/components/sections/CreateSubnetSection";
import SupernetSection from "@/components/sections/SupernetSection";
import CloudSubnetSection from "@/components/sections/CloudSubnetSection";
import FirewallSection from "@/components/sections/FirewallSection";
import TroubleshootingSection from "@/components/sections/TroubleshootingSection";
import PracticeSection from "@/components/sections/PracticeSection";
import CheatSheetSection from "@/components/sections/CheatSheetSection";
import QuizSection from "@/components/sections/QuizSection";
import ContainerSection from "@/components/sections/ContainerSection";
import DiagnosticsSection from "@/components/sections/DiagnosticsSection";
import RoutingSection from "@/components/sections/RoutingSection";
import DhcpSection from "@/components/sections/DhcpSection";
import PacketSection from "@/components/sections/PacketSection";
import WirelessSection from "@/components/sections/WirelessSection";
import SecuritySection from "@/components/sections/SecuritySection";

export const metadata: Metadata = {
  title: "SubnetLab & Networking Infrastructure",
  description:
    "Master IP subnetting, CIDR notation, VLSM calculation, VLAN isolation, BGP/OSPF routing, DHCP leases, packet inspection, IPv6 transition, and container networking.",
};

export default function NetworkingPage() {
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      {/* Page Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 pb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 text-[11px] font-semibold">
            Track 1 of 5
          </span>
          <span className="text-[12px] text-slate-400 dark:text-slate-500 font-medium">23 Interactive Modules</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          SubnetLab & Networking Infrastructure
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base mt-2 max-w-3xl leading-relaxed">
          Comprehensive interactive guide covering fundamental IP addressing, binary operations,
          CIDR, VLSM, VLANs, routing protocols, packet inspection, wireless networks, and network security.
        </p>
      </header>

      <Hero />

      <div className="space-y-16">
        <NetworkingSubsection
          id="foundations"
          label="01 · Foundations"
          title="Networking Foundations"
          description="Build a reliable mental model for addresses, prefixes, segmentation, and protocol boundaries."
          moduleCount={7}
        >
          <BasicsSection />
          <BinarySection />
          <CidrSection />
          <VlsmSection />
          <VlanSection />
          <Ipv6Section />
          <NatSection />
        </NetworkingSubsection>

        <NetworkingSubsection
          id="tools"
          label="02 · Tools"
          title="Design & Operations Tools"
          description="Turn subnetting theory into repeatable design, allocation, policy, and troubleshooting workflows."
          moduleCount={6}
        >
          <SubnetCalculator />
          <CreateSubnetSection />
          <SupernetSection />
          <CloudSubnetSection />
          <FirewallSection />
          <TroubleshootingSection />
        </NetworkingSubsection>

        <NetworkingSubsection
          id="advanced"
          label="03 · Advanced"
          title="Advanced Networking"
          description="Apply routing, security, services, packet analysis, containers, diagnostics, and wireless concepts."
          moduleCount={7}
        >
          <RoutingSection />
          <SecuritySection />
          <DhcpSection />
          <PacketSection />
          <ContainerSection />
          <DiagnosticsSection />
          <WirelessSection />
        </NetworkingSubsection>

        <NetworkingSubsection
          id="evaluation"
          label="04 · Evaluation"
          title="Practice & Review"
          description="Reinforce the track with guided practice, fast-reference formulas, and a final knowledge check."
          moduleCount={3}
        >
          <PracticeSection />
          <CheatSheetSection />
          <QuizSection />
        </NetworkingSubsection>
      </div>
    </div>
  );
}
