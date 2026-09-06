# Cybersecurity Track Harmonization — Design Specification

## 1. Overview & Goals

**Track:** Cybersecurity & AppSec (`/security` route)  
**Modules:** 14 interactive browser-only labs (`S1` through `S14`)  
**Objective:** Modernize and harmonize the Cybersecurity track following the Precision Telemetry design system and structured curriculum stages, using the **Inline Method** with increasing scope.

---

## 2. Curriculum Staging & Progression

To provide clear learning milestones, the 14 modules are organized into 4 progressive stages while strictly preserving the existing S1–S14 IDs, anchors, and sidebar sequence:

| Stage | Tone | Title | Modules | Topics Covered |
|---|---|---|---|---|
| **01 · AppSec** | `rose` | Application Security & Exploit Defense | S1–S4 (`sec-scanners`, `sec-owasp`, `sec-vault`, `sec-waf`) | Trivy/Snyk CVEs, OWASP Top 10:2025, HashiCorp Vault vs Secrets Manager, WAF rules & TLS hardening |
| **02 · Identity** | `amber` | Threat Modeling & Zero Trust Identity | S5–S8 (`sec-threat-model`, `sec-iam`, `sec-api-security`, `sec-zero-trust`) | STRIDE mitigation matrix, IAM least privilege, BOLA/IDOR API security, Zero Trust micro-perimeters |
| **03 · Operations** | `cyan` | Security Operations & Supply Chain | S9–S11 (`sec-incident-response`, `sec-siem`, `sec-supply-chain`) | SOC triage & containment, SIEM detection rules, CycloneDX/SPDX SBOM license & CVE audit |
| **04 · Posture** | `violet` | Cloud Posture & Privacy Compliance | S12–S14 (`sec-container-security`, `sec-cloud-posture`, `sec-privacy-compliance`) | Kubernetes Pod admission security, CSPM multi-control posture scoring, GDPR/HIPAA data classification |

---

## 3. Visual System & Surface Architecture

The track will adopt the semantic 4-tier surface system:
- **Level 0 (Canvas):** `#f8fafc` (light) / `#070b14` (dark)
- **Level 1 (Module Deck):** `#ffffff` (light) / `#0d1527` (dark) with 1px border (`--border-l1`)
- **Level 2 (Recessed Well):** `#f1f5f9` (light) / `#080d1a` (dark) — physically darker than deck in dark mode
- **Level 3 (Telemetry Inset):** `#0b1329` (light) / `#030712` (dark) — terminal logs, exploit payloads, and policy traces

---

## 4. Phased Execution Roadmap (Increasing Scope)

1. **Phase 1: Test Baseline & Anchor Lock-in (Foundation)**
   - Add `src/app/security/page.test.tsx` verifying SSR rendering, metadata, and all 14 anchor targets.
   - Update `src/components/tracks/ModuleNavigationAnchors.test.tsx` to include `AppSecSection`.
2. **Phase 2: Stage Shell & Orientation Map (Navigation)**
   - Introduce curriculum stage navigation cards on `/security`.
   - Wrap modules in stage dividers with stage signal telemetry.
3. **Phase 3: Module Harmonization (Visual Parity)**
   - Harmonize outer wrappers, forms, selects, and telemetry insets across S1–S14.
4. **Phase 4: Full Validation & Verification (Delivery)**
   - Full test suite, typecheck, lint, Next.js build, and headless browser smoke test.
