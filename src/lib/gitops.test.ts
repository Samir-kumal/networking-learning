import { describe, expect, it } from "vitest";
import {
  analyzeCommitBump,
  evaluateSemverRange,
  generateWorkflowYaml,
} from "./gitops";

describe("GitOps pure behavior", () => {
  it("recognizes conventional commit breaking syntax without false positives", () => {
    expect(analyzeCommitBump("fix(api)!: remove a deprecated field").type).toBe("MAJOR");
    expect(analyzeCommitBump("docs: explain the ! operator").type).toBe("NONE");
    expect(analyzeCommitBump("refactor(core): simplify parser\n\nBREAKING CHANGE: callers must migrate").type).toBe("MAJOR");
  });

  it("delegates full npm node-semver range behavior", () => {
    expect(evaluateSemverRange("^1.4.0", "1.9.2").isMatch).toBe(true);
    expect(evaluateSemverRange("^1.4.0", "2.0.0").isMatch).toBe(false);
    expect(evaluateSemverRange("^0.2.5", "0.3.0").isMatch).toBe(false);
    expect(evaluateSemverRange("~1.4", "1.4.9").isMatch).toBe(true);
    expect(evaluateSemverRange("~1.4", "1.5.0").isMatch).toBe(false);
    expect(evaluateSemverRange("1.4.2", "1.4.2").isMatch).toBe(true);
    expect(evaluateSemverRange("1.x || >=2.5.0", "2.6.0").isMatch).toBe(true);
    expect(evaluateSemverRange("1.2.3 - 2.0.0", "2.0.1").isMatch).toBe(false);
    expect(evaluateSemverRange("1.2.x", "1.2.7").isMatch).toBe(true);
    expect(evaluateSemverRange("^1.4.0", "1.5.0-beta.1").isMatch).toBe(false);
    expect(evaluateSemverRange("*", "1.4.2-beta.1").isMatch).toBe(false);
    expect(evaluateSemverRange("not a range", "1.4.2").isMatch).toBe(false);
    expect(evaluateSemverRange(">=1.4.0", "not-a-version").isMatch).toBe(false);
  });

  it("generates a reviewable workflow with gated publishing and a failing scan", () => {
    const yaml = generateWorkflowYaml({
      pipelineName: "Production CI",
      pipelineTriggers: { pushMain: true, pullRequest: true, workflowDispatch: false, cronSchedule: false },
      runnerOs: "ubuntu-latest",
      nodeVersion: "20.x",
      enabledSteps: {
        checkout: true,
        setupNode: true,
        npmInstall: true,
        lint: false,
        test: true,
        securityScan: true,
        dockerBuild: true,
        deployK8s: true,
        slackNotify: true,
      },
    });
    expect(yaml).toContain("Azure/k8s-set-context@8698eba2499e9012f0d5085f8798077cce4bc526 # v5");
    expect(yaml).toContain("kubeconfig: ${{ secrets.KUBE_CONFIG_DATA }}");
    expect(yaml).toContain("Azure/k8s-deploy@51ca02a8b7225fbd0924aac359c5b336a5f1e5b4 # v7");
    expect(yaml).toContain("slackapi/slack-github-action@dcb1066f776dd043e64d0e8ba94ca15cc7e1875d # v4.0.0");
    expect(yaml).toContain("webhook: ${{ secrets.SLACK_WEBHOOK_URL }}");
    expect(yaml).toContain("if: ${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}");
    expect(yaml).toContain("packages: write");
    expect(yaml).not.toContain("azure/k8s-deploy");
    expect(yaml).toContain("slackapi/slack-github-action@dcb1066f776dd043e64d0e8ba94ca15cc7e1875d # v4.0.0");
    expect(yaml).toContain("webhook: ${{ secrets.SLACK_WEBHOOK_URL }}");
  });

  it("keeps an empty trigger selection runnable and explicit", () => {
    const yaml = generateWorkflowYaml({
      pipelineName: "Manual",
      pipelineTriggers: {},
      runnerOs: "ubuntu-latest",
      nodeVersion: "20.x",
      enabledSteps: {},
    });

    expect(yaml).toContain("workflow_dispatch: # Keep the workflow triggerable when no event is selected");
  });
});
