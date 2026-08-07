import HubHero from "@/components/HubHero";
import TrackCard from "@/components/TrackCard";

export default function Home() {
  return (
    <div className="space-y-12 pb-24">
      {/* Central Hub Hero Banner with Command Search */}
      <HubHero />

      {/* Main Track Directory Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div id="tracks" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#202c40] pb-4">
            <div>
              <div className="text-xs font-mono font-bold text-[#00f0ff] uppercase tracking-wider mb-1">
                ENGINEERING DISCIPLINES
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#f0f6fc] font-mono">
                Explore Learning Tracks
              </h2>
            </div>
            <div className="text-xs font-mono text-[#8b949e]">
              SELECT A TRACK TO BEGIN INTERACTIVE LABS
            </div>
          </div>

          {/* 5 Track Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Track 1: Networking & SubnetLab */}
            <TrackCard
              id="track-networking"
              name="Networking & SubnetLab"
              description="Master IP binary math, CIDR subnetting, VLSM design, VLAN trunking, IPv6, NAT, and Wireshark PCAP packet analysis."
              icon="🌐"
              href="/networking"
              difficulty="Beginner → Advanced"
              moduleCount={23}
              techStack={["IPv4/IPv6", "CIDR", "VLSM", "VLANs", "NAT", "Wireshark"]}
              accentColor="#00f0ff"
            />

            {/* Track 2: AWS Cloud Architecture */}
            <TrackCard
              id="track-aws"
              name="AWS Cloud Architecture"
              description="Design production VPC subnets, IAM policies, S3 bucket security, ECS/EKS container clusters, and Lambda serverless flows."
              icon="☁️"
              href="/aws"
              difficulty="Intermediate"
              moduleCount={5}
              techStack={["AWS VPC", "IAM", "S3", "EKS", "Lambda", "CloudFront"]}
              accentColor="#ffb700"
            />

            {/* Track 3: Cybersecurity & Threat Defense */}
            <TrackCard
              id="track-security"
              name="Cybersecurity & AppSec"
              description="Run SAST/DAST scanners (Trivy & Snyk), master OWASP Top 10 mitigations, HashiCorp Vault secrets, and WAF rules."
              icon="🛡️"
              href="/security"
              difficulty="Intermediate → Advanced"
              moduleCount={4}
              techStack={["Trivy", "Snyk", "OWASP", "Vault", "WAF", "TLS 1.3"]}
              accentColor="#ff3860"
            />

            {/* Track 4: GitOps & CI/CD Automation */}
            <TrackCard
              id="track-gitops"
              name="GitOps & CI/CD Automation"
              description="Simulate Git branching strategies, build GitHub Actions workflows, calculate SemVer releases, and execute Blue/Green & Canary deployments."
              icon="🔀"
              href="/git-ops"
              difficulty="Beginner → Intermediate"
              moduleCount={4}
              techStack={["GitFlow", "Trunk-Based", "GitHub Actions", "SemVer", "Canary"]}
              accentColor="#a855f7"
            />

            {/* Track 5: Docker & Kubernetes Engineering */}
            <TrackCard
              id="track-docker"
              name="Docker & Kubernetes"
              description="Optimize multi-stage Dockerfiles, generate Docker Compose stacks, inspect K8s Pods/Services/Ingress, and track ArgoCD sync state."
              icon="🐳"
              href="/docker-k8s"
              difficulty="Intermediate → Advanced"
              moduleCount={5}
              techStack={["Docker", "Compose", "Kubernetes", "Helm", "ArgoCD"]}
              accentColor="#00ff9d"
            />
          </div>
        </div>

        {/* Enterprise System Architecture Map Section */}
        <div id="architecture" className="rounded-2xl bg-[#0e1420] border border-[#202c40] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#202c40] pb-4">
            <div>
              <span className="text-xs font-mono font-bold text-[#00ff9d] uppercase tracking-wider">
                ECOSYSTEM MAP
              </span>
              <h3 className="text-xl sm:text-2xl font-bold font-mono text-[#f0f6fc] mt-1">
                End-to-End Infrastructure Flow
              </h3>
            </div>
            <span className="px-3 py-1 rounded-md bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/30 text-xs font-mono font-bold">
              Production Architecture
            </span>
          </div>

          <p className="text-xs sm:text-sm text-[#8b949e] leading-relaxed max-w-4xl">
            Modern cloud software relies on a synchronized sequence: developers commit code via <strong className="text-[#a855f7]">GitOps pipelines</strong>, automated <strong className="text-[#ff3860]">security scanners</strong> verify vulnerabilities, code is packaged into <strong className="text-[#00ff9d]">optimized container images</strong>, deployed across <strong className="text-[#ffb700]">AWS multi-AZ VPC subnets</strong>, and routed over <strong className="text-[#00f0ff]">Layer 3 network gateways</strong>.
          </p>

          {/* Interactive Flow Stepper Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-[#141c2c] border border-[#a855f7]/40 space-y-2">
              <div className="text-[#a855f7] font-bold">Phase 1: Code & CI/CD</div>
              <div className="text-[#f0f6fc] font-bold">Git → GitHub Actions</div>
              <div className="text-[11px] text-[#8b949e]">Trunk-Based Commit & Automated Test Workflows</div>
            </div>

            <div className="p-4 rounded-xl bg-[#141c2c] border border-[#ff3860]/40 space-y-2">
              <div className="text-[#ff3860] font-bold">Phase 2: AppSec Scan</div>
              <div className="text-[#f0f6fc] font-bold">Trivy & Snyk SAST</div>
              <div className="text-[11px] text-[#8b949e]">Vulnerability Gates & Secret Vault Ingestion</div>
            </div>

            <div className="p-4 rounded-xl bg-[#141c2c] border border-[#00ff9d]/40 space-y-2">
              <div className="text-[#00ff9d] font-bold">Phase 3: Package</div>
              <div className="text-[#f0f6fc] font-bold">Docker & Helm</div>
              <div className="text-[11px] text-[#8b949e]">Multi-Stage Build & OCI Container Registry</div>
            </div>

            <div className="p-4 rounded-xl bg-[#141c2c] border border-[#ffb700]/40 space-y-2">
              <div className="text-[#ffb700] font-bold">Phase 4: Cloud Orchestrate</div>
              <div className="text-[#f0f6fc] font-bold">AWS EKS & ArgoCD</div>
              <div className="text-[11px] text-[#8b949e]">Declarative GitOps Sync & Pod Scaling</div>
            </div>

            <div className="p-4 rounded-xl bg-[#141c2c] border border-[#00f0ff]/40 space-y-2">
              <div className="text-[#00f0ff] font-bold">Phase 5: Networking</div>
              <div className="text-[#f0f6fc] font-bold">VPC & Subnets</div>
              <div className="text-[11px] text-[#8b949e]">Layer 3 Routing, Ingress WAF & NAT Gateway</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
