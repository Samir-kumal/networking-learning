"use client";

import { useState } from "react";

// ==========================================
// TYPES & INTERFACES
// ==========================================

export type SeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

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

// ==========================================
// MOCK DATA
// ==========================================

const OWASP_TOP_10: OwaspItem[] = [
  {
    id: "A01",
    code: "A01:2025",
    title: "Broken Access Control",
    description:
      "Failures allow unauthorized users to view, edit, or delete data belonging to other users (for example, IDOR and privilege escalation).",
    impact:
      "Data exposure, vertical or horizontal privilege escalation, and unauthorized API actions.",
    payloadExample:
      "GET /api/v1/account?userId=1002 (User 1001 requests User 1002's record)",
    vulnerableCode: `// VULNERABLE: Trusting a user-supplied ID without authorization
app.get('/api/invoice/:id', authMiddleware, async (req, res) => {
  const invoice = await db.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
  res.json(invoice); // No ownership or role check
});`,
    remediatedCode: `// REMEDIATED: Enforce authorization for the authenticated principal
app.get('/api/invoice/:id', authMiddleware, async (req, res) => {
  const invoice = await db.query(
    'SELECT * FROM invoices WHERE id = $1 AND owner_id = $2',
    [req.params.id, req.user.id]
  );
  if (!invoice) return res.status(404).json({ error: 'Not found' });
  res.json(invoice);
});`,
    keyDefenses: [
      "Enforce authorization at the domain/resource layer, not only in the UI",
      "Deny by default and test both horizontal and vertical access boundaries",
      "Log access-control failures without recording sensitive payloads",
    ],
  },
  {
    id: "A02",
    code: "A02:2025",
    title: "Security Misconfiguration",
    description:
      "Insecure defaults, unnecessary features, excessive permissions, verbose errors, or inconsistent environments can expose an application or its data.",
    impact:
      "Unnecessary attack surface, information disclosure, unauthorized cloud access, or weakened isolation.",
    payloadExample:
      "GET /debug/pprof or a request to a storage resource whose policy permits Principal \"*\"",
    vulnerableCode: `// VULNERABLE: Detailed production errors disclose internals
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message, stack: err.stack, env: process.env });
});`,
    remediatedCode: `// REMEDIATED: Generic client response, restricted internal telemetry
app.use((err, req, res, next) => {
  logger.error({ err, path: req.path, requestId: req.id });
  res.status(500).json({ error: 'Internal Server Error', requestId: req.id });
});`,
    keyDefenses: [
      "Use hardened, repeatable configuration through reviewed IaC",
      "Remove unused endpoints, features, credentials, and network exposure",
      "Continuously test cloud policies, headers, error handling, and defaults",
    ],
  },
  {
    id: "A03",
    code: "A03:2025",
    title: "Software Supply Chain Failures",
    description:
      "Weaknesses in dependency selection, build inputs, update processes, or artifact provenance can let compromised software reach users.",
    impact:
      "Malicious or vulnerable code in released software, build compromise, and difficult-to-trace downstream impact.",
    payloadExample:
      "A dependency update changes the resolved artifact without an approved review or provenance check.",
    vulnerableCode: `// VULNERABLE: Mutable dependency range without a reviewed lockfile
"dependencies": {
  "example-package": "^1.4.0"
}`,
    remediatedCode: `// REMEDIATED: Review the lockfile and verify artifact provenance in CI
// package-lock.json records the exact resolved version and integrity.
// CI also checks advisories, provenance attestations, and approved sources.`,
    keyDefenses: [
      "Generate and retain an SBOM for released artifacts",
      "Review updates, use lockfiles, and verify signatures or provenance where supported",
      "Patch known vulnerabilities while preserving a tested rollback path",
    ],
  },
  {
    id: "A04",
    code: "A04:2025",
    title: "Cryptographic Failures",
    description:
      "Sensitive data can be exposed when protection is absent, misapplied, or based on obsolete algorithms, keys, protocols, or password-storage choices.",
    impact:
      "Credential theft, personal-data exposure, session compromise, or loss of confidentiality and integrity.",
    payloadExample:
      "Intercepting plain HTTP traffic or recovering passwords stored with unsalted MD5.",
    vulnerableCode: `// VULNERABLE: Fast password hash and hardcoded key
const secretKey = "example-only-key";
function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}`,
    remediatedCode: `// REMEDIATED: Use a password-hashing library with tuned work factors
const argon2 = require('argon2');
async function hashPassword(password) {
  return argon2.hash(password, { type: argon2.argon2id });
}
// Keep application keys in a managed secret or key-management service.`,
    keyDefenses: [
      "Use TLS for network paths and select protocols/ciphers for the actual compatibility boundary",
      "Hash passwords with a memory-hard password-hashing function and tune its cost",
      "Manage keys and secrets outside source code, with rotation and access auditing",
    ],
  },
  {
    id: "A05",
    code: "A05:2025",
    title: "Injection",
    description:
      "Untrusted data reaches an interpreter as code or a query, allowing an attacker to change the intended operation (SQL, command, template, or XSS contexts).",
    impact:
      "Unauthorized data access or modification, script execution, and in some contexts code execution.",
    payloadExample: `' UNION SELECT 1, username, password_hash FROM users --`,
    vulnerableCode: `// VULNERABLE: Direct string concatenation in SQL and shell commands
const user = req.query.username;
db.query("SELECT * FROM users WHERE name = '" + user + "'");
exec("ping -c 1 " + req.query.host);`,
    remediatedCode: `// REMEDIATED: Parameterize queries and avoid shells for fixed operations
db.query("SELECT * FROM users WHERE name = $1", [user]);

const { execFile } = require('child_process');
execFile('ping', ['-c', '1', validatedHost], callback);`,
    keyDefenses: [
      "Use parameterized queries and APIs that keep data separate from instructions",
      "Encode output for its actual context; validation is not a replacement for encoding",
      "Prefer fixed-argument process APIs and tightly constrain any unavoidable interpreter input",
    ],
  },
  {
    id: "A06",
    code: "A06:2025",
    title: "Insecure Design",
    description:
      "Missing security requirements, abuse-case analysis, or resilient workflow design creates risks that implementation patches alone cannot reliably remove.",
    impact:
      "Workflow bypasses, unlimited automation, tenant escape, fraud, or unsafe recovery paths.",
    payloadExample:
      "Submitting thousands of password-reset requests because the workflow has no abuse budget or rate control.",
    vulnerableCode: `// VULNERABLE: Sensitive workflow has no abuse controls
app.post('/api/reset-password', async (req, res) => {
  await sendResetEmail(req.body.email);
  res.send({ status: 'sent' });
});`,
    remediatedCode: `// REMEDIATED: Add abuse controls and avoid account enumeration
app.post('/api/reset-password', resetLimiter, verifyChallenge, async (req, res) => {
  await queueResetEmail(req.body.email);
  res.send({ status: 'If the account exists, instructions were sent' });
});`,
    keyDefenses: [
      "Threat-model trust boundaries, abuse cases, and recovery workflows before implementation",
      "Define rate, quota, transaction, and blast-radius controls as requirements",
      "Make tenant isolation, authorization, and failure behavior testable design properties",
    ],
  },
  {
    id: "A07",
    code: "A07:2025",
    title: "Authentication Failures",
    description:
      "Weak authentication, session handling, credential recovery, or token validation can let an attacker impersonate a user.",
    impact: "Account takeover, credential stuffing, session theft, and unauthorized privileged actions.",
    payloadExample: "Automated credential stuffing with reused username/password pairs.",
    vulnerableCode: `// VULNERABLE: Returning a bearer token for browser code to store
res.json({ token: jwtToken }); // A later XSS can read localStorage`,
    remediatedCode: `// REMEDIATED: Cookie attributes reduce token exposure; add CSRF defenses
res.cookie('token', jwtToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 3600000
});
// Validate issuer, audience, expiry, and signature on every token use.`,
    keyDefenses: [
      "Use phishing-resistant MFA where practical and protect recovery paths",
      "Validate token signature, issuer, audience, expiry, and intended use",
      "Use secure cookie or token patterns together with CSRF and XSS defenses",
    ],
  },
  {
    id: "A08",
    code: "A08:2025",
    title: "Software or Data Integrity Failures",
    description:
      "Code, updates, serialized data, or build artifacts are accepted without enough integrity verification or safe parsing.",
    impact:
      "Supply-chain compromise, tampered releases, unsafe deserialization, or unauthorized application behavior.",
    payloadExample:
      "A release artifact is replaced after build but before deployment.",
    vulnerableCode: `// VULNERABLE: Unsafe deserialization of attacker-controlled data
const serialize = require('node-serialize');
app.post('/api/profile', (req, res) => {
  const userObj = serialize.unserialize(req.body.data);
  res.json(userObj);
});`,
    remediatedCode: `// REMEDIATED: Parse a constrained data format and validate its schema
const UserSchema = z.object({ username: z.string(), email: z.string().email() });
app.post('/api/profile', (req, res) => {
  const validated = UserSchema.parse(req.body);
  res.json(validated);
});`,
    keyDefenses: [
      "Verify artifact signatures, hashes, attestations, and trusted build provenance",
      "Use safe, schema-validated data formats instead of executable object deserialization",
      "Protect release metadata and deployment permissions from unauthorized changes",
    ],
  },
  {
    id: "A09",
    code: "A09:2025",
    title: "Security Logging and Alerting Failures",
    description:
      "Missing, incomplete, inaccessible, or unactionable security telemetry prevents detection, investigation, and response.",
    impact:
      "Longer attacker dwell time, weak forensic evidence, missed abuse, and delayed containment.",
    payloadExample:
      "Repeated privileged-login failures generate no durable, queryable event or alert.",
    vulnerableCode: `// VULNERABLE: Authentication failures disappear
try {
  await authenticate(user, pass);
} catch {
  return res.status(401).end(); // No security event or correlation ID
}`,
    remediatedCode: `// REMEDIATED: Emit structured, privacy-aware security telemetry
try {
  await authenticate(user, pass);
} catch (error) {
  logger.warn({ event: 'AUTH_FAILURE', userId, requestId, sourceIp });
  throw error;
}`,
    keyDefenses: [
      "Log authentication, authorization, and high-value changes with useful context",
      "Centralize protected logs with retention, access control, and time synchronization",
      "Tune detections for signal, response ownership, and false-positive review",
    ],
  },
  {
    id: "A10",
    code: "A10:2025",
    title: "Mishandling of Exceptional Conditions",
    description:
      "Unexpected input, resource exhaustion, partial failures, and error paths must fail safely rather than bypassing controls or leaking details.",
    impact:
      "Fail-open authorization, inconsistent state, denial of service, information disclosure, or unsafe recovery.",
    payloadExample:
      "A malformed request triggers a fallback path that returns success before authorization completes.",
    vulnerableCode: `// VULNERABLE: Error path reports success and skips the policy decision
try {
  await authorizeAndProcess(req);
} catch {
  res.status(200).json({ ok: true });
}`,
    remediatedCode: `// REMEDIATED: Fail closed and return a generic, traceable error
try {
  await authorizeAndProcess(req);
} catch (error) {
  logger.error({ error, requestId: req.id });
  res.status(500).json({ error: 'Request could not be completed', requestId: req.id });
}`,
    keyDefenses: [
      "Make authorization, validation, and transaction boundaries fail closed",
      "Bound resource use and handle timeouts, retries, partial failure, and cancellation",
      "Return safe client errors while retaining enough internal context to investigate",
    ],
  },
];

// ==========================================
// COMPONENT
// ==========================================

export default function SecOwaspSection() {
  const [selectedOwaspId, setSelectedOwaspId] = useState<string>("A01");
  const [testPayload, setTestPayload] = useState<string>(
    "GET /api/v1/account?userId=1002"
  );
  const [testMode, setTestMode] = useState<"vulnerable" | "remediated">(
    "vulnerable"
  );
  const [testOutput, setTestOutput] = useState<string | null>(null);

  const activeOwasp =
    OWASP_TOP_10.find((item) => item.id === selectedOwaspId) || OWASP_TOP_10[0];

  const handleTestExploit = () => {
    const isVulnerable = testMode === "vulnerable";
    setTestOutput(
      `${isVulnerable ? "TEACHING SCENARIO: CONTROL FAILURE" : "TEACHING SCENARIO: CONTROL APPLIED"}\nCategory: ${activeOwasp.code} ${activeOwasp.title}\nPayload: "${testPayload}"\nResult: ${isVulnerable ? "The fixture represents the vulnerable path; no request is sent and no code is executed." : "The fixture represents a defensive response; no request is sent and no code is executed."}\nReason: ${isVulnerable ? activeOwasp.keyDefenses[0] + " is absent in this teaching path." : activeOwasp.keyDefenses[0] + " is applied in this teaching path."}`
    );
  };

  return (
    <section id="sec-owasp" className="scroll-mt-20 space-y-6">
      {/* Section Header Card */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-700 text-xs font-mono font-bold shrink-0">
          S2 · OWASP Top 10 Matrix
        </span>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            OWASP Top 10 Vulnerability Matrix &amp; Remediation Lab
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select any OWASP Top 10:2025 category to inspect a display-only teaching scenario,
            compare vulnerable and remediated code, and identify the relevant defenses.
          </p>
        </div>
      </div>

      {/* Matrix Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {OWASP_TOP_10.map((item) => {
          const isSelected = item.id === selectedOwaspId;
          return (
            <button
              key={item.id}
              onClick={() => {
                setSelectedOwaspId(item.id);
                setTestPayload(item.payloadExample);
                setTestOutput(null);
              }}
              className={`p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? "bg-indigo-600/15 border-indigo-400 text-slate-900 dark:text-slate-100 shadow-md shadow-indigo-100"
                  : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-800"
              }`}
            >
              <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                {item.code}
              </div>
              <div className="text-xs font-bold truncate mt-0.5">
                {item.title}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected OWASP Deep Dive */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 text-xs font-mono font-semibold">
              {activeOwasp.code}
            </span>
            <h4 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
              {activeOwasp.title}
            </h4>
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-400 font-mono bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-lg border border-amber-400/20 max-w-md">
            <strong>Impact:</strong> {activeOwasp.impact}
          </div>
        </div>

        <p className="text-xs text-slate-900 dark:text-slate-100 leading-relaxed">
          {activeOwasp.description}
        </p>

        {/* Code Comparator */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Vulnerable Code */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <span>❌</span> Vulnerable Implementation
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                UNSECURE
              </span>
            </div>
            {/* Fix Issue 5: dark terminal background for code block */}
            <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 border border-rose-200 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
              {activeOwasp.vulnerableCode}
            </pre>
          </div>

          {/* Remediated Code */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span>✅</span> Remediated Secure Implementation
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                HARDENED
              </span>
            </div>
            {/* Fix Issue 5: dark terminal background for code block */}
            <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 border border-emerald-200 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
              {activeOwasp.remediatedCode}
            </pre>
          </div>
        </div>

        {/* Key Defenses */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 card-shadow space-y-2">
          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <span>🛡️</span> Key Architectural Defenses:
          </h5>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-500 dark:text-slate-400">
            {activeOwasp.keyDefenses.map((def) => (
              <li
                key={def}
                className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 flex items-start gap-2"
              >
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">•</span>
                <span>{def}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Display-only scenario tester */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>🧪</span> Display-only scenario tester
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                Test Request Payload:
              </label>
              <input
                type="text"
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                Target Handler Mode:
              </label>
              <select
                value={testMode}
                onChange={(e) =>
                  setTestMode(e.target.value as "vulnerable" | "remediated")
                }
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono"
              >
                <option value="vulnerable">Vulnerable Handler</option>
                <option value="remediated">Remediated Handler</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleTestExploit}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all"
          >
            Run teaching scenario
          </button>

          {testOutput && (
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-mono whitespace-pre-wrap text-slate-900 dark:text-slate-100">
              {testOutput}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
