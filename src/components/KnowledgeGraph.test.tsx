import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import KnowledgeGraphSection from "./KnowledgeGraphSection";
import { BranchSelector, KnowledgeGraph } from "./KnowledgeGraph";
import { BRANCH_RELATIONSHIPS, BRANCHES } from "@/lib/graph-data";

describe("knowledge graph curriculum map", () => {
  it("defines stable destinations and unique graph positions", () => {
    const positions = BRANCHES.map((branch) => `${branch.position.x}:${branch.position.y}`);
    const ids = BRANCHES.map((branch) => branch.id);

    expect(new Set(positions).size).toBe(BRANCHES.length);
    expect(new Set(ids).size).toBe(BRANCHES.length);
    expect(BRANCHES.every((branch) => branch.href.startsWith("/"))).toBe(true);
  });

  it("keeps every recommended relationship connected to a known branch", () => {
    const ids = new Set(BRANCHES.map((branch) => branch.id));

    expect(BRANCH_RELATIONSHIPS.length).toBeGreaterThan(0);
    expect(BRANCH_RELATIONSHIPS.every((link) => ids.has(link.from) && ids.has(link.to))).toBe(true);
    expect(new Set(BRANCH_RELATIONSHIPS.map((link) => `${link.from}:${link.to}`)).size).toBe(
      BRANCH_RELATIONSHIPS.length,
    );
  });

  it("renders named, selected track controls", () => {
    const html = renderToStaticMarkup(<BranchSelector activeId="security" onActivate={() => undefined} />);

    expect(html.match(/<button/g)).toHaveLength(BRANCHES.length);
    expect(html).toContain('aria-label="Learning track controls"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Cybersecurity &amp; AppSec");
  });

  it("keeps the visual graph decorative and the controls semantic", () => {
    const html = renderToStaticMarkup(<KnowledgeGraph activeId={null} onActivate={() => undefined} />);

    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('tabindex="0"');
  });

  it("gives the selected branch a direct next-step action", () => {
    const html = renderToStaticMarkup(<KnowledgeGraphSection />);

    expect(html).toContain("Choose a track");
    expect(html).toContain("Recommended sequence");
    expect(html).toContain("Select a track to inspect");
  });
});
