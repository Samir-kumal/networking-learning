# ML Foundations Lab Implementation Plan

**Spec:** `docs/superpowers/specs/2026-08-15-ml-foundations-lab-design.md`

**Goal:** Ship the `/ml` track end to end: DB-backed gated curriculum, 8 chapters / 27
sections, interactive playgrounds, quizzes, progress dashboard, docker-compose Postgres
opt-in, README/seed/.env docs — all passing `npm test`, `typecheck`, `build`, `lint`.

**Architecture:** Next.js App Router route group `src/app/ml/**`, Drizzle/SQLite (Postgres
via `ML_DB_DRIVER` env), anonymous signed-cookie profile, server actions for
mutations, Zod validation on every action input, content-as-code (`src/components/ml/`)
with quiz Q&A + progress in the DB. Shared playground primitives built once, reused by
every chapter.

**Tech stack:** drizzle-orm, better-sqlite3, pg, drizzle-kit, katex, d3, three,
@react-three/fiber, @react-three/drei, framer-motion, zustand, zod, @radix-ui/react-slider,
@radix-ui/react-progress, @radix-ui/react-dialog, @radix-ui/react-tabs, clsx, tailwind-merge.

## Global constraints
- Every server action / route handler input validated with Zod before use.
- Every playground: Reset + Randomize buttons, live KaTeX equation, preset buttons where
  the brief names presets, resize-safe canvas.
- Quiz pass threshold 0.7, configurable via `ML_QUIZ_PASS_THRESHOLD`.
- Grading happens server-side only; never trust a client-submitted `passed`/`score`.
- No dependency on `next-auth`/TensorFlow.js — hand-rolled per spec.
- Reuse `AppShell`/`Sidebar`/`ThemeToggle` conventions; register `/ml` in `TRACKS`.
- Dark mode: every new component must render correctly under `.dark` (use existing
  `dark:` utility conventions from `Sidebar.tsx`/`TrackCard.tsx`, not a second theme system).

---

## Phase A — Foundation (sequential, owned by controller)

### A1. Dependencies & config
Add packages listed above to `package.json`; add `db:generate`/`db:migrate`/`db:seed`
scripts; add `drizzle.config.ts`; add `ML_*` vars to a new `.env.example`; extend
`docker-compose.yml` with an opt-in `postgres` service (profile `postgres`, healthcheck,
named volume `ml_pgdata`); extend `Dockerfile` deps stage with `python3 make g++` (native
module build fallback for `better-sqlite3` on Alpine).

### A2. DB schema + client factory
Files: `src/lib/ml/db/schema.sqlite.ts`, `src/lib/ml/db/schema.pg.ts`,
`src/lib/ml/db/index.ts` (exports `db`, `schema`, chosen by `ML_DB_DRIVER`),
`src/lib/ml/db/migrations/` (drizzle-kit generated, sqlite dialect committed; pg migrations
generated from `schema.pg.ts` under a separate `drizzle-pg.config.ts`).
Tables per spec §4. `db/index.ts` creates the sqlite file (default
`./data/ml.sqlite3`, directory created if missing) and runs `better-sqlite3` in WAL mode.

### A3. Curriculum registry + seed script
`src/lib/ml/curriculum.ts` — the 8-chapter/27-section table from spec §7 (slugs, titles,
order). `src/lib/ml/db/seed.ts` — upserts chapters/sections/quizzes/questions from
`curriculum.ts` + `src/lib/ml/quizzes/index.ts` (aggregates per-section quiz files, empty
array default until Phase B/C populate it — seed script must not crash on a chapter with
no quiz file yet, it just seeds chapter/section rows and skips the quiz).

### A4. Anonymous auth
`src/lib/ml/auth/session.ts` — `getOrCreateProfile()`: reads `ml_profile` cookie, verifies
HMAC-SHA256 signature (`ML_SESSION_SECRET`), on miss creates a `users` row
(`crypto.randomUUID()`), sets a signed httpOnly `SameSite=Lax` cookie (10-year expiry).
Called from `src/app/ml/layout.tsx` (server component) — no client-side auth state needed
beyond the Zustand progress cache.

### A5. Progress engine
`src/lib/ml/progress/service.ts`:
- `getProgressMap(userId): Promise<Record<sectionSlug, 'locked'|'unlocked'|'completed'>>`
- `gradeQuiz(quizId, answers): { score, passed, results: {questionId, correct, explanation}[] }`
  (pure grading function — MCQ exact match, numeric/slider-match within `tolerance`)
- `recordAttempt(userId, quizId, answers): Promise<GradeResult>` — calls `gradeQuiz`,
  writes `quiz_attempts`, on pass marks current section `completed` and next section
  (chapter-relative, else next chapter's first section) `unlocked` if still `locked`.
Unit tests: `service.test.ts` — grading correctness (mcq/numeric/slider-match, tolerance
boundary), unlock-next-on-pass, no-regress-on-fail, first-section-of-first-chapter defaults
unlocked for a brand-new user.

### A6. Server actions + route registration
`src/app/ml/actions.ts`: `submitQuizAttempt`, `savePlaygroundState`, `resetProgress` (Zod
schemas for each input). `src/components/Sidebar.tsx`: add `ml` to `TRACKS` and
`MODULE_ITEMS_BY_TRACK.ml` (generated from `curriculum.ts`, not hand duplicated — import it).
`src/app/page.tsx`: add the ML Foundations Lab card to `TRACKS`.

### A7. Playground primitives
`src/components/ml/primitives/`: `Katex.tsx`, `Slider.tsx` (Radix), `PlaygroundShell.tsx`,
`FunctionPlot.tsx` (D3 scales + SVG, ResizeObserver), `VectorCanvas.tsx`, `MatrixGrid.tsx`,
`Surface3D.tsx` (R3F), `QuizRunner.tsx`. `src/lib/ml/store/progressStore.ts` (Zustand — map
of sectionSlug→status, hydrated from server, mutated optimistically on quiz pass).
`src/lib/ml/hooks/usePlaygroundPersistence.ts` (debounced `savePlaygroundState` sync).

**Interfaces produced (binding for every later phase):**
```ts
// Katex.tsx
export function Katex({ expr, block }: { expr: string; block?: boolean }): JSX.Element
// Slider.tsx
export function Slider({ label, value, min, max, step, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format?: (v: number) => string }): JSX.Element
// PlaygroundShell.tsx
export function PlaygroundShell(props: {
  title: string; description: string; equation?: string;
  onReset: () => void; onRandomize?: () => void;
  presets?: { label: string; apply: () => void }[];
  controls: React.ReactNode; children: React.ReactNode }): JSX.Element
// FunctionPlot.tsx
export function FunctionPlot(props: {
  fn: (x: number) => number; domain: [number, number]; range?: [number, number];
  overlays?: React.ReactNode; onPointerX?: (x: number) => void }): JSX.Element
// VectorCanvas.tsx
export function VectorCanvas(props: {
  vectors: { id: string; x: number; y: number; color?: string; label?: string }[];
  onDragVector?: (id: string, x: number, y: number) => void;
  showSum?: boolean; showProjectionOnto?: string }): JSX.Element
// MatrixGrid.tsx
export function MatrixGrid(props: {
  matrix: [[number, number], [number, number]];
  onChange?: (m: [[number, number], [number, number]]) => void }): JSX.Element
// Surface3D.tsx
export function Surface3D(props: {
  fn: (x: number, y: number) => number; domain: [number, number];
  point?: [number, number]; onDragPoint?: (x: number, y: number) => void;
  showGradient?: boolean; slice?: 'x' | 'y' | null }): JSX.Element
// QuizRunner.tsx
export function QuizRunner(props: {
  sectionSlug: string;
  quiz: { id: string; questions: { id: string; kind: 'mcq'|'numeric'|'slider-match'; prompt: string; options?: string[] }[] };
  onPassed: () => void }): JSX.Element
```

### A8. NN engine
`src/lib/ml/nn/linalg.ts`, `activations.ts` (sigmoid/tanh/relu/softmax + derivatives),
`network.ts` (`class Network` — `forward`, `backward`, `trainStep(lr)`), `datasets.ts`
(`spiral`, `circles`, `xor` generators). `network.test.ts`: finite-difference gradient
check (tolerance 1e-4) across ≥2 architectures — this is the correctness proof for Ch.8.

### A9. Route scaffold
`src/app/ml/layout.tsx` (calls `getOrCreateProfile`, renders chapter/section shell nav),
`src/app/ml/page.tsx` (hub grid), `src/app/ml/progress/page.tsx` (dashboard),
`src/app/ml/[chapter]/page.tsx`, `src/app/ml/[chapter]/[section]/page.tsx` (looks up
`curriculum.ts` + `section-registry.ts`, 404 via `notFound()` on unknown slug, redirects to
`/ml` if section is `locked` for the current user).

**Phase A acceptance:** `npm run typecheck` clean; `npm test` passes including
`service.test.ts` and `network.test.ts`; `/ml` and `/ml/functions-graphs/what-is-a-function`
render in dev with a passing round-trip quiz submission (manually verified in Phase B).

---

## Phase B — Chapter 1 reference implementation (sequential, owned by controller)

Build all 3 sections of `functions-graphs` end to end using the Phase A primitives:
content components in `src/components/ml/tracks/functions-graphs/`, quiz data in
`src/lib/ml/quizzes/functions-graphs/*.ts` (5 questions each, worked answers), registered
in `section-registry.ts` and `quizzes/index.ts`. This is the pattern every Phase C task
copies literally (component shape, quiz file shape, registry entries).

**Acceptance:** seed script populates all 3 sections' quizzes; browser smoke test — visit
`/ml`, open chapter 1, complete section 1's playground, pass its quiz, confirm section 2
unlocks in the sidebar without reload (Zustand optimistic update) and `user_progress`
reflects it after refresh (server-confirmed).

---

## Phase C — Chapters 2–8 (parallel subagents, one per chapter)

Each task builds its chapter's sections (component + quiz data + registry entries) against
the **exact** primitive interfaces from Phase A §A7 and the **exact** file/registration
pattern from Phase B. Dispatched together in one batch; no task depends on another (each
owns disjoint files: its own `src/components/ml/tracks/<chapter>/` dir and
`src/lib/ml/quizzes/<chapter>/` dir, plus one line each in `section-registry.ts` and
`quizzes/index.ts` — controller resolves any registry-file collisions after the batch
returns, not the agents).

- Task C2 — `linear-algebra` (4 sections: vectors, matrix-transformations,
  matrix-operations, eigenvectors-eigenvalues)
- Task C3 — `calculus-derivatives` (4 sections: slope-and-rate-of-change, derivative-rules,
  partial-derivatives, gradient-steepest-ascent) — uses `Surface3D`
- Task C4 — `calculus-integration` (3 sections: area-under-curve, fundamental-theorem,
  integration-in-ml)
- Task C5 — `probability-statistics` (3 sections: distributions, expectation-variance-bayes,
  maximum-likelihood)
- Task C6 — `core-ml-concepts` (4 sections: linear-regression, loss-functions,
  gradient-descent, overfitting-underfitting) — uses `Surface3D`
- Task C7 — `classification-activations` (3 sections: activation-functions,
  logistic-regression, why-nonlinearity-matters)
- Task C8 — `neural-networks` (3 sections: perceptron-to-mlp, train-a-network,
  backpropagation-walkthrough) — uses the Phase A8 NN engine directly, must not
  reimplement forward/backprop

**Acceptance per task:** typecheck clean for the new files; quiz math independently
re-derived and checked by the controller during review (spec's "no hand-waving" bar).

---

## Phase D — Integration & verification (sequential, owned by controller)

1. Merge all `section-registry.ts` / `quizzes/index.ts` entries from Phase C into single
   consistent files (controller-owned file, not per-agent).
2. Run `npm run db:seed` against a fresh sqlite file; verify 8 chapters / 27 sections / 27
   quizzes / 135 questions land.
3. Progress dashboard (`/ml/progress`): completion %, quiz scores, streak, "continue where
   you left off" link — reads `getProgressMap` + `quiz_attempts`.
4. README: setup (SQLite default, `docker compose --profile postgres up` for Postgres),
   seed command, `.env.example` walkthrough.
5. `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all clean.
6. Browser smoke test across ≥3 chapters (2D plot, 3D surface, NN trainer) — verify
   resize behavior and dark mode.

**Acceptance:** deliverable checklist in spec §11 fully checked.
