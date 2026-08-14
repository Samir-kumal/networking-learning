# Networking Operations Console Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the `/networking` route as a network-operations learning console with a distinctive packet-flow hero, visible curriculum map, and clearer stage boundaries while preserving every existing module, anchor, and interaction.

**Architecture:** Keep the existing `Hero` and `NetworkingSubsection` boundaries, but redesign their presentation in place. The route page owns the four-stage curriculum map and continues to render the same module components in the same prerequisite order. Use static Tailwind classes and existing global utilities; do not add dependencies or alter simulator logic.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript, Tailwind CSS 4, Vitest, SSR markup tests, browser smoke verification.

**Spec:** Approved in chat on 2026-08-14 as visual direction 1, “Network Operations Console”.

## Global Constraints

- Preserve all 23 networking module IDs, sidebar metadata, module order, and existing interactive behavior.
- Preserve the existing dark-mode toggle and both light/dark readability.
- Use the established engineering-lab visual language: dark navy telemetry surfaces, cyan packet accents, lime health signals, amber operational accents, and monospace metadata.
- Keep keyboard focus visible, use semantic navigation landmarks, and respect `prefers-reduced-motion` through existing global rules.
- Do not add dependencies, change curriculum copy beyond the new route orientation copy, or edit the large module implementations.
- Skip formatters, linters, and project-wide validation during implementation tasks; run validation once after integration.

---

### Task 1: Add failing route-orientation coverage

**Files:**
- Modify: `src/app/networking/page.test.tsx`
- Read: `src/app/networking/page.tsx`, `src/components/Hero.tsx`, `src/components/NetworkingSubsection.tsx`

**Interfaces:**
- Consumes the existing `NetworkingPage` server-rendered markup.
- Produces deterministic SSR assertions for the new route-level orientation contract without asserting Tailwind class strings.

- [ ] **Step 1: Write the failing tests**

Add tests that assert the rendered networking page contains:

```tsx
expect(html).toContain("Read the path a packet takes.");
expect(html).toContain('aria-label="Networking curriculum"');
expect(html).toContain('href="#foundations"');
expect(html).toContain('href="#tools"');
expect(html).toContain('href="#advanced"');
expect(html).toContain('href="#evaluation"');
```

Add a second assertion that each stage remains represented exactly once by checking the existing group IDs and the new stage-navigation links. Keep all existing module-anchor and prerequisite-order assertions unchanged.

- [ ] **Step 2: Run the focused test and verify it fails**

Run `npm test -- src/app/networking/page.test.tsx`. Expected: failure because the current hero does not render the new headline or curriculum navigation landmark.

---

### Task 2: Build the network-operations hero

**Files:**
- Modify: `src/components/Hero.tsx`

**Interfaces:**
- Consumes no props and remains the default export used only by `src/app/networking/page.tsx`.
- Produces a semantic `<section>` with the new route thesis, an accessible primary anchor to `#basics`, and a static packet-path visual.

- [ ] **Step 1: Replace the centered marketing hero with the operations-console layout**

Use a dark navy surface with `bg-signal-grid`, restrained radial glows, a monospace eyebrow such as `NETWORKING LAB / PACKET PATH`, and the headline `Read the path a packet takes.`. Keep the body copy focused on learning outcomes: addressing, forwarding, policy, and diagnosis.

Build a responsive two-column layout on larger screens:

- Left: eyebrow, headline, supporting paragraph, `Start with foundations` anchor to `#basics`, and compact tags for `IPv4`, `CIDR`, `Routing`, `Wi-Fi`, and `Containers`.
- Right: a labeled `Packet path` panel containing four static nodes (`CLIENT`, `SUBNET`, `ROUTER`, `SERVICE`) connected by visible arrows or rules, plus a small `ONLINE / 23 LABS` status line.
- Below the hero content: three compact stat cells for `23` labs, `4` stages, and `1` prerequisite path.

Use cyan for the primary action and packet path, lime for the online state, and slate/navy for supporting surfaces. Add `aria-hidden="true"` to decorative SVGs and retain a visible focus ring via existing `:focus-visible` rules.

- [ ] **Step 2: Run the focused route test**

Run `npm test -- src/app/networking/page.test.tsx`. Expected: the hero headline assertion passes; curriculum navigation assertions remain failing until Task 3.

---

### Task 3: Add the visible curriculum map and page frame

**Files:**
- Modify: `src/app/networking/page.tsx`

**Interfaces:**
- Consumes the existing four `NetworkingSubsection` groups and module components.
- Produces a route-level `nav aria-label="Networking curriculum"` with four anchor cards that target the unchanged group IDs.

- [ ] **Step 1: Replace the duplicate page header with the hero-led frame**

Remove the old standalone page `<header>` so the route has one primary heading. Keep the existing `Hero` call first. Wrap the curriculum content in the existing centered max-width container with a subtle light/dark page surface and `overflow-x-hidden`.

- [ ] **Step 2: Add the stage map after the hero**

Add a section with a small monospace label such as `LEARNING PATH / 04 STAGES`, a heading like `Move from address space to traffic decisions`, and a short explanatory sentence. Inside it, add:

```tsx
<nav aria-label="Networking curriculum" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
```

Render four `<a>` elements targeting `#foundations`, `#tools`, `#advanced`, and `#evaluation`. Each card must include its existing label, title, module count, and a plain-language stage descriptor. Use static per-stage accent classes: cyan for Foundations, amber for Applied, violet for Operations, and lime for Evaluation. Ensure links have meaningful focus and hover states without relying on hover-only meaning.

- [ ] **Step 3: Preserve the four module group boundaries and order**

Keep the current child component order exactly as-is. Pass the same IDs, labels, titles, descriptions, and module counts into the shared shell, adding only a new `tone` prop for the visual accent.

- [ ] **Step 4: Run the focused route test**

Run `npm test -- src/app/networking/page.test.tsx`. Expected: all networking route tests pass.

---

### Task 4: Refine shared subsection framing

**Files:**
- Modify: `src/components/NetworkingSubsection.tsx`

**Interfaces:**
- Consumes existing subsection props plus a required `tone` union: `"cyan" | "amber" | "violet" | "lime"`.
- Produces the same section IDs and heading IDs, with a more legible stage header that communicates sequence, module count, and accent.

- [ ] **Step 1: Add tone-to-class mappings**

Define a local static map from each tone to its top rule, badge, border, marker, and progress colors. Keep all class names literal so Tailwind CSS 4 can detect them.

- [ ] **Step 2: Replace the generic indigo header treatment**

Keep the existing semantic `<section id={id} aria-labelledby={headingId}>`. Redesign the header as a quiet light/slate panel with a vertical stage marker, the existing label, a compact module-count status, the existing heading and description, and a thin accent rule. Add an `aria-label`-neutral visual progression cue such as a small `STAGE` caption and a short progress bar; do not claim completion state that the application does not track.

Keep child module spacing and all children untouched. Ensure the stage header remains readable in dark mode and does not introduce a second top-level heading.

- [ ] **Step 3: Run the focused route test**

Run `npm test -- src/app/networking/page.test.tsx`. Expected: all assertions pass with unchanged module anchor counts and ordering.

---

### Task 5: Validate the redesigned route end to end

**Files:**
- Read: `src/app/networking/page.tsx`, `src/components/Hero.tsx`, `src/components/NetworkingSubsection.tsx`, `src/app/networking/page.test.tsx`

- [ ] **Step 1: Run the complete test suite**

Run `npm test`. Expected: all tests pass with zero failures.

- [ ] **Step 2: Run typecheck, lint, and production build**

Run `npm run typecheck`, `npm run lint`, and `npm run build`. Expected: all commands complete successfully.

- [ ] **Step 3: Browser-smoke the desktop route**

Open `/networking` at a desktop viewport. Confirm the dark operations-console hero, packet-path panel, three stat cells, and four-card curriculum map are visible without horizontal overflow. Click `Start with foundations` and confirm the `#basics` anchor lands on the first module.

- [ ] **Step 4: Browser-smoke responsive and theme states**

Check a narrow mobile viewport: hero columns stack, curriculum cards remain readable, and no horizontal overflow appears. Toggle dark mode and confirm hero, stage map, subsection headers, and first module remain legible. Verify focus visibly moves to the stage links and primary CTA when tabbing.

- [ ] **Step 5: Review scope and output**

Confirm the final diff is limited to the approved networking route orientation, hero, shared subsection shell, focused route tests, and this plan. Confirm no module calculations, simulator state, navigation IDs, sidebar metadata, or unrelated `.claude/` files changed.
