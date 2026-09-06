# Precision Telemetry Console Implementation Plan

> **Execution Mode:** Executed via **The Inline Method** (`superpowers:executing-plans`), completing all tasks directly in the primary session with continuous step-by-step verification.

**Goal:** Complete the transition to Direction A (Precision Telemetry Console) across the `/networking` route by incorporating code review findings, ensuring strict token parity, adding unit test coverage for stage signals and semantic tokens, and validating production readiness.

**Architecture:**
- **Surfaces:** 4-tier semantic elevation system (`--surface-l0` through `--surface-l3`, `--border-l1` through `--border-l3`) defined in `src/app/globals.css`.
- **Stages:** Cascading CSS variables (`--networking-tone`, `--networking-tone-border`, `--networking-tone-surface`, `--networking-tone-glow`) attached to `[data-tone]`.
- **Components:** Shared primitives (`NetworkingPanel`, `NetworkingModuleHeader`, `NetworkingMetric`, `NetworkingExample`, `NetworkingTable`) consume semantic tokens without redundant `dark:` class overrides.
- **Resilience:** Defensive parsing of subsection stage labels to prevent `NaN` progress indicators.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript, Tailwind CSS 4, Vitest, Headless Chromium browser automation.

**Spec Reference:** `docs/superpowers/specs/2026-09-06-precision-telemetry-design-system.md`

---

## Global Constraints

- Preserve all 23 module anchor IDs (`#basics` through `#quiz`), sidebar metadata, curriculum order, and simulator state.
- Retain high-contrast readability in both light (`#f8fafc` canvas) and dark (`#070b14` canvas) modes.
- Recessed wells (`Level 2`, `--surface-l2`) must remain physically darker than the Module Deck (`Level 1`, `--surface-l1`) in dark mode.
- Avoid redundant `dark:` Tailwind class overrides for properties already controlled by theme-switching CSS variables.
- Run focused checks during steps; run the full validation suite (`test`, `typecheck`, `lint`, `build`) at the end.

---

### Task 1: Resolve Code Review Findings and Polish Shared Primitives

**Files:**
- Modify: `src/components/NetworkingSubsection.tsx`
- Modify: `src/components/networking/NetworkingPanel.tsx`
- Modify: `src/components/sections/PacketSection.tsx`
- Modify: `src/components/sections/CheatSheetSection.tsx`
- Modify: `src/components/sections/SecuritySection.tsx`
- Modify: `src/components/sections/WirelessSection.tsx`
**Interfaces:**
- `NetworkingSubsection`: Accepts `label: string` (e.g. `"01 · Foundations"`). Must safely extract stage number with fallback to `0` if malformed.
- `NetworkingPanel`: Uses `--surface-l1` / `--border-l1` directly without duplicate `dark:` classes.
- Active tabs in `PacketSection` and `CheatSheetSection`: Harmonized with stage tones.

- [x] **Step 1: Harden stageIndex calculation in NetworkingSubsection**
  Replace `Math.max(0, parseInt(label.slice(0, 2), 10) - 1)` with the concise inline method:
  ```tsx
  const stageIndex = Math.max(0, (parseInt(label.slice(0, 2), 10) || 1) - 1);
  ```
  Remove redundant `dark:bg-[color:var(--surface-l1)]` on the inner subsection header card.

- [x] **Step 2: Clean redundant dark overrides in NetworkingPanel**
  In `src/components/networking/NetworkingPanel.tsx`, remove redundant `dark:border-[color:var(--border-l1)]` and `dark:bg-[color:var(--surface-l1)]` from the `default` variant string, as well as `dark:border-[color:var(--border-l2)]` and `dark:bg-[color:var(--surface-l2)]` from `muted`.

- [x] **Step 3: Harmonize active tab classes**
  In `src/components/sections/PacketSection.tsx` (L1324), replace hardcoded `bg-violet-600` with `bg-[color:var(--networking-tone)]`.
  In `src/components/sections/CheatSheetSection.tsx` (L488, L498, L508), replace hardcoded `bg-lime-500` with `bg-[color:var(--networking-tone)] text-slate-950 font-bold`.
  In `src/components/sections/SecuritySection.tsx` (L622, L728), harmonize VPN/VXLAN card wrappers to Level 2 surfaces with `hover:border-violet-400`.
  In `src/components/sections/WirelessSection.tsx` (L366), harmonize inactive SSID cards to Level 1 surface with `hover:border-amber-400`.

- [x] **Step 4: Run focused tests**
  Execute `npx vitest run src/app/networking/page.test.tsx` to ensure all 8 page tests pass.
---

### Task 2: Add Component & Stage Signal Assertions to Unit Tests

**Files:**
- Modify: `src/app/networking/page.test.tsx`

**Interfaces:**
- Consumes static rendered HTML of `NetworkingPage`.
- Asserts that rendered output contains proper telemetry stage signals and semantic tokens.

- [x] **Step 1: Add stage progress indicator assertion**
  Verify that `NetworkingSubsection` renders the 4-bar telemetry progress indicators and stage glyphs (`⬡`, `◈`, `⌁`, `✓`) for each stage.

- [x] **Step 2: Add semantic token presence assertions**
  Assert that `.networking-module` wrappers no longer contain legacy hardcoded `hover:border-indigo-300` and instead utilize semantic border tokens.

- [x] **Step 3: Run Vitest and confirm all tests pass**
  Execute `npx vitest run src/app/networking/page.test.tsx` and confirm `8 / 8 passed`.
---

### Task 3: Full Validation Suite and Final Verification

**Files:**
- Read: all modified files

- [x] **Step 1: Run full unit test suite**
  `npm test` (all 20 test files, 101 / 101 passed).

- [x] **Step 2: Run TypeScript typechecker**
  `npm run typecheck` (`tsc --noEmit`, 0 errors).

- [x] **Step 3: Run ESLint**
  `npm run lint` (0 errors, 0 warnings).

- [x] **Step 4: Run Next.js production build**
  `npm run build` (all static routes prerendered).

- [x] **Step 5: Visual and theme smoke check**
  Verify via headless browser:
  - 1440px desktop & 390px mobile viewports.
  - Zero horizontal overflow.
  - Light mode (`#f8fafc` / `#ffffff`) & dark mode (`#070b14` / `#0d1527` / `#080d1a`) surface contrast.
  - 0 console errors, 0 page errors.
