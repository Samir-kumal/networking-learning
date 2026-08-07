"use client";

import { useState } from "react";

// ==========================================
// TYPES & INTERFACES
// ==========================================

export type SeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface ScanResult {
  id: string;
  cve: string;
  tool: "Trivy" | "Snyk Code" | "OWASP ZAP";
  title: string;
  severity: SeverityLevel;
  component: string;
  installedVersion: string;
  fixedVersion: string;
  cvssScore: number;
  description: string;
  remediation: string;
}

// ==========================================
// MOCK DATA
// ==========================================

const INITIAL_SCAN_RESULTS: ScanResult[] = [
  {
    id: "vuln-1",
    cve: "CVE-2024-21626",
    tool: "Trivy",
    title: "Leaky Vessels Container Breakout in runc",
    severity: "CRITICAL",
    component: "runc",
    installedVersion: "v1.1.11",
    fixedVersion: "v1.1.12",
    cvssScore: 10.0,
    description:
      "File descriptor leak in runc allows container process to access host filesystem and escape container boundary.",
    remediation:
      "Upgrade base container image OS packages or update runc to >= 1.1.12 via Dockerfile / k8s node image.",
  },
  {
    id: "vuln-2",
    cve: "CVE-2023-44487",
    tool: "Trivy",
    title: "HTTP/2 Rapid Reset Denial of Service",
    severity: "HIGH",
    component: "nghttp2 / envoy",
    installedVersion: "1.52.0",
    fixedVersion: "1.57.0",
    cvssScore: 7.5,
    description:
      "HTTP/2 stream cancellation flood causes excessive server memory & CPU consumption, leading to service outage.",
    remediation:
      "Apply HTTP/2 concurrent stream limit parameters or upgrade web proxy / ingress controller.",
  },
  {
    id: "vuln-3",
    cve: "SNYK-JS-EXPRESS-594238",
    tool: "Snyk Code",
    title: "Unsanitized User Input in SQL Query String",
    severity: "HIGH",
    component: "src/api/auth.ts:42",
    installedVersion: "express@4.17.1",
    fixedVersion: "Parameterized Query",
    cvssScore: 8.6,
    description:
      "Concatenating req.body.username directly into raw SQL string allows authentication bypass via SQL Injection.",
    remediation:
      "Replace template literal with parameterized query: db.query('SELECT * FROM users WHERE user = ?', [user]).",
  },
  {
    id: "vuln-4",
    cve: "CVE-2024-3094",
    tool: "Trivy",
    title: "xz-utils Malicious Backdoor Injection",
    severity: "CRITICAL",
    component: "liblzma5",
    installedVersion: "5.6.0-1",
    fixedVersion: "5.4.5",
    cvssScore: 10.0,
    description:
      "Obfuscated payload in xz-utils build script intercepts SSH authentication functions in sshd.",
    remediation:
      "Downgrade xz-utils / liblzma5 to stable version 5.4.x immediately across container base images.",
  },
  {
    id: "vuln-5",
    cve: "ZAP-2026-001",
    tool: "OWASP ZAP",
    title: "Missing HTTP Strict Transport Security (HSTS) Header",
    severity: "MEDIUM",
    component: "HTTPS Response Header",
    installedVersion: "None",
    fixedVersion: "Strict-Transport-Security: max-age=31536000",
    cvssScore: 5.3,
    description:
      "Server allows HTTP connections without enforcing HTTPS upgrade, exposing session tokens to MITM interception.",
    remediation:
      "Add header: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload to NGINX / Cloudflare.",
  },
  {
    id: "vuln-6",
    cve: "SNYK-JS-LODASH-567746",
    tool: "Snyk Code",
    title: "Prototype Pollution in lodash.defaultsDeep",
    severity: "MEDIUM",
    component: "lodash",
    installedVersion: "4.17.15",
    fixedVersion: "4.17.21",
    cvssScore: 6.5,
    description:
      "Unsanitized key parameter passed to defaultsDeep allows modification of Object.prototype properties.",
    remediation:
      "Run `npm install lodash@^4.17.21` or freeze Object.prototype in entrypoint.",
  },
  {
    id: "vuln-7",
    cve: "CVE-2023-38545",
    tool: "Trivy",
    title: "curl SOCKS5 Heap Buffer Overflow",
    severity: "HIGH",
    component: "libcurl4",
    installedVersion: "8.2.1",
    fixedVersion: "8.4.0",
    cvssScore: 8.1,
    description:
      "Hostname too long during SOCKS5 proxy handshake overflows heap buffer in libcurl.",
    remediation:
      "Upgrade libcurl package inside Alpine / Debian base images to version >= 8.4.0.",
  },
  {
    id: "vuln-8",
    cve: "ZAP-2026-002",
    tool: "OWASP ZAP",
    title: "Reflected Cross-Site Scripting (XSS) in Search Query",
    severity: "LOW",
    component: "/search?q=",
    installedVersion: "Unescaped HTML",
    fixedVersion: "HTML Entity Encoding",
    cvssScore: 3.8,
    description:
      "Search parameter reflected back in page DOM without escaping <script> tags.",
    remediation:
      "Use React JSX string rendering or encode output using DOMPurify / sanitize-html.",
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
        `[INFO] Downloading vulnerability database feed v2026.08.08...`,
        `[ANALYSIS] Inspecting layers, lockfiles, and dependencies...`,
      ]);
    }, 600);

    setTimeout(() => {
      setScanProgress(80);
      setScanLogs((prev) => [
        ...prev,
        `[WARN] Critical CVE match found in image base layer!`,
        `[ANALYSIS] Cross-referencing CVSS scores & remediated versions...`,
      ]);
    }, 1200);

    setTimeout(() => {
      setScanProgress(100);
      setIsScanning(false);
      setScanLogs((prev) => [
        ...prev,
        `[SUCCESS] Scan complete in 1.84s. Found ${INITIAL_SCAN_RESULTS.length} vulnerabilities.`,
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
      <div className="p-5 rounded-xl bg-white border border-slate-200 card-shadow">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-400/20 text-xs font-mono font-semibold">
            S1 · SAST/DAST &amp; Container Scans
          </span>
        </div>
        <h3 className="text-xl font-extrabold text-slate-900">
          1. SAST / DAST &amp; Container Vulnerability Scanner
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Simulate Trivy container image scans, Snyk SAST code analysis, and OWASP ZAP DAST web
          inspection. Identify CVEs, misconfigurations, and dependency risks before they reach
          production.
        </p>
      </div>

      {/* Controls Bar */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 card-shadow space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-bold text-slate-900">Scanner Controls</h4>
            <p className="text-xs text-slate-500">
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
            <label className="block text-xs text-slate-500 mb-1 font-medium">
              Scanner Engine:
            </label>
            <select
              value={scanTool}
              onChange={(e) =>
                setScanTool(e.target.value as "Trivy" | "Snyk Code" | "OWASP ZAP")
              }
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Trivy">Trivy (Container Image Scanner)</option>
              <option value="Snyk Code">Snyk Code (SAST Static Analysis)</option>
              <option value="OWASP ZAP">OWASP ZAP (DAST Dynamic Web Scanner)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500 mb-1 font-medium">
              Scan Target / Image / Repo:
            </label>
            <input
              type="text"
              value={scanTarget}
              onChange={(e) => setScanTarget(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
        <div className="p-4 rounded-xl bg-white border border-rose-200 bg-gradient-to-br from-rose-50 to-transparent card-shadow">
          <div className="text-xs text-slate-500">Critical CVEs</div>
          <div className="text-2xl font-extrabold text-rose-600 mt-1">
            {scanResultsList.filter((r) => r.severity === "CRITICAL").length}
          </div>
          <div className="text-[11px] text-rose-500 mt-1 font-mono">
            Immediate Patch Required
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-amber-200 bg-gradient-to-br from-amber-50 to-transparent card-shadow">
          <div className="text-xs text-slate-500">High Severity</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">
            {scanResultsList.filter((r) => r.severity === "HIGH").length}
          </div>
          <div className="text-[11px] text-amber-500 mt-1 font-mono">Fix within 7 days</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-violet-200 bg-gradient-to-br from-violet-50 to-transparent card-shadow">
          <div className="text-xs text-slate-500">Medium Severity</div>
          <div className="text-2xl font-extrabold text-violet-600 mt-1">
            {scanResultsList.filter((r) => r.severity === "MEDIUM").length}
          </div>
          <div className="text-[11px] text-violet-500 mt-1 font-mono">
            Scheduled Maintenance
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-indigo-200 bg-gradient-to-br from-indigo-50 to-transparent card-shadow">
          <div className="text-xs text-slate-500">Low / Info</div>
          <div className="text-2xl font-extrabold text-indigo-600 mt-1">
            {scanResultsList.filter((r) => r.severity === "LOW").length}
          </div>
          <div className="text-[11px] text-indigo-500 mt-1 font-mono">
            Best practice hardening
          </div>
        </div>
      </div>

      {/* Results Table & Details Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-white border border-slate-200 card-shadow space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h4 className="text-sm font-bold text-slate-900">
              Detected Vulnerabilities ({filteredScanResults.length})
            </h4>

            {/* Filter Selector */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
              {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setScanFilterSeverity(sev)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                    scanFilterSeverity === sev
                      ? "bg-indigo-600 text-white"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">CVE / ID</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Scanner</th>
                  <th className="py-2.5 px-3">Component</th>
                  <th className="py-2.5 px-3">CVSS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredScanResults.map((item) => {
                  const isSelected = selectedScanResult?.id === item.id;
                  let sevBg = "bg-indigo-50 text-indigo-600 border-indigo-200";
                  if (item.severity === "CRITICAL")
                    sevBg = "bg-rose-50 text-rose-600 border-rose-200";
                  if (item.severity === "HIGH")
                    sevBg = "bg-amber-50 text-amber-600 border-amber-200";
                  if (item.severity === "MEDIUM")
                    sevBg = "bg-violet-50 text-violet-600 border-violet-200";

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedScanResult(item)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-indigo-50 text-slate-900"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-indigo-600">
                        {item.cve}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded border text-[10px] font-bold ${sevBg}`}
                        >
                          {item.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{item.tool}</td>
                      <td className="py-2.5 px-3 text-slate-900">{item.component}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {item.cvssScore.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vulnerability Inspector Drawer */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 card-shadow space-y-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>🔬</span> Vulnerability Details &amp; Fix
          </h4>

          {selectedScanResult ? (
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[11px] font-mono text-slate-500">
                  {selectedScanResult.cve} ({selectedScanResult.tool})
                </span>
                <h5 className="text-sm font-bold text-slate-900 mt-0.5">
                  {selectedScanResult.title}
                </h5>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-slate-500">Affected:</span>
                  <div className="text-rose-600 font-semibold">
                    {selectedScanResult.installedVersion}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Remediated:</span>
                  <div className="text-emerald-600 font-semibold">
                    {selectedScanResult.fixedVersion}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">
                  Description:
                </label>
                <p className="text-slate-700 leading-relaxed">
                  {selectedScanResult.description}
                </p>
              </div>

              <div>
                <label className="block text-emerald-700 mb-1 font-semibold flex items-center gap-1">
                  <span>🛠️</span> Remediation Fix Snippet:
                </label>
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-[11px] break-all">
                  {selectedScanResult.remediation}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Select a vulnerability from the table to inspect details and remediation
              instructions.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
