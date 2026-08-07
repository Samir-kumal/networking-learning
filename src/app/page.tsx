import HubHero from "@/components/HubHero";
import TrackCard from "@/components/TrackCard";

const TRACKS = [
  {
    id: "networking",
    name: "Networking & SubnetLab",
    description:
      "Master IP binary math, CIDR subnetting, VLSM design, VLAN trunking, IPv6, NAT, and Wireshark PCAP packet analysis across 23 hands-on labs.",
    icon: "⬡",
    href: "/networking",
    difficulty: "Beginner → Advanced",
    moduleCount: 23,
    techStack: ["IPv4/IPv6", "CIDR", "VLSM", "VLANs", "NAT", "Wireshark"],
    accentClass: "bg-indigo-600",
  },
  {
    id: "aws",
    name: "AWS Cloud Architecture",
    description:
      "Design production VPC subnets, IAM least-privilege policies, S3 bucket security, ECS/EKS container clusters, and Lambda serverless flows.",
    icon: "◈",
    href: "/aws",
    difficulty: "Intermediate → Advanced",
    moduleCount: 15,
    techStack: ["VPC", "IAM", "S3", "EKS", "Lambda", "CloudFront", "Step Functions", "API Gateway", "CloudWatch", "Secrets Manager", "Transit Gateway", "Auto Scaling", "Well-Architected"],
    accentClass: "bg-amber-500",
  },
  {
    id: "security",
    name: "Cybersecurity & AppSec",
    description:
      "Run SAST/DAST scanners with Trivy and Snyk, work through OWASP Top 10 mitigations, manage secrets with HashiCorp Vault, and configure WAF rules.",
    icon: "◉",
    href: "/security",
    difficulty: "Intermediate → Advanced",
    moduleCount: 4,
    techStack: ["Trivy", "Snyk", "OWASP", "Vault", "WAF", "TLS 1.3"],
    accentClass: "bg-rose-500",
  },
  {
    id: "git-ops",
    name: "GitOps & CI/CD Automation",
    description:
      "Simulate Git branching strategies, build GitHub Actions pipelines, calculate SemVer releases, and practice Blue/Green and Canary deployments.",
    icon: "⑂",
    href: "/git-ops",
    difficulty: "Beginner → Intermediate",
    moduleCount: 4,
    techStack: ["GitFlow", "Trunk-Based", "GitHub Actions", "SemVer", "Canary"],
    accentClass: "bg-violet-600",
  },
  {
    id: "docker-k8s",
    name: "Docker & Kubernetes",
    description:
      "Optimize multi-stage Dockerfiles, generate Compose stacks, inspect K8s Pods, Services, and Ingress routing, and manage ArgoCD GitOps sync state.",
    icon: "⬡",
    href: "/docker-k8s",
    difficulty: "Intermediate → Advanced",
    moduleCount: 15,
    techStack: ["Docker", "Compose", "Kubernetes", "Helm", "ArgoCD", "Trivy", "NetworkPolicy", "Ingress", "RBAC", "HPA/VPA", "Prometheus"],
    accentClass: "bg-sky-600",
  },
];

const PHASES = [
  {
    step: "01",
    phase: "Code & CI/CD",
    detail: "Git → GitHub Actions",
    sub: "Trunk-based commits & automated test workflows",
    color: "border-violet-200 bg-violet-50",
    badge: "text-violet-700",
  },
  {
    step: "02",
    phase: "AppSec Scan",
    detail: "Trivy & Snyk SAST",
    sub: "Vulnerability gates & secrets ingestion",
    color: "border-rose-200 bg-rose-50",
    badge: "text-rose-700",
  },
  {
    step: "03",
    phase: "Package",
    detail: "Docker & Helm",
    sub: "Multi-stage build & OCI container registry",
    color: "border-emerald-200 bg-emerald-50",
    badge: "text-emerald-700",
  },
  {
    step: "04",
    phase: "Cloud Orchestrate",
    detail: "AWS EKS & ArgoCD",
    sub: "Declarative GitOps sync & pod autoscaling",
    color: "border-amber-200 bg-amber-50",
    badge: "text-amber-700",
  },
  {
    step: "05",
    phase: "Networking",
    detail: "VPC & Subnets",
    sub: "Layer 3 routing, Ingress WAF & NAT gateway",
    color: "border-indigo-200 bg-indigo-50",
    badge: "text-indigo-700",
  },
];

export default function Home() {
  return (
    <div className="pb-24 space-y-12">
      <HubHero />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">

        {/* ── Track Grid ── */}
        <section id="tracks">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-600 mb-1">
                Engineering Disciplines
              </p>
              <h2 className="text-2xl font-bold text-slate-900">Learning Tracks</h2>
            </div>
            <p className="text-[13px] text-slate-400">
              5 tracks · 61 modules · browser-native
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {TRACKS.map((t) => (
              <TrackCard key={t.id} {...t} />
            ))}
          </div>
        </section>

        {/* ── Production Pipeline Architecture ── */}
        <section id="architecture">
          <div className="rounded-2xl border border-slate-200 bg-white card-shadow overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
                  Ecosystem Map
                </p>
                <h3 className="text-lg font-semibold text-slate-900">
                  End-to-End Production Pipeline
                </h3>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Reference Architecture
              </span>
            </div>

            <div className="px-6 py-5 space-y-5">
              <p className="text-[13px] text-slate-500 leading-relaxed max-w-3xl">
                Modern cloud software moves through a synchronized sequence — from developer commits through security gates, container packaging, cloud orchestration, and finally across production network subnets.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {PHASES.map((p) => (
                  <div
                    key={p.step}
                    className={`rounded-xl border p-4 space-y-2 ${p.color}`}
                  >
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${p.badge}`}>
                      Phase {p.step}
                    </div>
                    <div className="text-[13px] font-semibold text-slate-800 leading-snug">
                      {p.phase}
                    </div>
                    <div className={`text-[11px] font-medium ${p.badge}`}>{p.detail}</div>
                    <div className="text-[11px] text-slate-500">{p.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
