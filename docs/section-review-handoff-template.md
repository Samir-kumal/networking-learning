# [Section Name] Review Handoff

## Purpose

Provide a repeatable handoff for auditing the **[Section Name]** track for:

- Factual accuracy.
- Unsupported assumptions.
- Misleading or absolute wording.
- Beginner-friendly sequencing.
- Broken examples, interactions, or navigation.

This is a review baseline and operating template. A new session MUST inspect the current repository and re-derive the scope before editing. Do not assume that this document's inventory is still current.

## Review metadata

- Section: `[Section Name]`
- Route: `/[route]`
- Owner or reviewer: `[name/session]`
- Last review date: `[YYYY-MM-DD]`
- Review status: `Not started | In progress | Complete | Blocked`

## Repository scope

- Page or route: `[path]`
- Tests: `[path or glob]`
- Components: `[path or glob]`
- Shared navigation: `[path]`
- Utilities and data: `[paths]`
- Related configuration: `[paths]`
- Repository rules: `AGENTS.md`

If code changes are required, read the applicable framework and repository guidance before editing.

## Current inventory

Replace this table with the current inventory discovered from the repository.

| Order | Group | Route or anchor | Component/file | Topic | Prerequisites |
|---:|---|---|---|---|---|
| 1 | `[group]` | `[id]` | `[component]` | `[topic]` | `[none or prerequisite]` |
| 2 | `[group]` | `[id]` | `[component]` | `[topic]` | `[prerequisite]` |
| 3 | `[group]` | `[id]` | `[component]` | `[topic]` | `[prerequisite]` |

The new session MUST:

- Enumerate every rendered module or subsection.
- Compare rendered items with navigation links and tests.
- Detect additions, omissions, duplicate anchors, and stale links.
- Confirm that every navigation target resolves exactly as intended.

## Review goal

Audit every item in the inventory. Do not stop after finding the first error.

### Claim categories

Review claims involving:

- `[domain concept 1]`
- `[domain concept 2]`
- `[domain concept 3]`
- Version-specific behavior.
- Vendor, provider, platform, or operating-system defaults.
- Configuration examples and command output.
- Numerical examples, limits, ports, APIs, and formulas.
- Security, reliability, performance, or compatibility statements.

Classify each claim as one of:

- Confirmed.
- Confirmed but needs qualification.
- Incorrect.
- Ambiguous or implementation-dependent.
- Requires a source.
- Local simulator behavior only.

Distinguish clearly between:

- Standards-defined behavior.
- Official vendor or provider behavior.
- Common defaults.
- Local project conventions.
- Illustrative examples.
- Simplified teaching models.

Do not turn an unknown or deployment-dependent behavior into a universal statement.

## Absolute-language audit

Search for wording such as:

- `always`
- `never`
- `exactly`
- `only`
- `guarantees`
- `secure`
- `automatically`
- `seamless`
- `all`
- `none`

Replace absolute wording when the result depends on configuration, implementation, version, hardware, operating system, provider, or environment.

## Beginner progression

Document the intended learning order here:

1. `[foundation or prerequisite]`
2. `[core concept]`
3. `[calculation or guided example]`
4. `[applied configuration or workflow]`
5. `[operations, security, or troubleshooting]`
6. `[practice or assessment]`

Check that:

- Prerequisites appear before dependent concepts.
- Examples use concepts already introduced.
- Advanced terminology is defined before use.
- Practice tests the preceding material.
- The navigation order matches the intended progression.

If the order changes, update the page, navigation, and ordering tests together.

## Claim audit matrix

Maintain one row for every module or subsection reviewed.

| Item | Status | Findings | Sources | Changes made | Recheck |
|---|---|---|---|---|---|
| `[anchor/component]` | `[status]` | `[summary]` | `[URLs]` | `[summary or none]` | `[yes/no]` |

## Source register

Use primary sources first. Add claim-specific sources as the review progresses.

| Topic | Primary source | URL | Relevant section |
|---|---|---|---|
| `[topic]` | `[standard or official documentation]` | `[URL]` | `[section]` |
| `[topic]` | `[standard or official documentation]` | `[URL]` | `[section]` |
| `[topic]` | `[standard or official documentation]` | `[URL]` | `[section]` |

Source rules:

- Prefer standards bodies, official vendor documentation, and official project documentation.
- Use secondary sources only when a primary source is unavailable or unclear.
- Record the exact URL and relevant section.
- Do not cite a source for a claim it does not actually support.
- Note when a source is version-specific or provider-specific.

## Implementation rules

When corrections are required:

- Fix the claim at its source.
- Preserve correct calculations and examples.
- Label defaults as defaults.
- Label examples as illustrative when they do not model a complete implementation.
- Keep provider-specific behavior explicitly provider-specific.
- Avoid unrelated refactors and visual restyling.
- Do not add fallback text that hides an incorrect model.
- Remove obsolete wording rather than leaving contradictory explanations.

## Test requirements

Tests should verify observable behavior, including:

- Group or section anchors exist and appear in order.
- Every navigation target resolves.
- Every rendered module is present exactly as intended.
- Prerequisite ordering is preserved where it is an intentional contract.
- Numerical examples and calculations have deterministic coverage where applicable.
- Interactive controls produce the expected visible result where applicable.
- New observable behavior has a focused behavior test.

Do not add tests for incidental markup, implementation details, or source text alone.

## Verification commands

Run the commands appropriate to this section and record the exact results:

```bash
npm test
npm run typecheck
npm run build
npm run lint
```

Additional section-specific checks:

```bash
# `[command]`
# `[command]`
```

### Browser or runtime smoke check

Verify the relevant route or runtime behavior:

- Route loads successfully: `/[route]`
- Main heading is visible.
- All expected groups or modules render.
- Navigation targets resolve.
- Primary interactions work.
- No visible error, missing content, or duplicate section appears.

For non-UI sections, replace this with the relevant CLI, API, deployment, or runtime scenario.

## Review decisions

Record intentional decisions and tradeoffs here:

- `[decision]`
- `[decision]`
- `[decision]`

## Known caveats and remaining risks

List claims that vary by:

- Product or vendor.
- Version.
- Configuration.
- Hardware capability.
- Operating system.
- Cloud region or regulatory domain.
- Local simulator assumptions.

- `[caveat or unresolved claim]`
- `[caveat or unresolved claim]`

## Review record

- Inventory completed: `[yes/no]`
- Claim audit completed: `[yes/no]`
- Source register completed: `[yes/no]`
- Beginner order reviewed: `[yes/no]`
- Tests: `[result]`
- Typecheck: `[result]`
- Build: `[result]`
- Lint: `[result]`
- Browser/runtime smoke test: `[result]`
- Remaining blockers: `[none or details]`

## Required final response

A completed review MUST report:

1. Files changed.
2. Items reviewed and any newly discovered items.
3. Claims corrected, qualified, or left unresolved.
4. Sources consulted, with URLs.
5. Organization changes and prerequisite rationale.
6. Exact test, typecheck, build, lint, and browser/runtime results.
7. Remaining implementation-dependent claims or follow-up risks.

## New-session prompt

Use this prompt when starting a review in a fresh session:

```text
Review the [Section Name] track in this repository using docs/section-review-handoff-template.md.

First inspect the repository and derive the current page, module, navigation, test, and utility inventory. Do not trust a stale list. Read every in-scope module completely.

Audit all factual claims against primary standards and official documentation. Classify claims as confirmed, qualified, incorrect, implementation-dependent, local simulator behavior, or requiring a source. Pay special attention to absolute language, version-specific behavior, provider defaults, numerical examples, security claims, and performance claims.

Review the content for beginner-first prerequisite order. Change the ordering only when the dependency is clear, and update page, navigation, and ordering tests together.

Correct inaccurate claims at their source. Do not add unsupported assumptions, unrelated refactors, visual restyling, stubs, or misleading fallbacks.

Update focused behavior tests where the observable contract changes. Run the relevant tests, typecheck, build, lint, and a browser or runtime smoke check.

Final response must include changed files, complete inventory, corrections, sources with URLs, organization decisions, exact verification results, and remaining risks.
```
