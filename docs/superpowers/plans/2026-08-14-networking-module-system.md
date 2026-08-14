# Networking Module Shared Visual System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all 23 Networking modules to shared shells, cards, examples, metrics, code/CLI panels, and table treatments without changing curriculum or simulator behavior.

**Architecture:** Add presentational primitives under `src/components/networking/`, use `data-tone` on existing `NetworkingSubsection` ancestors to inherit stage accents, and migrate module roots plus major repeated surfaces in small batches. Composite simulators retain their existing DOM/state logic and receive shared outer surfaces or class utilities only.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript 5, Tailwind CSS 4, Vitest 4, existing browser smoke workflow.

**Spec:** `docs/superpowers/specs/2026-08-14-networking-module-system-design.md`

## Global Constraints

- Preserve every existing module ID exactly: `basics`, `binary`, `cidr`, `calculator`, `create`, `vlsm`, `supernetting`, `vlans`, `dhcp`, `ipv6`, `ips`, `cloud`, `wireless`, `packets`, `routing`, `firewall`, `security`, `diagnostics`, `troubleshooting`, `containers`, `practice`, `cheatsheet`, and `quiz`.
- Preserve existing module copy, state transitions, calculations, generated output, controls, and route navigation.
- Do not rewrite instructional copy or fact-check content as part of this visual migration.
- Do not change networking calculations, simulator logic, generated configuration/output, or interaction models.
- Do not redesign the global sidebar, AppShell, home route, or non-networking tracks.
- Do not add a dependency or introduce a separate styling framework.
- Use Ink `#08111F`, Panel `#102235`, Cyan `#67E8F9`, Lime `#BEF264`, Amber `#FBBF24`, Slate `#E2E8F0`, and existing stage accents.
- Skip formatters, linters, and project-wide validation inside migration tasks; run focused tests after each primitive batch and full validation only in the final task.

---

### Task 1: Create presentational networking primitives

**Files:**
- Create: `src/components/networking/NetworkingTypes.ts`
- Create: `src/components/networking/NetworkingModuleHeader.tsx`
- Create: `src/components/networking/NetworkingPanel.tsx`
- Create: `src/components/networking/NetworkingExample.tsx`
- Create: `src/components/networking/NetworkingMetric.tsx`
- Create: `src/components/networking/NetworkingTable.tsx`
- Create: `src/components/networking/networking.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**

`NetworkingTypes.ts` exports:

```ts
export type NetworkingTone = "cyan" | "amber" | "violet" | "lime";
export type NetworkingPanelVariant = "default" | "console" | "muted";
```

`NetworkingModuleHeader` accepts:

```ts
interface NetworkingModuleHeaderProps {
  anchor: string;
  icon: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  meta?: React.ReactNode;
}
```

It renders a `data-networking-header` root, the anchor label, title, description, and optional metadata. It does not render a module ID or own state.

`NetworkingPanel` accepts:

```ts
interface NetworkingPanelProps {
  variant?: NetworkingPanelVariant;
  className?: string;
  children: React.ReactNode;
}
```

It renders a `data-networking-panel` surface with literal classes for `default`, `console`, and `muted` variants. It must not add headings, links, or event handlers.

`NetworkingExample` accepts:

```ts
interface NetworkingExampleProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  tone?: NetworkingTone;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}
```

It renders a `data-networking-example` surface with the `SIGNAL / WORKED EXAMPLE` eyebrow, title, optional description, children, and optional footer.

`NetworkingMetric` accepts:

```ts
interface NetworkingMetricProps {
  label: React.ReactNode;
  value: React.ReactNode;
  detail?: React.ReactNode;
  tone?: NetworkingTone;
  className?: string;
}
```

It renders a `data-networking-metric` value card with label, value, and optional interpretation.

`NetworkingTable` accepts:

```ts
interface NetworkingTableProps {
  className?: string;
  children: React.ReactNode;
}
```

It renders an overflow-safe wrapper with a `networking-table` class and leaves table rows/data supplied by callers unchanged.

- [ ] **Step 1: Write failing primitive contract tests**

In `networking.test.tsx`, render each primitive with representative content and assert:

```tsx
expect(renderToStaticMarkup(<NetworkingPanel variant="console">Console</NetworkingPanel>))
  .toContain('data-networking-panel="console"');
expect(renderToStaticMarkup(
  <NetworkingExample title="Worked Example">Example body</NetworkingExample>
)).toContain("SIGNAL / WORKED EXAMPLE");
expect(renderToStaticMarkup(
  <NetworkingMetric label="Usable hosts" value="254" detail="/24" />
)).toContain('data-networking-metric="true"');
```

Assert all three panel variants render, an example footer is preserved, and a table wrapper preserves its child table markup. Keep these assertions behavioral/semantic; do not assert complete Tailwind class strings.

- [ ] **Step 2: Run focused tests and verify they fail**

Run `npm test -- src/components/networking/networking.test.tsx`. Expected: module-not-found failures because the primitives do not exist yet.

- [ ] **Step 3: Implement the shared primitive contracts**

Implement the exact interfaces above. Use literal Tailwind class maps keyed by `NetworkingTone` and `NetworkingPanelVariant` so Tailwind CSS 4 can detect every class. Derive accent colors from the nearest `[data-tone]` ancestor through CSS variables rather than adding state or context. Add `data-tone` variables and `.networking-table` rules in `globals.css`; keep global selectors scoped to networking utility classes.

- [ ] **Step 4: Run focused primitive tests**

Run `npm test -- src/components/networking/networking.test.tsx`. Expected: all primitive tests pass. Do not run the full suite in this task.

---

### Task 2: Propagate stage tone and migrate all module roots

**Files:**
- Modify: `src/components/NetworkingSubsection.tsx`
- Modify: `src/components/sections/BasicsSection.tsx`
- Modify: `src/components/sections/BinarySection.tsx`
- Modify: `src/components/sections/CidrSection.tsx`
- Modify: `src/components/sections/SubnetCalculator.tsx`
- Modify: `src/components/sections/CreateSubnetSection.tsx`
- Modify: `src/components/sections/VlsmSection.tsx`
- Modify: `src/components/sections/SupernetSection.tsx`
- Modify: `src/components/sections/VlanSection.tsx`
- Modify: `src/components/sections/DhcpSection.tsx`
- Modify: `src/components/sections/Ipv6Section.tsx`
- Modify: `src/components/sections/NatSection.tsx`
- Modify: `src/components/sections/CloudSubnetSection.tsx`
- Modify: `src/components/sections/WirelessSection.tsx`
- Modify: `src/components/sections/PacketSection.tsx`
- Modify: `src/components/sections/RoutingSection.tsx`
- Modify: `src/components/sections/FirewallSection.tsx`
- Modify: `src/components/sections/SecuritySection.tsx`
- Modify: `src/components/sections/DiagnosticsSection.tsx`
- Modify: `src/components/sections/TroubleshootingSection.tsx`
- Modify: `src/components/sections/ContainerSection.tsx`
- Modify: `src/components/sections/PracticeSection.tsx`
- Modify: `src/components/sections/CheatSheetSection.tsx`
- Modify: `src/components/sections/QuizSection.tsx`
- Test: `src/app/networking/page.test.tsx`

**Interfaces:**
- Consumes `NetworkingTone`, `NetworkingModuleHeader`, and the existing `NetworkingSubsection` `tone` prop.
- Produces all 23 module roots with `className="networking-module"`, preserved IDs, and exactly one `data-networking-header` marker each.

- [ ] **Step 1: Add a failing root/header coverage assertion**

Extend `src/app/networking/page.test.tsx` with:

```tsx
expect(html.match(/data-networking-header="true"/g)).toHaveLength(23);
expect(html.match(/class="networking-module[^"]*"/g)).toHaveLength(23);
```

Keep all existing ID, sidebar, uniqueness, and prerequisite-order tests unchanged. Run `npm test -- src/app/networking/page.test.tsx`; expected: failure because no module root has migrated.

- [ ] **Step 2: Add ancestor tone metadata**

In `NetworkingSubsection.tsx`, add `data-tone={tone}` to the existing group `<section>` while preserving its ID, heading ID, children, and current header behavior. Do not change stage labels, module counts, or content spacing in this task.

- [ ] **Step 3: Migrate each module root header**

For each of the 23 section files:

1. Add imports for `NetworkingModuleHeader` and `NetworkingTypes` as needed.
2. Keep the existing root `<section id="...">` and change its class list to include `networking-module` while retaining `scroll-mt-24`.
3. Replace only the duplicated root header/description block with `NetworkingModuleHeader`, preserving the existing anchor label, icon, title text, and description JSX exactly.
4. Wrap the remaining module body in a `networking-module-content` div when the body is not already isolated.
5. Do not change hooks, arrays, handlers, calculations, control labels, child IDs, or module order.

Use each module’s existing title/description content; do not invent alternate instructional copy. The final root IDs must remain exactly the 23 IDs listed in the global constraints.

- [ ] **Step 4: Run the focused route tests**

Run `npm test -- src/app/networking/page.test.tsx`. Expected: all existing route tests plus the 23-header assertion pass. Do not run the full suite in this task.

---

### Task 3: Migrate Foundations and Applied surfaces

**Files:**
- Modify: `src/components/sections/BasicsSection.tsx`
- Modify: `src/components/sections/BinarySection.tsx`
- Modify: `src/components/sections/CidrSection.tsx`
- Modify: `src/components/sections/SubnetCalculator.tsx`
- Modify: `src/components/sections/CreateSubnetSection.tsx`
- Modify: `src/components/sections/VlsmSection.tsx`
- Modify: `src/components/sections/SupernetSection.tsx`
- Modify: `src/components/sections/VlanSection.tsx`
- Modify: `src/components/sections/DhcpSection.tsx`
- Modify: `src/components/sections/Ipv6Section.tsx`
- Modify: `src/components/sections/NatSection.tsx`
- Modify: `src/components/sections/CloudSubnetSection.tsx`
- Modify: `src/components/sections/WirelessSection.tsx`

**Interfaces:**
- Consumes the primitives from Task 1 and the migrated module roots from Task 2.
- Produces consistent card/example/metric/interactive surfaces without changing state or content data.

- [ ] **Step 1: Migrate Foundations card and example surfaces**

Apply these exact treatments:

- `BasicsSection`: wrap the three benefits in `NetworkingPanel`/shared card classes; frame the 192.168.1.0/24 topology as `NetworkingExample`.
- `BinarySection`: use `NetworkingPanel` for the live converter, address anatomy, and bitwise block; use `NetworkingTable` for both reference tables.
- `CidrSection`: use `NetworkingPanel variant="muted"` for the controls, `NetworkingMetric` for the four result cards, and `NetworkingExample` for the formula block.
- `SubnetCalculator`: use `NetworkingPanel` for form/results, `NetworkingMetric` for output values, and `NetworkingTable` for quick reference.
- `CreateSubnetSection`: wrap each of the four workflow steps in the shared panel/card treatment and mark configuration/code blocks as `variant="console"`.
- `VlsmSection`: use shared cards for `/30`, `/27`, `/24`, `NetworkingExample` for the worked table, and `NetworkingPanel variant="console"` for the allocation tree.
- `SupernetSection`: apply the same shared card treatment to summary cards and `NetworkingExample` to the worked aggregation example.

- [ ] **Step 2: Migrate Applied card and example surfaces**

Apply these exact treatments:

- `VlanSection`: wrap VLAN cards and configuration examples with shared panels; retain all selection controls.
- `DhcpSection`: use console/example surfaces for DORA flow and relay forwarding, metric treatment for capacity outputs, and shared panels for configuration options.
- `Ipv6Section`: use shared panels for hextet anatomy and compression rules, `NetworkingTable` for comparison data, and a metric/example surface for the `/64` block.
- `NatSection`: use shared cards for public/private IP explanations and `NetworkingExample` for the NAT/PAT translation flow.
- `CloudSubnetSection`: use shared panel treatment for provider selection/output and `NetworkingMetric`/checklist surfaces for planning results.
- `WirelessSection`: wrap band/channel controls, signal visualizations, and planning/result cards in shared panels while leaving all sliders and selectors unchanged.

Use existing title/description and content data. Add only presentational wrappers, primitive props, `className`, and `data-*` markers.

- [ ] **Step 3: Run focused Foundations/Applied assertions**

Run `npm test -- src/app/networking/page.test.tsx src/components/networking/networking.test.tsx`. Expected: all route and primitive tests pass, with all 23 IDs still unique.

---

### Task 4: Migrate Operations surfaces

**Files:**
- Modify: `src/components/sections/PacketSection.tsx`
- Modify: `src/components/sections/RoutingSection.tsx`
- Modify: `src/components/sections/FirewallSection.tsx`
- Modify: `src/components/sections/SecuritySection.tsx`
- Modify: `src/components/sections/DiagnosticsSection.tsx`
- Modify: `src/components/sections/TroubleshootingSection.tsx`
- Modify: `src/components/sections/ContainerSection.tsx`

**Interfaces:**
- Consumes shared primitives and migrated root shells.
- Produces consistent Operations surfaces while preserving packet, routing, firewall, security, CLI, troubleshooting, and container simulator behavior.

- [ ] **Step 1: Migrate packet and routing surfaces**

- `PacketSection`: use `NetworkingPanel` for encapsulation banner, layer inspector, RFC bit grid, sequence diagram, and Wireshark window; use `NetworkingExample` for protocol examples; keep packet selection handlers unchanged.
- `RoutingSection`: use shared panel/example treatment for protocol deep dives, route selection, AD hierarchy, and route table examples; retain all protocol tab state and route calculations.

- [ ] **Step 2: Migrate policy and security surfaces**

- `FirewallSection`: use tone-aware explanatory cards for BLOCK/ALLOW/LOG, `NetworkingExample` for the worked ACL decision, and a nested `NetworkingPanel variant="console"` for Cisco ACL code; use a shared panel for best-practice guidance.
- `SecuritySection`: apply the same card and example treatment to control summaries, inspection outputs, and rule examples without changing stateful controls.

- [ ] **Step 3: Migrate diagnostics and operations simulators**

- `DiagnosticsSection`: keep the terminal buffer and command execution logic untouched; apply `variant="console"` to the terminal, shared cards to presets/workflow, and `NetworkingExample`/table treatment to the command cheat sheet.
- `TroubleshootingSection`: use shared cards for scenario selection and workflow matrix; use console/example treatment for command output and root-cause examples.
- `ContainerSection`: preserve all tabs and simulators; wrap Kubernetes, Docker networking, load-balancing, ingress, and service-routing surfaces with shared panels and metrics.

- [ ] **Step 4: Run focused Operations assertions**

Run `npm test -- src/app/networking/page.test.tsx src/components/networking/networking.test.tsx`. Expected: route anchors, primitive contracts, and SSR rendering pass. Do not run the full suite yet.

---

### Task 5: Migrate Evaluation surfaces and final shared styling

**Files:**
- Modify: `src/components/sections/PracticeSection.tsx`
- Modify: `src/components/sections/CheatSheetSection.tsx`
- Modify: `src/components/sections/QuizSection.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/networking/page.test.tsx`

**Interfaces:**
- Consumes all shared primitives and migrated module roots.
- Produces consistent practice, reference, and quiz cards plus final SSR coverage for all shared markers.

- [ ] **Step 1: Migrate Evaluation surfaces**

- `PracticeSection`: use shared scenario cards, metric/result cards, `NetworkingExample` for worked drill output, and `NetworkingTable` for reference data.
- `CheatSheetSection`: use shared cards for formula/reference entries, `NetworkingTable` for subnet data, and `NetworkingExample` for highlighted guidance blocks.
- `QuizSection`: use shared question/result panels and `NetworkingMetric` for score output; preserve answer state and reset behavior.

- [ ] **Step 2: Finish scoped table and surface utilities**

Add only networking-scoped CSS for `.networking-module`, `.networking-module-content`, `.networking-table`, `data-networking-*` markers, stage-tone variables, and reduced-motion-safe transitions. Ensure selectors do not alter non-networking routes or rely on broad element selectors that cancel utility classes.

- [ ] **Step 3: Strengthen SSR contract coverage**

Extend `src/app/networking/page.test.tsx` to assert:

```tsx
expect(html.match(/data-networking-header="true"/g)).toHaveLength(23);
expect(html).toContain('data-networking-example="true"');
expect(html).toContain('data-networking-metric="true"');
expect(html).toContain('class="networking-table"');
```

Keep all existing module ID/order/sidebar assertions unchanged.

- [ ] **Step 4: Run focused tests**

Run `npm test -- src/app/networking/page.test.tsx src/components/networking/networking.test.tsx`. Expected: all route and primitive tests pass.

---

### Task 6: Validate all behavior and visual states

**Files:**
- Read: all changed networking primitives, `src/components/NetworkingSubsection.tsx`, all 23 networking section files, `src/app/networking/page.test.tsx`, and `src/app/globals.css`

- [ ] **Step 1: Run the full test suite**

Run `npm test`. Expected: all existing and new tests pass with zero failures.

- [ ] **Step 2: Run repository checks**

Run `npm run typecheck`, `npm run lint`, and `npm run build`. Expected: typecheck/build complete successfully; lint has no new errors in changed files.

- [ ] **Step 3: Browser-smoke one module per stage**

Start the development server and open `/networking`. Verify one module from each stage: `#basics`, `#dhcp`, `#packets`, and `#quiz`. Confirm the shared header, stage accent, cards/examples, and anchors render correctly in each location.

- [ ] **Step 4: Browser-smoke the largest interactive surfaces**

Exercise the subnet calculator, CIDR controls, packet inspector, Diagnostics CLI sandbox, wireless controls, container tabs, and quiz/practice interactions. Confirm outputs and transitions remain unchanged from their existing behavior.

- [ ] **Step 5: Browser-smoke responsive, dark, focus, and overflow states**

At a narrow mobile viewport, verify no page-level horizontal overflow and intentional scrolling for tables/code blocks. Toggle dark mode and inspect module shells, cards, examples, terminals, tables, and metrics. Tab through shared links/buttons and confirm visible focus. Enable reduced motion in the browser emulation and confirm no required behavior depends on animation.

- [ ] **Step 6: Review final scope**

Confirm changed files are limited to `src/components/networking/`, `src/components/NetworkingSubsection.tsx`, `src/app/globals.css`, the 23 networking section components, networking tests, the approved spec, and this plan. Confirm `.claude/` and all non-networking routes remain untouched.
