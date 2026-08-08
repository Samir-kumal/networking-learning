# Docker & Kubernetes Dark-Mode Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all 15 Docker & Kubernetes modules respond correctly to the existing light/dark theme, matching the Networking track without changing behavior.

**Architecture:** Keep the current document-level `.dark` theme and add explicit Tailwind `dark:` variants directly to Docker track class strings. Preserve existing accent colors, intentionally dark code/terminal surfaces, local Observability simulator state, and all component logic.

**Tech Stack:** Next.js 16.3, React 19, TypeScript, Tailwind CSS v4, Vitest, browser smoke testing.

## Global Constraints

- Configure Tailwind's `dark:` variant to follow the application's `.dark` root class.
- Use explicit `dark:` variants following the established Networking components.
- Do not change `ThemeToggle`, global theme tokens, routing, module data, or interactive logic.
- Preserve light-mode appearance and existing accent/status semantics.
- Keep intentionally dark terminal, log, and console panels dark in both themes.
- Do not add tests that assert source class strings; verify the observable UI in both themes.
- Do not run formatters, linters, or project-wide test suites during individual edit tasks; run validation once at the end.

---

### Task 1: Inventory Docker surfaces and establish the browser baseline

**Files:**
- Read: `src/components/tracks/DockerK8sSection.tsx`
- Read: `src/components/tracks/DkSecurityScanSection.tsx`
- Read: `src/components/tracks/DkResourceQuotasSection.tsx`
- Read: `src/components/tracks/DkNetworkPolicySection.tsx`
- Read: `src/components/tracks/DkIngressServiceMeshSection.tsx`
- Read: `src/components/tracks/DkPersistentVolumesSection.tsx`
- Read: `src/components/tracks/DkImageRegistrySection.tsx`
- Read: `src/components/tracks/DkRbacSecuritySection.tsx`
- Read: `src/components/tracks/DkHpaVpaSection.tsx`
- Read: `src/components/tracks/DkTroubleshootingSection.tsx`
- Read: `src/components/tracks/DkObservabilitySection.tsx`

**Interfaces:**
- Consumes: Existing class strings and the current document theme behavior.
- Produces: A concrete list of light-only surfaces and controls to update; no source changes.

- [ ] **Step 1: Record the module boundaries and existing intentional dark panels**

  Confirm the five modules inside `DockerK8sSection.tsx` and the ten imported `Dk*.tsx` modules. Mark terminal/log/console class strings and Observability’s local `dark` state as exclusions from global-theme conversion.

- [ ] **Step 2: Capture browser baseline**

  Open `/docker-k8s` in light mode, set the document root to dark, and record representative computed styles for the first module card, a mid-page module card, a form control, a code panel, and the final Observability card. The dark baseline must show white Docker cards against the dark shell, proving the bug before edits.

---

### Task 2: Add dark variants to the primary Docker track modules

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/tracks/DockerK8sSection.tsx`

**Interfaces:**
- Consumes: Existing document-level `.dark` class, Dockerfile builder, Compose generator, Kubernetes architecture, Helm, and ArgoCD JSX and state handlers.
- Produces: A class-based Tailwind dark variant plus dark-aware styling for modules 1–5 with unchanged JSX behavior, state, generated output, and event handlers.

- [ ] **Step 1: Wire the app theme to Tailwind's dark variant**

  Add `@custom-variant dark (&:where(.dark, .dark *));` immediately after the Tailwind import in `src/app/globals.css`. This makes the existing ThemeToggle root class control `dark:` utilities instead of relying on the OS media preference.

- [ ] **Step 2: Update primary module surfaces**

  Add `dark:bg-slate-800` to white module cards and use `dark:bg-slate-700` or the matching nested slate surface for inner panels. Add `dark:border-slate-700`/`dark:border-slate-600` to neutral borders without changing colored hero borders.

- [ ] **Step 3: Update text hierarchy**

  Add `dark:text-slate-100` to headings and primary values, `dark:text-slate-400` to supporting copy and labels, and `dark:text-slate-300` where secondary values need stronger contrast. Add dark-readable variants to neutral status and diff text while preserving emerald/rose/indigo semantics.

- [ ] **Step 4: Update controls and generated code panels**

  Add dark backgrounds, borders, text, placeholder colors, and focus-safe variants to inputs, selects, toggles, tabs, and unselected buttons. Keep Dockerfile/YAML/terminal code surfaces intentionally dark and update their headers/borders only where they remain light.

- [ ] **Step 5: Confirm only styling changed in these files**

  Review the diff for no changes to state declarations, callbacks, data constants, generated output, rendered text, or the existing theme-toggle component.


---

### Task 3: Add dark variants to security, quota, and network-policy modules

**Files:**
- Modify: `src/components/tracks/DkSecurityScanSection.tsx`
- Modify: `src/components/tracks/DkResourceQuotasSection.tsx`
- Modify: `src/components/tracks/DkNetworkPolicySection.tsx`

**Interfaces:**
- Consumes: Existing scan simulator, quota builder, network-policy builder, and their state transitions.
- Produces: Dark-aware styling for modules 6–8 with unchanged simulation and form behavior.

- [ ] **Step 1: Convert neutral module and nested panel surfaces**

  Pair `bg-white` with `dark:bg-slate-800`, `bg-slate-50` with `dark:bg-slate-700` or a matching translucent variant, and neutral borders with `dark:border-slate-700`/`dark:border-slate-600`.

- [ ] **Step 2: Convert labels, values, and status chips**

  Pair slate text classes with the Networking hierarchy (`900→100`, `700/800→200`, `600→300`, `500→400`, `400→500`). Preserve Trivy severity colors and selected network-policy accent states while adding dark-safe unselected states.

- [ ] **Step 3: Convert all form controls**

  Update inputs, selects, checkboxes, toggles, rule rows, quota sliders, and buttons with dark surfaces, readable text, borders, placeholders, and focus states. Do not change values, handlers, or simulator output.

- [ ] **Step 4: Preserve the Trivy console surface**

  Leave the existing `bg-slate-950` scan console dark in light and dark themes; update only its surrounding card and neutral metadata where necessary.

---

### Task 4: Add dark variants to ingress, storage, and registry modules

**Files:**
- Modify: `src/components/tracks/DkIngressServiceMeshSection.tsx`
- Modify: `src/components/tracks/DkPersistentVolumesSection.tsx`
- Modify: `src/components/tracks/DkImageRegistrySection.tsx`

**Interfaces:**
- Consumes: Existing ingress comparison, storage lifecycle simulator, and image-tag strategy selector.
- Produces: Dark-aware styling for modules 9–11 with unchanged tab, lifecycle, copy, and selection behavior.

- [ ] **Step 1: Convert cards, comparison rows, and lifecycle panels**

  Add dark surface and border variants to module cards, comparison rows, result tiles, event logs, strategy details, and registry tag cards. Keep gradient hero banners and semantic colored status badges intact.

- [ ] **Step 2: Convert text and neutral progress elements**

  Apply dark-aware heading, label, metadata, code-header, and body text. Add dark variants to neutral bars, tabs, unselected buttons, and code panel wrappers so they do not remain white-on-dark or low contrast.

- [ ] **Step 3: Convert storage and registry controls**

  Update inputs, buttons, tabs, and selected/unselected strategy states with the established dark surfaces and text hierarchy. Preserve lifecycle state colors and generated examples.

- [ ] **Step 4: Confirm light-mode parity**

  Check that no light class was removed or replaced in a way that changes the existing light screenshot; dark variants must be additive except where a neutral class must be paired with its dark counterpart.

---

### Task 5: Add dark variants to RBAC, autoscaling, troubleshooting, and observability modules

**Files:**
- Modify: `src/components/tracks/DkRbacSecuritySection.tsx`
- Modify: `src/components/tracks/DkHpaVpaSection.tsx`
- Modify: `src/components/tracks/DkTroubleshootingSection.tsx`
- Modify: `src/components/tracks/DkObservabilitySection.tsx`

**Interfaces:**
- Consumes: Existing RBAC builder, autoscaling controls, troubleshooting simulator, and Observability dashboard simulator.
- Produces: Dark-aware styling for modules 12–15 while preserving the local Observability light/dark simulator toggle.

- [ ] **Step 1: Convert primary and nested surfaces**

  Pair all neutral white/slate surfaces and borders with dark slate equivalents across role forms, quota/result cards, troubleshooting phases, dashboard panels, trace/log views, and alert configuration panels.

- [ ] **Step 2: Convert form and selection states**

  Update role inputs, selects, checkboxes, autoscaling sliders, scenario buttons, dashboard tabs, log filters, and alert controls with dark backgrounds, borders, readable text, placeholders, and focus states. Preserve selected accent colors and status semantics.

- [ ] **Step 3: Keep intentionally dark and locally themed surfaces correct**

  Do not override terminal/log panels that are deliberately dark. Keep Observability’s component-level `dark` boolean and its conditional chart/log colors independent from the document-level `.dark` class; only update the surrounding neutral application surfaces.

- [ ] **Step 4: Confirm no behavior changes**

  Review the diff for styling-only edits. State setters, effect dependencies, simulator calculations, chart data, and event handlers must remain unchanged.

---

### Task 6: Run automated validation and browser smoke verification

**Files:**
- Test: Existing Vitest suite and production build; no new test file required because the contract is visual and already exercised by existing module tests.

**Interfaces:**
- Consumes: Dark-aware Docker components from Tasks 2–5.
- Produces: Evidence that the page builds, existing behavior tests pass, and both theme states are readable end to end.

- [ ] **Step 1: Run focused existing Docker component tests**

  Run:

  ```bash
  npm test -- --run src/components/tracks/DkNetworkPolicySection.test.tsx src/components/tracks/DkRbacSecuritySection.test.tsx src/components/tracks/DkObservabilitySection.test.tsx src/components/tracks/DkIngressServiceMeshSection.test.tsx
  ```

  Expected: all selected tests pass with no behavior regressions.

- [ ] **Step 2: Run the complete test suite**

  Run:

  ```bash
  npm test
  ```

  Expected: Vitest completes successfully.

- [ ] **Step 3: Run the production build**

  Run:

  ```bash
  npm run build
  ```

  Expected: Next.js completes the production build without TypeScript or CSS compilation errors.

- [ ] **Step 4: Exercise the Docker page in light mode**

  Open `/docker-k8s`, confirm the theme is light, and inspect the first module, a middle module, and the final Observability module. Exercise one selector, one toggle/button, and one input. Expected: existing light appearance and interactions remain functional.

- [ ] **Step 5: Exercise the Docker page in dark mode**

  Toggle the document theme to dark and repeat the same checkpoints. Expected: primary cards and nested surfaces are slate-dark, text and borders remain readable, controls are dark-aware, code/terminal panels remain intentional, and no light-only white cards remain at the sampled checkpoints.

- [ ] **Step 6: Check persistence and console output**

  Reload once in dark mode and confirm the preference remains dark. Exercise a Docker interaction and inspect the browser console. Expected: the theme remains dark and no new runtime errors appear.

- [ ] **Step 7: Commit the implementation**

  ```bash
  git add src/components/tracks/DockerK8sSection.tsx src/components/tracks/DkSecurityScanSection.tsx src/components/tracks/DkResourceQuotasSection.tsx src/components/tracks/DkNetworkPolicySection.tsx src/components/tracks/DkIngressServiceMeshSection.tsx src/components/tracks/DkPersistentVolumesSection.tsx src/components/tracks/DkImageRegistrySection.tsx src/components/tracks/DkRbacSecuritySection.tsx src/components/tracks/DkHpaVpaSection.tsx src/components/tracks/DkTroubleshootingSection.tsx src/components/tracks/DkObservabilitySection.tsx
  git commit -m "fix(docker): add dark-mode parity"
  ```
