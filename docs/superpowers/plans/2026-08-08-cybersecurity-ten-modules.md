# Cybersecurity Ten Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Cybersecurity track from four to fourteen browser-native modules with focused components, deterministic security evaluators, complete navigation, and verified production behavior.

**Architecture:** Keep `AppSecSection` as a composition-only coordinator. Add ten focused client components grouped in pairs by domain, and centralize deterministic decision/scoring logic in `src/lib/security-evaluators.ts` so behavior is testable without rendering. Existing S1–S4 components remain behaviorally unchanged; S5–S14 render in order with stable `sec-*` anchors.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript, Tailwind CSS, Vitest 4.1.

## Global Constraints

- Use one focused React component per module; no new monolithic security component.
- All modules are browser-native and deterministic; no API keys, databases, authentication, telemetry, or remote requests.
- Use the existing professional enterprise theme: white cards, `border-slate-200`, slate text, semantic indigo/rose/amber/emerald/violet/sky accents.
- Every module section uses `id="sec-*"` and `className` containing `scroll-mt-20`.
- Invalid or incomplete input produces an explanatory warning state and never throws.
- Never execute user-provided strings as code or make network requests.
- Avoid realistic credentials or secrets in demo data.
- Existing subnet utility tests must continue to pass.

---

### Task 1: Add deterministic security evaluator library and tests

**Files:**
- Create: `src/lib/security-evaluators.ts`
- Create: `src/lib/security-evaluators.test.ts`
- Reference: `src/lib/subnet-utils.ts`, `src/lib/subnet-utils.test.ts`

**Interfaces:**

Produce these exported types and functions for the ten new modules:

```ts
export type Severity = "critical" | "high" | "medium" | "low";
export type Decision = "ALLOW" | "STEP_UP" | "DENY";

export interface ThreatFinding {
  threat: string;
  severity: Severity;
  rationale: string;
  mitigation: string;
  mitigated: boolean;
}

export function evaluateThreatModel(
  asset: "web-api" | "database" | "object-storage" | "identity-provider" | "message-queue",
  mitigations: Set<string>,
): ThreatFinding[];

export interface IamRequest {
  principal: string;
  action: string;
  resource: string;
  mfa: boolean;
  source: "corporate" | "internet" | "service";
}

export interface IamPolicyRule {
  effect: "Allow" | "Deny";
  principal: string;
  action: string;
  resource: string;
  requireMfa?: boolean;
}

export function evaluateIamRequest(request: IamRequest, rules: IamPolicyRule[]): {
  decision: "ALLOW" | "DENY";
  matchedRule: IamPolicyRule | null;
  reason: string;
};

export function evaluateApiRequest(input: {
  endpoint: "account" | "orders" | "admin" | "upload";
  authenticated: boolean;
  ownsObject: boolean;
  bodyValid: boolean;
  rateWithinLimit: boolean;
}): { decision: "ALLOW" | "BLOCK"; finding: string; control: string };

export function evaluateZeroTrustRequest(input: {
  identityVerified: boolean;
  deviceCompliant: boolean;
  destination: "public" | "application" | "data" | "management" | "third-party";
  sourceZone: "internet" | "workforce" | "workload" | "partner";
  mfa: boolean;
}): { decision: Decision; reason: string };

export function scoreIncidentResponse(input: {
  severity: Severity;
  contained: boolean;
  evidencePreserved: boolean;
  affectedAssets: number;
  lifecycleStepsCompleted: string[];
}): { score: number; priority: string; nextAction: string };

export function detectSiemEvents(events: Array<{ id: string; kind: string; user: string; sourceIp: string; failedAttempts: number; privilegeChange: boolean; bytesOut: number }>, rule: "credential-stuffing" | "privilege-escalation" | "data-exfiltration"): string[];

export function evaluateSbom(input: { dependencies: Array<{ name: string; version: string; severity: Severity | "none"; pinned: boolean; signed: boolean; license: string }>; allowLicenses: string[] }): { verdict: "PASS" | "WARN" | "BLOCK"; findings: string[] };

export function evaluateContainerAdmission(input: { nonRoot: boolean; readOnlyRoot: boolean; droppedCapabilities: boolean; hostNetwork: boolean; hostPath: boolean; signedImage: boolean; resourceLimits: boolean }): { admitted: boolean; findings: string[] };

export function scoreCloudPosture(findings: Array<{ id: string; severity: Severity; resource: string; publicExposure: boolean; fixed: boolean }>): { score: number; grade: "A" | "B" | "C" | "D" | "F"; openFindings: number };

export function controlsForDataClass(classification: "public" | "internal" | "confidential" | "restricted"): { encryption: string; access: string; retention: string; audit: string; masking: string };
```

- [ ] **Step 1: Write failing tests for every exported evaluator**

Include at least these assertions:

```ts
it("explicit IAM Deny overrides Allow", () => {
  const result = evaluateIamRequest(
    { principal: "analyst", action: "s3:DeleteObject", resource: "arn:aws:s3:::private/*", mfa: true, source: "corporate" },
    [
      { effect: "Allow", principal: "analyst", action: "s3:*", resource: "arn:aws:s3:::private/*" },
      { effect: "Deny", principal: "analyst", action: "s3:DeleteObject", resource: "arn:aws:s3:::private/*" },
    ],
  );
  expect(result.decision).toBe("DENY");
});

it("blocks non-owner API object access", () => {
  expect(evaluateApiRequest({ endpoint: "orders", authenticated: true, ownsObject: false, bodyValid: true, rateWithinLimit: true }).decision).toBe("BLOCK");
});

it("rejects insecure container admission", () => {
  expect(evaluateContainerAdmission({ nonRoot: false, readOnlyRoot: false, droppedCapabilities: false, hostNetwork: true, hostPath: true, signedImage: false, resourceLimits: false }).admitted).toBe(false);
});
```

Also test STRIDE mitigation changes, Zero Trust `STEP_UP`, incident score degradation, SIEM rule matching, SBOM blocking, cloud grade calculation, and privacy control mapping.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm test --prefix networking-learning -- src/lib/security-evaluators.test.ts`

Expected: FAIL because the evaluator module does not exist yet.

- [ ] **Step 3: Implement the pure evaluators**

Use exact-match/wildcard helpers local to the module, explicit severity ordering, bounded scores from 0–100, and deterministic output strings. Do not use browser APIs in this file.

- [ ] **Step 4: Run focused and existing tests**

Run: `npm test --prefix networking-learning`

Expected: all existing subnet tests and all security evaluator tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/security-evaluators.ts src/lib/security-evaluators.test.ts
git commit -m "feat: add deterministic cybersecurity evaluators"
```

---

### Task 2: Build S5 threat modeling and S6 IAM modules

**Files:**
- Create: `src/components/tracks/SecThreatModelSection.tsx`
- Create: `src/components/tracks/SecIamSection.tsx`
- Consume: `src/lib/security-evaluators.ts`

**Interfaces:**

- `SecThreatModelSection` imports `evaluateThreatModel` and renders `id="sec-threat-model"`.
- `SecIamSection` imports `evaluateIamRequest`, renders `id="sec-iam"`, and exposes principal/action/resource/MFA/source controls.
- Both components use `"use client"` and local state only.

- [ ] **Step 1: Implement S5 with an asset selector and mitigation toggles**

Render the selected asset, threat finding cards, mitigation checkboxes, severity labels, and a computed residual-risk summary. Use defaults for `web-api` and no mitigations. Display an explanatory empty/warning state only if no asset is selected.

- [ ] **Step 2: Implement S6 with policy request controls**

Render a request form and a local policy table. On evaluation, show Allow/Deny, matched rule, and reason. Explicit deny precedence must come from `evaluateIamRequest`, not duplicated in JSX.

- [ ] **Step 3: Run build**

Run: `npm run build --prefix networking-learning`

Expected: TypeScript and static generation pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/tracks/SecThreatModelSection.tsx src/components/tracks/SecIamSection.tsx
git commit -m "feat: add threat modeling and IAM security labs"
```

---

### Task 3: Build S7 API security and S8 Zero Trust modules

**Files:**
- Create: `src/components/tracks/SecApiSecuritySection.tsx`
- Create: `src/components/tracks/SecZeroTrustSection.tsx`
- Consume: `src/lib/security-evaluators.ts`

**Interfaces:**

- `SecApiSecuritySection` renders `id="sec-api-security"` and calls `evaluateApiRequest`.
- `SecZeroTrustSection` renders `id="sec-zero-trust"` and calls `evaluateZeroTrustRequest`.

- [ ] **Step 1: Implement S7 request testing simulator**

Include endpoint, authentication, object ownership, body validation, and rate-limit controls. Show the decision, matched API security concern, recommended control, and a safe example request. Never execute entered payload text.

- [ ] **Step 2: Implement S8 policy/path simulator**

Include identity, device, source zone, destination zone, MFA, and action controls. Show Allow, Step-up MFA, or Deny with reason and a simple zone path visualization made from static cards.

- [ ] **Step 3: Run focused security tests and production build**

Run: `npm test --prefix networking-learning && npm run build --prefix networking-learning`

Expected: all tests and routes compile successfully.

- [ ] **Step 4: Commit**

```bash
git add src/components/tracks/SecApiSecuritySection.tsx src/components/tracks/SecZeroTrustSection.tsx
git commit -m "feat: add API security and zero trust labs"
```

---

### Task 4: Build S9 incident response and S10 SIEM modules

**Files:**
- Create: `src/components/tracks/SecIncidentResponseSection.tsx`
- Create: `src/components/tracks/SecSiemSection.tsx`
- Consume: `src/lib/security-evaluators.ts`

**Interfaces:**

- `SecIncidentResponseSection` renders `id="sec-incident-response"` and calls `scoreIncidentResponse`.
- `SecSiemSection` renders `id="sec-siem"` and calls `detectSiemEvents`.

- [ ] **Step 1: Implement S9 seeded alert investigation**

Provide three local alert scenarios, lifecycle step checkboxes, severity selection, affected-asset count, evidence-preservation toggle, and a score/priority/next-action result. Keep scenario data static and do not expose real credentials.

- [ ] **Step 2: Implement S10 event filtering and detection rules**

Render a static event table, rule selector, source/severity filters, matching event IDs, and an analyst conclusion. The detection result must come from the evaluator.

- [ ] **Step 3: Run focused tests**

Run: `npm test --prefix networking-learning`

Expected: incident and SIEM evaluator assertions pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/tracks/SecIncidentResponseSection.tsx src/components/tracks/SecSiemSection.tsx
git commit -m "feat: add incident response and SIEM labs"
```

---

### Task 5: Build S11 supply-chain and S12 container security modules

**Files:**
- Create: `src/components/tracks/SecSupplyChainSection.tsx`
- Create: `src/components/tracks/SecContainerSecuritySection.tsx`
- Consume: `src/lib/security-evaluators.ts`

**Interfaces:**

- `SecSupplyChainSection` renders `id="sec-supply-chain"` and calls `evaluateSbom`.
- `SecContainerSecuritySection` renders `id="sec-container-security"` and calls `evaluateContainerAdmission`.

- [ ] **Step 1: Implement S11 dependency/SBOM analyzer**

Render package inventory rows, a license allowlist selector, and a policy result with Pass/Warn/Block. Show findings for severity, unpinned dependencies, unsigned artifacts, and disallowed licenses.

- [ ] **Step 2: Implement S12 admission simulator**

Render toggles for non-root, read-only root, dropped capabilities, host networking, host paths, signed image, and resource limits. Show admission status and each failed control with remediation text.

- [ ] **Step 3: Run build**

Run: `npm run build --prefix networking-learning`

Expected: no TypeScript or static-generation errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/tracks/SecSupplyChainSection.tsx src/components/tracks/SecContainerSecuritySection.tsx
git commit -m "feat: add supply chain and container security labs"
```

---

### Task 6: Build S13 cloud posture and S14 privacy modules

**Files:**
- Create: `src/components/tracks/SecCloudPostureSection.tsx`
- Create: `src/components/tracks/SecPrivacyComplianceSection.tsx`
- Consume: `src/lib/security-evaluators.ts`

**Interfaces:**

- `SecCloudPostureSection` renders `id="sec-cloud-posture"` and calls `scoreCloudPosture`.
- `SecPrivacyComplianceSection` renders `id="sec-privacy-compliance"` and calls `controlsForDataClass`.

- [ ] **Step 1: Implement S13 posture scanner**

Render a local AWS finding set across IAM, S3, VPC, CloudTrail, KMS, and security groups. Provide a scan/recalculate control, severity filters, resource evidence, remediation text, and grade/score summary.

- [ ] **Step 2: Implement S14 data classification checklist**

Render example fields, classification selection, mapped controls for encryption/access/retention/audit/masking, and a completion checklist. Include a visible disclaimer that this is educational guidance, not formal legal compliance advice.

- [ ] **Step 3: Run tests and build**

Run: `npm test --prefix networking-learning && npm run build --prefix networking-learning`

Expected: all evaluator tests pass and production build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/tracks/SecCloudPostureSection.tsx src/components/tracks/SecPrivacyComplianceSection.tsx
git commit -m "feat: add cloud posture and privacy modules"
```

---

### Task 7: Integrate S5–S14 into coordinator, Sidebar, metadata, and counts

**Files:**
- Modify: `src/components/tracks/AppSecSection.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/TrackCard.tsx` call site in `src/app/page.tsx`
- Modify: `src/app/security/page.tsx`

**Interfaces:**

`AppSecSection` must import and render all ten new components after S4 in this exact order:

```tsx
<SecThreatModelSection />
<SecIamSection />
<SecApiSecuritySection />
<SecZeroTrustSection />
<SecIncidentResponseSection />
<SecSiemSection />
<SecSupplyChainSection />
<SecContainerSecuritySection />
<SecCloudPostureSection />
<SecPrivacyComplianceSection />
```

- [ ] **Step 1: Add S5–S14 Sidebar entries**

Add these exact IDs and labels under `MODULE_ITEMS_BY_TRACK.security`:

```ts
{ id: "sec-threat-model",       num: "S5",  label: "Threat Modeling & STRIDE",       category: "Security", icon: "◈" },
{ id: "sec-iam",                num: "S6",  label: "IAM & Least Privilege",           category: "Security", icon: "◉" },
{ id: "sec-api-security",      num: "S7",  label: "API Security",                    category: "Security", icon: "⬡" },
{ id: "sec-zero-trust",        num: "S8",  label: "Zero Trust Segmentation",          category: "Security", icon: "⊘" },
{ id: "sec-incident-response", num: "S9",  label: "Incident Response & SOC",          category: "Security", icon: "⚠" },
{ id: "sec-siem",              num: "S10", label: "SIEM Detection & Logs",             category: "Security", icon: "▤" },
{ id: "sec-supply-chain",     num: "S11", label: "Supply Chain & SBOM",               category: "Security", icon: "⑂" },
{ id: "sec-container-security",num: "S12",label: "Container Security",                category: "Security", icon: "⬡" },
{ id: "sec-cloud-posture",    num: "S13", label: "Cloud Security Posture",            category: "Security", icon: "☁" },
{ id: "sec-privacy-compliance",num: "S14",label: "Privacy & Compliance",              category: "Security", icon: "◐" },
```

- [ ] **Step 2: Update counts and copy**

Change the security track badge to `14 Modules`, the security page header to `14 Interactive Modules`, and descriptions to mention threat modeling, IAM, API security, Zero Trust, incident response, SIEM, SBOM, container security, cloud posture, and privacy.

- [ ] **Step 3: Confirm navigation order and anchors**

Verify every Sidebar ID exactly matches an element ID in the rendered security route. Keep the existing sticky in-page nav horizontally scrollable.

- [ ] **Step 4: Run build**

Run: `npm run build --prefix networking-learning`

Expected: all seven routes compile and statically prerender.

- [ ] **Step 5: Commit**

```bash
git add src/components/tracks/AppSecSection.tsx src/components/Sidebar.tsx src/app/page.tsx src/app/security/page.tsx
git commit -m "feat: integrate fourteen cybersecurity modules"
```

---

### Task 8: Run full verification and production smoke test

**Files:**
- Verify: all modified files from Tasks 1–7
- No source changes expected unless verification exposes a concrete defect

- [ ] **Step 1: Run the complete test suite**

Run: `npm test --prefix networking-learning`

Expected: existing subnet tests plus all security evaluator tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build --prefix networking-learning`

Expected: all routes compile and prerender without TypeScript errors.

- [ ] **Step 3: Rebuild Docker and smoke-test routes**

Run:

```bash
docker rm -f networking-learning-app 2>/dev/null || true
docker compose up -d --build
sleep 3
for route in / /security /networking /aws /git-ops /docker-k8s; do
  curl -s -o /dev/null -w "$route %{http_code}\n" "http://localhost:3008$route"
done
```

Expected: every route returns `200`.

- [ ] **Step 4: Browser-check security anchors and visibility**

Open `http://localhost:3008/security` and verify:

```js
[...document.querySelectorAll('section[id^="sec-"]')].map((section) => section.id)
```

Expected exact anchors: `sec-scanners`, `sec-owasp`, `sec-vault`, `sec-waf`, `sec-threat-model`, `sec-iam`, `sec-api-security`, `sec-zero-trust`, `sec-incident-response`, `sec-siem`, `sec-supply-chain`, `sec-container-security`, `sec-cloud-posture`, `sec-privacy-compliance`.

Also verify every section has computed `display !== "none"`.

- [ ] **Step 5: Commit only concrete verification fixes**

```bash
git status --short
git add <verified-fix-files>
git commit -m "test: verify fourteen cybersecurity modules"
```

Do not create an empty commit when no verification fix is needed.
