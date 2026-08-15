"use client";

import { useState, useMemo } from "react";

// ==========================================================================
// TYPES & DATA INTERFACES
// ==========================================================================

type Verb = "get" | "list" | "watch" | "create" | "update" | "patch" | "delete" | "use" | "bind" | "escalate" | "impersonate" | "*";

const VERB_OPTIONS: Verb[] = ["get", "list", "watch", "create", "update", "patch", "delete", "use", "bind", "escalate", "impersonate", "*"];

type ApiGroupKey = "core" | "apps" | "batch" | "networking" | "rbac" | "policy" | "storage" | "autoscaling" | "all";

const API_GROUPS: Record<ApiGroupKey, { label: string; apiGroup: string }> = {
  core: { label: "core (v1)", apiGroup: '""' },
  apps: { label: "apps", apiGroup: '"apps"' },
  batch: { label: "batch", apiGroup: '"batch"' },
  networking: { label: "networking.k8s.io", apiGroup: '"networking.k8s.io"' },
  rbac: { label: "rbac.authorization.k8s.io", apiGroup: '"rbac.authorization.k8s.io"' },
  policy: { label: "policy", apiGroup: '"policy"' },
  storage: { label: "storage.k8s.io", apiGroup: '"storage.k8s.io"' },
  autoscaling: { label: "autoscaling", apiGroup: '"autoscaling"' },
  all: { label: "All APIs", apiGroup: '"*"' },
};

const RESOURCE_OPTIONS: { value: string; label: string; group: ApiGroupKey }[] = [
  { value: "pods", label: "pods", group: "core" },
  { value: "pods/log", label: "pods/log", group: "core" },
  { value: "pods/exec", label: "pods/exec", group: "core" },
  { value: "pods/portforward", label: "pods/portforward", group: "core" },
  { value: "services", label: "services", group: "core" },
  { value: "endpoints", label: "endpoints", group: "core" },
  { value: "configmaps", label: "configmaps", group: "core" },
  { value: "secrets", label: "secrets", group: "core" },
  { value: "nodes", label: "nodes", group: "core" },
  { value: "persistentvolumes", label: "persistentvolumes", group: "core" },
  { value: "persistentvolumeclaims", label: "persistentvolumeclaims", group: "core" },
  { value: "events", label: "events", group: "core" },
  { value: "deployments", label: "deployments", group: "apps" },
  { value: "replicasets", label: "replicasets", group: "apps" },
  { value: "statefulsets", label: "statefulsets", group: "apps" },
  { value: "daemonsets", label: "daemonsets", group: "apps" },
  { value: "jobs", label: "jobs", group: "batch" },
  { value: "cronjobs", label: "cronjobs", group: "batch" },
  { value: "networkpolicies", label: "networkpolicies", group: "networking" },
  { value: "ingresses", label: "ingresses", group: "networking" },
  { value: "roles", label: "roles", group: "rbac" },
  { value: "rolebindings", label: "rolebindings", group: "rbac" },
  { value: "clusterroles", label: "clusterroles", group: "rbac" },
  { value: "clusterrolebindings", label: "clusterrolebindings", group: "rbac" },
  { value: "podsecuritypolicies", label: "podsecuritypolicies", group: "policy" },
  { value: "storageclasses", label: "storageclasses", group: "storage" },
  { value: "horizontalpodautoscalers", label: "horizontalpodautoscalers", group: "autoscaling" },
];

interface AccessRule {
  id: string;
  apiGroup: string; // already JSON-quoted, e.g. '""' or '"apps"'
  resources: string[];
  verbs: Verb[];
  resourceNames: string[];
}

interface RbacRoleDef {
  id: string;
  kind: "Role" | "ClusterRole";
  name: string;
  namespace?: string;
  description: string;
  rules: AccessRule[];
}

interface RbacBindingDef {
  id: string;
  bindingName: string;
  bindingKind: "RoleBinding" | "ClusterRoleBinding";
  bindingNamespace: string | null; // null for ClusterRoleBinding
  roleRefId: string;
  subjectKind: "User" | "Group" | "ServiceAccount";
  subjectName: string;
  subjectNamespace?: string; // ServiceAccount only
}

type SubjectKind = "User" | "Group" | "ServiceAccount";

interface EvalRequest {
  subjectKind: SubjectKind;
  subjectName: string;
  subjectNamespace?: string;
  namespace: string;
  apiGroup: string;
  resource: string;
  verb: string;
  resourceName: string; // may be empty
}

interface EvalBindingRow {
  id: string;
  bindingName: string;
  scopeLabel: string;
  roleLabel: string;
  verdict: "ALLOW" | "SKIP";
  matchedRule?: AccessRule;
  hint?: string;
}

interface MatrixRow {
  key: string;
  apiGroup: string;
  resource: string;
  verbs: Verb[];
}

// ==========================================================================
// MOCK CLUSTER DATA — a small reusable RBAC landscape used by the binding
// configurator, the evaluator, and the ServiceAccount module.
// ==========================================================================

const mkRule = (id: string, apiGroup: string, resources: string[], verbs: Verb[], resourceNames?: string[]): AccessRule => ({
  id,
  apiGroup,
  resources,
  verbs,
  resourceNames: resourceNames ?? [],
});

const ROLE_CATALOG: RbacRoleDef[] = [
  {
    id: "ci-workload",
    kind: "Role",
    name: "ci-workload",
    namespace: "ci-system",
    description: "Lets the CI pipeline manage its own workload objects inside ci-system.",
    rules: [
      mkRule("ciw-1", '""', ["pods", "pods/log"], ["get", "list", "watch", "create", "update", "delete"]),
      mkRule("ciw-2", '"apps"', ["deployments", "replicasets"], ["get", "list", "watch", "create", "update", "patch"]),
      mkRule("ciw-3", '""', ["configmaps"], ["get", "list", "watch", "create", "update"]),
      mkRule("ciw-4", '""', ["services"], ["get", "list", "watch", "create"]),
    ],
  },
  {
    id: "node-reader",
    kind: "ClusterRole",
    name: "node-reader",
    description: "Cluster-wide read-only visibility into nodes and pods.",
    rules: [
      mkRule("nr-1", '""', ["nodes", "pods", "services", "endpoints"], ["get", "list", "watch"]),
      mkRule("nr-2", '"apps"', ["deployments", "statefulsets", "daemonsets"], ["get", "list", "watch"]),
    ],
  },
  {
    id: "payments-secret-reader",
    kind: "Role",
    name: "payments-secret-reader",
    namespace: "payments",
    description: "Reads ONLY the named payment-api-creds secret — resourceNames scoping.",
    rules: [mkRule("psr-1", '""', ["secrets"], ["get", "list"], ["payment-api-creds"])],
  },
  {
    id: "logs-viewer",
    kind: "Role",
    name: "logs-viewer",
    namespace: "payments",
    description: "Streams container logs from pods in the payments namespace.",
    rules: [mkRule("lv-1", '""', ["pods", "pods/log"], ["get", "list", "watch"])],
  },
  {
    id: "app-viewer",
    kind: "ClusterRole",
    name: "app-viewer",
    description: "Read-only access to application resources anywhere in the cluster.",
    rules: [
      mkRule("av-1", '""', ["pods", "services", "configmaps"], ["get", "list", "watch"]),
      mkRule("av-2", '"apps"', ["deployments", "statefulsets", "daemonsets", "replicasets"], ["get", "list", "watch"]),
    ],
  },
  {
    id: "cluster-admin",
    kind: "ClusterRole",
    name: "cluster-admin",
    description: "Wildcard superuser role — grants everything on every resource.",
    rules: [mkRule("ca-1", '"*"', ["*"], ["*"])],
  },
];

const ROLE_BY_ID = (id: string): RbacRoleDef => ROLE_CATALOG.find((r) => r.id === id) ?? ROLE_CATALOG[0];

const INITIAL_BINDINGS: RbacBindingDef[] = [
  {
    id: "b1",
    bindingName: "ci-builder-workloads",
    bindingKind: "RoleBinding",
    bindingNamespace: "ci-system",
    roleRefId: "ci-workload",
    subjectKind: "ServiceAccount",
    subjectName: "ci-builder",
    subjectNamespace: "ci-system",
  },
  {
    id: "b2",
    bindingName: "ci-builder-node-ro",
    bindingKind: "ClusterRoleBinding",
    bindingNamespace: null,
    roleRefId: "node-reader",
    subjectKind: "ServiceAccount",
    subjectName: "ci-builder",
    subjectNamespace: "ci-system",
  },
  {
    id: "b3",
    bindingName: "payments-app-secrets-read",
    bindingKind: "RoleBinding",
    bindingNamespace: "payments",
    roleRefId: "payments-secret-reader",
    subjectKind: "ServiceAccount",
    subjectName: "payments-app",
    subjectNamespace: "payments",
  },
  {
    id: "b4",
    bindingName: "payments-app-logs",
    bindingKind: "RoleBinding",
    bindingNamespace: "payments",
    roleRefId: "logs-viewer",
    subjectKind: "ServiceAccount",
    subjectName: "payments-app",
    subjectNamespace: "payments",
  },
  {
    id: "b5",
    bindingName: "alice-cluster-admin",
    bindingKind: "ClusterRoleBinding",
    bindingNamespace: null,
    roleRefId: "cluster-admin",
    subjectKind: "User",
    subjectName: "alice",
  },
  {
    id: "b6",
    bindingName: "dev-team-edge-viewer",
    bindingKind: "RoleBinding",
    bindingNamespace: "edge",
    roleRefId: "app-viewer",
    subjectKind: "Group",
    subjectName: "dev-team",
  },
  {
    id: "b7",
    bindingName: "audit-cron-cluster-read",
    bindingKind: "ClusterRoleBinding",
    bindingNamespace: null,
    roleRefId: "app-viewer",
    subjectKind: "ServiceAccount",
    subjectName: "audit-cron",
    subjectNamespace: "monitoring",
  },
  {
    id: "b8",
    bindingName: "payments-app-node-reader",
    bindingKind: "ClusterRoleBinding",
    bindingNamespace: null,
    roleRefId: "node-reader",
    subjectKind: "ServiceAccount",
    subjectName: "payments-app",
    subjectNamespace: "payments",
  },
];

// --- Pod Security Standards reference data ---
type StanceKey = "privileged" | "baseline" | "restricted";
type PssLevel = "allowed" | "limited" | "prohibited";

const PSS_STANCE_LABEL: Record<StanceKey, string> = {
  privileged: "Privileged",
  baseline: "Baseline",
  restricted: "Restricted",
};

const PSS_STANCE_ORDER: StanceKey[] = ["privileged", "baseline", "restricted"];

const PSS_CONTROLS: { id: string; label: string; detail: string; levels: Record<StanceKey, PssLevel> }[] = [
  { id: "priv-containers", label: "Privileged Containers", detail: "privileged: true", levels: { privileged: "allowed", baseline: "prohibited", restricted: "prohibited" } },
  { id: "host-namespaces", label: "Host Namespaces", detail: "hostPID / hostIPC: true", levels: { privileged: "allowed", baseline: "prohibited", restricted: "prohibited" } },
  { id: "host-network-ports", label: "Host Network & Ports", detail: "hostNetwork: true", levels: { privileged: "allowed", baseline: "prohibited", restricted: "prohibited" } },
  { id: "hostpath", label: "HostPath Volumes", detail: "mount path from host filesystem", levels: { privileged: "allowed", baseline: "prohibited", restricted: "prohibited" } },
  { id: "priv-esc", label: "Privilege Escalation", detail: "allowPrivilegeEscalation: false", levels: { privileged: "allowed", baseline: "prohibited", restricted: "prohibited" } },
  { id: "capabilities", label: "Linux Capabilities", detail: "Drop ALL, may add NET_BIND_SERVICE only", levels: { privileged: "allowed", baseline: "limited", restricted: "limited" } },
  { id: "seccomp", label: "Seccomp", detail: "RuntimeDefault / Localhost", levels: { privileged: "allowed", baseline: "allowed", restricted: "prohibited" } },
  { id: "nonroot", label: "runAsNonRoot", detail: "runAsNonRoot: true", levels: { privileged: "allowed", baseline: "allowed", restricted: "prohibited" } },
  { id: "runasuser", label: "runAsUser ≠ 0", detail: "non-zero UID at runtime", levels: { privileged: "allowed", baseline: "allowed", restricted: "prohibited" } },
  { id: "selinux", label: "SELinux", detail: "type container_t only", levels: { privileged: "allowed", baseline: "limited", restricted: "limited" } },
];

// ==========================================================================
// YAML TEXT BUILDERS
// ==========================================================================

const buildRoleYaml = (kind: "Role" | "ClusterRole", name: string, namespace: string, rules: AccessRule[]): string => {
  const scopeLine = kind === "Role" ? `  namespace: ${namespace}` : "";
  const rulesBlock = rules.length
    ? rules
        .map((r) => `  - apiGroups: [${r.apiGroup}]
    resources: [${r.resources.map((res) => `"${res}"`).join(", ")}]
    verbs: [${r.verbs.map((v) => `"${v}"`).join(", ")}]${r.resourceNames.length > 0 ? `\n    resourceNames: [${r.resourceNames.map((n) => `"${n}"`).join(", ")}]` : ""}`)
        .join("\n")
    : "  # no rules — this role grants NOTHING (least privilege)";
  return `apiVersion: rbac.authorization.k8s.io/v1
kind: ${kind}
metadata:
  name: ${name}${scopeLine ? `\n${scopeLine}` : ""}
rules:
${rulesBlock}`;
};

// Fallback used when the rules array is empty
const buildRoleYamlFallback = (kind: "Role" | "ClusterRole", name: string, namespace: string): string => {
  const scopeLine = kind === "Role" ? `  namespace: ${namespace}` : "";
  return `apiVersion: rbac.authorization.k8s.io/v1
kind: ${kind}
metadata:
  name: ${name}${scopeLine ? `\n${scopeLine}` : ""}
rules:
  []  # no rules — this role grants NOTHING (least privilege)`;
};

const buildBindingYaml = (
  bindingKind: "RoleBinding" | "ClusterRoleBinding",
  bindingName: string,
  bindingNamespace: string,
  roleRef: RbacRoleDef,
  subjectKind: SubjectKind,
  subjectName: string,
  subjectNamespace: string
): string => {
  const scopeLine = bindingKind === "RoleBinding" ? `  namespace: ${bindingNamespace}` : "";
  const subjects =
    subjectKind === "ServiceAccount"
      ? `subjects:
  - kind: ServiceAccount
    name: ${subjectName}
    namespace: ${subjectNamespace}`
      : `subjects:
  - kind: ${subjectKind}
    name: ${subjectName}`;
  return `apiVersion: rbac.authorization.k8s.io/v1
kind: ${bindingKind}
metadata:
  name: ${bindingName}${scopeLine ? `\n${scopeLine}` : ""}
${subjects}
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ${roleRef.kind}
  name: ${roleRef.name}`;
};

const buildSaYaml = (name: string, namespace: string, automount: boolean, pullSecrets: string[]): string =>
  `apiVersion: v1
kind: ServiceAccount
metadata:
  name: ${name}
  namespace: ${namespace}
automountServiceAccountToken: ${automount}${pullSecrets.length > 0 ? `\nimagePullSecrets:\n${pullSecrets.map((s) => `  - name: ${s}`).join("\n")}` : ""}`;

const buildSaPodYaml = (name: string, namespace: string, saName: string, automount: boolean, pullSecrets: string[], image: string): string =>
  `apiVersion: v1
kind: Pod
metadata:
  name: ${name}
  namespace: ${namespace}
spec:
  serviceAccountName: ${saName}
  automountServiceAccountToken: ${automount}${pullSecrets.length > 0 ? `\n  imagePullSecrets:\n${pullSecrets.map((s) => `    - name: ${s}`).join("\n")}` : ""}
  containers:
    - name: ${name}
      image: ${image}`;

const buildPssNamespaceYaml = (namespace: string, stance: StanceKey, mode: "enforce" | "warn" | "audit"): string =>
  `apiVersion: v1
kind: Namespace
metadata:
  name: ${namespace}
  labels:
    pod-security.kubernetes.io/${mode}: ${stance}
    pod-security.kubernetes.io/${mode}-version: v1.30`;

const CAP_OPTIONS = ["NET_BIND_SERVICE", "NET_ADMIN", "SYS_ADMIN", "DAC_OVERRIDE", "CHOWN", "SYS_PTRACE", "AUDIT_WRITE", "SYS_CHROOT"];

// ==========================================================================
// SECTION COMPONENT
// ==========================================================================

export default function DkRbacSecuritySection() {
  // ------------------------------------------------------------------
  // MODULE 1 STATE: Role / ClusterRole Builder
  // ------------------------------------------------------------------
  const [roleKind, setRoleKind] = useState<"Role" | "ClusterRole">("Role");
  const [roleName, setRoleName] = useState<string>("deployment-manager");
  const [roleNamespace, setRoleNamespace] = useState<string>("ci-system");
  const [rules, setRules] = useState<AccessRule[]>([
    mkRule("seed-1", '""', ["pods", "pods/log"], ["get", "list", "watch", "create", "delete"]),
    mkRule("seed-2", '"apps"', ["deployments", "replicasets"], ["get", "list", "watch", "create", "update", "patch"]),
  ]);

  const [ruleApiGroup, setRuleApiGroup] = useState<ApiGroupKey>("core");
  const [ruleResources, setRuleResources] = useState<string[]>(["pods"]);
  const [ruleVerbs, setRuleVerbs] = useState<Verb[]>(["get", "list"]);
  const [ruleResourceNames, setRuleResourceNames] = useState<string>("");
  const [copiedRoleYaml, setCopiedRoleYaml] = useState(false);

  const addRule = (e: React.FormEvent) => {
    e.preventDefault();
    const resNames = ruleResourceNames.split(",").map((s) => s.trim()).filter(Boolean);
    setRules((prev) => [
      ...prev,
      {
        id: `rule-${Date.now()}`,
        apiGroup: API_GROUPS[ruleApiGroup].apiGroup,
        resources: ruleResources,
        verbs: ruleVerbs,
        resourceNames: resNames,
      },
    ]);
    setRuleResources(["pods"]);
    setRuleVerbs(["get", "list"]);
    setRuleResourceNames("");
  };

  const applyRolePreset = (presetId: string) => {
    const presets: Record<string, AccessRule[]> = {
      viewer: [
        mkRule("p1", '""', ["pods", "services", "configmaps"], ["get", "list", "watch"]),
        mkRule("p2", '"apps"', ["deployments", "replicasets"], ["get", "list", "watch"]),
      ],
      deployer: [
        mkRule("p3", '""', ["pods", "pods/log", "configmaps", "services"], ["get", "list", "watch", "create", "update"]),
        mkRule("p4", '"apps"', ["deployments", "replicasets", "statefulsets"], ["get", "list", "watch", "create", "update", "patch"]),
      ],
      exec: [mkRule("p5", '""', ["pods", "pods/exec"], ["get", "list", "create"])],
      secret: [mkRule("p6", '""', ["secrets"], ["get", "list"], ["payment-api-creds"])],
      admin: [mkRule("p7", '"*"', ["*"], ["*"])],
    };
    setRules(presets[presetId] ?? []);
  };

  const generatedRoleYaml = useMemo(
    () => (rules.length > 0 ? buildRoleYaml(roleKind, roleName, roleNamespace, rules) : buildRoleYamlFallback(roleKind, roleName, roleNamespace)),
    [roleKind, roleName, roleNamespace, rules]
  );

  // ------------------------------------------------------------------
  // MODULE 2 STATE: RoleBinding / ClusterRoleBinding Configurator
  // ------------------------------------------------------------------
  const [bindingKind, setBindingKind] = useState<"RoleBinding" | "ClusterRoleBinding">("RoleBinding");
  const [bindingName, setBindingName] = useState<string>("ci-builder-workloads");
  const [bindingNamespace, setBindingNamespace] = useState<string>("ci-system");
  const [bindingRoleId, setBindingRoleId] = useState<string>("ci-workload");
  const [bindingSubjectKind, setBindingSubjectKind] = useState<SubjectKind>("ServiceAccount");
  const [bindingSubjectName, setBindingSubjectName] = useState<string>("ci-builder");
  const [bindingSubjectNamespace, setBindingSubjectNamespace] = useState<string>("ci-system");
  const [copiedBindingYaml, setCopiedBindingYaml] = useState(false);

  const bindingRole = useMemo(() => ROLE_BY_ID(bindingRoleId), [bindingRoleId]);

  const bindingErrors = useMemo(() => {
    const errs: string[] = [];
    if (bindingKind === "ClusterRoleBinding" && bindingRole.kind === "Role") {
      errs.push("ClusterRoleBinding may only reference a ClusterRole — bind to a ClusterRole or switch to RoleBinding.");
    }
    if (bindingKind === "RoleBinding" && bindingRole.kind === "Role" && bindingRole.namespace !== bindingNamespace) {
      errs.push(`RoleBinding must live in the same namespace as its Role ("${bindingRole.namespace}" ≠ "${bindingNamespace}").`);
    }
    if (bindingSubjectKind === "ServiceAccount" && bindingSubjectNamespace.trim() === "") {
      errs.push("ServiceAccount subjects require a namespace.");
    }
    if (bindingSubjectName.trim() === "" || bindingName.trim() === "") {
      errs.push("Binding and subject names are required.");
    }
    return errs;
  }, [bindingKind, bindingRole, bindingNamespace, bindingSubjectKind, bindingSubjectNamespace, bindingSubjectName, bindingName]);

  const generatedBindingYaml = useMemo(
    () => buildBindingYaml(bindingKind, bindingName, bindingNamespace, bindingRole, bindingSubjectKind, bindingSubjectName, bindingSubjectNamespace),
    [bindingKind, bindingName, bindingNamespace, bindingRole, bindingSubjectKind, bindingSubjectName, bindingSubjectNamespace]
  );

  // ------------------------------------------------------------------
  // MODULE 3 STATE: Permission Evaluator
  // ------------------------------------------------------------------
  const [enabledBindingIds, setEnabledBindingIds] = useState<string[]>(INITIAL_BINDINGS.map((b) => b.id));
  const [evalRequest, setEvalRequest] = useState<EvalRequest>({
    subjectKind: "ServiceAccount",
    subjectName: "ci-builder",
    subjectNamespace: "ci-system",
    namespace: "ci-system",
    apiGroup: '""',
    resource: "pods",
    verb: "create",
    resourceName: "",
  });

  const presetRequests: { label: string; req: EvalRequest }[] = [
    { label: "ci-builder creates pod · ci-system", req: { subjectKind: "ServiceAccount", subjectName: "ci-builder", subjectNamespace: "ci-system", namespace: "ci-system", apiGroup: '""', resource: "pods", verb: "create", resourceName: "" } },
    { label: "ci-builder deletes secret · payments", req: { subjectKind: "ServiceAccount", subjectName: "ci-builder", subjectNamespace: "ci-system", namespace: "payments", apiGroup: '""', resource: "secrets", verb: "delete", resourceName: "" } },
    { label: "payments-app gets pinned secret", req: { subjectKind: "ServiceAccount", subjectName: "payments-app", subjectNamespace: "payments", namespace: "payments", apiGroup: '""', resource: "secrets", verb: "get", resourceName: "payment-api-creds" } },
    { label: "payments-app gets ANY secret", req: { subjectKind: "ServiceAccount", subjectName: "payments-app", subjectNamespace: "payments", namespace: "payments", apiGroup: '""', resource: "secrets", verb: "get", resourceName: "" } },
    { label: "alice deletes deployment · kube-system", req: { subjectKind: "User", subjectName: "alice", namespace: "kube-system", apiGroup: '"apps"', resource: "deployments", verb: "delete", resourceName: "" } },
    { label: "dev-team creates ingress · edge", req: { subjectKind: "Group", subjectName: "dev-team", namespace: "edge", apiGroup: '"networking.k8s.io"', resource: "ingresses", verb: "create", resourceName: "" } },
    { label: "ci-builder watches nodes · kube-system", req: { subjectKind: "ServiceAccount", subjectName: "ci-builder", subjectNamespace: "ci-system", namespace: "kube-system", apiGroup: '""', resource: "nodes", verb: "watch", resourceName: "" } },
  ];

  const subjectMatches = (binding: RbacBindingDef, req: EvalRequest): boolean => {
    if (binding.subjectKind !== req.subjectKind) return false;
    if (binding.subjectName !== req.subjectName) return false;
    if (req.subjectKind === "ServiceAccount" && binding.subjectNamespace !== req.subjectNamespace) return false;
    return true;
  };

  const ruleMatches = (rule: AccessRule, req: EvalRequest): boolean => {
    if (rule.apiGroup !== '"*"' && rule.apiGroup !== req.apiGroup) return false;
    if (!rule.resources.some((r) => r === "*" || r === req.resource)) return false;
    if (!rule.verbs.some((v) => v === "*" || v === req.verb)) return false;
    if (rule.resourceNames.length > 0) {
      if (req.resourceName === "") return false;
      if (!rule.resourceNames.includes(req.resourceName)) return false;
    }
    return true;
  };

  const blockHint = (rule: AccessRule, req: EvalRequest): string | undefined => {
    if (rule.resourceNames.length > 0 && req.resourceName !== "" && !rule.resourceNames.includes(req.resourceName)) {
      return `resourceNames pins grants to [${rule.resourceNames.join(", ")}] only`;
    }
    if (!rule.verbs.some((v) => v === "*" || v === req.verb)) {
      return `verb '${req.verb}' not granted (this rule grants: ${rule.verbs.join(", ")})`;
    }
    if (!rule.resources.some((r) => r === "*" || r === req.resource)) {
      return `resource '${req.resource}' not covered by [${rule.resources.join(", ")}]`;
    }
    if (rule.apiGroup !== '"*"' && rule.apiGroup !== req.apiGroup) {
      return `apiGroup ${req.apiGroup} not covered (this rule targets ${rule.apiGroup})`;
    }
    return `no rule extends the requested verb on '${req.resource}'`;
  };

  const evaluate = useMemo(() => {
    const req = evalRequest;
    const rows: EvalBindingRow[] = [];
    const allowedNames: string[] = [];
    let allowed = false;

    const candidateBindings = INITIAL_BINDINGS.filter((b) => enabledBindingIds.includes(b.id) && subjectMatches(b, req));

    for (const binding of candidateBindings) {
      const role = ROLE_BY_ID(binding.roleRefId);
      const scopeOk = binding.bindingKind === "ClusterRoleBinding" || binding.bindingNamespace === req.namespace;
      const scopeLabel = binding.bindingKind === "ClusterRoleBinding" ? "cluster-wide" : `ns/${binding.bindingNamespace}`;
      const roleLabel = `${role.kind} ${role.name}${role.namespace ? ` (ns/${role.namespace})` : ""}`;

      if (!scopeOk) {
        rows.push({
          id: binding.id,
          bindingName: binding.bindingName,
          scopeLabel,
          roleLabel,
          verdict: "SKIP",
          hint: `namespaced binding only grants inside ns/${binding.bindingNamespace}`,
        });
        continue;
      }

      const matched = role.rules.find((r) => ruleMatches(r, req));
      if (matched) {
        allowed = true;
        allowedNames.push(binding.bindingName);
        rows.push({
          id: binding.id,
          bindingName: binding.bindingName,
          scopeLabel,
          roleLabel,
          verdict: "ALLOW",
          matchedRule: matched,
        });
      } else {
        const hint = role.rules.length > 0 ? blockHint(role.rules[0], req) : "role contains no rules";
        rows.push({
          id: binding.id,
          bindingName: binding.bindingName,
          scopeLabel,
          roleLabel,
          verdict: "SKIP",
          hint,
        });
      }
    }

    // Aggregated effective permission matrix for the chosen subject (cluster + request-namespace scope)
    const matrixMap = new Map<string, Set<Verb>>();
    for (const binding of INITIAL_BINDINGS) {
      if (!enabledBindingIds.includes(binding.id)) continue;
      if (!subjectMatches(binding, req)) continue;
      const scopeOk = binding.bindingKind === "ClusterRoleBinding" || binding.bindingNamespace === req.namespace;
      if (!scopeOk) continue;
      const role = ROLE_BY_ID(binding.roleRefId);
      for (const r of role.rules) {
const key = `${r.apiGroup}|${r.resources.join("+")}`;
        const verbSet = matrixMap.get(key) ?? new Set<Verb>();
        r.verbs.forEach((v) => verbSet.add(v));
        matrixMap.set(key, verbSet);
      }
    }
    const matrix: MatrixRow[] = Array.from(matrixMap.entries())
      .map(([key, verbs]) => ({
        key,
        apiGroup: key.split("|")[0],
        resource: key.split("|")[1],
        verbs: Array.from(verbs).sort(),
      }))
      .sort((a, b) => a.apiGroup.localeCompare(b.apiGroup) || a.resource.localeCompare(b.resource));

    const clusterAdminCount = candidateBindings.filter((b) => b.roleRefId === "cluster-admin").length;

    return { allowed, rows, matrix, clusterAdminCount, candidateCount: candidateBindings.length, allowedNames };
  }, [evalRequest, enabledBindingIds]);

  const subjectLabel = evalRequest.subjectKind === "ServiceAccount" ? `${evalRequest.subjectName}@${evalRequest.subjectNamespace ?? ""}` : `${evalRequest.subjectKind} ${evalRequest.subjectName}`;

  // ------------------------------------------------------------------
  // MODULE 4 STATE: ServiceAccount & Pod Association
  // ------------------------------------------------------------------
  const [saName, setSaName] = useState<string>("ci-builder");
  const [saNamespace, setSaNamespace] = useState<string>("ci-system");
  const [automountToken, setAutomountToken] = useState<boolean>(true);
  const [useImagePullSecrets, setUseImagePullSecrets] = useState<boolean>(true);
  const [pullSecretName, setPullSecretName] = useState<string>("registry-creds");
  const [podName, setPodName] = useState<string>("ci-builder-pod");
  const [podImage, setPodImage] = useState<string>("registry.company.io/ci-agent:v2.3");
  const [copiedSaYaml, setCopiedSaYaml] = useState(false);
  const [copiedSaPodYaml, setCopiedSaPodYaml] = useState(false);

  const pullSecretList = useMemo(
    () => (useImagePullSecrets ? [pullSecretName.trim() !== "" ? pullSecretName.trim() : "registry-creds"] : []),
    [useImagePullSecrets, pullSecretName]
  );

  const saYaml = useMemo(() => buildSaYaml(saName, saNamespace, automountToken, pullSecretList), [saName, saNamespace, automountToken, pullSecretList]);
  const saPodYaml = useMemo(() => buildSaPodYaml(podName, saNamespace, saName, automountToken, pullSecretList, podImage), [podName, saNamespace, saName, automountToken, pullSecretList, podImage]);

  // ------------------------------------------------------------------
  // MODULE 5 STATE: Pod Security Standards
  // ------------------------------------------------------------------
  const [pssStance, setPssStance] = useState<StanceKey>("restricted");
  const [pssMode, setPssMode] = useState<"enforce" | "warn" | "audit">("enforce");
  const [pssNamespace, setPssNamespace] = useState<string>("payments");
  const [copiedPssYaml, setCopiedPssYaml] = useState(false);

  // Candidate Pod shape (what you are about to run in the namespace)
  const [podPrivileged, setPodPrivileged] = useState<boolean>(true);
  const [podPrivEsc, setPodPrivEsc] = useState<boolean>(true);
  const [podHostPath, setPodHostPath] = useState<boolean>(true);
  const [podHostNetwork, setPodHostNetwork] = useState<boolean>(true);
  const [podRunAsRoot, setPodRunAsRoot] = useState<boolean>(true);
  const [podSeccomp, setPodSeccomp] = useState<boolean>(false);
  const [podDropAll, setPodDropAll] = useState<boolean>(false);

  const podRiskRows = useMemo(
    () => [
      { label: "privileged: true", desc: "container runs with host kernel access", checked: podPrivileged, onToggle: () => setPodPrivileged((v) => !v) },
      { label: "allowPrivilegeEscalation: true", desc: "process may gain extra privileges", checked: podPrivEsc, onToggle: () => setPodPrivEsc((v) => !v) },
      { label: "HostPath volume", desc: "mounts a node filesystem path", checked: podHostPath, onToggle: () => setPodHostPath((v) => !v) },
      { label: "hostNetwork: true", desc: "shares the node network namespace", checked: podHostNetwork, onToggle: () => setPodHostNetwork((v) => !v) },
      { label: "runs as root (UID 0)", desc: "no runAsNonRoot / runAsUser set", checked: podRunAsRoot, onToggle: () => setPodRunAsRoot((v) => !v) },
      { label: "seccomp: Unconfined", desc: "no seccomp profile applied", checked: podSeccomp, onToggle: () => setPodSeccomp((v) => !v) },
      { label: "extra capabilities (no CAP_ALL drop)", desc: "Linux capabilities beyond NET_BIND_SERVICE", checked: !podDropAll, onToggle: () => setPodDropAll((v) => !v) },
    ],
    [podPrivileged, podPrivEsc, podHostPath, podHostNetwork, podRunAsRoot, podSeccomp, podDropAll]
  );

  const pssVerdict = useMemo(() => {
    const fails: string[] = [];
    if (pssStance === "baseline" || pssStance === "restricted") {
      if (podPrivileged) fails.push("Privileged containers are prohibited");
      if (podPrivEsc) fails.push("allowPrivilegeEscalation must be false");
      if (podHostNetwork) fails.push("hostNetwork is prohibited");
      if (podHostPath) fails.push("HostPath volumes are prohibited");
    }
    if (pssStance === "restricted") {
      if (podRunAsRoot) fails.push("runAsNonRoot: true and a non-zero runAsUser are required");
      if (!podSeccomp) fails.push("seccompProfile: RuntimeDefault or Localhost is required");
      if (!podDropAll) fails.push("capabilities must drop CAP_ALL (NET_BIND_SERVICE may be added)");
    }
    return { pass: fails.length === 0, fails };
  }, [pssStance, podPrivileged, podPrivEsc, podHostNetwork, podHostPath, podRunAsRoot, podSeccomp, podDropAll]);

  const pssYaml = useMemo(() => buildPssNamespaceYaml(pssNamespace, pssStance, pssMode), [pssNamespace, pssStance, pssMode]);

  // ------------------------------------------------------------------
  // MODULE 6 STATE: Security Context Configurator
  // ------------------------------------------------------------------
  const [secRunAsNonRoot, setSecRunAsNonRoot] = useState<boolean>(true);
  const [secRunAsUser, setSecRunAsUser] = useState<string>("1000");
  const [secRunAsGroup, setSecRunAsGroup] = useState<string>("3000");
  const [secPrivileged, setSecPrivileged] = useState<boolean>(false);
  const [secAllowEsc, setSecAllowEsc] = useState<boolean>(false);
  const [secReadOnlyRoot, setSecReadOnlyRoot] = useState<boolean>(true);
  const [secDropAllCaps, setSecDropAllCaps] = useState<boolean>(true);
  const [secAddCaps, setSecAddCaps] = useState<string[]>(["NET_BIND_SERVICE"]);
  const [secSeccomp, setSecSeccomp] = useState<"RuntimeDefault" | "Unconfined" | "Localhost">("RuntimeDefault");
  const [secFsGroup, setSecFsGroup] = useState<boolean>(true);
  const [secHostNetwork, setSecHostNetwork] = useState<boolean>(false);
  const [secHostPID, setSecHostPID] = useState<boolean>(false);
  const [secPodName, setSecPodName] = useState<string>("hardened-api");
  const [copiedSecYaml, setCopiedSecYaml] = useState(false);

  const secCtxYaml = useMemo(() => {
    const lines: string[] = [];
    lines.push("apiVersion: v1");
    lines.push("kind: Pod");
    lines.push("metadata:");
    lines.push(`  name: ${secPodName}`);
    lines.push("spec:");
    if (secHostNetwork) lines.push("  hostNetwork: true");
    if (secHostPID) lines.push("  hostPID: true");
    if (secFsGroup) {
      lines.push("  securityContext:");
      lines.push("    fsGroup: 2000");
    }
    lines.push("  containers:");
    lines.push("    - name: app");
    lines.push(`      image: registry:9090/${secPodName}:latest`);
    lines.push("      securityContext:");
    lines.push(`        privileged: ${secPrivileged}`);
    lines.push(`        allowPrivilegeEscalation: ${secAllowEsc}`);
    lines.push(`        readOnlyRootFilesystem: ${secReadOnlyRoot}`);
    lines.push(`        runAsNonRoot: ${secRunAsNonRoot}`);
    lines.push(`        runAsUser: ${secRunAsUser}`);
    lines.push(`        runAsGroup: ${secRunAsGroup}`);
    if (secDropAllCaps || secAddCaps.length > 0) {
      lines.push("        capabilities:");
      if (secDropAllCaps) lines.push('          drop: ["ALL"]');
      if (secAddCaps.length > 0) lines.push(`          add: [${secAddCaps.map((c) => `"${c}"`).join(", ")}]`);
    }
    lines.push("        seccompProfile:");
    lines.push(`          type: ${secSeccomp}`);
    return lines.join("\n");
  }, [secPodName, secHostNetwork, secHostPID, secFsGroup, secPrivileged, secAllowEsc, secReadOnlyRoot, secRunAsNonRoot, secRunAsUser, secRunAsGroup, secDropAllCaps, secAddCaps, secSeccomp]);

  const hardening = useMemo(() => {
    let score = 0;
    const issues: string[] = [];
    if (!secPrivileged) score += 10;
    else issues.push("privileged: true gives the container host-kernel access");
    if (!secAllowEsc) score += 10;
    else issues.push("allowPrivilegeEscalation is enabled");
    if (secRunAsNonRoot) score += 15;
    else issues.push("runAsNonRoot: false permits root execution");
    if (secRunAsUser !== "0") score += 10;
    else issues.push("runAsUser: 0 runs as root");
    if (secReadOnlyRoot) score += 8;
    else issues.push("readOnlyRootFilesystem: false");
    if (secDropAllCaps) score += 12;
    else issues.push("capabilities: ALL not dropped");
    if (secAddCaps.length === 0) score += 5;
    else score -= 2 * secAddCaps.length;
    if (secSeccomp === "RuntimeDefault") score += 12;
    else if (secSeccomp === "Localhost") score += 10;
    else issues.push("seccomp is Unconfined");
    if (secFsGroup) score += 5;
    if (!secHostNetwork) score += 6;
    else issues.push("hostNetwork exposes the node network to the container");
    if (!secHostPID) score += 5;
    else issues.push("hostPID leaks host processes into the container namespace");
    const grade = score >= 88 ? "A+" : score >= 78 ? "A" : score >= 62 ? "B" : score >= 45 ? "C" : "F";
    return { score: Math.max(0, Math.min(100, score)), grade, issues };
  }, [secPrivileged, secAllowEsc, secRunAsNonRoot, secRunAsUser, secReadOnlyRoot, secDropAllCaps, secAddCaps, secSeccomp, secFsGroup, secHostNetwork, secHostPID]);

  const gradeStyles: Record<string, string> = {
    "A+": "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700",
    A: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700",
    B: "bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-700",
    C: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700",
    F: "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-700",
  };

  const copy = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const copyButton = (label: string, copied: boolean, disabled?: boolean, onClick?: () => void) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-700 dark:hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-mono flex items-center gap-1.5 transition-colors"
    >
      {copied ? <span>✓ Copied</span> : <span>📋 {label}</span>}
    </button>
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className="space-y-16 pb-16">
      {/* Header Banner — sky/blue theme */}
      <div className="rounded-2xl bg-gradient-to-r from-sky-900 via-sky-800 to-sky-900 border border-sky-700 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-400/15 border border-sky-300/40 text-xs font-mono text-sky-200">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            Kubernetes Track Module • Security &amp; Authorization
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-50 tracking-tight">RBAC &amp; Cluster Hardening Simulator</h1>
          <p className="text-sm sm:text-base text-sky-100/85 max-w-3xl leading-relaxed">
            Design least-privilege Roles and Bindings, trace real authorization decisions through the RBAC chain, attach
            ServiceAccounts to Pods, apply Pod Security Standards, and harden security contexts — live in the browser.
          </p>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODULE 1: Role / ClusterRole Builder */}
      {/* ===================================================================== */}
      <section id="dk-rbac-roles" className="space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">Module 1 • Authorization Primitives</div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Role &amp; ClusterRole Builder</h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-sky-50 dark:bg-sky-900/30 px-3 py-1.5 rounded-lg border border-sky-200 dark:border-sky-700 text-sky-700 dark:text-sky-300">
            <span className="w-2 h-2 rounded-full bg-sky-600" />
            {roleKind === "Role" ? `Role · namespace ${roleNamespace}` : "ClusterRole · cluster-wide"}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left column: builder controls */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">1. Role Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(["Role", "ClusterRole"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setRoleKind(k)}
                    className={`p-3 rounded-xl border transition-all text-left ${
                      roleKind === k ? "bg-sky-50 dark:bg-sky-900/30 border-sky-400 ring-1 ring-sky-500" : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700 hover:border-sky-300"
                    }`}
                  >
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{k}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{k === "Role" ? "Scoped to one namespace" : "Applies cluster-wide"}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">2. Role Name</label>
              <div className="flex gap-2">
                <input
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="role-name"
                />
                {roleKind === "Role" && (
                  <input
                    value={roleNamespace}
                    onChange={(e) => setRoleNamespace(e.target.value)}
                    className="w-36 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="namespace"
                  />
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Namespaced Roles only affect resources in their own namespace.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">3. Quick Preset</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "viewer", label: "Read-Only Viewer" },
                  { id: "deployer", label: "CI Deployer" },
                  { id: "exec", label: "Pod Shell Access" },
                  { id: "secret", label: "Pinned Secret Reader" },
                  { id: "admin", label: "Full Admin" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyRolePreset(p.id)}
                    className="px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/30 hover:bg-sky-100 border border-sky-200 dark:border-sky-700 text-xs font-mono text-sky-700 dark:text-sky-300 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={addRule} className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-4">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">4. Add Access Rule</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block mb-1">API Group</label>
                  <select
                    value={ruleApiGroup}
                    onChange={(e) => {
                      setRuleApiGroup(e.target.value as ApiGroupKey);
                      setRuleResources((prev) => {
                        const group = e.target.value as ApiGroupKey;
                        return prev.every((r) => RESOURCE_OPTIONS.find((o) => o.value === r)?.group === group) ? prev : ["pods"];
                      });
                    }}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    {(Object.keys(API_GROUPS) as ApiGroupKey[]).map((k) => (
                      <option key={k} value={k}>
                        {API_GROUPS[k].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block mb-1">Resource Names (optional)</label>
                  <input
                    value={ruleResourceNames}
                    onChange={(e) => setRuleResourceNames(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="e.g. api-key, admin-secret"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block mb-1">Resources</label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {RESOURCE_OPTIONS.filter((o) => o.group === ruleApiGroup).map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setRuleResources((prev) => (prev.includes(o.value) ? prev.filter((v) => v !== o.value) : [...prev, o.value]))}
                      className={`px-2 py-1 rounded-md border text-[11px] font-mono transition-colors ${
                        ruleResources.includes(o.value) ? "bg-sky-600 text-white border-sky-600" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-300"
                      }`}
                    >
                      {o.value}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block mb-1">Verbs</label>
                <div className="flex flex-wrap gap-1.5">
                  {VERB_OPTIONS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setRuleVerbs((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))}
                      className={`px-2 py-1 rounded-md border text-[11px] font-mono transition-colors ${
                        ruleVerbs.includes(v) ? "bg-sky-600 text-white border-sky-600" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-300"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={ruleResources.length === 0 || ruleVerbs.length === 0}
                className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-700 dark:hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors"
              >
                + Add Rule
              </button>
            </form>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">5. Rules in this role</label>
              {rules.length === 0 && (
                <div className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-3 font-mono">
                  No rules — this role grants NOTHING (least privilege).
                </div>
              )}
              {rules.map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] font-mono text-slate-700 dark:text-slate-200 leading-relaxed">
                    <div className="text-sky-700 dark:text-sky-300 font-bold">apiGroups: [{r.apiGroup}]</div>
                    <div>
                      resources: [{r.resources.join(", ")}]
                      {r.resourceNames.length > 0 && <span className="text-amber-600 dark:text-amber-400"> · names: [{r.resourceNames.join(", ")}]</span>}
                    </div>
                    <div>verbs: [{r.verbs.join(", ")}]</div>
                  </div>
                  <button
                    onClick={() => setRules((prev) => prev.filter((x) => x.id !== r.id))}
                    className="shrink-0 px-2 py-1 rounded-md text-[10px] font-mono bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-700 text-rose-500 dark:text-rose-400 hover:bg-rose-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right column: YAML preview */}
          <div className="lg:col-span-7">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-mono text-slate-700 dark:text-slate-200">rbac.authorization.k8s.io/v1 · {roleKind}</span>
                {copyButton("Copy YAML", copiedRoleYaml, false, () => copy(generatedRoleYaml, setCopiedRoleYaml))}
              </div>
              <pre className="p-4 bg-[#0b1526] text-sky-100 text-xs leading-relaxed whitespace-pre overflow-x-auto min-h-[320px]">{generatedRoleYaml}</pre>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
              💡 <span className="font-mono text-sky-600 dark:text-sky-400">get/list/watch</span> is read-only, <span className="font-mono text-sky-600 dark:text-sky-400">create/update/patch</span> mutates,
              <span className="font-mono text-sky-600 dark:text-sky-400"> delete</span> destroys. Grant the least set the workload actually needs.
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* MODULE 2: RoleBinding / ClusterRoleBinding Configurator */}
      {/* ===================================================================== */}
      <section id="dk-rbac-bindings" className="space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">Module 2 • Subject Binding</div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">RoleBinding / ClusterRoleBinding Configurator</h2>
          </div>
          <div className="text-xs font-mono bg-sky-50 dark:bg-sky-900/30 px-3 py-1.5 rounded-lg border border-sky-200 dark:border-sky-700 text-sky-700 dark:text-sky-300">Subjects: User · Group · ServiceAccount</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls */}
          <div className="lg:col-span-5 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Binding Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(["RoleBinding", "ClusterRoleBinding"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setBindingKind(k)}
                    className={`p-3 rounded-xl border transition-all text-left ${
                      bindingKind === k ? "bg-sky-50 dark:bg-sky-900/30 border-sky-400 ring-1 ring-sky-500" : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700 hover:border-sky-300"
                    }`}
                  >
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{k}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{k === "RoleBinding" ? "Grants inside one namespace" : "Grants cluster-wide"}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Binding Name</label>
              <input
                value={bindingName}
                onChange={(e) => setBindingName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              {bindingKind === "RoleBinding" && (
                <input
                  value={bindingNamespace}
                  onChange={(e) => setBindingNamespace(e.target.value)}
                  placeholder="namespace"
                  className="w-full mt-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Reference Role / ClusterRole</label>
              <select
                value={bindingRoleId}
                onChange={(e) => setBindingRoleId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {ROLE_CATALOG.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.kind} · {r.name}
                    {r.namespace ? ` (ns/${r.namespace})` : " (cluster)"}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{bindingRole.description}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Subject</label>
              <div className="grid grid-cols-3 gap-2">
                {(["User", "Group", "ServiceAccount"] as SubjectKind[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setBindingSubjectKind(k)}
                    className={`px-2 py-1.5 rounded-lg border text-[11px] font-mono transition-colors ${
                      bindingSubjectKind === k ? "bg-sky-600 text-white border-sky-600" : "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-300"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <input
                value={bindingSubjectName}
                onChange={(e) => setBindingSubjectName(e.target.value)}
                placeholder="subject name"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              {bindingSubjectKind === "ServiceAccount" && (
                <input
                  value={bindingSubjectNamespace}
                  onChange={(e) => setBindingSubjectNamespace(e.target.value)}
                  placeholder="service account namespace"
                  className="w-full mt-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              )}
            </div>

            {bindingErrors.length > 0 && (
              <div className="space-y-1.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700">
                {bindingErrors.map((err, i) => (
                  <div key={i} className="text-[11px] font-mono text-rose-600 dark:text-rose-400">⛔ {err}</div>
                ))}
              </div>
            )}
          </div>

          {/* Diagram + YAML */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-2 flex-wrap p-4 rounded-xl bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700">
              <div className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-600 text-xs font-mono text-sky-800 dark:text-sky-200">
                {bindingSubjectKind === "ServiceAccount" ? `${bindingSubjectName}@${bindingSubjectNamespace || "?"}` : `${bindingSubjectKind} ${bindingSubjectName}`}
              </div>
              <span className="text-sky-400 dark:text-sky-300 font-bold">⇢</span>
              <div className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-600 text-xs font-mono text-sky-800 dark:text-sky-200">
                {bindingKind} “{bindingName}”
              </div>
              <span className="text-sky-400 dark:text-sky-300 font-bold">⇢</span>
              <div className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-600 text-xs font-mono text-sky-800 dark:text-sky-200">
                {bindingRole.kind} {bindingRole.name}
              </div>
              <span className="text-slate-400 dark:text-slate-500 text-[11px] font-mono ml-auto">
                scope: {bindingKind === "ClusterRoleBinding" ? "🌐 all namespaces" : `🗂 ns/${bindingNamespace}`}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-mono text-slate-700 dark:text-slate-200">Generated object</span>
                {copyButton("Copy YAML", copiedBindingYaml, bindingErrors.length > 0, () => copy(generatedBindingYaml, setCopiedBindingYaml))}
              </div>
              <pre className="p-4 bg-[#0b1526] text-sky-100 text-xs leading-relaxed whitespace-pre overflow-x-auto min-h-[220px]">{generatedBindingYaml}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* MODULE 3: Permission Evaluator */}
      {/* ===================================================================== */}
      <section id="dk-rbac-evaluator" className="space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">Module 3 • Live Authorization Engine</div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Permission Evaluator</h2>
          </div>
          <div className="text-xs font-mono bg-sky-50 dark:bg-sky-900/30 px-3 py-1.5 rounded-lg border border-sky-200 dark:border-sky-700 text-sky-700 dark:text-sky-300">RBAC request path simulation</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: request builder */}
          <div className="lg:col-span-5 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Request Presets</label>
              <div className="flex flex-wrap gap-2">
                {presetRequests.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setEvalRequest(p.req)}
                    className="px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/30 hover:bg-sky-100 border border-sky-200 dark:border-sky-700 text-[11px] font-mono text-sky-700 dark:text-sky-300 transition-colors text-left"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block mb-1">Subject</label>
                <select
                  value={evalRequest.subjectKind}
                  onChange={(e) => setEvalRequest({ ...evalRequest, subjectKind: e.target.value as SubjectKind })}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
                >
                  <option value="ServiceAccount">ServiceAccount</option>
                  <option value="User">User</option>
                  <option value="Group">Group</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block mb-1">Subject Name</label>
                <input
                  value={evalRequest.subjectName}
                  onChange={(e) => setEvalRequest({ ...evalRequest, subjectName: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
              {evalRequest.subjectKind === "ServiceAccount" && (
                <div>
                  <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block mb-1">SA Namespace</label>
                  <input
                    value={evalRequest.subjectNamespace ?? ""}
                    onChange={(e) => setEvalRequest({ ...evalRequest, subjectNamespace: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}
              <div>
                <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block mb-1">Request Namespace</label>
                <input
                  value={evalRequest.namespace}
                  onChange={(e) => setEvalRequest({ ...evalRequest, namespace: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block mb-1">Verb</label>
                <select
                  value={evalRequest.verb}
                  onChange={(e) => setEvalRequest({ ...evalRequest, verb: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
                >
                  {VERB_OPTIONS.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block mb-1">Resource</label>
                <select
                  value={evalRequest.resource}
                  onChange={(e) => setEvalRequest({ ...evalRequest, resource: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
                >
                  {RESOURCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.value}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block mb-1">API Group</label>
                <select
                  value={evalRequest.apiGroup}
                  onChange={(e) => setEvalRequest({ ...evalRequest, apiGroup: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
                >
                  {(Object.keys(API_GROUPS) as ApiGroupKey[]).map((k) => (
                    <option key={k} value={API_GROUPS[k].apiGroup}>{API_GROUPS[k].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block mb-1">Resource Name (optional)</label>
                <input
                  value={evalRequest.resourceName}
                  onChange={(e) => setEvalRequest({ ...evalRequest, resourceName: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
                  placeholder="e.g. payment-api-creds"
                />
              </div>
            </div>

            {/* Decision output */}
            <div className={`rounded-xl border p-4 ${evaluate.allowed ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700" : "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700"}`}>
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${evaluate.allowed ? "bg-emerald-500" : "bg-rose-500"} animate-pulse`} />
                <span className={`text-2xl font-extrabold font-mono ${evaluate.allowed ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {evaluate.allowed ? "ALLOW" : "DENY"}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto font-mono">{evaluate.candidateCount} binding{evaluate.candidateCount === 1 ? "" : "s"} evaluated</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                {evaluate.allowed
                  ? `Decision path: ${evaluate.allowedNames.slice(0, 3).join(" · ")}${evaluate.allowedNames.length > 3 ? " · …" : ""}`
                  : `No binding grants ${subjectLabel} the verb “${evalRequest.verb}” on “${evalRequest.resource}”${
                      evalRequest.resourceName ? ` named “${evalRequest.resourceName}”` : ""
                    } in ${evalRequest.apiGroup === '""' ? "core/v1" : evalRequest.apiGroup.replace(/"/g, "")} · ${evalRequest.namespace}. Kubernetes is deny-by-default.`}
              </p>
              {evaluate.clusterAdminCount > 0 && (
                <p className="text-[11px] font-mono text-amber-600 dark:text-amber-400 mt-2">⚠ Warning: subject holds a cluster-admin binding — excessive cluster-wide privilege.</p>
              )}
            </div>

            {/* Binding inventory toggles */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Binding Inventory (toggle bindings to simulate)</label>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {INITIAL_BINDINGS.map((b) => {
                  const active = enabledBindingIds.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      onClick={() => setEnabledBindingIds((prev) => (active ? prev.filter((i) => i !== b.id) : [...prev, b.id]))}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${
                        active ? "bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-700" : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700 opacity-60"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${active ? "bg-sky-500" : "bg-slate-300"}`} />
                      <span className="text-[11px] font-mono text-slate-700 dark:text-slate-200">
                        {b.bindingKind} <span className="text-slate-900 dark:text-slate-100 font-bold">{b.bindingName}</span>
                        {b.bindingKind === "RoleBinding" ? ` (ns/${b.bindingNamespace})` : " (cluster)"} → {ROLE_BY_ID(b.roleRefId).name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: decision trace + effective matrix */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-200">
                Request: {subjectLabel} · {evalRequest.verb} {evalRequest.resource}
                {evalRequest.resourceName ? ` named “${evalRequest.resourceName}”` : ""} · {evalRequest.apiGroup === '""' ? "core/v1" : evalRequest.apiGroup.replace(/"/g, "")} · {evalRequest.namespace}
              </div>
              <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
                {evaluate.rows.length === 0 && (
                  <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">No bindings match this subject in the cluster. Request is DENIED (no authorization path).</div>
                )}
                {evaluate.rows.map((row) => (
                  <div
                    key={row.id}
                    className={`p-2.5 rounded-lg border text-[11px] font-mono leading-relaxed ${
                      row.verdict === "ALLOW" ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700" : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${row.verdict === "ALLOW" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                        {row.verdict === "ALLOW" ? "✓ ALLOW" : "— skip"}
                      </span>
                      <span className="text-slate-700 dark:text-slate-200">
                        {row.bindingName} <span className="text-slate-400 dark:text-slate-500">({row.scopeLabel})</span>
                      </span>
                      <span className="ml-auto text-slate-400 dark:text-slate-500">{row.roleLabel}</span>
                    </div>
                    {row.verdict === "ALLOW" && row.matchedRule && (
                      <div className="text-emerald-700 dark:text-emerald-300 mt-1">
                        rule: apiGroups [{row.matchedRule.apiGroup}] · resources [{row.matchedRule.resources.join(", ")}] · verbs [{row.matchedRule.verbs.join(", ")}]
                      </div>
                    )}
                    {row.hint && <div className="text-slate-400 dark:text-slate-500 mt-1">hint: {row.hint}</div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-200">
                Effective permissions in request scope ({evaluate.matrix.length} entries)
              </div>
              <div className="p-4 max-h-64 overflow-y-auto">
                {evaluate.matrix.length === 0 ? (
                  <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">No effective permissions — subject has zero grants in this scope.</div>
                ) : (
                  <table className="w-full text-[11px] font-mono">
                    <thead>
                      <tr className="text-left text-slate-400 dark:text-slate-500 uppercase">
                        <th className="pb-2">API Group</th>
                        <th className="pb-2">Resource</th>
                        <th className="pb-2">Verbs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluate.matrix.map((m) => (
                        <tr key={m.key} className="border-t border-slate-100 dark:border-slate-700">
                          <td className="py-1.5 pr-2 text-sky-700 dark:text-sky-300">{m.apiGroup === '""' ? "core/v1" : m.apiGroup.replace(/"/g, "")}</td>
                          <td className="py-1.5 pr-2 text-slate-700 dark:text-slate-200">{m.resource}</td>
                          <td className="py-1.5">
                            <div className="flex flex-wrap gap-1">
                              {m.verbs.map((v) => (
                                <span key={v} className="px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 text-sky-700 dark:text-sky-300">{v}</span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* MODULE 4: ServiceAccount & Pod Association */}
      {/* ===================================================================== */}
      <section id="dk-rbac-serviceaccounts" className="space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">Module 4 • Workload Identity</div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">ServiceAccount &amp; Pod Association</h2>
          </div>
          <div className="text-xs font-mono bg-sky-50 dark:bg-sky-900/30 px-3 py-1.5 rounded-lg border border-sky-200 dark:border-sky-700 text-sky-700 dark:text-sky-300">Tokens mount at /var/run/secrets/kubernetes.io/serviceaccount</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block mb-1">ServiceAccount Name</label>
                <input value={saName} onChange={(e) => setSaName(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100" />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block mb-1">Namespace</label>
                <input value={saNamespace} onChange={(e) => setSaNamespace(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">automountServiceAccountToken</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Mount the identity token into every Pod using this SA</div>
                </div>
                <button
                  onClick={() => setAutomountToken((v) => !v)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 ${automountToken ? "bg-sky-500" : "bg-slate-300"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white dark:bg-slate-800 transition-transform ${automountToken ? "translate-x-6" : "translate-x-0"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">imagePullSecrets</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Pull images from a private registry</div>
                </div>
                <button
                  onClick={() => setUseImagePullSecrets((v) => !v)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 ${useImagePullSecrets ? "bg-sky-500" : "bg-slate-300"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white dark:bg-slate-800 transition-transform ${useImagePullSecrets ? "translate-x-6" : "translate-x-0"}`} />
                </button>
              </div>
              {useImagePullSecrets && (
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase">Secret</label>
                  <input value={pullSecretName} onChange={(e) => setPullSecretName(e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Target Pod</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block mb-1">Pod Name</label>
                  <input value={podName} onChange={(e) => setPodName(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block mb-1">Image</label>
                  <input value={podImage} onChange={(e) => setPodImage(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100" />
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 p-3">
              <div className="text-[10px] font-mono text-sky-600 dark:text-sky-400 uppercase mb-2">Token files projected by kubelet</div>
              <div className="flex gap-2 flex-wrap">
                <span className="px-2 py-1 bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 rounded text-[10px] font-mono text-sky-800 dark:text-sky-200">token</span>
                <span className="px-2 py-1 bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 rounded text-[10px] font-mono text-sky-800 dark:text-sky-200">ca.crt</span>
                <span className="px-2 py-1 bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 rounded text-[10px] font-mono text-sky-800 dark:text-sky-200">namespace</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                The API server authenticates in-cluster calls with this token — which ServiceAccount you bind decides what that Pod may do (Module 3).
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-mono text-slate-700 dark:text-slate-200">ServiceAccount YAML</span>
                {copyButton("Copy", copiedSaYaml, false, () => copy(saYaml, setCopiedSaYaml))}
              </div>
              <pre className="p-4 bg-[#0b1526] text-sky-100 text-xs leading-relaxed whitespace-pre overflow-x-auto min-h-[180px]">{saYaml}</pre>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-mono text-slate-700 dark:text-slate-200">Pod association</span>
                {copyButton("Copy YAML", copiedSaPodYaml, false, () => copy(saPodYaml, setCopiedSaPodYaml))}
              </div>
              <pre className="p-4 bg-[#0b1526] text-sky-100 text-xs leading-relaxed whitespace-pre overflow-x-auto min-h-[200px]">{saPodYaml}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* MODULE 5: Pod Security Standards */}
      {/* ===================================================================== */}
      <section id="dk-rbac-pss" className="space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">Module 5 • Admission Control</div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Pod Security Standards</h2>
          </div>
          <div className="text-xs font-mono bg-slate-50 dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">Privileged → Baseline → Restricted</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Namespace Policy Level</label>
              <div className="grid grid-cols-3 gap-2">
                {PSS_STANCE_ORDER.map((s) => (
                  <button
                    key={s}
                    onClick={() => setPssStance(s)}
                    className={`px-2 py-2 rounded-xl border text-xs font-bold transition-all ${
                      pssStance === s
                        ? s === "privileged"
                          ? "bg-slate-600 text-white border-slate-600"
                          : "bg-sky-600 text-white border-sky-600"
                        : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-sky-300"
                    }`}
                  >
                    {PSS_STANCE_LABEL[s]}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {(["enforce", "warn", "audit"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPssMode(m)}
                    className={`px-2 py-1.5 rounded-lg border text-[11px] font-mono transition-colors ${
                      pssMode === m ? "bg-sky-50 dark:bg-sky-900/30 border-sky-400 text-sky-700 dark:text-sky-300 font-bold" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase">Namespace</label>
                <input value={pssNamespace} onChange={(e) => setPssNamespace(e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {pssMode === "enforce"
                  ? "Enforce rejects non-compliant Pods at admission."
                  : pssMode === "warn"
                  ? "Warn surfaces an admission warning but still admits the Pod."
                  : "Audit records violations in the audit log without warnings."}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">My Pod’s Risk Profile</label>
              <div className="space-y-2">
                {podRiskRows.map((c) => (
                  <div key={c.label} className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="text-[11px] font-mono text-slate-800 dark:text-slate-200">{c.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{c.desc}</div>
                    </div>
                    <button
                      onClick={c.onToggle}
                      className={`w-12 h-6 rounded-full transition-colors relative p-1 ${c.checked ? "bg-rose-400" : "bg-sky-500"}`}
                      title={c.checked ? "risky — click to harden" : "secure"}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white dark:bg-slate-800 transition-transform ${c.checked ? "translate-x-6" : "translate-x-0"}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {/* Verdict */}
            <div className={`rounded-xl border p-4 ${pssVerdict.pass ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700" : "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700"}`}>
              <div className="flex items-center gap-3">
                <span className={`text-lg font-extrabold font-mono ${pssVerdict.pass ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {pssVerdict.pass ? "✓ POD ACCEPTED" : "✗ POD REJECTED"}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  against {PSS_STANCE_LABEL[pssStance]} policy in ns/{pssNamespace} ({pssMode})
                </span>
              </div>
              {!pssVerdict.pass ? (
                <ul className="mt-3 space-y-1 text-[11px] font-mono text-rose-600 dark:text-rose-400">
                  {pssVerdict.fails.map((f, i) => (
                    <li key={i}>• {f}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-300">
                  All controls of the {PSS_STANCE_LABEL[pssStance]} stance are satisfied — the Namespace label will admit this Pod.
                </p>
              )}
            </div>

            {/* Controls matrix */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-200">Controls enforced by each stance</div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-slate-400 dark:text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2 px-3">Control</th>
                    <th className="py-2 px-2 text-center">Privileged</th>
                    <th className="py-2 px-2 text-center">Baseline</th>
                    <th className="py-2 px-2 text-center">Restricted</th>
                  </tr>
                </thead>
                <tbody>
                  {PSS_CONTROLS.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 dark:border-slate-700 last:border-0">
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{c.label}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{c.detail}</div>
                      </td>
                      {PSS_STANCE_ORDER.map((s) => (
                        <td key={s} className="py-2 px-2 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                              c.levels[s] === "allowed"
                                ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700"
                                : c.levels[s] === "limited"
                                ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700"
                                : "bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 border-rose-200 dark:border-rose-700"
                            }`}
                          >
                            {c.levels[s] === "allowed" ? "✓" : c.levels[s] === "limited" ? "◐" : "✗"}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* YAML */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-mono text-slate-700 dark:text-slate-200">Namespace labels · {pssMode} mode</span>
                {copyButton("Copy YAML", copiedPssYaml, false, () => copy(pssYaml, setCopiedPssYaml))}
              </div>
              <pre className="p-4 bg-[#0b1526] text-sky-100 text-xs leading-relaxed whitespace-pre overflow-x-auto min-h-[160px]">{pssYaml}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* MODULE 6: Security Context Configurator */}
      {/* ===================================================================== */}
      <section id="dk-rbac-security-context" className="space-y-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <div className="text-xs font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">Module 6 • Runtime Hardening</div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Security Context Configurator</h2>
          </div>
          <div className={`flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg border ${gradeStyles[hardening.grade]}`}>
            Grade {hardening.grade} · {hardening.score}/100
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-5">
            {/* Container securityContext toggles */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Container securityContext</label>
              <div className="space-y-2">
                {[
                  { label: "privileged: true", desc: "host kernel access — never in production", checked: secPrivileged, risk: true, onToggle: () => setSecPrivileged((v) => !v) },
                  { label: "allowPrivilegeEscalation: true", desc: "process may gain additional privileges", checked: secAllowEsc, risk: true, onToggle: () => setSecAllowEsc((v) => !v) },
                  { label: "runAsNonRoot: true", desc: "refuse to start as UID 0", checked: secRunAsNonRoot, onToggle: () => setSecRunAsNonRoot((v) => !v) },
                  { label: "readOnlyRootFilesystem: true", desc: "root fs read-only, writes go to volumes", checked: secReadOnlyRoot, onToggle: () => setSecReadOnlyRoot((v) => !v) },
                  { label: "drop CAP_ALL capabilities", desc: "strip every Linux capability", checked: secDropAllCaps, onToggle: () => setSecDropAllCaps((v) => !v) },
                  { label: "hostNetwork: true", desc: "share the node network namespace", checked: secHostNetwork, risk: true, onToggle: () => setSecHostNetwork((v) => !v) },
                  { label: "hostPID: true", desc: "share host process namespace", checked: secHostPID, risk: true, onToggle: () => setSecHostPID((v) => !v) },
                  { label: "fsGroup: 2000", desc: "pod-level fsGroup ownership for volumes", checked: secFsGroup, onToggle: () => setSecFsGroup((v) => !v) },
                ].map((t) => (
                  <div key={t.label} className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="text-[11px] font-mono text-slate-800 dark:text-slate-200">{t.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{t.desc}</div>
                    </div>
                    <button
                      onClick={t.onToggle}
                      className={`w-12 h-6 rounded-full transition-colors relative p-1 ${t.checked ? (t.risk ? "bg-rose-400" : "bg-sky-500") : "bg-slate-300"}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white dark:bg-slate-800 transition-transform ${t.checked ? "translate-x-6" : "translate-x-0"}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Identities &amp; Capabilities</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block mb-1">runAsUser</label>
                  <select
                    value={secRunAsUser}
                    onChange={(e) => setSecRunAsUser(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
                  >
                    <option value="0">0 (root)</option>
                    <option value="1000">1000</option>
                    <option value="65534">65534 (nobody)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block mb-1">runAsGroup</label>
                  <select
                    value={secRunAsGroup}
                    onChange={(e) => setSecRunAsGroup(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
                  >
                    <option value="0">0 (root)</option>
                    <option value="3000">3000</option>
                    <option value="65534">65534</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block mb-1">seccompProfile</label>
                <select
                  value={secSeccomp}
                  onChange={(e) => setSecSeccomp(e.target.value as "RuntimeDefault" | "Unconfined" | "Localhost")}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
                >
                  <option value="RuntimeDefault">RuntimeDefault (recommended)</option>
                  <option value="Localhost">Localhost</option>
                  <option value="Unconfined">Unconfined</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block mb-1">Add Capabilities</label>
                <div className="flex flex-wrap gap-1.5">
                  {CAP_OPTIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSecAddCaps((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))}
                      className={`px-2 py-1 rounded-md border text-[11px] font-mono transition-colors ${
                        secAddCaps.includes(c) ? "bg-sky-600 text-white border-sky-600" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-300"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: score + YAML */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-200">Hardening assessment</div>
              <div className="p-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-20 h-20 rounded-2xl flex items-center justify-center text-xl font-extrabold font-mono border-2 ${
                      hardening.grade === "A+" || hardening.grade === "A"
                        ? "text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30"
                        : hardening.grade === "B"
                        ? "text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-600 bg-sky-50 dark:bg-sky-900/30"
                        : hardening.grade === "C"
                        ? "text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/30"
                        : "text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-600 bg-rose-50 dark:bg-rose-900/30"
                    }`}
                  >
                    {hardening.grade}
                  </div>
                  <div className="flex-1">
                    <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          hardening.grade === "F" ? "bg-rose-500" : hardening.grade === "C" ? "bg-amber-500" : hardening.grade === "B" ? "bg-sky-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${hardening.score}%` }}
                      />
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-1.5">{hardening.score}/100 hardening score</div>
                  </div>
                </div>
                {hardening.issues.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-[11px] font-mono text-rose-500 dark:text-rose-400">
                    {hardening.issues.map((iss, i) => (
                      <li key={i}>⚠ {iss}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">✓ No hardening issues detected — this Pod matches restricted-level best practice.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-700 dark:text-slate-200">Pod</span>
                  <input
                    value={secPodName}
                    onChange={(e) => setSecPodName(e.target.value)}
                    className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
                {copyButton("Copy YAML", copiedSecYaml, false, () => copy(secCtxYaml, setCopiedSecYaml))}
              </div>
              <pre className="p-4 bg-[#0b1526] text-sky-100 text-xs leading-relaxed whitespace-pre overflow-x-auto min-h-[320px]">{secCtxYaml}</pre>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}