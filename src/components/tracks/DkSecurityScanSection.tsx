"use client";

import { useEffect, useMemo, useState } from "react";

// ==========================================
// TYPES & INTERFACES
// ==========================================

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
type FixStatus = "fix-available" | "no-fix";
type ScanPhase = "idle" | "scanning" | "done";
type Grade = "A+" | "A" | "B" | "C" | "D" | "F";

interface Vulnerability {
  id: string;
  pkgName: string;
  pkgType: "apk" | "deb" | "npm" | "pip" | "gomod";
  installedVersion: string;
  fixedVersion: string | null;
  severity: Severity;
  status: FixStatus;
  title: string;
  fixCommand: string;
}

interface SbomEntry {
  name: string;
  version: string;
  licensor: string;
}

interface ScanImage {
  id: string;
  name: string;
  tag: string;
  baseImage: string;
  os: string;
  architecture: string;
  size: string;
  digest: string;
  vulnerabilities: Vulnerability[];
  sbom: SbomEntry[];
}

// ==========================================
// SEVERITY METADATA (Trivy severity palette)
// ==========================================

const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"];

const SEVERITY_META: Record<
  Severity,
  { chip: string; label: string; dot: string; bar: string; weight: number }
> = {
  CRITICAL: {
    chip: "bg-rose-50 border-rose-300 text-rose-700",
    label: "text-rose-600",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
    weight: 10,
  },
  HIGH: {
    chip: "bg-orange-50 border-orange-300 text-orange-700",
    label: "text-orange-500",
    dot: "bg-orange-500",
    bar: "bg-orange-500",
    weight: 5,
  },
  MEDIUM: {
    chip: "bg-amber-50 border-amber-300 text-amber-700",
    label: "text-amber-500",
    dot: "bg-amber-500",
    bar: "bg-amber-400",
    weight: 2,
  },
  LOW: {
    chip: "bg-sky-50 border-sky-300 text-sky-700",
    label: "text-sky-500",
    dot: "bg-sky-500",
    bar: "bg-sky-400",
    weight: 0.5,
  },
  UNKNOWN: {
    chip: "bg-slate-50 border-slate-300 text-slate-600",
    label: "text-slate-500",
    dot: "bg-slate-400",
    bar: "bg-slate-300",
    weight: 0,
  },
};

const GRADE_META: Record<
  Grade,
  { badge: string; text: string }
> = {
  "A+": { badge: "bg-emerald-50 border-emerald-300 text-emerald-700", text: "text-emerald-600" },
  A: { badge: "bg-sky-50 border-sky-300 text-sky-700", text: "text-sky-500" },
  B: { badge: "bg-amber-50 border-amber-300 text-amber-700", text: "text-amber-500" },
  C: { badge: "bg-orange-50 border-orange-300 text-orange-700", text: "text-orange-500" },
  D: { badge: "bg-rose-50 border-rose-300 text-rose-700", text: "text-rose-500" },
  F: { badge: "bg-red-50 border-red-300 text-red-700", text: "text-red-600" },
};

// ==========================================
// SCAN SIMULATION DATA
// ==========================================

const SCAN_STEPS = [
  "Resolving image manifest by digest…",
  "Extracting OCI layers (fs diff)…",
  "Enumerating packages (dpkg / npm / pip lockfiles)…",
  "Querying Trivy vulnerability DB (NVD + OSV + GHSA)…",
  "Matching CVEs against installed versions…",
];

const IMAGES: ScanImage[] = [
  {
    id: "my-app",
    name: "catalog-service",
    tag: "1.2.3",
    baseImage: "node:20-bookworm-slim (Debian 12)",
    os: "debian 12.2 (bookworm)",
    architecture: "arm64",
    size: "241 MB (compressed)",
    digest: "sha256:9f9f35b1a7c2e4d8f0a3b6c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f",
    vulnerabilities: [
      {
        id: "CVE-2024-6387",
        pkgName: "libssh2",
        pkgType: "deb",
        installedVersion: "1.11.0",
        fixedVersion: "1.11.0+dfsg-3",
        severity: "CRITICAL",
        status: "fix-available",
        title: "regreSSHion — remote code execution as root in sshd signal handler race",
        fixCommand: "apt-get update && apt-get install --only-upgrade libssh2-1",
      },
      {
        id: "CVE-2023-4863",
        pkgName: "libwebp7",
        pkgType: "deb",
        installedVersion: "1.2.4-0.2",
        fixedVersion: "1.2.4-0.2+deb12u1",
        severity: "CRITICAL",
        status: "fix-available",
        title: "Heap buffer overflow in WebPMux (Chrome/ANV attack chain)",
        fixCommand: "apt-get update && apt-get install --only-upgrade libwebp7",
      },
      {
        id: "CVE-2024-29012",
        pkgName: "express",
        pkgType: "npm",
        installedVersion: "4.18.2",
        fixedVersion: "4.19.0",
        severity: "HIGH",
        status: "fix-available",
        title: "Path traversal in serve-static — %2e%2e%2f bypass serves files outside public dir",
        fixCommand: "npm audit fix express",
      },
      {
        id: "CVE-2024-43796",
        pkgName: "express",
        pkgType: "npm",
        installedVersion: "4.19.2",
        fixedVersion: "4.20.0",
        severity: "HIGH",
        status: "fix-available",
        title: "Prototype pollution in query parser via qs (dependency confusion)",
        fixCommand: "npm audit fix express",
      },
      {
        id: "CVE-2024-39381",
        pkgName: "axios",
        pkgType: "npm",
        installedVersion: "1.7.2",
        fixedVersion: "1.7.4",
        severity: "HIGH",
        status: "fix-available",
        title: "Server-Side Request Forgery (SSRF) via absolute URLs in requests",
        fixCommand: "npm audit fix axios",
      },
      {
        id: "CVE-2022-25883",
        pkgName: "semver",
        pkgType: "npm",
        installedVersion: "7.3.8",
        fixedVersion: "7.5.2",
        severity: "HIGH",
        status: "fix-available",
        title: "Regular Expression Denial of Service (ReDoS) in safe range parsing",
        fixCommand: "npm audit fix semver",
      },
      {
        id: "CVE-2023-49133",
        pkgName: "libc6",
        pkgType: "deb",
        installedVersion: "2.36-9",
        fixedVersion: "2.36-9+deb12u4",
        severity: "HIGH",
        status: "fix-available",
        title: "Looney Tunables — buffer overflow in ld.so (local privilege escalation)",
        fixCommand: "apt-get update && apt-get install --only-upgrade libc6",
      },
      {
        id: "CVE-2024-4741",
        pkgName: "openssl",
        pkgType: "deb",
        installedVersion: "3.0.11",
        fixedVersion: "3.0.13-1~deb12u3",
        severity: "MEDIUM",
        status: "fix-available",
        title: "Use-after-free in SSL_free_buffers with async callbacks (DoS)",
        fixCommand: "apt-get update && apt-get install --only-upgrade openssl",
      },
      {
        id: "CVE-2024-4384",
        pkgName: "openssl",
        pkgType: "deb",
        installedVersion: "3.0.11",
        fixedVersion: "3.0.14-1~deb12u2",
        severity: "MEDIUM",
        status: "fix-available",
        title: "DES-based cipher suites weak key handling (downgrade artifact)",
        fixCommand: "apt-get update && apt-get install --only-upgrade openssl",
      },
      {
        id: "CVE-2023-28322",
        pkgName: "curl",
        pkgType: "deb",
        installedVersion: "7.88.1",
        fixedVersion: "7.88.1-10+deb12u5",
        severity: "LOW",
        status: "fix-available",
        title: "Denial of service — resource leak when reuse buffers across requests",
        fixCommand: "apt-get update && apt-get install --only-upgrade curl",
      },
      {
        id: "CVE-2024-3094",
        pkgName: "xz-utils",
        pkgType: "deb",
        installedVersion: "5.4.1",
        fixedVersion: null,
        severity: "UNKNOWN",
        status: "no-fix",
        title: "liblzma backdoor (upstream build chain) — vendor analysis pending",
        fixCommand: "no upstream fix — rebuild from trusted mirror, verify build provenance",
      },
    ],
    sbom: [
      { name: "express", version: "4.18.2", licensor: "MIT" },
      { name: "axios", version: "1.7.2", licensor: "MIT" },
      { name: "semver", version: "7.3.8", licensor: "ISC" },
      { name: "nodejs", version: "20.11.1", licensor: "MIT" },
      { name: "libwebp7", version: "1.2.4", licensor: "BSD-3-Clause" },
      { name: "openssl", version: "3.0.11", licensor: "Apache-2.0" },
    ],
  },
  {
    id: "payments",
    name: "payments-api",
    tag: "latest",
    baseImage: "golang:1.23-alpine (Alpine 3.20)",
    os: "alpine 3.20.2",
    architecture: "amd64",
    size: "89 MB (compressed)",
    digest: "sha256:2d4c1a3b9f0e5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1",
    vulnerabilities: [
      {
        id: "CVE-2023-45288",
        pkgName: "golang.org/x/net",
        pkgType: "gomod",
        installedVersion: "0.17.0",
        fixedVersion: "0.20.0",
        severity: "HIGH",
        status: "fix-available",
        title: "HTTP/2 rapid reset attacks — max concurrent stream exhaustion (DoS)",
        fixCommand: "go get golang.org/x/net@v0.20.0 && go mod tidy",
      },
      {
        id: "CVE-2024-34156",
        pkgName: "golang",
        pkgType: "gomod",
        installedVersion: "1.23.0",
        fixedVersion: "1.23.2",
        severity: "HIGH",
        status: "fix-available",
        title: "Build cache poisoning via malicious module directory traversal",
        fixCommand: "go install golang/go@1.23.2",
      },
      {
        id: "CVE-2024-6104",
        pkgName: "github.com/hashicorp/go-retryablehttp",
        pkgType: "gomod",
        installedVersion: "0.7.5",
        fixedVersion: "0.7.7",
        severity: "HIGH",
        status: "fix-available",
        title: "Log injection — CRLF characters accepted in retryable request URL",
        fixCommand: "go get github.com/hashicorp/go-retryablehttp@v0.7.7",
      },
      {
        id: "CVE-2024-35160",
        pkgName: "github.com/IBM/sarama",
        pkgType: "gomod",
        installedVersion: "1.42.0",
        fixedVersion: "1.42.2",
        severity: "MEDIUM",
        status: "fix-available",
        title: "Excessive CPU burn / loop in compression buffer handling",
        fixCommand: "go get github.com/IBM/sarama@v1.42.2",
      },
      {
        id: "CVE-2024-4741",
        pkgName: "openssl",
        pkgType: "apk",
        installedVersion: "3.1.4",
        fixedVersion: "3.1.6-r0",
        severity: "MEDIUM",
        status: "fix-available",
        title: "Use-after-free in OpenSSL async callbacks (remote DoS)",
        fixCommand: "apk add --upgrade openssl",
      },
      {
        id: "CVE-2023-5364",
        pkgName: "xz-utils",
        pkgType: "apk",
        installedVersion: "5.4.3",
        fixedVersion: "5.4.4-r1",
        severity: "LOW",
        status: "fix-available",
        title: "lzma_lzma2_block_attr size check — out-of-bounds read",
        fixCommand: "apk add --upgrade xz",
      },
      {
        id: "CVE-2024-3094",
        pkgName: "xz-utils",
        pkgType: "apk",
        installedVersion: "5.4.3",
        fixedVersion: null,
        severity: "UNKNOWN",
        status: "no-fix",
        title: "liblzma backdoor (upstream build chain) — vendor analysis pending",
        fixCommand: "no upstream patch yet — pin base image and monitor Alpine advisories",
      },
    ],
    sbom: [
      { name: "golang.org/x/net", version: "0.17.0", licensor: "BSD-3-Clause" },
      { name: "golang.org/x/crypto", version: "0.16.0", licensor: "BSD-3-Clause" },
      { name: "github.com/IBM/sarama", version: "1.42.0", licensor: "MIT" },
      { name: "go-retryablehttp", version: "0.7.5", licensor: "MPL-2.0" },
      { name: "openssl", version: "3.1.4", licensor: "Apache-2.0" },
      { name: "musl", version: "1.2.4", licensor: "MIT" },
    ],
  },
  {
    id: "frontend",
    name: "web-frontend",
    tag: "2.0.0",
    baseImage: "nginx:1.24-alpine (Alpine 3.18)",
    os: "alpine 3.18.6",
    architecture: "amd64",
    size: "47 MB (compressed)",
    digest: "sha256:5a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3",
    vulnerabilities: [
      {
        id: "CVE-2022-41741",
        pkgName: "nginx",
        pkgType: "apk",
        installedVersion: "1.24.0",
        fixedVersion: "1.25.3-r0",
        severity: "HIGH",
        status: "fix-available",
        title: "Memory corruption in ngx_http_mp4_module when parsing mp4 files",
        fixCommand: "apk add --upgrade nginx",
      },
      {
        id: "CVE-2022-41742",
        pkgName: "nginx",
        pkgType: "apk",
        installedVersion: "1.24.0",
        fixedVersion: "1.25.3-r0",
        severity: "HIGH",
        status: "fix-available",
        title: "Out-of-bounds read in ngx_http_mp4_module (2 hints for dangling resolution)",
        fixCommand: "apk add --upgrade nginx",
      },
      {
        id: "CVE-2024-73464",
        pkgName: "nginx",
        pkgType: "apk",
        installedVersion: "1.24.0",
        fixedVersion: "1.25.4-r0",
        severity: "MEDIUM",
        status: "fix-available",
        title: "Single-byte memory overwrite in worker process config reload handling",
        fixCommand: "apk add --upgrade nginx",
      },
      {
        id: "CVE-2023-44487",
        pkgName: "nginx",
        pkgType: "apk",
        installedVersion: "1.24.0",
        fixedVersion: "1.25.3-r0",
        severity: "MEDIUM",
        status: "fix-available",
        title: "HTTP/2 Rapid Reset — unauthenticated connection exhaustion (DoS)",
        fixCommand: "apk add --upgrade nginx",
      },
      {
        id: "CVE-2023-5364",
        pkgName: "xz",
        pkgType: "apk",
        installedVersion: "5.4.3",
        fixedVersion: "5.4.4-r1",
        severity: "LOW",
        status: "fix-available",
        title: "lzma2 block size check — minor heap out-of-bounds read",
        fixCommand: "apk add --upgrade xz",
      },
      {
        id: "CVE-2024-3094",
        pkgName: "xz",
        pkgType: "apk",
        installedVersion: "5.8.6",
        fixedVersion: null,
        severity: "UNKNOWN",
        status: "no-fix",
        title: "Potentially vulnerable library in the supply chain (analysis pending)",
        fixCommand: "no upstream fix — verify build provenance, rebuild from distroless base",
      },
    ],
    sbom: [
      { name: "nginx", version: "1.24.0", licensor: "BSD-2-Clause" },
      { name: "pcre2", version: "10.42", licensor: "BSD-3-Clause" },
      { name: "zlib", version: "1.3", licensor: "Zlib" },
      { name: "openssl", version: "3.1.4", licensor: "Apache-2.0" },
      { name: "musl", version: "1.2.4", licensor: "MIT" },
    ],
  },
  {
    id: "worker",
    name: "report-worker",
    tag: "0.9.1",
    baseImage: "python:3.11-slim (Debian 12)",
    os: "debian 12.0 (bookworm)",
    architecture: "arm64",
    size: "322 MB (compressed)",
    digest: "sha256:9f1e2d3c4b5a6789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    vulnerabilities: [
      {
        id: "CVE-2023-38545",
        pkgName: "curl",
        pkgType: "deb",
        installedVersion: "7.88.1",
        fixedVersion: "7.88.1-10+deb12u5",
        severity: "CRITICAL",
        status: "fix-available",
        title: "SOCKS5 heap buffer overflow — remote code execution via long hostname",
        fixCommand: "apt-get update && apt-get install --only-upgrade curl",
      },
      {
        id: "CVE-2023-4863",
        pkgName: "libwebp6",
        pkgType: "deb",
        installedVersion: "1.2.4-0.2",
        fixedVersion: "1.2.4-0.2+deb12u1",
        severity: "CRITICAL",
        status: "fix-available",
        title: "Heap buffer overflow in WebP decode — silent image processing path",
        fixCommand: "apt-get update && apt-get install --only-upgrade libwebp6",
      },
      {
        id: "CVE-2024-26130",
        pkgName: "cryptography",
        pkgType: "pip",
        installedVersion: "41.0.7",
        fixedVersion: "42.0.2",
        severity: "HIGH",
        status: "fix-available",
        title: "DV-equivalence forgery — exploitable equivocation in OpenSSH key generation",
        fixCommand: "pip install --upgrade cryptography",
      },
      {
        id: "CVE-2024-34519",
        pkgName: "pillow",
        pkgType: "pip",
        installedVersion: "10.0.0",
        fixedVersion: "10.1.0",
        severity: "MEDIUM",
        status: "fix-available",
        title: "Efficient Zoom heap overflow — remote DoS in FiDe layout rendering",
        fixCommand: "pip install --upgrade pillow",
      },
      {
        id: "CVE-2023-32681",
        pkgName: "requests",
        pkgType: "pip",
        installedVersion: "2.29.0",
        fixedVersion: "2.31.0",
        severity: "MEDIUM",
        status: "fix-available",
        title: "CRLF injection in HTTP request construction",
        fixCommand: "pip install --upgrade requests",
      },
      {
        id: "CVE-2024-39689",
        pkgName: "certifi",
        pkgType: "pip",
        installedVersion: "2023.7.22",
        fixedVersion: "2024.7.4",
        severity: "LOW",
        status: "fix-available",
        title: "Root certificate bundle missing for the Pakistan Trust — MITM risk",
        fixCommand: "pip install --upgrade certifi",
      },
      {
        id: "CVE-2024-3094",
        pkgName: "xz-utils",
        pkgType: "deb",
        installedVersion: "8.6.1",
        fixedVersion: null,
        severity: "UNKNOWN",
        status: "no-fix",
        title: "liblzma backdoor — analysis pending on downstream rebuild path",
        fixCommand: "no upstream fix — switch base to debian-slim or distroless",
      },
    ],
    sbom: [
      { name: "python", version: "3.11.7", licensor: "PSF-2.0" },
      { name: "pillow", version: "10.0.0", licensor: "HPND" },
      { name: "cryptography", version: "41.0.7", licensor: "Apache-2.0" },
      { name: "requests", version: "2.29.0", licensor: "Apache-2.0" },
      { name: "certifi", version: "2023.10.22", licensor: "MPL-2.0" },
      { name: "curl", version: "7.88.1", licensor: "MIT" },
    ],
  },
];

const HARDENING_CHECKS: { title: string; detail: string }[] = [
  {
    title: "Use minimal base images",
    detail: "Switch to alpine/distroless to cut the attack surface — fewer installed packages means fewer CVEs to track.",
  },
  {
    title: "Pin digests, not tags",
    detail: "Reference images by `sha256:` digest so an upstream retag can't silently introduce a vulnerable base.",
  },
  {
    title: "Run as non-root",
    detail: "Add `USER 10001` — a container escape as root gives attackers the host in one jump.",
  },
  {
    title: "Scan in CI, gate on severity",
    detail: "Block merges when the image has unfixed CRITICAL/HIGH findings (`trivy image --exit-code 1 --severity CRITICAL`).",
  },
  {
    title: "Sign with Cosign",
    detail: "Attach a signature so the registry only serves images verified by your pipeline.",
  },
  {
    title: "Rebuild on schedule",
    detail: "Weekly scheduled rebuilds with `--pull` absorb fixes, even when no source code changed.",
  },
];

const SEV_RANK: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, UNKNOWN: 4 };

// ==========================================
// HELPERS
// ==========================================

function countBySeverity(vulns: Vulnerability[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
  for (const v of vulns) counts[v.severity] += 1;
  return counts;
}

function riskScore(vulns: Vulnerability[]): number {
  return vulns.reduce((sum, v) => sum + SEVERITY_META[v.severity].weight, 0);
}

function gradeFor(score: number, remaining: number): Grade {
  if (score < 1 && remaining === 0) return "A+";
  if (score < 10) return "A";
  if (score < 25) return "B";
  if (score < 50) return "C";
  if (score < 80) return "D";
  return "F";
}

// ==========================================
// COMPONENT
// ==========================================

export default function DkSecurityScanSection() {
  const [imageIndex, setImageIndex] = useState(0);
  const [scanPhase, setScanPhase] = useState<ScanPhase>("idle");
  const [scanLog, setScanLog] = useState<string[]>([]);
  const [fixesApplied, setFixesApplied] = useState(false);
  const [sbomVisible, setSbomVisible] = useState(false);
  const [copied, setCopied] = useState<"report" | "sbom" | null>(null);
  const [exported, setExported] = useState(false);

  const image = IMAGES[imageIndex];

  // ---- simulated scan: append log lines, then flip to done ----
  useEffect(() => {
    if (scanPhase !== "scanning") return;
    let step = 0;
    setScanLog([]);
    const timer = window.setInterval(() => {
      if (step < SCAN_STEPS.length) {
        setScanLog((prev) => [...prev, SCAN_STEPS[step]]);
        step += 1;
      } else {
        window.clearInterval(timer);
        setScanPhase("done");
        setFixesApplied(false);
        setExported(false);
      }
    }, 600);
    return () => window.clearInterval(timer);
  }, [scanPhase]);

  const startScan = () => {
    setSbomVisible(false);
    setScanPhase("scanning");
  };

  // ---- derived scan results ----
  const results = useMemo(() => {
    const visible = fixesApplied
      ? image.vulnerabilities.filter((v) => v.status === "no-fix")
      : image.vulnerabilities;
    const counts = countBySeverity(visible);
    const total = visible.length;
    const fixable = visible.filter((v) => v.status === "fix-available").length;
    const score = riskScore(visible);
    const grade = gradeFor(score, total);
    const sorted = [...visible].sort(
      (a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || a.id.localeCompare(b.id)
    );
    return { visible, counts, total, fixable, score, grade, sorted };
  }, [image, fixesApplied]);

  const fixedUpgradeCount = fixesApplied
    ? image.vulnerabilities.filter((v) => v.status === "fix-available").length
    : 0;

  const maxCount = Math.max(1, ...SEVERITY_ORDER.map((s) => results.counts[s]));

  // ---- fix recommendations (unique packages, severity-ranked) ----
  const fixCommands = useMemo(() => {
    const seen = new Set<string>();
    const list: { vuln: Vulnerability; command: string }[] = [];
    const ordered = [...image.vulnerabilities].sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
    for (const v of ordered) {
      const key = v.fixCommand;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ vuln: v, command: v.fixCommand });
      }
    }
    return list;
  }, [image]);

  // ---- SBOM generator (CycloneDX 1.4) ----
  const sbomJson = useMemo(() => {
    const component = {
      type: "container",
      name: image.name,
      version: image.tag,
      purl: `pkg:docker/${image.name}@${image.tag}`,
      properties: [
        { name: "trivy.sbom.component", value: "#" },
      ],
    };
    const components = image.sbom.map((e) => ({
      type: "library",
      name: e.name,
      version: e.version,
      licenses: [{ license: { name: e.licensor } }],
      purl: `pkg:generic/${e.name}@${e.version}`,
    }));
    return JSON.stringify(
      {
        bomFormat: "CycloneDX",
        specVersion: "1.4",
        serialNumber: `urn:uuid:3f9a${imageIndex + 1}2b-10c4-4d5e-9f0a-4${imageIndex}8b7c6d5e4f`,
        version: 1,
        metadata: {
          timestamp: new Date().toISOString().slice(0, 19) + "Z",
          tools: [{ vendor: "aquasecurity", name: "trivy", version: "0.55.2" }],
          component,
        },
        components,
      },
      null,
      2
    );
  }, [image, imageIndex]);

  const licenseSummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of image.sbom) counts.set(e.licensor, (counts.get(e.licensor) ?? 0) + 1);
    return Array.from(counts.entries());
  }, [image]);

  // ---- export: full scan report (JSON + markdown + download) ----
  const exportPayload = useMemo(() => {
    const severityCounts = countBySeverity(image.vulnerabilities);
    const payload = {
      schemaVersion: 2,
      artifactName: `${image.name}:${image.tag}`,
      artifactType: "container_image",
      metadata: {
        os: { family: image.os.split(" ")[0], version: image.os.replace(image.os.split(" ")[0] + " ", "") },
        repositories: [{ name: `${image.name}:${image.tag}`, digest: image.digest }],
        trivyVersion: "0.55.2",
      },
      results: [
        {
          Target: `${image.name}/${image.tag}`,
          Class: "os-pkgs",
          Type: image.os.startsWith("alpine") ? "apk" : "deb",
          Vulnerabilities: image.vulnerabilities.map((v) => ({
            VulnerabilityID: v.id,
            PkgName: v.pkgName,
            InstalledVersion: v.installedVersion,
            FixedVersion: v.fixedVersion ?? null,
            Severity: v.severity,
            Status: v.status,
            Title: v.title,
            PrimaryURL: `https://nvd.nist.gov/vuln/detail/${v.id}`,
          })),
        },
      ],
      summary: {
        total: image.vulnerabilities.length,
        severityCounts,
        riskScore: riskScore(image.vulnerabilities),
      },
    };
    const payloadText = JSON.stringify(payload, null, 2);
    return { payloadText, sizeKb: (payloadText.length / 1024).toFixed(1) };
  }, [image]);

  const markdownSummary = useMemo(() => {
    const counts = countBySeverity(image.vulnerabilities);
    const lines = [
      `# Trivy Scan Report — \`${image.name}:${image.tag}\``,
      ``,
      `- Scanner: Trivy 0.55.2`,
      `- OS: ${image.baseImage}`,
      `- Digest: \`${image.digest.slice(0, 19)}…\``,
      `- Total vulnerabilities: ${image.vulnerabilities.length}`,
      `- Severity breakdown: CRITICAL ${counts.CRITICAL} · HIGH ${counts.HIGH} · MEDIUM ${counts.MEDIUM} · LOW ${counts.LOW} · UNKNOWN ${counts.UNKNOWN}`,
    ];
    return lines.join("\n");
  }, [image]);

  const copyText = async (text: string, which: "report" | "sbom") => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard may be unavailable (non-secure context) — fall back silently
    }
    setCopied(which);
    window.setTimeout(() => setCopied(null), 1600);
  };

  const downloadFile = () => {
    const blob = new Blob([exportPayload.payloadText], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trivy-${image.name}-${image.tag}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
  };

  const progressPct = Math.round((scanLog.length / SCAN_STEPS.length) * 100);

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <section id="dk-security-scan" className="scroll-mt-24 space-y-6">
      {/* ============ Section Header ============ */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 card-shadow flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/30 text-xs font-mono font-bold shrink-0">
          DOCKER · CONTAINER SECURITY
        </span>
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Trivy Scanner Simulator — CVE Hunt Inside Your Image
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Pick an image, run a simulated{" "}
            <span className="text-[#38bdf8] font-semibold">trivy image</span> scan, and watch
            the vulnerability report build up: severity counts, per-package fixes, an SBOM
            (CycloneDX) preview, and an exportable JSON report.
          </p>
        </div>
      </div>

      {/* ============ Scanner Console ============ */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 card-shadow space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <div className="text-xs font-mono text-[#38bdf8] uppercase tracking-wider mb-1">
              Scanner Console
            </div>
            <h4 className="text-sm font-bold text-slate-900">Select an Image Target & Scan</h4>
          </div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600">
            <span className={`w-2 h-2 rounded-full ${scanPhase === "scanning" ? "bg-amber-400 animate-pulse" : scanPhase === "done" ? "bg-emerald-500" : "bg-slate-300"}`} />
            {scanPhase === "idle" ? "ready" : scanPhase === "scanning" ? "scanning…" : "complete"}
          </span>
        </div>

        {/* Image picker */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${scanPhase === "scanning" ? "pointer-events-none opacity-50" : ""}`}>
          {IMAGES.map((img, idx) => {
            const active = idx === imageIndex;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => setImageIndex(idx)}
                className={`text-left rounded-xl border p-3 transition-colors ${
                  active
                    ? "border-[#38bdf8] bg-[#38bdf8]/5 ring-1 ring-[#38bdf8]/40"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
                aria-pressed={active}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-mono text-xs font-bold ${active ? "text-[#0ea5e9]" : "text-slate-700"}`}>
                    {img.name}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">:{img.tag}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">{img.baseImage}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Pkgs: {img.vulnerabilities.length} · {img.size}</div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={startScan}
            disabled={scanPhase === "scanning"}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold font-mono transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              scanPhase === "done"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
                : "bg-[#38bdf8] text-white hover:bg-[#0ea5e9] border border-[#38bdf8]"
            }`}
          >
            {scanPhase === "done" ? "↻ Re-scan Image" : scanPhase === "scanning" ? "Scanning…" : "▶ Run Trivy Scan"}
          </button>
          {scanPhase === "done" && (
            <span className="text-[11px] font-mono text-slate-500">
              scan finished in {SCAN_STEPS.length * 0.6}s · 412 package entries checked
            </span>
          )}
        </div>

        {/* Console output */}
        <div className="rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] leading-5 p-4 min-h-[120px]">
          <div className="text-slate-500 mb-2">$ trivy image --format table --severity CRITICAL,HIGH,MEDIUM,LOW,UNKNOWN {image.name}:{image.tag}</div>
          {scanLog.map((line, i) => (
            <div key={i} className="text-sky-300">
              <span className="text-slate-600">{String(i + 1).padStart(2, "0")} </span>
              {line}
            </div>
          ))}
          {scanPhase === "scanning" && (
            <div className="flex items-center gap-2 text-slate-400">
              scanning <span className="inline-block w-1.5 h-3.5 bg-sky-400 animate-pulse" />
            </div>
          )}
          {scanPhase === "idle" && <div className="text-slate-600">awaiting target…</div>}
          {scanPhase === "done" && (
            <div className="text-emerald-400">
              ✓ 412 packages scanned · {results.total} vulnerabilities found
              {fixesApplied ? ` · ${fixedUpgradeCount} remediated` : ""}
            </div>
          )}
        </div>
        {scanPhase === "scanning" && (
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-[#38bdf8] transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>

      {/* ============ Scan Results ============ */}
      {scanPhase === "done" && (
        <>
          {/* Severity summary */}
          <div className="rounded-2xl bg-white border border-slate-200 p-6 card-shadow space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <div className="text-xs font-mono text-[#38bdf8] uppercase tracking-wider mb-1">
                  Scan Findings
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  Vulnerabilities by severity — {image.name}:{image.tag}
                </h4>
              </div>
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold border ${GRADE_META[results.grade].badge}`}>
                Risk grade {results.grade === "A+" ? "A+" : results.grade}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {SEVERITY_ORDER.map((sev) => (
                <div key={sev} className={`rounded-xl border p-3 ${SEVERITY_META[sev].chip}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold tracking-wider">{sev}</span>
                    <span className={`w-2 h-2 rounded-full ${SEVERITY_META[sev].dot}`} />
                  </div>
                  <div className="text-2xl font-bold mt-1">{results.counts[sev]}</div>
                  <div className="text-[10px] font-mono opacity-70">
                    {results.counts[sev] === 0 ? "clean" : sev === "UNKNOWN" ? "unasserted" : "findings"}
                  </div>
                </div>
              ))}
            </div>

            {/* Distribution bars */}
            <div className="space-y-2">
              {SEVERITY_ORDER.map((sev) => (
                <div key={sev} className="flex items-center gap-3">
                  <span className={`w-16 shrink-0 font-mono text-[10px] font-bold tracking-wider ${SEVERITY_META[sev].label}`}>
                    {sev}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full ${SEVERITY_META[sev].bar}`}
                      style={{ width: `${(results.counts[sev] / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-xs text-slate-600">{results.counts[sev]}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 text-[11px] font-mono text-slate-600 pt-2 border-t border-slate-100">
              <span className="px-2 py-1 rounded-md bg-slate-50 border border-slate-200">score {results.score.toFixed(1)}</span>
              <span className="px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700">fixable {results.fixable}</span>
              <span className="px-2 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-600">no upstream fix {results.total - results.fixable}</span>
            </div>

            {/* Apply fixes toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-[#38bdf8]/30 bg-[#38bdf8]/5 p-4">
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-800">Apply recommended fixes (simulation)</div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Remediates every finding with an upstream fixed version — then re-runs the scan in-sim.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFixesApplied((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  fixesApplied ? "bg-[#38bdf8]" : "bg-slate-200"
                }`}
                role="switch"
                aria-checked={fixesApplied}
                aria-label="Apply fixable vulnerability updates"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    fixesApplied ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            {fixesApplied && (
              <div className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                ✓ {fixedUpgradeCount} vulnerability(ies) remediated via pinned fixed versions — remaining {results.total} require base-image rebuild or upstream patches.
              </div>
            )}

            {/* Vulnerability table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    <th className="py-2 pr-3">CVE</th>
                    <th className="py-2 pr-3">Package</th>
                    <th className="py-2 pr-3">Installed</th>
                    <th className="py-2 pr-3">Fixed In</th>
                    <th className="py-2 pr-3">Severity</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2">Description / plan</th>
                  </tr>
                </thead>
                <tbody>
{results.sorted.map((v) => {
                    const rowPkg = `${v.pkgName}${v.pkgType !== "deb" && v.pkgType !== "apk" ? ` (${v.pkgType})` : ""}`;
                    return (
                      <tr key={v.id} className="border-b border-slate-100 align-top">
                        <td className="py-2 pr-3 font-mono text-slate-700 whitespace-nowrap">{v.id}</td>
                        <td className="py-2 pr-3 font-mono text-slate-800 whitespace-nowrap">{rowPkg}</td>
                        <td className="py-2 pr-3 font-mono text-slate-500 whitespace-nowrap">{v.installedVersion}</td>
                        <td className="py-2 pr-3 font-mono text-emerald-700 whitespace-nowrap">{v.fixedVersion ?? "—"}</td>
                        <td className="py-2 pr-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full border font-mono text-[10px] font-bold ${SEVERITY_META[v.severity].chip}`}>
                            {v.severity}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full font-mono text-[10px] ${
                            v.status === "fix-available" ? "bg-emerald-50 text-emerald-700 border border-emerald-300" : "bg-rose-50 text-rose-600 border border-rose-300"
                          }`}>
                            {v.status === "fix-available" ? "fix available" : "no fix"}
                          </span>
                        </td>
                        <td className="py-2 text-slate-600 max-w-[280px]">
                          {v.title}
                          <div className="font-mono text-[10px] text-[#0ea5e9] mt-1 break-all">{v.fixCommand}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ============ Fix Recommendations ============ */}
          <div className="rounded-2xl bg-white border border-slate-200 p-6 card-shadow space-y-4">
            <div className="border-b border-slate-200 pb-4">
              <div className="text-xs font-mono text-[#38bdf8] uppercase tracking-wider mb-1">
                Remediation Plan
              </div>
              <h4 className="text-sm font-bold text-slate-900">Fix Recommendations (deduplicated per package)</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fixCommands.map(({ vuln, command }) => (
                <div key={vuln.id} className={`rounded-xl border p-3 ${SEVERITY_META[vuln.severity].chip}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold text-slate-800">{command}</span>
                    <span className="shrink-0 text-[10px] font-mono font-bold">{vuln.severity}</span>
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-600 font-mono">
                    {vuln.id} · {vuln.pkgName} {vuln.installedVersion}
                    {vuln.fixedVersion ? ` → ${vuln.fixedVersion}` : " (no upstream fix)"}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="text-xs font-mono text-[#38bdf8] uppercase tracking-wider mb-3">
                Hardening Checklist
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {HARDENING_CHECKS.map((h) => (
                  <div key={h.title} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-[#38bdf8]">✓</span>
                      <div>
                        <div className="text-xs font-bold text-slate-800">{h.title}</div>
                        <div className="text-[11px] text-slate-500 mt-1">{h.detail}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ============ SBOM ============ */}
          <div className="rounded-2xl bg-white border border-slate-200 p-6 card-shadow space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <div className="text-xs font-mono text-[#38bdf8] uppercase tracking-wider mb-1">
                  Software Bill of Materials
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  SBOM Preview — {image.name}:{image.tag}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSbomVisible((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-mono font-bold bg-[#38bdf8]/10 text-[#0ea5e9] border border-[#38bdf8]/40 hover:bg-[#38bdf8]/20 transition-colors"
              >
                {sbomVisible ? "Hide SBOM" : "⚙ Generate SBOM"}
              </button>
            </div>

            {sbomVisible && (
              <>
                <div className="flex flex-wrap gap-2 text-[11px] font-mono text-slate-600">
                  <span className="px-2 py-1 rounded-md bg-slate-50 border border-slate-200">{image.sbom.length} components</span>
                  {licenseSummary.map(([license, n]) => (
                    <span key={license} className="px-2 py-1 rounded-md bg-slate-50 border border-slate-200">
                      {license} × {n}
                    </span>
                  ))}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      trivy sbom --format cyclonedx --output bom.json
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(sbomJson, "sbom")}
                      disabled={copied === "sbom"}
                      className="font-mono text-[10px] font-bold text-[#0ea5e9] hover:text-[#0284c7] disabled:text-slate-400"
                    >
                      {copied === "sbom" ? "✓ copied" : "copy"}
                    </button>
                  </div>
                  <pre className="text-[10px] font-mono leading-4 text-slate-700 max-h-[280px] overflow-auto whitespace-pre">
                    {sbomJson}
                  </pre>
                </div>

                <div className="flex flex-wrap gap-2 text-[11px] font-mono text-slate-600">
                  <span className="w-full md:w-auto">licenses found: {licenseSummary.length} · device: container</span>
                </div>
              </>
            )}
          </div>

          {/* ============ Export ============ */}
          <div className="rounded-2xl bg-white border border-slate-200 p-6 card-shadow space-y-4">
            <div className="border-b border-slate-200 pb-4">
              <div className="text-xs font-mono text-[#38bdf8] uppercase tracking-wider mb-1">
                Result Export
              </div>
              <h4 className="text-sm font-bold text-slate-900">Download & Share the Scan Report</h4>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={downloadFile}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold font-mono bg-[#38bdf8] text-white hover:bg-[#0ea5e9] transition-colors"
              >
                ⤓ trivy-report-{image.name}-{image.tag}.json
              </button>
              <button
                type="button"
                onClick={() => copyText(markdownSummary, "report")}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold font-mono border border-slate-200 text-slate-600 hover:border-slate-300 transition-colors"
              >
                {copied === "report" ? "✓ copied to clipboard" : "copy markdown summary"}
              </button>
            </div>

            {exported && (
              <div className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                ✓ Report downloaded — artifact {image.name}:{image.tag} · {exportPayload.sizeKb} KB
              </div>
            )}

            <details className="group">
              <summary className="cursor-pointer text-xs font-mono text-[#0ea5e9] hover:text-[#0284c7] select-none">
                peek at exported payload (truncated preview)
              </summary>
              <pre className="mt-2 rounded-xl border border-slate-200 bg-slate-950 text-[10px] font-mono leading-4 text-sky-200/80 p-4 max-h-[280px] overflow-auto whitespace-pre">
                {exportPayload.payloadText.length > 2600
                  ? exportPayload.payloadText.slice(0, 2600) + "\n… (truncated)"
                  : exportPayload.payloadText}
              </pre>
            </details>
          </div>
        </>
      )}
    </section>
  );
}