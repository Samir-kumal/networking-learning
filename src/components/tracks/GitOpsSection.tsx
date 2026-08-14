"use client";

import { useState, useEffect } from "react";
import {
  analyzeCommitBump,
  evaluateSemverRange,
  generateWorkflowYaml,
  GITOPS_HASH_BY_TAB,
  GITOPS_TAB_BY_HASH,
  type GitOpsTab,
} from "@/lib/gitops";

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
  const [activeTab, setActiveTab] = useState<GitOpsTab>("git");

  useEffect(() => {
    const syncTabToHash = () => {
      const tab = GITOPS_TAB_BY_HASH[window.location.hash.slice(1)];
      if (tab) setActiveTab(tab);
    };

    syncTabToHash();
    window.addEventListener("hashchange", syncTabToHash);
    return () => window.removeEventListener("hashchange", syncTabToHash);
  }, []);

  useEffect(() => {
    const targetId = GITOPS_HASH_BY_TAB[activeTab];
    if (window.location.hash === `#${targetId}`) {
      document.getElementById(targetId)?.scrollIntoView({ block: "start" });
    }
  }, [activeTab]);

  const handleTabChange = (tab: GitOpsTab) => {
    const hash = `#${GITOPS_HASH_BY_TAB[tab]}`;
    if (window.location.hash !== hash) {
      window.history.pushState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
      window.dispatchEvent(new Event("hashchange"));
    }
    setActiveTab(tab);
  };

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
    const hashDev = Math.random().toString(36).substring(2, 9);
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
    const devMerge: CommitNode = {
      id: (Date.now() + 1).toString(),
      hash: hashDev,
      branch: "develop",
      message: `Merge hotfix '${activeHotfixBranch}' back into develop`,
      type: "merge",
      timestamp: new Date().toLocaleTimeString(),
    };
    setGitflowCommits((prev) => [...prev, mainMerge, devMerge]);
    addGitLog(`🔥 Merged ${activeHotfixBranch} into main (Tagged ${tag}) & back into develop.`);
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
  const generateYamlCode = () => generateWorkflowYaml({
    pipelineName,
    pipelineTriggers,
    runnerOs,
    nodeVersion,
    enabledSteps,
  });

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
        setCiTerminalLogs((prev) => [...prev, "🎉 Simulation completed. No GitHub Actions jobs were executed."]);
        return;
      }

      const stepName = activeStepsList[stepIdx];
      setCiStepStatuses((prev) => ({ ...prev, [stepName]: "running" }));

      // Add log
      let logMsg = "";
      switch (stepName) {
        case "checkout":
          logMsg = "📥 [checkout] Simulated repository checkout.";
          break;
        case "setupNode":
          logMsg = `🟢 [setup-node] Simulated Node.js ${nodeVersion} setup on ${runnerOs}.`;
          break;
        case "npmInstall":
          logMsg = "📦 [npm ci] Simulated lockfile-based dependency installation.";
          break;
        case "lint":
          logMsg = "🔍 [npm run lint] Simulated lint command. Run the repository workflow for current diagnostics.";
          break;
        case "test":
          logMsg = "🧪 [npm test] Simulated test command. Run the repository workflow for current test results.";
          break;
        case "securityScan":
          logMsg = "🛡️ [trivy-action] Simulated filesystem scan configured for HIGH and CRITICAL findings.";
          break;
        case "dockerBuild":
          logMsg = "🐳 [docker-build] Simulated image build and push using the generated GHCR workflow.";
          break;
        case "deployK8s":
          logMsg = "☸️ [k8s-deploy] Simulated manifest deployment; cluster context is required for a real run.";
          break;
        case "slackNotify":
          logMsg = "🔔 [slack-notify] Simulated failure notification step.";
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
  const commitAnalysis = analyzeCommitBump(commitMessageInput);


  const rangeEvaluation = evaluateSemverRange(semverRangeInput, testVersionInput);

  // ==========================================
  // 4. DEPLOYMENT STRATEGY SIMULATOR STATE
  // ==========================================
  const [deployStrategy, setDeployStrategy] = useState<DeployStrategy>("rolling");
  const [deployStep, setDeployStep] = useState<number>(0); // 0 to 4
  const [isSimulatingDeploy, setIsSimulatingDeploy] = useState<boolean>(false);
  const [simulateError, setSimulateError] = useState<boolean>(false);
  const [deploymentAssumptions, setDeploymentAssumptions] = useState({
    readinessProbes: true,
    trafficRouting: true,
    dataCompatible: true,
    observability: true,
  });
  const deploymentModelReady = Object.values(deploymentAssumptions).every(Boolean);
  const deploymentAssumptionItems: Array<{
    key: keyof typeof deploymentAssumptions;
    label: string;
    description: string;
  }> = [
    {
      key: "readinessProbes",
      label: "Readiness probes",
      description: "New Pods report ready before traffic moves.",
    },
    {
      key: "trafficRouting",
      label: "Traffic routing",
      description: "A Service, gateway, or load balancer can shift traffic.",
    },
    {
      key: "dataCompatible",
      label: "Data/API compatibility",
      description: "The old and new versions can coexist during rollout.",
    },
    {
      key: "observability",
      label: "Rollback observability",
      description: "Health signals are available before progressing or reversing.",
    },
  ];

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
      <div className="relative rounded-2xl bg-gradient-to-r from-[#161b22] via-[#1c2333] to-[#0d1117] border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-xl overflow-hidden">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/30 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">🔀</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Git, GitHub Actions & CI/CD Track
              </h1>
            </div>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-3xl">
              Practice Git branching, GitHub Actions workflows, Semantic Versioning, and deployment strategies with explicit simulator assumptions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:self-start">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-600">
              Git 2.44+
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-400/40">
              GitHub Actions
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#ffa657]/20 text-amber-600 dark:text-amber-400 border border-amber-400/40">
              SemVer 2.0
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#bc8cff]/20 text-violet-600 dark:text-violet-400 border border-violet-400/40">
              Kubernetes Deploy
            </span>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-200 dark:border-slate-700 pt-4">
          <button
            onClick={() => handleTabChange("git")}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
              activeTab === "git"
                ? "bg-indigo-600 text-white shadow-lg shadow-[#58a6ff]/20 font-semibold"
                : "bg-[#21262d] text-slate-500 dark:text-slate-400 hover:text-white hover:bg-[#30363d]"
            }`}
          >
            <span>🔀</span>
            <span>1. Git Branching Lab</span>
          </button>
          <button
            onClick={() => handleTabChange("actions")}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
              activeTab === "actions"
                ? "bg-indigo-600 text-white shadow-lg shadow-[#58a6ff]/20 font-semibold"
                : "bg-[#21262d] text-slate-500 dark:text-slate-400 hover:text-white hover:bg-[#30363d]"
            }`}
          >
            <span>⚡</span>
            <span>2. GitHub Actions CI/CD</span>
          </button>
          <button
            onClick={() => handleTabChange("semver")}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
              activeTab === "semver"
                ? "bg-indigo-600 text-white shadow-lg shadow-[#58a6ff]/20 font-semibold"
                : "bg-[#21262d] text-slate-500 dark:text-slate-400 hover:text-white hover:bg-[#30363d]"
            }`}
          >
            <span>🏷️</span>
            <span>3. SemVer Calculator</span>
          </button>
          <button
            onClick={() => handleTabChange("deploy")}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
              activeTab === "deploy"
                ? "bg-indigo-600 text-white shadow-lg shadow-[#58a6ff]/20 font-semibold"
                : "bg-[#21262d] text-slate-500 dark:text-slate-400 hover:text-white hover:bg-[#30363d]"
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
        <div id="git-branching" className="space-y-6">
          {/* Strategy Toggle Card */}
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow shadow-lg space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <span>Git Branching Strategy Simulator</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Compare Trunk-Based Development vs GitFlow branching workflows in real time.
                </p>
              </div>

              {/* Mode Switcher */}
              <div className="flex bg-slate-50 dark:bg-slate-700 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => {
                    setGitStrategy("trunk");
                    addGitLog("Switched strategy mode to Trunk-Based Development.");
                  }}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    gitStrategy === "trunk"
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-500 dark:text-slate-400 hover:text-white"
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
                      ? "bg-emerald-500 text-slate-900 dark:text-slate-100 shadow"
                      : "text-slate-500 dark:text-slate-400 hover:text-white"
                  }`}
                >
                  GitFlow Model
                </button>
              </div>
            </div>

            {/* Strategy Overview & Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow space-y-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">Target Environment</div>
                <div className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                  {gitStrategy === "trunk" ? "Continuous Integration (CI/CD)" : "Versioned Releases"}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-300">
                  {gitStrategy === "trunk"
                    ? "Single main branch with short-lived change branches, commonly a few days or less."
                    : "Multiple branches can support versioned releases; teams choose the trade-offs."}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow space-y-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">Merge Conflict Risk</div>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {gitStrategy === "trunk" ? "Reduced Drift" : "Longer Integration Paths"}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-300">
                  {gitStrategy === "trunk"
                    ? "Frequent integration can reduce divergence, but conflicts still depend on team and change shape."
                    : "Long-lived branches can increase divergence and integration work."}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow space-y-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">Feature Flags</div>
                <div className="text-base font-bold text-amber-600 dark:text-amber-400">
                  {gitStrategy === "trunk" ? "Commonly Used" : "Optional"}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-300">
                  {gitStrategy === "trunk"
                    ? "Flags can separate deployment from user-visible release when incomplete work is integrated."
                    : "Features may remain isolated in branches until ready."}
                </div>
              </div>
            </div>

            {/* CONTROLS & ACTIONS */}
            <div className="bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center justify-between">
                <span>Interactive Git Operations ({gitStrategy === "trunk" ? "Trunk-Based" : "GitFlow"})</span>
                <span className="text-xs text-indigo-600 dark:text-indigo-400">Active Branch: {activeFeatureBranch || activeReleaseBranch || activeHotfixBranch || (gitStrategy === "trunk" ? "main" : "develop")}</span>
              </h3>

              {gitStrategy === "trunk" ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleTrunkCreateBranch}
                    disabled={!!activeFeatureBranch}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-[#21262d] text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-600 hover:bg-indigo-50 disabled:opacity-50 transition"
                  >
                    ➕ Create Feature Branch
                  </button>
                  <button
                    onClick={handleTrunkCommit}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-[#21262d] text-emerald-600 dark:text-emerald-400 border border-emerald-400/40 hover:bg-emerald-50 transition"
                  >
                    📝 Commit Changes
                  </button>
                  <button
                    onClick={handleTrunkMergePR}
                    disabled={!activeFeatureBranch}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-[#21262d] text-amber-600 dark:text-amber-400 border border-amber-400/40 hover:bg-amber-50 disabled:opacity-50 transition"
                  >
                    🔀 Create PR & Squash Merge
                  </button>
                  <button
                    onClick={handleTrunkDeploy}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-[#4794e6] font-semibold transition shadow-md"
                  >
                    🚀 Tag & Deploy to Prod
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleGitflowNewFeature}
                    disabled={!!activeFeatureBranch}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-[#21262d] text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-600 hover:bg-indigo-50 disabled:opacity-50 transition"
                  >
                    ➕ New Feature (from develop)
                  </button>
                  <button
                    onClick={handleGitflowCommitFeature}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-[#21262d] text-emerald-600 dark:text-emerald-400 border border-emerald-400/40 hover:bg-emerald-50 transition"
                  >
                    📝 Commit to Feature
                  </button>
                  <button
                    onClick={handleGitflowFinishFeature}
                    disabled={!activeFeatureBranch}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-[#21262d] text-amber-600 dark:text-amber-400 border border-amber-400/40 hover:bg-amber-50 disabled:opacity-50 transition"
                  >
                    🔀 Finish Feature (Merge to dev)
                  </button>
                  <button
                    onClick={handleGitflowStartRelease}
                    disabled={!!activeReleaseBranch}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-[#21262d] text-violet-600 dark:text-violet-400 border border-violet-400/40 hover:bg-violet-50 disabled:opacity-50 transition"
                  >
                    📦 Create Release Branch
                  </button>
                  <button
                    onClick={handleGitflowFinishRelease}
                    disabled={!activeReleaseBranch}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-emerald-500 text-slate-900 dark:text-slate-100 font-bold hover:bg-[#68d172] disabled:opacity-50 transition shadow"
                  >
                    ✅ Finish Release (Merge & Tag)
                  </button>
                  <button
                    onClick={handleGitflowStartHotfix}
                    disabled={!!activeHotfixBranch}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-[#ff7b72]/20 text-rose-600 dark:text-rose-400 border border-rose-400/40 hover:bg-[#ff7b72]/30 disabled:opacity-50 transition"
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
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
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
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-400/40"
                            : "bg-[#21262d] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
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
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  Commit History DAG Visualizer ({gitStrategy === "trunk" ? "Trunk-Based" : "GitFlow"})
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Showing {(gitStrategy === "trunk" ? trunkCommits : gitflowCommits).length} commits
                </span>
              </div>

              {/* DAG Timeline */}
              <div className="overflow-x-auto pb-2">
                <div className="min-w-[650px] space-y-3">
                  {(gitStrategy === "trunk" ? trunkCommits : gitflowCommits).map((node, idx) => (
                    <div
                      key={node.id}
                      className="flex items-center space-x-4 p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs transition hover:border-indigo-300"
                    >
                      {/* Commit Node Badge */}
                      <div className="font-mono text-[11px] px-2 py-1 rounded bg-slate-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 font-bold">
                        {node.hash}
                      </div>

                      {/* Branch Label */}
                      <div
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                          node.branch === "main"
                            ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700"
                            : node.branch === "develop"
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700"
                            : node.branch.startsWith("release")
                            ? "bg-[#bc8cff]/20 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-700"
                            : node.branch.startsWith("hotfix")
                            ? "bg-[#ff7b72]/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-700"
                            : "bg-[#ffa657]/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700"
                        }`}
                      >
                        {node.branch}
                      </div>

                      {/* Message */}
                      <div className="flex-1 text-white font-mono truncate">{node.message}</div>

                      {/* Tag Badge */}
                      {node.tag && (
                        <div className="px-2 py-0.5 rounded bg-[#ffa657]/20 text-amber-600 dark:text-amber-400 font-mono text-[10px] font-bold border border-amber-400/40 flex items-center space-x-1">
                          <span>🏷️</span>
                          <span>{node.tag}</span>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{node.timestamp}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* LIVE GIT CLI LOG TERMINAL */}
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow overflow-hidden">
              <div className="bg-white dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center space-x-2 font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  <span className="ml-2 text-white font-semibold">Terminal Stdout Log</span>
                </div>
                <span>git-cli v2.44</span>
              </div>
              <div className="p-4 font-mono text-xs text-emerald-600 dark:text-emerald-400 space-y-1 h-36 overflow-y-auto bg-slate-50 dark:bg-slate-700">
                {gitConsoleLogs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">
                    <span className="text-slate-500 dark:text-slate-400">$</span> {log}
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
        <div id="git-actions" className="space-y-6">
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow shadow-lg space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-700 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <span>GitHub Actions CI/CD Pipeline Builder</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Configure triggers and steps to generate an illustrative workflow; review permissions, registries, cluster context, and secrets before use.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCopyYaml}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#21262d] text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-600 hover:bg-indigo-50 transition flex items-center space-x-1.5"
                >
                  <span>{copySuccess ? "✅ Copied!" : "📋 Copy YAML"}</span>
                </button>
                <button
                  onClick={handleRunCiSimulation}
                  disabled={isSimulatingCi}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 text-slate-900 dark:text-slate-100 hover:bg-[#68d172] disabled:opacity-50 transition shadow-lg flex items-center space-x-1.5"
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
                <div className="bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                  <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    1. General Settings & OS Matrix
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Pipeline Name</label>
                      <input
                        type="text"
                        value={pipelineName}
                        onChange={(e) => setPipelineName(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Runner OS</label>
                      <select
                        value={runnerOs}
                        onChange={(e) => setRunnerOs(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                      >
                        <option value="ubuntu-latest">ubuntu-latest</option>
                        <option value="macos-latest">macos-latest</option>
                        <option value="windows-latest">windows-latest</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Event Triggers */}
                <div className="bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                  <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    2. Workflow Triggers (`on:`)
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center space-x-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pipelineTriggers.pushMain}
                        onChange={(e) => setPipelineTriggers({ ...pipelineTriggers, pushMain: e.target.checked })}
                        className="accent-[#58a6ff]"
                      />
                      <span className="text-white">push (main)</span>
                    </label>
                    <label className="flex items-center space-x-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pipelineTriggers.pullRequest}
                        onChange={(e) => setPipelineTriggers({ ...pipelineTriggers, pullRequest: e.target.checked })}
                        className="accent-[#58a6ff]"
                      />
                      <span className="text-white">pull_request</span>
                    </label>
                    <label className="flex items-center space-x-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pipelineTriggers.workflowDispatch}
                        onChange={(e) => setPipelineTriggers({ ...pipelineTriggers, workflowDispatch: e.target.checked })}
                        className="accent-[#58a6ff]"
                      />
                      <span className="text-white">workflow_dispatch</span>
                    </label>
                    <label className="flex items-center space-x-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
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
                <div className="bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                  <h3 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    3. Build Steps & Actions
                  </h3>
                  <div className="space-y-2 text-xs">
                    {[
                      { id: "checkout", label: "Checkout Code (actions/checkout@v7)" },
                      { id: "setupNode", label: `Setup Node.js Environment (${nodeVersion})` },
                      { id: "npmInstall", label: "Install Dependencies (npm ci)" },
                      { id: "lint", label: "Run Linter (npm run lint)" },
                      { id: "test", label: "Execute Tests (npm test)" },
                      { id: "securityScan", label: "Failing Filesystem Scan (Trivy)" },
                      { id: "dockerBuild", label: "Build & Publish on main (GHCR)" },
                      { id: "deployK8s", label: "Kubernetes Deploy (configured context)" },
                      { id: "slackNotify", label: "Slack Notification on Failure" },
                    ].map((step) => (
                      <label
                        key={step.id}
                        className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition ${
                          enabledSteps[step.id]
                            ? "bg-white dark:bg-slate-800 border-indigo-300 dark:border-indigo-600 text-white"
                            : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
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
                <div className="flex-1 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                  <div className="bg-white dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono text-white font-semibold">.github/workflows/ci-cd.yml</span>
                    <span className="text-[10px]">YAML Syntax</span>
                  </div>
                  <pre className="p-4 font-mono text-xs text-emerald-600 dark:text-emerald-400 overflow-x-auto flex-1 bg-slate-50 dark:bg-slate-700 leading-relaxed">
                    <code>{generateYamlCode()}</code>
                  </pre>
                </div>
              </div>
            </div>

            {/* LIVE RUNNER TERMINAL & STEP STATUS */}
            <div className="bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center justify-between">
                <span>GitHub Actions Runner Simulator Log</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Runner OS: {runnerOs}</span>
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
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-400/40"
                            : status === "running"
                            ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-600 animate-pulse"
                            : "bg-[#21262d] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <span>{status === "success" ? "✅" : status === "running" ? "🔄" : "⏳"}</span>
                        <span>{stepKey}</span>
                      </div>
                    );
                  })}
              </div>

              {/* Terminal Logs */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-gray-300 h-40 overflow-y-auto space-y-1">
                {ciTerminalLogs.length === 0 ? (
                  <div className="text-gray-500 dark:text-gray-400 italic">Click &apos;Run Pipeline&apos; to execute simulated GitHub Actions workflow...</div>
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
        <div id="git-semver" className="space-y-6">
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow shadow-lg space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>Semantic Versioning Calculator & Spec Checker</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Understand MAJOR.MINOR.PATCH rules, Conventional Commits version bumping, and npm range resolution.
              </p>
            </div>

            {/* LIVE VERSION BADGE DISPLAY */}
            <div className="bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-center space-y-4">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target SemVer String</div>
              <div className="text-4xl sm:text-5xl font-mono font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight">
                {currentSemverString}
              </div>

              {/* BUMP BUTTONS */}
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  onClick={() => handleBumpSemver("major")}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#ff7b72]/20 text-rose-600 dark:text-rose-400 border border-rose-400/40 hover:bg-[#ff7b72]/30 transition shadow"
                >
                  +1 MAJOR ({semverMajor + 1}.0.0)
                </button>
                <button
                  onClick={() => handleBumpSemver("minor")}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#ffa657]/20 text-amber-600 dark:text-amber-400 border border-amber-400/40 hover:bg-[#ffa657]/30 transition shadow"
                >
                  +1 MINOR ({semverMajor}.${semverMinor + 1}.0)
                </button>
                <button
                  onClick={() => handleBumpSemver("patch")}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-400/40 hover:bg-emerald-500/30 transition shadow"
                >
                  +1 PATCH ({semverMajor}.${semverMinor}.${semverPatch + 1})
                </button>
              </div>
            </div>

            {/* TWO COLUMNS: CONVENTIONAL COMMITS vs RANGE RESOLUTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Conventional Commit Analyzer */}
              <div className="bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <span>Conventional Commit Version Analyzer</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Type a commit message or select a preset to analyze automated release versioning.
                </p>

                <input
                  type="text"
                  value={commitMessageInput}
                  onChange={(e) => setCommitMessageInput(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-400"
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
                      className="px-2.5 py-1 text-[11px] font-mono rounded bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-white transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Result Box */}
                <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Detected Version Bump:</span>
                    <span
                      className={`font-bold font-mono px-2 py-0.5 rounded ${
                        commitAnalysis.type === "MAJOR"
                          ? "bg-red-500/20 text-red-400 dark:text-red-300 border border-red-500/40"
                          : commitAnalysis.type === "MINOR"
                          ? "bg-amber-500/20 text-amber-400 dark:text-amber-300 border border-amber-500/40"
                          : commitAnalysis.type === "PATCH"
                          ? "bg-green-500/20 text-green-400 dark:text-green-300 border border-green-500/40"
                          : "bg-gray-500/20 text-gray-400 dark:text-gray-300"
                      }`}
                    >
                      {commitAnalysis.type}
                    </span>
                  </div>
                  <div className="text-xs text-gray-300">{commitAnalysis.explanation}</div>
                </div>
              </div>

              {/* Right Column: npm node-semver Range Resolution */}
              <div className="bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <span>npm node-semver Range Resolver</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Evaluate npm&apos;s full range grammar, including comparator sets, unions, wildcards, hyphen ranges, and prerelease rules.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Range Specifier</label>
                    <input
                      type="text"
                      value={semverRangeInput}
                      onChange={(e) => setSemverRangeInput(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Target Version</label>
                    <input
                      type="text"
                      value={testVersionInput}
                      onChange={(e) => setTestVersionInput(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>

                {/* Range Evaluation Result Box */}
                <div
                  className={`p-4 rounded-lg border space-y-2 ${
                    rangeEvaluation.isMatch
                      ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400/40 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-50 dark:bg-rose-900/30 border-rose-400/40 text-rose-600 dark:text-rose-400"
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
        <div id="git-deploy" className="space-y-6">
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 card-shadow shadow-lg space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-700 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <span>Deployment Strategy Comparison & Simulator</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  An illustrative eight-pod model; real availability and rollback depend on probes, routing, capacity, data compatibility, and configuration.
                </p>
              </div>

              {/* Strategy Selector Switcher */}
              <div className="flex bg-slate-50 dark:bg-slate-700 p-1 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
                {(["rolling", "canary", "bluegreen", "recreate"] as DeployStrategy[]).map((strat) => (
                  <button
                    key={strat}
                    onClick={() => {
                      setDeployStrategy(strat);
                      handleResetDeploy();
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
                      deployStrategy === strat
                        ? "bg-indigo-600 text-white shadow"
                        : "text-slate-500 dark:text-slate-400 hover:text-white"
                    }`}
                  >
                    {strat}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">Simulation assumptions</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    These are explicit teaching inputs, not live cluster health signals.
                  </p>
                </div>
                <span className={`text-xs font-semibold ${deploymentModelReady ? "text-emerald-400" : "text-amber-300"}`}>
                  Model conditions: {deploymentModelReady ? "all checked" : "incomplete"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {deploymentAssumptionItems.map((assumption) => (
                  <label key={assumption.key} className="flex items-start gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={deploymentAssumptions[assumption.key]}
                      onChange={(event) =>
                        setDeploymentAssumptions((previous) => ({
                          ...previous,
                          [assumption.key]: event.target.checked,
                        }))
                      }
                      className="mt-0.5 accent-indigo-500"
                    />
                    <span>
                      <span className="block font-semibold text-white">{assumption.label}</span>
                      <span className="block text-slate-500 dark:text-slate-400">{assumption.description}</span>
                    </span>
                  </label>
                ))}
              </div>
              {!deploymentModelReady && (
                <p className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  One or more prerequisites is unchecked. Traffic percentages remain illustrative and must not be read as a zero-downtime guarantee.
                </p>
              )}
            </div>

            {/* CONTROLS BAR */}
            <div className="bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-3 text-xs">
                <span className="font-semibold text-white">Simulation Step: {deployStep} / 4</span>
                <span className="text-slate-500 dark:text-slate-400">|</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                  Strategy: {deployStrategy.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrevDeployStep}
                  disabled={deployStep === 0 || isSimulatingDeploy}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#21262d] text-white border border-slate-200 dark:border-slate-700 hover:bg-[#30363d] disabled:opacity-50 transition"
                >
                  ⏮ Step Back
                </button>
                <button
                  onClick={handleNextDeployStep}
                  disabled={deployStep === 4 || isSimulatingDeploy}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#21262d] text-white border border-slate-200 dark:border-slate-700 hover:bg-[#30363d] disabled:opacity-50 transition"
                >
                  Step Forward ⏭
                </button>
                <button
                  onClick={() => setIsSimulatingDeploy(!isSimulatingDeploy)}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-[#4794e6] transition shadow"
                >
                  {isSimulatingDeploy ? "⏸ Pause" : "▶ Play Simulation"}
                </button>
                <button
                  onClick={() => setSimulateError(!simulateError)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                    simulateError
                      ? "bg-red-500 text-white border-red-400"
                      : "bg-[#21262d] text-red-400 dark:text-red-300 border-red-500/40 hover:bg-red-500/10"
                  }`}
                >
                  🚨 {simulateError ? "Clear Error" : "Simulate Rollback"}
                </button>
                <button
                  onClick={handleResetDeploy}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#21262d] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-white transition"
                >
                  🔄 Reset
                </button>
              </div>
            </div>

            {/* TOPOLOGY VISUALIZER */}
            <div className="bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
              {/* Traffic Load Balancer Router Bar */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-white flex items-center space-x-2">
                    <span>🌐 Load Balancer Router Split</span>
                  </span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">
                    V1 Traffic: {traffic.v1}% | V2 Traffic: {traffic.v2}%
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-50 dark:bg-slate-700 rounded-full overflow-hidden flex border border-slate-200 dark:border-slate-700">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-500"
                    style={{ width: `${traffic.v1}%` }}
                  />
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${traffic.v2}%` }}
                  />
                </div>
              </div>

              {/* PODS GRID VISUALIZER */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Illustrative Cluster Pod Instances (Total: 8 Pods)</span>
                  {traffic.downtime && (
                    <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 dark:text-red-300 border border-red-500/40 text-[10px] font-bold animate-pulse">
                      🚨 Modelled service interruption for Recreate
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {podsState.map((pod) => (
                    <div
                      key={pod.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                        pod.status === "error"
                          ? "bg-red-500/10 border-red-500/50 text-red-400 dark:text-red-300 animate-bounce"
                          : pod.status === "terminating"
                          ? "bg-[#21262d] border-rose-400/40 opacity-40"
                          : pod.version === "v2"
                          ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400/40 text-emerald-600 dark:text-emerald-400"
                          : "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono font-bold">
                        <span>Pod #{pod.id}</span>
                        <span className="text-[10px] uppercase font-sans px-1.5 py-0.5 rounded bg-slate-50/60 dark:bg-slate-700/60 border border-current">
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
            <div className="bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">
                Deployment Strategy Technical Comparison
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      <th className="p-3">Strategy</th>
                      <th className="p-3">Typical Availability</th>
                      <th className="p-3">Capacity Model</th>
                      <th className="p-3">Rollback Model</th>
                      <th className="p-3">Primary Trade-off</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30363d] text-gray-300">
                    <tr className={deployStrategy === "recreate" ? "bg-indigo-50 dark:bg-indigo-900/30 font-semibold" : ""}>
                      <td className="p-3 text-white font-bold">Recreate</td>
                      <td className="p-3 text-amber-400 dark:text-amber-300">Interruption expected</td>
                      <td className="p-3">One environment</td>
                      <td className="p-3">Redeploy previous version</td>
                      <td className="p-3 text-red-400 dark:text-red-300">Availability during replacement</td>
                    </tr>
                    <tr className={deployStrategy === "rolling" ? "bg-indigo-50 dark:bg-indigo-900/30 font-semibold" : ""}>
                      <td className="p-3 text-white font-bold">Rolling Update</td>
                      <td className="p-3 text-amber-400 dark:text-amber-300">Can preserve availability with healthy probes</td>
                      <td className="p-3">Surge/unavailable settings apply</td>
                      <td className="p-3">Reverse rollout if configured</td>
                      <td className="p-3 text-amber-400 dark:text-amber-300">Capacity and rollout tuning</td>
                    </tr>
                    <tr className={deployStrategy === "bluegreen" ? "bg-indigo-50 dark:bg-indigo-900/30 font-semibold" : ""}>
                      <td className="p-3 text-white font-bold">Blue / Green</td>
                      <td className="p-3 text-amber-400 dark:text-amber-300">Can preserve availability with routing</td>
                      <td className="p-3">Two environments during cutover</td>
                      <td className="p-3">Switch traffic back if compatible</td>
                      <td className="p-3 text-amber-400 dark:text-amber-300">Duplicated capacity and data compatibility</td>
                    </tr>
                    <tr className={deployStrategy === "canary" ? "bg-indigo-50 dark:bg-indigo-900/30 font-semibold" : ""}>
                      <td className="p-3 text-white font-bold">Canary</td>
                      <td className="p-3 text-amber-400 dark:text-amber-300">Can preserve availability with progressive routing</td>
                      <td className="p-3">Subset plus baseline capacity</td>
                      <td className="p-3">Shift traffic back if compatible</td>
                      <td className="p-3 text-amber-400 dark:text-amber-300">Observability and routing controls</td>
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
