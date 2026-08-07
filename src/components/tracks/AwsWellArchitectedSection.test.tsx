import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AwsWellArchitectedSection from "./AwsWellArchitectedSection";

describe("AwsWellArchitectedSection", () => {
  it("renders all six pillars, radar chart, and recommendation section", () => {
    const html = renderToStaticMarkup(<AwsWellArchitectedSection />);
    // All six pillar names present in the questionnaire
    for (const name of [
      "Operational Excellence",
      "Security",
      "Reliability",
      "Performance Efficiency",
      "Cost Optimization",
      "Sustainability",
    ]) {
      expect(html).toContain(name);
    }
    // 24 questions (4 per pillar)
    expect(html.match(/w=\d/g)?.length).toBeGreaterThanOrEqual(24);
    // Radar chart svg with data polygon
    expect(html).toContain("<svg");
    expect(html).toContain("points=");
    // Recommendation section present (renders empty-state at start)
    expect(html).toContain("Prioritized Recommendations");
    expect(html).toContain("OUTSTANDING");
  });
});
