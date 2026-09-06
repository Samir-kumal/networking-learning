"use client";

import SecScannersSection from "./SecScannersSection";
import SecOwaspSection from "./SecOwaspSection";
import SecVaultSection from "./SecVaultSection";
import SecWafSection from "./SecWafSection";
import SecThreatModelSection from "./SecThreatModelSection";
import SecIamSection from "./SecIamSection";
import SecApiSecuritySection from "./SecApiSecuritySection";
import SecZeroTrustSection from "./SecZeroTrustSection";
import SecIncidentResponseSection from "./SecIncidentResponseSection";
import SecSiemSection from "./SecSiemSection";
import SecSupplyChainSection from "./SecSupplyChainSection";
import SecContainerSecuritySection from "./SecContainerSecuritySection";
import SecCloudPostureSection from "./SecCloudPostureSection";
import SecPrivacyComplianceSection from "./SecPrivacyComplianceSection";

const SECURITY_STAGES = [
  {
    id: "stage-appsec",
    num: "01",
    label: "01 · AppSec",
    title: "Application Security & Exploit Defense",
    description: "Container & dependency scanners, OWASP Top 10 exploits, secrets management, and WAF hardening.",
    glyph: "◉",
    moduleCount: 4,
    scopeLabel: "Labs S1–S4",
    tone: "rose",
    border: "border-rose-200 dark:border-rose-900/60",
    rule: "bg-rose-500",
    badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
    signal: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]",
  },
  {
    id: "stage-identity",
    num: "02",
    label: "02 · Identity",
    title: "Threat Modeling & Zero Trust Identity",
    description: "STRIDE threat modeling, least-privilege IAM policies, BOLA/IDOR API security, and Zero Trust boundaries.",
    glyph: "◈",
    moduleCount: 4,
    scopeLabel: "Labs S5–S8",
    tone: "amber",
    border: "border-amber-200 dark:border-amber-900/60",
    rule: "bg-amber-500",
    badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
    signal: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]",
  },
  {
    id: "stage-operations",
    num: "03",
    label: "03 · Operations",
    title: "Security Operations & Supply Chain",
    description: "SOC alert triage, incident containment, SIEM detection rules, and CycloneDX/SPDX SBOM audits.",
    glyph: "▤",
    moduleCount: 3,
    scopeLabel: "Labs S9–S11",
    tone: "cyan",
    border: "border-cyan-200 dark:border-cyan-900/60",
    rule: "bg-cyan-500",
    badge: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300",
    signal: "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]",
  },
  {
    id: "stage-posture",
    num: "04",
    label: "04 · Posture",
    title: "Cloud Posture & Privacy Compliance",
    description: "Kubernetes pod security admission, multi-control cloud compliance scoring, and data classification.",
    glyph: "☁",
    moduleCount: 3,
    scopeLabel: "Labs S12–S14",
    tone: "violet",
    border: "border-violet-200 dark:border-violet-900/60",
    rule: "bg-violet-500",
    badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300",
    signal: "bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]",
  },
] as const;

interface SecurityStageHeaderProps {
  stage: (typeof SECURITY_STAGES)[number];
  stageIndex: number;
}

function SecurityStageHeader({ stage, stageIndex }: SecurityStageHeaderProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-[color:var(--surface-l1)] p-5 card-shadow sm:p-6 ${stage.border}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${stage.rule}`} />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="flex min-w-0 gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border font-mono text-sm font-bold ${stage.badge}`}>
            <span aria-hidden="true">{stage.glyph}</span>
          </div>
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${stage.badge}`}>
                {stage.label}
              </span>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{stage.scopeLabel}</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
              {stage.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
              {stage.description}
            </p>
          </div>
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Stage progress</p>
          <div className="mt-3 flex items-center gap-1" aria-hidden="true">
            {SECURITY_STAGES.map((_, barIdx) => (
              <span
                key={barIdx}
                className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                  barIdx <= stageIndex ? stage.signal : "bg-[color:var(--border-l1)]"
                }`}
              />
            ))}
          </div>
          <p className="mt-2 font-mono text-[10px] text-slate-500 dark:text-slate-400">{stage.moduleCount} labs in scope</p>
        </div>
      </div>
    </div>
  );
}

export default function AppSecSection() {
  return (
    <section className="space-y-12 text-slate-900 dark:text-slate-100">
      {/* Track Header & Operations Orientation */}
      <div className="rounded-2xl border border-[color:var(--border-l1)] bg-[color:var(--surface-l1)] p-6 sm:p-8 card-shadow">
        <div className="flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-mono font-semibold">
                Cybersecurity &amp; AppSec Track
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">14 Interactive Labs · 4 Stages</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Enforce policy, inspect exploits &amp; verify posture.
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
              Master browser-only cybersecurity workflows across application vulnerability remediation,
              STRIDE threat modeling, least-privilege IAM, Zero Trust micro-perimeters, SOC incident containment,
              SIEM rule detection, software supply chains, and cloud compliance scoring.
            </p>
          </div>

          {/* 4-Stage Navigation Roadmap */}
          <nav aria-label="Cybersecurity curriculum stages" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-[color:var(--border-l1)]">
            {SECURITY_STAGES.map((st) => (
              <a
                key={st.id}
                href={`#${st.id}`}
                className="group p-3.5 rounded-xl border border-[color:var(--border-l1)] bg-[color:var(--surface-l2)] hover:border-slate-400 dark:hover:border-slate-500 transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                    Stage {st.num}
                  </span>
                  <span className="text-sm font-mono text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                    {st.glyph}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                  {st.title}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  {st.description}
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-[color:var(--border-l1)]">
                  <span>{st.moduleCount} labs</span>
                  <span className="text-rose-600 dark:text-rose-400 group-hover:translate-x-0.5 transition-transform">Explore →</span>
                </div>
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* Stage 1: AppSec */}
      <section id="stage-appsec" className="scroll-mt-24 space-y-6">
        <SecurityStageHeader stage={SECURITY_STAGES[0]} stageIndex={0} />
        <div className="space-y-12">
          <SecScannersSection />
          <SecOwaspSection />
          <SecVaultSection />
          <SecWafSection />
        </div>
      </section>

      {/* Stage 2: Identity */}
      <section id="stage-identity" className="scroll-mt-24 space-y-6">
        <SecurityStageHeader stage={SECURITY_STAGES[1]} stageIndex={1} />
        <div className="space-y-12">
          <SecThreatModelSection />
          <SecIamSection />
          <SecApiSecuritySection />
          <SecZeroTrustSection />
        </div>
      </section>

      {/* Stage 3: Operations */}
      <section id="stage-operations" className="scroll-mt-24 space-y-6">
        <SecurityStageHeader stage={SECURITY_STAGES[2]} stageIndex={2} />
        <div className="space-y-12">
          <SecIncidentResponseSection />
          <SecSiemSection />
          <SecSupplyChainSection />
        </div>
      </section>

      {/* Stage 4: Posture */}
      <section id="stage-posture" className="scroll-mt-24 space-y-6">
        <SecurityStageHeader stage={SECURITY_STAGES[3]} stageIndex={3} />
        <div className="space-y-12">
          <SecContainerSecuritySection />
          <SecCloudPostureSection />
          <SecPrivacyComplianceSection />
        </div>
      </section>
    </section>
  );
}
