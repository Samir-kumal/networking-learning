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

export interface OwaspItem {
  id: string;
  title: string;
  code: string;
  description: string;
  impact: string;
  payloadExample: string;
  vulnerableCode: string;
  remediatedCode: string;
  keyDefenses: string[];
}

export interface WafRule {
  id: string;
  name: string;
  type: "SQLi" | "XSS" | "RateLimit" | "GeoBlock" | "Custom";
  condition: string;
  action: "BLOCK" | "ALLOW" | "COUNT" | "CAPTCHA";
  enabled: boolean;
  hits: number;
}

// ==========================================
// MOCK DATA
// ==========================================

const INITIAL_WAF_RULES: WafRule[] = [
  {
    id: "waf-1",
    name: "OWASP Core Rule Set - SQL Injection",
    type: "SQLi",
    condition: "Regex Match: (UNION|SELECT|INSERT|DROP|--|OR\\s+1=1)",
    action: "BLOCK",
    enabled: true,
    hits: 1420,
  },
  {
    id: "waf-2",
    name: "OWASP Core Rule Set - Cross Site Scripting (XSS)",
    type: "XSS",
    condition: "Regex Match: (<script|javascript:|onload=|onerror=)",
    action: "BLOCK",
    enabled: true,
    hits: 890,
  },
  {
    id: "waf-3",
    name: "Rate Limit: Max 100 Reqs / 5 Min",
    type: "RateLimit",
    condition: "IP Request Frequency > 100 req / 300s",
    action: "BLOCK",
    enabled: true,
    hits: 310,
  },
  {
    id: "waf-4",
    name: "Geo-IP Filter: Block Tor Exit Nodes",
    type: "GeoBlock",
    condition: "IP in Known Tor Exit Node Directory",
    action: "CAPTCHA",
    enabled: true,
    hits: 145,
  },
];

export default function SecWafSection() {
  // --- WAF & SSL State ---
  const [wafRules, setWafRules] = useState<WafRule[]>(INITIAL_WAF_RULES);
  const [simTrafficType, setSimTrafficType] = useState<
    "normal" | "sqli" | "xss" | "ddos"
  >("sqli");
  const [wafResult, setWafResult] = useState<string | null>(null);

  // Custom WAF Rule Form
  const [newRuleName, setNewRuleName] = useState<string>("Block Admin Path");
  const [newRuleType, setNewRuleType] = useState<
    "SQLi" | "XSS" | "RateLimit" | "GeoBlock" | "Custom"
  >("Custom");
  const [newRuleCond, setNewRuleCond] = useState<string>("URL Path matches /admin/*");
  const [newRuleAction, setNewRuleAction] = useState<
    "BLOCK" | "ALLOW" | "COUNT" | "CAPTCHA"
  >("BLOCK");

  // SSL Settings
  const [tls12, setTls12] = useState<boolean>(true);
  const [tls13, setTls13] = useState<boolean>(true);
  const [enableHsts, setEnableHsts] = useState<boolean>(true);
  const [enableCsp, setEnableCsp] = useState<boolean>(true);
  const [enableXFrame, setEnableXFrame] = useState<boolean>(true);
  const [enableWeakCiphers, setEnableWeakCiphers] = useState<boolean>(false);

  const toggleWafRule = (id: string) => {
    setWafRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleAddWafRule = (e: React.FormEvent) => {
    e.preventDefault();
    const rule: WafRule = {
      id: `waf-${Date.now()}`,
      name: newRuleName,
      type: newRuleType,
      condition: newRuleCond,
      action: newRuleAction,
      enabled: true,
      hits: 0,
    };
    setWafRules((prev) => [...prev, rule]);
  };

  const handleTestWafTraffic = () => {
    let payload = "";
    if (simTrafficType === "normal") payload = "GET /api/v1/products?category=electronics";
    if (simTrafficType === "sqli") payload = "POST /login body={ username: \"admin' OR 1=1 --\" }";
    if (simTrafficType === "xss") payload = "POST /comment body={ text: \"<script>alert(1)</script>\" }";
    if (simTrafficType === "ddos") payload = "BURST: 500 requests in 1 second from IP 198.51.100.42";

    // Evaluate against active WAF rules
    let blockedByRule: WafRule | null = null;
    if (simTrafficType === "sqli") {
      blockedByRule = wafRules.find((r) => r.enabled && r.type === "SQLi") || null;
    } else if (simTrafficType === "xss") {
      blockedByRule = wafRules.find((r) => r.enabled && r.type === "XSS") || null;
    } else if (simTrafficType === "ddos") {
      blockedByRule = wafRules.find((r) => r.enabled && r.type === "RateLimit") || null;
    }

    if (blockedByRule) {
      // Increment hits
      setWafRules((prev) =>
        prev.map((r) =>
          r.id === blockedByRule!.id ? { ...r, hits: r.hits + 1 } : r
        )
      );
      setWafResult(
        `⛔ WAF ACTION: ${blockedByRule.action} (403 Forbidden)\nRule Matched: "${blockedByRule.name}" [ID: ${blockedByRule.id}]\nCondition: ${blockedByRule.condition}\nPayload Analyzed: "${payload}"\nVerdict: Request inspected at L7 layer and dropped before reaching upstream web application.`
      );
    } else {
      setWafResult(
        `✅ WAF ACTION: ALLOW (200 OK)\nPayload: "${payload}"\nVerdict: Request passed all enabled inspection filters cleanly and routed to backend web service.`
      );
    }
  };

  // SSL Labs Grade Calculation
  const computeSslGrade = () => {
    if (enableWeakCiphers) return { grade: "F", color: "text-rose-600", reason: "Weak RC4/3DES ciphers enabled!" };
    if (!tls13 && !tls12) return { grade: "F", color: "text-rose-600", reason: "No valid TLS protocols enabled!" };
    if (!enableHsts) return { grade: "B", color: "text-amber-600", reason: "HSTS header missing (Vulnerable to SSL Strip)." };
    if (!enableCsp) return { grade: "A-", color: "text-indigo-600", reason: "Content-Security-Policy missing." };
    if (tls13 && enableHsts && enableCsp && enableXFrame) return { grade: "A+", color: "text-emerald-600", reason: "Optimal TLS 1.3 & Security Headers Hardening!" };
    return { grade: "A", color: "text-emerald-600", reason: "Strong TLS configuration." };
  };

  const sslGrade = computeSslGrade();

  return (
    <section id="sec-waf" className="scroll-mt-20 space-y-6">
      {/* Section Header Card */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 card-shadow">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-400/20 text-xs font-mono font-semibold">
            S4 · WAF &amp; TLS Hardening
          </span>
        </div>
        <h3 className="text-lg font-bold text-slate-900">
          Web Application Firewall (WAF) &amp; SSL/TLS Hardening Lab
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Configure L7 WAF protection rulesets, test attack payloads, and audit SSL/TLS cipher suites &amp; security response headers.
        </p>
      </div>

      {/* WAF Rule Engine & Traffic Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Rules List */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-white border border-slate-200 card-shadow space-y-4">
          <h4 className="text-sm font-bold text-slate-900">
            WAF Rule Table ({wafRules.length} Active Rules)
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">State</th>
                  <th className="py-2 px-3">Rule Name</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Action</th>
                  <th className="py-2 px-3">Blocked Hits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {wafRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-white">
                    <td className="py-2 px-3">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => toggleWafRule(rule.id)}
                        className="rounded accent-indigo-500"
                      />
                    </td>
                    <td className="py-2 px-3 text-slate-900 font-semibold">
                      {rule.name}
                    </td>
                    <td className="py-2 px-3 text-slate-500">{rule.type}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rule.action === "BLOCK"
                            ? "bg-rose-50 text-rose-600 border border-rose-200"
                            : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        }`}
                      >
                        {rule.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-amber-600 font-bold">
                      {rule.hits}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Custom WAF Rule Form */}
          <form
            onSubmit={handleAddWafRule}
            className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3"
          >
            <div className="text-xs font-bold text-slate-900">
              + Add Custom WAF Rule:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              <input
                type="text"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                placeholder="Rule Name"
                className="px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-900"
              />
              <select
                value={newRuleType}
                onChange={(e) =>
                  setNewRuleType(
                    e.target.value as
                      | "SQLi"
                      | "XSS"
                      | "RateLimit"
                      | "GeoBlock"
                      | "Custom"
                  )
                }
                className="px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-900"
              >
                <option value="SQLi">SQLi</option>
                <option value="XSS">XSS</option>
                <option value="RateLimit">RateLimit</option>
                <option value="Custom">Custom</option>
              </select>
              <input
                type="text"
                value={newRuleCond}
                onChange={(e) => setNewRuleCond(e.target.value)}
                placeholder="Match Condition"
                className="px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-900"
              />
              <select
                value={newRuleAction}
                onChange={(e) =>
                  setNewRuleAction(
                    e.target.value as "BLOCK" | "ALLOW" | "COUNT" | "CAPTCHA"
                  )
                }
                className="px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-900"
              >
                <option value="BLOCK">BLOCK</option>
                <option value="ALLOW">ALLOW</option>
                <option value="CAPTCHA">CAPTCHA</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-3 py-1 rounded bg-indigo-600 text-white text-xs font-semibold"
            >
              Create Rule
            </button>
          </form>
        </div>

        {/* Live Traffic Inspector */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 card-shadow space-y-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>📡</span> WAF Live Traffic Tester
          </h4>

          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Select Traffic Profile:
            </label>
            <select
              value={simTrafficType}
              onChange={(e) =>
                setSimTrafficType(
                  e.target.value as "normal" | "sqli" | "xss" | "ddos"
                )
              }
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono"
            >
              <option value="normal">Normal HTTP GET Traffic</option>
              <option value="sqli">SQL Injection Attack Payload</option>
              <option value="xss">Cross-Site Scripting (XSS) Payload</option>
              <option value="ddos">DDoS Traffic Burst (Rate Limit)</option>
            </select>
          </div>

          <button
            onClick={handleTestWafTraffic}
            className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-600/90 transition-all"
          >
            Send Test Request to WAF Engine
          </button>

          {wafResult && (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono whitespace-pre-wrap text-slate-900">
              {wafResult}
            </div>
          )}
        </div>
      </div>

      {/* SSL/TLS Hardening & Security Headers Configurator */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 card-shadow space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h4 className="text-base font-bold text-slate-900">
              SSL/TLS Protocol Hardening &amp; Response Header Audit
            </h4>
            <p className="text-xs text-slate-500">
              Configure SSL Labs target grading settings and test header compliance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">SSL Rating:</span>
            <span
              className={`text-2xl font-black font-mono ${sslGrade.color}`}
            >
              Grade {sslGrade.grade}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* TLS Version & Ciphers */}
          <div className="space-y-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <h5 className="font-bold text-slate-900">
              TLS Protocols &amp; Ciphers:
            </h5>

            <label className="flex items-center gap-2 cursor-pointer text-slate-900">
              <input
                type="checkbox"
                checked={tls13}
                onChange={(e) => setTls13(e.target.checked)}
                className="accent-indigo-500"
              />
              <span>Enable TLS 1.3 (Modern, Perfect Forward Secrecy)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-900">
              <input
                type="checkbox"
                checked={tls12}
                onChange={(e) => setTls12(e.target.checked)}
                className="accent-indigo-500"
              />
              <span>Enable TLS 1.2</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-rose-600">
              <input
                type="checkbox"
                checked={enableWeakCiphers}
                onChange={(e) => setEnableWeakCiphers(e.target.checked)}
                className="accent-rose-500"
              />
              <span>Enable Weak Ciphers (RC4, 3DES, CBC) - ⚠️ INSECURE</span>
            </label>
          </div>

          {/* Security Headers */}
          <div className="space-y-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <h5 className="font-bold text-slate-900">
              HTTP Security Headers:
            </h5>

            <label className="flex items-center gap-2 cursor-pointer text-slate-900">
              <input
                type="checkbox"
                checked={enableHsts}
                onChange={(e) => setEnableHsts(e.target.checked)}
                className="accent-indigo-500"
              />
              <span>Strict-Transport-Security (HSTS max-age=31536000)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-900">
              <input
                type="checkbox"
                checked={enableCsp}
                onChange={(e) => setEnableCsp(e.target.checked)}
                className="accent-indigo-500"
              />
              <span>Content-Security-Policy (CSP default-src &apos;self&apos;)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-900">
              <input
                type="checkbox"
                checked={enableXFrame}
                onChange={(e) => setEnableXFrame(e.target.checked)}
                className="accent-indigo-500"
              />
              <span>X-Frame-Options (DENY Clickjacking)</span>
            </label>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-500">
          <strong>Audit Evaluation Result:</strong>{" "}
          <span className={sslGrade.color}>{sslGrade.reason}</span>
        </div>
      </div>
    </section>
  );
}
