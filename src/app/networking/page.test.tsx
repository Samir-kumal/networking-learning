import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import NetworkingPage from "./page";

const GROUP_IDS = ["foundations", "tools", "advanced", "evaluation"];
const MODULE_IDS = [
  "basics",
  "binary",
  "cidr",
  "calculator",
  "create",
  "vlsm",
  "supernetting",
  "vlans",
  "dhcp",
  "ipv6",
  "ips",
  "cloud",
  "wireless",
  "packets",
  "routing",
  "firewall",
  "security",
  "diagnostics",
  "troubleshooting",
  "containers",
  "practice",
  "cheatsheet",
  "quiz",
];

describe("NetworkingPage subsections", () => {
  it("renders the beginner-first learning groups in order", () => {
    const html = renderToStaticMarkup(<NetworkingPage />);
    const positions = GROUP_IDS.map((id) => html.indexOf(`id="${id}"`));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(html).toContain("Networking Foundations");
    expect(html).toContain("Understand, Forward &amp; Diagnose Traffic");
  });

  it("keeps every sidebar module anchor resolvable", () => {
    const html = renderToStaticMarkup(<NetworkingPage />);

    for (const id of MODULE_IDS) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it("renders modules in prerequisite order", () => {
    const html = renderToStaticMarkup(<NetworkingPage />);
    const positions = MODULE_IDS.map((id) => html.indexOf(`id="${id}"`));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
