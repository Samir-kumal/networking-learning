import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AwsSecretsManagerSection from "./AwsSecretsManagerSection";

describe("AwsSecretsManagerSection", () => {
  it("renders all five interactive modules", () => {
    const html = renderToStaticMarkup(<AwsSecretsManagerSection />);
    // Module anchors
    for (const id of [
      "sm-hierarchy",
      "sm-rotation",
      "sm-cross-account",
      "sm-iam-eval",
      "sm-versions",
    ]) {
      expect(html).toContain(`id="${id}"`);
    }
    // Hierarchy visualizer: parameter types + paths
    expect(html).toContain("SecureString");
    expect(html).toContain("StringList");
    expect(html).toContain("/prod/api/db/password");
    // Rotation scheduler: cron + schedule board
    expect(html).toContain("cron(0 3 1 * ? *)");
    expect(html).toContain("Upcoming rotation runs");
    // Cross-account trust policy builder
    expect(html).toContain("AllowCrossAccountSecretAccess");
    expect(html).toContain("arn:aws:iam::210987654321:role/app-prod-role");
    // IAM policy evaluator: default request is allowed by least-privilege preset
    expect(html).toContain("✔ ALLOW");
    expect(html).toContain("Statement-by-statement analysis");
    // Version history viewer
    expect(html).toContain("AWSCURRENT");
    expect(html).toContain("AWSPREVIOUS");
    expect(html).toContain("Already AWSCURRENT");
  });
});
