import DockerK8sSection from "@/components/tracks/DockerK8sSection";

export const metadata = {
  title: "Docker & Kubernetes Engineering Track | DevOps & Cloud Hub",
  description:
    "Interactive Docker multi-stage build builder, optimization inspector, Docker Compose service stack generator, Kubernetes control plane architecture inspector, and Helm & ArgoCD GitOps visualizer.",
};

export default function DockerK8sPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DockerK8sSection />
    </div>
  );
}
