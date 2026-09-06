# Cybersecurity Track Harmonization Implementation Plan

> **Execution Mode:** Executed via **The Inline Method** (`superpowers:executing-plans`), stepping through tasks sequentially in the main thread with explicit verification checkpoints.

**Goal:** Modernize the Cybersecurity & AppSec track (`/security`) by locking in test coverage for all 14 modules, introducing a 4-stage curriculum orientation, harmonizing UI surfaces to the 4-tier elevation system, and verifying production quality.

**Architecture:**
- **Navigation:** Preserves all 14 module anchor IDs (`#sec-scanners` through `#sec-privacy-compliance`) and S1–S14 sidebar ordering.
- **Stages:** 4 curriculum stages (AppSec, Identity, Operations, Posture) with stage signals and telemetry glyphs (`◉`, `◈`, `▤`, `☁`).
- **Surfaces:** Level 0 canvas substrate, Level 1 module deck, Level 2 recessed control wells, Level 3 exploit/policy trace insets.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript, Tailwind CSS 4, Vitest, Chromium browser automation.

**Spec Reference:** `docs/superpowers/specs/2026-09-06-cybersecurity-track-harmonization-design.md`

---

## Global Constraints

- Preserve all 14 anchor targets (`#sec-scanners`, `#sec-owasp`, `#sec-vault`, `#sec-waf`, `#sec-threat-model`, `#sec-iam`, `#sec-api-security`, `#sec-zero-trust`, `#sec-incident-response`, `#sec-siem`, `#sec-supply-chain`, `#sec-container-security`, `#sec-cloud-posture`, `#sec-privacy-compliance`).
- Retain all existing evaluator logic in `src/lib/security-evaluators.ts` without breaking behavioral contracts.
- High contrast in both light (`#f8fafc`) and dark (`#070b14`) modes.
- Do not skip review checkpoints; run focused checks per phase and full project validation at the end.

---

### Phase 1: Test Baseline & Anchor Lock-in (Scope: Testing)

**Files:**
- Create: `src/app/security/page.test.tsx`
- Modify: `src/components/tracks/ModuleNavigationAnchors.test.tsx`

- [x] **Step 1: Create `src/app/security/page.test.tsx`**
  Add SSR unit tests asserting:
  - Page renders with expected metadata and title.
  - All 14 anchor IDs exist in the rendered markup.
  - S1–S14 modules render in strict sequential prerequisite order.
  - Sidebar metadata matches curriculum sequence.

- [x] **Step 2: Update `ModuleNavigationAnchors.test.tsx`**
  Add test asserting that `AppSecSection` exposes all 14 security anchor targets.

- [x] **Step 3: Run Vitest to verify baseline tests pass**
  Run `npx vitest run src/app/security/page.test.tsx src/components/tracks/ModuleNavigationAnchors.test.tsx` (all 9 tests pass).
### Phase 2: Curriculum Stages & Track Orientation (Scope: Shell & Layout)

**Files:**
- Modify: `src/app/security/page.tsx`
- Modify: `src/components/tracks/AppSecSection.tsx`

- [x] **Step 1: Introduce curriculum stage map in `page.tsx` or `AppSecSection.tsx`**
  Add an operations orientation header with a 4-stage roadmap:
  - Stage 1: Application Security & Exploit Defense (S1–S4, tone: rose)
  - Stage 2: Threat Modeling & Zero Trust Identity (S5–S8, tone: amber)
  - Stage 3: Security Operations & Supply Chain (S9–S11, tone: cyan)
  - Stage 4: Cloud Posture & Privacy Compliance (S12–S14, tone: violet)

- [x] **Step 2: Wrap module groups in structured stage dividers**
  Organize the flat 14-module stack into 4 clean stage sections with stage glyphs and progress signals.

- [x] **Step 3: Verify with focused tests**
  Run `npx vitest run src/app/security/page.test.tsx` (5 / 5 tests pass).
- Modify: `src/components/tracks/Sec*.tsx` (S1 through S14)

- [x] **Step 1: Harmonize Stage 1 modules (S1–S4)**
  Upgrade `SecScannersSection`, `SecOwaspSection`, `SecVaultSection`, `SecWafSection` to Level 1 module deck cards and Level 3 telemetry insets.

- [x] **Step 2: Harmonize Stage 2 modules (S5–S8)**
  Upgrade `SecThreatModelSection`, `SecIamSection`, `SecApiSecuritySection`, `SecZeroTrustSection` to Level 1 cards with Level 2 form controls.

- [x] **Step 3: Harmonize Stage 3 modules (S9–S11)**
  Upgrade `SecIncidentResponseSection`, `SecSiemSection`, `SecSupplyChainSection` to Level 1 cards with Level 3 log trace insets.

- [x] **Step 4: Harmonize Stage 4 modules (S12–S14)**
  Upgrade `SecContainerSecuritySection`, `SecCloudPostureSection`, `SecPrivacyComplianceSection` to Level 1 cards with Level 2 control grids.

---

### Phase 4: Full Validation Suite & Visual Verification (Scope: Delivery)

**Files:**
- Read: all modified files

- [x] **Step 1: Run full unit test suite**
  `npm test` (all 21 test files, 107 / 107 passed).

- [x] **Step 2: Run TypeScript typecheck**
  `npm run typecheck` (0 errors).

- [x] **Step 3: Run ESLint**
  `npm run lint` (0 errors, 0 warnings).

- [x] **Step 4: Run Next.js production build**
  `npm run build` (all routes prerendered).

- [x] **Step 5: Visual browser smoke check**
  Verify light/dark mode contrast and mobile responsiveness (390px viewport, no horizontal overflow) in Chromium.
