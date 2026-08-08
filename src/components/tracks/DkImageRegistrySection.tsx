"use client";

import { useMemo, useState } from "react";

// ============================================================================
// Types
// ============================================================================

type TagStrategyKey = "semantic" | "sha" | "branch" | "latest";

interface TagStrategyInfo {
  key: TagStrategyKey;
  emoji: string;
  name: string;
  format: string;
  exampleTags: string[];
  immutable: boolean;
  k8sSafety: string;
  risk: "low" | "medium" | "high";
  verdict: string;
  goodFor: string;
  pitfall: string;
}

interface LifecycleStage {
  id: string;
  emoji: string;
  title: string;
  summary: string;
  registryState: string;
  uiImpact: string;
  marker: string;
}

interface RetentionImage {
  id: string;
  repo: string;
  tag: string | null;
  daysOld: number;
  sizeMb: number;
}

interface LayerDef {
  id: string;
  label: string;
  sizeMb: number;
  kind: "base" | "deps" | "code" | "env";
  sharedWith: string[]; // image ids sharing this exact layer
}

interface AnalyzedImage {
  id: string;
  name: string;
  ref: string;
  note: string;
  layers: LayerDef[];
}

interface PlatformEntry {
  key: string;
  os: string;
  arch: string;
  variant?: string;
  digest: string;
  sizeMb: number;
  config: string;
  layersCount: number;
  entrypoint: string;
}

// ============================================================================
// Module 1 — Tag Strategy data
// ============================================================================

const TAG_STRATEGIES: Record<TagStrategyKey, TagStrategyInfo> = {
  semantic: {
    key: "semantic",
    emoji: "🏷️",
    name: "Semantic Versioning",
    format: "v<major>.<minor>.<patch>  (e.g. v2.4.1)",
    exampleTags: ["v2.4.0", "v2.4.1", "v2.5.0-rc.1"],
    immutable: true,
    k8sSafety: "Detected may skip stale",
    risk: "medium",
    verdict: "Recommended for releases",
    goodFor:
      "Release trains, feature versions, rollbacks by re-pinning an older version tag. Consumers read intent (major/minor/patch) directly from the tag.",
    pitfall:
      "Only immutable if you never re-tag an existing version. Re-tagging v2.4.1 with a different digest silently rewrites history — pin each semver to exactly one digest, and use '+build' metadata for variant markers.",
  },
  sha: {
    key: "sha",
    emoji: "🔐",
    name: "Content Digest (SHA)",
    format: "repo@sha256:<64 hex chars>",
    exampleTags: [
      "payment-api@sha256:2f9b…3ac1",
      "web@sha256:7ce3…0f4d",
    ],
    immutable: true,
    k8sSafety: "Rolls on digest",
    risk: "low",
    verdict: "Best for GitOps & K8s",
    goodFor:
      "Most secure: the reference is bound to content. Never changes after push — what you tested is exactly what deploys. Ideal for GitOps pipelines that pin image digests, and for rollbacks: point the Deployment back at the old sha256 digest.",
    pitfall:
      "Unreadable by humans. When debugging 'what is running', you must map digest → build metadata yourself. Also, digests are per-platform for multi-arch images: use the manifest-list digest, not the per-arch one.",
  },
  branch: {
    key: "branch",
    emoji: "🌿",
    name: "Branch Tags",
    format: "<branch>/<short-sha> (e.g. main-4f21c9a)",
    exampleTags: ["main-4f21c9a", "feature/payments-7b9d", "develop-0e31ab"],
    immutable: true,
    k8sSafety: "Rolls on new push",
    risk: "medium",
    verdict: "OK for dev/ephemeral envs",
    goodFor:
      "Ephemeral environments mirror every git push (every branch gets a unique image). Great for preview deployments and GitHub Actions Multi-Arch demo.",
    pitfall:
      "Two failure modes: (1) re-tagging a branch path (e.g. 'main' alone) mutates under running deployments; (2) tags embed a SHA but not a date, so ordering and 'which is newest' become ambiguous across environments. Keep branch tags short-lived and mix with createdAt metadata.",
  },
  latest: {
    key: "latest",
    emoji: "⚡",
    name: "latest Tag",
    format: "latest",
    exampleTags: ["latest"],
    immutable: false,
    k8sSafety: "Skips stale image",
    risk: "high",
    verdict: "Avoid in production",
    goodFor:
      "Fine for local demos, and as a human-friendly convenience alias that CI re-points to the newest finished build. Many registries auto-tag the first push as 'latest'.",
    pitfall:
      "The cluster may still be running the old digest even though 'latest' moved, because kubelet caches by tag (imagePullPolicy: Always still does a HEAD check and can race). Unpinned 'latest' in Deployments = nondeterministic rollouts and no rollback target.",
  },
};

// ===========================================================================
// Module 2 — Lifecycle stages
// ===========================================================================

const LIFECYCLE_STAGES: LifecycleStage[] = [
  {
    id: "build",
    emoji: "🛠️",
    title: "Build",
    summary:
      "docker build composes immutable layers (filesystem diffs). Each instruction (FROM, RUN, COPY) adds one layer; a rebuild reuses unchanged layers unless COPY'd files changed.",
    registryState:
      "Layers only exist locally; nothing published yet.",
    uiImpact: "No registry state; overlay mounts, cache keys = layer digests.",
    marker: "docker build",
  },
  {
    id: "scan",
    emoji: "🔬",
    title: "Scan & Sign",
    summary:
      "CVE scanning (Trivy, Grype, Snyk) runs against the image; a failing policy blocks the push or promotes a quarantine repo. Optional both signing anchors the digest to your trust chain.",
    registryState: "Nothing pushed when gate fails — safe natural rollback point.",
    uiImpact: "",
    marker: "trivy image",
  },
  {
    id: "push",
    emoji: "📤",
    title: "Push to Registry",
    summary:
      "docker push uploads each layer once and records the manifest (bytes = upload). Registries dedupe identical layers across images/tags by digest.",
    registryState: "Manifest stored; unique layers stored once per registry backend.",
    uiImpact: "No running change — tag now resolvable.",
    marker: "docker push",
  },
  {
    id: "tag",
    emoji: "🏷️",
    title: "Tagging / Digest",
    summary:
      "Tags are mutable pointers to a manifest digest. Immutable registries (pull-through, replication) allow version pinning; moving a tag re-points all consumers.",
    registryState: "repo:v2.4.1 → sha256:…",
    uiImpact: "Tag = deployment identifier; retagging = redeployment.",
    marker: "docker tag",
  },
  {
    id: "pull",
    emoji: "⬇️",
    title: "Pull to Node",
    summary:
      "Kubelet resolves the tag → manifest → platform-specific manifest → downloads missing layers to the container runtime storage (containerd/CRI-O) by digest.",
    registryState: "Pull adds no registry cost; layer reuse avoids downloads.",
    uiImpact:
      "First pull on each node costs bandwidth + time; subsequent nodes reuse node-local cache.",
    marker: "kubectl set image",
  },
  {
    id: "deploy",
    emoji: "🚀",
    title: "Deploy Rollout",
    summary:
      "Deployment creates new ReplicaSet; nodes pull and run the container. Keep old image pulls directly comparable: pin by digest for GitOps.",
    registryState: "Tag immutable / mutable influences whether a second deploy of same name does anything.",
    uiImpact: "Rolling update; rollback = set image back to old digest.",
    marker: "kubectl rollout status",
  },
  {
    id: "supersede",
    emoji: "♻️",
    title: "Superseded",
    summary:
      "Next deployment replaces this tag in the cluster. The registry keeps the tag (billed storage) unless a retention policy deletes it.",
    registryState: "Tag remains; another tag points at the same digest (layers stay).",
    uiImpact: "Old ReplicaSet hangs around for history/rollback.",
    marker: "rollout history",
  },
  {
    id: "expire",
    emoji: "🗑️",
    title: "Expiration / GC",
    summary:
      "Retention policy (count or age rule) marks the tag for deletion; registry GC unpins the manifest and layers become eligible for deletion — storage is released. Untagged (orphaned) manifests are the first to go.",
    registryState: "Tag deleted → digest reclamation asynchronously.",
    uiImpact: "Already-pulled caches on nodes remain valid.",
    marker: "lifecycle policy",
  },
];

// ===========================================================================
// Module 3 — Retention demo data
// ===========================================================================

const RETENTION_IMAGES: RetentionImage[] = [
  { id: "r1", repo: "payment-api", tag: "v2.4.1", daysOld: 2, sizeMb: 480 },
  { id: "r2", repo: "payment-api", tag: "v2.4.0", daysOld: 9, sizeMb: 475 },
  { id: "r3", repo: "payment-api", tag: "v2.3.2", daysOld: 28, sizeMb: 470 },
  { id: "r4", repo: "payment-api", tag: "v2.3.1", daysOld: 45, sizeMb: 465 },
  { id: "r5", repo: "payment-api", tag: null, daysOld: 61, sizeMb: 460 }, // untagged
  { id: "r6", repo: "payment-api", tag: "v2.2.0", daysOld: 90, sizeMb: 450 },
  { id: "r7", repo: "web-frontend", tag: "1.4.0", daysOld: 5, sizeMb: 340 },
  { id: "r8", repo: "web-frontend", tag: "1.7.4", daysOld: 12, sizeMb: 335 },
  { id: "r9", repo: "web-frontend", tag: "1.7.3", daysOld: 20, sizeMb: 330 },
  { id: "r10", repo: "web-frontend", tag: null, daysOld: 35, sizeMb: 325 },
  { id: "r11", repo: "web-frontend", tag: "1.6.2", daysOld: 75, sizeMb: 450 },
  { id: "r12", repo: "notifications-worker", tag: "0.4.0", daysOld: 4, sizeMb: 56 },
  { id: "r13", repo: "notifications-worker", tag: "0.3.1", daysOld: 60, sizeMb: 52 },
  { id: "r14", repo: "notifications-worker", tag: null, daysOld: 78, sizeMb: 48 },
];

// ===========================================================================
// Module 4 — Multi-arch data
// ===========================================================================

const MANIFEST_LIST = {
  mediaType: "application/vnd.docker.distribution.manifest.list.v2+json",
  schemaVersion: 2,
  manifests: [
    {
      mediaType: "application/vnd.docker.distribution.manifest.v2+json",
      platform: { architecture: "amd64", os: "linux" },
      digest: "sha256:4c1a1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f",
      size: 4210854,
    },
    {
      mediaType: "application/vnd.docker.distribution.manifest.v2+json",
      platform: { architecture: "arm64", os: "linux" },
      digest: "sha256:5d2b2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a",
      size: 4102822,
    },
    {
      mediaType: "application/vnd.docker.distribution.manifest.v2+json",
      platform: { architecture: "arm", variant: "v7", os: "linux" },
      digest: "sha256:6e3c3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
      size: 3984409,
    },
  ],
};

const MANIFEST_LIST_JSON = JSON.stringify(MANIFEST_LIST, null, 2);

const PLATFORMS: PlatformEntry[] = [
  {
    key: "amd64",
    os: "linux",
    arch: "amd64",
    digest: "sha256:4c1e1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f",
    sizeMb: 61.4,
    layersCount: 4,
    config: "sha256:9a4f4f5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c",
    entrypoint: "[\"node\", \"server.js\"]",
  },
  {
    key: "arm64",
    os: "linux",
    arch: "arm64",
    digest: "sha256:5d2e3e4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3",
    sizeMb: 57.8,
    layersCount: 4,
    config: "sha256:1b5g5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a",
    entrypoint: "[\"node\", \"server.js\"]",
  },
  {
    key: "armv7",
    os: "linux",
    arch: "arm",
    variant: "v7",
    digest: "sha256:6e3f4f4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4e5f6a7b8c9d0e1f2a3b",
    sizeMb: 55.1,
    layersCount: 4,
    config: "sha256:c6d5c6d7e8f9a0b1c2d3e4f5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f",
    entrypoint: "[\"node\", \"server.js\"]",
  },
];

// ===========================================================================
// Module 5 — Registry cost model data
// ===========================================================================

interface RegistryPricing {
  id: "ecr" | "gcr" | "acr";
  name: string;
  vendor: string;
  storageRateUsd: number;
  egressRateUsd: number;
  note: string;
}

const REGISTRY_PRICING: RegistryPricing[] = [
  {
    id: "ecr",
    name: "Amazon ECR",
    vendor: "AWS",
    storageRateUsd: 0.1,
    egressRateUsd: 0.09,
    note: "Flat $0.10/GB-mo storage; egress billed at standard AWS data-transfer rates. Free tier: 500 MB/mo private for new accounts (12 months).",
  },
  {
    id: "gcr",
    name: "Google Artifact Registry (GCR)",
    vendor: "GCP",
    storageRateUsd: 0.1,
    egressRateUsd: 0.12,
    note: "GCR is deprecated in favor of Artifact Registry. Storage $0.10/GB-mo; egress to internet at GCP network pricing (higher first-TB tier). Free tier 0.5 GiB/mo.",
  },
  {
    id: "acr",
    name: "Azure Container Registry",
    vendor: "Azure",
    storageRateUsd: 0.1,
    egressRateUsd: 0.087,
    note: "ACR storage ~$0.10/GB-mo beyond SKU-included quota; egress Zone-1 pricing applies additionally. SKUs (Basic/Standard/Premium) add their own monthly fee — add yours below.",
  },
];

// ===========================================================================
// Module 5 — Layer analyzer data
// ===========================================================================

const ANALYZED_IMAGES: AnalyzedImage[] = [
  {
    id: "payment-api",
    name: "payment-api",
    ref: "registry.example.com/team/payment-api:v2.4.1",
    note: "Multi-stage build: node runtime only in final image.",
    layers: [
      { id: "l-alpine", label: "alpine:3.19 (base os)", sizeMb: 3.2, kind: "base", sharedWith: ["notifications-worker"] },
      { id: "l-node", label: "node:20-alpine runtime", sizeMb: 18.6, kind: "base", sharedWith: ["notifications-worker"] },
      { id: "l-pkg", label: "COPY package.json + npm ci --omit=dev", sizeMb: 24.1, kind: "deps", sharedWith: [] },
      { id: "l-code", label: "COPY dist/ (compiled TS)", sizeMb: 12.4, kind: "code", sharedWith: [] },
      { id: "l-certs", label: "COPY ca-cert bundle", sizeMb: 1.1, kind: "env", sharedWith: [] },
      { id: "l-user", label: "USER node (non-root)", sizeMb: 0.002, kind: "env", sharedWith: [] },
    ],
  },
  {
    id: "notifications-worker",
    name: "notifications-worker",
    ref: "registry.example.com/team/notifications-worker:v0.9.2",
    note: "Same base as payment-api — registry dedupes shared layers.",
    layers: [
      { id: "l-alpine", label: "alpine:3.19 (base os)", sizeMb: 3.2, kind: "base", sharedWith: ["payment-api"] },
      { id: "l-node", label: "node:20-alpine runtime", sizeMb: 18.6, kind: "base", sharedWith: ["payment-api"] },
      { id: "l-pkg", label: "COPY package.json + npm ci --omit=dev", sizeMb: 24.1, kind: "deps", sharedWith: [] },
      { id: "l-code", label: "COPY dist/ (compiled)", sizeMb: 9.4, kind: "code", sharedWith: [] },
      { id: "l-worker", label: "ENTRYPOINT worker.js", sizeMb: 0.4, kind: "env", sharedWith: [] },
    ],
  },
  {
    id: "web-frontend",
    name: "web-frontend",
    ref: "registry.example.com/team/web-frontend:2.0.1",
    note: "Single-stage build: dev dependencies shipped in prod image.",
    layers: [
      { id: "l-debian", label: "debian:bookworm (base os)", sizeMb: 84.2, kind: "base", sharedWith: [] },
      { id: "l-python", label: "python3 + build toolchain", sizeMb: 34.6, kind: "deps", sharedWith: [] },
      { id: "l-app", label: "COPY app/ + deps install", sizeMb: 58.9, kind: "code", sharedWith: [] },
      { id: "l-assets", label: "COPY public/ static assets", sizeMb: 20.3, kind: "code", sharedWith: [] },
      { id: "l-config", label: "ENV + default config", sizeMb: 0.1, kind: "env", sharedWith: [] },
    ],
  },
];

const LAYER_KIND_COLORS: Record<LayerDef["kind"], string> = {
  base: "bg-sky-600",
  deps: "bg-blue-500",
  code: "bg-blue-400",
  env: "bg-slate-400",
};

// ===========================================================================
// Helpers
// ===========================================================================

function fmtGb(mb: number): string {
  const gb = mb / 1024;
  return gb >= 1 ? `${gb.toFixed(2)} GB` : `${Math.round(mb)} MB`;
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

// ===========================================================================
// Component
// ===========================================================================

export default function DkImageRegistrySection() {
  // ---- Module 1: Tag strategy selector ----
  const [strategy, setStrategy] = useState<TagStrategyKey>("semantic");

  // ---- Module 2: lifecycle visualizer ----
  const [stageIndex, setStageIndex] = useState<number>(0);

  // ---- Module 3: retention policy builder ----
  const [keepCount, setKeepCount] = useState<number>(2);
  const [expireTaggedDays, setExpireTaggedDays] = useState<number>(30);
  const [expireUntaggedDays, setExpireUntaggedDays] = useState<number>(7);
  const [protectPatterns, setProtectPatterns] = useState<string>("latest, v*");
  const [showPolicyPreview, setShowPolicyPreview] = useState<boolean>(false);

  // ---- Module 4: multi-arch viewer ----
  const [selectedPlatform, setSelectedPlatform] = useState<string>("amd64");
  const [showRawManifest, setShowRawManifest] = useState<boolean>(false);

  // ---- Module 5: registry cost calculator ----
  const [avgImageSizeMb, setAvgImageSizeMb] = useState<number>(1200);
  const [tagCount, setTagCount] = useState<number>(120);
  const [monthlyEgressGb, setMonthlyEgressGb] = useState<number>(18);
  const [layerReusePct, setLayerReusePct] = useState<number>(20);
  const [acrSkuFee, setAcrSkuFee] = useState<number>(0);

  // ---- Module 6: image layer analyzer ----
  const [analyzedImage, setAnalyzedImage] = useState<string>("payment-api");

  const activeStrategy = TAG_STRATEGIES[strategy];

  // ---- Retention computation ----
  const retentionPlan = useMemo(() => {
    const protectedPrefixes = protectPatterns
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => p.replace(/\*/g, "")) // simplified: strip wildcard, match prefix or suffix
      .filter((p) => p.length > 0);

    const images = RETENTION_IMAGES.map((img) => {
      const isProtected = img.tag !== null && protectedPrefixes.some((p) => img.tag!.startsWith(p) || img.tag!.endsWith(p));
      const untagged = img.tag === null;

      if (isProtected) {
        return { ...img, action: "keep" as const, reason: "Protected tag matches policy" };
      }
      if (untagged) {
        if (img.daysOld > expireUntaggedDays) {
          return { ...img, action: "expire" as const, reason: `Untagged, older than ${expireUntaggedDays} days` };
        }
        return { ...img, action: "keep" as const, reason: "Untagged but within grace period" };
      }

      // tagged: group by repo, rank by age
      const repoImages = RETENTION_IMAGES.filter((r) => r.repo === img.repo && r.tag !== null).sort(
        (a, b) => a.daysOld - b.daysOld
      );
      const rank = repoImages.findIndex((r) => r.id === img.id) + 1;

      if (rank <= keepCount) {
        return { ...img, action: "keep" as const, reason: `Within latest ${keepCount} tags` };
      }
      if (img.daysOld > expireTaggedDays) {
        return { ...img, action: "expire" as const, reason: `Older than ${expireTaggedDays} days and beyond count` };
      }
      return { ...img, action: "keep" as const, reason: "Within retention horizon" };
    });

    const expiredMb = images.filter((i) => i.action === "expire").reduce((s, i) => s + i.sizeMb, 0);
    const monthlySavingUsd = (expiredMb / 1024) * 0.1;
    return { images, expiredMb, monthlySavingUsd };
  }, [keepCount, expireTaggedDays, expireUntaggedDays, protectPatterns]);

  const policyYaml = useMemo(() => {
    return `# ECR-style lifecycle policy (simplified)
rules:
  - rulePriority: 1
    description: Ignore protected tags
    tagStatus: tagged
    tagPatternList: ["${protectPatterns}"]
    action: { type: "expire" }
  - rulePriority: 2
    description: Expire untagged older than ${expireUntaggedDays}d
    imageStatus: untagged
    expirationDays: ${expireUntaggedDays}
  - rulePriority: 3
    description: Keep latest ${keepCount}
    countType: imageCountMoreThan
    countNumber: ${keepCount}
  - rulePriority: 4
    description: Expire tagged older than ${expireTaggedDays}d
    expirationDays: ${expireTaggedDays}`;
  }, [keepCount, expireTaggedDays, expireUntaggedDays, protectPatterns]);

  // ---- Module 5 - cost model computation ----
  const costModel = useMemo(() => {
    const rawStorageGb = (avgImageSizeMb * tagCount) / 1024;
    const dedupFactor = Math.max(0, 1 - layerReusePct / 100);
    const effectiveStorageGb = rawStorageGb * dedupFactor;

    const rows = REGISTRY_PRICING.map((reg) => {
      const storageCost = effectiveStorageGb * reg.storageRateUsd;
      const egressCost = monthlyEgressGb * reg.egressRateUsd;
      const skuFee = reg.id === "acr" ? acrSkuFee : 0;
      const total = storageCost + egressCost + skuFee;
      return { ...reg, storageCost, egressCost, skuFee, total, storageGb: effectiveStorageGb };
    });

    const maxTotal = Math.max(...rows.map((r) => r.total), 0.01);
    const cheapest = rows.reduce((best, r) => (r.total < best.total ? r : best), rows[0]);
    return { rows, rawStorageGb, effectiveStorageGb, maxTotal, cheapest };
  }, [avgImageSizeMb, tagCount, monthlyEgressGb, layerReusePct, acrSkuFee]);

  // ---- Module 6 - layer model computation ----
  const layerModel = useMemo(() => {
    const image = ANALYZED_IMAGES.find((i) => i.id === analyzedImage)!;
    const otherImages = ANALYZED_IMAGES.filter((i) => i.id !== analyzedImage);

    const totalLogical = image.layers.reduce((s, l) => s + l.sizeMb, 0);
    const sharedMb = image.layers
      .filter((l) => l.sharedWith.length > 0)
      .reduce((s, l) => s + l.sizeMb, 0);
    const uniqueMb = totalLogical - sharedMb;

    // cross-layer dedupe estimation as a summary
    const allDedupedPairs = ANALYZED_IMAGES.map((img) => img.layers.length * (img.id === image.id ? 0 : 1)).reduce(
      (a, b) => a + b,
      0
    );

    const allUniqueBytes = ANALYZED_IMAGES.reduce(
      (s, img) => s + img.layers.filter((l) => l.sharedWith.length === 0).reduce((ss, l) => ss + l.sizeMb, 0),
      0
    );
    return {
      image,
      totalLogical,
      sharedMb,
      uniqueMb,
      dedupePairCount: allDedupedPairs,
      allUniqueMb: allUniqueBytes,
    };
  }, [analyzedImage]);

  const maxLayerMb = useMemo(() => {
    const image = ANALYZED_IMAGES.find((i) => i.id === analyzedImage)!;
    return Math.max(...image.layers.map((l) => l.sizeMb), 1);
  }, [analyzedImage]);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <section id="dk-image-registry" className="space-y-8 text-slate-900 dark:text-slate-100">
      {/* Track header */}
      <div className="rounded-2xl bg-gradient-to-r from-sky-500 to-blue-500 p-6 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-sky-100 mb-1">
              Container Platform / Image Supply Chain
            </p>
            <h2 className="text-2xl font-extrabold">Docker Image Registry &amp; Tag Strategies</h2>
            <p className="text-sm text-sky-50/90 mt-1 max-w-2xl">
              Tag immutability, retention economics, multi-arch distribution, and layer anatomy — everything that
              decides whether an image is safe, findable, and cheap to store.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-white/15 border border-white/30">4 tag models</span>
            <span className="px-2.5 py-1 rounded-lg bg-white/15 border border-white/30">8 lifecycle stages</span>
            <span className="px-2.5 py-1 rounded-lg bg-white/15 border border-white/30">3 registries priced</span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODULE 1 — Tag Strategy Selector */}
      {/* ==================================================================== */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-700 border border-sky-200 dark:border-sky-700 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏷️</span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Image Tag Strategy Selector</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Each strategy is a promise about <span className="font-mono">repo:tag → digest</span> stability. Pick one
                and inspect its failure modes.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-700">
            Module 1
          </span>
        </div>

        {/* Strategy picker */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {(Object.keys(TAG_STRATEGIES) as TagStrategyKey[]).map((key) => {
            const s = TAG_STRATEGIES[key];
            const selected = strategy === key;
            return (
              <button
                key={key}
                onClick={() => setStrategy(key)}
                className={`p-3 rounded-xl text-left border transition-all hover:scale-[1.01] ${
                  selected
                    ? "bg-white dark:bg-slate-800 border-sky-400 ring-1 ring-sky-400 shadow-sm"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-sky-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">{s.emoji}</span>
                  {s.immutable ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                      immutable
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                      mutable
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">{s.name}</p>
                <p className="text-[11px] font-mono text-sky-600 dark:text-sky-400 mt-0.5 truncate">{s.format}</p>
              </button>
            );
          })}
        </div>

        {/* Selected strategy detail */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{activeStrategy.emoji} {activeStrategy.name}</span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                activeStrategy.risk === "low"
                  ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700"
                  : activeStrategy.risk === "medium"
                    ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700"
                    : "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-700"
              }`}
            >
              risk: {activeStrategy.risk}
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                activeStrategy.k8sSafety === "Rolls on digest"
                  ? "bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-700"
                  : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700"
              }`}
            >
              {activeStrategy.k8sSafety}
            </span>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{activeStrategy.verdict}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-sky-600 dark:text-sky-400 block mb-1">✅ Best for</span>
              <span className="text-slate-600 dark:text-slate-300">{activeStrategy.goodFor}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-rose-600 dark:text-rose-400 block mb-1">⚠️ Pitfalls</span>
              <span className="text-slate-600 dark:text-slate-300">{activeStrategy.pitfall}</span>
            </div>
          </div>

          {/* Example tags */}
          <div>
            <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mb-1.5">Example references</p>
            <div className="flex flex-wrap gap-1.5">
              {activeStrategy.exampleTags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-1 rounded bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 font-mono text-[11px] text-sky-700 dark:text-sky-300"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODULE 2 — Image Lifecycle Visualizer */}
      {/* ==================================================================== */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-700 border border-sky-100 dark:border-sky-700 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔁</span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Image Lifecycle Visualizer</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Every image travels build → registry → cluster → garbage. Drag the stage slider.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-700">
            Module 2
          </span>
        </div>

        {/* Stage chips */}
        <div className="flex flex-wrap gap-1.5">
          {LIFECYCLE_STAGES.map((st, i) => (
            <button
              key={st.id}
              onClick={() => setStageIndex(i)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono border transition-colors ${
                i === stageIndex
                  ? "bg-sky-600 text-white border-sky-600"
                  : i < stageIndex
                    ? "bg-blue-50 dark:bg-blue-900/30 text-sky-700 dark:text-sky-300 border-blue-200 dark:border-blue-700"
                    : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-sky-300"
              }`}
            >
              {st.emoji} {st.id}
            </button>
          ))}
        </div>

        <input
          type="range"
          min={0}
          max={LIFECYCLE_STAGES.length - 1}
          value={stageIndex}
          onChange={(e) => setStageIndex(Number(e.target.value))}
          className="w-full accent-sky-600"
          aria-label="Lifecycle stage"
        />

        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{LIFECYCLE_STAGES[stageIndex].emoji}</span>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{LIFECYCLE_STAGES[stageIndex].title}</p>
                <p className="text-[10px] font-mono text-sky-600 dark:text-sky-400">{LIFECYCLE_STAGES[stageIndex].marker}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{LIFECYCLE_STAGES[stageIndex].summary}</p>
          </div>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-700 dark:text-slate-200 block mb-0.5">Registry state</span>
              <span className="text-slate-500 dark:text-slate-400">{LIFECYCLE_STAGES[stageIndex].registryState}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-700 dark:text-slate-200 block mb-0.5">Cluster impact</span>
              <span className="text-slate-500 dark:text-slate-400">{LIFECYCLE_STAGES[stageIndex].uiImpact}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODULE 3 — Retention Policy Builder */}
      {/* ==================================================================== */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-700 border border-sky-100 dark:border-sky-700 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧹</span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Retention Policy Builder</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Policies fight registry sprawl. Tune rules below and watch the prune preview.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-700">
            Module 3
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* keep count */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Keep newest tagged</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="range"
                min={1}
                max={10}
                value={keepCount}
                onChange={(e) => setKeepCount(Number(e.target.value))}
                className="flex-1 accent-sky-600"
              />
              <span className="w-6 text-xs font-mono text-sky-600 dark:text-sky-400 font-bold">{keepCount}</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">per repository</p>
          </div>

          {/* untagged */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Expire untagged after</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="range"
                min={1}
                max={90}
                value={expireUntaggedDays}
                onChange={(e) => setExpireUntaggedDays(Number(e.target.value))}
                className="flex-1 accent-sky-600"
              />
              <span className="w-12 text-xs font-mono text-sky-600 dark:text-sky-400 font-bold">{expireUntaggedDays}d</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">orphaned manifests</p>
          </div>

          {/* tagged age */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Expire tagged after</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="range"
                min={1}
                max={120}
                value={expireTaggedDays}
                onChange={(e) => setExpireTaggedDays(Number(e.target.value))}
                className="flex-1 accent-sky-600"
              />
              <span className="w-12 text-xs font-mono text-sky-600 dark:text-sky-400 font-bold">{expireTaggedDays}d</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">beyond newest {keepCount}</p>
          </div>

          {/* protected */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Protected tag patterns</label>
            <input
              type="text"
              value={protectPatterns}
              onChange={(e) => setProtectPatterns(e.target.value)}
              className="mt-1 w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-200 focus:border-sky-400 focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">comma-separated; never expires</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* prune preview */}
          <div className="lg:col-span-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Prune preview — {RETENTION_IMAGES.length} images</p>
              <div className="flex gap-2 text-[10px] font-mono">
                <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">
                  keep {retentionPlan.images.filter((i) => i.action === "keep").length}
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-700">
                  expire {retentionPlan.images.filter((i) => i.action === "expire").length}
                </span>
              </div>
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {retentionPlan.images.map((img) => (
                <div
                  key={img.id}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[11px] font-mono ${
                    img.action === "expire"
                      ? "bg-rose-50/60 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-300"
                      : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span>{img.action === "expire" ? "🗑️" : "✅"}</span>
                    <span className="truncate font-bold">
                      {img.repo}:{img.tag ?? "<untagged>"}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{img.daysOld}d old</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{fmtGb(img.sizeMb)}</span>
                    <span className="text-slate-300 dark:text-slate-400">·</span>
                    <span className="text-slate-500 dark:text-slate-400 truncate max-w-[220px]">{img.reason}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">
                Freed on next run: <span className="font-mono text-emerald-600 dark:text-emerald-400">{fmtGb(retentionPlan.expiredMb)}</span>
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                ≈ <span className="font-mono text-sky-600 dark:text-sky-400">${(retentionPlan.monthlySavingUsd).toFixed(2)}/mo</span> at
                $0.10/GB
              </span>
            </div>
          </div>

          {/* policy output */}
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Generated policy</p>
              <button
                onClick={() => setShowPolicyPreview(!showPolicyPreview)}
                className="text-[10px] font-mono px-2 py-1 rounded bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-700 hover:bg-sky-100"
              >
                {showPolicyPreview ? "hide" : "show"}
              </button>
            </div>
            {showPolicyPreview && (
              <pre className="flex-1 text-[10px] font-mono text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-700 rounded-lg p-3 border border-slate-200 dark:border-slate-700 overflow-auto">
                {policyYaml}
              </pre>
            )}
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
              Mutable tags (branch deployments, re-tagged versions) escape age rules — pin policies to digest when
              traceability matters
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODULE 4 — Multi-Arch Manifest Viewer */}
      {/* ==================================================================== */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-700 border border-sky-100 dark:border-sky-700 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧬</span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Multi-Arch Manifest Viewer</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                One tag, many architectures: the manifest list (index) points to per-arch manifests.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-700">
            Module 4
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Platform list */}
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">
              registry.example.com/team/payment-api:latest (index)
            </p>
            <div className="space-y-1.5">
              {PLATFORMS.map((p) => {
                const containerName = p.arch + (p.variant ? "/" + p.variant : "");
                return (
                  <button
                    key={p.key}
                    onClick={() => setSelectedPlatform(p.key)}
                    className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                      selectedPlatform === p.key
                        ? "bg-sky-50 dark:bg-sky-900/30 border-sky-400 text-sky-700 dark:text-sky-300"
                        : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold">{containerName}</span>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{p.sizeMb} MB</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate">{p.digest}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected platform detail + raw manifest */}
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Selected manifest</p>
              <button
                onClick={() => setShowRawManifest(!showRawManifest)}
                className="text-[10px] font-mono px-2 py-1 rounded bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-700 hover:bg-sky-100"
              >
                {showRawManifest ? "hide JSON" : "raw JSON"}
              </button>
            </div>
            {showRawManifest ? (
              <pre className="text-[10px] leading-relaxed font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 rounded-lg p-3 border border-slate-200 dark:border-slate-700 whitespace-pre overflow-auto h-56">
                {MANIFEST_LIST_JSON}
              </pre>
            ) : (() => {
              const p = PLATFORMS.find((x) => x.key === selectedPlatform)!;
              return (
                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-slate-400 dark:text-slate-500">platform</span>
                    <span className="text-slate-700 dark:text-slate-200">{p.os}/{p.arch + (p.variant ? " variant " + p.variant : "")}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-slate-400 dark:text-slate-500">mediaType</span>
                    <span className="text-slate-700 dark:text-slate-200">manifest.v2+json</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-slate-400 dark:text-slate-500">size</span>
                    <span className="text-slate-700 dark:text-slate-200">{p.sizeMb} MB ({p.layersCount} layers)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700 gap-2">
                    <span className="text-slate-400 dark:text-slate-500 shrink-0">config</span>
                    <span className="text-slate-700 dark:text-slate-200 truncate">{p.config}</span>
                  </div>
                  <div className="flex justify-between py-1 gap-2">
                    <span className="text-slate-400 dark:text-slate-500 shrink-0">entrypoint</span>
                    <span className="text-slate-700 dark:text-slate-200 break-all">{p.entrypoint}</span>
                  </div>
                </div>
              );
            })()}
            <div className="mt-3 rounded-lg bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 p-2.5 text-[10px] text-sky-700 dark:text-sky-300 leading-relaxed">
              Kubelet (arm64) asks for the index, receives this digest, and pulls only the arm64 manifest — amd64 nodes
              never download arm layers. Upstream:{" "}
              <span className="font-mono">docker pull --platform linux/arm64</span>
            </div>
          </div>
        </div>

        {/* FAB: architecture summary strip */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 flex flex-col sm:flex-row gap-2 text-[11px] font-mono">
          <div className="flex-1 px-3 py-2 rounded-lg bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700">
            <span className="text-sky-600 dark:text-sky-400 font-bold block">1 push</span>
            <span className="text-slate-500 dark:text-slate-400">tag v2.4.1 published once</span>
          </div>
          <div className="flex-1 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700">
            <span className="text-blue-600 dark:text-blue-400 font-bold block">3 manifests</span>
            <span className="text-slate-500 dark:text-slate-400">one per architecture</span>
          </div>
          <div className="flex-1 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold block">1 release train</span>
            <span className="text-slate-500 dark:text-slate-400">cluster-wide same version</span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODULE 5 — Registry Cost Calculator */}
      {/* ==================================================================== */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-700 border border-sky-100 dark:border-sky-700 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">💸</span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Registry Cost Calculator — ECR / ACR / GCR</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Storage is billed per unique byte; egress per pull crossing the cloud boundary.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-700">
            Module 5
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">Image size</label>
            <div className="flex items-center gap-2">
              <input type="range" min={200} max={5000} step={100} value={avgImageSizeMb} onChange={(e) => setAvgImageSizeMb(Number(e.target.value))} className="flex-1 accent-sky-600 w-full" />
              <span className="text-xs font-mono text-sky-600 dark:text-sky-400 font-bold w-14 text-right">{avgImageSizeMb} MB</span>
            </div>
          </div>
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">Distinct tags kept</label>
            <div className="flex items-center gap-2">
              <input type="range" min={5} max={500} step={5} value={tagCount} onChange={(e) => setTagCount(Number(e.target.value))} className="flex-1 accent-sky-600" />
              <span className="text-xs font-mono text-sky-600 dark:text-sky-400 font-bold w-10 text-right">{tagCount}</span>
            </div>
          </div>
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">Egress / month</label>
            <div className="flex items-center gap-2">
              <input type="range" min={0} max={300} step={1} value={monthlyEgressGb} onChange={(e) => setMonthlyEgressGb(Number(e.target.value))} className="flex-1 accent-sky-600" />
              <span className="text-xs font-mono text-sky-600 dark:text-sky-400 font-bold w-10 text-right">{monthlyEgressGb} GB</span>
            </div>
          </div>
          <div className="rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">Layer reuse</label>
            <div className="flex items-center gap-2">
              <input type="range" min={0} max={60} step={5} value={layerReusePct} onChange={(e) => setLayerReusePct(Number(e.target.value))} className="flex-1 accent-sky-600" />
              <span className="text-xs font-mono text-sky-600 dark:text-sky-400 font-bold w-10 text-right">{layerReusePct}%</span>
            </div>
          </div>
          <div className="rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">ACR SKU fee ($/mo)</label>
            <input type="number" min={0} step={5} value={acrSkuFee} onChange={(e) => setAcrSkuFee(Number(e.target.value) || 0)} className="w-full mt-1 px-2 py-1 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono text-sky-600 dark:text-sky-400 focus:border-sky-400 focus:outline-none" />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Basic = $0, Standard/$25, Premium/$100</p>
          </div>
        </div>

        {/* cost cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {costModel.rows.map((r) => (
            <div
              key={r.id}
              className={`relative rounded-xl border p-4 ${
                costModel.cheapest.id === r.id ? "border-sky-400 bg-sky-50/60 dark:bg-sky-900/30" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              }`}
            >
              {costModel.cheapest.id === r.id && (
                <span className="absolute -top-2 right-3 text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-600 text-white">
                  cheapest
                </span>
              )}
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{r.name}</p>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{r.vendor}</span>
              </div>
              <div className="mt-2 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">storage ({(costModel.effectiveStorageGb).toFixed(1)} GB @${r.storageRateUsd.toFixed(2)})</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">${r.storageCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">egress ({monthlyEgressGb} GB @${r.egressRateUsd.toFixed(3)})</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">${r.egressCost.toFixed(2)}</span>
                </div>
                {r.skuFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">SKU fee</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200">${r.skuFee.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full ${costModel.cheapest.id === r.id ? "bg-sky-500" : "bg-blue-300"}`}
                  style={{ width: `${(r.total / costModel.maxTotal) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-xl font-extrabold text-slate-900 dark:text-slate-100">{fmtUsd(r.total)}<span className="text-xs text-slate-400 dark:text-slate-500 font-medium">/mo</span></p>
              <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 leading-snug">{r.note}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
          Storage = unique layers after reuse deduction ({Math.max(0, 100 - layerReusePct)}%); actual bills depend on
          image variance and retention. ACR also carries SKU monthly fees — the SKU input above is your own plan price.
        </p>
      </div>

      {/* ==================================================================== */}
      {/* MODULE 6 — Image Layer Analyzer */}
      {/* ==================================================================== */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-700 border border-sky-100 dark:border-sky-700 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧅</span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Image Layer Analyzer</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Peel an image: each layer is a filesystem diff. Same layers between images = stored once.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-700">
            Module 6
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {ANALYZED_IMAGES.map((img) => (
            <button
              key={img.id}
              onClick={() => setAnalyzedImage(img.id)}
              className={`px-3 py-2 rounded-lg border text-xs font-mono transition-colors ${
                analyzedImage === img.id
                  ? "bg-sky-600 text-white border-sky-600"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-300"
              }`}
            >
              {img.name}
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <p className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate">{layerModel.image.ref}</p>
            <div className="flex gap-2 text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">logical {fmtGb(layerModel.totalLogical)}</span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">unique {fmtGb(layerModel.uniqueMb)}</span>
              <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400">dedupable {fmtGb(layerModel.sharedMb)}</span>
            </div>
          </div>

          {/* stacked bar */}
          <div className="flex h-5 rounded-md overflow-hidden mb-4 border border-slate-200 dark:border-slate-700">
            {layerModel.image.layers.map((l) => (
              <div
                key={l.id + l.label}
                className={`${LAYER_KIND_COLORS[l.kind]} ${l.sharedWith.length ? "opacity-80" : ""}`}
                style={{ width: `${(l.sizeMb / layerModel.totalLogical) * 100}%` }}
                title={`${l.label} — ${fmtGb(l.sizeMb)}`}
              />
            ))}
          </div>

          <div className="space-y-1">
            {layerModel.image.layers.map((l) => (
              <div key={l.id + l.label} className="flex items-center gap-3 text-[11px]">
                <div className="w-40 shrink-0 flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-sm ${LAYER_KIND_COLORS[l.kind]}`} />
                  <span className="font-mono text-slate-500 dark:text-slate-400 truncate">{l.kind}</span>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="h-4 rounded bg-slate-100 dark:bg-slate-700 overflow-hidden flex-1">
                    <div
                      className={`h-full ${l.sharedWith.length ? "bg-sky-400" : "bg-blue-500"}`}
                      style={{ width: `${Math.max((l.sizeMb / maxLayerMb) * 100, 2)}%` }}
                    />
                  </div>
                  <span className="font-mono text-slate-600 dark:text-slate-300 w-16 text-right">{fmtGb(l.sizeMb)}</span>
                  {l.sharedWith.length > 0 ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 whitespace-nowrap">
                      shared w/ {l.sharedWith.join(", ")}
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      unique
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
            {layerModel.image.note} Even a tiny app ships the full base — check apk/apt layers &amp; multi-stage=1.
          </p>
        </div>
      </div>
    </section>
  );
}