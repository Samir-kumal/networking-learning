# Networking Module Visual System Design

**Date:** 2026-08-14
**Status:** Approved

## Goal

Migrate all 23 Networking track modules to a shared visual system for module shells, cards, worked examples, interactive panels, metrics, code/CLI surfaces, and tables while preserving every existing module ID, curriculum order, content contract, and interactive behavior.

## Context

The Networking route now has a Network Operations Console hero and four stage-level shells, but the 23 module components remain independently styled. They repeat near-identical white/slate cards, indigo labels, borders, shadows, example wrappers, table treatments, and code panels. The result is visually inconsistent density and hierarchy inside the otherwise unified route.

The modules are standalone React components under `src/components/sections/`. Several are large client components containing calculators, packet inspectors, terminal sandboxes, tabs, selectors, checklists, and simulators. The redesign must change presentation without rewriting those stateful internals.

## Approved visual direction

Use the Network Operations Console language already established by the route hero and stage map:

- Ink `#08111F`: console surfaces and terminal/example headers.
- Panel `#102235`: nested dark panels and packet-style callouts.
- Cyan `#67E8F9`: active controls, links, and network-path emphasis.
- Lime `#BEF264`: healthy, usable, and successful result states.
- Amber `#FBBF24`: warnings, assumptions, and capacity signals.
- Slate `#E2E8F0`: light-mode borders, table rules, and quiet surfaces.
- Stage accents remain cyan Foundations, amber Applied, violet Operations, and lime Evaluation.

The visual signature is a compact monospace `SIGNAL /` label above worked examples and interactive panels. It describes the content role rather than adding decorative numbering.

## Design

### Module shell

Every module keeps its existing anchor and receives a shared shell with:

- A stage-colored top rule.
- Compact monospace module metadata and anchor label.
- A consistent title and description hierarchy.
- Clear separation between orientation and interactive content.
- One restrained elevation treatment rather than repeated shadows.
- Stage tone inherited from the surrounding `NetworkingSubsection` through a `data-tone` attribute.

The shell must retain the existing module IDs exactly: `basics`, `binary`, `cidr`, `calculator`, `create`, `vlsm`, `supernetting`, `vlans`, `dhcp`, `ipv6`, `ips`, `cloud`, `wireless`, `packets`, `routing`, `firewall`, `security`, `diagnostics`, `troubleshooting`, `containers`, `practice`, `cheatsheet`, and `quiz`.

### Shared primitives

Add a focused `src/components/networking/` primitive layer:

- `NetworkingModuleHeader` — renders the common module eyebrow, title, description, stage signal, and optional utility metadata.
- `NetworkingPanel` — renders a shared surface with `default`, `console`, and `muted` variants. It accepts children and an optional accent tone; it owns surface, border, radius, padding, and focus-safe transition classes.
- `NetworkingExample` — frames worked examples with the `SIGNAL / WORKED EXAMPLE` label, context line, content slot, and optional result footer.
- `NetworkingMetric` — renders a value, short label, and interpretation for calculator, capacity, quiz, and summary outputs.
- Shared table styling utilities/classes — standardizes table headers, row separators, hover states, numeric alignment, and intentional horizontal scrolling.

The primitives remain presentational. They must not own simulator state, calculations, generated output, URL navigation, or module-specific content.

### Content treatments

- Explanatory cards use a quiet surface, one accent marker, consistent title/body/footer rhythm, and restrained hover elevation.
- Worked examples use a clear example label, dark or muted example header, monospaced values, and explicit input → decision → result grouping.
- Interactive panels use a stronger boundary and one visually dominant primary action while preserving all existing controls.
- Code and CLI output use a dark terminal surface, readable prompt/header, and cyan/lime/amber status colors.
- Result cards use a large value, concise label, and one-line interpretation instead of equal visual weight for every field.
- Composite visualizations remain structurally intact when wrapping would add risk; their outer surface is migrated to `NetworkingPanel`.

## Migration architecture

1. Add `data-tone={tone}` to each existing `NetworkingSubsection`.
2. Create the shared networking primitives in `src/components/networking/`.
3. Migrate all 23 module roots to `NetworkingModuleHeader` without changing IDs, heading copy, or child order.
4. Migrate major repeated surfaces in every module to `NetworkingPanel`, `NetworkingExample`, and `NetworkingMetric` where the content shape matches.
5. Apply the shared table/code/terminal treatment to existing markup that cannot safely be replaced by a primitive.
6. Leave state hooks, event handlers, calculations, generated output, and simulator DOM behavior unchanged except for presentational wrappers and classes.
7. Keep all existing sidebar anchors, stage order, dark-mode behavior, and route-level navigation unchanged.

## Verification

### Automated coverage

- Preserve the existing Networking page tests for all 23 IDs, sidebar alignment, uniqueness, and prerequisite order.
- Add deterministic SSR coverage that renders all 23 module roots through `NetworkingPage` and confirms each shared module header marker is present.
- Add focused primitive tests for `NetworkingPanel` variants, `NetworkingExample`, and `NetworkingMetric` output.
- Run the full Vitest suite, TypeScript check, ESLint, and production build after migration.

### Browser coverage

At desktop and narrow mobile widths:

- Open `/networking` and verify each stage contains its expected module sequence.
- Visit at least one module from each stage and confirm its anchor lands correctly.
- Exercise representative cards/examples from Foundations, Applied, Operations, and Evaluation.
- Exercise the subnet calculator, CIDR controls, packet inspector, CLI sandbox, and quiz/practice flow without changed behavior.
- Verify tables and code blocks scroll intentionally on narrow screens without page-level horizontal overflow.
- Toggle dark mode and inspect module shells, cards, examples, tables, terminals, and result cards.
- Tab through shared links/buttons and confirm visible focus; verify reduced motion does not introduce required animation.

## Acceptance criteria

- All 23 module IDs render exactly once and remain reachable from the sidebar.
- All 23 module roots use the shared header treatment and stage tone.
- Major cards, worked examples, interactive panels, code/CLI surfaces, metrics, and tables use the shared visual system.
- Existing module copy, state transitions, calculations, generated output, controls, and route navigation remain functionally unchanged.
- Desktop and mobile layouts remain readable with no unintended horizontal overflow.
- Light mode and dark mode maintain readable contrast across all shared surfaces.
- Keyboard focus remains visible and existing accessibility labels remain intact.
- Focused tests, full tests, typecheck, lint, build, and browser smoke checks pass.

## Non-goals

- Do not rewrite instructional copy or fact-check content as part of this visual migration.
- Do not change networking calculations, simulator logic, generated configuration/output, or interaction models.
- Do not redesign the global sidebar, AppShell, home route, or non-networking tracks.
- Do not add a dependency or introduce a separate styling framework.
