import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AwsApiGatewaySection from "./AwsApiGatewaySection";

describe("AwsApiGatewaySection", () => {
  it("renders all five interactive modules", () => {
    const html = renderToStaticMarkup(<AwsApiGatewaySection />);
    // Module anchors
    for (const id of ["rest-vs-http", "route-builder", "authorizers", "throttling-caching", "openapi"]) {
      expect(html).toContain(`id="${id}"`);
    }
    // REST vs HTTP comparison + recommender + cost snapshot
    expect(html).toContain("REST API vs HTTP API");
    expect(html).toContain("$3.50 per 1M requests");
    expect(html).toContain("Use-Case Recommender");
    expect(html).toContain("Cost Snapshot");
    // Route builder: method selector + default routes
    for (const method of ["GET", "POST", "PUT", "DELETE"]) {
      expect(html).toContain(method);
    }
    expect(html).toContain("/pets/{petId}");
    expect(html).toContain("Deployed Routes (3)");
    // Authorizers: selector shows all four types; default (Cognito) panel renders
    for (const auth of ["IAM", "LAMBDA", "COGNITO", "NONE"]) {
      expect(html).toContain(auth);
    }
    expect(html).toContain("Cognito User Pools Settings");
    expect(html).toContain("JWT Verification");
    expect(html).toContain("Request Flow");
    // Throttling + caching + validation
    expect(html).toContain("Steady-State Rate");
    expect(html).toContain("Burst Capacity");
    expect(html).toContain("Cache TTL");
    expect(html).toContain("Request Validation");
    // OpenAPI generator: YAML mode default + generated spec content
    expect(html).toContain("openapi:");
    expect(html).toContain("3.0.1");
    expect(html).toContain("sigv4_auth");
    expect(html).toContain("awsSigv4");
    expect(html).toContain("x-amazon-apigateway-integration");
    expect(html).toContain("x-apigateway-throttling");
  });
});
