"use client";

import { useState, useMemo, useCallback } from "react";

// =========================================================================
// Types & Data
// =========================================================================

// --- Pod Lifecycle ---
type PodPhase = "Pending" | "ContainerCreating" | "Running" | "Succeeded" | "Failed" | "Unknown";

interface PhaseDetail {
  icon: string;
  status: string;
  meaning: string;
  entrySignals: string[];
  outputSignals: string[];
  kubectl: string;
  tip: string;
  check: string; // tailwind classes for the status chip
}

const PHASE_DETAILS: Record<PodPhase, PhaseDetail> = {
  Pending: {
    icon: "⏳",
    status: "Pending",
    meaning:
      "The Pod has been accepted by the API server, but one or more containers have not yet been created. This can last from milliseconds to indefinitely — a stuck Pending state is the #1 waiting-room symptom.",
    entrySignals: [
      "Scheduler has filed the Pod but no Node was selected yet",
      "Node is Unschedulable (cordoned, tainted, or out of capacity)",
      "Image pull is queued behind registry access",
    ],
    outputSignals: [
      "pod pending -> scheduling",
      "no nodes available to schedule pods",
      "0/2 nodes available: 2 Insufficient cpu",
    ],
    kubectl: "kubectl describe pod <name> | grep -A 20 Events",
    tip: "Pending + zero scheduled reason in Events almost always means a scheduling problem, not an application problem.",
    check: "bg-sky-50 dark:bg-sky-900/30 border-sky-300 dark:border-sky-600 text-sky-700 dark:text-sky-300",
  },
  ContainerCreating: {
    icon: "📦",
    status: "ContainerCreating",
    meaning:
      "The kubelet has started pulling images, creating the container, or attaching volumes and network. Normal pods pass through here in seconds; a hang here points at the runtime or network layer.",
    entrySignals: [
      "Image pull in progress (registry latency or layer downloads)",
      "Persistent volume mounting or hostPath setup",
      "CNI plugin assigning the Pod IP / sandbox creation",
    ],
    outputSignals: [
      "pulling image nginx:latest",
      "volume is not attached",
      "network plugin is not ready: cni config uninitialized",
    ],
    kubectl: "kubectl describe pod <pod> && kubectl get events --sort-by=.lastTimestamp",
    tip: "Stuck in ContainerCreating >60s: check image pull secrets, PVC status, and CNI plugin health on the node.",
    check: "bg-sky-50 dark:bg-sky-900/30 border-sky-300 dark:border-sky-600 text-sky-700 dark:text-sky-300",
  },
  Running: {
    icon: "🟢",
    status: "Running",
    meaning:
      "The Pod has been bound to a node and all containers are created. At least one container is running, another is starting/restarting, or the containers are being recreated — health here is judged by the ready count.",
    entrySignals: [
      "All containers started and the process is alive",
      "Readiness probes passing (Ready True)",
      "Container restart counters incrementing during CrashLoopBackOff",
    ],
    outputSignals: [
      "pod running (1/1) ready",
      "restarting (n restarts)",
      "container status Waiting: CrashLoopBackOff",
    ],
    kubectl: "kubectl get pod <pod> -o wide",
    tip: "Running + mismatched ready count (e.g. 0/1) means the container runs but probes fail — check readiness probes and Service endpoints.",
    check: "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300",
  },
  Succeeded: {
    icon: "✅",
    status: "Succeeded",
    meaning:
      "All containers in the Pod have terminated with exit code 0 and will not be restarted. Expected for CronJobs, Jobs, and init containers — a red flag for long-running Deployments.",
    entrySignals: [
      "Container process exited 0 or was terminated after completing",
      "Job's Pod finished its execution queue",
    ],
    outputSignals: [
      "completed: pod completed successfully",
      "exit code: 0",
    ],
    kubectl: "kubectl logs <pod> --previous && kubectl get job <job>",
    tip: "For Deployments, a Succeeded Pod means your main process exited — containers should stay resident (foreground process, not a script that returns).",
    check: "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300",
  },
  Failed: {
    icon: "❌",
    status: "Failed",
    meaning:
      "All containers terminated, and at least one exited with a non-zero code or was terminated by the system. Job pods mark Failed; controller-managed pods are recreated by their owner.",
    entrySignals: [
      "Container exited with non-zero exit code",
      "Killed by the node (OOMKilled, eviction)",
      "Node-level preemption or forceful deletion",
    ],
    outputSignals: [
      "error: container exited with status 1",
      "killed: oom killed again",
      "aborted due to node shutdown",
    ],
    kubectl: "kubectl get pod <pod> -o json | jq '.status.containerStatuses[0].state.terminated'",
    tip: "Failed is a terminal verdict — capture the exit code and reason before the controller replaces the pod and you lose the logs.",
    check: "bg-rose-50 dark:bg-rose-900/30 border-rose-300 dark:border-rose-600 text-rose-700 dark:text-rose-300",
  },
  Unknown: {
    icon: "❓",
    status: "Unknown",
    meaning:
      "The API server cannot obtain the Pod's status — typically because the kubelet has stopped heartbeating (node partition, kubelet crash, or reboot). The control plane treats the pod as unavailable and may evict it.",
    entrySignals: [
      "kubelet heartbeats stop (node NotReady)",
      "API server cannot determine the phase",
      "Node partitioned from the network",
    ],
    outputSignals: [
      "node not ready",
      "pod unknown: no status provided for pod",
      "evicting pod due to node shutdown",
    ],
    kubectl: "kubectl get nodes && kubectl describe node <node> | tail -20",
    tip: "When a node disappears, pods go Unknown before the controller force-deletes and reschedules them — fix the node first.",
    check: "bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300",
  },
};

interface Scenario {
  id: string;
  label: string;
  path: PodPhase[];
  drive: string;
  payload: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: "healthy",
    label: "Healthy deploy",
    path: ["Pending", "ContainerCreating", "Running"],
    drive: "Scheduler picks a node, kubelet pulls the image, probes pass, pod goes Ready.",
    payload: "STATUS: Running  READY: 1/1  RESTARTS: 0  AGE: 2m",
  },
  {
    id: "crash",
    label: "App crashes on start",
    path: ["Pending", "ContainerCreating", "Running", "Failed"],
    drive: "Container starts, exits non-zero, the controller recreates it and the kubelet backs off — a CrashLoopBackOff cycle.",
    payload: "STATUS: CrashLoopBackOff  READY: 0/1  RESTARTS: 7  AGE: 5m",
  },
  {
    id: "oom",
    label: "Memory limit exceeded",
    path: ["Pending", "ContainerCreating", "Running", "Failed"],
    drive: "Container exceeds its memory limit → OOMKilled by the kernel, restart loop begins, pod flaps Ready 0/1.",
    payload: "STATUS: Running  READY: 0/1  RESTARTS: 4  LASTSTATE: OOMKilled",
  },
  {
    id: "unschedulable",
    label: "No capacity to schedule",
    path: ["Pending"],
    drive: "The scheduler cannot find a node with the required CPU/memory or tolerations — the pod parks in Pending with FailedScheduling events.",
    payload: "STATUS: Pending  READY: 0/1  RESTARTS: 0  REASON: Unschedulable",
  },
  {
    id: "image-pull",
    label: "Image pull blocked",
    path: ["Pending", "ContainerCreating"],
    drive: "Image name typo or registry auth failure keeps the kubelet retrying; the pod oscillates in ContainerCreating / wait states.",
    payload: "STATUS: ImagePullBackOff  READY: 0/1  RESTARTS: 0  REASON: ErrImagePull",
  },
  {
    id: "job-done",
    label: "Batch job completes",
    path: ["Pending", "ContainerCreating", "Running", "Succeeded"],
    drive: "A Job's container exits 0; the Job marks the Pod Succeeded and retains it for logs.",
    payload: "STATUS: Succeeded  READY: 0/1  COMPLETIONS: 1/1  AGE: 45s",
  },
  {
    id: "node-down",
    label: "Node disappears",
    path: ["Running", "Unknown", "Failed"],
    drive: "The node's kubelet stops reporting; the control plane marks the pod Unknown, then the controller force-deletes and recreates it.",
    payload: "STATUS: Unknown  READY: 0/1  NODE: worker-2 (NotReady)",
  },
];

// --- Failure pattern library ---
type FailureKey = "CrashLoopBackOff" | "ImagePullBackOff" | "Pending" | "OOMKilled";

interface FailurePattern {
  icon: string;
  tagline: string;
  definition: string;
  causes: string[];
  detection: string[];
  fixes: string[];
  cmd: string;
  verificationLog: string;
}

const FAILURE_PATTERNS: Record<FailureKey, FailurePattern> = {
  CrashLoopBackOff: {
    icon: "💥",
    tagline: "Container starts, crashes, restarts, repeats",
    definition:
      "The kubelet detects the container exiting with a non-zero code shortly after start and backs off with exponential delay (10s, 20s, 40s … up to 5m) before each retry. Almost always an app-level bug for freshly written code — rarely an infrastructure problem.",
    causes: [
      "Application panic / unhandled exception during startup",
      "Missing env var, config file, or secret the app hard-crashes on",
      "Port already in use inside the container or namespace",
      "Wrong architecture: amd64 image scheduled onto an arm64 node",
      "Probe fails from t=0 with failureThreshold=1 — the probe kills it before readiness ever passes",
    ],
    detection: [
      "kubectl get pods → STATUS: CrashLoopBackOff, RESTARTS climbing",
      "kubectl logs <pod> --previous → application stack trace at startup",
      "kubectl describe pod <pod> → Events: Back-off restarting failed container",
    ],
    fixes: [
      "Read the last run: kubectl logs <pod> --previous -c app",
      "Verify mounts and secrets: kubectl exec <pod> -- env && cat /app/config/*",
      "Run the image locally with the same args and observe the exit code",
      "Temporarily override the entrypoint to a sleep to debug interactively",
      "Give the app room to boot: raise liveness initialDelaySeconds before blaming it",
    ],
    cmd: "kubectl logs <pod> --previous --tail=50 && kubectl describe pod <pod> | grep -A 8 Events",
    verificationLog:
      "$ kubectl get pod api-7d9bbb98-6xz7k\nNAME                     READY   STATUS            RESTARTS   AGE\napi-7d9bbb98-6xz7k       0/1     CrashLoopBackOff  5          3m\n\n$ kubectl logs api-7d9bbb98-6xz7k --previous --tail=20\nError: Cannot find module '/app/config/settings.json'\n    at Module._load (node:internal/modules/cjs/loader:121:15)\n    at Module.require (node:internal/modules/cjs/loader:127:19)\n    at Object.<anonymous> (/app/dist/main.js:42:1)",
  },
  ImagePullBackOff: {
    icon: "🌐",
    tagline: "The registry cannot hand over the image",
    definition:
      "The kubelet failed to pull the container image (or its manifest) and is retrying with backoff. The registry may be reachable, but the image itself is wrong, missing, private, or blocked by egress rules.",
    causes: [
      "Image tag does not exist (typo, or never pushed that tag)",
      "Private registry credentials missing or expired — no imagePullSecrets",
      "Registry requires authentication but no secret is attached to the Pod",
      "The tag was deleted or overwritten after the manifest was cached",
      "Node cannot reach the registry: egress firewall, proxy deny-list, DNS hijack",
    ],
    detection: [
      "STATUS: ImagePullBackOff (ErrImagePull on first attempt, BackOff on retries)",
      "kubectl describe pod → Events: Failed to pull image ...: manifest unknown",
      "kubectl get events → repeated ImagePullBackOff after Failed",
    ],
    fixes: [
      "Verify the exact image ref: kubectl describe pod <pod> | grep Image",
      "Test the pull locally: docker pull <image>:<tag>",
      "Add imagePullSecrets with working registry credentials",
      "Push the correct tag to a registry the cluster can reach",
      "Check node egress with curl/dig to the registry domain",
    ],
    cmd: "kubectl describe pod <pod> | grep -E 'Image|Events' && kubectl get events --field-selector involvedObject.name=<pod>",
    verificationLog:
      "Events:\n  Normal   Scheduled   2m    default-scheduler  Successfully assigned default/web-77f58 to node-03\n  Warning  Failed       99s   kubelet            Failed to pull image \"nginx:apache\": failed to resolve reference\n  Warning  Failed       99s   kubelet            Error: ErrImagePull\n  Normal   BackOff      98s   kubelet            Back-off pulling image \"nginx:apache\"",
  },
  Pending: {
    icon: "🕓",
    tagline: "Scheduled nowhere: stuck in the queue",
    definition:
      "The Pod has been accepted by the API server but no node has been picked — or the kubelet cannot start it. It sits indefinitely until the scheduler finds capacity or the request is corrected.",
    causes: [
      "Insufficient CPU/memory requests for every node in the cluster",
      "Node taints without matching tolerations on the Pod",
      "NodeSelector / nodeAffinity matching zero nodes",
      "PersistentVolumeClaim not yet bound — the scheduler waits on the volume",
      "Cluster autoscaler disabled or at its maximum size",
      "API server scheduling queue congestion (many failed/duplicate pods)",
    ],
    detection: [
      "STATUS: Pending, READY: 0/1 for a long stretch",
      "kubectl describe pod → Events: FailedScheduling with a JSON reason",
      "kubectl get events --field-selector reason=FailedScheduling",
    ],
    fixes: [
      "kubectl describe pod <pod> | grep -i schedul — read the reason line",
      "Compare requests vs allocatable: kubectl describe nodes | grep -A 8 'Allocated resources'",
      "Lower requests/limits or add tolerations and affinity fixes",
      "Check the PVC is Bound: kubectl get pvc",
      "Resize or unblock the autoscaler if scaling was the bottleneck",
    ],
    cmd: "kubectl describe pod <pod> | grep -A 20 'Events'",
    verificationLog:
      "Events:\n  Type    Reason            Age  From               Message\n  ----    ------            ---  ----               -------\n  Normal  NotTriggerScaleUp  6m  cluster-autoscaler  pod didn't trigger scale-up: max size reached\n  Warning FailedScheduling  4m  default-scheduler   0/3 nodes available: 2 nodes had taint {node-group: spot}, 1 Insufficient cpu.",
  },
  OOMKilled: {
    icon: "🧠",
    tagline: "The kernel killed the container for memory",
    definition:
      "The container exceeded its memory limit (or the node ran out of memory) and the OOM killer terminated it. Kubelet reports the last state as OOMKilled with exit code 137 — a reason, not an app crash bug, and often fixed purely in the manifest.",
    causes: [
      "Memory limit set far below the working set (requests/limits mismatch)",
      "Memory leak or unbounded caches inside the application",
      "Heavy sidecars sharing one pod's memory budget",
      "Real memory pressure on the node — eviction or kernel OOM",
    ],
    detection: [
      "kubectl get pod -o yaml → state.terminated.reason: OOMKilled",
      "kubectl describe pod → Last State: Terminated, Exit Code: 137",
      "Compare with 143 (SIGTERM graceful) — they are very different stories",
    ],
    fixes: [
      "Raise the container memory limit in the Deployment spec (requests/limits)",
      "Profile steady-state RSS: kubectl top pod <pod>",
      "Find leaks: long-lived queries, unclosed buffers, unbounded caches",
      "Split heavy workloads into dedicated containers/pods with their own limits",
      "Watch node-level eviction vs cgroup OOMKill — fix whichever fired",
    ],
    cmd: "kubectl get pod <pod> -o jsonpath='{.status.containerStatuses[0].state}' | jq .",
    verificationLog:
      "$ kubectl describe pod worker-8659c5cf7c-2tmqh\n  Last State:    Terminated\n    Reason:      OOMKilled\n    Exit Code:   137\n    Exit Code:   137 (SIGKILL)\n  Restart Count: 12\n  Allocated memory: 256Mi (50% of the 512Mi request)",
  },
};

// --- kubectl command generator ---
type CommandCategory = "logs" | "describe" | "events" | "exec" | "debug" | "cp" | "top" | "attach";

interface GeneratorState {
  podName: string;
  namespace: string;
  container: string;
  tail: string;
  previous: boolean;
  follow: boolean;
  grep: string;
  args: string;
  image: string;
  localPort: string;
}

interface CommandSpec {
  key: CommandCategory;
  label: string;
  icon: string;
  template: (p: GeneratorState) => string;
  hint: string;
}

const COMMAND_SPECS: CommandSpec[] = [
  {
    key: "logs",
    label: "Logs",
    icon: "📜",
    template: (st) =>
      `kubectl logs ${st.podName} -c ${st.container} -n ${st.namespace} ${st.tail} ${st.follow ? "-f" : ""} ${st.previous ? "--previous" : ""}${st.grep ? ` | grep -i "${st.grep}"` : ""}`,
    hint: "Inspect application output; add --previous to see the last crashed container's logs.",
  },
  {
    key: "describe",
    label: "Describe",
    icon: "🔍",
    template: (st) =>
      `kubectl describe pod ${st.podName} -n ${st.namespace}`,
    hint: "Deep inspection of the pod spec, node binding, conditions, and the Events tail.",
  },
  {
    key: "events",
    label: "Events",
    icon: "📡",
    template: (st) =>
      `kubectl get events -n ${st.namespace}${st.follow ? " -w" : ""} --sort-by=.lastTimestamp${st.grep ? ` | grep -i "${st.grep}"` : ""}`,
    hint: "Cluster-wide signal of transient failures: ImagePull, BackOff, FailedScheduling.",
  },
  {
    key: "exec",
    label: "Shell",
    icon: "💻",
    template: (st) =>
      `kubectl exec -it ${st.podName} -c ${st.container} -n ${st.namespace} -- ${st.args}`,
    hint: "Interactive access — drop a shell to inspect mount points, DNS, hosts, and env.",
  },
  {
    key: "debug",
    label: "Ephemeral debug",
    icon: "🛠️",
    template: (st) =>
      `kubectl debug -it ${st.podName} --image=${st.image} --copy-to=${st.podName}-debug -n ${st.namespace} -- ${st.args}`,
    hint: "Inject a sidecar container for diagnosing a pod whose liveness probe keeps killing the shell.",
  },
  {
    key: "cp",
    label: "Copy files",
    icon: "📁",
    template: (st) =>
      `kubectl cp ${st.podName}:/app/logs/app.log ./debug/app.log -c ${st.container} -n ${st.namespace}`,
    hint: "Pull artifacts (heap dumps, tarballs, crash logs) out of the container.",
  },
  {
    key: "top",
    label: "Resource usage",
    icon: "📈",
    template: (st) =>
      `kubectl top pod ${st.podName} -n ${st.namespace}`,
    hint: "Live CPU/memory — the first stop when OOMKilled or Pending-insufficient is suspected.",
  },
  {
    key: "attach",
    label: "Attach",
    icon: "🩺",
    template: (st) =>
      `kubectl attach ${st.podName} -c ${st.container} -n ${st.namespace}`,
    hint: "Attach to a running container's stdin/stdout — see its live output stream.",
  },
];

// --- Events simulator ---
interface KubeEvent {
  id: number;
  time: string;
  namespace: string;
  object: string;
  kind: "Normal" | "Warning";
  reason: string;
  message: string;
  count: number;
}

interface ScenarioFeed {
  id: string;
  label: string;
  events: Array<Omit<KubeEvent, "id">>;
}

const SCENARIO_FEEDS: ScenarioFeed[] = [
  {
    id: "deploy",
    label: "Healthy rollout",
    events: [
      { time: "12:00:01", namespace: "default", object: "pod/web-87b9f", kind: "Normal", reason: "Scheduled", message: "Successfully assigned default/web-87b9f to node-01", count: 1 },
      { time: "12:00:03", namespace: "default", object: "pod/web-87b9f", kind: "Normal", reason: "Pulling", message: "Pulling image nginx:1.27", count: 1 },
      { time: "12:00:07", namespace: "default", object: "pod/web-87b9f", kind: "Normal", reason: "Pulled", message: "Successfully pulled image nginx:1.27", count: 1 },
      { time: "12:00:08", namespace: "default", object: "pod/web-87b9f", kind: "Normal", reason: "Created", message: "Created container nginx", count: 1 },
      { time: "12:00:08", namespace: "default", object: "pod/web-87b9f", kind: "Normal", reason: "Started", message: "Started container nginx", count: 1 },
      { time: "12:00:10", namespace: "default", object: "pod/web-87b9f", kind: "Normal", reason: "Ready", message: "Readiness probe passed; pod ready", count: 1 },
    ],
  },
  {
    id: "crashloop",
    label: "CrashLoopBackOff",
    events: [
      { time: "12:01:02", namespace: "default", object: "pod/api-6blz2", kind: "Normal", reason: "Started", message: "Started container api", count: 1 },
      { time: "12:01:09", namespace: "default", object: "pod/api-6blz2", kind: "Warning", reason: "BackOff", message: "Back-off restarting failed container api (10s wait)", count: 3 },
      { time: "12:01:19", namespace: "default", object: "pod/api-6blz2", kind: "Warning", reason: "BackOff", message: "Back-off restarting failed container api (20s wait)", count: 4 },
      { time: "12:01:39", namespace: "default", object: "pod/api-6blz2", kind: "Warning", reason: "BackOff", message: "Back-off restarting failed container api (40s wait)", count: 5 },
      { time: "12:02:19", namespace: "default", object: "pod/api-6blz2", kind: "Warning", reason: "BackOff", message: "Back-off restarting failed container api (80s wait)", count: 6 },
    ],
  },
  {
    id: "image",
    label: "ErrImagePull",
    events: [
      { time: "12:03:00", namespace: "billing", object: "pod/db-6cx9k", kind: "Normal", reason: "Scheduled", message: "Successfully assigned pod/db-6cx9k to node-02", count: 1 },
      { time: "12:03:01", namespace: "billing", object: "pod/db-6cx9k", kind: "Warning", reason: "Failed", message: "Failed to pull image \"registry.prod/billing/db:2.1\": manifest unknown", count: 1 },
      { time: "12:03:01", namespace: "billing", object: "pod/db-6cx9k", kind: "Warning", reason: "Failed", message: "Error: ErrImagePull (unknown manifest)", count: 1 },
      { time: "12:03:31", namespace: "billing", object: "pod/db-6cx9k", kind: "Warning", reason: "BackOff", message: "Back-off pulling image \"registry.prod/billing/db:2.1\"", count: 2 },
    ],
  },
  {
    id: "oom",
    label: "OOMKilled",
    events: [
      { time: "12:04:12", namespace: "workers", object: "pod/job-x4-77c9f", kind: "Normal", reason: "Started", message: "Started container runner", count: 1 },
      { time: "12:04:44", namespace: "workers", object: "pod/job-x4-77c9f", kind: "Warning", reason: "OOMKilling", message: "Memory cgroup out of memory: Killed process 2317 (node) total-vm:2.1GB, anon-rss:1536MB", count: 1 },
      { time: "12:04:45", namespace: "workers", object: "pod/job-x4-77c9f", kind: "Warning", reason: "Killing", message: "Container runner terminated with exit code 137", count: 1 },
      { time: "12:04:45", namespace: "workers", object: "pod/job-x4-77c9f", kind: "Warning", reason: "BackOff", message: "Back-off restarting failed container runner (10s wait)", count: 2 },
    ],
  },
  {
    id: "unschedulable",
    label: "FailedScheduling",
    events: [
      { time: "12:05:00", namespace: "prod", object: "pod/gpu-8pw3x", kind: "Warning", reason: "FailedScheduling", message: "0/4 nodes available: 2 Insufficient cpu, 2 node(s) had taint {node-pool:gpu} that the pod didn't tolerate", count: 4 },
      { time: "12:05:30", namespace: "prod", object: "pod/gpu-8pw3x", kind: "Warning", reason: "FailedScheduling", message: "0/4 nodes available: pod asks for 8Gi memory, 2 nodes have max allocatable 6Gi", count: 6 },
      { time: "12:06:00", namespace: "prod", object: "pod/gpu-8pw3x", kind: "Normal", reason: "NotTriggerScaleUp", message: "node group 0: max size reached, cannot scale for pending pod", count: 2 },
    ],
  },
];

// --- Probe debugger ---
type ProbeKind = "liveness" | "readiness" | "startup";
type ProbeMechanism = "httpGet" | "tcpSocket" | "exec";

const PROBE_KIND_INFO: Record<ProbeKind, { label: string; icon: string; desc: string; color: string }> = {
  liveness: {
    label: "Liveness",
    icon: "❤️",
    desc: "Restarts the container when the probe fails. Used for self-healing a deadlocked app — never for deep dependencies (DB, cache), or you get cascading restarts.",
    color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700",
  },
  readiness: {
    label: "Readiness",
    icon: "🟢",
    desc: "Cuts the Service endpoint when the probe fails — the pod stays alive but stops receiving traffic. The right tool for slow boot and dependency health.",
    color: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-700",
  },
  startup: {
    label: "Startup",
    icon: "🚀",
    desc: "Runs during slow boot so liveness doesn't kill the pod mid-initialization. On success, kubelet hands over to liveness/readiness.",
    color: "text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-700",
  },
};

interface ProbeAttempt {
  tick: number;
  result: "ok" | "fail";
  note: string;
}

const MAX_ATTEMPTS = 12;

// =========================================================================
// Small presentational helpers
// =========================================================================

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">{label}</span>
      {children}
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{label}</div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors relative p-1 ${
          checked ? "bg-sky-500" : "bg-slate-300"
        }`}
        aria-label={label}
      >
        <span
          className={`block w-4 h-4 rounded-full bg-white dark:bg-slate-800 transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  unit: string;
}) {
  return (
    <label className="block p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-xs font-mono text-sky-700 dark:text-sky-300 font-bold">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-sky-600"
      />
    </label>
  );
}

function DetailPanel({ detail, phase }: { detail: PhaseDetail; phase: PodPhase }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{detail.icon}</span>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">{phase}</h3>
        </div>
        <span className={`px-2 py-0.5 rounded-md border text-[10px] font-mono ${detail.check}`}>
          {detail.status}
        </span>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{detail.meaning}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
          <div className="text-[10px] font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1.5">
            How you get here
          </div>
          <ul className="space-y-1">
            {detail.entrySignals.map((s, i) => (
              <li key={i} className="text-[11px] text-slate-600 dark:text-slate-300 flex gap-1.5">
                <span className="text-sky-400 dark:text-sky-300 shrink-0">▸</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
          <div className="text-[10px] font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1.5">
            Output signals
          </div>
          <ul className="space-y-1">
            {detail.outputSignals.map((s, i) => (
              <li key={i} className="text-[11px] text-slate-600 dark:text-slate-300 font-mono leading-snug break-words">
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="rounded-lg bg-slate-900 text-sky-200 font-mono text-xs p-3 overflow-x-auto">
        <div className="text-slate-500 dark:text-slate-400 mb-1">$</div>
        <pre className="whitespace-pre-wrap">{detail.kubectl}</pre>
      </div>
      <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 text-[11px] text-sky-800 dark:text-sky-200 leading-relaxed">
        <span className="font-bold">Tip: </span>
        {detail.tip}
      </div>
    </div>
  );
}

// =========================================================================
// Component
// =========================================================================

export default function DkTroubleshootingSection() {
  // ---- Module 1: lifecycle simulator ----
  const [selectedScenario, setSelectedScenario] = useState<string>("healthy");
  const [highlightedPhase, setHighlightedPhase] = useState<PodPhase | null>(null);

  const activeScenario = useMemo(
    () => SCENARIOS.find((s) => s.id === selectedScenario) ?? SCENARIOS[0],
    [selectedScenario]
  );

  const scenarioStates = useMemo(() => new Set(activeScenario.path), [activeScenario]);

  // ---- Module 2: failure library ----
  const [activePattern, setActivePattern] = useState<FailureKey>("CrashLoopBackOff");

  // ---- Module 3: command generator ----
  const [cmdCategory, setCmdCategory] = useState<CommandCategory>("logs");
  const [podName, setPodName] = useState("web-7b6f9d-4x7k2");
  const [namespace, setNamespace] = useState("default");
  const [container, setContainer] = useState("app");
  const [tailLines, setTailLines] = useState(50);
  const [usePrevious, setUsePrevious] = useState(false);
  const [followLogs, setFollowLogs] = useState(false);
  const [grepFilter, setGrepFilter] = useState("");
  const [execArgs, setExecArgs] = useState("/bin/sh");
  const [debugImage, setDebugImage] = useState("busybox:1.36");
  const [localPort, setLocalPort] = useState("8080:80");
  const [copiedCmd, setCopiedCmd] = useState(false);

  const generatedCommand = useMemo(() => {
    const spec = COMMAND_SPECS.find((s) => s.key === cmdCategory) ?? COMMAND_SPECS[0];
    return spec.template({
      podName,
      namespace,
      container,
      tail: tailLines > 0 ? `--tail=${tailLines}` : "",
      previous: usePrevious,
      follow: followLogs,
      grep: grepFilter,
      args: execArgs,
      image: debugImage,
      localPort,
    });
  }, [cmdCategory, podName, namespace, container, tailLines, usePrevious, followLogs, grepFilter, execArgs, debugImage, localPort]);

  const copyCommand = useCallback(() => {
    navigator.clipboard?.writeText(generatedCommand).catch(() => {});
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 1800);
  }, [generatedCommand]);

  // ---- Module 4: events viewer ----
  const [events, setEvents] = useState<KubeEvent[]>([]);
  const [eventsOrigin, setEventsOrigin] = useState<string | null>(null);

  const playScenario = useCallback((feedId: string) => {
    const feed = SCENARIO_FEEDS.find((f) => f.id === feedId);
    if (!feed) return;
    setEventsOrigin(feed.label);
    setEvents(feed.events.map((e, i) => ({ ...e, id: i })));
  }, []);

  // ---- Module 5: probe debugger ----
  const [probeKind, setProbeKind] = useState<ProbeKind>("readiness");
  const [probeMechanism, setProbeMechanism] = useState<ProbeMechanism>("httpGet");
  const [probePath, setProbePath] = useState("/health");
  const [probePort, setProbePort] = useState("8080");
  const [probeCommand, setProbeCommand] = useState("cat /tmp/healthy");
  const [initialDelay, setInitialDelay] = useState(10);
  const [period, setPeriod] = useState(5);
  const [failureThreshold, setFailureThreshold] = useState(3);
  const [successThreshold, setSuccessThreshold] = useState(1);
  const [timeoutSec, setTimeoutSec] = useState(1);
  const [endpointHealthy, setEndpointHealthy] = useState(true);
  const [probeRunning, setProbeRunning] = useState(false);

  const probeTimeline = useMemo<ProbeAttempt[]>(() => {
    const attempts: ProbeAttempt[] = [];
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const tick = initialDelay + i * period;
      attempts.push({
        tick,
        result: endpointHealthy ? "ok" : "fail",
        note: endpointHealthy ? "200 OK" : "HTTP 500 / timeout",
      });
    }
    return attempts;
  }, [endpointHealthy, initialDelay, period]);

  const probeHealthSummary = useMemo(() => {
    if (probeKind === "readiness") {
      return {
        verdict: endpointHealthy ? "Ready — traffic routed" : "Not ready — traffic drained",
        detail: endpointHealthy
          ? "Readiness probe passing; Service endpoints include this pod."
          : "Readiness failing after threshold; pod removed from Service endpoints but stays running.",
        tone: endpointHealthy ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700" : "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700",
      };
    }
    return {
      verdict: endpointHealthy ? "Healthy — no restart" : "Restarting container (liveness fired)",
      detail: endpointHealthy
        ? "Liveness probe passing; kubelet leaves the container alone."
        : "Liveness failureThreshold consecutive failures — kubelet kills and restarts the container.",
      tone: endpointHealthy ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700" : "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700",
    };
  }, [probeKind, endpointHealthy]);

  const probeYaml = useMemo(() => {
    const mech =
      probeMechanism === "httpGet"
        ? `httpGet:\n            path: ${probePath}\n            port: ${probePort}`
        : probeMechanism === "tcpSocket"
          ? `tcpSocket:\n            port: ${probePort}`
          : `exec:\n            command:\n              - sh\n              - -c\n              - "${probeCommand}"`;
    return `kind: Deployment\nspec:\n  template:\n    spec:\n      containers:\n      - name: app\n        image: nginx:1.27\n        ${probeKind}Probe:\n          ${mech}\n          initialDelaySeconds: ${initialDelay}\n          periodSeconds: ${period}\n          timeoutSeconds: ${timeoutSec}\n          failureThreshold: ${failureThreshold}\n          successThreshold: ${successThreshold}`;
  }, [probeKind, probeMechanism, probePath, probePort, probeCommand, initialDelay, period, timeoutSec, failureThreshold, successThreshold]);

  const finalAttempt = probeTimeline[probeTimeline.length - 1];

  return (
    <div id="dk-troubleshooting" className="space-y-16 pb-16">
      {/* Header banner */}
      <div className="rounded-2xl bg-gradient-to-r from-sky-900 via-sky-800 to-blue-900 border border-sky-700/50 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-sky-400/20 text-sky-200 border border-sky-400/30 text-xs font-mono font-semibold">
                Kubernetes Troubleshooting Module
              </span>
              <span className="text-xs text-sky-300/80 font-mono">Mode: Debug Deck</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Diagnose Pods Like a Cluster SRE
            </h1>
            <p className="text-sm text-sky-200/90 mt-1 max-w-3xl">
              Walk the Pod lifecycle state machine, decode the four failure archetypes
              (CrashLoopBackOff, ImagePullBackOff, Pending, OOMKilled), generate exact
              kubectl fire commands, replay cluster events, and tune liveness/readiness
              probes until the pod stays green.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-center px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
              <div className="text-2xl font-extrabold text-white">5</div>
              <div className="text-[10px] font-mono text-sky-300 uppercase">Visualizations</div>
            </div>
            <div className="text-center px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
              <div className="text-2xl font-extrabold text-white">4</div>
              <div className="text-[10px] font-mono text-sky-300 uppercase">Failure Patterns</div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODULE 1: Pod Lifecycle State Machine */}
      {/* ========================================================================= */}
      <section className="space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
              Module 1 • Lifecycle &amp; States
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              Pod Lifecycle State Machine Simulator
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Pick a scenario → watch the phase graph light up
          </span>
        </div>

        {/* Scenario selector */}
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              onClick={() => setSelectedScenario(sc.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                selectedScenario === sc.id
                  ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                  : "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-700 hover:border-sky-400"
              }`}
            >
              {sc.label}
            </button>
          ))}
        </div>

        {/* State flow diagram */}
        <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Phase Transition Graph
            </span>
            <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400">click a phase for details</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["Pending", "ContainerCreating", "Running", "Succeeded"] as PodPhase[]).map((phase, i, arr) => (
              <div key={phase} className="flex items-center gap-2">
                <button
                  onClick={() => setHighlightedPhase(highlightedPhase === phase ? null : phase)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    highlightedPhase === phase
                      ? "bg-sky-600 text-white border-sky-600 shadow-md"
                      : scenarioStates.has(phase)
                        ? "bg-white dark:bg-slate-800 border-sky-300 dark:border-sky-600 text-sky-700 dark:text-sky-300 ring-1 ring-sky-200"
                        : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500"
                  }`}
                >
                  <span className="mr-1.5">{PHASE_DETAILS[phase].icon}</span>
                  {phase}
                </button>
                {i < arr.length - 1 && (
                  <span
                    className={
                      scenarioStates.has(phase) && scenarioStates.has(arr[i + 1])
                        ? "text-sky-500 dark:text-sky-400"
                        : "text-slate-300 dark:text-slate-400"
                    }
                  >
                    →
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Branch states */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase">Branches:</span>
            {(["Failed", "Unknown"] as PodPhase[]).map((phase) => (
              <button
                key={phase}
                onClick={() => setHighlightedPhase(highlightedPhase === phase ? null : phase)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                  highlightedPhase === phase
                    ? "bg-sky-600 text-white border-sky-600"
                    : scenarioStates.has(phase)
                      ? "bg-white dark:bg-slate-800 border-rose-300 dark:border-rose-600 text-rose-700 dark:text-rose-300"
                      : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500"
                }`}
              >
                {PHASE_DETAILS[phase].icon} {phase}
              </button>
            ))}
          </div>
        </div>

        {/* Scene + detail panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scenario explanation */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 card-shadow space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="text-xs font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider">Driving sequence</span>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{activeScenario.id}</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{activeScenario.drive}</p>
            <div className="flex flex-wrap gap-1.5">
              {activeScenario.path.map((p) => (
                <span
                  key={p}
                  className="px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 text-sky-700 dark:text-sky-300 text-[10px] font-mono"
                >
                  {p}
                </span>
              ))}
            </div>
            <div className="rounded-lg bg-slate-900 text-sky-200 font-mono text-xs p-3 overflow-x-auto">
              <div className="text-slate-500 dark:text-slate-400 mb-1">$ kubectl get pod</div>
              <pre className="whitespace-pre">{activeScenario.payload}</pre>
            </div>
          </div>

          {/* Phase details */}
          <div className="p-5 rounded-xl border card-shadow">
            {highlightedPhase ? (
              <DetailPanel detail={PHASE_DETAILS[highlightedPhase]} phase={highlightedPhase} />
            ) : (
              <div className="flex flex-col items-center justify-center text-center gap-2 h-full py-10">
                <div className="text-3xl">🖱️</div>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                  {activeScenario.path.length > 1
                    ? `This scenario passes through ${activeScenario.path.join(" → ")}. Click any phase to inspect its meaning, output signals, and the exact kubectl probe.`
                    : `This scenario parks in ${activeScenario.path[0]}. Click the phase to see why and what to run.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODULE 2: Failure pattern library */}
      {/* ========================================================================= */}
      <section className="space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
              Module 2 • Failure Patterns
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              Common Pod Failure Pattern Library
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            The four states you will debug 95% of the time
          </span>
        </div>

        {/* Pattern selector */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.keys(FAILURE_PATTERNS) as FailureKey[]).map((key) => {
            const pat = FAILURE_PATTERNS[key];
            const active = activePattern === key;
            return (
              <button
                key={key}
                onClick={() => setActivePattern(key)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  active
                    ? "bg-sky-600 border-sky-600 text-white shadow-lg shadow-sky-200"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-sky-300 hover:bg-sky-50/50"
                }`}
              >
                <div className="text-xl mb-1.5">{pat.icon}</div>
                <div className={`text-sm font-bold ${active ? "text-white" : "text-slate-900 dark:text-slate-100"}`}>{key}</div>
                <div className={`text-[11px] mt-1 leading-snug ${active ? "text-sky-100" : "text-slate-500 dark:text-slate-400"}`}>
                  {pat.tagline}
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail card */}
        {(() => {
          const pat = FAILURE_PATTERNS[activePattern];
          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 card-shadow">
                  <div className="text-[11px] font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1.5">
                    Definition
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{pat.definition}</p>
                </div>

                <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                  <div className="text-[11px] font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-2">
                    Root causes
                  </div>
                  <ul className="space-y-2">
                    {pat.causes.map((c, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span className="text-sky-500 dark:text-sky-400 font-mono shrink-0">▸</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                  <div className="text-[11px] font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-2">
                    First-response fixes
                  </div>
                  <ol className="space-y-2 list-none">
                    {pat.fixes.map((f, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {f}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                  <div className="text-[11px] font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-2">
                    Detection commands
                  </div>
                  <div className="rounded-lg bg-slate-900 text-sky-200 font-mono text-xs p-3 overflow-x-auto whitespace-pre-wrap mb-4">
                    {pat.cmd}
                  </div>
                  <ul className="space-y-1.5">
                    {pat.detection.map((d, i) => (
                      <li key={i} className="flex gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="text-sky-400 dark:text-sky-300 font-mono shrink-0">✓</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                      Witness it in a real terminal
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">simulated output</span>
                  </div>
                  <div className="rounded-lg bg-slate-950 text-emerald-300 font-mono text-xs p-3 overflow-x-auto whitespace-pre leading-relaxed h-64">
                    {pat.verificationLog}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      {/* ========================================================================= */}
      {/* MODULE 3: kubectl command generator */}
      {/* ========================================================================= */}
      <section className="space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
              Module 3 • Debug Arsenal
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              kubectl Debug Command Generator
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Compose exact commands, never fumble the flags
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Category picker */}
          <div className="lg:col-span-4 space-y-3">
            <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Command category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {COMMAND_SPECS.map((spec) => (
                <button
                  key={spec.key}
                  onClick={() => setCmdCategory(spec.key)}
                  className={`text-left px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    cmdCategory === spec.key
                      ? "bg-sky-600 border-sky-600 text-white shadow-md"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-300"
                  }`}
                >
                  <span className="mr-1.5">{spec.icon}</span>
                  {spec.label}
                </button>
              ))}
            </div>
            <div className="mt-3 p-3 rounded-xl bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 text-[11px] text-sky-800 dark:text-sky-200 leading-relaxed">
              {COMMAND_SPECS.find((s) => s.key === cmdCategory)?.hint}
            </div>
          </div>

          {/* Options */}
          <div className="lg:col-span-4 space-y-3">
            <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Parameters
            </label>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Pod name">
                <input
                  value={podName}
                  onChange={(e) => setPodName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </Field>
              <Field label="Namespace">
                <input
                  value={namespace}
                  onChange={(e) => setNamespace(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </Field>
              <Field label="Container">
                <input
                  value={container}
                  onChange={(e) => setContainer(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </Field>
              <Field label="Local port (port-forward)">
                <input
                  value={localPort}
                  onChange={(e) => setLocalPort(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ToggleRow label="Show previous logs" checked={usePrevious} onChange={setUsePrevious} />
              <ToggleRow label="Follow output (-f/-w)" checked={followLogs} onChange={setFollowLogs} />
            </div>

            <Field label="Tail lines (--tail)">
              <input
                type="number"
                min={0}
                value={tailLines}
                onChange={(e) => setTailLines(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </Field>
            <Field label="grep filter (optional)">
              <input
                value={grepFilter}
                onChange={(e) => setGrepFilter(e.target.value)}
                placeholder="error|panic|exception"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </Field>
            {cmdCategory === "exec" && (
              <Field label="Shell / args">
                <input
                  value={execArgs}
                  onChange={(e) => setExecArgs(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </Field>
            )}
            {cmdCategory === "debug" && (
              <Field label="Debug image">
                <input
                  value={debugImage}
                  onChange={(e) => setDebugImage(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </Field>
            )}
          </div>

          {/* Output terminal */}
          <div className="lg:col-span-4">
            <div className="rounded-xl bg-slate-900 border border-slate-700 overflow-hidden h-full flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/80 border-b border-slate-700">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-[10px] font-mono text-slate-400 dark:text-slate-500">ops-terminal — kubectl</span>
                </div>
                <button
                  onClick={copyCommand}
                  className="px-3 py-1 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono transition-colors"
                >
                  {copiedCmd ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <div className="p-4 font-mono text-xs text-sky-200 overflow-x-auto flex-1 leading-relaxed">
                <div className="text-slate-500 dark:text-slate-400 mb-1">$</div>
                <pre className="whitespace-pre-wrap break-all text-sky-100">{generatedCommand}</pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODULE 4: Events viewer simulator */}
      {/* ========================================================================= */}
      <section className="space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
              Module 4 • Signal Stream
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              kubectl get events — Live Viewer Simulator
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Replay what the Events stream looks like under real failure
          </span>
        </div>

        {/* Scenario buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">Replay:</span>
          {SCENARIO_FEEDS.map((feed) => (
            <button
              key={feed.id}
              onClick={() => playScenario(feed.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                eventsOrigin === feed.label
                  ? "bg-sky-600 text-white border-sky-600"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-300"
              }`}
            >
              {feed.label}
            </button>
          ))}
          {events.length > 0 && (
            <button
              onClick={() => {
                setEvents([]);
                setEventsOrigin(null);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-mono border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:border-rose-300"
            >
              Clear
            </button>
          )}
        </div>

        {/* Events table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden card-shadow">
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-sky-50 dark:bg-sky-900/30 border-b border-sky-200 dark:border-sky-700 text-[10px] font-mono text-sky-700 dark:text-sky-300 uppercase tracking-wider">
            <div className="col-span-2">Time</div>
            <div className="col-span-3">Object</div>
            <div className="col-span-2">Type / Reason</div>
            <div className="col-span-5">Message</div>
          </div>
          {events.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500 font-mono">
              $ kubectl get events --sort-by=.lastTimestamp
              <div className="mt-2 text-xs text-slate-300 dark:text-slate-400">No events yet — replay a scenario above.</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {events.map((ev) => (
                <div key={ev.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 hover:bg-sky-50/40 text-xs">
                  <div className="col-span-2 font-mono text-slate-400 dark:text-slate-500">
                    {ev.time}
                    {ev.count > 1 && <span className="ml-1 text-amber-600 dark:text-amber-400 font-bold">×{ev.count}</span>}
                  </div>
                  <div className="col-span-3 font-mono text-slate-700 dark:text-slate-200 break-all">
                    {ev.object}
                    <span className="ml-1 text-[10px] text-slate-400 dark:text-slate-500">{ev.namespace}</span>
                  </div>
                  <div className="col-span-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        ev.kind === "Warning"
                          ? "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-700"
                          : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700"
                      }`}
                    >
                      {ev.kind}
                    </span>
                    <div className="mt-0.5 font-mono text-slate-500 dark:text-slate-400">{ev.reason}</div>
                  </div>
                  <div className="col-span-5 text-slate-600 dark:text-slate-300 leading-snug break-words">{ev.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 text-[11px] text-sky-800 dark:text-sky-200">
          <span className="font-bold font-mono">SRE readout: </span>
          {eventsOrigin
            ? `The "${eventsOrigin}" drill produced ${events.length} events (${
                events.filter((e) => e.kind === "Warning").length
              } warnings). In production run: kubectl get events --sort-by=.lastTimestamp and read the chain top-down — the first Warning reason is where the story starts.`
            : "Events are short-lived (the API server aggregates them) — always describe the pod while it is still failing."}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODULE 5: Probe debugger */}
      {/* ========================================================================= */}
      <section className="space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
              Module 5 • Probe Lab
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              Liveness / Readiness / Startup Probe Debugger
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Tune thresholds → see the kubelet fire
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Probe builder */}
          <div className="lg:col-span-5 space-y-3">
            <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Probe configuration
            </label>

            <div className="flex gap-2">
              {(Object.keys(PROBE_KIND_INFO) as ProbeKind[]).map((kind) => (
                <button
                  key={kind}
                  onClick={() => setProbeKind(kind)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                    probeKind === kind
                      ? "bg-sky-600 border-sky-600 text-white shadow-sm"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-300"
                  }`}
                >
                  {PROBE_KIND_INFO[kind].icon} {PROBE_KIND_INFO[kind].label}
                </button>
              ))}
            </div>

            <div
              className={`p-3 rounded-xl border text-[11px] leading-relaxed ${PROBE_KIND_INFO[probeKind].color}`}
            >
              {PROBE_KIND_INFO[probeKind].desc}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <select
                value={probeMechanism}
                onChange={(e) => setProbeMechanism(e.target.value as ProbeMechanism)}
                className="px-3 py-2 col-span-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="httpGet">HTTP GET</option>
                <option value="tcpSocket">TCP socket</option>
                <option value="exec">Exec command</option>
              </select>
              {probeMechanism === "httpGet" && (
                <>
                  <Field label="Path">
                    <input
                      value={probePath}
                      onChange={(e) => setProbePath(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </Field>
                  <Field label="Port">
                    <input
                      value={probePort}
                      onChange={(e) => setProbePort(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </Field>
                </>
              )}
              {probeMechanism === "exec" && (
                <Field label="Command">
                  <input
                    value={probeCommand}
                    onChange={(e) => setProbeCommand(e.target.value)}
                    className="w-full px-3 py-2 col-span-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </Field>
              )}
              {probeMechanism === "tcpSocket" && (
                <Field label="Port">
                  <input
                    value={probePort}
                    onChange={(e) => setProbePort(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </Field>
              )}

              <SliderField label="initialDelaySeconds" value={initialDelay} onChange={setInitialDelay} min={0} max={60} unit="s" />
              <SliderField label="periodSeconds" value={period} onChange={setPeriod} min={1} max={30} unit="s" />
              <SliderField label="failureThreshold" value={failureThreshold} onChange={setFailureThreshold} min={1} max={5} unit="" />
              <SliderField label="successThreshold" value={successThreshold} onChange={setSuccessThreshold} min={1} max={3} unit="" />
              <SliderField label="timeoutSeconds" value={timeoutSec} onChange={setTimeoutSec} min={1} max={10} unit="s" />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Endpoint responds</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {endpointHealthy ? "200 OK — probe will pass" : "500 / hang — probe will fail"}
                </div>
              </div>
              <button
                onClick={() => setEndpointHealthy(!endpointHealthy)}
                className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                  endpointHealthy ? "bg-emerald-500" : "bg-rose-500"
                }`}
                aria-label="Toggle endpoint health"
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white dark:bg-slate-800 transition-transform ${
                    endpointHealthy ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Timeline + verdict */}
          <div className="lg:col-span-7 space-y-4">
            {/* Probe timeline */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                  Probe timeline (t = container start)
                </span>
                <button
                  onClick={() => setProbeRunning(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono border transition-all ${
                    probeRunning
                      ? "bg-emerald-500/15 border-emerald-400 text-emerald-600 dark:text-emerald-400"
                      : "bg-sky-600 text-white border-sky-600 hover:bg-sky-500"
                  }`}
                >
                  {probeRunning ? "Simulation live" : "▶ Run probe simulation"}
                </button>
              </div>

              {probeRunning ? (
                <>
                  {/* Initial delay zone */}
                  <div className="relative">
                    <div className="h-16 rounded-lg bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 relative mb-3 overflow-hidden">
                      <div
                        className="absolute top-0 bottom-0 bg-sky-200/60"
                        style={{ width: `${(initialDelay / (period * MAX_ATTEMPTS)) * 100}%` }}
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-sky-700 dark:text-sky-300">
                        initialDelay {initialDelay}s — kubelet waits before the first probe
                      </span>
                    </div>

                    <div className="flex flex-wrap items-end gap-1.5">
                      {probeTimeline.map((a, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <span
                            className={`w-6 h-4 rounded-sm ${
                              a.result === "ok" ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                            title={`t=${a.tick}s — ${a.note}`}
                          />
                          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">{a.tick}s</span>
                        </div>
                      ))}
                    </div>

                    {/* Flapping indicator */}
                    <div className="mt-3 flex items-center gap-3 text-[11px]">
                      <span
                        className={`px-2 py-1 rounded-md font-mono ${
                          probeTimeline.every((a) => a.result === "ok")
                            ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                            : probeTimeline.slice(-3).some((a) => a.result === "ok")
                              ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                              : "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"
                        }`}
                      >
                        {probeTimeline.every((a) => a.result === "ok")
                          ? "Stable — probes green"
                          : probeTimeline.slice(-3).some((a) => a.result === "ok")
                            ? "Flapping — watch the trend"
                            : "Failing — threshold kicked in"}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 font-mono">
                        {probeKind === "readiness"
                          ? "endpoint membership reacts after failureThreshold consecutive failures"
                          : "restart policy reacts after failureThreshold consecutive failures"}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500 font-mono">
                  Press ▶ Run probe simulation to watch the kubelet schedule probe rounds.
                </div>
              )}

              {/* Verdict card */}
              <div className={`mt-4 p-4 rounded-xl border ${probeHealthSummary.tone}`}>
                <div className="text-sm font-bold">{probeHealthSummary.verdict}</div>
                <div className="text-xs mt-1 opacity-90">{probeHealthSummary.detail}</div>
              </div>

              {/* Next probe math */}
              {probeRunning && finalAttempt && (
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700">next probe ≈ t+{finalAttempt.tick + period}s</span>
                  <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700">
                    verdict at failureThreshold {failureThreshold}: ~t+{initialDelay + (failureThreshold - 1) * period}s
                  </span>
                </div>
              )}
            </div>

            {/* Generated YAML */}
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow overflow-hidden">
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-mono text-slate-900 dark:text-slate-100 font-bold">Probe YAML (generated)</span>
                <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400">deployment spec fragment</span>
              </div>
              <div className="p-4 font-mono text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 overflow-x-auto whitespace-pre leading-relaxed">
                {probeYaml}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}