import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AwsComplianceSection from "./AwsComplianceSection";

describe("AwsComplianceSection smoke", () => {
  it("renders frameworks, toggles, checklist, score and radar", () => {
    const html = renderToStaticMarkup(<AwsComplianceSection />);
    for (const name of ["SOC 2", "HIPAA", "PCI-DSS", "CIS Benchmark", "NIST 800-53"]) {
      expect(html).toContain(name);
    }
    // 5 in-scope switches + 39 require toggle buttons
    expect(html.match(/role="switch"/g)?.length).toBe(5);
    expect(html.match(/role="checkbox"/g)?.length).toBe(39);
    // Score summary: passed/failed/total
    expect(html).toContain("PASSED");
    expect(html).toContain("FAILED");
    expect(html).toContain("TOTAL");
    // CSS radar chart: conic-gradient score ring + clip-path data polygon + axis labels
    expect(html).toContain("conic-gradient");
    expect(html).toContain("clip-path:polygon(");
    expect(html).toContain("repeating-conic-gradient");
    for (const label of ["Identity", "Encryption", "Logging", "Network", "Data", "Ops"]) {
      expect(html).toContain(label);
    }
    // Default score: 31 passed / 39 total = 79 -> REVIEW tier
    expect(html).toContain("STATUS: REVIEW");
    expect(html).toContain("79%");
  });
});