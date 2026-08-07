import AppSecSection from "@/components/tracks/AppSecSection";

export const metadata = {
  title: "Cybersecurity & AppSec Track | SubnetLab",
  description:
    "Interactive SAST/DAST container vulnerability scanner, OWASP Top 10 matrix & remediation, HashiCorp Vault vs AWS Secrets Manager workflow, WAF rules engine, and SSL/TLS hardening.",
};

export default function SecurityPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AppSecSection />
    </div>
  );
}
