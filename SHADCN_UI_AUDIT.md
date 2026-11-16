# shadcn/ui Component Architecture Audit

- **Project:** `networking-learning` (Next.js 16.3 App Router, React 19.2, Tailwind CSS v4)
- **Audit date:** 2026-11-15
- **Mode:** Read-only audit of source. The only file written is this report. No source, config or dependency files were changed.
- **Reference:** https://ui.shadcn.com/docs (component list fetched during the audit; see Section 5 for the Radix/Base UI caveat)

---

## A. Executive Summary

### Overall shadcn/ui adoption: **0%**

The project does not use shadcn/ui. It has none of the usual markers:

| Marker | Found? | Evidence |
|---|---|---|
| `components.json` | No | Not present at repo root |
| `src/components/ui/` directory with copied shadcn source | No | No such directory |
| `class-variance-authority` (cva), the usual shadcn variant helper | No | Not in `package.json` |
| `cn()` helper (clsx + tailwind-merge) | No | `clsx` and `tailwind-merge` are in `package.json`, but no file imports them |
| shadcn-style semantic tokens (`--background`, `--card`, `--ring`, `--radius`, ...) | No | `src/app/globals.css` defines `--bg-base`, `--surface-l1`, `--border-l1`, etc. The Tailwind `@theme inline` block maps only `--primary`, `--foreground`, `--border`, `--surface`, and a few others |
| Radix-based shadcn primitives | Partly, but not as shadcn | `@radix-ui/react-slider` is imported by one file (`src/components/ml/primitives/Slider.tsx`). `@radix-ui/react-dialog`, `react-progress` and `react-tabs` are installed and **never imported** |

The UI is hand-built with raw Tailwind utility strings and native HTML controls. It is consistent in *visual language* (slate neutrals, indigo accents, `card-shadow`, dark mode via a `.dark` class) but not in *implementation*. Each of the 73 files that contain a `<button>` writes its own button classes.

### Scope inspected

| Scope | Count |
|---|---|
| Source files under `src/` (`.ts` + `.tsx`) | 213 |
| `.tsx` files under `src/components/` | 145 (134 excluding `*.test.tsx`) |
| Route pages under `src/app/` | 10 |
| Named, reusable UI wrapper components | 18 (see Section B) |
| Native `<button>` elements | 444 across 73 files |
| Native `<input>` elements | 235 across 50 files |
| Native `<select>` elements | 100 across 31 files |
| Native `<input type="checkbox">` | 52 across 22 files |
| Native `<input type="range">` | 37 across 16 files |
| `<table>` elements | 45 across 31 files |

Counts are from `grep` over `.tsx` files, so they include a small number of test-file and comment matches. They are good for scale, not for exact accounting.

### Classification totals (distinct components, not instances)

| Classification | Count | Notes |
|---|---|---|
| A. Official shadcn/ui | **0** | None installed |
| B. Customized shadcn/ui | **0** | No shadcn source exists to customize |
| C. Custom duplicate | **9** named components, plus **7** control families used across the section/track files | Duplicate shadcn functionality (see Section C) |
| D. Custom business component | **Most of the codebase** | Learning-track sections, playgrounds, calculators, knowledge graph, quiz logic. These should stay custom; only their *controls* should move to shadcn |
| E. Third-party | **6 libraries** | framer-motion, d3, three + @react-three/fiber + @react-three/drei, katex, zustand, plus the Radix slider. See Section B |
| F. Needs investigation | **0** | The open items were checked in a follow-up pass: `role="switch"` widgets are correct (native buttons with `aria-checked`), `animate-pulse` indicators are mostly status dots (a reduced-motion gap is recorded in E2), and the font stack is confirmed (Geist unused). `title=` tooltips are triaged in C12 |

### Headline findings

1. **No shadcn foundation exists.** Adopting shadcn means adding `components.json`, `cva`, a `cn` helper and a token bridge. The Radix packages to support the most valuable components are already installed.
2. **Three installed dependencies are unused:** `@radix-ui/react-dialog`, `@radix-ui/react-progress` and `@radix-ui/react-tabs`. Each maps directly to a shadcn component that the codebase currently re-implements or lacks.
3. **Two components are dead code:** `src/components/Navbar.tsx` and `src/components/FormulaBox.tsx` have zero importers.
4. **The one mobile drawer (`Sidebar.tsx`) is not a real dialog.** It has no `role="dialog"`, no focus trap, no Escape handling and no focus return. This is the top accessibility issue (P0).
5. **Colour and radius are not governed by tokens.** 582 hex colours are hardcoded in `.tsx` files, and border radii use six different values across the same component types.

---

## B. Component Inventory

Only named, reusable components get their own row. Pattern-level families (for example, "native `<select>` in 31 files") are listed in Section C, not repeated per instance.

**Legend:** `A` official, `B` customized shadcn, `C` custom duplicate, `D` business, `E` third-party, `F` investigate.

| Component | File Location | Classification | Existing shadcn Equivalent | Recommendation |
|---|---|---|---|---|
| Sidebar (desktop + mobile drawer) | `src/components/Sidebar.tsx` (drawer at ~L390) | C (drawer) / D (module nav) | Sheet (mobile drawer); Sidebar block (full layout) | **Migrate the mobile drawer to Sheet (P0).** Keep module nav custom or adopt the Sidebar block later |
| AppShell (layout + top bar) | `src/components/AppShell.tsx` | D | None (layout). The "DevOps Hub / Track" header is breadcrumb-like | Keep. Replace the breadcrumb span with Breadcrumb if links are wanted |
| Navbar (scroll-spy nav + hamburger) | `src/components/Navbar.tsx` | C, **dead code** (0 importers) | Button (ghost), Navigation Menu | **Delete after confirming it is unused** |
| FormulaBox | `src/components/FormulaBox.tsx` | D, **dead code** (0 importers) | Card (if revived) | **Delete after confirming it is unused** |
| CopyButton | `src/components/CopyButton.tsx` (used in 5 files) | C | Button (`variant="outline" size="sm"`) | Migrate to Button (Low) |
| ThemeToggle | `src/components/ThemeToggle.tsx` | C | Button (`variant="ghost" size="icon"`) | Migrate to Button (Low) |
| BackToTop | `src/components/BackToTop.tsx` | C | Button (`size="icon"`, `rounded-full`) | Migrate to Button (Low) |
| Slider (ML primitive) | `src/components/ml/primitives/Slider.tsx` | C (uses Radix Slider directly) | Slider | Replace with the shadcn Slider. It uses the same Radix package already installed (Low) |
| QuizRunner | `src/components/ml/primitives/QuizRunner.tsx` | D (quiz logic) with C controls | Button, RadioGroup, Input, Card, Alert | Keep logic. Move controls to shadcn (Medium) |
| SectionQuizGate | `src/components/ml/SectionQuizGate.tsx` | D with C (link styled as button) | Button (`asChild` wrapping `Link`) | Keep logic. Use Button (Low) |
| MlSidebarNav | `src/components/ml/MlSidebarNav.tsx` | D | Sidebar block / Navigation Menu | Keep for now (Low priority) |
| ConceptCallout (used in 28 files) | `src/components/ml/primitives/ConceptCallout.tsx` | C (alert-like) | Alert | Optional migration to Alert (Low). Good candidate for a shared, consistent callout |
| PlaygroundShell (used in 28 files) | `src/components/ml/primitives/PlaygroundShell.tsx` | D (card-like container) | Card | Keep the behaviour. Compose from Card for shared surface styles (Low) |
| NetworkingPanel (25 files) | `src/components/networking/NetworkingPanel.tsx` | C (custom Card with variants) | Card | Compose shadcn Card, keep the `variant` API (Low) |
| NetworkingMetric (11 files) | `src/components/networking/NetworkingMetric.tsx` | C (stat tile) | Card | Compose from Card; keep tone API (Low) |
| TrackCard (hub) | `src/components/TrackCard.tsx` | C (card with inline Badge-like difficulty pill) | Card, Badge | Migrate to Card + Badge (Low) |
| NetworkingTable (10 files) | `src/components/networking/NetworkingTable.tsx` (styles in `globals.css:410`) | C (wrapper over native `<table>`) | Table | Migrate markup to shadcn Table; move `.networking-table` styling to the Table classes (Medium) |
| NetworkingModuleHeader (24 files), NetworkingExample (15), NetworkingTypes | `src/components/networking/*.tsx` | D | None (domain layout) | Keep. Internals may use Card/Badge |
| KnowledgeGraph | `src/components/KnowledgeGraph.tsx` (3 files) | D; uses d3 (E). Uses `aria-pressed` toggles | Toggle / Toggle Group for the toggle buttons | Keep the d3 rendering. Migrate toggles (Low) |
| Hero / HubHero / KnowledgeGraphSection | `src/components/Hero.tsx`, `HubHero.tsx`, `KnowledgeGraphSection.tsx` | D | None | Keep. Replace the hero search `<input>` with Input (Low) |
| Katex | `src/components/ml/primitives/Katex.tsx` | E (katex) | None | Keep |
| FunctionPlot, VectorCanvas, MatrixGrid, DecisionBoundaryCanvas, BarChart | `src/components/ml/primitives/*.tsx`, `src/components/ml/tracks/**` | D (canvas/SVG visualisation) | None (shadcn Chart wraps Recharts, not suited to these) | Keep custom |
| Surface3D | `src/components/ml/primitives/Surface3D.tsx` | E (three, @react-three/fiber, @react-three/drei) | None | Keep |
| Progress bars (about 20 files, e.g. `src/app/ml/progress/page.tsx`, `src/components/tracks/AwsCostSection.tsx`) | Inline `div` with `style={{ width }}` | C | Progress (`@radix-ui/react-progress` is installed, unused) | Migrate to Progress (Low) |
| Practice accordion | `src/components/sections/PracticeSection.tsx:409` (`aria-expanded`) | C | Accordion or Collapsible | Migrate to Accordion (Low) |
| Collapsible `<details>` | `src/components/tracks/DkSecurityScanSection.tsx:1174` | C (native `<details>`) | Collapsible | Optional. Native `<details>` is accessible; migrate only for visual consistency (Low) |
| Breadcrumb-like header | `src/components/AppShell.tsx` header | C | Breadcrumb | Optional (Low) |
| Text "toast" for route/validation messages | `src/components/tracks/AwsTransitGatewaySection.tsx:588-633, 1580` (`rtToast` state rendered as a `<p>`) | C | Alert (inline) or Sonner-based Toast | Migrate to Alert or Toast; the value is set and never announced (Low) |
| Role-switch widgets | `src/components/tracks/AwsComplianceSection.tsx:600`, `src/components/tracks/DkSecurityScanSection.tsx:977` | C (custom switch; ARIA is correct) | Switch | Native `<button>` with `role="switch"`, `aria-checked` and `aria-label`; keyboard works natively. Migrate to Switch for visual consistency only (Low, P3) |
| `animate-pulse` indicators (about 25 occurrences) | Mostly status dots beside a text label, e.g. `src/components/tracks/AwsSection.tsx:385`, `src/components/tracks/DkRbacSecuritySection.tsx:1278` (dot beside ALLOW/DENY text). A few are decorative bars (`src/components/sections/DhcpSection.tsx:423`) | C (decorative) / resolved | Skeleton (only for loading states) | Not a Skeleton case. Keep as-is, but add them to the reduced-motion rule (see E2) |
| Native `<select>` controls (31 files) | e.g. `src/components/sections/SubnetCalculator.tsx:82` | C | Native Select (keeps native semantics), or Select (Radix) | See Section C |
| Native checkbox / range / radio controls | See Section C | C | Checkbox, Slider, RadioGroup | See Section C |
| Native tables (31 files) | See Section C | C | Table | See Section C |
| Inline "card" containers (`rounded-2xl border ... card-shadow`, 47 files) | Repeated `className` strings | C | Card | See Section C |
| Inline primary buttons (`bg-indigo-600 ... rounded-md`, 74 occurrences) | Repeated `className` strings | C | Button (`variant="default"`) | See Section C |
| Sidebar search `<input>` | `src/components/Sidebar.tsx:286` | C | Input (with `Search` icon via Input Group) | Migrate (Low) |
| CheatSheet search `<input>` | `src/components/sections/CheatSheetSection.tsx:476` | C | Input | Migrate (Low) |
| Quiz numeric `<input type="number">` | `src/components/ml/primitives/QuizRunner.tsx` | C | Input | Migrate (Low) |
| Third-party libraries | framer-motion (`QuizRunner`, `SectionQuizGate`), d3 (`KnowledgeGraph`), three / @react-three/fiber / @react-three/drei (`Surface3D`), katex (`Katex`), zustand (`progressStore`) | E | None | Keep. Not UI-library overlap |

---

## C. Duplication Report

Migration complexity: **Low** = mechanical swap with no behaviour change. **Medium** = needs API or markup changes, or tests updated. **High** = affects logic or the design system broadly.

### C1. Buttons (highest-volume duplication)

- **What it is:** 444 `<button>` elements in 73 files, each with its own Tailwind class string. The same visual "primary", "outline" and "ghost" styles are copied, not shared. Examples: `bg-indigo-600 ... rounded-md px-4 py-2 text-[13px] font-semibold text-white` (quiz submit), `w-full rounded-md bg-indigo-600 px-3 py-1.5 text-[12px] font-semibold` (sections), `rounded-md border border-slate-200 px-3 py-1.5 text-[12px] font-medium` (quiz retry).
- **Shadcn alternative:** Button (variants: default, outline, secondary, ghost, destructive, link; sizes: sm, default, lg, icon).
- **Why migrate:** One definition of focus ring, disabled and loading styles, and size scale. Currently `disabled:opacity-40` appears on some buttons and not others.
- **Complexity:** Medium (large volume; do it in batches, starting with the shared components above).

Migrate first: `src/components/CopyButton.tsx`, `src/components/ThemeToggle.tsx`, `src/components/BackToTop.tsx`, `src/components/ml/SectionQuizGate.tsx` (the link-as-button), `src/components/ml/primitives/QuizRunner.tsx` (submit and retry).

### C2. Native `<select>` (100 occurrences, 31 files)

- **Examples:** `src/components/sections/SubnetCalculator.tsx:82`, `src/components/sections/DhcpSection.tsx`, `src/components/sections/RoutingSection.tsx`, `src/components/sections/SecuritySection.tsx`, `src/components/sections/WirelessSection.tsx`, and about 25 `src/components/tracks/*Section.tsx` files.
- **Shadcn alternative:** **Native Select** (styled native `<select>`, keeps native mobile pickers and form semantics) is the closest match to the existing code. Use **Select** (Radix) only where a fully custom listbox is needed.
- **Why migrate:** Consistent trigger height, border, focus ring and dark-mode colours. Current styles differ from file to file.
- **Complexity:** Low for Native Select (same element, new class set). Medium for Select (Radix), which changes the DOM and keyboard handling.

### C3. Native `<input type="checkbox">` (52 occurrences, 22 files)

- **Examples:** `src/components/tracks/AwsApiGatewaySection.tsx:662, 666` (`accent-violet-600`), `src/components/tracks/SecIncidentResponseSection.tsx:191, 195, 209` (`accent-emerald-600`, `accent-amber-600`), `src/components/tracks/DkResourceQuotasSection.tsx:86` (`accent-[#58a6ff]`), `src/components/tracks/GitOpsSection.tsx` (6 instances), `src/components/tracks/SecWafSection.tsx` (6 instances).
- **Problem:** The same control is styled with different `accent-*` colours by section: violet, emerald, amber, sky and a hardcoded GitHub-dark blue. A shared style is missing.
- **Shadcn alternative:** **Checkbox** (Radix). Note: a plain `<input type="checkbox">` with `accent-*` is already accessible; migrate for consistency, not for correctness.
- **Complexity:** Low per file, Medium in total (22 files).

### C4. Native `<input type="range">` (37 occurrences, 16 files)

- **Examples:** `src/components/sections/CidrSection.tsx:90`, `src/components/sections/WirelessSection.tsx` (4 instances), `src/components/tracks/DkImageRegistrySection.tsx` (7 instances), `src/components/tracks/AwsAutoScalingSection.tsx` (4 instances), `src/components/tracks/AwsCostSection.tsx` (3 instances).
- **Problem:** The project already has a Radix-based labelled slider (`src/components/ml/primitives/Slider.tsx`), but the track and section files do not use it. Each range input has its own label markup and `accent-*` colour.
- **Shadcn alternative:** **Slider** (Radix). The ML `Slider` is effectively this component already. Move the shared wrapper to the shadcn Slider and let all sections use it.
- **Complexity:** Medium (16 files, and the value-readout markup should be unified).

### C5. Radio buttons (quiz)

- **Example:** `src/components/ml/primitives/QuizRunner.tsx` renders MCQ options as native `<input type="radio">` inside `<label>`, with no `<fieldset>`/`<legend>` group.
- **Shadcn alternative:** **Radio Group** (Radix).
- **Complexity:** Low to Medium.

### C6. Tables (45 `<table>` elements, 31 files)

- **Examples:** `src/components/sections/SubnetCalculator.tsx`, `src/components/sections/VlsmSection.tsx`, `src/components/tracks/AwsCostSection.tsx`, `src/components/tracks/SecSiemSection.tsx`, `src/components/networking/NetworkingTable.tsx` (styled by `.networking-table` in `globals.css:410-423`), `src/app/ml/progress/page.tsx`.
- **Shadcn alternative:** **Table** (markup and classes only; no library dependency). Data-table behaviour (sorting, filtering) is documented in shadcn as a composed guide using TanStack Table. None of these tables appears to need sorting or filtering; confirm per table.
- **Complexity:** Medium.

### C7. Cards and containers (47 files with `rounded-2xl border ... card-shadow`)

- **Examples:** `src/components/networking/NetworkingPanel.tsx`, `src/components/networking/NetworkingMetric.tsx`, `src/components/TrackCard.tsx`, and inline containers across `src/components/tracks/*.tsx`.
- **Problem:** Container radius is inconsistent for the same role. `NetworkingPanel` uses `rounded-2xl`, `TrackCard` uses `rounded-xl`, and `ml/primitives/PlaygroundShell` uses a third style.
- **Shadcn alternative:** **Card** (`Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`).
- **Complexity:** Low for the named wrappers; Medium for inline containers.

### C8. Inputs (235 `<input>` elements, 50 files)

- **Examples:** `src/components/Sidebar.tsx:286` (search, `focus:outline-none focus:ring-1`), `src/components/sections/CheatSheetSection.tsx:476` (search), `src/components/ml/primitives/QuizRunner.tsx` (numeric), and many inline numeric inputs in `src/components/sections/*.tsx` and `src/components/tracks/*.tsx`.
- **Shadcn alternative:** **Input**, with **Label** and **Field** for form structure, and **Input Group** when an icon or addon is needed (for example, the search icon).
- **Complexity:** Medium (volume). The most valuable step is pairing each input with a visible label through Field.

### C9. Progress bars (about 20 files)

- **Examples:** `src/app/ml/progress/page.tsx`, `src/components/tracks/AwsCostSection.tsx`, `src/components/tracks/DkResourceQuotasSection.tsx`, `src/components/tracks/DkRbacSecuritySection.tsx`, `src/components/tracks/AwsDrSection.tsx`.
- **Problem:** Each bar is an inline `div` with `style={{ width: ... }}` and no `role="progressbar"` or ARIA value attributes. Screen readers cannot read them.
- **Shadcn alternative:** **Progress** (`@radix-ui/react-progress`, already installed).
- **Complexity:** Low (mechanical), and it fixes an accessibility gap.

### C10. Alerts and callouts

- **Examples:** `src/components/ml/primitives/ConceptCallout.tsx` (used in 28 files), rose/amber validation text across 59 files, `src/components/tracks/AwsTransitGatewaySection.tsx:1580` (route validation shown as a plain `<p>`).
- **Shadcn alternative:** **Alert** (with variants) for inline messages. **Toast** (Sonner-based in the current docs) for transient confirmations.
- **Complexity:** Low for ConceptCallout; Medium for the 59 validation sites, which need consistent `role` and live-region handling.

### C11. Dialogs, drawers and popovers

- **Current state:** No `<dialog>` element, no `role="dialog"`, no `aria-modal`, and no modal implementation in `src/`. The only overlay is the mobile sidebar in `src/components/Sidebar.tsx` (~L370-395), which is a `<aside>` with a fixed overlay `div`.
- **Shadcn alternative:** **Sheet** (for the mobile sidebar) and **Dialog** (for any future modal). `@radix-ui/react-dialog` is already installed.
- **Complexity:** Medium. The mobile sidebar must keep its existing open/close behaviour and route-change close.

### C12. Tooltips

- **Current state:** The native `title` attribute is used as a tooltip in about 118 `.tsx` places (includes non-tooltip uses; some are SVG `<title>`). `src/components/ThemeToggle.tsx` sets both `aria-label` and `title`, which is fine. `src/components/KnowledgeGraph.tsx:263` adds a hover shortcut on the decorative SVG graph. This is not a defect: keyboard users use `BranchSelector`, a group of real buttons (see E2).
- **Shadcn alternative:** **Tooltip** (Radix). Use only for information that is not also available in the visible label.
- **Complexity:** Medium. Triage each `title=` instance: decorative, duplicative, or essential.

### C13. Tabs and segmented controls

- **Current state:** No tab component exists. `@radix-ui/react-tabs` is installed and unused. Section navigation uses anchor links (`src/components/tracks/AwsAutoScalingSection.tsx:522`, `<nav>` of `<a>` tags), which is appropriate for long pages. Toggle buttons use `aria-pressed` in only 4 files.
- **Shadcn alternative:** **Tabs** (Radix) where content is genuinely switched, not scrolled. **Toggle Group** for `aria-pressed` toggle sets.
- **Complexity:** Low to Medium. Keep anchor-based navigation as it is.

### C14. Accordions and collapsibles

- **Examples:** `src/components/sections/PracticeSection.tsx:409` (`aria-expanded` button), `src/components/tracks/DkSecurityScanSection.tsx:1174` (native `<details>`).
- **Shadcn alternative:** **Accordion** or **Collapsible**.
- **Complexity:** Low.

### C15. Switches

- **Examples:** `src/components/tracks/AwsComplianceSection.tsx:600` and `src/components/tracks/DkSecurityScanSection.tsx:977` (`role="switch"`). Both are native `<button>`s with `aria-checked`, so ARIA and keyboard behaviour are already correct. Other boolean toggles use native checkboxes (see C3).
- **Shadcn alternative:** **Switch** (Radix).
- **Complexity:** Low. Migration is for visual consistency only, not an accessibility fix.

### C16. Dead and redundant code

| File | Status | Action |
|---|---|---|
| `src/components/Navbar.tsx` | 0 importers | Delete after confirming it is not used in a route or dynamic import |
| `src/components/FormulaBox.tsx` | 0 importers | Delete after confirming |
| `@radix-ui/react-dialog`, `@radix-ui/react-progress`, `@radix-ui/react-tabs` | Installed, not imported | **Keep and use** them via the shadcn Dialog/Sheet, Progress and Tabs. Removing them would just re-create the gaps |
| `clsx`, `tailwind-merge` | Installed, not imported | **Keep and use** them for the shadcn `cn()` helper |
| `class-variance-authority` | Not installed | Needed for shadcn variants. Add it when shadcn is adopted |

### C17. Custom controls that are fine as they are

Not every custom control is a duplicate. These should stay custom:

- **Canvas and SVG visualisations** (`FunctionPlot`, `VectorCanvas`, `MatrixGrid`, `DecisionBoundaryCanvas`, `BarChart`, `NetworkDiagram`, `LossCurve`). shadcn Chart is built on Recharts and does not fit these.
- **Knowledge graph** (`src/components/KnowledgeGraph.tsx`, d3).
- **3D surface** (`Surface3D`, three.js).
- **Learning-track logic** (quiz grading, progression, playground state).
- **Scroll-spy and anchor navigation** on the networking page.

---

## D. Design System Consistency

### D1. Colours and CSS variables

- **Two parallel token systems:**
  1. Semantic variables in `src/app/globals.css` (`--primary`, `--foreground`, `--border`, `--surface`, `--surface-2`, `--muted-foreground`), mapped through `@theme inline` (lines 3-25).
  2. Raw palette variables in `:root` and `.dark` (`--bg-base`, `--bg-subtle`, `--text-primary`, `--surface-l0..l3`, `--border-l1..l3`). These are used by the networking components through arbitrary values such as `bg-[color:var(--surface-l1)]`.
- **Raw Tailwind palette classes** (`slate-*`, `indigo-*`, `emerald-*`, `rose-*`, `amber-*`) are used throughout the codebase, so tokens are bypassed in most of the UI.
- **Hardcoded hex:** 582 hex colour literals in `.tsx` files. Examples: `src/components/sections/DhcpSection.tsx:423` (`from-[#58a6ff] via-[#7ee787]`), `src/components/tracks/DkResourceQuotasSection.tsx:86` (`accent-[#58a6ff]`). These come from a GitHub-dark palette and appear in light-theme sections.
- **shadcn mismatch:** shadcn expects `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`. Only `--primary`, `--foreground` and `--border` overlap today.
- **Dark mode:** Uses a `.dark` class on `<html>` toggled by `src/components/ThemeToggle.tsx`. This is compatible with shadcn's dark mode (`@custom-variant dark`), so no change to the mechanism is needed.

**Recommendation:** Add a token bridge in `globals.css` that defines the shadcn variables in terms of the existing ones, then migrate hardcoded hex values to tokens.

### D2. Typography

- **Arbitrary font sizes:** Components use `text-[10px]`, `text-[11px]`, `text-[12px]`, `text-[13px]`, `text-[15px]` as well as Tailwind scale steps (`text-xs`, `text-sm`, `text-lg`). There is no type scale.
- **Font stack (confirmed by reading the code):** `src/app/layout.tsx` loads **Geist** and **Geist Mono** with `next/font/google` and exposes them as `--font-geist-sans` and `--font-geist-mono`. Nothing maps those variables to the sans or mono font utilities: `globals.css` has no `--font-sans` or `--font-*` theme entry. `<body>` uses the `font-sans` utility, which in Tailwind v4 falls back to its default system stack. The `'Inter', 'Segoe UI', system-ui` rule at `globals.css:121` is a base-layer rule that the utility overrides. Result: **Geist is downloaded but not used**, and Inter is never loaded. Expected computed font is the system UI stack. This is from reading the code, not a browser check.
- **Monospace:** `font-mono` is used for numeric readouts. This is consistent and fine.

### D3. Spacing

- Spacing is mostly Tailwind scale values, applied inconsistently at the component level (for example `p-3`, `p-4`, `p-5`, `p-6`, and `sm:p-6`/`sm:p-8` on the same card type). A spacing standard for cards and sections would help.

### D4. Border radii (six values in use)

| Class | Occurrences |
|---|---|
| `rounded-lg` | 802 |
| `rounded-xl` | 709 |
| `rounded` | 532 |
| `rounded-full` | 349 |
| `rounded-2xl` | 181 |
| `rounded-md` | 123 |

The same role uses different radii: buttons are `rounded-md` (`CopyButton.tsx`, quiz submit) and `rounded-full` (`BackToTop.tsx`). Cards are `rounded-2xl` (`NetworkingPanel.tsx`) and `rounded-xl` (`TrackCard.tsx`).

**Recommendation:** Define `--radius` once and derive `rounded-sm/md/lg/xl` from it, as shadcn does.

### D5. Shadows

- Custom classes `card-shadow`, `card-shadow-md`, `card-shadow-hover` are defined in `globals.css:168-180`.
- Inline shadows are also used: `shadow-sm`, `shadow-md`, `shadow-xl`, `shadow-inner`, `shadow`.
- **Recommendation:** Keep `card-shadow` as the card elevation token. Map it to a shadow variable that shadcn Card can use.

### D6. Component sizing

- Button and input heights are not standardised. Examples: quiz submit is `px-4 py-2 text-[13px]`, quiz retry is `px-3 py-1.5 text-[12px]`, navbar links are `px-2.5 py-1.5 text-xs`, copy button is `px-2 py-1 text-[11px]`.
- **Recommendation:** Adopt shadcn's size scale (`sm`, `default`, `lg`, `icon`) for Button and Input.

### D7. Variants

- Semantic status colours are reused as raw palette classes: emerald for success, rose for error, amber for warning, indigo for primary. Usage is consistent in meaning but not in component API. `TrackCard.tsx` has a `difficultyStyle()` function that returns class strings directly. shadcn expresses this through `cva` variants on Badge and Alert.

### D8. Interactive states

- **Hover:** Varies per file (`hover:bg-indigo-700`, `hover:bg-slate-50`, `hover:bg-white`, `hover:border-indigo-300`).
- **Disabled:** Mostly `disabled:opacity-40`, but not on every disabled control. `QuizRunner` disables inputs with `disabled={!!result}` and does not apply disabled styling to them.
- **Focus:** A global `:focus-visible` outline is defined (`globals.css:194-198`, 2px indigo, offset 2px). This is a good baseline. However, 187 occurrences of `focus:outline-none` remove the browser outline, relying on a `focus:ring` replacement where it exists. See E2.
- **Loading:** `QuizRunner` shows "Grading…" text on the submit button. Other async actions have no consistent loading state.
- **Error:** Inline `<p>` with rose text (`QuizRunner`), or plain text (`AwsTransitGatewaySection`). No Alert component.

---

## E. Accessibility Report

### E1. Summary

| Area | Status | Notes |
|---|---|---|
| Semantic HTML | Mostly good | `<nav>`, `<main>`, `<header>`, `<footer>`, `<aside>`, `<section>` used appropriately. `<table>` used for tabular data |
| ARIA on custom controls | Partial | `aria-label` appears 92 times; `role="switch"` in 2 files; `aria-expanded` in 1 file; `aria-pressed` in 4 files; `aria-live` in 10 places |
| Keyboard navigation | Partial | Native controls are keyboard-accessible. Custom controls are keyboard-accessible where they are the only control. The knowledge-graph hover (`KnowledgeGraph.tsx:263`) is a mouse shortcut; the real controls are buttons |
| Focus management | **Weak for overlays** | No focus trap, no Escape handler, no focus return for the mobile sidebar |
| Focus visibility | Good baseline, some gaps | Global `:focus-visible` outline exists. 187 `focus:outline-none` occurrences rely on per-component rings |
| Screen-reader labels | Partial | 235 inputs and 100 selects were not individually checked for labels in this audit. Verify with an automated scanner |
| Colour contrast | **Fails in places** | See E4 |

### E2. Findings

**P0 - Mobile sidebar is not an accessible dialog** (`src/components/Sidebar.tsx`, ~L370-395)

- The mobile `<aside>` has `fixed inset-y-0 z-50` and a translate-based open/close. It has no `role="dialog"`, no `aria-modal`, no focus trap, no Escape handling, and focus is not moved into the drawer or returned to the "Open sidebar" button when closed. Background content remains tabbable while the drawer is open.
- **Fix:** Migrate to shadcn **Sheet** (Radix Dialog). It provides role, modal semantics, focus trap, Escape and focus return.

**Withdrawn - knowledge-graph hover is not an accessibility defect** (`src/components/KnowledgeGraph.tsx:263`)

- The SVG graph is `aria-hidden`, and `KnowledgeGraph.test.tsx` asserts it has no `tabindex`. Keyboard users operate `BranchSelector`, a group of real `<button>`s with `aria-pressed`, rendered on every layout. The hover is a mouse shortcut only. This finding was wrong in the first version of this report.

**P1 - Quiz radio group has no group label** (`src/components/ml/primitives/QuizRunner.tsx`)

- MCQ options are native radios inside `<label>` elements, grouped by `name={question.id}`, with no `<fieldset>`/`<legend>` containing the question prompt. Screen readers announce options without the question.
- **Fix:** Use Radio Group, or wrap in `<fieldset>` with the prompt as `<legend>`.

**P1 - Progress bars have no progressbar role** (about 20 files, see C9)

- Visual progress is a `div` with a width style. No `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` or accessible name. Users of assistive technology cannot read progress.
- **Fix:** Migrate to Progress (Radix provides these attributes).

**P1 - Validation feedback is not announced** (`src/components/tracks/AwsTransitGatewaySection.tsx:588-633, 1580`)

- The `rtToast` message is shown as a plain `<p>` and is not in a live region. Errors from the custom CIDR form are not announced.
- **Fix:** Use Alert with `role="alert"` for errors, or an `aria-live="polite"` region for confirmations.

**P2 - Native `title` used as tooltip** (about 118 places)

- Hover-only and not reliably available to keyboard or touch users. Use Tooltip only for essential information that is not already in the visible label.

**P2 - Focus rings removed on inputs** (187 `focus:outline-none`)

- The global `:focus-visible` rule restores an outline in most cases. Where a component also sets `focus:outline-none` without a ring, focus visibility depends on the global rule, which is acceptable. Spot-check the search inputs (`Sidebar.tsx:286`, `CheatSheetSection.tsx:476`) in the browser.

**Resolved - `role="switch"` widgets are correct** (`AwsComplianceSection.tsx:600`, `DkSecurityScanSection.tsx:977`)

- Both are native `<button>` elements with `role="switch"`, a boolean `aria-checked`, and an `aria-label`. Native buttons respond to Space and Enter. No defect. Migrating to Switch is a consistency choice only.

**P3 - `animate-pulse` ignores the project's reduced-motion rule** (about 25 occurrences, e.g. `src/components/tracks/AwsSection.tsx:385`)

- `globals.css:233-238` disables animation under `prefers-reduced-motion` only for `.kg-rise`, `.animate-fade-up` and `.animate-soft-pulse`. Tailwind's `animate-pulse` is not in that list, so these indicators keep pulsing for users who asked for reduced motion.
- Most are status dots beside a text label (`DkRbacSecuritySection.tsx:1278` pairs its dot with ALLOW/DENY text), so the information is not lost when they stop. Some are decorative.
- **Fix:** add `.animate-pulse` to the reduced-motion selector in `globals.css`. One-line change.

### E3. Checks not performed

- No automated accessibility scan (axe, Lighthouse) was run. This audit is static.
- No keyboard walkthrough was done in a browser.
- Dialog focus trapping, screen-reader output and label coverage per input were **not** exhaustively verified.

### E4. Colour contrast

- **Fails WCAG AA for body text:** `text-slate-400` (`#94a3b8`) on white. Contrast is about **2.6:1**, below the 4.5:1 minimum. Used in the site footer (`src/components/AppShell.tsx`, footer `text-slate-400`) and similar muted labels across the codebase.
- **Dark mode:** `text-slate-500` on `bg-slate-900` is about 3.7:1 (also below 4.5:1 for body text). Verify each usage; large text and non-text UI have a 3:1 minimum.
- **Raw hex colours** (for example `#58a6ff` in the light theme) need checking against their backgrounds.
- **Recommendation:** Run a contrast check (for example, axe or a palette script) on the affected pages before fixing.

---

## F. Recommended Improvements

| Priority | Finding | File(s) | Action |
|---|---|---|---|
| **P0** | Mobile sidebar is not a modal dialog: no focus trap, no Escape, no focus return | `src/components/Sidebar.tsx` (~L370-395) | Migrate to Sheet |
| ~~P0~~ withdrawn | Knowledge-graph hover: not a defect (`BranchSelector` gives keyboard access) | `src/components/KnowledgeGraph.tsx:263` | None |
| **P1** | Progress bars are unlabelled `div`s | About 20 files (C9) | Migrate to Progress |
| **P1** | Quiz MCQ radios lack group label | `src/components/ml/primitives/QuizRunner.tsx` | Radio Group or `fieldset`/`legend` |
| **P1** | Validation messages not announced | `src/components/tracks/AwsTransitGatewaySection.tsx` | Alert with `role="alert"` or live region |
| **P1** | Muted text fails contrast (`slate-400` on white) | `src/components/AppShell.tsx` footer and similar | Adjust to a passing shade; verify with a scanner |
| **P1** | No shadcn foundation; 444 hand-written buttons, 100 native selects, 52 native checkboxes, 37 native ranges | 73 / 31 / 22 / 16 files (Section C) | Establish foundation (Phase 0), then migrate by batch |
| **P1** | Radix Dialog, Progress and Tabs installed but unused | `package.json` | Use them through shadcn Dialog/Sheet, Progress and Tabs |
| **P2** | Radius, shadow and size values are not standardised | Global (D4-D6) | Define `--radius`; adopt shadcn size scale |
| **P2** | 582 hardcoded hex colours bypass tokens | Global, e.g. `DhcpSection.tsx:423`, `DkResourceQuotasSection.tsx:86` | Token bridge, then replace hex literals |
| **P2** | Native `title` used as tooltip | About 118 places | Triage; Tooltip for essential info only |
| **P2** | Duplicate card containers with different radii | `NetworkingPanel.tsx`, `TrackCard.tsx`, `PlaygroundShell.tsx` | Compose from Card |
| **P2** | Per-section range inputs and checkboxes with different accent colours | 16 and 22 files | Shared Slider and Checkbox |
| **P3** | `role="switch"` widgets: ARIA correct; consistency only | `AwsComplianceSection.tsx:600`, `DkSecurityScanSection.tsx:977` | Optional migration to Switch |
| **P3** | Dead code: unused `Navbar.tsx` and `FormulaBox.tsx` | `src/components/` | Delete after confirmation |
| **P3** | `animate-pulse` ignores the reduced-motion rule | `globals.css:233-238`; about 25 occurrences | Add `.animate-pulse` to the reduced-motion selector |
| **P3** | Accordion via `aria-expanded` buttons; `<details>` for collapsibles | `PracticeSection.tsx:409`, `DkSecurityScanSection.tsx:1174` | Accordion / Collapsible for consistency |
| **P2** | Geist font is downloaded but never applied; body falls back to the system stack, and `globals.css:121` declares Inter, which is never loaded | `layout.tsx`, `globals.css:121` | Map `--font-geist-sans` to the sans theme variable (or drop Geist); remove the Inter declaration |

---

## G. Migration Roadmap

### Prerequisites and ground rules

- **Radix vs Base UI:** The shadcn docs show Base UI, React Aria and Radix UI tabs for each component, but the component list page does not say which is the default. This project already has Radix packages installed, so **use Radix** to avoid adding a second primitive library. Confirm the default in the shadcn CLI output when initialising.
- **Do not reinstall what is present:** `@radix-ui/react-dialog`, `react-progress`, `react-slider` and `react-tabs` are already in `package.json`. Only add Radix packages that are missing for the components chosen (for example `react-checkbox`, `react-radio-group`, `react-switch`, `react-tooltip`, `react-accordion`, `react-collapsible`, `react-toggle-group` as needed).
- **Preserve behaviour:** Migrations must not change grading logic, calculators, playgrounds or route structure. Only markup, classes and control primitives change.

### Phase 0 - Foundation (no visible change)

| Step | Action | Files | Benefit | Breaking changes | Testing |
|---|---|---|---|---|---|
| 0.1 | Add `components.json` (Tailwind v4, Radix style, `src/components/ui` alias) | repo root | Reproducible shadcn adds | None | `npm run build` |
| 0.2 | Add `class-variance-authority`; add `src/lib/utils.ts` with `cn()` using existing `clsx` and `tailwind-merge` | `package.json`, `src/lib/utils.ts` | Variant API; class merging | None | `npm run typecheck` |
| 0.3 | Token bridge in `globals.css`: define `--background`, `--foreground`, `--card`, `--muted`, `--accent`, `--destructive`, `--input`, `--ring`, `--radius` in terms of existing vars | `src/app/globals.css` | shadcn components pick up current colours | None intended | Visual diff on `/`, `/networking`, `/ml` in light and dark |
| 0.4 | Resolve font stack: apply Geist via the sans theme variable (or drop it), and remove the unused Inter declaration | `src/app/layout.tsx`, `globals.css` | Font matches the intended design; Geist is no longer downloaded for nothing | Visible: text changes from the system stack to Geist | Visual check on `/` and `/ml` |
| 0.5 | Add shadcn primitives: Button, Input, Label, Card, Badge, Alert, Table, Skeleton, Separator | `src/components/ui/*` (new) | Shared primitives | None (not yet used) | `npm run typecheck`, `npm run lint` |
| 0.6 | Add remaining primitives as they are needed: Progress, Slider, Dialog/Sheet, Tabs, Checkbox, Switch, Radio Group, Native Select, Tooltip, Accordion, Toggle Group | `src/components/ui/*` (new) | Full set for Phases 1-5 | None | As above |

### Phase 1 - Dead code and quick wins (P3, Low)

| Step | Action | Files | Benefit | Breaking changes | Testing |
|---|---|---|---|---|---|
| 1.1 | Confirm and delete `Navbar.tsx` and `FormulaBox.tsx` | `src/components/Navbar.tsx`, `src/components/FormulaBox.tsx` | Less code to maintain | None (0 importers) | `npm run build` (dead-import check), `npm test` |
| 1.2 | Migrate `ThemeToggle`, `CopyButton`, `BackToTop` to Button | 3 components (5, 1, 1 callers) | Consistent icon and text buttons | Visual only | Click each control in browser; `npm test` |
| 1.3 | Migrate the ML `Slider` wrapper to shadcn Slider | `src/components/ml/primitives/Slider.tsx` and its 32 callers via `primitives/index.ts` | Same API; shared styles | Keep the `Slider` props interface | `npm test`; drag each playground slider |
| 1.4 | Migrate progress bars to Progress | About 20 files (C9); start with `src/app/ml/progress/page.tsx` | Accessibility fix (P1) | Visual only | Check the progress page renders the same percentage |

### Phase 2 - Accessibility P0/P1

| Step | Action | Files | Benefit | Breaking changes | Testing |
|---|---|---|---|---|---|
| 1.5 | Add `.animate-pulse` to the reduced-motion selector in `globals.css` | `src/app/globals.css:233-238` | Respects `prefers-reduced-motion` on status indicators | None | Toggle the OS reduced-motion setting; confirm dots stop |
| 2.1 | **Mobile sidebar → Sheet** | `src/components/Sidebar.tsx` | Focus trap, Escape, focus return, modal semantics | Open/close API may change; route-change close must still work | Keyboard only: open, Tab cycle, Escape, focus returns. Test on mobile width. Add a test for route change closing the sheet |
| 2.2 | ~~Knowledge graph keyboard access~~ | Withdrawn: keyboard access already exists via `BranchSelector` | n/a | n/a | n/a |
| 2.3 | Quiz MCQ → Radio Group within `fieldset` | `src/components/ml/primitives/QuizRunner.tsx` | Group label for screen readers | None to grading logic | Extend quiz tests; `npm test`; keyboard arrow navigation |
| 2.4 | Validation messages → Alert with `role="alert"` | `src/components/tracks/AwsTransitGatewaySection.tsx` | Errors announced | Message text unchanged | Trigger invalid CIDR; check announcement in a screen reader or live-region test |
| 2.5 | Contrast fixes for muted text | `src/components/AppShell.tsx` footer and muted classes | WCAG AA | Colour change | Contrast scan before and after |

### Phase 3 - Form controls (P1/P2)

| Step | Action | Files | Benefit | Breaking changes | Testing |
|---|---|---|---|---|---|
| 3.1 | Native `<select>` → Native Select (keep native element) | 31 files (C2), starting with `src/components/sections/SubnetCalculator.tsx` | Consistent trigger styles | Class-only change | Change each select; check value and `onChange` still fire |
| 3.2 | Inline `<input>` → Input (and Field/Label where a visible label exists) | 50 files (C8) | Consistent focus and sizes; labels | If labels are added, layout may shift | Form-level tests where present |
| 3.3 | Range inputs → Slider (shared) | 16 files (C4) | One slider style and readout | Native `<input type="range">` replaced; `onChange` numeric value kept | `npm test`; manual drag on each route |
| 3.4 | Checkboxes → Checkbox | 22 files (C3) | Consistent colour; Radix semantics | `checked`/`onCheckedChange` API differs (`event.target.checked` → boolean) | Test each toggle; check dependent state |
| 3.5 | Quiz numeric input → Input | `src/components/ml/primitives/QuizRunner.tsx` | Consistency | None | Quiz tests |

### Phase 4 - Containers, tables and overlays (P2)

| Step | Action | Files | Benefit | Breaking changes | Testing |
|---|---|---|---|---|---|
| 4.1 | `NetworkingPanel`, `NetworkingMetric`, `TrackCard` → compose from Card | 3 components; 25 + 11 + 1 callers | One radius and shadow | Radius changes visually (`rounded-2xl` → `rounded-xl` unless set) | Visual diff on `/networking`, `/` |
| 4.2 | `NetworkingTable` → Table markup | `src/components/networking/NetworkingTable.tsx`, `globals.css:410-423` | Shared table styling | `.networking-table` class selectors change | `src/components/networking/networking.test.tsx` |
| 4.3 | Tooltips on essential `title=` cases | Triage across 118 places | Keyboard and touch access | Hover-only text becomes visible tooltips | Manual keyboard check |
| 4.4 | Accordion for `PracticeSection` | `src/components/sections/PracticeSection.tsx` | Standard keyboard and ARIA | Markup changes | Expand/collapse each item |
| 4.5 | Switch for `role="switch"` widgets | `AwsComplianceSection.tsx:600`, `DkSecurityScanSection.tsx:977` | Standard switch behaviour | Verify toggle state | `AwsComplianceSection.test.tsx` already asserts 5 `role="switch"` elements; keep the count |

### Phase 5 - Cleanup and governance (P3)

| Step | Action | Benefit | Testing |
|---|---|---|---|
| 5.1 | Document the design tokens and the component rules in `AGENTS.md` (use `src/components/ui` primitives; no new raw `<button>` styling) | Prevents regressions | Review |
| 5.2 | Add an ESLint rule or review checklist to flag new `<select>`, `<input type="range">`, `type="checkbox"` and `<table>` outside `src/components/ui` | Keeps migration from regressing | `npm run lint` |
| 5.3 | Remove unused `clsx`/`tailwind-merge` only if the `cn()` helper is not adopted (not expected) | Smaller dependency set | `npm run build` |

### Testing requirements (all phases)

- `npm test`: 107 tests across 21 files passed at the time of setup. Expect the same suite to pass after each phase.
- `npm run typecheck`, `npm run lint`, `npm run build`: run after each phase.
- **Browser checks:** Load `/`, `/networking`, `/aws`, `/security`, `/docker-k8s`, `/git-ops`, `/ml`, `/ml/progress` in light and dark themes at desktop and mobile widths.
- **Keyboard:** Tab through each migrated control; confirm focus is visible and Escape closes overlays.
- **Visual diff:** Capture screenshots of each route before and after Phases 1-4.

### Estimated effort

| Phase | Effort | Risk |
|---|---|---|
| 0 Foundation | Small | Low |
| 1 Quick wins | Small | Low |
| 2 Accessibility P0/P1 | Medium | Medium (sidebar behaviour) |
| 3 Form controls | Large (about 100+ edits across about 60 files) | Medium (checkbox/range API changes) |
| 4 Containers, tables, overlays | Medium | Low to Medium |
| 5 Governance | Small | Low |

---

## H. Components to Migrate vs Keep Custom

### Migrate

| Component | Target | Priority |
|---|---|---|
| `src/components/Sidebar.tsx` (mobile drawer) | Sheet | P0 |
| Progress bars (about 20 files) | Progress | P1 |
| `src/components/ml/primitives/QuizRunner.tsx` (radios, submit/retry buttons, numeric input) | Radio Group, Button, Input | P1 |
| `src/components/ml/primitives/Slider.tsx` | Slider | P2 (low effort, same primitive) |
| `src/components/CopyButton.tsx`, `ThemeToggle.tsx`, `BackToTop.tsx`, `ml/SectionQuizGate.tsx` (link-as-button) | Button | P2 |
| `src/components/networking/NetworkingPanel.tsx`, `NetworkingMetric.tsx`, `src/components/TrackCard.tsx` | Card (+ Badge) | P2 |
| `src/components/networking/NetworkingTable.tsx` and inline `<table>`s (31 files) | Table | P2 |
| `src/components/ml/primitives/ConceptCallout.tsx` | Alert | P3 |
| `src/components/sections/PracticeSection.tsx` (expandable items) | Accordion | P3 |
| `AwsComplianceSection.tsx:600`, `DkSecurityScanSection.tsx:977` (role=switch; ARIA already correct) | Switch | P3 (consistency only) |
| Native `<select>` (31 files) | Native Select | P2 |
| Native `<input type="range">` (16 files) | Slider | P2 |
| Native `<input type="checkbox">` (22 files) | Checkbox | P2 |
| Inline `<input>` (50 files) | Input (+ Field/Label) | P2 |
| Inline primary/outline buttons (73 files) | Button | P2 |
| `AwsTransitGatewaySection.tsx` text toast | Alert / Toast | P1 |

### Keep custom (Class D)

- `src/components/KnowledgeGraph.tsx` and `KnowledgeGraphSection.tsx` (d3 rendering)
- `src/components/ml/primitives/FunctionPlot.tsx`, `VectorCanvas.tsx`, `MatrixGrid.tsx`, `Surface3D.tsx` (three.js), `Katex.tsx`
- `src/components/ml/primitives/QuizRunner.tsx` **logic** (grading flow, progress store calls); only its controls migrate
- `src/components/ml/tracks/**` visualisations (`LossCurve`, `NetworkDiagram`, `DecisionBoundaryCanvas`, `BarChart`, `SoftmaxBars`)
- `src/components/sections/*` and `src/components/tracks/*` calculators, simulators and playgrounds (logic and domain layout)
- `src/components/networking/NetworkingModuleHeader.tsx`, `NetworkingExample.tsx`, `NetworkingTypes.ts` (domain layout)
- `src/components/AppShell.tsx` layout and scroll-restoration behaviour
- `src/components/Navbar.tsx` if it is ever revived for scroll-spy (currently dead; delete instead)

---

## Final Deliverable Summary

### 1. Concise executive summary

The project does not use shadcn/ui. There is no `components.json`, no `components/ui` directory, no `cva`, and no `cn()` helper. The codebase is a custom Tailwind component set with native controls and duplicated class strings. Visual language is coherent (slate neutrals, indigo accent, dark mode via `.dark`), but implementation is not. Three Radix packages (Dialog, Progress, Tabs) are installed without use, and the Radix Slider is used by one ML primitive. Adoption should start with a foundation (Phase 0), then fix the P0 mobile-sidebar accessibility problem, then migrate controls in batches.

### 2. Most important issues (with file paths)

1. **P0 - Mobile sidebar lacks modal semantics and focus management:** `src/components/Sidebar.tsx` (~L370-395).
2. ~~**P0 - Hover-only interaction**~~ withdrawn: `BranchSelector` already gives keyboard access to the same actions (`src/components/KnowledgeGraph.tsx`).
3. **P1 - Unlabelled progress bars:** about 20 files, e.g. `src/app/ml/progress/page.tsx`.
4. **P1 - Quiz radios without group label:** `src/components/ml/primitives/QuizRunner.tsx`.
5. **P1 - Unannounced validation text:** `src/components/tracks/AwsTransitGatewaySection.tsx:588-633, 1580`.
6. **P1 - Muted text fails WCAG AA contrast:** `src/components/AppShell.tsx` footer (`text-slate-400` on white, about 2.6:1).
7. **P1 - No shadcn foundation; duplicated controls:** 444 buttons (73 files), 100 selects (31), 52 checkboxes (22), 37 ranges (16), 235 inputs (50).
8. **P1 - Unused Radix dependencies:** `package.json` (`@radix-ui/react-dialog`, `react-progress`, `react-tabs`).
9. **P2 - 582 hardcoded hex colours and six border-radius values:** Global; e.g. `src/components/sections/DhcpSection.tsx:423`, `src/components/tracks/DkResourceQuotasSection.tsx:86`.
10. **P3 - Dead code:** `src/components/Navbar.tsx`, `src/components/FormulaBox.tsx` (0 importers).

### 3. Components that should be migrated

- Sidebar mobile drawer → **Sheet** (P0)
- Progress bars → **Progress** (P1)
- Quiz MCQ, submit, retry, numeric input → **Radio Group, Button, Input** (P1)
- `AwsTransitGatewaySection` text toast → **Alert** (P1)
- ML `Slider` wrapper → **Slider** (P2)
- `CopyButton`, `ThemeToggle`, `BackToTop`, `SectionQuizGate` link → **Button** (P2)
- `NetworkingPanel`, `NetworkingMetric`, `TrackCard` → **Card** (+ **Badge**) (P2)
- `NetworkingTable` and inline tables → **Table** (P2)
- Native selects → **Native Select** (P2)
- Native range inputs → **Slider** (P2)
- Native checkboxes → **Checkbox** (P2)
- `role="switch"` widgets → **Switch** (P3, consistency only; ARIA is already correct)
- `ConceptCallout` → **Alert** (P3)
- `PracticeSection` expandables → **Accordion** (P3)

### 4. Components that should remain custom

- Canvas, SVG and three.js visualisations (`FunctionPlot`, `VectorCanvas`, `MatrixGrid`, `Surface3D`, `DecisionBoundaryCanvas`, `LossCurve`, `NetworkDiagram`, `BarChart`)
- Knowledge graph (`KnowledgeGraph.tsx`, d3)
- KaTeX rendering (`Katex.tsx`)
- Quiz grading and progression logic (business logic inside `QuizRunner` and `SectionQuizGate`)
- Learning-track calculators, simulators and playgrounds (`src/components/sections/*`, `src/components/tracks/*`)
- Networking module layout components (`NetworkingModuleHeader`, `NetworkingExample`, `NetworkingTypes`)
- App shell layout and scroll behaviour (`AppShell.tsx`)

### 5. Prioritised migration roadmap

1. **Phase 0 - Foundation:** `components.json`, `cva`, `cn()` (reuse `clsx` and `tailwind-merge`), token bridge in `globals.css`, font-stack decision, add Button/Input/Label/Card/Badge/Alert/Table/Skeleton/Separator.
2. **Phase 1 - Quick wins:** delete dead `Navbar.tsx` and `FormulaBox.tsx`; migrate ThemeToggle, CopyButton, BackToTop, ML Slider; migrate progress bars to Progress.
3. **Phase 2 - Accessibility P0/P1:** Sidebar → Sheet; knowledge-graph keyboard access; quiz radios → Radio Group; validation → Alert; contrast fixes.
4. **Phase 3 - Form controls:** native selects → Native Select; inputs → Input (+ Field/Label); ranges → Slider; checkboxes → Checkbox.
5. **Phase 4 - Containers, tables, overlays:** Card composition; Table; tooltips for essential cases; Accordion; Switch.
6. **Phase 5 - Governance:** document the component rules in `AGENTS.md`; add a lint or review rule against new raw controls outside `src/components/ui`.

---

## Verification notes and limitations

- **Method:** Static analysis. Source was inspected with `grep` and by reading the named components and representative section files. Counts are from `grep` and are approximate.
- **Not done:** Browser runtime checks, keyboard walkthroughs, screen-reader testing, automated accessibility scanning (axe/Lighthouse), per-input label coverage, and full contrast measurement across all text. These are listed in Section E3 as follow-up work.
- **Docs reference:** The shadcn component list was fetched from https://ui.shadcn.com/docs/components. The page does not state the default primitive library (Radix or Base UI).
- **Test baseline:** `npm test` passed 107 of 107 tests across 21 files during setup (see the earlier setup work), so the suite is a valid regression guard for the phases above.
