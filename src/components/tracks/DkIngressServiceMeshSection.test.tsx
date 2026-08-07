import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import DkIngressServiceMeshSection from "./DkIngressServiceMeshSection";

describe("DkIngressServiceMeshSection", () => {
  it("renders all six interactive modules with defaults", () => {
    const html = renderToStaticMarkup(<DkIngressServiceMeshSection />);

    // Module titles
    expect(html).toContain("NGINX Ingress Controller vs Istio Service Mesh");
    expect(html).toContain("Path-Based Routing Builder");
    expect(html).toContain("TLS Termination Configuration");
    expect(html).toContain("mTLS Service Mesh Visualization");
    expect(html).toContain("Canary Deployment Weights");
    expect(html).toContain("Traffic Mirroring (Shadowing)");

    // Module 1: comparison matrix + deep-dive tabs
    for (const label of ["Side-by-Side", "NGINX", "ISTIO", "Workload Identity", "Traffic Splitting"]) {
      expect(html).toContain(label);
    }

    // Module 2: default route builder state + generated Ingress YAML
    expect(html).toContain("/api/v1/orders");
    expect(html).toContain("pathType: Prefix");
    expect(html).toContain("orders-svc");
    expect(html).toContain("ingressClassName: nginx");
    expect(html).toContain("secretName: app-tls");
    expect(html).toContain("app.example.com");

    // Module 3: TLS termination defaults
    expect(html).toContain("cert-manager");
    expect(html).toContain("ssl-redirect");
    expect(html).toContain("TLSv1.2");

    // Module 4: mTLS mesh — default STRICT mode and SPIFFE identities
    expect(html).toContain("STRICT");
    expect(html).toContain("PERMISSIVE");
    expect(html).toContain("cluster.local/ns/prod/sa/frontend");
    expect(html).toContain("ISTIO_MUTUAL");

    // Module 5: default 90/10 split rendered in the VirtualService
    expect(html).toContain("weight: 90");
    expect(html).toContain("weight: 10");
    expect(html).toContain("x-canary");

    // Module 6: mirroring defaults
    expect(html).toContain("mirrorWeight");
    expect(html).toContain("checkout-svc");
  });
});