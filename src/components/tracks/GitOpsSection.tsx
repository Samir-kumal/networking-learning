"use client";

import { useState, useEffect } from "react";

// ==========================================
// TYPES & INTERFACES
// ==========================================

export type GitStrategy = "trunk" | "gitflow";

export interface CommitNode {
  id: string;
  hash: string;
  branch: string;
  message: string;
  type: "commit" | "merge" | "tag" | "deploy";
  tag?: string;
  timestamp: string;
}

export type DeployStrategy = "recreate" | "rolling" | "bluegreen" | "canary";

export interface PodInstance {
  id: number;
  version: "v1" | "v2";
  status: "running" | "starting" | "terminating" | "error";
  environment: "blue" | "green" | "main";
}

// ==========================================
// PRESET & CONSTANT DATA
// ==========================================

const INITIAL_TRUNK_COMMITS: CommitNode[] = [
  { id: "c1", hash: "a1b2c3d", branch: "main", message: "Initial commit", type: "commit", tag: "v1.0.0", timestamp: "10:00:01" },
  { id: "c2", hash: "e5f6g7h", branch: "main", message: "feat: core auth module", type: "commit", timestamp: "10:15:30" },
  { id: "c3", hash: "i8j9k0l", branch: "main", message: "fix: token validation fix", type: "commit", timestamp: "10:32:12" },
];

const INITIAL_GITFLOW_COMMITS: CommitNode[] = [
  { id: "g1", hash: "f101a1b", branch: "main", message: "Initial release v1.0.0", type: "commit", tag: "v1.0.0", timestamp: "09:00:00" },
  { id: "g2", hash: "f102c2d", branch: "develop", message: "Chore: setup develop branch", type: "commit", timestamp: "09:05:00" },
  { id: "g3", hash: "f103e3f", branch: "develop", message: "feat: user profile schema", type: "commit", timestamp: "09:20:00" },
];

export default function GitOpsSection() {
  // Navigation / Active Module
  const [activeTab, setActiveTab] = useState<"git" | "actions" | "semver" | "deploy">("git");

  // ==========================================
  // 1. GIT BRANCHING SIMULATOR STATE
  // ==========================================
  const [gitStrategy, setGitStrategy] = useState<GitStrategy>("trunk");
  const [trunkCommits, setTrunkCommits] = useState<CommitNode[]>(INITIAL_TRUNK_COMMITS);
  const [gitflowCommits, setGitflowCommits] = useState<CommitNode[]>(INITIAL_GITFLOW_COMMITS);
  const [activeFeatureBranch, setActiveFeatureBranch] = useState<string | null>(null);
  const [activeReleaseBranch, setActiveReleaseBranch] = useState<string | null>(null);
  const [activeHotfixBranch, setActiveHotfixBranch] = useState<string | null>(null);
  const [featureFlags, setFeatureFlags] = useState<{ [key: string]: boolean }>({
    "NEW_PAYMENT_GATEWAY": false,
    "DARK_MODE_V2": true,
    "AI_RECOMMENDATIONS": false,
  });
  const [gitConsoleLogs, setGitConsoleLogs] = useState<string[]>([
    "Initialized Git Repository.",
    "Branch strategy selected: Trunk-Based Development.",
  ]);

  const addGitLog = (msg: string) => {
    setGitConsoleLogs((prev) => [ `[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);
  };

  // --- Trunk-Based Actions ---
  const handleTrunkCreateBranch = () => {
    if (activeFeatureBranch) {
      addGitLog("⚠️ Already on active short-lived branch: " + activeFeatureBranch);
      return;
    }
    const branchName = `feat/ticket-${Math.floor(100 + Math.random() * 900)}`;
    setActiveFeatureBranch(branchName);
    addGitLog(`git checkout -b ${branchName} (Short-lived trunk branch created off main)`);
  };

  const handleTrunkCommit = () => {
    const targetBranch = activeFeatureBranch || "main";
    const newHash = Math.random().toString(36).substring(2, 9);
    const newCommit: CommitNode = {
      id: Date.now().toString(),
      hash: newHash,
      branch: targetBranch,
      message: activeFeatureBranch ? `feat: update work in ${activeFeatureBranch}` : `feat: direct commit on main with feature flag`,
      type: "commit",
      timestamp: new Date().toLocaleTimeString(),
    };
    setTrunkCommits((prev) => [...prev, newCommit]);
    addGitLog(`git commit -m "${newCommit.message}" [${newHash}] on branch ${targetBranch}`);
  };

  const handleTrunkMergePR = () => {
    if (!activeFeatureBranch) {
      addGitLog("⚠️ No active feature branch to merge into main.");
      return;
    }
    const newHash = Math.random().toString(36).substring(2, 9);
    const mergeCommit: CommitNode = {
      id: Date.now().toString(),
      hash: newHash,
      branch: "main",
      message: `Merge pull request #${Math.floor(10 + Math.random() * 90)} from ${activeFeatureBranch}`,
      type: "merge",
      timestamp: new Date().toLocaleTimeString(),
    };
    setTrunkCommits((prev) => [...prev, mergeCommit]);
    addGitLog(`git merge --squash ${activeFeatureBranch} into main -> Merged & deleted ${activeFeatureBranch}`);
    setActiveFeatureBranch(null);
  };

  const handleTrunkDeploy = () => {
    const newHash = Math.random().toString(36).substring(2, 9);
    const nextVer = `v1.${trunkCommits.length}.0`;
    const deployCommit: CommitNode = {
      id: Date.now().toString(),
      hash: newHash,
      branch: "main",
      message: `deploy: release ${nextVer} to production`,
      type: "deploy",
      tag: nextVer,
      timestamp: new Date().toLocaleTimeString(),
    };
    setTrunkCommits((prev) => [...prev, deployCommit]);
    addGitLog(`🚀 Triggered Continuous Deployment on main -> Tagged ${nextVer}`);
  };

  // --- GitFlow Actions ---
  const handleGitflowNewFeature = () => {
    if (activeFeatureBranch) {
      addGitLog("⚠️ Feature branch already active: " + activeFeatureBranch);
      return;
    }
    const branch = `feature/cart-checkout`;
    setActiveFeatureBranch(branch);
    addGitLog(`git checkout -b ${branch} develop`);
  };

  const handleGitflowCommitFeature = () => {
    const targetBranch = activeFeatureBranch || "develop";
    const newHash = Math.random().toString(36).substring(2, 9);
    const newCommit: CommitNode = {
      id: Date.now().toString(),
      hash: newHash,
      branch: targetBranch,
      message: `feat(${targetBranch.split('/')[1] || 'dev'}): update logic`,
      type: "commit",
      timestamp: new Date().toLocaleTimeString(),
    };
    setGitflowCommits((prev) => [...prev, newCommit]);
    addGitLog(`git commit -m "${newCommit.message}" [${newHash}] on ${targetBranch}`);
  };

  const handleGitflowFinishFeature = () => {
    if (!activeFeatureBranch) {
      addGitLog("⚠️ No active feature branch to finish.");
      return;
    }
    const newHash = Math.random().toString(36).substring(2, 9);
    const mergeCommit: CommitNode = {
      id: Date.now().toString(),
      hash: newHash,
      branch: "develop",
      message: `Merge branch '${activeFeatureBranch}' into develop`,
      type: "merge",
      timestamp: new Date().toLocaleTimeString(),
    };
    setGitflowCommits((prev) => [...prev, mergeCommit]);
    addGitLog(`git checkout develop && git merge --no-ff ${activeFeatureBranch}`);
    setActiveFeatureBranch(null);
  };

  const handleGitflowStartRelease = () => {
    if (activeReleaseBranch) {
      addGitLog("⚠️ Release branch already active: " + activeReleaseBranch);
      return;
    }
    const branch = `release/v1.1.0`;
    setActiveReleaseBranch(branch);
    addGitLog(`git checkout -b ${branch} develop (Hardening phase for v1.1.0)`);
  };

  const handleGitflowFinishRelease = () => {
    if (!activeReleaseBranch) {
      addGitLog("⚠️ No active release branch.");
      return;
    }
    const hashMain = Math.random().toString(36).substring(2, 9);
    const hashDev = Math.random().toString(36).substring(2, 9);
    const tag = "v1.1.0";

    const mainMerge: CommitNode = {
      id: Date.now().toString(),
      hash: hashMain,
      branch: "main",
      message: `Merge branch '${activeReleaseBranch}' into main`,
      type: "merge",
      tag,
      timestamp: new Date().toLocaleTimeString(),
    };
    const devMerge: CommitNode = {
      id: (Date.now() + 1).toString(),
      hash: hashDev,
      branch: "develop",
      message: `Merge release '${activeReleaseBranch}' back into develop`,
      type: "merge",
      timestamp: new Date().toLocaleTimeString(),
    };

    setGitflowCommits((prev) => [...prev, mainMerge, devMerge]);
    addGitLog(`✅ Merged ${activeReleaseBranch} into main (Tagged ${tag}) & back into develop.`);
    setActiveReleaseBranch(null);
  };

  const handleGitflowStartHotfix = () => {
    if (activeHotfixBranch) {
      addGitLog("⚠️ Hotfix branch already active: " + activeHotfixBranch);
      return;
    }
    const branch = `hotfix/v1.0.1-patch`;
    setActiveHotfixBranch(branch);
    addGitLog(`git checkout -b ${branch} main (Emergency patch on main)`);
  };

  const handleGitflowFinishHotfix = () => {
    if (!activeHotfixBranch) {
      addGitLog("⚠️ No active hotfix branch.");
      return;
    }
    const hashMain = Math.random().toString(36).substring(2, 9);
    const tag = "v1.0.1";
    const mainMerge: CommitNode = {
      id: Date.now().toString(),
      hash: hashMain,
      branch: "main",
      message: `Merge hotfix '${activeHotfixBranch}' into main`,
      type: "merge",
      tag,
      timestamp: new Date().toLocaleTimeString(),
    };
    setGitflowCommits((prev) => [...prev, mainMerge]);
    addGitLog(`🔥 Merged ${activeHotfixBranch} into main (Tagged ${tag}) & updated develop.`);
    setActiveHotfixBranch(null);
  };

  // ==========================================
  // 2. GITHUB ACTIONS CI/CD BUILDER STATE
  // ==========================================
  const [pipelineName, setPipelineName] = useState<string>("Production CI/CD Pipeline");
  const [pipelineTriggers, setPipelineTriggers] = useState<{ [key: string]: boolean }>({
    pushMain: true,
    pullRequest: true,
    workflowDispatch: true,
    cronSchedule: false,
  });
  const [runnerOs, setRunnerOs] = useState<string>("ubuntu-latest");
  const [nodeVersion, setNodeVersion] = useState<string>("20.x");
  const [enabledSteps, setEnabledSteps] = useState<{ [key: string]: boolean }>({
    checkout: true,
    setupNode: true,
    npmInstall: true,
    lint: true,
    test: true,
    securityScan: true,
    dockerBuild: true,
    deployK8s: false,
    slackNotify: true,
  });

  // Runner Simulation State
  const [isSimulatingCi, setIsSimulatingCi] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [ciStepStatuses, setCiStepStatuses] = useState<{ [key: string]: "pending" | "running" | "success" | "failed" }>({});
  const [ciTerminalLogs, setCiTerminalLogs] = useState<string[]>([]);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Generate GitHub Actions YAML Code
  const generateYamlCode = (): string => {
    const triggerLines: string[] = [];
    if (pipelineTriggers.pushMain) triggerLines.push("  push:\n    branches: [ main ]");
    if (pipelineTriggers.pullRequest) triggerLines.push("  pull_request:\n    branches: [ main ]");
    if (pipelineTriggers.workflowDispatch) triggerLines.push("  workflow_dispatch:");
    if (pipelineTriggers.cronSchedule) triggerLines.push("  schedule:\n    - cron: '0 0 * * *'");

    const stepsYaml: string[] = [];
    if (enabledSteps.checkout) {
      stepsYaml.push(`      - name: Checkout Repository\n        uses: actions/checkout@v4`);
    }
    if (enabledSteps.setupNode) {
      stepsYaml.push(`      - name: Setup Node.js ${nodeVersion}\n        uses: actions/setup-node@v4\n        with:\n          node-version: '${nodeVersion}'\n          cache: 'npm'`);
    }
    if (enabledSteps.npmInstall) {
      stepsYaml.push(`      - name: Install Dependencies\n        run: npm ci`);
    }
    if (enabledSteps.lint) {
      stepsYaml.push(`      - name: Run Linter & Static Analysis\n        run: npm run lint`);
    }
    if (enabledSteps.test) {
      stepsYaml.push(`      - name: Execute Unit & Integration Tests\n        run: npm test -- --coverage`);
    }
    if (enabledSteps.securityScan) {
      stepsYaml.push(`      - name: Security Vulnerability Scan\n        uses: aquasecurity/trivy-action@master\n        with:\n          scan-type: 'fs'\n          severity: 'HIGH,CRITICAL'`);
    }
    if (enabledSteps.dockerBuild) {
      stepsYaml.push(`      - name: Build & Push Docker Container\n        uses: docker/build-push-action@v5\n        with:\n          push: true\n          tags: ghcr.io/org/app:\${{ github.sha }}`);
    }
    if (enabledSteps.deployK8s) {
      stepsYaml.push(`      - name: Deploy to Kubernetes Cluster\n        uses: azure/k8s-deploy@v4\n        with:\n          manifests: | \n            k8s/deployment.yaml\n          images: ghcr.io/org/app:\${{ github.sha }}`);
    }
    if (enabledSteps.slackNotify) {
      stepsYaml.push(`      - name: Slack Notification on Failure\n        if: failure()\n        uses: 8398a7/action-slack@v3\n        with:\n          status: \${{ job.status }}\n          fields: repo,message,commit,author,action,eventName,ref,workflow`);
    }

    return `name: ${pipelineName}

on:
${triggerLines.join("\n")}

jobs:
  build-and-test:
    runs-on: ${runnerOs}
    steps:
${stepsYaml.join("\n\n")}`;
  };

  const handleCopyYaml = () => {
    navigator.clipboard.writeText(generateYamlCode());
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleRunCiSimulation = () => {
    if (isSimulatingCi) return;
    setIsSimulatingCi(true);
    setCurrentStepIndex(0);
    setCiTerminalLogs(["🚀 Initializing GitHub Actions runner on " + runnerOs + "..."]);

    const activeStepsList = Object.keys(enabledSteps).filter((k) => enabledSteps[k]);
    const initialStatuses: { [key: string]: "pending" | "running" | "success" | "failed" } = {};
    activeStepsList.forEach((s) => (initialStatuses[s] = "pending"));
    setCiStepStatuses(initialStatuses);

    let stepIdx = 0;

    const interval = setInterval(() => {
      if (stepIdx >= activeStepsList.length) {
        clearInterval(interval);
        setIsSimulatingCi(false);
        setCiTerminalLogs((prev) => [...prev, "🎉 Pipeline Execution Completed Successfully! All jobs passed."]);
        return;
      }

      const stepName = activeStepsList[stepIdx];
      setCiStepStatuses((prev) => ({ ...prev, [stepName]: "running" }));

      // Add log
      let logMsg = "";
      switch (stepName) {
        case "checkout":
          logMsg = "📥 [checkout@v4] Syncing git repository HEAD ref...";
          break;
        case "setupNode":
          logMsg = `🟢 [setup-node@v4] Configuring Node.js runtime environment (${nodeVersion})...`;
          break;
        case "npmInstall":
          logMsg = "📦 [npm ci] Installed 1,142 dependencies from package-lock.json (3.1s)";
          break;
        case "lint":
          logMsg = "🔍 [npm run lint] Checking 48 files... 0 errors, 0 warnings found.";
          break;
        case "test":
          logMsg = "🧪 [npm test] Vitest v4.1: 24 tests passed across 5 test suites (1.8s)";
          break;
        case "securityScan":
          logMsg = "🛡️ [trivy-action] Scanned 1,142 packages: 0 CRITICAL, 0 HIGH vulnerabilities.";
          break;
        case "dockerBuild":
          logMsg = "🐳 [docker-build] Building image ghcr.io/org/app:a1b2c3d... Pushed!";
          break;
        case "deployK8s":
          logMsg = "☸️ [k8s-deploy] Updated deployment.apps/web-service in namespace prod.";
          break;
        case "slackNotify":
          logMsg = "🔔 [slack-notify] Skipped (Job status: SUCCESS)";
          break;
      }

      setCiTerminalLogs((prev) => [...prev, logMsg]);

      setTimeout(() => {
        setCiStepStatuses((prev) => ({ ...prev, [stepName]: "success" }));
      }, 400);

      stepIdx++;
      setCurrentStepIndex(stepIdx);
    }, 1200);
  };

  // ==========================================
  // 3. SEMANTIC VERSIONING CALCULATOR STATE
  // ==========================================
  const [semverMajor, setSemverMajor] = useState<number>(1);
  const [semverMinor, setSemverMinor] = useState<number>(4);
  const [semverPatch, setSemverPatch] = useState<number>(2);
  const [semverPrerelease, setSemverPrerelease] = useState<string>("");
  const [semverBuildMeta, setSemverBuildMeta] = useState<string>("");

  const [commitMessageInput, setCommitMessageInput] = useState<string>("feat(auth): add OAuth2 provider support");
  const [semverRangeInput, setSemverRangeInput] = useState<string>("^1.4.0");
  const [testVersionInput, setTestVersionInput] = useState<string>("1.5.1");

  const currentSemverString = `${semverMajor}.${semverMinor}.${semverPatch}${
    semverPrerelease ? "-" + semverPrerelease : ""
  }${semverBuildMeta ? "+" + semverBuildMeta : ""}`;

  const handleBumpSemver = (type: "major" | "minor" | "patch") => {
    if (type === "major") {
      setSemverMajor((prev) => prev + 1);
      setSemverMinor(0);
      setSemverPatch(0);
      setSemverPrerelease("");
    } else if (type === "minor") {
      setSemverMinor((prev) => prev + 1);
      setSemverPatch(0);
      setSemverPrerelease("");
    } else if (type === "patch") {
      setSemverPatch((prev) => prev + 1);
      setSemverPrerelease("");
    }
  };

  // Analyze Conventional Commit
  const analyzeCommitBump = (msg: string): { type: "MAJOR" | "MINOR" | "PATCH" | "NONE"; explanation: string } => {
    if (msg.includes("!") || msg.toUpperCase().includes("BREAKING CHANGE")) {
      return {
        type: "MAJOR",
        explanation: "Breaking API change detected (exclamation mark or BREAKING CHANGE footer) -> Bumps MAJOR version.",
      };
    }
    if (msg.startsWith("feat")) {
      return {
        type: "MINOR",
        explanation: "New backward-compatible feature added (`feat`) -> Bumps MINOR version.",
      };
    }
    if (msg.startsWith("fix")) {
      return {
        type: "PATCH",
        explanation: "Backward-compatible bug fix applied (`fix`) -> Bumps PATCH version.",
      };
    }
    return {
      type: "NONE",
      explanation: "Chore, docs, style, or refactor commit -> Does NOT trigger a version bump.",
    };
  };

  const commitAnalysis = analyzeCommitBump(commitMessageInput);

  // Evaluate Semver Range
  const evaluateSemverRange = (range: string, targetVer: string): { isMatch: boolean; reason: string } => {
    const cleanTarget = targetVer.trim().replace(/^v/, "");
    const parts = cleanTarget.split(".").map(Number);
    if (parts.length < 3 || parts.some(isNaN)) {
      return { isMatch: false, reason: "Invalid target version format. Expected X.Y.Z" };
    }
    const [tMaj, tMin, tPat] = parts;

    const cleanRange = range.trim().replace(/^v/, "");

    if (cleanRange.startsWith("^")) {
      const baseVer = cleanRange.slice(1).split(".").map(Number);
      const [bMaj, bMin, bPat] = baseVer;
      // Caret (^) allows changes that do not modify the left-most non-zero digit
      if (tMaj !== bMaj) return { isMatch: false, reason: `Caret ^ allows versions within Major ${bMaj}. Target Major is ${tMaj}.` };
      if (tMin < bMin || (tMin === bMin && tPat < bPat)) return { isMatch: false, reason: `Target ${cleanTarget} is lower than base ${cleanRange.slice(1)}.` };
      return { isMatch: true, reason: `^${bMaj}.${bMin}.${bPat} permits any version >= ${bMaj}.${bMin}.${bPat} and < ${bMaj + 1}.0.0` };
    }

    if (cleanRange.startsWith("~")) {
      const baseVer = cleanRange.slice(1).split(".").map(Number);
      const [bMaj, bMin, bPat] = baseVer;
      // Tilde (~) allows patch-level changes
      if (tMaj !== bMaj || tMin !== bMin) return { isMatch: false, reason: `Tilde ~ locks Major & Minor to ${bMaj}.${bMin}. Target is ${tMaj}.${tMin}.` };
      if (tPat < bPat) return { isMatch: false, reason: `Target patch ${tPat} is lower than base patch ${bPat}.` };
      return { isMatch: true, reason: `~${bMaj}.${bMin}.${bPat} permits patch updates >= ${bMaj}.${bMin}.${bPat} and < ${bMaj}.${bMin + 1}.0` };
    }

    if (cleanRange.startsWith(">=")) {
      const baseStr = cleanRange.slice(2).trim();
      const [bMaj, bMin, bPat] = baseStr.split(".").map(Number);
      const match = tMaj > bMaj || (tMaj === bMaj && tMin > bMin) || (tMaj === bMaj && tMin === bMin && tPat >= bPat);
      return { isMatch: match, reason: match ? `Target ${cleanTarget} satisfies >= ${baseStr}` : `Target ${cleanTarget} is lower than ${baseStr}` };
    }

    if (cleanRange === cleanTarget || cleanRange === "*") {
      return { isMatch: true, reason: "Exact version match or wildcard (*)." };
    }

    return { isMatch: false, reason: `Evaluating range rule '${cleanRange}' against ${cleanTarget}.` };
  };

  const rangeEvaluation = evaluateSemverRange(semverRangeInput, testVersionInput);

  // ==========================================
  // 4. DEPLOYMENT STRATEGY SIMULATOR STATE
  // ==========================================
  const [deployStrategy, setDeployStrategy] = useState<DeployStrategy>("rolling");
  const [deployStep, setDeployStep] = useState<number>(0); // 0 to 4
  const [isSimulatingDeploy, setIsSimulatingDeploy] = useState<boolean>(false);
  const [simulateError, setSimulateError] = useState<boolean>(false);

  // Pods visualizer generator
  const getPodsForState = (): PodInstance[] => {
    const totalPods = 8;
    const pods: PodInstance[] = [];

    if (deployStrategy === "recreate") {
      if (deployStep === 0) {
        for (let i = 1; i <= totalPods; i++) pods.push({ id: i, version: "v1", status: "running", environment: "main" });
      } else if (deployStep === 1 || deployStep === 2) {
        // Downtime phase
        for (let i = 1; i <= totalPods; i++) pods.push({ id: i, version: "v1", status: "terminating", environment: "main" });
      } else {
        // V2 phase
        for (let i = 1; i <= totalPods; i++) pods.push({ id: i, version: "v2", status: simulateError ? "error" : "running", environment: "main" });
      }
    } else if (deployStrategy === "rolling") {
      const v2Count = Math.min(totalPods, deployStep * 2);
      for (let i = 1; i <= totalPods; i++) {
        if (i <= v2Count) {
          pods.push({ id: i, version: "v2", status: simulateError && i === v2Count ? "error" : "running", environment: "main" });
        } else {
          pods.push({ id: i, version: "v1", status: "running", environment: "main" });
        }
      }
    } else if (deployStrategy === "bluegreen") {
      // Blue/Green has two distinct environments
      for (let i = 1; i <= 4; i++) {
        pods.push({ id: i, version: "v1", status: "running", environment: "blue" });
      }
      for (let i = 5; i <= 8; i++) {
        const isRunning = deployStep >= 2;
        pods.push({
          id: i,
          version: "v2",
          status: isRunning ? (simulateError ? "error" : "running") : "starting",
          environment: "green",
        });
      }
    } else if (deployStrategy === "canary") {
      // Canary: 1 pod v2 (12.5%), 2 pods (25%), 4 pods (50%), 8 pods (100%)
      let v2Count = 0;
      if (deployStep === 1) v2Count = 1;
      else if (deployStep === 2) v2Count = 2;
      else if (deployStep === 3) v2Count = 4;
      else if (deployStep >= 4) v2Count = 8;

      for (let i = 1; i <= totalPods; i++) {
        if (i <= v2Count) {
          pods.push({ id: i, version: "v2", status: simulateError && i === v2Count ? "error" : "running", environment: "green" });
        } else {
          pods.push({ id: i, version: "v1", status: "running", environment: "blue" });
        }
      }
    }

    return pods;
  };

  const podsState = getPodsForState();

  const getTrafficSplit = (): { v1: number; v2: number; downtime: boolean } => {
    if (deployStrategy === "recreate") {
      if (deployStep === 1 || deployStep === 2) return { v1: 0, v2: 0, downtime: true };
      if (deployStep >= 3) return { v1: 0, v2: 100, downtime: false };
      return { v1: 100, v2: 0, downtime: false };
    }
    if (deployStrategy === "rolling") {
      const pct = (deployStep / 4) * 100;
      return { v1: 100 - pct, v2: pct, downtime: false };
    }
    if (deployStrategy === "bluegreen") {
      if (deployStep >= 3) return { v1: 0, v2: 100, downtime: false };
      return { v1: 100, v2: 0, downtime: false };
    }
    if (deployStrategy === "canary") {
      if (deployStep === 0) return { v1: 100, v2: 0, downtime: false };
      if (deployStep === 1) return { v1: 88, v2: 12, downtime: false };
      if (deployStep === 2) return { v1: 75, v2: 25, downtime: false };
      if (deployStep === 3) return { v1: 50, v2: 50, downtime: false };
      return { v1: 0, v2: 100, downtime: false };
    }
    return { v1: 100, v2: 0, downtime: false };
  };

  const traffic = getTrafficSplit();

  const handleNextDeployStep = () => {
    if (deployStep < 4) setDeployStep((prev) => prev + 1);
  };

  const handlePrevDeployStep = () => {
    if (deployStep > 0) setDeployStep((prev) => prev - 1);
  };

  const handleResetDeploy = () => {
    setDeployStep(0);
    setSimulateError(false);
    setIsSimulatingDeploy(false);
  };

  // Auto-play deployment simulation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSimulatingDeploy && deployStep < 4) {
      timer = setTimeout(() => {
        setDeployStep((prev) => prev + 1);
      }, 1500);
    } else if (deployStep >= 4) {
      setIsSimulatingDeploy(false);
    }
    return () => clearTimeout(timer);
  }, [isSimulatingDeploy, deployStep]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* HEADER BANNER */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#161b22] via-[#1c2333] to-[#0d1117] border border-[#30363d] p-6 sm:p-8 shadow-xl overflow-hidden">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-[#58a6ff]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">🔀</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Git, GitHub Actions & CI/CD Track
              </h1>
            </div>
            <p className="text-sm sm:text-base text-[#8b949e] max-w-3xl">
              Master modern GitOps practices: Trunk-based vs GitFlow branching, GitHub Actions YAML pipeline creation & automated execution, Semantic Versioning calculation, and zero-downtime deployment strategies.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:self-start">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/40">
              Git 2.44+
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#7ee787]/20 text-[#7ee787] border border-[#7ee787]/40">
              GitHub Actions
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#ffa657]/20 text-[#ffa657] border border-[#ffa657]/40">
              SemVer 2.0
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#bc8cff]/20 text-[#bc8cff] border border-[#bc8cff]/40">
              Kubernetes Deploy
            </span>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="mt-8 flex flex-wrap gap-2 border-t border-[#30363d] pt-4">
          <button
            onClick={() => setActiveTab("git")}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
              activeTab === "git"
                ? "bg-[#58a6ff] text-white shadow-lg shadow-[#58a6ff]/20 font-semibold"
                : "bg-[#21262d] text-[#8b949e] hover:text-white hover:bg-[#30363d]"
            }`}
          >
            <span>🔀</span>
            <span>1. Git Branching Lab</span>
          </button>
          <button
            onClick={() => setActiveTab("actions")}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
              activeTab === "actions"
                ? "bg-[#58a6ff] text-white shadow-lg shadow-[#58a6ff]/20 font-semibold"
                : "bg-[#21262d] text-[#8b949e] hover:text-white hover:bg-[#30363d]"
            }`}
          >
            <span>⚡</span>
            <span>2. GitHub Actions CI/CD</span>
          </button>
          <button
            onClick={() => setActiveTab("semver")}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
              activeTab === "semver"
                ? "bg-[#58a6ff] text-white shadow-lg shadow-[#58a6ff]/20 font-semibold"
                : "bg-[#21262d] text-[#8b949e] hover:text-white hover:bg-[#30363d]"
            }`}
          >
            <span>🏷️</span>
            <span>3. SemVer Calculator</span>
          </button>
          <button
            onClick={() => setActiveTab("deploy")}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
              activeTab === "deploy"
                ? "bg-[#58a6ff] text-white shadow-lg shadow-[#58a6ff]/20 font-semibold"
                : "bg-[#21262d] text-[#8b949e] hover:text-white hover:bg-[#30363d]"
            }`}
          >
            <span>🚀</span>
            <span>4. Deployment Strategies</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODULE 1: INTERACTIVE GIT BRANCHING SIMULATOR */}
      {/* ========================================================================= */}
      {activeTab === "git" && (
        <div className="space-y-6">
          {/* Strategy Toggle Card */}
          <div className="rounded-2xl bg-[#161b22] border border-[#30363d] p-6 shadow-lg space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#30363d] pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <span>Git Branching Strategy Simulator</span>
                </h2>
                <p className="text-xs text-[#8b949e] mt-1">
                  Compare Trunk-Based Development vs GitFlow branching workflows in real time.
                </p>
              </div>

              {/* Mode Switcher */}
              <div className="flex bg-[#0d1117] p-1 rounded-xl border border-[#30363d]">
                <button
                  onClick={() => {
                    setGitStrategy("trunk");
                    addGitLog("Switched strategy mode to Trunk-Based Development.");
                  }}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    gitStrategy === "trunk"
                      ? "bg-[#58a6ff] text-white shadow"
                      : "text-[#8b949e] hover:text-white"
                  }`}
                >
                  Trunk-Based Dev
                </button>
                <button
                  onClick={() => {
                    setGitStrategy("gitflow");
                    addGitLog("Switched strategy mode to GitFlow.");
                  }}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    gitStrategy === "gitflow"
                      ? "bg-[#7ee787] text-[#0d1117] shadow"
                      : "text-[#8b949e] hover:text-white"
                  }`}
                >
                  GitFlow Model
                </button>
              </div>
            </div>

            {/* Strategy Overview & Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-2">
                <div className="text-xs text-[#8b949e]">Target Environment</div>
                <div className="text-base font-bold text-[#58a6ff]">
                  {gitStrategy === "trunk" ? "Continuous Integration (CI/CD)" : "Scheduled Enterprise Releases"}
                </div>
                <div className="text-xs text-gray-400">
                  {gitStrategy === "trunk"
                    ? "Single main branch with short-lived feature branches (< 1 day)."
                    : "Multiple long-lived branches (main, develop, release, feature)."}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-2">
                <div className="text-xs text-[#8b949e]">Merge Conflict Risk</div>
                <div className="text-base font-bold text-[#7ee787]">
                  {gitStrategy === "trunk" ? "Very Low (Frequent Small Merges)" : "High (Merge Hell on Release)"}
                </div>
                <div className="text-xs text-gray-400">
                  {gitStrategy === "trunk"
                    ? "Devs rebase & merge to trunk multiple times a day."
                    : "Feature branches linger for weeks before merging into develop."}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-2">
                <div className="text-xs text-[#8b949e]">Feature Flags Requirement</div>
                <div className="text-base font-bold text-[#ffa657]">
                  {gitStrategy === "trunk" ? "Mandatory (Decouples Deploy from Release)" : "Optional"}
                </div>
                <div className="text-xs text-gray-400">
                  {gitStrategy === "trunk"
                    ? "Incomplete code is merged behind feature flags."
                    : "Features isolated in branches until ready."}
                </div>
              </div>
            </div>

            {/* CONTROLS & ACTIONS */}
            <div className="bg-[#0d1117] rounded-xl border border-[#30363d] p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center justify-between">
                <span>Interactive Git Operations ({gitStrategy === "trunk" ? "Trunk-Based" : "GitFlow"})</span>
                <span className="text-xs text-[#58a6ff]">Active Branch: {activeFeatureBranch || activeReleaseBranch || activeHotfixBranch || (gitStrategy === "trunk" ? "main" : "develop")}</span>
              </h3>

              {gitStrategy === "trunk" ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleTrunkCreateBranch}
                    disabled={!!activeFeatureBranch}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-[#21262d] text-[#58a6ff] border border-[#58a6ff]/40 hover:bg-[#58a6ff]/10 disabled:opacity-50 transition"
                  >
                    ➕ Create Feature Branch
                  </button>
                  <button
                    onClick={handleTrunkCommit}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-[#21262d] text-[#7ee787] border border-[#7ee787]/40 hover:bg-[#7ee787]/10 transition"
                  >
                    📝 Commit Changes
                  </button>
                  <button
                    onClick={handleTrunkMergePR}
                    disabled={!activeFeatureBranch}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-[#21262d] text-[#ffa657] border border-[#ffa657]/40 hover:bg-[#ffa657]/10 disabled:opacity-50 transition"
                  >
                    🔀 Create PR & Squash Merge
                  </button>
                  <button
                    onClick={handleTrunkDeploy}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-[#58a6ff] text-white hover:bg-[#4794e6] font-semibold transition shadow-md"
                  >
                    🚀 Tag & Deploy to Prod
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleGitflowNewFeature}
                    disabled={!!activeFeatureBranch}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-[#21262d] text-[#58a6ff] border border-[#58a6ff]/40 hover:bg-[#58a6ff]/10 disabled:opacity-50 transition"
                  >
                    ➕ New Feature (from develop)
                  </button>
                  <button
                    onClick={handleGitflowCommitFeature}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-[#21262d] text-[#7ee787] border border-[#7ee787]/40 hover:bg-[#7ee787]/10 transition"
                  >
                    📝 Commit to Feature
                  </button>
                  <button
                    onClick={handleGitflowFinishFeature}
                    disabled={!activeFeatureBranch}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-[#21262d] text-[#ffa657] border border-[#ffa657]/40 hover:bg-[#ffa657]/10 disabled:opacity-50 transition"
                  >
                    🔀 Finish Feature (Merge to dev)
                  </button>
                  <button
                    onClick={handleGitflowStartRelease}
                    disabled={!!activeReleaseBranch}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-[#21262d] text-[#bc8cff] border border-[#bc8cff]/40 hover:bg-[#bc8cff]/10 disabled:opacity-50 transition"
                  >
                    📦 Create Release Branch
                  </button>
                  <button
                    onClick={handleGitflowFinishRelease}
                    disabled={!activeReleaseBranch}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-[#7ee787] text-[#0d1117] font-bold hover:bg-[#68d172] disabled:opacity-50 transition shadow"
                  >
                    ✅ Finish Release (Merge & Tag)
                  </button>
                  <button
                    onClick={handleGitflowStartHotfix}
                    disabled={!!activeHotfixBranch}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-[#ff7b72]/20 text-[#ff7b72] border border-[#ff7b72]/40 hover:bg-[#ff7b72]/30 disabled:opacity-50 transition"
                  >
                    🚨 Start Hotfix (from main)
                  </button>
                  <button
                    onClick={handleGitflowFinishHotfix}
                    disabled={!activeHotfixBranch}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-[#ff7b72] text-white font-bold hover:bg-[#e0665d] disabled:opacity-50 transition shadow"
                  >
                    🔥 Finish Hotfix
                  </button>
                </div>
              )}

              {/* Feature Flags Toggle Sub-panel for Trunk */}
              {gitStrategy === "trunk" && (
                <div className="mt-4 pt-4 border-t border-[#30363d] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-xs text-[#8b949e]">
                    <span className="font-semibold text-white">Feature Flags Control:</span> Safely deploy un-ready features to main in disabled state.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(featureFlags).map((flagKey) => (
                      <button
                        key={flagKey}
                        onClick={() => {
                          const updated = !featureFlags[flagKey];
                          setFeatureFlags((prev) => ({ ...prev, [flagKey]: updated }));
                          addGitLog(`Toggled Feature Flag '${flagKey}' -> ${updated ? "ENABLED" : "DISABLED"}`);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-mono transition flex items-center space-x-1 border ${
                          featureFlags[flagKey]
                            ? "bg-[#7ee787]/20 text-[#7ee787] border-[#7ee787]/40"
                            : "bg-[#21262d] text-[#8b949e] border-[#30363d]"
                        }`}
                      >
                        <span>{featureFlags[flagKey] ? "🟢" : "⚪"}</span>
                        <span>{flagKey}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* VISUAL COMMIT DAG TIMELINE */}
            <div className="rounded-xl bg-[#0d1117] border border-[#30363d] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  Commit History DAG Visualizer ({gitStrategy === "trunk" ? "Trunk-Based" : "GitFlow"})
                </h3>
                <span className="text-xs text-[#8b949e]">
                  Showing {(gitStrategy === "trunk" ? trunkCommits : gitflowCommits).length} commits
                </span>
              </div>

              {/* DAG Timeline */}
              <div className="overflow-x-auto pb-2">
                <div className="min-w-[650px] space-y-3">
                  {(gitStrategy === "trunk" ? trunkCommits : gitflowCommits).map((node, idx) => (
                    <div
                      key={node.id}
                      className="flex items-center space-x-4 p-2.5 rounded-lg bg-[#161b22] border border-[#30363d] text-xs transition hover:border-[#58a6ff]/50"
                    >
                      {/* Commit Node Badge */}
                      <div className="font-mono text-[11px] px-2 py-1 rounded bg-[#0d1117] text-[#58a6ff] border border-[#30363d] font-bold">
                        {node.hash}
                      </div>

                      {/* Branch Label */}
                      <div
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                          node.branch === "main"
                            ? "bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/30"
                            : node.branch === "develop"
                            ? "bg-[#7ee787]/20 text-[#7ee787] border border-[#7ee787]/30"
                            : node.branch.startsWith("release")
                            ? "bg-[#bc8cff]/20 text-[#bc8cff] border border-[#bc8cff]/30"
                            : node.branch.startsWith("hotfix")
                            ? "bg-[#ff7b72]/20 text-[#ff7b72] border border-[#ff7b72]/30"
                            : "bg-[#ffa657]/20 text-[#ffa657] border border-[#ffa657]/30"
                        }`}
                      >
                        {node.branch}
                      </div>

                      {/* Message */}
                      <div className="flex-1 text-white font-mono truncate">{node.message}</div>

                      {/* Tag Badge */}
                      {node.tag && (
                        <div className="px-2 py-0.5 rounded bg-[#ffa657]/20 text-[#ffa657] font-mono text-[10px] font-bold border border-[#ffa657]/40 flex items-center space-x-1">
                          <span>🏷️</span>
                          <span>{node.tag}</span>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="text-[10px] text-[#8b949e] font-mono">{node.timestamp}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* LIVE GIT CLI LOG TERMINAL */}
            <div className="rounded-xl bg-[#0d1117] border border-[#30363d] overflow-hidden">
              <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d] flex items-center justify-between text-xs text-[#8b949e]">
                <div className="flex items-center space-x-2 font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  <span className="ml-2 text-white font-semibold">Terminal Stdout Log</span>
                </div>
                <span>git-cli v2.44</span>
              </div>
              <div className="p-4 font-mono text-xs text-[#7ee787] space-y-1 h-36 overflow-y-auto bg-[#0d1117]">
                {gitConsoleLogs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">
                    <span className="text-[#8b949e]">$</span> {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE 2: GITHUB ACTIONS CI/CD BUILDER & TEST RUNNER */}
      {/* ========================================================================= */}
      {activeTab === "actions" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#161b22] border border-[#30363d] p-6 shadow-lg space-y-6">
            <div className="border-b border-[#30363d] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <span>GitHub Actions CI/CD Pipeline Builder</span>
                </h2>
                <p className="text-xs text-[#8b949e] mt-1">
                  Configure workflow triggers, matrix environments, and build steps to generate valid `.github/workflows/main.yml`.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCopyYaml}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#21262d] text-[#58a6ff] border border-[#58a6ff]/40 hover:bg-[#58a6ff]/10 transition flex items-center space-x-1.5"
                >
                  <span>{copySuccess ? "✅ Copied!" : "📋 Copy YAML"}</span>
                </button>
                <button
                  onClick={handleRunCiSimulation}
                  disabled={isSimulatingCi}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#7ee787] text-[#0d1117] hover:bg-[#68d172] disabled:opacity-50 transition shadow-lg flex items-center space-x-1.5"
                >
                  <span>🚀</span>
                  <span>{isSimulatingCi ? "Running Pipeline..." : "Run Pipeline"}</span>
                </button>
              </div>
            </div>

            {/* CONFIGURATION PANELS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Builder Controls */}
              <div className="space-y-5">
                {/* Workflow Name & OS */}
                <div className="bg-[#0d1117] rounded-xl border border-[#30363d] p-4 space-y-3">
                  <h3 className="text-xs font-bold text-[#58a6ff] uppercase tracking-wider">
                    1. General Settings & OS Matrix
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[#8b949e] block mb-1">Pipeline Name</label>
                      <input
                        type="text"
                        value={pipelineName}
                        onChange={(e) => setPipelineName(e.target.value)}
                        className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#58a6ff]"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#8b949e] block mb-1">Runner OS</label>
                      <select
                        value={runnerOs}
                        onChange={(e) => setRunnerOs(e.target.value)}
                        className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#58a6ff]"
                      >
                        <option value="ubuntu-latest">ubuntu-latest</option>
                        <option value="macos-latest">macos-latest</option>
                        <option value="windows-latest">windows-latest</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Event Triggers */}
                <div className="bg-[#0d1117] rounded-xl border border-[#30363d] p-4 space-y-3">
                  <h3 className="text-xs font-bold text-[#7ee787] uppercase tracking-wider">
                    2. Workflow Triggers (`on:`)
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center space-x-2 bg-[#161b22] p-2 rounded-lg border border-[#30363d] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pipelineTriggers.pushMain}
                        onChange={(e) => setPipelineTriggers({ ...pipelineTriggers, pushMain: e.target.checked })}
                        className="accent-[#58a6ff]"
                      />
                      <span className="text-white">push (main)</span>
                    </label>
                    <label className="flex items-center space-x-2 bg-[#161b22] p-2 rounded-lg border border-[#30363d] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pipelineTriggers.pullRequest}
                        onChange={(e) => setPipelineTriggers({ ...pipelineTriggers, pullRequest: e.target.checked })}
                        className="accent-[#58a6ff]"
                      />
                      <span className="text-white">pull_request</span>
                    </label>
                    <label className="flex items-center space-x-2 bg-[#161b22] p-2 rounded-lg border border-[#30363d] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pipelineTriggers.workflowDispatch}
                        onChange={(e) => setPipelineTriggers({ ...pipelineTriggers, workflowDispatch: e.target.checked })}
                        className="accent-[#58a6ff]"
                      />
                      <span className="text-white">workflow_dispatch</span>
                    </label>
                    <label className="flex items-center space-x-2 bg-[#161b22] p-2 rounded-lg border border-[#30363d] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pipelineTriggers.cronSchedule}
                        onChange={(e) => setPipelineTriggers({ ...pipelineTriggers, cronSchedule: e.target.checked })}
                        className="accent-[#58a6ff]"
                      />
                      <span className="text-white">cron schedule</span>
                    </label>
                  </div>
                </div>

                {/* Pipeline Steps Selection */}
                <div className="bg-[#0d1117] rounded-xl border border-[#30363d] p-4 space-y-3">
                  <h3 className="text-xs font-bold text-[#ffa657] uppercase tracking-wider">
                    3. Build Steps & Actions
                  </h3>
                  <div className="space-y-2 text-xs">
                    {[
                      { id: "checkout", label: "Checkout Code (actions/checkout@v4)" },
                      { id: "setupNode", label: `Setup Node.js Environment (${nodeVersion})` },
                      { id: "npmInstall", label: "Install Dependencies (npm ci)" },
                      { id: "lint", label: "Run Linter (npm run lint)" },
                      { id: "test", label: "Execute Tests & Code Coverage (Vitest)" },
                      { id: "securityScan", label: "Security Vulnerability Audit (Trivy Scan)" },
                      { id: "dockerBuild", label: "Docker Build & Push (ghcr.io)" },
                      { id: "deployK8s", label: "Kubernetes Cluster Deployment" },
                      { id: "slackNotify", label: "Slack Notification on Failure" },
                    ].map((step) => (
                      <label
                        key={step.id}
                        className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition ${
                          enabledSteps[step.id]
                            ? "bg-[#161b22] border-[#58a6ff]/40 text-white"
                            : "bg-[#0d1117] border-[#30363d] text-[#8b949e]"
                        }`}
                      >
                        <span className="font-mono">{step.label}</span>
                        <input
                          type="checkbox"
                          checked={enabledSteps[step.id]}
                          onChange={(e) => setEnabledSteps({ ...enabledSteps, [step.id]: e.target.checked })}
                          className="accent-[#58a6ff]"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Generated Code Preview */}
              <div className="space-y-5 flex flex-col">
                <div className="flex-1 bg-[#0d1117] rounded-xl border border-[#30363d] overflow-hidden flex flex-col">
                  <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d] flex items-center justify-between text-xs text-[#8b949e]">
                    <span className="font-mono text-white font-semibold">.github/workflows/ci-cd.yml</span>
                    <span className="text-[10px]">YAML Syntax</span>
                  </div>
                  <pre className="p-4 font-mono text-xs text-[#7ee787] overflow-x-auto flex-1 bg-[#0d1117] leading-relaxed">
                    <code>{generateYamlCode()}</code>
                  </pre>
                </div>
              </div>
            </div>

            {/* LIVE RUNNER TERMINAL & STEP STATUS */}
            <div className="bg-[#0d1117] rounded-xl border border-[#30363d] p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center justify-between">
                <span>GitHub Actions Runner Simulator Log</span>
                <span className="text-xs text-[#8b949e]">Runner OS: {runnerOs}</span>
              </h3>

              {/* Step Status Badges */}
              <div className="flex flex-wrap gap-2">
                {Object.keys(enabledSteps)
                  .filter((k) => enabledSteps[k])
                  .map((stepKey) => {
                    const status = ciStepStatuses[stepKey] || "pending";
                    return (
                      <div
                        key={stepKey}
                        className={`px-3 py-1 rounded-full text-xs font-mono border flex items-center space-x-1.5 ${
                          status === "success"
                            ? "bg-[#7ee787]/20 text-[#7ee787] border-[#7ee787]/40"
                            : status === "running"
                            ? "bg-[#58a6ff]/20 text-[#58a6ff] border-[#58a6ff]/40 animate-pulse"
                            : "bg-[#21262d] text-[#8b949e] border-[#30363d]"
                        }`}
                      >
                        <span>{status === "success" ? "✅" : status === "running" ? "🔄" : "⏳"}</span>
                        <span>{stepKey}</span>
                      </div>
                    );
                  })}
              </div>

              {/* Terminal Logs */}
              <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] font-mono text-xs text-gray-300 h-40 overflow-y-auto space-y-1">
                {ciTerminalLogs.length === 0 ? (
                  <div className="text-gray-500 italic">Click 'Run Pipeline' to execute simulated GitHub Actions workflow...</div>
                ) : (
                  ciTerminalLogs.map((log, idx) => (
                    <div key={idx} className="leading-relaxed">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE 3: SEMANTIC VERSIONING CALCULATOR */}
      {/* ========================================================================= */}
      {activeTab === "semver" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#161b22] border border-[#30363d] p-6 shadow-lg space-y-6">
            <div className="border-b border-[#30363d] pb-4">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>Semantic Versioning Calculator & Spec Checker</span>
              </h2>
              <p className="text-xs text-[#8b949e] mt-1">
                Understand MAJOR.MINOR.PATCH rules, Conventional Commits version bumping, and npm range resolution.
              </p>
            </div>

            {/* LIVE VERSION BADGE DISPLAY */}
            <div className="bg-[#0d1117] rounded-xl border border-[#30363d] p-6 text-center space-y-4">
              <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">Target SemVer String</div>
              <div className="text-4xl sm:text-5xl font-mono font-extrabold text-[#58a6ff] tracking-tight">
                {currentSemverString}
              </div>

              {/* BUMP BUTTONS */}
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  onClick={() => handleBumpSemver("major")}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#ff7b72]/20 text-[#ff7b72] border border-[#ff7b72]/40 hover:bg-[#ff7b72]/30 transition shadow"
                >
                  +1 MAJOR ({semverMajor + 1}.0.0)
                </button>
                <button
                  onClick={() => handleBumpSemver("minor")}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#ffa657]/20 text-[#ffa657] border border-[#ffa657]/40 hover:bg-[#ffa657]/30 transition shadow"
                >
                  +1 MINOR ({semverMajor}.${semverMinor + 1}.0)
                </button>
                <button
                  onClick={() => handleBumpSemver("patch")}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#7ee787]/20 text-[#7ee787] border border-[#7ee787]/40 hover:bg-[#7ee787]/30 transition shadow"
                >
                  +1 PATCH ({semverMajor}.${semverMinor}.${semverPatch + 1})
                </button>
              </div>
            </div>

            {/* TWO COLUMNS: CONVENTIONAL COMMITS vs RANGE RESOLUTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Conventional Commit Analyzer */}
              <div className="bg-[#0d1117] rounded-xl border border-[#30363d] p-5 space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <span>Conventional Commit Version Analyzer</span>
                </h3>
                <p className="text-xs text-[#8b949e]">
                  Type a commit message or select a preset to analyze automated release versioning.
                </p>

                <input
                  type="text"
                  value={commitMessageInput}
                  onChange={(e) => setCommitMessageInput(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#58a6ff]"
                />

                {/* Presets */}
                <div className="flex flex-wrap gap-2">
                  {[
                    "fix(auth): fix token expiry bug",
                    "feat(cart): add Apple Pay support",
                    "feat(api)!: break legacy endpoint",
                    "docs: update setup guide",
                  ].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setCommitMessageInput(preset)}
                      className="px-2.5 py-1 text-[11px] font-mono rounded bg-[#161b22] text-[#8b949e] border border-[#30363d] hover:text-white transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Result Box */}
                <div className="p-4 rounded-lg bg-[#161b22] border border-[#30363d] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8b949e]">Detected Version Bump:</span>
                    <span
                      className={`font-bold font-mono px-2 py-0.5 rounded ${
                        commitAnalysis.type === "MAJOR"
                          ? "bg-red-500/20 text-red-400 border border-red-500/40"
                          : commitAnalysis.type === "MINOR"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                          : commitAnalysis.type === "PATCH"
                          ? "bg-green-500/20 text-green-400 border border-green-500/40"
                          : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {commitAnalysis.type}
                    </span>
                  </div>
                  <div className="text-xs text-gray-300">{commitAnalysis.explanation}</div>
                </div>
              </div>

              {/* Right Column: NPM SemVer Range Resolution */}
              <div className="bg-[#0d1117] rounded-xl border border-[#30363d] p-5 space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <span>NPM Range Resolver (&apos;^&apos; vs &apos;~&apos; vs &apos;&gt;=&apos;)</span>
                </h3>
                <p className="text-xs text-[#8b949e]">
                  Test if a target dependency version satisfies a semver constraint range.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#8b949e] block mb-1">Range Specifier</label>
                    <input
                      type="text"
                      value={semverRangeInput}
                      onChange={(e) => setSemverRangeInput(e.target.value)}
                      className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#58a6ff]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#8b949e] block mb-1">Target Version</label>
                    <input
                      type="text"
                      value={testVersionInput}
                      onChange={(e) => setTestVersionInput(e.target.value)}
                      className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#58a6ff]"
                    />
                  </div>
                </div>

                {/* Range Evaluation Result Box */}
                <div
                  className={`p-4 rounded-lg border space-y-2 ${
                    rangeEvaluation.isMatch
                      ? "bg-[#7ee787]/10 border-[#7ee787]/40 text-[#7ee787]"
                      : "bg-[#ff7b72]/10 border-[#ff7b72]/40 text-[#ff7b72]"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>STATUS: {rangeEvaluation.isMatch ? "MATCHES RANGE (ALLOWED)" : "INVALID / OUT OF RANGE"}</span>
                    <span>{rangeEvaluation.isMatch ? "✅" : "❌"}</span>
                  </div>
                  <div className="text-xs leading-relaxed text-gray-200 font-mono">
                    {rangeEvaluation.reason}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE 4: DEPLOYMENT STRATEGY SIMULATOR */}
      {/* ========================================================================= */}
      {activeTab === "deploy" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#161b22] border border-[#30363d] p-6 shadow-lg space-y-6">
            <div className="border-b border-[#30363d] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <span>Deployment Strategy Comparison & Simulator</span>
                </h2>
                <p className="text-xs text-[#8b949e] mt-1">
                  Visualize Recreate, Rolling Update, Blue/Green, and Canary deployments in action.
                </p>
              </div>

              {/* Strategy Selector Switcher */}
              <div className="flex bg-[#0d1117] p-1 rounded-xl border border-[#30363d] overflow-x-auto">
                {(["rolling", "canary", "bluegreen", "recreate"] as DeployStrategy[]).map((strat) => (
                  <button
                    key={strat}
                    onClick={() => {
                      setDeployStrategy(strat);
                      handleResetDeploy();
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
                      deployStrategy === strat
                        ? "bg-[#58a6ff] text-white shadow"
                        : "text-[#8b949e] hover:text-white"
                    }`}
                  >
                    {strat}
                  </button>
                ))}
              </div>
            </div>

            {/* CONTROLS BAR */}
            <div className="bg-[#0d1117] rounded-xl border border-[#30363d] p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-3 text-xs">
                <span className="font-semibold text-white">Simulation Step: {deployStep} / 4</span>
                <span className="text-[#8b949e]">|</span>
                <span className="text-[#58a6ff] font-mono">
                  Strategy: {deployStrategy.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrevDeployStep}
                  disabled={deployStep === 0 || isSimulatingDeploy}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#21262d] text-white border border-[#30363d] hover:bg-[#30363d] disabled:opacity-50 transition"
                >
                  ⏮ Step Back
                </button>
                <button
                  onClick={handleNextDeployStep}
                  disabled={deployStep === 4 || isSimulatingDeploy}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#21262d] text-white border border-[#30363d] hover:bg-[#30363d] disabled:opacity-50 transition"
                >
                  Step Forward ⏭
                </button>
                <button
                  onClick={() => setIsSimulatingDeploy(!isSimulatingDeploy)}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#58a6ff] text-white hover:bg-[#4794e6] transition shadow"
                >
                  {isSimulatingDeploy ? "⏸ Pause" : "▶ Play Simulation"}
                </button>
                <button
                  onClick={() => setSimulateError(!simulateError)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                    simulateError
                      ? "bg-red-500 text-white border-red-400"
                      : "bg-[#21262d] text-red-400 border-red-500/40 hover:bg-red-500/10"
                  }`}
                >
                  🚨 {simulateError ? "Clear Error" : "Simulate Rollback"}
                </button>
                <button
                  onClick={handleResetDeploy}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#21262d] text-[#8b949e] border border-[#30363d] hover:text-white transition"
                >
                  🔄 Reset
                </button>
              </div>
            </div>

            {/* TOPOLOGY VISUALIZER */}
            <div className="bg-[#0d1117] rounded-xl border border-[#30363d] p-6 space-y-6">
              {/* Traffic Load Balancer Router Bar */}
              <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-white flex items-center space-x-2">
                    <span>🌐 Load Balancer Router Split</span>
                  </span>
                  <span className="font-mono text-[#58a6ff]">
                    V1 Traffic: {traffic.v1}% | V2 Traffic: {traffic.v2}%
                  </span>
                </div>
                <div className="h-3 w-full bg-[#0d1117] rounded-full overflow-hidden flex border border-[#30363d]">
                  <div
                    className="bg-[#58a6ff] h-full transition-all duration-500"
                    style={{ width: `${traffic.v1}%` }}
                  />
                  <div
                    className="bg-[#7ee787] h-full transition-all duration-500"
                    style={{ width: `${traffic.v2}%` }}
                  />
                </div>
              </div>

              {/* PODS GRID VISUALIZER */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Cluster Pod Instances (Total: 8 Pods)</span>
                  {traffic.downtime && (
                    <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-bold animate-pulse">
                      🚨 100% SERVICE DOWNTIME (Recreate Strategy)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {podsState.map((pod) => (
                    <div
                      key={pod.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                        pod.status === "error"
                          ? "bg-red-500/10 border-red-500/50 text-red-400 animate-bounce"
                          : pod.status === "terminating"
                          ? "bg-[#21262d] border-[#ff7b72]/40 opacity-40"
                          : pod.version === "v2"
                          ? "bg-[#7ee787]/10 border-[#7ee787]/40 text-[#7ee787]"
                          : "bg-[#58a6ff]/10 border-[#58a6ff]/40 text-[#58a6ff]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono font-bold">
                        <span>Pod #{pod.id}</span>
                        <span className="text-[10px] uppercase font-sans px-1.5 py-0.5 rounded bg-[#0d1117]/60 border border-current">
                          {pod.version.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-gray-300">
                        Status: <span className="font-bold">{pod.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* COMPARISON MATRIX TABLE */}
            <div className="bg-[#0d1117] rounded-xl border border-[#30363d] p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">
                Deployment Strategy Technical Comparison
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#30363d] text-[#8b949e]">
                      <th className="p-3">Strategy</th>
                      <th className="p-3">Downtime</th>
                      <th className="p-3">Resource Overhead</th>
                      <th className="p-3">Rollback Speed</th>
                      <th className="p-3">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30363d] text-gray-300">
                    <tr className={deployStrategy === "recreate" ? "bg-[#58a6ff]/10 font-semibold" : ""}>
                      <td className="p-3 text-white font-bold">Recreate</td>
                      <td className="p-3 text-red-400">High (Service down during switch)</td>
                      <td className="p-3">1.0x (No extra nodes required)</td>
                      <td className="p-3">Slow (Re-deploy V1)</td>
                      <td className="p-3 text-red-400">High</td>
                    </tr>
                    <tr className={deployStrategy === "rolling" ? "bg-[#58a6ff]/10 font-semibold" : ""}>
                      <td className="p-3 text-white font-bold">Rolling Update</td>
                      <td className="p-3 text-green-400">Zero Downtime</td>
                      <td className="p-3">1.25x (MaxSurge / MaxUnavailable)</td>
                      <td className="p-3">Moderate</td>
                      <td className="p-3 text-amber-400">Medium</td>
                    </tr>
                    <tr className={deployStrategy === "bluegreen" ? "bg-[#58a6ff]/10 font-semibold" : ""}>
                      <td className="p-3 text-white font-bold">Blue / Green</td>
                      <td className="p-3 text-green-400">Zero Downtime</td>
                      <td className="p-3 text-amber-400">2.0x (Full duplicated cluster)</td>
                      <td className="p-3 text-green-400">Instant (Router switch)</td>
                      <td className="p-3 text-green-400">Low</td>
                    </tr>
                    <tr className={deployStrategy === "canary" ? "bg-[#58a6ff]/10 font-semibold" : ""}>
                      <td className="p-3 text-white font-bold">Canary</td>
                      <td className="p-3 text-green-400">Zero Downtime</td>
                      <td className="p-3">1.1x - 1.5x</td>
                      <td className="p-3 text-green-400">Instant (Shift traffic back)</td>
                      <td className="p-3 text-green-400">Lowest (Progressive risk)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
