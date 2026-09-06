import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MODULE_ITEMS_BY_TRACK } from "@/components/Sidebar";
import SecurityPage from "./page";

const SIDEBAR_SECURITY_ITEMS = MODULE_ITEMS_BY_TRACK.security;
const EXPECTED_SECURITY_IDS = [
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
];

describe("SecurityPage curriculum & navigation", () => {
  it("keeps sidebar metadata aligned with the 14 security modules", () => {
    const sidebarIds = SIDEBAR_SECURITY_ITEMS.map((item) => item.id);
    expect(sidebarIds).toEqual(EXPECTED_SECURITY_IDS);
    const duplicates = sidebarIds.filter((id, i) => sidebarIds.indexOf(id) !== i);
    expect(duplicates).toEqual([]);
  });

  it("renders every navigation target anchor exactly once", () => {
    const html = renderToStaticMarkup(<SecurityPage />);

    for (const id of EXPECTED_SECURITY_IDS) {
      const target = `id="${id}"`;
      const count = html.split(target).length - 1;
      expect(count, `Expected anchor #${id} to exist exactly once`).toBe(1);
    }
  });

  it("renders modules in sequential curriculum order", () => {
    const html = renderToStaticMarkup(<SecurityPage />);
    const positions = EXPECTED_SECURITY_IDS.map((id) => html.indexOf(`id="${id}"`));

    expect(positions.every((pos) => pos >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("renders track headline and operations orientation", () => {
    const html = renderToStaticMarkup(<SecurityPage />);

    expect(html).toContain("Enforce policy, inspect exploits &amp; verify posture.");
    expect(html).toContain("14 Interactive Labs · 4 Stages");
  });

  it("renders the 4 curriculum stages in order with roadmap links", () => {
    const html = renderToStaticMarkup(<SecurityPage />);
    const stageIds = ["stage-appsec", "stage-identity", "stage-operations", "stage-posture"];

    for (const id of stageIds) {
      expect(html).toContain(`href="#${id}"`);
      expect(html).toContain(`id="${id}"`);
    }

    const positions = stageIds.map((id) => html.indexOf(`id="${id}"`));
    expect(positions.every((pos) => pos >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
