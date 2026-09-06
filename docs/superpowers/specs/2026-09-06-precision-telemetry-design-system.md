# Precision Telemetry Console — Design System Specification

## 1. Overview & Architectural Direction

**Direction:** Direction A · Precision Telemetry Console  
**Target Surface:** `/networking` curriculum route (23 modules across 4 stages)  
**Core Goal:** Deliver an aesthetically pleasing, consistent, high-density technical learning interface with physical light-falloff hierarchy in both light and dark themes.

---

## 2. 4-Tier Semantic Surface Elevation System

To eliminate the "card-in-card" elevation collapse where parent cards and nested wells shared the same background color, all surfaces adhere to a 4-tier scale:

| Elevation Level | Semantic Role | Light Mode Value | Dark Mode Value | Contrast Behavior |
|---|---|---|---|---|
| **Level 0 (Canvas)** | Page background & overall viewport | `#f8fafc` (`slate-50`) | `#070b14` (deep midnight slate) | Base substrate with subtle telemetry signal grid |
| **Level 1 (Module Deck)** | 23 Top-level `.networking-module` cards | `#ffffff` (pure white) | `#0d1527` (elevated obsidian slate) | 1px border (`--border-l1`: `#e2e8f0` / `#1e293b`) + 24px ambient shadow in dark mode |
| **Level 2 (Recessed Well)** | Sub-panels, forms, diagrams, option cards | `#f1f5f9` (`slate-100`) | `#080d1a` (deep well) | **Physically darker than Deck in dark mode**, establishing a realistic tactile well |
| **Level 3 (Telemetry Inset)** | Terminal sandbox, Wireshark PCAPs, hex dumps | `#0b1329` (dark ink slate) | `#030712` (pitch black slate) | Always high-contrast dark telemetry across both themes |

---

## 3. Curricular Stage Color Matrix

Stage tones cascade from the parent `NetworkingSubsection` (`data-tone="..."`) or section-level tone overrides:

### Light Mode Tone Definitions

```css
/* Stage 01 · Foundations (Cyan) */
[data-tone="cyan"] {
  --networking-tone: #0891b2;
  --networking-tone-border: #a5f3fc;
  --networking-tone-surface: #ecfeff;
  --networking-tone-glow: rgb(8 145 178 / 0.12);
}

/* Stage 02 · Applied (Amber) */
[data-tone="amber"] {
  --networking-tone: #d97706;
  --networking-tone-border: #fde68a;
  --networking-tone-surface: #fffbeb;
  --networking-tone-glow: rgb(217 119 6 / 0.12);
}

/* Stage 03 · Operations (Violet) */
[data-tone="violet"] {
  --networking-tone: #7c3aed;
  --networking-tone-border: #ddd6fe;
  --networking-tone-surface: #f5f3ff;
  --networking-tone-glow: rgb(124 58 237 / 0.12);
}

/* Stage 04 · Evaluation (Lime) */
[data-tone="lime"] {
  --networking-tone: #65a30d;
  --networking-tone-border: #d9f99d;
  --networking-tone-surface: #f7fee7;
  --networking-tone-glow: rgb(101 163 13 / 0.12);
}
```

### Dark Mode Tone Definitions

```css
/* Stage 01 · Foundations (Cyan) */
.dark [data-tone="cyan"] {
  --networking-tone: #38bdf8;
  --networking-tone-border: #0e4c68;
  --networking-tone-surface: rgb(8 47 73 / 0.45);
  --networking-tone-glow: rgb(56 189 248 / 0.16);
}

/* Stage 02 · Applied (Amber) */
.dark [data-tone="amber"] {
  --networking-tone: #fbbf24;
  --networking-tone-border: #78350f;
  --networking-tone-surface: rgb(69 26 3 / 0.45);
  --networking-tone-glow: rgb(251 191 36 / 0.16);
}

/* Stage 03 · Operations (Violet) */
.dark [data-tone="violet"] {
  --networking-tone: #c4b5fd;
  --networking-tone-border: #4c1d95;
  --networking-tone-surface: rgb(46 16 101 / 0.45);
  --networking-tone-glow: rgb(196 181 253 / 0.16);
}

/* Stage 04 · Evaluation (Lime) */
.dark [data-tone="lime"] {
  --networking-tone: #bef264;
  --networking-tone-border: #365314;
  --networking-tone-surface: rgb(26 46 5 / 0.45);
  --networking-tone-glow: rgb(190 242 100 / 0.16);
}
```

---

## 4. Shared Primitive Contracts

| Primitive | Variant / Class | Semantic Level | Usage Pattern |
|---|---|---|---|
| `NetworkingPanel` | `default` | Level 1 Deck | Standard content box; inherits `--surface-l1` and `--border-l1` |
| `NetworkingPanel` | `muted` | Level 2 Recessed Well | Interactive playgrounds, settings trays, and scenario drawers; inherits `--surface-l2` and `--border-l2` |
| `NetworkingPanel` | `console` | Level 3 Telemetry Inset | Wireshark frames, hex inspection, bash CLI, and rule debug traces; inherits `--surface-l3` and `--border-l3` |
| `NetworkingModuleHeader` | `data-networking-header` | Level 1 Deck | Anchor target `#id`, stage glyph, index prefix, title, and top-edge hairline gradient via `--networking-tone` |
| `NetworkingMetric` | `data-networking-metric` | Level 2 / Stage | Real-time calculation readout (hosts, subnets, masks); stage-tinted surface and border |
| `NetworkingExample` | `data-networking-example` | Level 2 / Stage | Pedagogical scenario card with optional footer and copyable telemetry |
| `NetworkingTable` | `.networking-table` | Level 1 + Level 2 | Monospaced technical reference table; uppercase Level 2 headers with sticky positioning |

---

## 5. Inconsistencies Audited & Resolved Across the 23 Modules

| Area / File | Previous State | Resolved State |
|---|---|---|
| **All 23 Section Wrappers** | Hardcoded `bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700` with triple `card-shadow card-shadow card-shadow` and hardcoded `hover:border-indigo-300` | Refactored to `className="networking-module scroll-mt-24 rounded-2xl border p-6 sm:p-8 transition-colors"`; deck background, borders, and stage-aware hover colors now driven by `.networking-module` tokens |
| **NetworkingPanel** | Hardcoded arbitrary hexes (`#102235`, `#24445D`, `#08111F`) | Semantic tokens: default uses Level 1 Deck, muted uses Level 2 Recessed Well, console uses Level 3 Telemetry Inset |
| **NetworkingModuleHeader** | Flat border with no visual accent | Hairline telemetry accent gradient along the top edge driven by `--networking-tone` |
| **NetworkingTable** | Unstyled borders and plain white table background | Themed header using Level 2 surface, monospaced uppercase column headers, alternating row hover driven by `--networking-tone-surface` |
| **Stage Progress Signals** | Hardcoded `index === 0` for all 4 stages (only 1 bar lit up in every subsection) | Dynamic `stageIndex = Math.max(0, parseInt(label.slice(0, 2), 10) - 1)`: Stage 1 lights 1 bar, Stage 2 lights 2 bars, Stage 3 lights 3 bars, Stage 4 lights 4 bars |
| **Stage Glyphs** | Generic symbol repeated everywhere | Stage-specific geometric telemetry glyphs: `⬡` (Foundations), `◈` (Applied), `⌁` (Operations), `✓` (Evaluation) |
| **Wireshark Terminal (`PacketSection`)** | Hardcoded light card wrapping a dark console | Unified Level 3 Telemetry Well with Level 2 titlebar and Level 1 display filter input |
| **CLI Sandbox (`DiagnosticsSection`)** | White/slate-800 window header inside console panel | Unified Level 3 dark terminal with Level 2 header bar and prompt bar |
| **NACL Rule Inspector (`SecuritySection`)** | Nested slate-50/700 form inside dark card | Level 2 container with Level 1 inputs and Level 3 rule evaluation trace |
| **Quiz Options (`QuizSection`)** | Hardcoded GitHub green `#238636` for reset button | Unified `bg-emerald-600 hover:bg-emerald-500 font-mono shadow-md shadow-emerald-500/20` |

---

## 6. Verification Evidence

- **Unit Tests:** 100/100 tests passed across 20 test files (`npm test`)
- **Page Tests:** 7/7 passed (`src/app/networking/page.test.tsx`)
- **TypeScript:** 0 type errors (`npm run typecheck`)
- **ESLint:** 0 errors, 0 warnings (`npm run lint`)
- **Production Build:** Static page optimization completed successfully (`npm run build`)
- **Visual Smoke Test:** 
  - Light mode: Canvas `#f8fafc`, Deck `#ffffff`, Border `#e2e8f0`
  - Dark mode: Canvas `#070b14`, Deck `#0d1527`, Recessed Well `#080d1a`, Telemetry Inset `#030712`
  - 390px mobile viewport: Zero horizontal scroll overflow, all 23 headers and modules present
  - 0 browser console errors, 0 page errors
