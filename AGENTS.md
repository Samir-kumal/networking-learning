<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Repository Agent Guide

This file is the canonical repository guidance for coding agents. `CLAUDE.md` delegates to it with `@AGENTS.md`.

## Repository context

- Project: `networking-learning`, a Next.js App Router learning application.
- Package versions observed during this inventory: Next.js `16.3.0`, React `19.2.8`, TypeScript `5.x`, Vitest `4.1.10`, and ESLint `9.x`.
- Main code lives in `src/app`, `src/components`, `src/components/tracks`, `src/sections`, and `src/lib`.
- Learning-track routes include `/networking`, `/aws`, `/security`, `/docker-k8s`, and `/git-ops`.
- Validation scripts are defined in `package.json`: `npm test`, `npm run typecheck`, `npm run build`, and `npm run lint`.
- The repository contains handoff and review documents under `docs/`, plus design specs and implementation plans under `docs/superpowers/`.

## Skill inventory baseline

Inventory date: 2026-08-14.

- **17 unique built-in skills** are available in the session skill registry.
- **1 repository-local `SKILL.md` definition** exists at `.claude/skills/section-handoff-review/SKILL.md`.
- The local definition has the same name as the built-in `section-handoff-review` skill and provides the repository-specific procedure; count it as an augmentation, not a nineteenth unique skill.
- Therefore this repository currently has **18 skill definitions from 17 unique skill names**.
- `.claude/skills/networking-handoff-review/` is present but empty; it is not a skill until it contains a `SKILL.md`.

The inventory below is operational guidance. “Auto-detect” means the agent should recognize the stated signals and invoke the skill before taking the corresponding action; it does not mean the tool will invoke a skill without an agent decision.

## Skill invocation order

1. Apply the always-on `using-superpowers` bootstrap at the start of every task. On Pi, map skill actions to the native `read`, `write`, `edit`, `bash`, `grep`, `glob`, `todo`, and `hub` tools as applicable.
2. Classify the request before editing:
   - New behavior, creative work, UI, or documentation design: `brainstorming`.
   - A bug, failing test, regression, or unexpected result: `systematic-debugging`.
   - A feature or bugfix with an observable contract: `test-driven-development`.
   - A written multi-step implementation requirement: `writing-plans`.
   - Work that needs isolation: `using-git-worktrees`.
3. Add the domain or execution skill(s) identified by the task. Multiple skills may apply.
4. For independent workstreams, use `dispatching-parallel-agents` and, when executing a plan with delegated implementation tasks, `subagent-driven-development`.
5. Before claiming completion, committing, or opening a PR, invoke `verification-before-completion`. Use `requesting-code-review` for a final review request and `finishing-a-development-branch` when deciding how to integrate the branch.

Process skills take precedence over implementation skills. Do not use a later skill to bypass an earlier approval, debugging, planning, isolation, or verification gate. If a user explicitly names a skill, include it even when the task would otherwise be auto-detected.

## Complete skill routing guide

### 1. `brainstorming`

- **Trigger automatically when:** creating a feature, component, subsystem, documentation design, or any behavior change; requirements are ambiguous; the work is creative; or no existing flow clearly bounds the change.
- **What it provides:** scope classification, context questions, competing approaches, design sections, approval gates, and escalation when hidden complexity appears.
- **Required behavior:** classify as spike, bounded, or architectural; inspect context first; present the short design or full design; wait for explicit approval before implementation. Architectural work proceeds to `writing-plans` only after the approved design/spec.
- **Do not skip because:** the change looks small, is “just configuration,” or appears obvious.

### 2. `claude-automation-recommender`

- **Trigger automatically when:** the user asks how to improve Claude Code workflows, recommends hooks, subagents, skills, plugins, MCP servers, automations, or project setup for Claude Code.
- **What it provides:** a codebase-aware assessment and prioritized automation recommendations.
- **Required behavior:** inspect the repository and existing configuration before recommending additions; distinguish useful automation from unnecessary complexity; do not silently install or modify automations unless requested.

### 3. `dispatching-parallel-agents`

- **Trigger automatically when:** two or more workstreams are genuinely independent, the user explicitly asks to parallelize, or the task can be safely divided into concurrent slices with a defined contract.
- **What it provides:** decomposition, shared contracts, concurrency, and coordination rules.
- **Required behavior:** own the top-level decomposition; dispatch one batch for independent slices; give each worker exact files, acceptance criteria, and a no-mid-flight-validation constraint; never parallelize sequential dependencies or invent work merely to increase fan-out.

### 4. `executing-plans`

- **Trigger automatically when:** executing an already-written implementation plan in a separate session or when the plan explicitly requires review checkpoints.
- **What it provides:** plan execution with checkpointed review and controlled progression.
- **Required behavior:** read the complete plan, verify prerequisites, execute in order, stop at specified review checkpoints, and report evidence. Do not silently rewrite the plan to reduce scope.

### 5. `frontend-design`

- **Trigger automatically when:** building a new interface, reshaping an existing interface, changing visual hierarchy, or making a UI feature distinctive and intentional.
- **What it provides:** visual direction, layout, typography, interaction, responsive behavior, and refinement guidance.
- **Required behavior:** use after the applicable process/design gate; inspect existing components and styles first; preserve the project's visual language unless a redesign is requested; verify the result in a browser rather than relying only on static code checks.

### 6. `finishing-a-development-branch`

- **Trigger automatically when:** implementation and verification are complete and the next decision is merge, PR, handoff, cleanup, or branch retention.
- **What it provides:** a disciplined integration decision based on actual branch state and verification evidence.
- **Required behavior:** run `verification-before-completion` first; inspect changed files and remaining risks; present integration options grounded in the current repository state; do not claim a branch is ready without evidence.

### 7. `receiving-code-review`

- **Trigger automatically when:** code-review feedback, PR comments, requested changes, or reviewer concerns arrive.
- **What it provides:** technical evaluation of feedback before implementation.
- **Required behavior:** reproduce or verify the concern, check whether it applies to the current code, identify trade-offs, and implement only technically justified changes. Do not agree performatively or blindly apply suggestions.

### 8. `requesting-code-review`

- **Trigger automatically when:** completing a major feature, significant refactor, load-bearing change, or work that is about to be merged.
- **What it provides:** a structured review request and a final quality check against requirements.
- **Required behavior:** gather exact diff and verification evidence, state known risks and review focus, request review before integration when the change warrants it, and resolve findings through `receiving-code-review`.

### 9. `section-handoff-review`

- **Trigger automatically when:** the user asks to audit a learning-track handoff, compare a handoff document with implementation, check a section and route, or invokes `/section-handoff-review <section> <route>`.
- **Repository-specific source:** `.claude/skills/section-handoff-review/SKILL.md` is the authoritative local augmentation.
- **What it provides:** inventory drift, factual-claim, source-validity, sequencing, navigation, test-quality, build, and browser/runtime auditing.
- **Required behavior:** inspect current repository and working-tree state first; derive the complete route/module/navigation/test scope; read every in-scope module; fact-check significant claims against primary sources; classify claims; run applicable validation; smoke-test the route in a browser; default to read-only. Modify files only after explicit implementation authorization.
- **Required output:** report review status, requested section/route, handoff used, inventory/order issues, claim-audit matrix, sources, exact verification results, and remaining risks.

### 10. `systematic-debugging`

- **Trigger automatically when:** a bug, test failure, build failure, lint failure, regression, flaky result, runtime error, or unexpected behavior is reported or observed.
- **What it provides:** reproduction, evidence gathering, root-cause isolation, hypothesis testing, and regression confirmation.
- **Required behavior:** reproduce before editing; narrow the failure to its source; test the smallest evidence-backed fix; rerun the original failing scenario and relevant checks. Do not suppress symptoms, add unexplained special cases, or guess from a single error message.

### 11. `subagent-driven-development`

- **Trigger automatically when:** executing an approved implementation plan with independent delegated tasks in the current session, or when the task is explicitly structured around subagents.
- **What it provides:** task decomposition, worker contracts, integration sequencing, and review of delegated changes.
- **Required behavior:** delegate only well-bounded slices; define shared interfaces before dispatch; require workers to skip project-wide validation until the integration point; inspect and verify every claimed change; run validation once after integration.

### 12. `test-driven-development`

- **Trigger automatically when:** implementing a feature or bugfix that introduces or changes an observable contract, especially behavior in `src/lib`, route rendering, interactions, calculators, evaluators, or navigation.
- **What it provides:** failing-test-first workflow, minimal implementation, and regression protection.
- **Required behavior:** identify the contract and boundary cases; add a deterministic test that fails for the old behavior; implement the smallest correct change; run the focused test and then the relevant repository checks. Do not add tests for incidental implementation details or defaults with no observable contract.

### 13. `using-git-worktrees`

- **Trigger automatically when:** starting feature work that needs isolation, executing an implementation plan, or making changes while the current working tree contains unrelated work.
- **What it provides:** safe isolated workspace setup and branch/worktree discipline.
- **Required behavior:** inspect repository state before isolation; use the native worktree mechanism when available; preserve unrelated user changes; never discard or overwrite unowned work; re-ground paths after entering the isolated workspace.

### 14. `using-superpowers`

- **Trigger automatically when:** starting every conversation or task. This session has already supplied the bootstrap, so do not redundantly reload the same skill content.
- **What it provides:** skill discovery, mandatory skill selection, process gates, tool mapping, and the rule that applicable skills are not optional.
- **Required behavior:** check for applicable skills before any response or tool action; on Pi use the native skill/tool mapping in `references/pi-tools.md`; follow user instructions over skill defaults; do not invent unavailable subagent or task-list tools.

### 15. `verification-before-completion`

- **Trigger automatically when:** about to claim work is complete, fixed, passing, ready, merged, or before committing or creating a PR.
- **What it provides:** evidence-before-assertions discipline.
- **Required behavior:** run the command or scenario that exercises the changed contract; report exact commands and observed results; distinguish focused checks from full-suite validation; do not claim browser behavior, tests, builds, or source review that was not actually performed.

### 16. `writing-plans`

- **Trigger automatically when:** the user provides a multi-step implementation requirement, a feature spans multiple files or phases, or an approved architectural design needs an implementation plan.
- **What it provides:** an executable plan with exact files/symbols, ordered steps, dependencies, tests, and review points.
- **Required behavior:** inspect the repository before planning; reuse existing patterns; identify callsites and contracts; write a plan before implementation when the task is multi-step; do not turn a plan into a vague checklist. For architectural brainstorming, invoke this only after the approved design/spec.

### 17. `writing-skills`

- **Trigger automatically when:** creating, editing, or validating a `SKILL.md` skill definition or preparing a skill for deployment.
- **What it provides:** skill authoring structure, trigger clarity, workflow correctness, and deployment verification.
- **Required behavior:** use it for files under skill definitions; validate the skill's trigger language and examples; do not invoke it merely because this repository's `AGENTS.md` documents skills.

## Scenario routing matrix

| Detected request | Skills to invoke, in order |
|---|---|
| New feature or behavior change | `using-superpowers` → `brainstorming` → `writing-plans` if multi-step → `using-git-worktrees` if isolation is needed → `test-driven-development` → implementation → `verification-before-completion` |
| Bug or failing test | `using-superpowers` → `systematic-debugging` → `test-driven-development` for regression coverage → implementation → `verification-before-completion` |
| New or redesigned UI | `using-superpowers` → `brainstorming` → `frontend-design` → `test-driven-development` when behavior changes → browser verification → `verification-before-completion` |
| Explicit request to parallelize | `using-superpowers` → `dispatching-parallel-agents` → `subagent-driven-development` when executing an implementation plan → integration → `verification-before-completion` |
| Execute a written plan | `using-superpowers` → `executing-plans` → checkpoint reviews → `verification-before-completion` |
| Handoff/section audit | `using-superpowers` → `section-handoff-review`; keep audit read-only unless implementation is separately authorized |
| Review feedback received | `using-superpowers` → `receiving-code-review` → targeted verification → `verification-before-completion` |
| Request final review | `using-superpowers` → `requesting-code-review` → resolve findings with `receiving-code-review` → `verification-before-completion` |
| Branch is ready for integration | `verification-before-completion` → `finishing-a-development-branch` |
| Create or modify a skill | `using-superpowers` → `writing-skills` → focused validation → `verification-before-completion` |
| Recommend Claude Code automation | `using-superpowers` → `claude-automation-recommender` |

## Repository-specific guardrails

### Next.js and framework rules

- Before writing application code, read the relevant guide in `node_modules/next/dist/docs/` for this repository's installed Next.js version. Do not rely on generic or older Next.js assumptions.
- Preserve the generated `nextjs-agent-rules` block at the top of this file. It may be regenerated by `next dev`; do not remove or rewrite it.
- Follow existing App Router, component, styling, and route conventions. Prefer updating an existing focused module over introducing a parallel convention.

### Validation

- Use the narrowest check that proves the changed contract during iteration.
- Before completion, run the applicable full checks from the package scripts: `npm test`, `npm run typecheck`, `npm run build`, and `npm run lint`, unless the task is explicitly read-only or the environment makes one unavailable.
- For UI or route changes, run a browser/runtime smoke check that loads the affected route and exercises the changed interaction.
- Report exact command results, test counts when available, build/lint failures, and any environment-caused limitation.

### Scope and safety

- Treat uncommitted files and unrelated changes as user-owned. Inspect before editing and do not reset, delete, or overwrite them without explicit authorization.
- Search all relevant callsites before changing exported symbols or contracts.
- Update affected tests and docs when behavior changes; do not add speculative scope, shims, aliases, or deprecated paths.
- Handoff audits are read-only by default. An audit finding is not implementation authorization.
- Keep claims proportional to evidence. Distinguish standards-defined behavior, vendor behavior, project behavior, teaching simplifications, and simulator-only output.

## Maintaining this guide

- When a built-in or repository-local skill is added, removed, renamed, or materially changed, update the inventory count, source list, routing guide, and scenario matrix in the same change.
- Recount both **skill definitions** and **unique skill names**; do not hide local augmentations or count an empty skill directory.
- Keep generated framework instructions intact and append repository-specific guidance after them.
- If a local skill conflicts with a generic skill description, the local `SKILL.md` governs repository-specific behavior while the broader process gates still apply.
