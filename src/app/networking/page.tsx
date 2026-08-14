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

const STAGES = [
  {
    id: "foundations",
    label: "01 · Foundations",
    title: "Networking Foundations",
    description: "Start with how hosts, bits, prefixes, and subnet boundaries work; then calculate and design IPv4 address space before moving on.",
    descriptor: "Address space before traffic",
    moduleCount: 7,
    tone: "cyan",
  },
  {
    id: "tools",
    label: "02 · Applied",
    title: "Connect & Operate Networks",
    description: "Apply the addressing model to VLANs, DHCP, IPv6, NAT, cloud subnets, and wireless access.",
    descriptor: "Translate addresses into services",
    moduleCount: 6,
    tone: "amber",
  },
  {
    id: "advanced",
    label: "03 · Operations",
    title: "Understand, Forward & Diagnose Traffic",
    description: "Read packet structure first, then learn forwarding, filtering, encrypted overlays, diagnostics, and container-networking tradeoffs.",
    descriptor: "Follow packets and enforce policy",
    moduleCount: 7,
    tone: "violet",
  },
  {
    id: "evaluation",
    label: "04 · Evaluation",
    title: "Practice & Review",
    description: "Reinforce the track with guided practice, fast-reference formulas, and a final knowledge check.",
    descriptor: "Turn concepts into instincts",
    moduleCount: 3,
    tone: "lime",
  },
] as const;

const STAGE_NAV_STYLES = {
  cyan: {
    border: "border-cyan-200 hover:border-cyan-400 dark:border-cyan-900 dark:hover:border-cyan-500",
    badge: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
    marker: "bg-cyan-400",
    arrow: "text-cyan-600 dark:text-cyan-300",
  },
  amber: {
    border: "border-amber-200 hover:border-amber-400 dark:border-amber-900 dark:hover:border-amber-500",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    marker: "bg-amber-400",
    arrow: "text-amber-600 dark:text-amber-300",
  },
  violet: {
    border: "border-violet-200 hover:border-violet-400 dark:border-violet-900 dark:hover:border-violet-500",
    badge: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
    marker: "bg-violet-400",
    arrow: "text-violet-600 dark:text-violet-300",
  },
  lime: {
    border: "border-lime-200 hover:border-lime-400 dark:border-lime-900 dark:hover:border-lime-500",
    badge: "bg-lime-50 text-lime-700 dark:bg-lime-950/50 dark:text-lime-300",
    marker: "bg-lime-400",
    arrow: "text-lime-600 dark:text-lime-300",
  },
} as const;

export default function NetworkingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 dark:bg-slate-950">
      <Hero />

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <section id="curriculum" aria-labelledby="curriculum-heading" className="space-y-5">
          <div className="max-w-3xl space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">
              Learning path / 04 stages
            </p>
            <h2 id="curriculum-heading" className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              Move from address space to traffic decisions
            </h2>
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400 sm:text-base">
              Each stage narrows the distance between a prefix on paper and a packet making a production decision.
              Start at the left, or jump to the signal you need.
            </p>
          </div>

          <nav aria-label="Networking curriculum" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {STAGES.map((stage) => {
              const styles = STAGE_NAV_STYLES[stage.tone];

              return (
                <a
                  key={stage.id}
                  href={`#${stage.id}`}
                  className={`group relative overflow-hidden rounded-xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-cyan-400 dark:bg-slate-900 ${styles.border}`}
                >
                  <span className={`absolute inset-x-0 top-0 h-1 ${styles.marker}`} />
                  <div className="flex items-start justify-between gap-3">
                    <span className={`rounded-full px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] ${styles.badge}`}>
                      {stage.label}
                    </span>
                    <span className={`text-lg transition-transform group-hover:translate-x-0.5 ${styles.arrow}`} aria-hidden="true">→</span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">{stage.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{stage.descriptor}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-400 dark:border-slate-800 dark:text-slate-500">
                    <span>{stage.moduleCount} modules</span>
                    <span>Stage {stage.label.slice(0, 2)}</span>
                  </div>
                </a>
              );
            })}
          </nav>
        </section>

        <div className="space-y-16">
          <NetworkingSubsection
            id="foundations"
            label="01 · Foundations"
            title="Networking Foundations"
            description="Start with how hosts, bits, prefixes, and subnet boundaries work; then calculate and design IPv4 address space before moving on."
            moduleCount={7}
            tone="cyan"
          >
            <BasicsSection />
            <BinarySection />
            <CidrSection />
            <SubnetCalculator />
            <CreateSubnetSection />
            <VlsmSection />
            <SupernetSection />
          </NetworkingSubsection>

          <NetworkingSubsection
            id="tools"
            label="02 · Applied"
            title="Connect & Operate Networks"
            description="Apply the addressing model to VLANs, DHCP, IPv6, NAT, cloud subnets, and wireless access."
            moduleCount={6}
            tone="amber"
          >
            <VlanSection />
            <DhcpSection />
            <Ipv6Section />
            <NatSection />
            <CloudSubnetSection />
            <WirelessSection />
          </NetworkingSubsection>

          <NetworkingSubsection
            id="advanced"
            label="03 · Operations"
            title="Understand, Forward & Diagnose Traffic"
            description="Read packet structure first, then learn forwarding, filtering, encrypted overlays, diagnostics, and container-networking tradeoffs."
            moduleCount={7}
            tone="violet"
          >
            <PacketSection />
            <RoutingSection />
            <FirewallSection />
            <SecuritySection />
            <DiagnosticsSection />
            <TroubleshootingSection />
            <ContainerSection />
          </NetworkingSubsection>

          <NetworkingSubsection
            id="evaluation"
            label="04 · Evaluation"
            title="Practice & Review"
            description="Reinforce the track with guided practice, fast-reference formulas, and a final knowledge check."
            moduleCount={3}
            tone="lime"
          >
            <PracticeSection />
            <CheatSheetSection />
            <QuizSection />
          </NetworkingSubsection>
        </div>
      </div>
    </div>
  );
}
