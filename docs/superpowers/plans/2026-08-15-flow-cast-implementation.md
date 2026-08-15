# Flow-Cast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish `flow-cast` — a standalone CLI + Claude Code plugin that detects a target project's stack (Next.js App Router / Next.js Pages Router / React / plain HTML) and scaffolds an animated, educational request-flow diagram (React Flow + Framer Motion, or self-contained SVG + GSAP) from a curated library of five protocol/pattern templates.

**Architecture:** Single Node.js (ESM) package. `src/detect.js` fingerprints the target. `src/templates/*.json` hold five stack-agnostic flow definitions. `src/render/{react,html}.js` turn a template into a stack-specific self-contained file, sharing `src/render/shared/layout.js` (auto-positioning) and `src/render/shared/flattenSteps.js` (branch-outcome playback logic, embedded verbatim into every generated file via `Function.prototype.toString()`). `src/installer.js` orchestrates detect → render → write, and also writes `.claude/skills/flow-cast/{SKILL.md,reference.md}` into the target repo. `bin/flow-cast.js` is the CLI entry point. `.claude-plugin/marketplace.json` + `plugins/flow-cast/SKILL.md` register the same CLI as a Claude Code plugin.

**Tech Stack:** Node.js >=18, ESM (`"type": "module"`), Vitest for tests, TypeScript compiler API (dev-only, for TSX syntax validation), `node-html-parser` (dev-only, for HTML well-formedness checks). No runtime dependencies. GitHub repo `Samir-kumal/flow-cast` (public), published to npm as `flow-cast`.

**Spec:** `docs/superpowers/specs/2026-08-15-flow-cast-design.md`

## Global Constraints

- Node >=18, package uses `"type": "module"` (ESM everywhere, including `bin/flow-cast.js`).
- `flow-cast` itself has **zero runtime dependencies**. `@xyflow/react`/`framer-motion` are only ever printed as an install instruction for the *target* project; GSAP is loaded via CDN `<script>` tags inside generated HTML output — neither is ever a dependency of this package.
- The installer **never** writes to a target repo's `package.json` or lockfile. The only files it writes are the new component/HTML file and `.claude/skills/flow-cast/{SKILL.md,reference.md}`.
- CLI is fully flag-driven — no interactive/TTY prompts.
- Every template id and generated component id is kebab-case; generated React component names are PascalCase (`<kebab-id>` → `<PascalCase>Flow`).
- Package/repo name is `flow-cast` (not `flowcast` — that npm name is already taken by an unrelated package, confirmed via registry lookup during brainstorming).

---

### Task 1: Repo bootstrap, package scaffold, first passing smoke test

**Files:**
- Create (in a new `Samir-kumal/flow-cast` GitHub repo, cloned to `/root/Documents/flow-cast`): `package.json`, `.gitignore`, `LICENSE`, `vitest.config.js`, `bin/flow-cast.js`
- Test: `test/cli.test.js`

**Interfaces:**
- Produces: a runnable `node bin/flow-cast.js` entry point that later tasks extend with the `install` subcommand.

- [ ] **Step 1: Create the GitHub repo and clone it**

```bash
cd /root/Documents
gh repo create Samir-kumal/flow-cast --public \
  --description "Detects your project's stack and scaffolds an animated, educational request/data-flow diagram." \
  --clone
cd flow-cast
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "flow-cast",
  "version": "0.1.0",
  "description": "Detects your project's stack and scaffolds an animated, educational request/data-flow diagram: cache/database, TCP handshake, DNS resolution, pub/sub, and load balancing.",
  "type": "module",
  "bin": {
    "flow-cast": "./bin/flow-cast.js"
  },
  "engines": {
    "node": ">=18"
  },
  "files": [
    "bin",
    "src",
    ".claude-plugin",
    "plugins",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "test": "vitest run"
  },
  "keywords": [
    "animation",
    "diagram",
    "architecture",
    "teaching",
    "react-flow",
    "gsap",
    "claude-code",
    "cli"
  ],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/Samir-kumal/flow-cast.git"
  },
  "author": "Samir-kumal"
}
```

- [ ] **Step 3: Write `.gitignore`**

```
node_modules/
```

- [ ] **Step 4: Write `LICENSE` (MIT)**

```
MIT License

Copyright (c) 2026 Samir-kumal

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 5: Write `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['node_modules/**', 'fixtures/**'],
  },
});
```

- [ ] **Step 6: Write the CLI stub `bin/flow-cast.js`**

```js
#!/usr/bin/env node
function parseArgs(argv) {
  const [command, ...rest] = argv;
  const opts = { command, positional: [], list: false, force: false, template: undefined };
  for (const arg of rest) {
    if (arg === '--list') opts.list = true;
    else if (arg === '--force') opts.force = true;
    else if (arg.startsWith('--template=')) opts.template = arg.slice('--template='.length);
    else opts.positional.push(arg);
  }
  return opts;
}

function printUsage() {
  console.log(`Usage: flow-cast install [path] [--template=<id>] [--list] [--force]

If [path] is omitted, the current working directory is used.
Run with --list to see available templates.`);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.command !== 'install') {
    printUsage();
    process.exit(opts.command ? 1 : 0);
    return;
  }

  console.error('flow-cast: install is not implemented yet');
  process.exit(1);
}

main();
```

- [ ] **Step 7: Make the CLI executable**

```bash
chmod +x bin/flow-cast.js
```

- [ ] **Step 8: Install dev dependencies**

```bash
npm install -D vitest typescript node-html-parser
```

- [ ] **Step 9: Write the failing smoke test `test/cli.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, '..', 'bin', 'flow-cast.js');

export function run(args) {
  try {
    const stdout = execFileSync('node', [CLI, ...args], { encoding: 'utf8' });
    return { stdout, stderr: '', status: 0 };
  } catch (err) {
    return { stdout: err.stdout ?? '', stderr: err.stderr ?? '', status: err.status };
  }
}

describe('flow-cast CLI', () => {
  it('prints usage and exits 0 with no arguments', () => {
    const { stdout, status } = run([]);
    expect(status).toBe(0);
    expect(stdout).toContain('Usage: flow-cast install');
  });

  it('exits 1 for an unknown command', () => {
    const { status } = run(['bogus']);
    expect(status).toBe(1);
  });
});
```

- [ ] **Step 10: Run the tests and verify they pass**

Run: `npm test`
Expected: 2 passed.

- [ ] **Step 11: Commit and push**

```bash
git add -A
git commit -m "chore: bootstrap flow-cast package and CLI stub"
git push -u origin main
```


---

### Task 2: Stack detection

**Files:**
- Create: `src/detect.js`
- Test: `test/detect.test.js`

**Interfaces:**
- Produces: `detect(targetPath: string) -> { stack: 'nextjs'|'react'|'html'|'unsupported', details: object }`. `details.router` is `'app'|'pages'|null` only when `stack === 'nextjs'`. `details.detected` is `string[]` only when `stack === 'unsupported'`.

- [ ] **Step 1: Write the failing tests**

```js
// test/detect.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { detect } from '../src/detect.js';

let dir;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'flow-cast-detect-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('detect', () => {
  it('classifies a Next.js App Router project', () => {
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { next: '15.0.0', react: '19.0.0' } }));
    mkdirSync(path.join(dir, 'app'));
    const result = detect(dir);
    expect(result.stack).toBe('nextjs');
    expect(result.details.router).toBe('app');
  });

  it('classifies a Next.js Pages Router project', () => {
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { next: '15.0.0', react: '19.0.0' } }));
    mkdirSync(path.join(dir, 'pages'));
    const result = detect(dir);
    expect(result.stack).toBe('nextjs');
    expect(result.details.router).toBe('pages');
  });

  it('classifies a Vite+React project as "react"', () => {
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { react: '18.0.0' } }));
    const result = detect(dir);
    expect(result.stack).toBe('react');
  });

  it('classifies a plain HTML project with no package.json', () => {
    writeFileSync(path.join(dir, 'index.html'), '<!doctype html><html></html>');
    const result = detect(dir);
    expect(result.stack).toBe('html');
  });

  it('classifies a plain HTML project with a non-framework package.json', () => {
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { lodash: '4.0.0' } }));
    writeFileSync(path.join(dir, 'index.html'), '<!doctype html><html></html>');
    const result = detect(dir);
    expect(result.stack).toBe('html');
  });

  it('reports "unsupported" with the detected dependencies for an unrecognized stack', () => {
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { vue: '3.0.0' } }));
    const result = detect(dir);
    expect(result.stack).toBe('unsupported');
    expect(result.details.detected).toEqual(['vue']);
  });

  it('reports "unsupported" for an empty directory with no signal at all', () => {
    const result = detect(dir);
    expect(result.stack).toBe('unsupported');
    expect(result.details.detected).toEqual([]);
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- detect`
Expected: FAIL — `Cannot find module '../src/detect.js'`.

- [ ] **Step 3: Implement `src/detect.js`**

```js
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

function readPackageJson(targetPath) {
  const pkgPath = path.join(targetPath, 'package.json');
  if (!existsSync(pkgPath)) return null;
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch {
    return null;
  }
}

function hasIndexHtml(targetPath) {
  return (
    existsSync(path.join(targetPath, 'index.html')) ||
    existsSync(path.join(targetPath, 'public', 'index.html')) ||
    existsSync(path.join(targetPath, 'src', 'index.html'))
  );
}

export function detect(targetPath) {
  const pkg = readPackageJson(targetPath);
  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };

  if (deps.next) {
    const router = existsSync(path.join(targetPath, 'app'))
      ? 'app'
      : existsSync(path.join(targetPath, 'pages'))
        ? 'pages'
        : null;
    return { stack: 'nextjs', details: { router, nextVersion: deps.next } };
  }

  if (deps.react) {
    return { stack: 'react', details: { reactVersion: deps.react } };
  }

  if (hasIndexHtml(targetPath)) {
    return { stack: 'html', details: {} };
  }

  return { stack: 'unsupported', details: { detected: Object.keys(deps) } };
}
```

- [ ] **Step 4: Run and verify pass**

Run: `npm test -- detect`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/detect.js test/detect.test.js
git commit -m "feat: add stack detection (nextjs/react/html/unsupported)"
```


---

### Task 3: Template schema and the five learning-flow templates

**Files:**
- Create: `src/templates/index.js`, `src/templates/request-cache-db.json`, `src/templates/tcp-handshake.json`, `src/templates/dns-resolution.json`, `src/templates/pub-sub.json`, `src/templates/load-balancing.json`
- Test: `test/templates.test.js`

**Interfaces:**
- Produces: `templates: object[]` (all five, parsed), `listTemplates() -> {id, title, description}[]`, `getTemplate(id: string) -> object|null`.
- Template shape consumed by Tasks 4–7: `{ id, title, description, nodes: {id, label, kind}[], steps: Step[] }` where `Step` is either `{ from, to, label, duration }` or a branch `{ branch, condition, thenLabel, elseLabel, then: Step[], else: Step[] }`.

- [ ] **Step 1: Write the five template JSON files**

`src/templates/request-cache-db.json`:

```json
{
  "id": "request-cache-db",
  "title": "Request \u2192 Cache \u2192 Database",
  "description": "Client request hits an app server, checks Redis, and falls back to the database on a cache miss.",
  "nodes": [
    { "id": "client", "label": "Client", "kind": "actor" },
    { "id": "server", "label": "App Server", "kind": "service" },
    { "id": "cache", "label": "Redis", "kind": "cache" },
    { "id": "db", "label": "Database", "kind": "datastore" }
  ],
  "steps": [
    { "from": "client", "to": "server", "label": "GET /resource", "duration": 600 },
    { "from": "server", "to": "cache", "label": "GET key", "duration": 500 },
    {
      "branch": "cache-lookup",
      "condition": "key exists & TTL valid",
      "thenLabel": "Cache hit",
      "elseLabel": "Cache miss",
      "then": [
        { "from": "cache", "to": "server", "label": "cached value", "duration": 500 }
      ],
      "else": [
        { "from": "server", "to": "db", "label": "SELECT ...", "duration": 700 },
        { "from": "db", "to": "server", "label": "row(s)", "duration": 600 },
        { "from": "server", "to": "cache", "label": "SET key (TTL)", "duration": 400 }
      ]
    },
    { "from": "server", "to": "client", "label": "200 OK", "duration": 500 }
  ]
}
```

`src/templates/tcp-handshake.json`:

```json
{
  "id": "tcp-handshake",
  "title": "TCP Three-Way Handshake",
  "description": "SYN, SYN-ACK, ACK connection establishment between a client and a server.",
  "nodes": [
    { "id": "client", "label": "Client", "kind": "actor" },
    { "id": "server", "label": "Server", "kind": "service" }
  ],
  "steps": [
    { "from": "client", "to": "server", "label": "SYN (seq=x)", "duration": 500 },
    { "from": "server", "to": "client", "label": "SYN-ACK (seq=y, ack=x+1)", "duration": 500 },
    { "from": "client", "to": "server", "label": "ACK (ack=y+1)", "duration": 500 }
  ]
}
```

`src/templates/dns-resolution.json`:

```json
{
  "id": "dns-resolution",
  "title": "Recursive DNS Resolution",
  "description": "A resolver walks the referral chain from a root server to the authoritative server to resolve a name.",
  "nodes": [
    { "id": "client", "label": "Client", "kind": "actor" },
    { "id": "resolver", "label": "Recursive Resolver", "kind": "service" },
    { "id": "root", "label": "Root Server", "kind": "service" },
    { "id": "tld", "label": "TLD Server", "kind": "service" },
    { "id": "authoritative", "label": "Authoritative Server", "kind": "service" }
  ],
  "steps": [
    { "from": "client", "to": "resolver", "label": "Query: www.example.com A?", "duration": 500 },
    { "from": "resolver", "to": "root", "label": "Query: www.example.com A?", "duration": 500 },
    { "from": "root", "to": "resolver", "label": "Referral: .com TLD servers", "duration": 500 },
    { "from": "resolver", "to": "tld", "label": "Query: www.example.com A?", "duration": 500 },
    { "from": "tld", "to": "resolver", "label": "Referral: example.com authoritative NS", "duration": 500 },
    { "from": "resolver", "to": "authoritative", "label": "Query: www.example.com A?", "duration": 500 },
    { "from": "authoritative", "to": "resolver", "label": "Answer: A 93.184.216.34", "duration": 500 },
    { "from": "resolver", "to": "client", "label": "Answer: A 93.184.216.34 (cached for TTL)", "duration": 500 }
  ]
}
```

`src/templates/pub-sub.json`:

```json
{
  "id": "pub-sub",
  "title": "Publish / Subscribe Fan-Out",
  "description": "A publisher sends one message through a broker that delivers it to every subscriber.",
  "nodes": [
    { "id": "publisher", "label": "Publisher", "kind": "actor" },
    { "id": "broker", "label": "Message Broker", "kind": "service" },
    { "id": "subscriberA", "label": "Subscriber A", "kind": "service" },
    { "id": "subscriberB", "label": "Subscriber B", "kind": "service" }
  ],
  "steps": [
    { "from": "publisher", "to": "broker", "label": "PUBLISH topic:orders", "duration": 500 },
    { "from": "broker", "to": "subscriberA", "label": "DELIVER message", "duration": 500 },
    { "from": "broker", "to": "subscriberB", "label": "DELIVER message", "duration": 500 },
    { "from": "subscriberA", "to": "broker", "label": "ACK", "duration": 400 },
    { "from": "subscriberB", "to": "broker", "label": "ACK", "duration": 400 }
  ]
}
```

`src/templates/load-balancing.json`:

```json
{
  "id": "load-balancing",
  "title": "Load Balancer Health Check & Failover",
  "description": "A load balancer health-checks a backend and fails over to a second backend when it is unhealthy.",
  "nodes": [
    { "id": "client", "label": "Client", "kind": "actor" },
    { "id": "lb", "label": "Load Balancer", "kind": "service" },
    { "id": "backend1", "label": "Backend 1", "kind": "service" },
    { "id": "backend2", "label": "Backend 2", "kind": "service" }
  ],
  "steps": [
    { "from": "client", "to": "lb", "label": "GET /api/resource", "duration": 500 },
    { "from": "lb", "to": "backend1", "label": "Health check", "duration": 400 },
    {
      "branch": "health-check",
      "condition": "backend1 healthy",
      "thenLabel": "Healthy backend",
      "elseLabel": "Failover",
      "then": [
        { "from": "lb", "to": "backend1", "label": "Forward request", "duration": 500 },
        { "from": "backend1", "to": "lb", "label": "200 OK", "duration": 500 }
      ],
      "else": [
        { "from": "lb", "to": "backend2", "label": "Forward request (failover)", "duration": 500 },
        { "from": "backend2", "to": "lb", "label": "200 OK", "duration": 500 }
      ]
    },
    { "from": "lb", "to": "client", "label": "200 OK", "duration": 500 }
  ]
}
```


- [ ] **Step 2: Write the failing test `test/templates.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { templates, listTemplates, getTemplate } from '../src/templates/index.js';

const VALID_KINDS = new Set(['actor', 'service', 'cache', 'datastore']);

function collectSteps(steps) {
  const flat = [];
  for (const step of steps) {
    if (step.branch) {
      flat.push(...collectSteps(step.then), ...collectSteps(step.else));
    } else {
      flat.push(step);
    }
  }
  return flat;
}

describe('template library', () => {
  it('ships exactly 5 templates', () => {
    expect(templates).toHaveLength(5);
  });

  it('has unique template ids', () => {
    const ids = templates.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getTemplate returns null for an unknown id', () => {
    expect(getTemplate('does-not-exist')).toBeNull();
  });

  it('listTemplates exposes id/title/description only', () => {
    for (const entry of listTemplates()) {
      expect(Object.keys(entry).sort()).toEqual(['description', 'id', 'title']);
    }
  });

  for (const template of [
    'request-cache-db',
    'tcp-handshake',
    'dns-resolution',
    'pub-sub',
    'load-balancing',
  ]) {
    describe(template, () => {
      it('has valid node kinds', () => {
        const t = getTemplate(template);
        for (const node of t.nodes) {
          expect(VALID_KINDS.has(node.kind)).toBe(true);
        }
      });

      it('references only declared node ids in every step', () => {
        const t = getTemplate(template);
        const nodeIds = new Set(t.nodes.map((n) => n.id));
        for (const step of collectSteps(t.steps)) {
          expect(nodeIds.has(step.from)).toBe(true);
          expect(nodeIds.has(step.to)).toBe(true);
        }
      });

      it('every branch step declares thenLabel, elseLabel, then[], else[]', () => {
        const t = getTemplate(template);
        for (const step of t.steps) {
          if (step.branch) {
            expect(typeof step.thenLabel).toBe('string');
            expect(typeof step.elseLabel).toBe('string');
            expect(Array.isArray(step.then)).toBe(true);
            expect(Array.isArray(step.else)).toBe(true);
          }
        }
      });
    });
  }
});
```

- [ ] **Step 3: Run and verify failure**

Run: `npm test -- templates`
Expected: FAIL — `Cannot find module '../src/templates/index.js'`.

- [ ] **Step 4: Implement `src/templates/index.js`**

```js
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadTemplates() {
  return readdirSync(__dirname)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(path.join(__dirname, f), 'utf8')))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export const templates = loadTemplates();

export function listTemplates() {
  return templates.map((t) => ({ id: t.id, title: t.title, description: t.description }));
}

export function getTemplate(id) {
  return templates.find((t) => t.id === id) ?? null;
}
```

- [ ] **Step 5: Run and verify pass**

Run: `npm test -- templates`
Expected: all tests green (4 top-level + 3 per-template × 5 templates).

- [ ] **Step 6: Commit**

```bash
git add src/templates test/templates.test.js
git commit -m "feat: add curated learning-flow template library"
```


---

### Task 4: Auto-layout engine

**Files:**
- Create: `src/render/shared/layout.js`
- Test: `test/layout.test.js`

**Interfaces:**
- Consumes: `getTemplate(id)` from Task 3.
- Produces: `layoutTemplate(template) -> Array<{ id: string, x: number, y: number }>`, ordered the same as `template.nodes`.

- [ ] **Step 1: Write the failing tests**

```js
// test/layout.test.js
import { describe, it, expect } from 'vitest';
import { layoutTemplate } from '../src/render/shared/layout.js';
import { getTemplate } from '../src/templates/index.js';

describe('layoutTemplate', () => {
  it('lays out request-cache-db left-to-right with the DB-only branch node below the main lane', () => {
    const template = getTemplate('request-cache-db');
    const byId = Object.fromEntries(layoutTemplate(template).map((n) => [n.id, n]));

    expect(byId.client).toEqual({ id: 'client', x: 0, y: 0 });
    expect(byId.server).toEqual({ id: 'server', x: 220, y: 0 });
    expect(byId.cache).toEqual({ id: 'cache', x: 440, y: 0 });
    expect(byId.db).toEqual({ id: 'db', x: 660, y: 140 });
  });

  it('lays out load-balancing with the failover-only backend below the main lane', () => {
    const template = getTemplate('load-balancing');
    const byId = Object.fromEntries(layoutTemplate(template).map((n) => [n.id, n]));

    expect(byId.client).toEqual({ id: 'client', x: 0, y: 0 });
    expect(byId.lb).toEqual({ id: 'lb', x: 220, y: 0 });
    expect(byId.backend1).toEqual({ id: 'backend1', x: 440, y: 0 });
    expect(byId.backend2).toEqual({ id: 'backend2', x: 660, y: 140 });
  });

  it('places every node on the main lane (y=0) when the template has no branch step', () => {
    const template = getTemplate('tcp-handshake');
    const layout = layoutTemplate(template);
    expect(layout.every((n) => n.y === 0)).toBe(true);
  });

  it('returns one entry per node, in template.nodes order', () => {
    const template = getTemplate('dns-resolution');
    const layout = layoutTemplate(template);
    expect(layout.map((n) => n.id)).toEqual(template.nodes.map((n) => n.id));
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- layout`
Expected: FAIL — `Cannot find module '../src/render/shared/layout.js'`.

- [ ] **Step 3: Implement `src/render/shared/layout.js`**

```js
const COLUMN_WIDTH = 220;
const ROW_HEIGHT = 140;

function markMainNodes(steps) {
  const mainNodes = new Set();
  for (const step of steps) {
    if (step.branch) continue;
    mainNodes.add(step.from);
    mainNodes.add(step.to);
  }
  return mainNodes;
}

function classifyLanes(steps) {
  const mainNodes = markMainNodes(steps);
  const thenOnly = new Set();
  const elseOnly = new Set();

  for (const step of steps) {
    if (!step.branch) continue;
    for (const s of step.then) {
      if (!mainNodes.has(s.from)) thenOnly.add(s.from);
      if (!mainNodes.has(s.to)) thenOnly.add(s.to);
    }
    for (const s of step.else) {
      if (!mainNodes.has(s.from)) elseOnly.add(s.from);
      if (!mainNodes.has(s.to)) elseOnly.add(s.to);
    }
  }

  const lane = new Map();
  for (const id of thenOnly) if (!elseOnly.has(id)) lane.set(id, -1);
  for (const id of elseOnly) if (!thenOnly.has(id)) lane.set(id, 1);
  return lane;
}

function flattenForColumns(steps) {
  const flat = [];
  for (const step of steps) {
    if (step.branch) flat.push(...step.then, ...step.else);
    else flat.push(step);
  }
  return flat;
}

export function layoutTemplate(template) {
  const laneById = classifyLanes(template.steps);
  const columnById = new Map();
  let nextColumn = 0;

  for (const step of flattenForColumns(template.steps)) {
    for (const id of [step.from, step.to]) {
      if (!columnById.has(id)) {
        columnById.set(id, nextColumn);
        nextColumn += 1;
      }
    }
  }

  return template.nodes.map((node) => ({
    id: node.id,
    x: (columnById.get(node.id) ?? 0) * COLUMN_WIDTH,
    y: (laneById.get(node.id) ?? 0) * ROW_HEIGHT,
  }));
}
```

- [ ] **Step 4: Run and verify pass**

Run: `npm test -- layout`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/render/shared/layout.js test/layout.test.js
git commit -m "feat: add deterministic auto-layout for flow templates"
```


---

### Task 5: Shared branch-playback logic (`flattenSteps`)

**Files:**
- Create: `src/render/shared/flattenSteps.js`
- Test: `test/flatten-steps.test.js`

**Interfaces:**
- Produces: `flattenSteps(steps: Step[], outcome: 'then'|'else') -> Step[]` (a plain function; `flattenSteps.toString()` is embedded verbatim into every generated file by Tasks 6 and 7 — this is the single source of truth for that runtime logic, never hand-duplicated as a string literal).

- [ ] **Step 1: Write the failing tests**

```js
// test/flatten-steps.test.js
import { describe, it, expect } from 'vitest';
import { flattenSteps } from '../src/render/shared/flattenSteps.js';

describe('flattenSteps', () => {
  const steps = [
    { from: 'a', to: 'b', label: 'first', duration: 100 },
    {
      branch: 'check',
      condition: 'x',
      thenLabel: 'Then',
      elseLabel: 'Else',
      then: [{ from: 'b', to: 'c', label: 'then-path', duration: 100 }],
      else: [
        { from: 'b', to: 'd', label: 'else-path-1', duration: 100 },
        { from: 'd', to: 'b', label: 'else-path-2', duration: 100 },
      ],
    },
    { from: 'b', to: 'e', label: 'last', duration: 100 },
  ];

  it('substitutes the then[] array for a "then" outcome', () => {
    expect(flattenSteps(steps, 'then').map((s) => s.label)).toEqual(['first', 'then-path', 'last']);
  });

  it('substitutes the else[] array for an "else" outcome', () => {
    expect(flattenSteps(steps, 'else').map((s) => s.label)).toEqual([
      'first',
      'else-path-1',
      'else-path-2',
      'last',
    ]);
  });

  it('leaves a branch-free step list unchanged', () => {
    const plain = [{ from: 'a', to: 'b', label: 'only', duration: 100 }];
    expect(flattenSteps(plain, 'then')).toEqual(plain);
  });

  it('the toString()-embedded source evaluates to an equivalent function (regresses the embedding technique used by both renderers)', () => {
    const rebuilt = new Function(`return (${flattenSteps.toString()})`)();
    expect(rebuilt(steps, 'then').map((s) => s.label)).toEqual(['first', 'then-path', 'last']);
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- flatten-steps`
Expected: FAIL — `Cannot find module '../src/render/shared/flattenSteps.js'`.

- [ ] **Step 3: Implement `src/render/shared/flattenSteps.js`**

```js
export function flattenSteps(steps, outcome) {
  const out = [];
  for (const step of steps) {
    if (step.branch) {
      const chosen = outcome === 'then' ? step.then : step.else;
      out.push(...chosen);
    } else {
      out.push(step);
    }
  }
  return out;
}
```

- [ ] **Step 4: Run and verify pass**

Run: `npm test -- flatten-steps`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/render/shared/flattenSteps.js test/flatten-steps.test.js
git commit -m "feat: add shared branch-playback flatten logic"
```


---

### Task 6: React renderer

**Files:**
- Create: `src/render/react.js`
- Test: `test/render-react.test.js`

**Interfaces:**
- Consumes: `layoutTemplate` (Task 4), `flattenSteps` (Task 5), `templates` (Task 3).
- Produces: `renderReact(template: object, opts: { needsUseClientDirective: boolean }) -> string` (a complete `.tsx` source file).

- [ ] **Step 1: Write the failing tests**

```js
// test/render-react.test.js
import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { renderReact } from '../src/render/react.js';
import { templates } from '../src/templates/index.js';

function hasSyntaxErrors(source) {
  const result = ts.transpileModule(source, {
    reportDiagnostics: true,
    compilerOptions: {
      jsx: ts.JsxEmit.Preserve,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
  });
  return result.diagnostics.length > 0;
}

describe('renderReact', () => {
  for (const template of templates) {
    it(`renders syntactically valid TSX for "${template.id}"`, () => {
      const source = renderReact(template, { needsUseClientDirective: false });
      expect(hasSyntaxErrors(source)).toBe(false);
    });

    it(`includes every node label for "${template.id}"`, () => {
      const source = renderReact(template, { needsUseClientDirective: false });
      for (const node of template.nodes) {
        expect(source).toContain(node.label);
      }
    });
  }

  it('prepends "use client" only when needsUseClientDirective is true', () => {
    const template = templates[0];
    expect(renderReact(template, { needsUseClientDirective: true }).startsWith('"use client";')).toBe(true);
    expect(renderReact(template, { needsUseClientDirective: false }).startsWith('"use client";')).toBe(false);
  });

  it('renders outcome-toggle buttons for a branching template', () => {
    const source = renderReact(templates.find((t) => t.id === 'request-cache-db'), {
      needsUseClientDirective: false,
    });
    expect(source).toContain('Cache hit');
    expect(source).toContain('Cache miss');
  });

  it('renders only a Replay control for a non-branching template', () => {
    const source = renderReact(templates.find((t) => t.id === 'tcp-handshake'), {
      needsUseClientDirective: false,
    });
    expect(source).toContain('Replay');
    expect(source).not.toContain('chooseOutcome(');
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- render-react`
Expected: FAIL — `Cannot find module '../src/render/react.js'`.


- [ ] **Step 3: Implement `src/render/react.js`**

```js
import { layoutTemplate } from './shared/layout.js';
import { flattenSteps } from './shared/flattenSteps.js';

const NODE_STYLE_BY_KIND = {
  actor: { background: '#e0f2fe', border: '1px solid #0284c7' },
  service: { background: '#eef2ff', border: '1px solid #4338ca' },
  cache: { background: '#fef9c3', border: '1px solid #ca8a04' },
  datastore: { background: '#fee2e2', border: '1px solid #dc2626' },
};

function pascalCase(id) {
  return id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function uniqueEdgePairs(steps) {
  const pairs = [];
  const seen = new Set();
  function visit(list) {
    for (const step of list) {
      if (step.branch) {
        visit(step.then);
        visit(step.else);
      } else {
        const key = `${step.from}->${step.to}`;
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push([step.from, step.to]);
        }
      }
    }
  }
  visit(steps);
  return pairs;
}

export function renderReact(template, { needsUseClientDirective }) {
  const layout = layoutTemplate(template);
  const positionById = Object.fromEntries(layout.map((n) => [n.id, { x: n.x, y: n.y }]));
  const componentName = `${pascalCase(template.id)}Flow`;
  const branchStep = template.steps.find((s) => s.branch) ?? null;

  const nodesLiteral = JSON.stringify(
    template.nodes.map((n) => ({
      id: n.id,
      data: { label: n.label },
      position: positionById[n.id],
      style: NODE_STYLE_BY_KIND[n.kind] ?? NODE_STYLE_BY_KIND.service,
    })),
  );

  const edgesLiteral = JSON.stringify(
    uniqueEdgePairs(template.steps).map(([from, to], i) => ({
      id: `e${i}-${from}-${to}`,
      source: from,
      target: to,
    })),
  );

  const positionsLiteral = JSON.stringify(positionById);
  const stepsLiteral = JSON.stringify(template.steps);
  const directive = needsUseClientDirective ? '"use client";\n\n' : '';

  const controls = branchStep
    ? `<button onClick={() => chooseOutcome("then")} disabled={outcome === "then"}>${branchStep.thenLabel}</button>
        <button onClick={() => chooseOutcome("else")} disabled={outcome === "else"}>${branchStep.elseLabel}</button>
        <button onClick={replay}>Replay</button>`
    : `<button onClick={replay}>Replay</button>`;

  return `${directive}import { useEffect, useMemo, useState } from "react";
import ReactFlow, { Background, Controls as FlowControls } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "framer-motion";

const NODES = ${nodesLiteral};
const EDGES = ${edgesLiteral};
const POSITIONS = ${positionsLiteral};
const RAW_STEPS = ${stepsLiteral};

${flattenSteps.toString()}

export default function ${componentName}() {
  const [outcome, setOutcome] = useState("then");
  const steps = useMemo(() => flattenSteps(RAW_STEPS, outcome), [outcome]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= steps.length) return undefined;
    const timer = setTimeout(() => setIndex((i) => i + 1), steps[index].duration);
    return () => clearTimeout(timer);
  }, [index, steps]);

  function replay() {
    setIndex(0);
  }

  function chooseOutcome(next) {
    setOutcome(next);
    setIndex(0);
  }

  const current = steps[Math.min(index, steps.length - 1)];
  const target = POSITIONS[current.to];

  return (
    <div style={{ width: "100%", height: 480 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center", fontFamily: "monospace" }}>
        <span>{index < steps.length ? current.label : "Done"}</span>
        ${controls}
      </div>
      <div style={{ position: "relative", width: "100%", height: 420 }}>
        <ReactFlow nodes={NODES} edges={EDGES} fitView>
          <Background />
          <FlowControls />
        </ReactFlow>
        <motion.div
          animate={{ x: target.x, y: target.y }}
          transition={{ duration: current.duration / 1000, ease: "easeInOut" }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#f97316",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
`;
}
```

- [ ] **Step 4: Run and verify pass**

Run: `npm test -- render-react`
Expected: all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/render/react.js test/render-react.test.js
git commit -m "feat: add React Flow + Framer Motion renderer"
```


---

### Task 7: Self-contained HTML renderer

**Files:**
- Create: `src/render/html.js`
- Test: `test/render-html.test.js`

**Interfaces:**
- Consumes: `layoutTemplate` (Task 4), `flattenSteps` (Task 5), `templates` (Task 3).
- Produces: `renderHtml(template: object) -> string` (a complete, self-contained `.html` file — inline SVG + GSAP via CDN, no build step).

- [ ] **Step 1: Write the failing tests**

```js
// test/render-html.test.js
import { describe, it, expect } from 'vitest';
import { parse } from 'node-html-parser';
import { renderHtml } from '../src/render/html.js';
import { templates } from '../src/templates/index.js';

describe('renderHtml', () => {
  for (const template of templates) {
    it(`renders well-formed HTML for "${template.id}"`, () => {
      const source = renderHtml(template);
      const root = parse(source, { comment: false });
      expect(root.querySelector('svg#stage')).not.toBeNull();
      expect(root.querySelector('script[src*="gsap"]')).not.toBeNull();
    });

    it(`includes every node label for "${template.id}"`, () => {
      const source = renderHtml(template);
      for (const node of template.nodes) {
        expect(source).toContain(node.label);
      }
    });
  }

  it('renders outcome-toggle buttons for a branching template', () => {
    const source = renderHtml(templates.find((t) => t.id === 'request-cache-db'));
    expect(source).toContain('Cache hit');
    expect(source).toContain('Cache miss');
  });

  it('renders only a Replay control for a non-branching template', () => {
    const source = renderHtml(templates.find((t) => t.id === 'tcp-handshake'));
    expect(source).toContain('Replay');
    expect(source).toContain('BRANCH = null');
  });

  it('has no unresolved template placeholders', () => {
    for (const template of templates) {
      expect(renderHtml(template)).not.toMatch(/\{\{.*?\}\}/);
    }
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- render-html`
Expected: FAIL — `Cannot find module '../src/render/html.js'`.


- [ ] **Step 3: Implement `src/render/html.js`**

```js
import { layoutTemplate } from './shared/layout.js';
import { flattenSteps } from './shared/flattenSteps.js';

const BOX_WIDTH = 80;
const BOX_HEIGHT = 40;
const OFFSET_Y = 180;

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function renderHtml(template) {
  const layout = layoutTemplate(template);
  const positionById = Object.fromEntries(
    layout.map((n) => [n.id, { x: n.x, y: n.y + OFFSET_Y }]),
  );
  const branchStep = template.steps.find((s) => s.branch) ?? null;
  const maxX = Math.max(...layout.map((n) => n.x));
  const svgWidth = maxX + BOX_WIDTH + 60;
  const svgHeight = OFFSET_Y * 2;

  const nodeMarkup = template.nodes
    .map((node) => {
      const pos = positionById[node.id];
      const cx = pos.x + BOX_WIDTH / 2;
      const cy = pos.y + BOX_HEIGHT / 2 + 5;
      return `<rect x="${pos.x}" y="${pos.y}" width="${BOX_WIDTH}" height="${BOX_HEIGHT}" rx="6" class="node-box" />
  <text x="${cx}" y="${cy}" text-anchor="middle" class="node-label">${escapeHtml(node.label)}</text>`;
    })
    .join('\n  ');

  const positionsForCenter = Object.fromEntries(
    Object.entries(positionById).map(([id, pos]) => [id, { x: pos.x + BOX_WIDTH / 2, y: pos.y + BOX_HEIGHT / 2 }]),
  );

  const branchLiteral = branchStep
    ? JSON.stringify({ thenLabel: branchStep.thenLabel, elseLabel: branchStep.elseLabel })
    : 'null';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(template.title)}</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; background: #0f172a; color: #e2e8f0; }
  #status { font-family: monospace; margin-bottom: 12px; }
  button { margin-right: 8px; }
  .node-label { font-size: 12px; fill: #e2e8f0; }
  .node-box { fill: #1e293b; stroke: #64748b; }
</style>
</head>
<body>
<h1>${escapeHtml(template.title)}</h1>
<div id="status"></div>
<div id="controls"></div>
<svg id="stage" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  ${nodeMarkup}
  <circle id="packet" r="7" fill="#f97316" cx="0" cy="0" />
</svg>
<script>
const POSITIONS = ${JSON.stringify(positionsForCenter)};
const RAW_STEPS = ${JSON.stringify(template.steps)};
const BRANCH = ${branchLiteral};

${flattenSteps.toString()}

let outcome = "then";
let index = 0;

function currentSteps() {
  return flattenSteps(RAW_STEPS, outcome);
}

function render() {
  const steps = currentSteps();
  const statusEl = document.getElementById("status");
  const packet = document.getElementById("packet");
  if (index >= steps.length) {
    statusEl.textContent = "Done";
    return;
  }
  const step = steps[index];
  statusEl.textContent = step.label;
  const from = POSITIONS[step.from];
  const to = POSITIONS[step.to];
  gsap.set(packet, { attr: { cx: from.x, cy: from.y } });
  gsap.to(packet, {
    attr: { cx: to.x, cy: to.y },
    duration: step.duration / 1000,
    ease: "power1.inOut",
    onComplete: () => {
      index += 1;
      render();
    },
  });
}

function replay() {
  gsap.killTweensOf("#packet");
  index = 0;
  render();
}

function chooseOutcome(next) {
  outcome = next;
  replay();
}

function buildControls() {
  const controls = document.getElementById("controls");
  const replayBtn = document.createElement("button");
  replayBtn.textContent = "Replay";
  replayBtn.onclick = replay;
  controls.appendChild(replayBtn);
  if (BRANCH) {
    const thenBtn = document.createElement("button");
    thenBtn.textContent = BRANCH.thenLabel;
    thenBtn.onclick = () => chooseOutcome("then");
    controls.appendChild(thenBtn);
    const elseBtn = document.createElement("button");
    elseBtn.textContent = BRANCH.elseLabel;
    elseBtn.onclick = () => chooseOutcome("else");
    controls.appendChild(elseBtn);
  }
}

buildControls();
render();
</script>
</body>
</html>
`;
}
```

- [ ] **Step 4: Run and verify pass**

Run: `npm test -- render-html`
Expected: all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/render/html.js test/render-html.test.js
git commit -m "feat: add self-contained SVG + GSAP HTML renderer"
```


---

### Task 8: Installer core (`install()`)

**Files:**
- Create: `src/skill/SKILL.md`, `src/skill/reference.md`, `src/installer.js`
- Test: `test/install-core.test.js`

**Interfaces:**
- Consumes: `detect` (Task 2), `listTemplates`/`getTemplate` (Task 3), `renderReact` (Task 6), `renderHtml` (Task 7).
- Produces: `install({ targetPath, templateId, list, force }) -> { ok: boolean, exitCode: number, message: string, filesWritten: string[] }`. Never throws for expected error conditions — every failure is a returned `{ ok: false, exitCode: 1, message, filesWritten: [] }`.
- Note: the spec's error-handling table also lists "target directory not writable". `install()` handles this via the try/catch in Step 5 (any `EACCES`/`EPERM` from `mkdirSync`/`writeFileSync` becomes a structured error), but this task does not add an automated test for it — reliably forcing a permission-denied write from an automated test is not portable, and is a no-op when the implementing environment runs as root (root bypasses Unix permission checks). Verify this path manually if you implement on a non-root account: `chmod 000` a target directory and confirm `install()` returns `ok: false` instead of throwing.

- [ ] **Step 1: Write `src/skill/SKILL.md`** (copied into every target repo, `{{STACK}}` substituted by the installer)

```markdown
---
name: flow-cast
description: Use when a user wants to add, extend, or customize an animated request/data-flow diagram in this project.
---

# Flow-Cast

This project was scaffolded with `flow-cast` (detected stack: {{STACK}}). Generated
files live under `flow-cast`-prefixed paths and were produced from a template in
the `flow-cast` npm package's `src/templates/` directory.

## Adding another flow diagram

Run `npx flow-cast@latest install . --list` to see available templates, then
`npx flow-cast@latest install . --template=<id>`.

## Customizing an existing diagram

Edit the generated file directly — it is plain, readable React Flow + Framer
Motion (or SVG + GSAP) code, not a build artifact. See `reference.md` in this
directory for the node/step/branch schema if you want to hand-author a new
sequence instead of using a built-in template.
```

- [ ] **Step 2: Write `src/skill/reference.md`**

```markdown
# Flow-Cast template schema

A template is `{ id, title, description, nodes, steps }`.

- `nodes`: array of `{ id, label, kind }`. `kind` is one of `actor`, `service`,
  `cache`, `datastore` — it only controls the generated node color.
- `steps`: ordered array. Each entry is either:
  - a plain step: `{ from, to, label, duration }` (`from`/`to` are node ids,
    `duration` is milliseconds the packet takes to travel that edge), or
  - a branch step: `{ branch, condition, thenLabel, elseLabel, then, else }`
    where `then`/`else` are each arrays of plain steps. The generated
    component/page renders `thenLabel`/`elseLabel` as toggle buttons that
    replay the sequence down that branch.

Hand-authoring a new template: copy the shape of an existing file in
`src/templates/`, keep every `from`/`to` referencing a declared node `id`,
and keep branch `then`/`else` non-empty. There is no template-file
registration step — any `.json` file dropped into `src/templates/` in the
`flow-cast` package is picked up automatically by `src/templates/index.js`.
```

- [ ] **Step 3: Write the failing tests**

```js
// test/install-core.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { install } from '../src/installer.js';

let dir;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'flow-cast-install-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function makeReactViteProject() {
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { react: '18.0.0' } }));
  mkdirSync(path.join(dir, 'src'));
}

function makePlainHtmlProject() {
  writeFileSync(path.join(dir, 'index.html'), '<!doctype html><html></html>');
}

describe('install', () => {
  it('returns exitCode 1 for a target that does not exist', () => {
    const result = install({ targetPath: path.join(dir, 'nope'), templateId: 'tcp-handshake' });
    expect(result.ok).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.message).toMatch(/does not exist/i);
  });

  it('returns exitCode 1 when the target path is a file, not a directory', () => {
    const filePath = path.join(dir, 'not-a-dir.txt');
    writeFileSync(filePath, 'x');
    const result = install({ targetPath: filePath, templateId: 'tcp-handshake' });
    expect(result.ok).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.message).toMatch(/does not exist or is not a directory/i);
  });
  it('returns exitCode 1 and lists detected deps for an unsupported stack', () => {
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { vue: '3.0.0' } }));
    const result = install({ targetPath: dir, templateId: 'tcp-handshake' });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('vue');
  });

  it('lists templates and exits 0 when list is requested', () => {
    makePlainHtmlProject();
    const result = install({ targetPath: dir, list: true });
    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.message).toContain('tcp-handshake');
    expect(result.filesWritten).toEqual([]);
  });

  it('lists templates and exits 0 when no template is given', () => {
    makePlainHtmlProject();
    const result = install({ targetPath: dir });
    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.message).toContain('--template=');
  });

  it('rejects an unknown template id', () => {
    makePlainHtmlProject();
    const result = install({ targetPath: dir, templateId: 'not-a-template' });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('not-a-template');
  });

  it('writes a .tsx component and the skill files for a React project, without touching package.json', () => {
    makeReactViteProject();
    const before = readFileSync(path.join(dir, 'package.json'), 'utf8');
    const result = install({ targetPath: dir, templateId: 'tcp-handshake' });
    expect(result.ok).toBe(true);
    const componentPath = path.join(dir, 'src', 'components', 'flow-cast', 'tcp-handshake.tsx');
    expect(existsSync(componentPath)).toBe(true);
    expect(existsSync(path.join(dir, '.claude', 'skills', 'flow-cast', 'SKILL.md'))).toBe(true);
    expect(existsSync(path.join(dir, '.claude', 'skills', 'flow-cast', 'reference.md'))).toBe(true);
    expect(readFileSync(path.join(dir, 'package.json'), 'utf8')).toBe(before);
    expect(result.message).toContain('npm install @xyflow/react framer-motion');
  });

  it('writes a self-contained .html file for a plain-HTML project', () => {
    makePlainHtmlProject();
    const result = install({ targetPath: dir, templateId: 'dns-resolution' });
    expect(result.ok).toBe(true);
    expect(existsSync(path.join(dir, 'flow-cast', 'dns-resolution.html'))).toBe(true);
    expect(result.message).toMatch(/open .* in a browser/i);
  });

  it('refuses to overwrite an existing output file without --force', () => {
    makePlainHtmlProject();
    install({ targetPath: dir, templateId: 'dns-resolution' });
    const result = install({ targetPath: dir, templateId: 'dns-resolution' });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/already exists/i);
  });

  it('overwrites an existing output file with --force', () => {
    makePlainHtmlProject();
    install({ targetPath: dir, templateId: 'dns-resolution' });
    const result = install({ targetPath: dir, templateId: 'dns-resolution', force: true });
    expect(result.ok).toBe(true);
  });

  it('substitutes the detected stack into the written SKILL.md', () => {
    makePlainHtmlProject();
    install({ targetPath: dir, templateId: 'tcp-handshake' });
    const skillMd = readFileSync(path.join(dir, '.claude', 'skills', 'flow-cast', 'SKILL.md'), 'utf8');
    expect(skillMd).toContain('detected stack: html');
    expect(skillMd).not.toContain('{{STACK}}');
  });
});
```

- [ ] **Step 4: Run and verify failure**

Run: `npm test -- install-core`
Expected: FAIL — `Cannot find module '../src/installer.js'`.


- [ ] **Step 5: Implement `src/installer.js`**

```js
import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detect } from './detect.js';
import { listTemplates, getTemplate } from './templates/index.js';
import { renderReact } from './render/react.js';
import { renderHtml } from './render/html.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function templateListMessage() {
  const lines = listTemplates().map((t) => `  ${t.id} — ${t.description}`);
  return ['Available templates:', ...lines].join('\n');
}

function reactComponentPath(targetPath, templateId) {
  const base = existsSync(path.join(targetPath, 'src')) ? path.join('src', 'components') : 'components';
  return path.join(targetPath, base, 'flow-cast', `${templateId}.tsx`);
}

function htmlOutputPath(targetPath, templateId) {
  return path.join(targetPath, 'flow-cast', `${templateId}.html`);
}

function writeSkillFiles(targetPath, stack) {
  const skillDir = path.join(targetPath, '.claude', 'skills', 'flow-cast');
  mkdirSync(skillDir, { recursive: true });
  const skillTemplate = readFileSync(path.join(__dirname, 'skill', 'SKILL.md'), 'utf8');
  writeFileSync(path.join(skillDir, 'SKILL.md'), skillTemplate.replace('{{STACK}}', stack));
  writeFileSync(
    path.join(skillDir, 'reference.md'),
    readFileSync(path.join(__dirname, 'skill', 'reference.md'), 'utf8'),
  );
  return [path.join(skillDir, 'SKILL.md'), path.join(skillDir, 'reference.md')];
}

export function install({ targetPath, templateId, list = false, force = false }) {
  if (!existsSync(targetPath) || !statSync(targetPath).isDirectory()) {
    return { ok: false, exitCode: 1, message: `Target path does not exist or is not a directory: ${targetPath}`, filesWritten: [] };
  }

  const detection = detect(targetPath);
  if (detection.stack === 'unsupported') {
    const detected = detection.details.detected.length ? detection.details.detected.join(', ') : '(none)';
    return {
      ok: false,
      exitCode: 1,
      message: `Unsupported project stack. Detected dependencies: ${detected}. Supported stacks: nextjs, react, html.`,
      filesWritten: [],
    };
  }

  if (list) {
    return { ok: true, exitCode: 0, message: templateListMessage(), filesWritten: [] };
  }

  if (!templateId) {
    return {
      ok: true,
      exitCode: 0,
      message: `${templateListMessage()}\n\nRe-run with --template=<id> to install one.`,
      filesWritten: [],
    };
  }

  const template = getTemplate(templateId);
  if (!template) {
    return {
      ok: false,
      exitCode: 1,
      message: `Unknown template "${templateId}". ${templateListMessage()}`,
      filesWritten: [],
    };
  }

  const isReactLike = detection.stack === 'nextjs' || detection.stack === 'react';
  const outputPath = isReactLike ? reactComponentPath(targetPath, templateId) : htmlOutputPath(targetPath, templateId);

  if (existsSync(outputPath) && !force) {
    return { ok: false, exitCode: 1, message: `Output file already exists: ${outputPath} (use --force to overwrite).`, filesWritten: [] };
  }

  const source = isReactLike
    ? renderReact(template, { needsUseClientDirective: detection.stack === 'nextjs' && detection.details.router === 'app' })
    : renderHtml(template);

  try {
    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, source);
    var skillFiles = writeSkillFiles(targetPath, detection.stack);
  } catch (err) {
    return { ok: false, exitCode: 1, message: `Could not write to ${targetPath}: ${err.message}`, filesWritten: [] };
  }

  const nextSteps = isReactLike
    ? `Written ${outputPath}.\nNext: run "npm install @xyflow/react framer-motion" in ${targetPath}, then import the default export from that file.`
    : `Written ${outputPath}.\nNext: open ${outputPath} in a browser — it is fully self-contained.`;

  return { ok: true, exitCode: 0, message: nextSteps, filesWritten: [outputPath, ...skillFiles] };
}
```

- [ ] **Step 6: Run and verify pass**

Run: `npm test -- install-core`
Expected: all tests green.

- [ ] **Step 7: Commit**

```bash
git add src/skill src/installer.js test/install-core.test.js
git commit -m "feat: add installer core orchestrating detect/render/write"
```


---

### Task 9: Wire the CLI to the installer

**Files:**
- Modify: `bin/flow-cast.js`
- Test: `test/cli.test.js` (extend the file created in Task 1)

**Interfaces:**
- Consumes: `install` from `src/installer.js` (Task 8).

- [ ] **Step 1: Read the current `test/cli.test.js`, then append these failing tests to it**

```js
// append to test/cli.test.js (keep the existing `run` export and the two Task-1 tests)
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';

describe('flow-cast install', () => {
  let dir;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'flow-cast-cli-'));
    writeFileSync(path.join(dir, 'index.html'), '<!doctype html><html></html>');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('defaults the target path to the current working directory', () => {
    const { stdout, status } = run(['install', '--list'], dir);
    expect(status).toBe(0);
    expect(stdout).toContain('tcp-handshake');
  });

  it('installs a template into an explicit path argument', () => {
    const { status } = run(['install', dir, '--template=tcp-handshake']);
    expect(status).toBe(0);
    expect(existsSync(path.join(dir, 'flow-cast', 'tcp-handshake.html'))).toBe(true);
  });

  it('exits 1 with a message for an unsupported stack', () => {
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { vue: '3.0.0' } }));
    const { stderr, status } = run(['install', dir, '--template=tcp-handshake']);
    expect(status).toBe(1);
    expect(stderr).toContain('Unsupported');
  });
});
```

Note: `run()` needs an optional `cwd` second argument for the "defaults to cwd" test — update its definition in the same file:

```js
export function run(args, cwd) {
  try {
    const stdout = execFileSync('node', [CLI, ...args], { encoding: 'utf8', cwd });
    return { stdout, stderr: '', status: 0 };
  } catch (err) {
    return { stdout: err.stdout ?? '', stderr: err.stderr ?? '', status: err.status };
  }
}
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- cli`
Expected: FAIL — `install is not implemented yet` / exit code 1 on the new tests.


- [ ] **Step 3: Replace `bin/flow-cast.js` with the full implementation**

```js
#!/usr/bin/env node
import path from 'node:path';
import { install } from '../src/installer.js';

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const opts = { command, positional: [], list: false, force: false, template: undefined };
  for (const arg of rest) {
    if (arg === '--list') opts.list = true;
    else if (arg === '--force') opts.force = true;
    else if (arg.startsWith('--template=')) opts.template = arg.slice('--template='.length);
    else opts.positional.push(arg);
  }
  return opts;
}

function printUsage() {
  console.log(`Usage: flow-cast install [path] [--template=<id>] [--list] [--force]

If [path] is omitted, the current working directory is used.
Run with --list to see available templates.`);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.command !== 'install') {
    printUsage();
    process.exit(opts.command ? 1 : 0);
    return;
  }

  const targetPath = path.resolve(opts.positional[0] ?? process.cwd());
  const result = install({ targetPath, templateId: opts.template, list: opts.list, force: opts.force });

  if (result.ok) {
    console.log(result.message);
  } else {
    console.error(result.message);
  }
  process.exit(result.exitCode);
}

main();
```

- [ ] **Step 4: Run and verify pass**

Run: `npm test -- cli`
Expected: all tests green (Task 1's two tests plus the three new ones).

- [ ] **Step 5: Commit**

```bash
git add bin/flow-cast.js test/cli.test.js
git commit -m "feat: wire CLI install command to the installer"
```


---

### Task 10: Fixture projects and end-to-end installer tests

**Files:**
- Create: `fixtures/next-app-router/package.json`, `fixtures/next-app-router/app/page.tsx`
- Create: `fixtures/next-pages-router/package.json`, `fixtures/next-pages-router/pages/index.tsx`
- Create: `fixtures/react-vite/package.json`, `fixtures/react-vite/index.html`, `fixtures/react-vite/src/main.jsx`
- Create: `fixtures/plain-html/index.html`
- Create: `fixtures/unsupported-vue/package.json`
- Test: `test/installer.test.js`

**Interfaces:**
- Consumes: `bin/flow-cast.js` (Task 9) via `child_process`, exactly as a real user would invoke it.

- [ ] **Step 1: Write the fixture projects**

`fixtures/next-app-router/package.json`:

```json
{
  "name": "fixture-next-app-router",
  "private": true,
  "dependencies": { "next": "15.0.0", "react": "19.0.0", "react-dom": "19.0.0" }
}
```

`fixtures/next-app-router/app/page.tsx`:

```tsx
export default function Page() {
  return <div>Fixture</div>;
}
```

`fixtures/next-pages-router/package.json`:

```json
{
  "name": "fixture-next-pages-router",
  "private": true,
  "dependencies": { "next": "15.0.0", "react": "19.0.0", "react-dom": "19.0.0" }
}
```

`fixtures/next-pages-router/pages/index.tsx`:

```tsx
export default function Home() {
  return <div>Fixture</div>;
}
```

`fixtures/react-vite/package.json`:

```json
{
  "name": "fixture-react-vite",
  "private": true,
  "dependencies": { "react": "18.3.0", "react-dom": "18.3.0" },
  "devDependencies": { "vite": "5.0.0" }
}
```

`fixtures/react-vite/index.html`:

```html
<!doctype html>
<html>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

`fixtures/react-vite/src/main.jsx`:

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';

ReactDOM.createRoot(document.getElementById('root')).render(<div>Fixture</div>);
```

`fixtures/plain-html/index.html`:

```html
<!doctype html>
<html>
  <body>
    <h1>Fixture</h1>
  </body>
</html>
```

`fixtures/unsupported-vue/package.json`:

```json
{
  "name": "fixture-unsupported-vue",
  "private": true,
  "dependencies": { "vue": "3.4.0" }
}
```


- [ ] **Step 2: Write the failing end-to-end tests `test/installer.test.js`**

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, '..', 'bin', 'flow-cast.js');
const FIXTURES = path.join(__dirname, '..', 'fixtures');

function copyFixture(name) {
  const dest = mkdtempSync(path.join(tmpdir(), `flow-cast-e2e-${name}-`));
  cpSync(path.join(FIXTURES, name), dest, { recursive: true });
  return dest;
}

function runCli(args) {
  try {
    const stdout = execFileSync('node', [CLI, ...args], { encoding: 'utf8' });
    return { stdout, stderr: '', status: 0 };
  } catch (err) {
    return { stdout: err.stdout ?? '', stderr: err.stderr ?? '', status: err.status };
  }
}

describe('end-to-end install', () => {
  let dirs = [];

  afterEach(() => {
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
    dirs = [];
  });

  it('scaffolds a "use client" component under app/ for the Next.js App Router fixture', () => {
    const dir = copyFixture('next-app-router');
    dirs.push(dir);
    const { status } = runCli(['install', dir, '--template=request-cache-db']);
    expect(status).toBe(0);
    const componentPath = path.join(dir, 'components', 'flow-cast', 'request-cache-db.tsx');
    expect(existsSync(componentPath)).toBe(true);
    expect(readFileSync(componentPath, 'utf8').startsWith('"use client";')).toBe(true);
  });

  it('scaffolds a component without "use client" for the Next.js Pages Router fixture', () => {
    const dir = copyFixture('next-pages-router');
    dirs.push(dir);
    const { status } = runCli(['install', dir, '--template=request-cache-db']);
    expect(status).toBe(0);
    const componentPath = path.join(dir, 'components', 'flow-cast', 'request-cache-db.tsx');
    expect(readFileSync(componentPath, 'utf8').startsWith('"use client";')).toBe(false);
  });

  it('scaffolds under the existing src/ directory for the Vite+React fixture', () => {
    const dir = copyFixture('react-vite');
    dirs.push(dir);
    const { status } = runCli(['install', dir, '--template=pub-sub']);
    expect(status).toBe(0);
    expect(existsSync(path.join(dir, 'src', 'components', 'flow-cast', 'pub-sub.tsx'))).toBe(true);
  });

  it('scaffolds a self-contained HTML file for the plain-HTML fixture', () => {
    const dir = copyFixture('plain-html');
    dirs.push(dir);
    const { status } = runCli(['install', dir, '--template=load-balancing']);
    expect(status).toBe(0);
    expect(existsSync(path.join(dir, 'flow-cast', 'load-balancing.html'))).toBe(true);
  });

  it('exits 1 for the unsupported Vue fixture and never writes any file', () => {
    const dir = copyFixture('unsupported-vue');
    dirs.push(dir);
    const { status, stderr } = runCli(['install', dir, '--template=tcp-handshake']);
    expect(status).toBe(1);
    expect(stderr).toContain('vue');
    expect(existsSync(path.join(dir, 'flow-cast'))).toBe(false);
    expect(existsSync(path.join(dir, '.claude'))).toBe(false);
  });

  it('never writes to the target package.json for any supported fixture', () => {
    const dir = copyFixture('react-vite');
    dirs.push(dir);
    const before = readFileSync(path.join(dir, 'package.json'), 'utf8');
    runCli(['install', dir, '--template=dns-resolution']);
    expect(readFileSync(path.join(dir, 'package.json'), 'utf8')).toBe(before);
  });
});
```

- [ ] **Step 3: Run and verify it passes immediately**

Because Tasks 1–9 already implement detection, rendering, and installation, this end-to-end suite should pass without further production code changes — it exists to catch integration gaps the unit-level tests can't see (real subprocess invocation, real fixture directory shapes, real Next.js router detection from an actual `app/`/`pages/` directory).

Run: `npm test -- installer`
Expected: all tests green. If any fail, the bug is in Tasks 2–9's logic, not in this test file — fix the implementation, not the assertions.

- [ ] **Step 4: Commit**

```bash
git add fixtures test/installer.test.js
git commit -m "test: add end-to-end installer coverage against fixture projects"
```


---

### Task 11: Claude Code plugin (marketplace manifest + wrapper skill)

**Files:**
- Create: `.claude-plugin/marketplace.json`, `plugins/flow-cast/SKILL.md`
- Test: `test/plugin.test.js`

**Interfaces:**
- No code interface — this task is pure configuration/documentation, validated structurally (valid JSON, required manifest fields, valid `SKILL.md` frontmatter per the `writing-skills` conventions: `name` letters/numbers/hyphens only, `description` starts with "Use when...").

- [ ] **Step 1: Write the failing tests `test/plugin.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function readFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) fields[key.trim()] = rest.join(':').trim();
  }
  return fields;
}

describe('Claude Code plugin packaging', () => {
  it('marketplace.json is valid JSON with the flow-cast plugin registered', () => {
    const manifest = JSON.parse(readFileSync(path.join(ROOT, '.claude-plugin', 'marketplace.json'), 'utf8'));
    expect(manifest.name).toBe('flow-cast');
    expect(manifest.plugins).toHaveLength(1);
    expect(manifest.plugins[0].name).toBe('flow-cast');
    expect(manifest.plugins[0].source).toBe('./plugins/flow-cast');
  });

  it('plugins/flow-cast/SKILL.md has valid frontmatter', () => {
    const markdown = readFileSync(path.join(ROOT, 'plugins', 'flow-cast', 'SKILL.md'), 'utf8');
    const frontmatter = readFrontmatter(markdown);
    expect(frontmatter).not.toBeNull();
    expect(frontmatter.name).toBe('flow-cast');
    expect(/^["']?Use when/.test(frontmatter.description)).toBe(true);
  });

  it('plugins/flow-cast/SKILL.md instructs the agent to invoke the npx CLI', () => {
    const markdown = readFileSync(path.join(ROOT, 'plugins', 'flow-cast', 'SKILL.md'), 'utf8');
    expect(markdown).toContain('npx flow-cast@latest install');
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- plugin`
Expected: FAIL — `ENOENT` on `.claude-plugin/marketplace.json`.

- [ ] **Step 3: Write `.claude-plugin/marketplace.json`**

```json
{
  "name": "flow-cast",
  "owner": {
    "name": "Samir-kumal",
    "url": "https://github.com/Samir-kumal"
  },
  "metadata": {
    "description": "Detects your project's stack and scaffolds an animated, educational request/data-flow diagram.",
    "version": "0.1.0"
  },
  "plugins": [
    {
      "name": "flow-cast",
      "source": "./plugins/flow-cast",
      "version": "0.1.0",
      "keywords": ["diagram", "animation", "teaching", "architecture"]
    }
  ]
}
```

- [ ] **Step 4: Write `plugins/flow-cast/SKILL.md`**

```markdown
---
name: flow-cast
description: Use when a user wants to animate, visualize, or teach a request/data flow, protocol sequence, or system architecture — for example a client/server/cache/database flow, a TCP handshake, DNS resolution, pub/sub, or load balancing.
---

# Flow-Cast

Flow-cast is a deterministic CLI (`flow-cast`, published on npm) that detects
the current project's stack and scaffolds a stack-appropriate animated
diagram from a curated template library. Prefer it over hand-writing a new
diagram from scratch — it produces correct, working code for the detected
stack in one step, leaving only the judgment work below to you.

## Procedure

1. Run `npx flow-cast@latest install $(pwd) --list` to see the five
   available templates (`request-cache-db`, `tcp-handshake`,
   `dns-resolution`, `pub-sub`, `load-balancing`) and pick the one closest
   to what the user described. If none fit, say so explicitly rather than
   forcing a mismatched template.
2. Run `npx flow-cast@latest install $(pwd) --template=<id>`.
3. Read the file it reports writing. Refine it for the user's exact
   scenario — labels, extra branch steps, colors, copy — using
   `.claude/skills/flow-cast/reference.md` (written into the project by the
   installer) as the contract for the node/step/branch schema if you need
   to hand-edit the underlying sequence rather than just cosmetics.
4. Do not hand-write a competing diagram from scratch when a close-fitting
   template exists — extend the generated one.
```

- [ ] **Step 5: Run and verify pass**

Run: `npm test -- plugin`
Expected: all tests green.

- [ ] **Step 6: Commit**

```bash
git add .claude-plugin plugins test/plugin.test.js
git commit -m "feat: register flow-cast as a Claude Code plugin"
```


---

### Task 12: Continuous integration

**Files:**
- Create: `.github/workflows/test.yml`

**Interfaces:** None — CI configuration only.

- [ ] **Step 1: Write `.github/workflows/test.yml`**

```yaml
name: test

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 22.x]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm install
      - run: npm test
```

- [ ] **Step 2: Validate the YAML parses**

Run: `node -e "require('node:fs').readFileSync('.github/workflows/test.yml','utf8')" && npx -y js-yaml .github/workflows/test.yml > /dev/null && echo OK`
Expected: `OK` (no YAML syntax errors). If `js-yaml` is unavailable offline, visually confirm indentation instead — this file has no runtime test of its own since GitHub Actions only evaluates it once pushed.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/test.yml
git commit -m "ci: run npm test on push and pull_request across Node 18/22"
```


---

### Task 13: README, release readiness, publish, push

**Files:**
- Create: `README.md`

**Interfaces:** None — this is the release task; it depends on every prior task being committed.

- [ ] **Step 1: Write `README.md`**

```markdown
# flow-cast

Detects your project's stack and scaffolds an animated, educational
request/data-flow diagram — no build step required for plain HTML, one
React Flow + Framer Motion component for React/Next.js.

## Usage

```
npx flow-cast install [path] [--template=<id>] [--list] [--force]
```

`path` defaults to the current directory. Run with `--list` to see the five
available templates: `request-cache-db`, `tcp-handshake`, `dns-resolution`,
`pub-sub`, `load-balancing`.

Supported target stacks: Next.js (App Router or Pages Router), React
(Vite/CRA-style), and plain HTML. `flow-cast` never edits your
`package.json` or lockfile — for React/Next.js targets it prints the exact
`npm install` line to run yourself.

## Claude Code plugin

```
/plugin marketplace add Samir-kumal/flow-cast
```

registers a `flow-cast` skill that runs the same CLI on your behalf and
then refines the generated diagram for your exact scenario.

## Adding a template

Templates are stack-agnostic JSON files in `src/templates/`. See
`src/skill/reference.md` for the schema. Any `.json` file dropped into that
directory is picked up automatically — no registration step.

## Development

```
npm install
npm test
```

## License

MIT
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: every test file from Tasks 1–11 passes (cli, detect, templates,
layout, flatten-steps, render-react, render-html, install-core, installer,
plugin).

- [ ] **Step 3: Verify the npm package contents**

Run: `npm pack --dry-run`
Expected: the file list includes `bin/`, `src/`, `.claude-plugin/`,
`plugins/`, `README.md`, `LICENSE`, and **excludes** `fixtures/` and
`test/` (both are absent from `package.json`'s `files` array from Task 1).
If either directory appears in the packed output, add a `.npmignore` or
correct the `files` array before proceeding.

- [ ] **Step 4: Commit and push everything**

```bash
git add README.md
git commit -m "docs: add README"
git push origin main
```

- [ ] **Step 5: Confirm CI is green on GitHub**

```bash
gh run watch --exit-status
```

Expected: the `test` workflow from Task 12 completes successfully for both
Node 18.x and 22.x.

- [ ] **Step 6: Publish to npm**

This step requires npm publish credentials. This session's sandbox
confirmed `npm whoami` currently returns `ENEEDAUTH` — there is no stored
npm login here, so this step must be run by you (Samir-kumal) after
authenticating:

```bash
npm login
npm publish --access public
```

Expected: `flow-cast@0.1.0` appears at `https://www.npmjs.com/package/flow-cast`.

- [ ] **Step 7: Verify the published package end-to-end**

From a throwaway directory with a plain `index.html`:

```bash
cd "$(mktemp -d)"
echo '<!doctype html><html></html>' > index.html
npx flow-cast@latest install . --template=tcp-handshake
```

Expected: `flow-cast/tcp-handshake.html` and
`.claude/skills/flow-cast/{SKILL.md,reference.md}` are created; opening the
HTML file in a browser shows the animated SYN / SYN-ACK / ACK sequence.

