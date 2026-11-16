import HubHero from "@/components/HubHero";
import TrackCard from "@/components/TrackCard";
import KnowledgeGraphSection from "@/components/KnowledgeGraphSection";

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
      "Explore SAST/DAST, OWASP Top 10, secrets management, WAF and TLS hardening, threat modeling, IAM, API security, Zero Trust, incident response, SIEM, SBOM supply chains, container security, cloud posture, and privacy compliance.",
    icon: "◉",
    href: "/security",
    difficulty: "Intermediate → Advanced",
    moduleCount: 14,
    techStack: [
      "Trivy",
      "Snyk",
      "OWASP",
      "Vault",
      "WAF",
      "TLS 1.3",
      "STRIDE",
      "IAM",
      "API Security",
      "Zero Trust",
      "SIEM",
      "SBOM",
      "CSPM",
      "Privacy",
    ],
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
  {
    id: "ml",
    name: "ML Foundations Lab",
    description:
      "Learn machine learning from the math up: functions, linear algebra, derivatives, integration, probability, and core ML/neural-network concepts, each with a live interactive playground and a gated quiz.",
    icon: "◑",
    href: "/ml",
    difficulty: "Beginner → Intermediate",
    moduleCount: 27,
    techStack: ["Linear Algebra", "Calculus", "Probability", "Gradient Descent", "Neural Networks", "KaTeX", "D3", "Three.js"],
    accentClass: "bg-emerald-600",
  },
];

// `rule` is the thin top border that marks each phase; the text stays neutral.
const PHASES = [
  {
    step: "01",
    phase: "Code & CI/CD",
    detail: "Git → GitHub Actions",
    sub: "Trunk-based commits & automated test workflows",
    rule: "border-violet-500 dark:border-violet-400",
  },
  {
    step: "02",
    phase: "AppSec Scan",
    detail: "Trivy & Snyk SAST",
    sub: "Vulnerability gates & secrets ingestion",
    rule: "border-rose-500 dark:border-rose-400",
  },
  {
    step: "03",
    phase: "Package",
    detail: "Docker & Helm",
    sub: "Multi-stage build & OCI container registry",
    rule: "border-emerald-500 dark:border-emerald-400",
  },
  {
    step: "04",
    phase: "Cloud Orchestrate",
    detail: "AWS EKS & ArgoCD",
    sub: "Declarative GitOps sync & pod autoscaling",
    rule: "border-amber-500 dark:border-amber-400",
  },
  {
    step: "05",
    phase: "Networking",
    detail: "VPC & Subnets",
    sub: "Layer 3 routing, Ingress WAF & NAT gateway",
    rule: "border-indigo-500 dark:border-indigo-400",
  },
];

export default function Home() {
  return (
    <div className="space-y-16 pb-24">
      <HubHero />

      <div className="mx-auto max-w-7xl space-y-16 px-4 sm:px-6 lg:px-8">
        <section id="tracks" className="scroll-mt-24">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
                Curriculum lanes
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Choose your lane</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Start with the system you want to understand, then follow the connected path into production.
              </p>
            </div>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              05 lanes / 71 modules
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {TRACKS.map((t) => (
              <TrackCard key={t.id} {...t} />
            ))}
          </div>
        </section>

        <section id="knowledge-graph" className="scroll-mt-24">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
                Curriculum map
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Trace the learning path</h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-slate-400 dark:text-slate-500 sm:text-right">
              Follow the recommended progression from code to production networking.
            </p>
          </div>

          <KnowledgeGraphSection />
        </section>

        <section id="architecture" className="scroll-mt-24">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
                Reference route
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">End-to-end production path</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Modern cloud software moves through a synchronized sequence: developer commits, security gates, container
                packaging, cloud orchestration, and finally production network subnets.
              </p>
            </div>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              5 phases
            </div>
          </div>

          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {PHASES.map((p) => (
              <li key={p.step} className={`border-t-2 pt-4 ${p.rule}`}>
                <p className="font-mono text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Phase {p.step}
                </p>
                <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{p.phase}</h3>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{p.detail}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{p.sub}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
