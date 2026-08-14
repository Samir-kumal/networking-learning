import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MODULE_ITEMS_BY_TRACK } from "@/components/Sidebar";
import NetworkingPage from "./page";

const SIDEBAR_MODULE_ITEMS = MODULE_ITEMS_BY_TRACK.networking;
const EXPECTED_MODULE_IDS = [
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
const EXPECTED_MODULE_CATEGORIES = [
  ...Array(7).fill("Foundations"),
  ...Array(6).fill("Applied"),
  ...Array(7).fill("Operations"),
  ...Array(3).fill("Evaluation"),
];
const GROUP_IDS = ["foundations", "tools", "advanced", "evaluation"];

describe("NetworkingPage subsections", () => {
  it("renders the beginner-first learning groups in order", () => {
    const html = renderToStaticMarkup(<NetworkingPage />);
    const positions = GROUP_IDS.map((id) => html.indexOf(`id="${id}"`));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(html).toContain("Networking Foundations");
    expect(html).toContain("Understand, Forward &amp; Diagnose Traffic");
  });
  it("keeps sidebar metadata aligned with the curriculum", () => {
    expect(SIDEBAR_MODULE_ITEMS.map((item) => item.id)).toEqual(EXPECTED_MODULE_IDS);
    expect(SIDEBAR_MODULE_ITEMS.map((item) => item.category)).toEqual(EXPECTED_MODULE_CATEGORIES);
    expect(new Set(SIDEBAR_MODULE_ITEMS.map((item) => item.id)).size).toBe(EXPECTED_MODULE_IDS.length);
  });

  it("renders every navigation target exactly once", () => {
    const html = renderToStaticMarkup(<NetworkingPage />);

    for (const id of EXPECTED_MODULE_IDS) {
      expect(html.match(new RegExp(`id="${id}"`, "g"))).toHaveLength(1);
    }
  });

  it("keeps every sidebar module anchor resolvable", () => {
    const html = renderToStaticMarkup(<NetworkingPage />);

    for (const id of EXPECTED_MODULE_IDS) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it("renders modules in prerequisite order", () => {
    const html = renderToStaticMarkup(<NetworkingPage />);
    const positions = EXPECTED_MODULE_IDS.map((id) => html.indexOf(`id="${id}"`));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
  it("renders every module root with a networking header", () => {
    const html = renderToStaticMarkup(<NetworkingPage />);

    expect(html.match(/data-networking-header="true"/g)).toHaveLength(23);
    expect(html.match(/class="networking-module[^"]*"/g)).toHaveLength(23);
  });
  it("renders the operations-console orientation and stage map", () => {
    const html = renderToStaticMarkup(<NetworkingPage />);

    const headline = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, "");

    expect(headline).toBe("Read the path a packet takes.");
    expect(html).toContain('aria-label="Networking curriculum"');

    for (const id of GROUP_IDS) {
      expect(html).toContain(`href="#${id}"`);
    }
  });

});
