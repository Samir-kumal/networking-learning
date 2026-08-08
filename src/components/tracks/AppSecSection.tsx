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

export default function AppSecSection() {
  return (
    <section className="space-y-8 text-slate-900 dark:text-slate-100">
      {/* Track Header */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 border border-rose-400/20 dark:border-rose-700 text-xs font-mono font-semibold">
                Cybersecurity &amp; AppSec Track
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">14 Interactive Modules</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              Application Security &amp; Vulnerability Management
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
              Master SAST/DAST container scanning, OWASP Top 10 remediation, secrets management,
              WAF and TLS hardening, threat modeling, IAM least privilege, API security, Zero Trust,
              incident response, SIEM detection, SBOM supply chains, container security, cloud posture,
              and privacy compliance.
            </p>
          </div>
        </div>
      </div>

      {/* Sections — always visible, no tabs */}
      <div className="space-y-16">
        <SecScannersSection />
        <SecOwaspSection />
        <SecVaultSection />
        <SecWafSection />
        <SecThreatModelSection />
        <SecIamSection />
        <SecApiSecuritySection />
        <SecZeroTrustSection />
        <SecIncidentResponseSection />
        <SecSiemSection />
        <SecSupplyChainSection />
        <SecContainerSecuritySection />
        <SecCloudPostureSection />
        <SecPrivacyComplianceSection />
      </div>
    </section>
  );
}
