import semverSatisfies from "semver/functions/satisfies";
import semverValid from "semver/functions/valid";
import semverValidRange from "semver/ranges/valid";

export type GitOpsTab = "git" | "actions" | "semver" | "deploy";

export const GITOPS_TAB_BY_HASH: Record<string, GitOpsTab> = {
  "git-branching": "git",
  "git-actions": "actions",
  "git-semver": "semver",
  "git-deploy": "deploy",
};

export const GITOPS_HASH_BY_TAB: Record<GitOpsTab, string> = {
  git: "git-branching",
  actions: "git-actions",
  semver: "git-semver",
  deploy: "git-deploy",
};

export type VersionBump = "MAJOR" | "MINOR" | "PATCH" | "NONE";

export interface CommitAnalysis {
  type: VersionBump;
  explanation: string;
}

const CONVENTIONAL_COMMIT_HEADER = /^([A-Za-z]+)(?:\(([^()\r\n]+)\))?(!)?:\s/;
const BREAKING_CHANGE_FOOTER = /(?:^|\n)BREAKING CHANGE:\s+\S/m;

export function analyzeCommitBump(message: string): CommitAnalysis {
  const header = message.match(CONVENTIONAL_COMMIT_HEADER);
  const hasBreakingChange = Boolean(header?.[3]) || BREAKING_CHANGE_FOOTER.test(message);

  if (hasBreakingChange) {
    return {
      type: "MAJOR",
      explanation: "Breaking API change detected in the commit header or BREAKING CHANGE footer -> Bumps MAJOR version.",
    };
  }

  const type = header?.[1].toLowerCase();
  if (type === "feat") {
    return {
      type: "MINOR",
      explanation: "New backward-compatible feature added (`feat`) -> Bumps MINOR version.",
    };
  }
  if (type === "fix") {
    return {
      type: "PATCH",
      explanation: "Backward-compatible bug fix applied (`fix`) -> Bumps PATCH version.",
    };
  }

  return {
    type: "NONE",
    explanation: "Only `feat`, `fix`, and explicitly breaking commits map to automatic SemVer bumps in this simulator.",
  };
}
export interface SemverRangeResult {
  isMatch: boolean;
  reason: string;
}

export function evaluateSemverRange(range: string, targetVersion: string): SemverRangeResult {
  const validTarget = semverValid(targetVersion);
  if (!validTarget) {
    return { isMatch: false, reason: "Invalid target version. Expected a valid SemVer value such as 1.2.3." };
  }

  const normalizedRange = semverValidRange(range);
  if (!normalizedRange) {
    return { isMatch: false, reason: "Invalid SemVer range. Use npm node-semver range syntax." };
  }

  const isMatch = semverSatisfies(validTarget, range);
  return {
    isMatch,
    reason: isMatch
      ? `Target ${validTarget} satisfies ${range.trim()} (normalized as ${normalizedRange}).`
      : `Target ${validTarget} does not satisfy ${range.trim()} (normalized as ${normalizedRange}).`,
  };
}


export interface WorkflowConfig {
  pipelineName: string;
  pipelineTriggers: Record<string, boolean>;
  runnerOs: string;
  nodeVersion: string;
  enabledSteps: Record<string, boolean>;
}

const ACTIONS_CHECKOUT = "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7";
const ACTIONS_SETUP_NODE = "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7";
const TRIVY_ACTION = "aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25 # v0.36.0";
const DOCKER_LOGIN = "docker/login-action@dbcb813823bdd20940b903addbd779551569679f # v4";
const DOCKER_BUILDX = "docker/setup-buildx-action@bb05f3f5519dd87d3ba754cc423b652a5edd6d2c # v4";
const DOCKER_BUILD_PUSH = "docker/build-push-action@53b7df96c91f9c12dcc8a07bcb9ccacbed38856a # v7";
const K8S_SET_CONTEXT = "Azure/k8s-set-context@8698eba2499e9012f0d5085f8798077cce4bc526 # v5";
const K8S_DEPLOY = "Azure/k8s-deploy@51ca02a8b7225fbd0924aac359c5b336a5f1e5b4 # v7";
const SLACK_ACTION = "slackapi/slack-github-action@dcb1066f776dd043e64d0e8ba94ca15cc7e1875d # v4.0.0";
const MAIN_PUSH_CONDITION = "${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}";

export function generateWorkflowYaml({ pipelineName, pipelineTriggers, runnerOs, nodeVersion, enabledSteps }: WorkflowConfig): string {
  const triggerLines: string[] = [];
  if (pipelineTriggers.pushMain) triggerLines.push("  push:\n    branches: [ main ]");
  if (pipelineTriggers.pullRequest) triggerLines.push("  pull_request:\n    branches: [ main ]");
  if (pipelineTriggers.workflowDispatch) triggerLines.push("  workflow_dispatch:");
  if (pipelineTriggers.cronSchedule) triggerLines.push("  schedule:\n    - cron: '0 0 * * *'");
  if (triggerLines.length === 0) triggerLines.push("  workflow_dispatch: # Keep the workflow triggerable when no event is selected");

  const stepsYaml: string[] = [];
  if (enabledSteps.checkout) stepsYaml.push(`      - name: Checkout Repository\n        uses: ${ACTIONS_CHECKOUT}`);
  if (enabledSteps.setupNode) {
    stepsYaml.push(`      - name: Setup Node.js ${nodeVersion}\n        uses: ${ACTIONS_SETUP_NODE}\n        with:\n          node-version: '${nodeVersion}'\n          cache: 'npm'`);
  }
  if (enabledSteps.npmInstall) stepsYaml.push("      - name: Install Dependencies\n        run: npm ci");
  if (enabledSteps.lint) stepsYaml.push("      - name: Run Linter & Static Analysis\n        run: npm run lint");
  if (enabledSteps.test) stepsYaml.push("      - name: Execute Tests\n        run: npm test");
  if (enabledSteps.securityScan) {
    stepsYaml.push(`      - name: Security Vulnerability Scan\n        uses: ${TRIVY_ACTION}\n        with:\n          scan-type: 'fs'\n          scan-ref: '.'\n          severity: 'HIGH,CRITICAL'\n          exit-code: '1'\n          ignore-unfixed: true`);
  }
  if (enabledSteps.dockerBuild) {
    stepsYaml.push(`      - name: Set up Docker Buildx
        uses: ${DOCKER_BUILDX}
        if: ${MAIN_PUSH_CONDITION}`);
    stepsYaml.push(`      - name: Log in to GitHub Container Registry
        if: ${MAIN_PUSH_CONDITION}
        uses: ${DOCKER_LOGIN}
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}`);
    stepsYaml.push(`      - name: Build & Push Docker Container
        if: ${MAIN_PUSH_CONDITION}
        uses: ${DOCKER_BUILD_PUSH}
        with:
          context: .
          push: true
          tags: ghcr.io/\${{ github.repository }}:\${{ github.sha }}`);
  }
  if (enabledSteps.deployK8s) {
    stepsYaml.push(`      # Requires the KUBE_CONFIG_DATA repository secret containing kubeconfig file contents.
      - name: Set Kubernetes context
        if: ${MAIN_PUSH_CONDITION}
        uses: ${K8S_SET_CONTEXT}
        with:
          method: kubeconfig
          kubeconfig: \${{ secrets.KUBE_CONFIG_DATA }}`);
    stepsYaml.push(`      # Requires compatible manifests, registry access, readiness configuration, and a configured cluster.
      - name: Deploy to Kubernetes Cluster
        if: ${MAIN_PUSH_CONDITION}
        uses: ${K8S_DEPLOY}
        with:
          action: deploy
          strategy: basic
          manifests: |
            k8s/deployment.yaml
          images: ghcr.io/\${{ github.repository }}:\${{ github.sha }}`);
  }
  if (enabledSteps.slackNotify) {
    stepsYaml.push(`      # Requires the SLACK_WEBHOOK_URL repository secret.
      - name: Slack Notification on Failure
        if: failure()
        uses: ${SLACK_ACTION}
        with:
          webhook: \${{ secrets.SLACK_WEBHOOK_URL }}
          webhook-type: incoming-webhook
          payload: |
            text: "Workflow \${{ github.workflow }} finished with status \${{ job.status }}."`);
  }

  return `name: ${JSON.stringify(pipelineName)}

on:
${triggerLines.join("\n")}

jobs:
  build-and-test:
    runs-on: ${runnerOs}
    permissions:
      contents: read${enabledSteps.dockerBuild ? "\n      packages: write" : ""}
    steps:
${stepsYaml.join("\n\n")}`;
}
