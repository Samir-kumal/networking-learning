export type Leaf = {
  id: string;
  label: string;
};

export type Branch = {
  id: string;
  label: string;
  level: string;
  hue: string;
  modules: number;
  summary: string;
  leaves: Leaf[];
};

export const CENTER = {
  label: "Learning Hub",
};

export const BRANCHES: Branch[] = [
  {
    id: "networking",
    label: "Networking & SubnetLab",
    level: "Beginner → Advanced",
    hue: "node-1",
    modules: 23,
    summary:
      "IP binary math, CIDR subnetting, VLSM design, VLAN trunking, IPv6, NAT, and Wireshark PCAP packet analysis across 23 hands-on labs.",
    leaves: [
      { id: "ipv4-ipv6", label: "IPv4/IPv6" },
      { id: "cidr", label: "CIDR" },
      { id: "vlsm", label: "VLSM" },
      { id: "vlans", label: "VLANs" },
      { id: "nat", label: "NAT" },
      { id: "wireshark", label: "Wireshark" },
    ],
  },
  {
    id: "aws",
    label: "AWS Cloud Architecture",
    level: "Intermediate → Advanced",
    hue: "node-2",
    modules: 15,
    summary:
      "Production VPC subnets, IAM least-privilege policies, S3 bucket security, ECS/EKS container clusters, and Lambda serverless flows.",
    leaves: [
      { id: "vpc", label: "VPC" },
      { id: "iam-aws", label: "IAM" },
      { id: "s3", label: "S3" },
      { id: "eks", label: "EKS" },
      { id: "lambda", label: "Lambda" },
    ],
  },
  {
    id: "security",
    label: "Cybersecurity & AppSec",
    level: "Intermediate → Advanced",
    hue: "node-3",
    modules: 14,
    summary:
      "SAST/DAST, OWASP Top 10, secrets management, WAF and TLS hardening, threat modeling, Zero Trust, incident response, SIEM, and supply chains.",
    leaves: [
      { id: "owasp", label: "OWASP" },
      { id: "waf", label: "WAF" },
      { id: "zero-trust", label: "Zero Trust" },
      { id: "siem", label: "SIEM" },
      { id: "iam-sec", label: "IAM" },
    ],
  },
  {
    id: "git-ops",
    label: "GitOps & CI/CD Automation",
    level: "Beginner → Intermediate",
    hue: "node-4",
    modules: 4,
    summary:
      "Git branching strategies, GitHub Actions pipelines, SemVer releases, and Blue/Green and Canary deployments.",
    leaves: [
      { id: "gitflow", label: "GitFlow" },
      { id: "actions", label: "GH Actions" },
      { id: "semver", label: "SemVer" },
      { id: "canary", label: "Canary" },
    ],
  },
  {
    id: "docker-k8s",
    label: "Docker & Kubernetes",
    level: "Intermediate → Advanced",
    hue: "node-5",
    modules: 15,
    summary:
      "Multi-stage Dockerfiles, Compose stacks, K8s Pods, Services, and Ingress routing, and ArgoCD GitOps sync state.",
    leaves: [
      { id: "docker", label: "Docker" },
      { id: "compose", label: "Compose" },
      { id: "kubernetes", label: "Kubernetes" },
      { id: "helm", label: "Helm" },
      { id: "argocd", label: "ArgoCD" },
    ],
  },
];
