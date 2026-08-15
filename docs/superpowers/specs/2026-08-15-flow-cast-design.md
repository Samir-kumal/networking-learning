# Flow-Cast: Universal Learning-Flow Animation Skill

**Date:** 2026-08-15
**Status:** Approved

## Goal

Build `flow-cast`: a standalone, publicly distributable tool that (1) detects
what kind of front-end project it is pointed at, (2) scaffolds an animated,
educational request/data-flow diagram (client → server → cache → database,
TCP handshake, DNS resolution, pub/sub, load balancing) appropriate to that
stack, and (3) is installable in any project — via a plain CLI (`npx flow-cast
install <path>`) and via a Claude Code plugin (`/plugin marketplace add
Samir-kumal/flow-cast`). It must work independently of this repository and of
any single Claude Code session.

## Context

This repository (`networking-learning`) is a Next.js learning app with no
existing animation tooling (bare `next`/`react`/`tailwindcss`, no Framer
Motion, no React Flow, no GSAP). Researching how "beautiful animated
request-flow" diagrams are built surfaced two parallel needs the user wants
solved once, reusably, not just for this repo:

1. A concrete way to animate a request/cache/DB-style flow inside a React/
   Next.js app (React Flow + Framer Motion, or GSAP MotionPath).
2. A way to get the same capability into *any future project* — including
   plain HTML/vanilla-JS sites that have no build step — without re-deriving
   the library choice and wiring every time.

Several public Claude Code skills already generate static/animated
architecture diagrams as standalone HTML (`tt-a1i/archify`, 12.8k★;
`Cocoon-AI/architecture-diagram-generator`, 6.9k★). None of them are scoped
to *timed, protocol-accurate learning flows* (cache hit/miss branching,
TTL, handshake steps) or ship a deterministic non-agent CLI installer, which
is what this project adds.

## Approved approach

Single repository, single npm package. The CLI is the one implementation;
the Claude Code plugin is a thin skill that shells out to the CLI and then
does the judgment work (exact wording, styling, sequencing refinement) that
doesn't belong in a mechanical script. Rejected alternatives: plugin-only
(loses the Claude-independent CLI the user explicitly wants), two separate
repos (unnecessary versioning overhead for a single-maintainer v1 tool).

## Design

### Repository layout (`Samir-kumal/flow-cast`, public)

```
flow-cast/
  package.json                 # npm package "flow-cast", bin: flow-cast
  bin/flow-cast.js              # CLI entry point
  src/
    detect.js                  # stack fingerprint (pure function)
    installer.js                # orchestration: detect -> template -> render -> write
    templates/
      index.js                 # template registry
      request-cache-db.json
      tcp-handshake.json
      dns-resolution.json
      pub-sub.json
      load-balancing.json
    render/
      react.js                 # React Flow + Framer Motion generator
      html.js                   # self-contained SVG + GSAP generator
      shared/layout.js          # auto-layout shared by both renderers
    skill/
      SKILL.md                  # written into <target>/.claude/skills/flow-cast/
      reference.md               # template schema reference, for composing new templates
  .claude-plugin/
    marketplace.json             # Claude Code plugin marketplace manifest
  plugins/
    flow-cast/
      SKILL.md                   # thin wrapper skill: delegates to the CLI
  test/
    detect.test.js
    render-react.test.js
    render-html.test.js
    installer.test.js
  fixtures/
    next-app-router/
    next-pages-router/
    react-vite/
    plain-html/
    unsupported-vue/
  README.md
```

### Stack detection (`src/detect.js`)

Pure function `detect(targetPath) -> { stack, details }`. No filesystem
writes, no side effects — trivially unit-testable against fixtures.

Rules, in order:

1. Read `<target>/package.json` if present.
2. `next` in dependencies/devDependencies → `stack: "nextjs"`. Further
   distinguish `router: "app"` (an `app/` directory exists) vs
   `router: "pages"` (a `pages/` directory exists, no `app/`) — this decides
   whether the generated component needs a `"use client"` directive and
   where it's written.
3. `react` present without `next` → `stack: "react"` (Vite/CRA-style SPA).
4. No `package.json`, or one present with neither `react` nor `next`, and an
   `index.html` exists at the target root or under `public/`/`src/` →
   `stack: "html"`.
5. Anything else (Vue/Svelte/Angular dependencies found, or no recognizable
   signal at all) → `stack: "unsupported"`, with `details.detected` listing
   whatever *was* found, so the CLI can print a specific, honest message
   instead of guessing or silently no-op'ing.

### Template schema — the curated learning-flow library

Stack-agnostic JSON. Each template has `nodes` (id, label, kind — actor /
service / cache / datastore) and `steps` (an ordered array of edges with
`from`, `to`, `label`, `duration`, and an optional `branch` step type for
conditional forks such as cache hit vs. miss).

v1 ships five templates, chosen because their content is standards-defined
and independently verifiable (matching this repo's own accuracy bar), not
generic hand-waved "microservices":

- `request-cache-db` — the original client → server → Redis → DB example,
  with a cache-hit/cache-miss branch and a TTL-driven cache population step.
- `tcp-handshake` — SYN / SYN-ACK / ACK.
- `dns-resolution` — recursive resolver walking root → TLD → authoritative.
- `pub-sub` — publisher → broker → multiple subscribers, fan-out timing.
- `load-balancing` — client → load balancer → one of N backend instances,
  with a health-check/failover branch.

Example (`request-cache-db.json`, abbreviated):

```jsonc
{
  "id": "request-cache-db",
  "title": "Request \u2192 Cache \u2192 Database",
  "nodes": [
    { "id": "client", "label": "Client", "kind": "actor" },
    { "id": "server", "label": "App Server", "kind": "service" },
    { "id": "cache", "label": "Redis", "kind": "cache" },
    { "id": "db", "label": "Database", "kind": "datastore" }
  ],
  "steps": [
    { "from": "client", "to": "server", "label": "GET /resource", "duration": 600 },
    { "from": "server", "to": "cache", "label": "GET key", "duration": 500 },
    { "branch": "cache-hit", "condition": "key exists & TTL valid",
      "then": [{ "from": "cache", "to": "server", "label": "cached value", "duration": 500 }],
      "else": [
        { "from": "server", "to": "db", "label": "SELECT ...", "duration": 700 },
        { "from": "db", "to": "server", "label": "row(s)", "duration": 600 },
        { "from": "server", "to": "cache", "label": "SET key (TTL)", "duration": 400 }
      ] },
    { "from": "server", "to": "client", "label": "200 OK", "duration": 500 }
  ]
}
```

### Render pipeline

- `render/react.js`: template JSON → one self-contained client component
  (`.tsx`). Nodes/edges become React Flow elements; `steps` drive a Framer
  Motion timeline (sequential state machine moving a "packet" element along
  each edge in order, pausing and color-shifting at `branch` steps).
- `render/html.js`: template JSON → one self-contained `.html` file — inline
  `<svg>`, GSAP + MotionPathPlugin via CDN `<script>` tags, a small vanilla-JS
  function walking the same `steps` array. No build step required.
- Both renderers consume `render/shared/layout.js` for automatic node
  positioning (left-to-right DAG; `branch` steps fan out vertically) — no
  template ever hand-specifies coordinates.

### Installer flow (`flow-cast install [path] [--template=<id>] [--list] [--force]`)

1. Resolve target path — defaults to `process.cwd()` when omitted (this is
   how the tool satisfies "parameterize by `pwd`" without forcing the user
   to type it explicitly).
2. Run `detect()`. `stack: "unsupported"` → print detected signals and the
   list of supported stacks, exit 1. No partial or silent scaffold.
3. `--list` → print the 5 template ids + one-line descriptions, exit 0.
4. No `--template` given → print the same list and instruct the user to
   re-run with `--template=<id>`, exit 0. v1 is intentionally
   non-interactive (no prompt-library dependency, no TTY assumptions —
   scriptable and CI-friendly).
5. Render the selected template for the detected stack. Write output to the
   target's existing component convention:
   - `nextjs`/`react` → `<target>/src/components/flow-cast/<id>.tsx` (or
     `<target>/components/flow-cast/<id>.tsx` if no `src/` dir exists).
   - `html` → `<target>/flow-cast/<id>.html`.
   Abort with a specific "file already exists" error unless `--force` is
   passed.
6. Write/overwrite `<target>/.claude/skills/flow-cast/SKILL.md` (rendered
   from `src/skill/SKILL.md`, parameterized with the detected stack) — this
   is the only pre-existing-file class the installer is allowed to
   overwrite, and only its own file.
7. Print next steps:
   - `nextjs`/`react`: the exact `npm install @xyflow/react framer-motion`
     line plus the import path of the generated component. **The installer
     never edits the target's `package.json` or lockfile itself** — this
     was an explicit decision to keep blast radius on an arbitrary target
     repo minimal.
   - `html`: "open `<file>` directly in a browser" (fully self-contained via
     CDN, nothing to install).

### Error handling

Every failure path gets one specific, actionable message — no stack traces
surfaced, no silent no-ops:

| Condition | Behavior |
|---|---|
| Target path doesn't exist / isn't a directory | Exit 1, exact path echoed |
| Target directory not writable | Exit 1, exact path echoed |
| Detected stack unsupported | Exit 1, lists what *was* detected + supported stacks |
| Unknown `--template` value | Exit 1, lists valid ids |
| Output file already exists, no `--force` | Exit 1, exact file path, suggests `--force` |
| No `--template` and not `--list` | Exit 0, prints template list (not an error — a prompt for the next command) |

### Claude Code plugin (`.claude-plugin/marketplace.json` + `plugins/flow-cast/SKILL.md`)

`marketplace.json` registers a single plugin, `flow-cast`, sourced from
`./plugins/flow-cast`. Its `SKILL.md` frontmatter description triggers on
requests to animate/visualize a request flow, architecture diagram, or
protocol sequence for teaching purposes. Its body instructs the agent to:

1. Run `npx flow-cast@latest install $(pwd) --list` to see available
   templates (or detect the closest match from the user's description).
2. Run `npx flow-cast@latest install $(pwd) --template=<id>`.
3. Read the generated file and refine it for the user's exact scenario —
   labels, extra branch steps, styling — using `src/skill/reference.md`
   (the template schema doc) as the contract for what's safe to hand-edit.

This keeps all mechanical logic (detection, layout, rendering) in the
tested CLI, and reserves the agent for exactly the judgment calls a script
shouldn't make.

## Testing plan (in the `flow-cast` repo, not this one)

- `detect.test.js`: fixtures for `next-app-router`, `next-pages-router`,
  `react-vite`, `plain-html`, `unsupported-vue` → asserts exact
  classification and `details` payload for each.
- `render-react.test.js` / `render-html.test.js`: for all 5 templates,
  assert the rendered output parses (TSX via the TypeScript compiler API;
  HTML via a well-formedness check), contains every node and step label
  from the source template, and has no unresolved placeholder tokens.
- `installer.test.js`: end-to-end runs of the real CLI against temp copies
  of the fixture targets — asserts correct file placement per stack,
  correct `SKILL.md` contents, and the exact exit code/message for each row
  in the error-handling table above.
- CI: GitHub Actions running the above on every push (`npm test`), matching
  the "public, installable, trustworthy" bar implied by publishing to npm
  and the Claude plugin marketplace.

## Acceptance criteria

- `npx flow-cast install <path>` run against a fresh Next.js (app router),
  Next.js (pages router), Vite+React, and plain-HTML fixture each produce a
  working, stack-appropriate animated component for at least the
  `request-cache-db` template, with no target `package.json`/lockfile
  changes.
- Running against an unsupported stack (e.g. a Vue project) exits
  non-zero with a message naming what was detected — never a silent no-op,
  never a wrong-stack scaffold.
- All 5 templates render for both the React and HTML pipelines.
- `.claude/skills/flow-cast/SKILL.md` is present in the target repo after
  install and correctly reflects the detected stack.
- `/plugin marketplace add Samir-kumal/flow-cast` successfully registers the
  plugin in a Claude Code session, and invoking it drives the same CLI.
- `npm test` passes in the `flow-cast` repo covering every row of the
  detection matrix, all 5 templates × 2 renderers, and the full
  error-handling table.

## Non-goals (v1)

- No Vue/Svelte/Angular detection or rendering — architecture allows adding
  a new `detect` branch + `render/*.js` later without touching existing
  code, but it does not ship now.
- No automatic `npm install` / `package.json` mutation in the target repo.
- No interactive/TTY prompt flow — CLI is fully flag-driven.
- No private npm registry or paid distribution — public npm package, public
  GitHub repo, public Claude Code plugin marketplace entry.
- No changes to this repository (`networking-learning`) itself; `flow-cast`
  is a fully independent repository and package. A future, separate task
  can adopt it here once published.
- No generic "compose any diagram from scratch" mode in v1 — only the 5
  curated templates. A template-authoring path exists
  (`src/skill/reference.md` + the JSON schema) for adding more later.
