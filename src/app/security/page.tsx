import AppSecSection from "@/components/tracks/AppSecSection";

export const metadata = {
  title: "Cybersecurity & AppSec Track | SubnetLab",
  description:
    "Explore 14 browser-only cybersecurity modules covering SAST/DAST, OWASP Top 10:2025, secrets management, WAF and TLS hardening, threat modeling, IAM, API security, Zero Trust, incident response, SIEM, SBOM supply chains, container security, cloud posture, and privacy controls.",
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[color:var(--surface-l0)] text-slate-900 transition-colors duration-300 dark:bg-[color:var(--surface-l0)] dark:text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AppSecSection />
      </div>
    </div>
  );
}
