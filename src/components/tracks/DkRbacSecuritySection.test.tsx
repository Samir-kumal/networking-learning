import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import DkRbacSecuritySection from "./DkRbacSecuritySection";

describe("DkRbacSecuritySection smoke", () => {
  it("renders all six RBAC & security modules", () => {
    const html = renderToStaticMarkup(<DkRbacSecuritySection />);
    for (const id of [
      "dk-rbac-roles",
      "dk-rbac-bindings",
      "dk-rbac-evaluator",
      "dk-rbac-serviceaccounts",
      "dk-rbac-pss",
      "dk-rbac-security-context",
    ]) {
      expect(html).toContain(`id="${id}"`);
    }
    for (const name of [
      "ClusterRole Builder",
      "RoleBinding / ClusterRoleBinding Configurator",
      "Permission Evaluator",
      "ServiceAccount &amp; Pod Association",
      "Pod Security Standards",
      "Security Context Configurator",
      "Privileged",
      "Baseline",
      "Restricted",
      "serviceAccountName",
    ]) {
      expect(html).toContain(name);
    }
  });

  it("defaults the evaluator to an ALLOW decision path", () => {
    const html = renderToStaticMarkup(<DkRbacSecuritySection />);
    expect(html).toContain("ALLOW");
    // default request: ci-builder creates pods in ci-system
    expect(html).toContain("ci-builder-workloads");
    expect(html).toContain("ns/ci-system");
  });
});