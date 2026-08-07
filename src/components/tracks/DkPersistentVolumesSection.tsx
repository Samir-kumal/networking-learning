"use client";

import { useState, useMemo } from "react";

// --- Types & Data Interfaces ---
type StorageClassKey = "ebs-gp2" | "ebs-gp3" | "ebs-io2" | "efs";
type AccessMode = "RWO" | "ROX" | "RWX";
type ReclaimPolicy = "Retain" | "Delete" | "Recycle";
type LifecycleStage = "pending" | "bound" | "deleted" | "reclaimed";

interface StorageClassInfo {
  key: StorageClassKey;
  shortName: string;
  name: string;
  provisioner: string;
  volumeType: string;
  blurb: string;
  tip: string;
  accessModes: AccessMode[];
  volumeBindingMode: "Immediate" | "WaitForFirstConsumer";
  zoneScope: "Single-AZ" | "Multi-AZ";
  pricePerGiB: number;
  iopsNote: string;
  throughputNote: string;
  latencyNote: string;
  durabilityNote: string;
  useCases: string[];
}

const STORAGE_CLASSES: Record<StorageClassKey, StorageClassInfo> = {
  "ebs-gp2": {
    key: "ebs-gp2",
    shortName: "EBS gp2",
    name: "Amazon EBS — gp2 (Legacy)",
    provisioner: "ebs.csi.aws.com",
    volumeType: "gp2 (Legacy General Purpose SSD)",
    blurb:
      "Legacy SSD class: 3 IOPS per GiB (cap 16 000), ms latency, ext4 default. Superseded by gp3 — still found in older clusters.",
    tip: "gp3 is ~20% cheaper with more headroom — resize-and-migrate old gp2 PVs with a CSI clone or snapshot restore.",
    accessModes: ["RWO", "ROX"],
    volumeBindingMode: "Immediate",
    zoneScope: "Single-AZ",
    pricePerGiB: 0.1,
    iopsNote: "3/GiB · ≤16 K",
    throughputNote: "≤ 250 MiB/s",
    latencyNote: "~1–4 ms",
    durabilityNote: "99.8–99.9% (EBS)",
    useCases: ["Legacy stateful workloads", "Boot pumps"],
  },
  "ebs-gp3": {
    key: "ebs-gp3",
    shortName: "EBS gp3",
    name: "Amazon EBS — gp3 (Default)",
    provisioner: "ebs.csi.aws.com",
    volumeType: "gp3 (General Purpose SSD)",
    blurb:
      "Modern default: 3 000 IOPS and 125 MiB/s baseline on every volume regardless of size; scale IOPS/throughput independently.",
    tip: "Baseline performance is size-independent — a 1 GiB gp3 already has 3 000 IOPS; only pay extra IOPS above the baseline.",
    accessModes: ["RWO", "ROX"],
    volumeBindingMode: "WaitForFirstConsumer",
    zoneScope: "Single-AZ",
    pricePerGiB: 0.08,
    iopsNote: "3K + 0.5/GiB · ≤ 16 K",
    throughputNote: "125–1 000 MiB/s",
    latencyNote: "< 1 ms (p99)",
    durabilityNote: "99.9% (EBS)",
    useCases: ["General K8s stateful apps", "Databases up to 16K IOPS", "CI caches"],
  },
  "ebs-io2": {
    key: "ebs-io2",
    shortName: "EBS io2",
    name: "Amazon EBS — io2 (Block Express)",
    provisioner: "ebs.csi.aws.com",
    volumeType: "io2 (Provisioned IOPS SSD)",
    blurb:
      "Provisioned IOPS at 500/GiB (cap 64K–256K with Block Express). Sub-millisecond latency for the biggest database fleets.",
    tip: "io2 costs 2× gp2 — only pick it when gp3's 16K IOPS ceiling is your bottleneck (PostgreSQL high-write, SAP, analytics).",
    accessModes: ["RWO", "ROX"],
    volumeBindingMode: "WaitForFirstConsumer",
    zoneScope: "Single-AZ",
    pricePerGiB: 0.125,
    iopsNote: "Up to 256K IOPS",
    throughputNote: "Up to 4 GiB/s",
    latencyNote: "< 0.5 ms (Block Express)",
    durabilityNote: "99.999% (11 nines)",
    useCases: ["Mission-critical databases", "OLTP / high-write systems", "SAP HANA"],
  },
  efs: {
    key: "efs",
    shortName: "Amazon EFS",
    name: "Amazon EFS (NFS v4.1)",
    provisioner: "efs.csi.aws.com",
    volumeType: "Elastic shared file system",
    blurb:
      "The ONLY AWS storage that serves RWX pods: an elastic, multi-AZ NFSv4.1 filesystem that grows and shrinks on demand.",
    tip: "EFS is a network filesystem — expect NFS consistency semantics and a per-GiB price 3-4× EBS. Perfect for shared assets and content stores.",
    accessModes: ["RWO", "ROX", "RWX"],
    volumeBindingMode: "Immediate",
    zoneScope: "Multi-AZ",
    pricePerGiB: 0.3,
    iopsNote: "Elastic (burst)",
    throughputNote: "Elastic 0–100+ GiB/s",
    latencyNote: "Low ms (mounted NFS)",
    durabilityNote: "99.999999999% (11 nines)",
    useCases: ["RWX shared writers", "ML model repositories", "Home dirs", "CMS content"],
  },
};

const ACCESS_MODES: Record<
  AccessMode,
  { full: string; nodeCount: string; writers: string; example: string; caution: string; ebs: string; efs: string }
> = {
  RWO: {
    full: "ReadWriteOnce",
    nodeCount: "1 node",
    writers: "1 writer (single pod)",
    example: "PostgreSQL, MySQL, Redis — classic single-writer databases.",
    caution: "EBS is zone-bound: the PV attaches only to nodes in the AZ where the volume lives.",
    ebs: "✓",
    efs: "✓ (as container root volume)",
  },
  ROX: {
    full: "ReadOnlyMany",
    nodeCount: "Many nodes",
    writers: "0 writers — all readers",
    example: "Model registry, static assets, shared config bundles.",
    caution: "Read-only mounts mean the kernel blocks writes on every replica.",
    ebs: "✓",
    efs: "✓",
  },
  RWX: {
    full: "ReadWriteMany",
    nodeCount: "Many nodes",
    writers: "Many writers",
    example: "Shared editors, ML training, CMS media, NFS home directories.",
    caution: "EBS can NEVER do RWX — it is block storage attached to one node. Use EFS (or a CSI NFS driver).",
    ebs: "✗",
    efs: "✓",
  },
};

const RECLAIM_POLICIES: Record<
  ReclaimPolicy,
  {
    label: string;
    short: string;
    blurb: string;
    outcome: string;
    risk: "Low" | "Medium" | "High";
    chipClass: string;
    panelClass: string;
  }
> = {
  Retain: {
    label: "Retain",
    short: "Retain",
    blurb:
      "PV survives PVC deletion. It flips to Released and the cloud volume stays intact until an admin manually cleans it up.",
    outcome:
      "PVC deleted → PV phase becomes Released → the EBS volume / EFS file system is untouched. PV is NOT automatically rebound — an admin must delete the PV (and optionally re-market the volume). Data is safe but orphaned without manual cleanup; the cloud storage keeps billing you.",
    risk: "Low",
    chipClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    panelClass: "bg-emerald-50 border-emerald-200",
  },
  Delete: {
    label: "Delete",
    short: "Delete",
    blurb:
      "The PV and the underlying cloud volume are deleted the moment the PVC goes away — the quickest cleanup, with total data loss.",
    outcome:
      "PVC deleted → CSI driver issues a DeleteVolume RPC → EBS volume (or EFS file system) is permanently removed. Cleanest auto-cleanup and the default reclaimPolicy for aws-ebs/gp3/efs — use backups or snapshots if you value the data.",
    risk: "High",
    chipClass: "bg-sky-50 text-sky-700 border-sky-200",
    panelClass: "bg-sky-50 border-sky-200",
  },
  Recycle: {
    label: "Recycle",
    short: "Recycle",
    blurb:
      "Deprecated legacy mode: a scrubber pod wipes the volume (rm -rf /vol/*) and the PV returns to the Available pool.",
    outcome:
      "PVC deleted → PV briefly becomes Released → a recycle pod scrubs its contents → PV is available to bind again. Removed from Kubernetes in 1.20-era deprecation; never use it on production — prefer Retain (safe) or Delete (clean) with a backup strategy.",
    risk: "Medium",
    chipClass: "bg-amber-50 text-amber-700 border-amber-200",
    panelClass: "bg-amber-50 border-amber-200",
  },
};

interface SnapshotEntry {
  id: number;
  name: string;
  sizeGiB: number;
  status: "Creating" | "Completed" | "Deleted";
  createdAt: string;
  scheduled: boolean;
}

const ACTIVE_SC_KEYS: StorageClassKey[] = ["ebs-gp2", "ebs-gp3", "ebs-io2", "efs"];

function formatCapacity(gib: number): string {
  return gib >= 1024 ? `${(gib / 1024).toFixed(1)} TiB` : `${gib} GiB`;
}

export default function DkPersistentVolumesSection() {
  // ===== Module 1 — Lifecycle visualizer =====
  const [stage, setStage] = useState<LifecycleStage>("pending");
  const [eventLog, setEventLog] = useState<string[]>([]);

  // ===== Module 2 — StorageClass selector =====
  const [selectedSC, setSelectedSC] = useState<StorageClassKey>("ebs-gp3");

  // ===== Module 3 — Access mode calculator =====
  const [accessMode, setAccessMode] = useState<AccessMode>("RWO");

  // ===== Module 4 — Reclaim policy (shared by 1 & 4) =====
  const [reclaimPolicy, setReclaimPolicy] = useState<ReclaimPolicy>("Retain");

  // ===== Module 5 — Capacity planner =====
  const [capacityGiB, setCapacityGiB] = useState(100);
  const [claimCount, setClaimCount] = useState(3);

  // ===== Module 6 — Snapshot simulator =====
  const [snapshots, setSnapshots] = useState<SnapshotEntry[]>([]);
  const [snapCounter, setSnapCounter] = useState(1);
  const [scheduledSnap, setScheduledSnap] = useState(false);
  const [restores, setRestores] = useState<string[]>([]);

  const sc = STORAGE_CLASSES[selectedSC];

  // ----- Module 1 derived state -----
  const pvcPhase =
    stage === "pending" ? "Pending" : stage === "bound" ? "Bound" : "Deleted";

  const pvPhase = (() => {
    if (stage === "pending") return "Available";
    if (stage === "bound") return "Bound";
    if (stage === "deleted") return "Released";
    if (reclaimPolicy === "Delete") return "Deleted";
    if (reclaimPolicy === "Recycle") return "Available (scrubbed)";
    return "Released (data retained)";
  })();

  const logEvent = (line: string) => {
    setEventLog((prev) => {
      const next = [`${new Date().toLocaleTimeString()} — ${line}`, ...prev];
      return next.slice(0, 8);
    });
  };

  const handleProvision = () => {
    setStage("bound");
    logEvent(`StorageClass "${sc.shortName}" created PV ${sc.provisioner} → PV Available`);
    logEvent('PVC "data-claims" bound to PV "pv-gp3-c8f2" — PV Bound');
  };

  const handleDeletePvc = () => {
    setStage("deleted");
    logEvent('PVC "data-claim" deleted → PV Released, waiting on reclaim policy');
    logEvent(
      `Reclaim policy "${RECLAIM_POLICIES[reclaimPolicy].label}" will decide the fate of the ${selectedSC === "efs" ? "EFS file system" : "EBS volume"}`
    );
  };

  const handleReclaim = () => {
    setStage("reclaimed");
    if (reclaimPolicy === "Retain") {
      logEvent("PV stays Released — admin must kubectl delete pv to free the handle (data persists)");
    } else if (reclaimPolicy === "Delete") {
      logEvent("PV deleted → CSI DeleteVolume RPC → cloud volume destroyed (data gone)");
    } else {
      logEvent("Recycle scrubber ran `rm -rf /vol/*` → PV returned to Available pool");
    }
  };

  const handleResetLifecycle = () => {
    setStage("pending");
    logEvent("Simulation reset — new PVC created, storage pending");
  };

  const lifecycleChips: { label: string; active: boolean }[] = [
    { label: "PVC Created", active: true },
    { label: "Provisioning", active: stage === "bound" },
    { label: "PV Bound", active: stage === "bound" },
    { label: "Pod Mount", active: stage === "bound" },
    { label: "PVC Deleted", active: stage === "deleted" || stage === "reclaimed" },
    {
      label:
        stage === "reclaimed"
          ? reclaimPolicy === "Delete"
            ? "PV Deleted"
            : reclaimPolicy === "Recycle"
              ? "PV Scrubbed"
              : "PV Released"
          : "Reclaim…",
      active: stage === "reclaimed",
    },
  ];

  // ----- Module 5 derived -----
  const totalGiB = capacityGiB * claimCount;
  const monthlyCost = totalGiB * sc.pricePerGiB;

  const plannerRows = useMemo(
    () =>
      ACTIVE_SC_KEYS.map((key) => {
        const cls = STORAGE_CLASSES[key];
        let iops: string;
        let throughput: string;
        if (key === "ebs-gp2") {
          iops = `${Math.min(16000, capacityGiB * 3).toLocaleString("en-US")} IOPS`;
          throughput = "≤ 250 MiB/s";
        } else if (key === "ebs-gp3") {
          iops = `${Math.min(16000, Math.round(capacityGiB * 0.5) + 3000).toLocaleString("en-US")} IOPS`;
          throughput = "125 MiB/s";
        } else if (key === "ebs-io2") {
          iops = `${Math.min(64000, capacityGiB * 500).toLocaleString("en-US")} IOPS`;
          throughput = "up to 4 GiB/s";
        } else {
          iops = "10+ GiB/s burst";
          throughput = "elastic";
        }
        return { ...cls, iops, throughput };
      }),
    [capacityGiB]
  );

  // ----- Module 6 derived -----
  const handleCreateSnapshot = (scheduled: boolean) => {
    const id = snapCounter;
    setSnapCounter(id + 1);
    const entry: SnapshotEntry = {
      id,
      name: scheduled ? `daily-snap-${id}` : `snap-${id}`,
      sizeGiB: totalGiB,
      status: "Creating",
      createdAt: new Date().toLocaleTimeString(),
      scheduled,
    };
    setSnapshots((prev) => [entry, ...prev]);
    window.setTimeout(() => {
      setSnapshots((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: "Completed" } : s))
      );
    }, 1600);
  };

  const handleRestoreLatest = () => {
    const latest = snapshots.find((s) => s.status === "Completed");
    if (!latest) return;
    const name = `restore-${latest.name}`;
    setRestores((prev) => [name, ...prev].slice(0, 5));
    logEvent(`Restored PVC "${name}" from snapshot "${latest.name}" via dataSource`);
  };

  const handleDeleteSnapshot = (id: number) => {
    setSnapshots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "Deleted" } : s))
    );
    window.setTimeout(() => {
      setSnapshots((prev) => prev.filter((s) => s.id !== id));
    }, 2200);
  };

  // ----- Generated manifests -----
  const scClassName = sc.key === "efs" ? "efs-csi" : `ebs-${sc.key.replace("ebs-", "")}`;
  const scClass = STORAGE_CLASSES[selectedSC];

  const storageClassYaml = useMemo(() => {
    let paramsBlock: string;
    if (selectedSC === "ebs-gp2") paramsBlock = "  type: gp2\n  fsType: ext4\n";
    else if (selectedSC === "ebs-gp3") paramsBlock = "  type: gp3\n  fsType: ext4\n  iops: \"3000\"\n  throughput: \"125\"\n";
    else if (selectedSC === "ebs-io2") paramsBlock = "  type: io2\n  fsType: xfs\n  iops: \"1000\"\n";
    else paramsBlock = "  provisioningMode: efs-apiserver\n  typeInTransit: \"true\"\n";
    return `apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ${scClassName}
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ${scClass.provisioner}
reclaimPolicy: ${RECLAIM_POLICIES[reclaimPolicy].short}
volumeBindingMode: ${scClass.volumeBindingMode}
allowVolumeExpansion: true
parameters:
${paramsBlock}`;
  }, [selectedSC, reclaimPolicy]);

  const pvcYaml = useMemo(() => {
    const mode = ACCESS_MODES[accessMode];
    return `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: apps-${accessMode.toLowerCase()}
  namespace: app-prod
spec:
  accessModes:
    - ${accessMode}
  storageClassName: ${scClassName}
  resources:
    requests:
      storage: ${capacityGiB}Gi
---
${mode.full} (${accessMode}) — ${mode.example}`;
  }, [accessMode, capacityGiB]);

  const snapshotYaml = useMemo(() => {
    const latest = snapshots.find((s) => s.status !== "Deleted");
    if (!latest) {
      return "# No snapshots yet — press \"Take Snapshot\" to simulate an AWS EBS snapshot\n# (EFS snapshots behave the same via efs-backup).";
    }
    return `# 1) VolumeSnapshot CR — points at the persistent volume claim
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: ${latest.name}
spec:
  volumeSnapshotClassName: ${selectedSC === "efs" ? "efs-backup" : "ebs-backup"}
  source:
    persistentVolumeClaimName: apps-rwo
---
# 2) Restore a NEW PVC from that snapshot — no data on the original
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: restore-${latest.name}
spec:
  dataSource:
    apiGroup: snapshot.storage.k8s.io
    kind: VolumeSnapshot
    name: ${latest.name}
  accessModes: [ReadWriteOnce]
  storageClassName: ${scClassName}
  resources:
    requests:
      storage: ${formatCapacity(latest.sizeGiB)}`;
  }, [snapshots, selectedSC]);

  const accessModeSupported = scClass.accessModes.includes(accessMode);

  return (
    <div id="dk-persistent-volumes" className="space-y-10 pb-8">
      {/* ===================== HERO BANNER ===================== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 p-6 sm:p-10 shadow-2xl border border-sky-300/40">
        <div className="absolute -right-10 -top-10 h-72 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-10 h-60 w-60 rounded-full bg-cyan-300/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-mono text-white">
            <span className="h-2 w-2 animate-ping rounded-full bg-cyan-300" />
            Track 5 • Cloud-Native Storage on Kubernetes
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Persistent Volumes &amp; State on EKS
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-sky-100 sm:text-base">
            Interactive lab for the PV/PVC contract: watch volumes travel from Pending to Bound
            (and beyond), compare EBS and EFS StorageClasses, check which access mode fits your
            workload, choose a reclaim strategy, right-size capacity — then snapshot and restore.
          </p>
        </div>
      </div>

      {/* ===================== MODULE 1 — LIFECYCLE ===================== */}
      <section className="rounded-2xl border border-sky-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="flex flex-col gap-4 border-b border-sky-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-1 text-xs font-mono uppercase tracking-wider text-sky-600">
              Module 1 • PV/PVC Lifecycle Visualizer
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Pending → Bound → Deleted → (what happened to my data?)
            </h2>
          </div>
          <button
            onClick={handleResetLifecycle}
            className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-mono text-sky-700 transition-colors hover:bg-sky-100"
          >
            ↺ Reset Simulation
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* left: pipeline + controls */}
          <div className="lg:col-span-7">
            <div className="flex flex-wrap items-center gap-2">
              {lifecycleChips.map((step, i) => (
                <FragmentSwitcher key={i} label={step.label} active={step.active} last={i === lifecycleChips.length - 1} />
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 card-shadow">
                <div className="text-[11px] font-mono text-slate-500">PVC Phase</div>
                <div
                  className={`mt-1 text-xl font-extrabold ${
                    stage === "bound" ? "text-emerald-600" : stage === "pending" ? "text-amber-500" : "text-rose-500"
                  }`}
                >
                  {pvcPhase}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 card-shadow">
                <div className="text-[11px] font-mono text-slate-500">PV Phase</div>
                <div
                  className={`mt-1 text-xl font-extrabold ${
                    pvPhase.includes("Deleted")
                      ? "text-rose-500"
                      : pvPhase.includes("Available")
                        ? "text-emerald-600"
                        : "text-sky-600"
                  }`}
                >
                  {pvPhase.split(" ")[0]}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 card-shadow">
                <div className="text-[11px] font-mono text-slate-500">Storage</div>
                <div className="mt-1 text-xl font-extrabold text-slate-900">{sc.shortName}</div>
                <div className="text-[10px] font-mono text-slate-400">{sc.volumeType}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 card-shadow">
                <div className="text-[11px] font-mono text-slate-500">Reclaim</div>
                <div className="mt-1 text-xl font-extrabold text-indigo-600">{RECLAIM_POLICIES[reclaimPolicy].label}</div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={handleProvision}
                disabled={stage !== "pending"}
                className={`rounded-lg px-4 py-2 text-xs font-mono font-bold shadow-lg transition-colors ${
                  stage === "pending"
                    ? "bg-sky-600 text-white shadow-sky-200 hover:bg-sky-500"
                    : "cursor-not-allowed bg-slate-100 text-slate-300"
                }`}
              >
                ⚡ Provision &amp; Bind
              </button>
              <button
                onClick={handleDeletePvc}
                disabled={stage !== "bound"}
                className={`rounded-lg px-4 py-2 text-xs font-mono font-bold shadow-lg transition-colors ${
                  stage === "bound"
                    ? "bg-rose-500 text-white shadow-rose-200 hover:bg-rose-400"
                    : "cursor-not-allowed bg-slate-100 text-slate-300"
                }`}
              >
                🗑 Delete PVC
              </button>
              <button
                onClick={handleReclaim}
                disabled={stage !== "deleted"}
                className={`rounded-lg px-4 py-2 text-xs font-mono font-bold shadow-lg transition-colors ${
                  stage === "deleted"
                    ? "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-500"
                    : "cursor-not-allowed bg-slate-100 text-slate-300"
                }`}
              >
                🔁 Run Reclaim ({RECLAIM_POLICIES[reclaimPolicy].short})
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 text-[11px] font-mono uppercase tracking-wider text-slate-500">
                kube-controller-manager event log
              </div>
              {eventLog.length === 0 ? (
                <div className="text-xs font-mono text-slate-400">— awaiting simulation steps —</div>
              ) : (
                <ul className="space-y-1">
                  {eventLog.map((line, i) => (
                    <li key={i} className="text-[11px] font-mono leading-relaxed text-slate-600">
                      {line}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* right: explainer */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
              <div className="mb-2 text-xs font-mono uppercase tracking-wider text-sky-700">what you are watching</div>
              <ul className="space-y-2 text-xs leading-relaxed text-slate-600">
                <li>• <b>PVC</b> = a claim; <b>PV</b> = the actual volume (EBS volume or EFS file system).</li>
                <li>• The StorageClass provisioner ({sc.provisioner}) creates PVs on demand — dynamic provisioning.</li>
                <li>• With <b>WaitForFirstConsumer</b> (gp3 / io2), the PV is only created after a Pod is scheduled — so the EBS volume lands in the node&apos;s AZ.</li>
                <li>• Deleting the PVC detaches the PV: phase → <b>Released</b>. The reclaim policy picks what happens to the bytes.</li>
                <li>• EBS PVs attach to exactly one node; EFS PVs are mounted over NFS from any node.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-slate-600">
              <span className="font-mono font-bold text-amber-700">⚠ Gotcha:</span> a <b>Released</b> PV is not automatically reusable —
              Retain leaves the bytes untouched but detached, Delete removes them permanently, Recycle wipes and re-offers
              them. That&apos;s why cloud providers default to <code className="font-mono">Delete</code>.
            </div>
          </div>
        </div>
      </section>

      {/* ===================== MODULE 2 — STORAGECLASS ===================== */}
      <section className="rounded-2xl border border-blue-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="border-b border-blue-200 pb-5">
          <div className="mb-1 text-xs font-mono uppercase tracking-wider text-blue-600">
            Module 2 • StorageClass Provisioner Selector
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">EBS vs EFS — choose your provisioner</h2>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ACTIVE_SC_KEYS.map((key) => {
            const cls = STORAGE_CLASSES[key];
            const active = selectedSC === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedSC(key)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  active
                    ? "border-blue-400 bg-blue-50 ring-2 ring-blue-200"
                    : "border-slate-200 bg-white hover:border-blue-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">{cls.name}</span>
                  {active && <span className="text-xs font-bold text-blue-600">✓</span>}
                </div>
                <div className="mt-1 font-mono text-[11px] text-blue-600">{cls.provisioner}</div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{cls.blurb}</p>
                <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 border-t border-slate-200 pt-2 text-[10px] font-mono text-slate-500">
                  <span>Mode: {cls.volumeBindingMode}</span>
                  <span>{cls.zoneScope}</span>
                  <span>${cls.pricePerGiB}/GiB-mo</span>
                  <span>Modes: {cls.accessModes.join(", ")}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 bg-blue-50/60 px-4 py-2.5">
                <span className="text-xs font-mono font-bold text-blue-700">{sc.name} — live details</span>
                <span className="text-[10px] font-mono text-slate-400">dynamic provisioning</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-xs">
                <div>
                  <div className="font-mono text-[10px] uppercase text-slate-400">IOPS</div>
                  <div className="mt-0.5 font-medium text-slate-800">{sc.iopsNote}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase text-slate-400">Throughput</div>
                  <div className="mt-0.5 font-medium text-slate-800">{sc.throughputNote}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase text-slate-400">Latency</div>
                  <div className="mt-0.5 font-medium text-slate-800">{sc.latencyNote}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase text-slate-400">Durability</div>
                  <div className="mt-0.5 font-medium text-slate-800">{sc.durabilityNote}</div>
                </div>
                <div className="col-span-2">
                  <div className="font-mono text-[10px] uppercase text-slate-400">Best for</div>
                  <div className="mt-0.5 font-medium text-slate-800">{sc.useCases.join(" · ")}</div>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">{sc.tip}</p>
          </div>

          <div className="lg:col-span-5">
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-[11px] leading-relaxed whitespace-pre text-slate-700">
              {storageClassYaml}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              <code className="font-mono">reclaimPolicy</code> follows Module 4&apos;s selector — a class is created once; edit means recreate.
            </p>
          </div>
        </div>
      </section>

      {/* ===================== MODULE 3 — ACCESS MODES ===================== */}
      <section className="rounded-2xl border border-sky-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="border-b border-sky-200 pb-5">
          <div className="mb-1 text-xs font-mono uppercase tracking-wider text-sky-600">
            Module 3 • Access Mode Calculator
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">RWO / ROX / RWX — how many pods can touch it?</h2>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-5">
            <div className="grid grid-cols-3 gap-2">
              {(["RWO", "ROX", "RWX"] as AccessMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setAccessMode(m)}
                  className={`rounded-xl border py-3 text-center text-sm font-bold transition-all ${
                    accessMode === m
                      ? "border-sky-600 bg-sky-600 text-white shadow-lg shadow-sky-200"
                      : "border-slate-200 bg-white text-slate-500 hover:border-sky-300"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 card-shadow">
              <div className="text-xs font-bold text-slate-900">
                {ACCESS_MODES[accessMode].full} ({accessMode})
              </div>
              <div className="text-xs leading-relaxed text-slate-500">{ACCESS_MODES[accessMode].example}</div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="rounded-lg bg-sky-50 px-2 py-1.5 text-sky-700">Nodes: {ACCESS_MODES[accessMode].nodeCount}</div>
                <div className="rounded-lg bg-blue-50 px-2 py-1.5 text-blue-700">Writers: {ACCESS_MODES[accessMode].writers}</div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] leading-relaxed text-amber-700">
                {ACCESS_MODES[accessMode].caution}
              </div>
            </div>

            <div
              className={`rounded-xl border p-4 font-mono text-xs ${
                accessModeSupported
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {accessModeSupported
                ? `✓ ${sc.shortName} supports ${accessMode} — pods can attach legally.`
                : `✗ ${sc.shortName} cannot serve ${accessMode}. EBS is block storage attached to one node — switch to EFS (RWX over NFSv4.1) or stay on RWO.`}
            </div>
          </div>

          <div className="space-y-4 lg:col-span-7">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 text-[11px] font-mono uppercase tracking-wider text-slate-500">
                cluster view — {ACCESS_MODES[accessMode].nodeCount}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((node) => {
                  const canMount = accessMode === "RWO" ? node === 1 : true;
                  return (
                    <div key={node} className={`rounded-xl border p-3 ${canMount ? "border-sky-200 bg-white" : "border-slate-200 bg-slate-100"}`}>
                      <div className="font-mono text-[10px] uppercase text-slate-400">Node {node}</div>
                      <div className="mt-2 space-y-1.5">
                        {[1, 2].map((p) => (
                          <div
                            key={p}
                            className={`h-4 rounded ${
                              canMount
                                ? p === 2 && accessMode === "RWO"
                                  ? "bg-rose-300"
                                  : "bg-sky-500/80"
                                : "bg-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="mt-2 text-[10px] font-mono">
                        {canMount ? (
                          accessMode === "RWO" ? (
                            node === 1 ? (
                              <span className="text-emerald-600">volume attached</span>
                            ) : (
                              <span className="text-rose-500">cannot attach</span>
                            )
                          ) : (
                            <span className="text-sky-600">{accessMode === "ROX" ? "read-only" : "read-write"}</span>
                          )
                        ) : (
                          <span className="text-slate-400">mount blocked</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-sky-50 font-mono text-[10px] uppercase text-sky-700">
                    <th className="px-3 py-2">Mode</th>
                    <th className="px-3 py-2">Full name</th>
                    <th className="px-3 py-2">Nodes</th>
                    <th className="px-3 py-2">Writers</th>
                    <th className="px-3 py-2">EBS</th>
                    <th className="px-3 py-2">EFS</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-slate-600">
                  {(["RWO", "ROX", "RWX"] as AccessMode[]).map((m) => (
                    <tr key={m} className={`border-t border-slate-100 ${accessMode === m ? "bg-sky-50/60" : ""}`}>
                      <td className="px-3 py-2 font-bold text-slate-800">{m}</td>
                      <td className="px-3 py-2">{ACCESS_MODES[m].full}</td>
                      <td className="px-3 py-2">{ACCESS_MODES[m].nodeCount}</td>
                      <td className="px-3 py-2">{ACCESS_MODES[m].writers}</td>
                      <td className={`px-3 py-2 font-bold ${ACCESS_MODES[m].ebs === "✓" ? "text-emerald-600" : "text-rose-500"}`}>{ACCESS_MODES[m].ebs}</td>
                      <td className={`px-3 py-2 font-bold ${ACCESS_MODES[m].efs === "✓" ? "text-emerald-600" : "text-rose-500"}`}>{ACCESS_MODES[m].efs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white card-shadow">
              <div className="border-b border-slate-200 px-4 py-2.5 font-mono text-[11px] text-slate-500">
                rendered PVC manifest
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-[11px] leading-relaxed whitespace-pre text-slate-700">{pvcYaml}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== MODULE 4 — RECLAIM POLICY ===================== */}
      <section className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="border-b border-indigo-200 pb-5">
          <div className="mb-1 text-xs font-mono uppercase tracking-wider text-indigo-600">
            Module 4 • Reclaim Policy Selector
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">The fate of your bytes when the PVC is deleted</h2>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {(Object.keys(RECLAIM_POLICIES) as ReclaimPolicy[]).map((p) => {
            const pol = RECLAIM_POLICIES[p];
            const active = reclaimPolicy === p;
            return (
              <button
                key={p}
                onClick={() => setReclaimPolicy(p)}
                className={`rounded-xl border p-5 text-left transition-all ${
                  active
                    ? "border-indigo-400 bg-white shadow-lg ring-2 ring-indigo-200"
                    : "border-slate-200 bg-white hover:border-indigo-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-extrabold text-slate-900">{pol.label}</span>
                  <span className={`rounded border px-2 py-0.5 font-mono text-[10px] ${pol.chipClass}`}>{pol.risk} risk</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{pol.blurb}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className={`rounded-xl border p-4 ${RECLAIM_POLICIES[reclaimPolicy].panelClass}`}>
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                when PVC is deleted → {reclaimPolicy} outcome
              </div>
              <p className="text-xs leading-relaxed text-slate-700">{RECLAIM_POLICIES[reclaimPolicy].outcome}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 font-mono text-[11px] text-slate-500">
              <span className="rounded bg-slate-100 px-2 py-1">PV phase → {pvPhase}</span>
              <span className="rounded bg-slate-100 px-2 py-1">PVC phase → {pvcPhase}</span>
              <span className="rounded bg-slate-100 px-2 py-1">storage → {sc.shortName}</span>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
              Tip: <code className="font-mono">reclaimPolicy</code> is fixed at StorageClass creation — choose Delete for auto-cleanup or
              Retain for insurance policies, and pair either with scheduled snapshots (Module 6).
            </p>
          </div>
          <div className="lg:col-span-5">
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-[11px] leading-relaxed whitespace-pre text-slate-700">
              {storageClassYaml}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== MODULE 5 — CAPACITY PLANNER ===================== */}
      <section className="rounded-2xl border border-blue-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="border-b border-blue-200 pb-5">
          <div className="mb-1 text-xs font-mono uppercase tracking-wider text-blue-600">Module 5 • Capacity Planner</div>
          <h2 className="text-2xl font-extrabold text-slate-900">Right-size the cluster storage budget</h2>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5">
            <div>
              <div className="mb-2 flex justify-between text-xs font-mono text-slate-500">
                <span>Volume size per PVC: <b className="text-blue-600">{formatCapacity(capacityGiB)}</b></span>
                <span>{capacityGiB} GiB</span>
              </div>
              <input
                type="range"
                min={10}
                max={2000}
                step={10}
                value={capacityGiB}
                onChange={(e) => setCapacityGiB(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-400">
                <span>10 GiB</span>
                <span>2 000 GiB</span>
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-mono text-slate-500">
                PVCs in the cluster: <b className="text-blue-600">{claimCount}</b>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={claimCount}
                onChange={(e) => setClaimCount(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-400">
                <span>1</span>
                <span>20</span>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50 p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-sky-700">Total provisioned</span>
                <span className="text-2xl font-extrabold text-sky-800">{formatCapacity(totalGiB)}</span>
              </div>
              <div>
                <div className="mb-1 flex justify-between font-mono text-[11px] text-sky-600">
                  <span>Monthly cost ({sc.shortName})</span>
                  <span className="font-bold">${monthlyCost.toFixed(2)}/mo</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full border border-sky-200 bg-white">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600 transition-all"
                    style={{ width: `${Math.min(100, (totalGiB / 5120) * 100)}%` }}
                  />
                </div>
                <div className="mt-1 font-mono text-[10px] text-slate-400">
                  {totalGiB >= 5120 ? "⚠ over 5TiB budget" : `≈ ${Math.round((totalGiB / 5120) * 100)}% of 5 TiB budget`}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-7">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-blue-50 font-mono text-[10px] uppercase text-blue-700">
                    <th className="px-3 py-2">Class</th>
                    <th className="px-3 py-2">$/GiB</th>
                    <th className="px-3 py-2">Cost for {formatCapacity(totalGiB)}</th>
                    <th className="px-3 py-2">IOPS est.</th>
                    <th className="px-3 py-2">Throughput</th>
                    <th className="px-3 py-2">Zones</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-slate-600">
                  {plannerRows.map((row) => (
                    <tr key={row.key} className={`border-t border-slate-100 ${selectedSC === row.key ? "bg-sky-50/60" : ""}`}>
                      <td className="px-3 py-2 font-bold text-slate-800">{row.shortName}</td>
                      <td className="px-3 py-2">${row.pricePerGiB}</td>
                      <td className="px-3 py-2 font-bold text-blue-600">${(totalGiB * row.pricePerGiB).toFixed(2)}</td>
                      <td className="px-3 py-2">{row.iops}</td>
                      <td className="px-3 py-2">{row.throughput}</td>
                      <td className="px-3 py-2">{row.zoneScope}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 card-shadow">
                <div className="font-mono text-[11px] text-slate-500">Yearly estimate</div>
                <div className="mt-1 text-lg font-extrabold text-indigo-600">${(monthlyCost * 12).toFixed(0)}</div>
                <div className="mt-0.5 font-mono text-[10px] text-slate-400">12 × monthly config</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 card-shadow">
                <div className="font-mono text-[11px] text-slate-500">Per-PVC unit</div>
                <div className="mt-1 text-lg font-extrabold text-sky-600">{formatCapacity(capacityGiB)}</div>
                <div className="mt-0.5 font-mono text-[10px] text-slate-400">× {claimCount} claims</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 card-shadow">
                <div className="font-mono text-[11px] text-slate-500">Snapshot margin</div>
                <div className="mt-1 text-lg font-extrabold text-emerald-600">{formatCapacity(Math.round(totalGiB * 0.15))}</div>
                <div className="mt-0.5 font-mono text-[10px] text-slate-400">+15% for backups</div>
              </div>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-400">
              IOPS estimates are per volume of the selected size (gp2: 3×GiB · gp3: 3 000 + 0.5×GiB · io2: 500×GiB) — EFS scales
              elastically regardless of reported capacity.
            </p>
          </div>
        </div>
      </section>

      {/* ===================== MODULE 6 — SNAPSHOT SIMULATOR ===================== */}
      <section className="rounded-2xl border border-cyan-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="flex flex-col gap-4 border-b border-cyan-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-1 text-xs font-mono uppercase tracking-wider text-cyan-600">
              Module 6 • Volume Snapshot Simulator
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Point-in-time recovery in three clicks</h2>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 font-mono text-xs text-cyan-700">
            snapshot class: {selectedSC === "efs" ? "efs-backup" : "ebs-backup"}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-5">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleCreateSnapshot(false)}
                className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-mono font-bold text-white shadow-lg shadow-sky-200 transition-colors hover:bg-sky-500"
              >
                📸 Take Snapshot
              </button>
              <button
                onClick={handleRestoreLatest}
                disabled={!snapshots.some((s) => s.status === "Completed")}
                className={`rounded-lg px-4 py-2 text-xs font-mono font-bold transition-colors ${
                  snapshots.some((s) => s.status === "Completed")
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-500"
                    : "cursor-not-allowed bg-slate-100 text-slate-300"
                }`}
              >
                ♻ Restore Latest
              </button>
              <button
                onClick={() => setScheduledSnap(!scheduledSnap)}
                className={`rounded-lg border px-4 py-2 text-xs font-mono font-bold transition-colors ${
                  scheduledSnap
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-cyan-300 bg-white text-cyan-700 hover:bg-cyan-50"
                }`}
              >
                {scheduledSnap ? "⏱ daily 03:00 UTC (on)" : "⏹ enable schedule"}
              </button>
            </div>

            {scheduledSnap && (
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-xs leading-relaxed text-cyan-800">
                <b>Backup strategy on:</b> a CronJob writes a daily VolumeSnapshot via the VolumeSnapshotClass,
                keeps 10 generations, and restores one per week into a fresh PVC for DR validation.
              </div>
            )}

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white card-shadow">
              <div className="border-b border-slate-200 px-4 py-2.5 font-mono text-[11px] text-slate-500">
                snapshot &amp; restore manifests
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-[11px] leading-relaxed whitespace-pre text-slate-700">
                {snapshotYaml}
              </pre>
            </div>

            {restores.length > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-700">
                <b>Restores:</b>
                <ul className="mt-1 list-inside list-disc font-mono text-[11px]">
                  {restores.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="lg:col-span-7">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="border-b border-slate-200 bg-cyan-50/50 px-4 py-2.5 font-mono text-[11px] text-cyan-700">
                snapshot registry
              </div>
              {snapshots.length === 0 ? (
                <div className="p-8 text-center font-mono text-xs text-slate-400">
                  No snapshots yet — press 📸 Take Snapshot (an EBS snapshot is saved to S3 within ~1 s for this sized volume).
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 font-mono text-[10px] uppercase text-slate-500">
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Size</th>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshots.map((s) => (
                      <tr key={s.id} className={`border-t border-slate-100 ${s.status === "Deleted" ? "opacity-40" : ""}`}>
                        <td className="px-3 py-2 font-mono text-slate-800">{s.name}</td>
                        <td className="px-3 py-2 font-mono text-slate-500">{formatCapacity(s.sizeGiB)}</td>
                        <td className="px-3 py-2 font-mono text-slate-500">{s.createdAt}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded border px-2 py-0.5 font-mono text-[10px] ${
                              s.status === "Completed"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                                : s.status === "Creating"
                                  ? "border-amber-200 bg-amber-50 text-amber-600"
                                  : "border-slate-200 bg-slate-100 text-slate-500"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {s.status === "Completed" && (
                            <button
                              onClick={() => handleDeleteSnapshot(s.id)}
                              className="font-mono text-[10px] text-rose-500 hover:text-rose-700"
                            >
                              delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
              <span className="font-mono font-bold text-slate-700">Snapshot semantics:</span> EBS snapshots are crash-consistent
              (stored in S3, incremental, restorable to any size); EFS snapshots cover a full file system and restore into the
              same region. In Kubernetes, restore means <em>creating a brand-new PVC</em> whose{" "}
              <code className="font-mono">dataSource</code> points at the VolumeSnapshot — the original volume is never touched.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FragmentSwitcher({ label, active, last }: { label: string; active: boolean; last: boolean }) {
  return (
    <>
      <div
        className={`rounded-lg border px-3 py-2 text-xs font-mono transition-all ${
          active
            ? "border-sky-600 bg-sky-600 text-white shadow-lg shadow-sky-200"
            : "border-slate-200 bg-white text-slate-500"
        }`}
      >
        {label}
      </div>
      {!last && <span className="text-sm font-bold text-sky-400">→</span>}
    </>
  );
}