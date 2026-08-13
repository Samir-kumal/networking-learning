"use client";

import { useState } from "react";

// ==========================================
// TYPES & INTERFACES
// ==========================================

export type SeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface ScanResult {
  id: string;
  findingId: string;
  tool: "Trivy" | "Snyk Code" | "OWASP ZAP";
  title: string;
  severity: SeverityLevel;
  component: string;
  installedVersion: string;
  fixedVersion: string;
  cvssScore: number | null;
  description: string;
  remediation: string;
}

// ==========================================
// MOCK DATA
// ==========================================

const INITIAL_SCAN_RESULTS: ScanResult[] = [
  {
    id: "vuln-1",
    findingId: "CVE-2024-21626",
    tool: "Trivy",
    title: "Leaky Vessels container breakout in runc",
    severity: "HIGH",
    component: "runc",
    installedVersion: "1.1.11",
    fixedVersion: "1.1.12",
    cvssScore: 8.6,
    description:
      "In runc 1.1.11 and earlier, a file-descriptor leak can give a container process access to the host filesystem in affected attack paths.",
    remediation:
      "Upgrade runc or the vendor-provided container runtime to a patched release; verify the node and image supply chain.",
  },
  {
    id: "vuln-2",
    findingId: "CVE-2023-44487",
    tool: "Trivy",
    title: "HTTP/2 Rapid Reset denial of service",
    severity: "HIGH",
    component: "nghttp2 / Envoy",
    installedVersion: "1.52.0",
    fixedVersion: "Vendor patch (for example, nghttp2 1.57.0)",
    cvssScore: 7.5,
    description:
      "Rapid cancellation of HTTP/2 streams can consume server resources and cause denial of service in affected implementations.",
    remediation:
      "Apply the relevant vendor or upstream patch and configure request, stream, and connection protections at the edge.",
  },
  {
    id: "vuln-3",
    findingId: "DEMO-SAST-001",
    tool: "Snyk Code",
    title: "Unsanitized user input in SQL query",
    severity: "HIGH",
    component: "src/api/auth.ts:42",
    installedVersion: "Illustrative fixture",
    fixedVersion: "Parameterized query",
    cvssScore: null,
    description:
      "Concatenating a request value into SQL can enable injection; this is an illustrative SAST finding, not a published CVE record.",
    remediation:
      "Use the database driver's parameterized-query API, validate input for its business purpose, and test authorization separately.",
  },
  {
    id: "vuln-4",
    findingId: "CVE-2024-3094",
    tool: "Trivy",
    title: "Malicious xz-utils release and liblzma injection",
    severity: "CRITICAL",
    component: "xz / liblzma",
    installedVersion: "5.6.0-1",
    fixedVersion: "5.4.5 or vendor-patched build",
    cvssScore: 10.0,
    description:
      "Malicious code in xz 5.6.0 and 5.6.1 can modify liblzma during the build and affect software linked against the library.",
    remediation:
      "Follow the affected distribution's advisory: remove 5.6.x builds, restore a trusted package, rotate exposed credentials, and verify host integrity.",
  },
  {
    id: "vuln-5",
    findingId: "DEMO-DAST-001",
    tool: "OWASP ZAP",
    title: "Missing HTTP Strict Transport Security (HSTS) header",
    severity: "MEDIUM",
    component: "HTTPS response header",
    installedVersion: "Not observed in fixture",
    fixedVersion: "Strict-Transport-Security: max-age=31536000",
    cvssScore: null,
    description:
      "Without an HSTS policy, a browser may make an initial HTTP request before it has learned to require HTTPS; HSTS does not secure the current HTTP response.",
    remediation:
      "Serve the header over HTTPS after validating every covered host and subdomain; use an HTTPS redirect and treat preload as a separate, irreversible deployment decision.",
  },
  {
    id: "vuln-6",
    findingId: "DEMO-SAST-002",
    tool: "Snyk Code",
    title: "Prototype-pollution pattern in dependency usage",
    severity: "MEDIUM",
    component: "lodash",
    installedVersion: "4.17.15 (fixture)",
    fixedVersion: "4.17.21 or vendor-advised version",
    cvssScore: null,
    description:
      "An unsafe merge of attacker-controlled keys can mutate inherited object properties; this fixture intentionally does not assert a particular CVE.",
    remediation:
      "Upgrade according to the dependency advisory, reject dangerous keys at the application boundary, and avoid merging untrusted objects into configuration.",
  },
  {
    id: "vuln-7",
    findingId: "CVE-2023-38545",
    tool: "Trivy",
    title: "curl SOCKS5 heap buffer overflow",
    severity: "CRITICAL",
    component: "libcurl",
    installedVersion: "8.2.1",
    fixedVersion: "8.4.0",
    cvssScore: 9.8,
    description:
      "Affected libcurl versions can overflow a heap buffer during a SOCKS5 handshake when a long hostname and the vulnerable resolution path are used.",
    remediation:
      "Upgrade libcurl to 8.4.0 or a vendor backport; if patching is not immediately possible, avoid SOCKS5 hostname-resolution mode.",
  },
  {
    id: "vuln-8",
    findingId: "DEMO-DAST-002",
    tool: "OWASP ZAP",
    title: "Reflected cross-site scripting in search query",
    severity: "LOW",
    component: "/search?q=",
    installedVersion: "Unescaped HTML (fixture)",
    fixedVersion: "Context-appropriate output encoding",
    cvssScore: null,
    description:
      "Reflecting a search value into HTML without context-appropriate encoding can create XSS; this is a synthetic DAST finding.",
    remediation:
      "Keep untrusted data in React text nodes where possible and apply context-specific output encoding; do not treat a generic sanitizer as a substitute for correct context handling.",
  },
];

// ==========================================
// COMPONENT
// ==========================================

export default function SecScannersSection() {
  const [scanTool, setScanTool] = useState<"Trivy" | "Snyk Code" | "OWASP ZAP">("Trivy");
  const [scanTarget, setScanTarget] = useState<string>("docker.io/payment-api:v2.4.1");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [scanProgress, setScanProgress] = useState<number>(100);
  const [scanFilterSeverity, setScanFilterSeverity] = useState<string>("ALL");
  const [selectedScanResult, setSelectedScanResult] = useState<ScanResult | null>(
    INITIAL_SCAN_RESULTS[0]
  );
  const [scanResultsList] = useState<ScanResult[]>(INITIAL_SCAN_RESULTS);

  const handleRunScan = () => {
    setIsScanning(true);
    setScanProgress(10);
    setScanLogs([`[INFO] Starting ${scanTool} scanner engine...`]);

    setTimeout(() => {
      setScanProgress(40);
      setScanLogs((prev) => [
        ...prev,
        `[INFO] Target: ${scanTarget}`,
        `[INFO] Using a static teaching fixture; no scanner or network request is executed.`,
        `[ANALYSIS] Inspecting illustrative layers, lockfiles, and dependencies...`,
      ]);
    }, 600);

    setTimeout(() => {
      setScanProgress(80);
      setScanLogs((prev) => [
        ...prev,
        `[WARN] Finding match reported in the teaching fixture.`,
        `[ANALYSIS] Comparing published CVSS v3.1 scores where a CVE is present...`,
      ]);
    }, 1200);

    setTimeout(() => {
      setScanProgress(100);
      setIsScanning(false);
      setScanLogs((prev) => [
        ...prev,
        `[SUCCESS] Local simulation complete in 1.84s. Found ${INITIAL_SCAN_RESULTS.length} findings.`,
      ]);
    }, 1800);
  };

  const filteredScanResults = scanResultsList.filter((item) => {
    if (scanFilterSeverity === "ALL") return true;
    return item.severity === scanFilterSeverity;
  });

  return (
    <section id="sec-scanners" className="scroll-mt-20 space-y-6">
      {/* Section Header Card */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-400/20 text-xs font-mono font-semibold">
            S1 · SAST/DAST &amp; Container Scans
          </span>
        </div>
        <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
          1. SAST / DAST &amp; Container Vulnerability Scanner
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Local fixture: published NVD/CNA CVSS v3.1 base scores are shown for CVEs; demo findings have no CVE score.
        </p>
      </div>

      {/* Controls Bar */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Scanner Controls</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a scanner engine and target to begin vulnerability analysis.
            </p>
          </div>

          <button
            onClick={handleRunScan}
            disabled={isScanning}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-indigo-200"
          >
            {isScanning ? (
              <>
                <span className="animate-spin">⏳</span> Scanning...
              </>
            ) : (
              <>
                <span>🚀</span> Run Security Scan
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
              Scanner Engine:
            </label>
            <select
              value={scanTool}
              onChange={(e) =>
                setScanTool(e.target.value as "Trivy" | "Snyk Code" | "OWASP ZAP")
              }
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Trivy">Trivy (Container Image Scanner)</option>
              <option value="Snyk Code">Snyk Code (SAST Static Analysis)</option>
              <option value="OWASP ZAP">OWASP ZAP (DAST Dynamic Web Scanner)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
              Scan Target / Image / Repo:
            </label>
            <input
              type="text"
              value={scanTarget}
              onChange={(e) => setScanTarget(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. docker.io/my-app:v1.0"
            />
          </div>
        </div>

        {/* Progress Bar & Scan Terminal Stream */}
        {scanLogs.length > 0 && (
          <div className="mt-4 p-4 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span>Scan Stream Logs</span>
              <span>{scanProgress}% Completed</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-emerald-400">
              {scanLogs.map((log, idx) => (
                <div key={idx}>{log}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Scan Results Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-700 bg-gradient-to-br from-rose-50 to-transparent card-shadow">
          <div className="text-xs text-slate-500 dark:text-slate-400">Critical findings</div>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
            {scanResultsList.filter((r) => r.severity === "CRITICAL").length}
          </div>
          <div className="text-[11px] text-rose-500 dark:text-rose-400 mt-1 font-mono">
            Triage priority depends on context
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 bg-gradient-to-br from-amber-50 to-transparent card-shadow">
          <div className="text-xs text-slate-500 dark:text-slate-400">High severity</div>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {scanResultsList.filter((r) => r.severity === "HIGH").length}
          </div>
          <div className="text-[11px] text-amber-500 dark:text-amber-400 mt-1 font-mono">Prioritize by exposure and exploitability</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-700 bg-gradient-to-br from-violet-50 to-transparent card-shadow">
          <div className="text-xs text-slate-500 dark:text-slate-400">Medium severity</div>
          <div className="text-2xl font-extrabold text-violet-600 dark:text-violet-400 mt-1">
            {scanResultsList.filter((r) => r.severity === "MEDIUM").length}
          </div>
          <div className="text-[11px] text-violet-500 dark:text-violet-400 mt-1 font-mono">
            Review affected path and compensating controls
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 bg-gradient-to-br from-indigo-50 to-transparent card-shadow">
          <div className="text-xs text-slate-500 dark:text-slate-400">Low severity</div>
          <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
            {scanResultsList.filter((r) => r.severity === "LOW").length}
          </div>
          <div className="text-[11px] text-indigo-500 dark:text-indigo-400 mt-1 font-mono">
            Schedule according to risk
          </div>
        </div>
      </div>

      {/* Results Table & Details Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Detected findings ({filteredScanResults.length})
            </h4>

            {/* Filter Selector */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setScanFilterSeverity(sev)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                    scanFilterSeverity === sev
                      ? "bg-indigo-600 text-white"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-mono border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Finding ID</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Scanner</th>
                  <th className="py-2.5 px-3">Component</th>
                  <th className="py-2.5 px-3">CVSS v3.1</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-mono">
                {filteredScanResults.map((item) => {
                  const isSelected = selectedScanResult?.id === item.id;
                  let sevBg = "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700";
                  if (item.severity === "CRITICAL")
                    sevBg = "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-700";
                  if (item.severity === "HIGH")
                    sevBg = "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700";
                  if (item.severity === "MEDIUM")
                    sevBg = "bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-700";

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedScanResult(item)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-900/30 text-slate-900 dark:text-slate-100"
                          : "dark:hover:bg-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-indigo-600 dark:text-indigo-400">
                        {item.findingId}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded border text-[10px] font-bold ${sevBg}`}
                        >
                          {item.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{item.tool}</td>
                      <td className="py-2.5 px-3 text-slate-900 dark:text-slate-100">{item.component}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                        {item.cvssScore?.toFixed(1) ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vulnerability Inspector Drawer */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>🔬</span> Finding Details &amp; Fix
          </h4>

          {selectedScanResult ? (
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {selectedScanResult.findingId} ({selectedScanResult.tool})
                </span>
                <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {selectedScanResult.title}
                </h5>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Affected:</span>
                  <div className="text-rose-600 dark:text-rose-400 font-semibold">
                    {selectedScanResult.installedVersion}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Remediated:</span>
                  <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {selectedScanResult.fixedVersion}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                  Description:
                </label>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedScanResult.description}
                </p>
              </div>

              <div>
                <label className="block text-emerald-700 dark:text-emerald-300 mb-1 font-semibold flex items-center gap-1">
                  <span>🛠️</span> Remediation guidance:
                </label>
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] break-all">
                  {selectedScanResult.remediation}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a finding from the table to inspect details and remediation
              instructions.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
