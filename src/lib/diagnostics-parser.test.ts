import { describe, expect, test } from "vitest";
import { parseCommandTarget } from "./diagnostics-parser";

describe("parseCommandTarget", () => {
  test.each([
    ["ping", ["-c", "4", "8.8.8.8"], "8.8.8.8"],
    ["traceroute", ["-n", "-m", "20", "1.1.1.1"], "1.1.1.1"],
    ["mtr", ["-r", "-c", "10", "github.com"], "github.com"],
    ["dig", ["@8.8.8.8", "google.com", "MX", "+short"], "google.com"],
    ["nmap", ["-sV", "-p", "22,80,443", "192.168.1.1"], "192.168.1.1"],
  ] as const)("extracts the target from %s arguments", (command, args, expected) => {
    expect(parseCommandTarget(command, args)).toBe(expected);
  });

  test("supports compact option values", () => {
    expect(parseCommandTarget("ping", ["-c4", "example.com"])).toBe("example.com");
    expect(parseCommandTarget("nmap", ["-p22,80", "192.168.1.1"])).toBe("192.168.1.1");
  });
});
