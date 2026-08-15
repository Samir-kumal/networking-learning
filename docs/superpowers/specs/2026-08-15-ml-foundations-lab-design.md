# ML Foundations Lab — Design Spec

**Status:** Approved (architectural decisions confirmed via user checkpoint 2026-08-15)
**Branch:** `feat/ml-foundations-lab` (worktree `.worktrees/feat-ml-foundations-lab`)

## 1. Summary

Add a new learning track, **ML Foundations Lab**, to the existing `networking-learning`
Next.js app at route prefix `/ml`. It teaches machine learning from math prerequisites
through neural networks via 8 chapters, each split into ordered sections. Every section
pairs a concept explanation with a live, parameterized playground (2D via D3/visx, 3D via
React Three Fiber) and ends with a DB-backed quiz that gates the next section. Progress
persists per anonymous local profile (signed cookie, no passwords).

Confirmed decisions (user checkpoint):
- **Integration:** new track inside this repo, reusing `AppShell`/`Sidebar`/`Navbar`/`ThemeToggle` conventions and the existing hub `TrackCard` list. Not a separate repo.
- **Auth:** anonymous local-profile mode. First visit creates a profile row + a signed
  httpOnly cookie holding the profile id. No email/password.
- **ORM:** Drizzle. SQLite by default (`better-sqlite3`), Postgres via `docker-compose.yml`
  optional service, switched by `ML_DB_DRIVER` env var. Query/action code never imports a
  dialect-specific schema file directly — it imports `db`/`schema` from `src/lib/ml/db`,
  which resolves the dialect once at module load.

## 2. Gating granularity (resolves an ambiguity in the source brief)

The brief's curriculum lists 8 "chapters," each with 3–4 sub-topics, and says "each
section ends with a quiz ... unlock gate to next section." The DB schema list also
separates `Chapter` and `Section`. Resolution: **a "section" is one sub-topic** (e.g.
"1.2 Linear functions"); each section has exactly one quiz; passing a section's quiz
unlocks the next section; finishing every section in a chapter marks the chapter complete
and unlocks the next chapter's first section. This yields 27 sections / 27 quizzes total
(list in §7). Quiz length: 5 questions each (low end of the spec's 5–10 range) — chosen to
keep 27 × 5 = 135 rigorously-checked math questions tractable while still satisfying the
stated minimum.

## 3. Route structure

```
/ml                              hub: chapter grid, lock states, progress dashboard link
/ml/progress                     progress dashboard (scores, streak, resume link)
/ml/[chapter]                    chapter overview: section list with lock/complete state
/ml/[chapter]/[section]          concept content + playground + quiz gate
```
`[chapter]` / `[section]` are kebab-case slugs, e.g. `/ml/calculus-derivatives/gradient-steepest-ascent`.

Route handlers / server actions (all under `src/app/ml/actions.ts` + `src/app/api/ml/*`):
- `getOrCreateProfile()` (server action helper, called from a layout) — reads/sets the
  signed cookie, upserts a `User` row.
- `submitQuizAttempt(sectionSlug, answers)` (server action) — grades server-side against
  DB-stored correct answers (never trust client grading), records `QuizAttempt`, updates
  `UserProgress`, returns score + per-question explanations.
- `savePlaygroundState(playgroundKey, state)` (server action, debounced client-side) —
  upserts `PlaygroundState` JSON blob for the current profile.
- `resetProgress()` (server action) — dev/testing affordance, wipes the current profile's
  progress.

## 4. Database schema (Drizzle)

Tables (SQLite types shown; Postgres mirror uses `pgTable`/`serial`/`timestamp`):

```
users            id (pk, text uuid), displayName (text, nullable), createdAt
chapters         id (pk, text slug), title, summary, order (int)
sections         id (pk, text slug), chapterId (fk chapters.id), title, order (int)
quizzes          id (pk, text uuid), sectionId (fk sections.id, unique), passThreshold (real, default 0.7)
questions        id (pk, text uuid), quizId (fk quizzes.id), order (int), kind (text enum:
                 'mcq' | 'numeric' | 'slider-match'), prompt (text), options (text JSON,
                 nullable — mcq only), correctAnswer (text JSON), tolerance (real, nullable
                 — numeric/slider-match), explanation (text)
quiz_attempts    id (pk, text uuid), userId (fk users.id), quizId (fk quizzes.id),
                 score (real), passed (integer bool), answers (text JSON), createdAt
user_progress    id (pk, text uuid), userId (fk users.id), sectionId (fk sections.id),
                 status (text enum: 'locked' | 'unlocked' | 'completed'), bestScore (real,
                 nullable), attemptCount (int, default 0), updatedAt
playground_state id (pk, text uuid), userId (fk users.id), playgroundKey (text),
                 state (text JSON), updatedAt — unique(userId, playgroundKey)
```

`chapters`/`sections`/`quizzes`/`questions` are seeded once from the content registry
(§6) via `npm run db:seed` — they are reference data, not user data, so a re-seed is
idempotent (upsert by slug/order).

`user_progress` row 1 (`chapter-1` section 1) is created `unlocked` for every new user;
every other section starts `locked`. `submitQuizAttempt` promotes the *next* section from
`locked`→`unlocked` on pass, and the current section to `completed`.

## 5. Playground primitives (`src/components/ml/primitives/`)

- `<Katex expr latex? block?>` — wraps `katex` (no `react-katex` dep; render via
  `katex.renderToString` + `dangerouslySetInnerHTML`, memoized on the expression string).
- `<Slider label value min max step onChange format? />` — shadcn/ui `Slider` wrapper,
  numeric readout, keyboard-accessible.
- `<PlaygroundShell title description equation? onReset onRandomize presets? children>` —
  standard chrome: title, live KaTeX equation, Reset/Randomize buttons, preset buttons,
  responsive two-pane (controls + canvas) layout that stacks on mobile.
- `<FunctionPlot fn domain resolution overlays? onDrag? />` — D3/visx SVG 2D plot; handles
  ResizeObserver-driven resize; `overlays` renders extra layers (tangent lines, Riemann
  rectangles, decision boundary heatmap).
- `<VectorCanvas vectors onDragVector? grid? />` — 2D draggable-vector SVG canvas
  (addition/scaling/dot-product/projection views).
- `<MatrixGrid matrix onChange? unitShape? />` — 2×2 matrix input + live-transformed grid/
  unit-square overlay (SVG).
- `<Surface3D fn domain resolution point? gradientArrow? slicePlane? />` — R3F canvas,
  orbit controls, resize-aware (via `@react-three/fiber`'s `ResizeObserver`), used for loss
  surfaces / partial derivatives / gradient descent.
- `<QuizRunner quiz onComplete />` — renders shuffled questions (mcq/numeric/slider-match),
  client-side immediate feedback UI, submits to `submitQuizAttempt`, shows per-question
  explanations on fail, "Retry" reshuffles.
- Shared param state: each playground owns a `useState`/`useReducer` (no cross-playground
  global Zustand store is needed — state is playground-local); a thin
  `src/lib/ml/hooks/usePlaygroundPersistence.ts` hook debounce-syncs local state to
  `savePlaygroundState` when `playgroundKey` is supplied. Zustand is used only for the
  cross-page "current profile / progress map" client cache
  (`src/lib/ml/store/progressStore.ts`) so the sidebar lock icons update immediately after
  a quiz pass without a full reload.

## 6. Content model

Chapter/section prose + playground React components are code, not DB rows (matches every
existing track in this repo — `SecIamSection.tsx` etc. are components, not CMS content).
Only quiz Q&A and progress are DB-backed, per the brief's explicit schema.

`src/lib/ml/curriculum.ts` is the single source of truth for chapter/section slugs, titles,
and order — both the DB seed script and the route registry (`src/components/ml/tracks/`)
read from it, so they cannot drift.

```ts
export interface CurriculumSection { slug: string; title: string; order: number; component: string /* key into SECTION_COMPONENTS */; playgroundKey?: string }
export interface CurriculumChapter { slug: string; title: string; summary: string; order: number; sections: CurriculumSection[] }
```

Each section's React component lives at
`src/components/ml/tracks/<chapter-slug>/<SectionName>Section.tsx` and is registered by
key in `src/components/ml/section-registry.ts` (`Record<string, ComponentType>`), mirroring
the existing `MODULE_ITEMS_BY_TRACK` pattern in `Sidebar.tsx`.

Each section's quiz question data lives at
`src/lib/ml/quizzes/<chapter-slug>/<section-slug>.ts` exporting a typed `QuizSeed` (5
questions, each with a worked-out `correctAnswer` and `explanation`); `db/seed.ts` imports
all of them.

## 7. Curriculum (chapters → sections, slugs)

1. `functions-graphs` — Functions & Graphs
   1. `what-is-a-function` — input/output, domain/range
   2. `linear-functions` — y = mx + b, slope triangle
   3. `polynomials-exponentials-logarithms`
2. `linear-algebra` — Linear Algebra
   1. `vectors` — geometric + numeric, drag/add/scale/dot-product projection
   2. `matrix-transformations` — 2×2 matrix, live grid transform
   3. `matrix-operations` — multiplication, identity, inverse, determinant-as-area
   4. `eigenvectors-eigenvalues`
3. `calculus-derivatives` — Calculus: Derivatives
   1. `slope-and-rate-of-change` — secant→tangent, Δx slider
   2. `derivative-rules` — power/product/chain, animated steps
   3. `partial-derivatives` — 3D surface slice
   4. `gradient-steepest-ascent` — 3D draggable point + gradient arrow
4. `calculus-integration` — Calculus: Integration
   1. `area-under-curve` — Riemann sum, rectangle-count slider
   2. `fundamental-theorem` — derivative/integral visual link
   3. `integration-in-ml` — densities, expected value
5. `probability-statistics` — Probability & Statistics
   1. `distributions` — uniform/normal/Bernoulli, μ/σ sliders, sampling
   2. `expectation-variance-bayes`
   3. `maximum-likelihood`
6. `core-ml-concepts` — Core ML Concepts
   1. `linear-regression` — click points, drag line / animated GD, live loss
   2. `loss-functions` — MSE/MAE
   3. `gradient-descent` — 3D loss surface, LR slider, overshoot/slow-converge
   4. `overfitting-underfitting` — polynomial-degree slider
7. `classification-activations` — Classification & Activation Functions
   1. `activation-functions` — sigmoid/tanh/ReLU/softmax + derivative
   2. `logistic-regression` — 2D decision boundary
   3. `why-nonlinearity-matters` — XOR demo
8. `neural-networks` — Neural Networks
   1. `perceptron-to-mlp`
   2. `train-a-network` — flagship playground (spiral/circles/XOR, from-scratch fwd/backprop)
   3. `backpropagation-walkthrough` — 2-2-1 step-through with real numbers

## 8. Neural-net engine (`src/lib/ml/nn/`)

Pure TypeScript, no ML library. `Matrix`/`Vector` ops in `linalg.ts`; `Layer` (dense +
activation) and `Network` (forward, backward via backprop, SGD step) in `network.ts`;
activations + derivatives in `activations.ts`; toy datasets (`spiral`, `circles`, `xor`) in
`datasets.ts`. Verified by a numeric-gradient-check unit test (finite-difference gradient
vs. analytic backprop gradient, tolerance 1e-4) — this is the correctness proof for the
flagship playground's math, run in CI via `npm test`.

## 9. Docker Compose / env

`docker-compose.yml` gains an optional `postgres` service (profile `postgres`, healthcheck
`pg_isready`, named volume `ml_pgdata`), left out of the default `docker compose up` run
(SQLite needs no service). `.env.example` documents `ML_DB_DRIVER` (`sqlite` default |
`postgres`), `ML_DATABASE_URL` (sqlite file path or postgres connection string),
`ML_SESSION_SECRET` (HMAC key for the profile cookie), `ML_QUIZ_PASS_THRESHOLD` (default
`0.7`, read once in `src/lib/ml/config.ts`).

## 10. Non-goals

No multi-device login, no email verification, no admin CMS UI for quiz editing (seed
script is the authoring tool), no server-side collaborative features. TensorFlow.js is not
used — the flagship NN playground is hand-rolled per the brief ("no heavy ML library
needed").

## 11. Deliverable checklist (traced to brief)

- [ ] Structured curriculum, 8 chapters, 27 gated sections
- [ ] Interactive playground per section (primitives §5)
- [ ] Quiz + retry + explanations + persisted attempts (§4, §7)
- [ ] Drizzle + SQLite default, docker-compose Postgres opt-in (§4, §9)
- [ ] Anonymous local-profile auth (§3)
- [ ] Zod validation on every server action / route handler input
- [ ] Sidebar lock/unlock/complete states, progress dashboard
- [ ] README setup steps, seed script, `.env.example`
- [ ] `npm test`, `npm run typecheck`, `npm run build`, `npm run lint` all clean
