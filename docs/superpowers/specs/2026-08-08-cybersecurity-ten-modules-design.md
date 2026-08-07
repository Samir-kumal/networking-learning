# Cybersecurity Track Expansion Design

**Date:** 2026-08-08  
**Project:** networking-learning  
**Status:** Design approved in conversation; written-spec review pending

## Goal

Expand the Cybersecurity & AppSec track from four modules to fourteen modules without changing the existing four labs or introducing external services, credentials, or network dependencies.

The expanded track should provide broad DevSecOps coverage while preserving the current professional enterprise visual system and the existing scrollable-module navigation model.

## Current State

The track currently contains four standalone client components coordinated by `AppSecSection`:

1. SAST/DAST and container vulnerability scanning
2. OWASP Top 10 matrix and exploit/remediation lab
3. HashiCorp Vault versus AWS Secrets Manager workflow
4. WAF rules and TLS/security-header hardening

The Sidebar and in-page navigation identify these modules as `S1`–`S4`. Each module renders as a scrollable section with a stable `sec-*` anchor.

## Design Decisions

### Component architecture

Use one focused component per module. `AppSecSection` remains a composition-only coordinator responsible for:

- Track header and description
- Sticky in-page navigation
- Ordered rendering of the fourteen module components

Each module owns its own state, deterministic demo data, interaction handlers, and presentation. No module should import state or implementation details from another module.

New components:

- `SecThreatModelSection.tsx`
- `SecIamSection.tsx`
- `SecApiSecuritySection.tsx`
- `SecZeroTrustSection.tsx`
- `SecIncidentResponseSection.tsx`
- `SecSiemSection.tsx`
- `SecSupplyChainSection.tsx`
- `SecContainerSecuritySection.tsx`
- `SecCloudPostureSection.tsx`
- `SecPrivacyComplianceSection.tsx`

Existing components remain in place:

- `SecScannersSection.tsx`
- `SecOwaspSection.tsx`
- `SecVaultSection.tsx`
- `SecWafSection.tsx`

### Module format

Use the approved balanced mix:

- Six interactive labs with controls and deterministic output
- Four concise reference/checklist modules with lightweight interaction

All modules remain browser-native and deterministic. No API keys, databases, authentication, telemetry, or remote requests are required.

## Module Specifications

### S5 — Threat Modeling & STRIDE

**Anchor:** `sec-threat-model`  
**Format:** Interactive threat-model canvas

Users select an architecture asset such as web API, database, object storage, identity provider, or message queue. The module displays relevant STRIDE threats, likelihood/impact, mitigations, and residual risk. Users can mark mitigations as applied and receive a deterministic risk score.

**Core concepts:** Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege; trust boundaries; abuse cases.

### S6 — IAM, RBAC & Least Privilege

**Anchor:** `sec-iam`  
**Format:** Interactive policy evaluator

Users select a principal, resource, action, and context. A local policy set evaluates the request as Allow or Deny and explains which rule matched. Include examples for wildcard permissions, explicit denies, role inheritance, MFA conditions, and service identities.

**Core concepts:** RBAC, ABAC, explicit deny precedence, separation of duties, least privilege, MFA conditions.

### S7 — API Security & OWASP API Top 10

**Anchor:** `sec-api-security`  
**Format:** Request testing simulator

Users choose an API endpoint and attack/request profile. The module evaluates authorization, object-level access, input validation, rate limiting, schema validation, and sensitive-data exposure. The result shows the vulnerable behavior, the security control that catches it, and a remediation recommendation.

**Core concepts:** BOLA/IDOR, broken authentication, unrestricted resource consumption, mass assignment, SSRF, improper inventory, schema validation.

### S8 — Zero Trust & Network Segmentation

**Anchor:** `sec-zero-trust`  
**Format:** Policy/path decision simulator

Users choose source identity, device posture, destination, network zone, and requested action. The module evaluates identity, device, context, and least-privilege policy before returning Allow, Step-up MFA, or Deny. Include a simple zone map for public, application, data, management, and third-party networks.

**Core concepts:** Never trust/always verify, microsegmentation, device posture, workload identity, policy enforcement points, east-west traffic.

### S9 — Incident Response & SOC Triage

**Anchor:** `sec-incident-response`  
**Format:** Interactive alert investigation workflow

Users receive a seeded alert bundle such as credential stuffing, suspicious container execution, or impossible travel. They classify severity, select containment actions, identify affected assets, and advance through preparation, detection, containment, eradication, recovery, and lessons learned. The module scores completeness and ordering.

**Core concepts:** incident lifecycle, evidence preservation, severity classification, containment versus eradication, chain of custody, post-incident review.

### S10 — SIEM Detection & Log Analysis

**Anchor:** `sec-siem`  
**Format:** Query/filter detection lab

Render deterministic authentication, API, WAF, and cloud audit events. Users filter by source/severity and run a small set of detection rules, such as repeated failed logins, privilege escalation, suspicious user agents, and unusual data transfer. Show matching events and an analyst conclusion.

**Core concepts:** structured logging, correlation, detection rules, false positives, alert enrichment, retention, tamper resistance.

### S11 — Software Supply Chain & SBOM

**Anchor:** `sec-supply-chain`  
**Format:** Dependency/SBOM risk analyzer

Users choose a package inventory or artifact manifest. The module identifies outdated dependencies, known vulnerable packages, license concerns, unpinned versions, unsigned artifacts, and transitive-risk concentration. A policy gate returns Pass, Warn, or Block.

**Core concepts:** SBOM, provenance, dependency pinning, lockfiles, artifact signing, SLSA-style attestations, license governance.

### S12 — Container & Kubernetes Security

**Anchor:** `sec-container-security`  
**Format:** Pod security and admission simulator

Users configure image provenance, user identity, capabilities, host mounts, network policy, resource limits, secrets handling, and namespace isolation. The module evaluates a workload against baseline controls and returns admission findings plus hardened configuration guidance.

**Core concepts:** non-root containers, read-only filesystems, dropped capabilities, seccomp, Pod Security Standards, admission control, image signing, runtime isolation.

### S13 — Cloud Security Posture Management

**Anchor:** `sec-cloud-posture`  
**Format:** Local AWS posture scanner

Users select a sample AWS account profile. The module scans deterministic findings across IAM, S3, VPC, CloudTrail, security groups, KMS, and public exposure. Findings include severity, resource, evidence, remediation, and an aggregate posture score.

**Core concepts:** secure defaults, public exposure, audit trails, encryption, identity boundaries, security-group minimization, continuous posture management.

### S14 — Privacy, Data Protection & Compliance

**Anchor:** `sec-privacy-compliance`  
**Format:** Data classification and control checklist

Users classify example fields as public, internal, confidential, or restricted. The module maps classifications to encryption, retention, access, masking, deletion, and audit controls. A compliance checklist supports GDPR-style data-subject rights, PCI-style card-data controls, and general privacy-by-design practices without claiming formal legal compliance.

**Core concepts:** data minimization, purpose limitation, retention, encryption, masking/tokenization, access logging, deletion workflows, privacy by design.

## Navigation and Metadata

Update `MODULE_ITEMS_BY_TRACK.security` from four entries to fourteen entries with sequential IDs `S1` through `S14`. Use the exact component anchors above for S5–S14.

Update:

- Security track badge from `4 Modules` to `14 Modules`
- Track header copy from `Module 4 of 5` to `14 Interactive Modules`
- Security page metadata description to mention the expanded coverage
- AppSec in-page navigation to include all fourteen modules
- Any homepage or track summary count that currently reports four Security modules

The existing active-section tracking must continue to work for every anchor. The sticky in-page navigation may remain horizontally scrollable on narrow screens.

## Visual Design

All modules use the existing enterprise design language:

- White cards with `border-slate-200`
- Slate headings and body text
- Indigo primary actions
- Semantic rose, amber, emerald, violet, and sky accents
- Dark slate code/log panels only where contrast benefits terminal output
- `scroll-mt-20` on every module section
- No raw Cyberpunk hex colors
- No unnecessary gradients or neon shadows

## State and Data Flow

Each interactive component uses local React state. Controls update local state synchronously; deterministic evaluator functions derive result objects from current state. Result panels must display both the verdict and an explanation, not only a color or score.

No module mutates shared global state. Navigation uses regular anchor links. Switching pages resets module state naturally through component lifecycle.

## Error Handling and Boundaries

Inputs must have safe defaults and visible validation for malformed values. Invalid or incomplete configuration should produce an explanatory warning state rather than throwing. Demo simulators must not execute user-provided strings as code or make network requests.

Where a module accepts free-form text, sanitize display through React text rendering and keep generated output bounded. Avoid exposing realistic credentials or secrets in new demo data.

## Testing Strategy

Add deterministic unit tests for new pure evaluators and scoring functions. Tests should cover:

- STRIDE threat selection and mitigation score changes
- IAM explicit-deny precedence and least-privilege decisions
- API request control outcomes
- Zero Trust Allow/Step-up/Deny decisions
- Incident severity and lifecycle scoring
- SIEM detection rule matching
- SBOM policy gate outcomes
- Container admission findings
- Cloud posture severity aggregation
- Privacy control mapping by data classification

The test suite should continue to pass with the existing subnet utility tests. UI smoke verification must confirm all fourteen anchors render and all module sections are visible on `/security`.

## Acceptance Criteria

1. Security track displays fourteen modules, S1–S14.
2. All ten new modules render as dedicated anchored components.
3. Existing four modules retain their current behavior.
4. All new modules have at least one observable interaction or checklist transition.
5. No external service, API key, database, or credential is required.
6. Enterprise theme is consistent across all modules.
7. Invalid inputs produce visible, recoverable feedback.
8. Unit tests cover each new deterministic evaluator.
9. Production build succeeds.
10. `/security` returns HTTP 200 and browser smoke test confirms all fourteen anchors and visible sections.
