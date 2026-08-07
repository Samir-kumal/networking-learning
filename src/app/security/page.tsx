import AppSecSection from "@/components/tracks/AppSecSection";

export const metadata = {
  title: "Cybersecurity & AppSec Track | SubnetLab",
  description:
    "Explore 14 interactive cybersecurity modules covering SAST/DAST, OWASP Top 10, secrets management, WAF and TLS hardening, threat modeling, IAM, API security, Zero Trust, incident response, SIEM, SBOM supply chains, container security, cloud posture, and privacy compliance.",
};

export default function SecurityPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AppSecSection />
    </div>
  );
}
