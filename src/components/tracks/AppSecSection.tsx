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

const NAV_LINKS = [
  { href: "#sec-scanners", label: "SAST/DAST & Container Scans" },
  { href: "#sec-owasp", label: "OWASP Top 10" },
  { href: "#sec-vault", label: "Secrets Management" },
  { href: "#sec-waf", label: "WAF Rules" },
  { href: "#sec-threat-model", label: "Threat Modeling & STRIDE" },
  { href: "#sec-iam", label: "IAM & Least Privilege" },
  { href: "#sec-api-security", label: "API Security" },
  { href: "#sec-zero-trust", label: "Zero Trust Segmentation" },
  { href: "#sec-incident-response", label: "Incident Response & SOC" },
  { href: "#sec-siem", label: "SIEM Detection & Logs" },
  { href: "#sec-supply-chain", label: "Supply Chain & SBOM" },
  { href: "#sec-container-security", label: "Container Security" },
  { href: "#sec-cloud-posture", label: "Cloud Security Posture" },
  { href: "#sec-privacy-compliance", label: "Privacy & Compliance" },
];


export default function AppSecSection() {
  return (
    <section className="space-y-8 text-slate-900">
      {/* Track Header */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-400/20 text-xs font-mono font-semibold">
                Cybersecurity &amp; AppSec Track
              </span>
              <span className="text-xs text-slate-500 font-mono">14 Interactive Modules</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Application Security &amp; Vulnerability Management
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-3xl">
              Master SAST/DAST container scanning, OWASP Top 10 remediation, secrets management,
              WAF and TLS hardening, threat modeling, IAM least privilege, API security, Zero Trust,
              incident response, SIEM detection, SBOM supply chains, container security, cloud posture,
              and privacy compliance.
            </p>
          </div>
        </div>
      </div>

      {/* Sticky In-Page Nav */}
      <div className="sticky top-20 z-20 bg-white border-b border-slate-200 shadow-sm -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-1 py-2 overflow-x-auto">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap"
            >
              {label}
            </a>
          ))}
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
