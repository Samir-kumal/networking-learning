import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AppSecSection from "./AppSecSection";
import AwsSection from "./AwsSection";
import DockerK8sSection from "./DockerK8sSection";
import GitOpsSection from "./GitOpsSection";

const expectIds = (html: string, expected: string[]) => {
  const rendered = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  for (const id of expected) expect(rendered).toContain(id);
};

describe("module navigation anchors", () => {
  it("keeps AWS sidebar targets resolvable", () => {
    expectIds(renderToStaticMarkup(<AwsSection />), [
      "aws-vpc",
      "aws-iam",
      "aws-s3",
      "aws-compute",
      "aws-serverless",
    ]);
  });

  it("exposes the default GitOps tab target", () => {
    expectIds(renderToStaticMarkup(<GitOpsSection />), ["git-branching"]);
  });

  it("keeps Docker primary targets resolvable", () => {
    expectIds(renderToStaticMarkup(<DockerK8sSection />), [
      "k8s-dockerfile",
      "k8s-compose",
      "k8s-cluster",
      "k8s-helm",
      "k8s-argocd",
    ]);
  });
  it("keeps Cybersecurity targets resolvable", () => {
    expectIds(renderToStaticMarkup(<AppSecSection />), [
      "sec-scanners",
      "sec-owasp",
      "sec-vault",
      "sec-waf",
      "sec-threat-model",
      "sec-iam",
      "sec-api-security",
      "sec-zero-trust",
      "sec-incident-response",
      "sec-siem",
      "sec-supply-chain",
      "sec-container-security",
      "sec-cloud-posture",
      "sec-privacy-compliance",
    ]);
  });
});
