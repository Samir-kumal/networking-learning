import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import NetworkingPage from "./page";

const GROUP_IDS = ["foundations", "tools", "advanced", "evaluation"];
const MODULE_IDS = [
  "basics",
  "binary",
  "cidr",
  "vlsm",
  "vlans",
  "ipv6",
  "ips",
  "calculator",
  "create",
  "supernetting",
  "cloud",
  "firewall",
  "troubleshooting",
  "routing",
  "security",
  "dhcp",
  "packets",
  "containers",
  "diagnostics",
  "wireless",
  "practice",
  "cheatsheet",
  "quiz",
];

describe("NetworkingPage subsections", () => {
  it("renders the learning groups in order", () => {
    const html = renderToStaticMarkup(<NetworkingPage />);
    const positions = GROUP_IDS.map((id) => html.indexOf(`id="${id}"`));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(html).toContain("Networking Foundations");
    expect(html).toContain("Design &amp; Operations Tools");
    expect(html).toContain("Advanced Networking");
    expect(html).toContain("Practice &amp; Review");
  });

  it("keeps every sidebar module anchor resolvable", () => {
    const html = renderToStaticMarkup(<NetworkingPage />);

    for (const id of MODULE_IDS) {
      expect(html).toContain(`id="${id}"`);
    }
  });
});
