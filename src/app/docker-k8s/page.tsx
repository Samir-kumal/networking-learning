import DockerK8sSection from "@/components/tracks/DockerK8sSection";

export const metadata = {
  title: "Docker & Kubernetes Engineering Track | DevOps & Cloud Hub",
  description:
    "15 interactive modules: multi-stage Docker builds, Compose stack generation, K8s control plane architecture, Helm & ArgoCD GitOps, Trivy security scanning, resource quotas, network policies, ingress & service mesh, persistent volumes, image registries, RBAC, HPA/VPA autoscaling, troubleshooting, and full observability.",
};

export default function DockerK8sPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DockerK8sSection />
    </div>
  );
}
