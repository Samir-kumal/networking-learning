import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import DkNetworkPolicySection from "./DkNetworkPolicySection";

const yamlExtract = (html: string): string => {
  const match = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
  return match ? match[1].replace(/&quot;/g, '"') : "";
};

describe("DkNetworkPolicySection", () => {
  it("renders all five interactive modules", () => {
    const html = renderToStaticMarkup(<DkNetworkPolicySection />);
    // Module anchors
    for (const id of ["netpol-rules", "netpol-sim", "netpol-flow", "netpol-yaml", "netpol-isolation"]) {
      expect(html).toContain(`id="${id}"`);
    }
    // Builder: default rules + selectors
    expect(html).toContain("Ingress / Egress Rule Builder");
    expect(html).toContain("allow-frontend-web");
    expect(html).toContain("allow-monitoring");
    expect(html).toContain("allow-db-out");
    expect(html).toContain("podSelector matchLabels");
    for (const kind of ["pod", "namespace", "cidr"]) {
      expect(html).toContain(kind);
    }
    // Flow diagram
    expect(html).toContain("Visual Traffic Flow");
    expect(html).toContain("unmatched traffic");
    expect(html).toContain("🔒 deny-by-default");
    // Simulator + isolation
    expect(html).toContain("Policy Effect Simulator");
    expect(html).toContain("Namespace Isolation Mode");
    expect(html).toContain("Isolate namespace (deny all by default)");
    expect(html).toContain("Open (no isolation)");
    // Generated YAML
    const yaml = yamlExtract(html);
    expect(yaml).toContain("apiVersion: networking.k8s.io/v1");
    expect(yaml).toContain("kind: NetworkPolicy");
    expect(yaml).toContain("metadata:");
    expect(yaml).toContain("spec:");
    expect(yaml).toContain("podSelector:");
    expect(yaml).toContain("matchLabels:");
    expect(yaml).toContain("app: web");
    expect(yaml).toContain("policyTypes: [Ingress, Egress]");
    expect(yaml).toContain("allow-frontend-web");
  });

  it("generates ingress and egress rules with namespace + CIDR selectors in YAML", () => {
    const yaml = yamlExtract(renderToStaticMarkup(<DkNetworkPolicySection />));
    // ingress from podSelector peer
    expect(yaml).toContain("from:");
    expect(yaml).toContain("app: frontend");
    // namespace selector peer
    expect(yaml).toContain("namespaceSelector:");
    expect(yaml).toContain("role: monitoring");
    // cidr egress peer
    expect(yaml).toContain("ipBlock:");
    expect(yaml).toContain("203.0.113.0/24");
    // ports
    expect(yaml).toContain("ports:");
    expect(yaml).toContain("protocol: TCP");
  });
});