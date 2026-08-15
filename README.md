This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## ML Foundations Lab (`/ml`)

An interactive machine-learning curriculum track: 8 chapters, 27 gated sections, each
with a live playground and a database-backed quiz. See
`docs/superpowers/specs/2026-08-15-ml-foundations-lab-design.md` for the full design.

### Setup (SQLite — default, no extra services)

```bash
npm install
cp .env.example .env.local   # defaults work as-is
npm run db:migrate           # creates ./data/ml.sqlite3 and applies the schema
npm run db:seed              # populates chapters, sections, quizzes, questions
npm run dev                  # visit http://localhost:3000/ml
```

The SQLite database also auto-migrates on server startup (`src/lib/ml/db/index.ts`), so
`npm run db:migrate` is only needed if you want migrations applied before first boot
(e.g. in CI). `npm run db:seed` is always required at least once — it's what populates
the curriculum and quiz content, and is safe to re-run any time quiz content changes
(it upserts by slug, and never touches user progress).

### Upgrading to PostgreSQL (optional)

```bash
docker compose --profile postgres up -d postgres
```

Then set in `.env.local`:

```bash
ML_DB_DRIVER=postgres
ML_DATABASE_URL=postgres://ml:ml@localhost:5433/ml_foundations_lab
```

No application code changes are needed — `src/lib/ml/db/index.ts` selects the driver at
startup from `ML_DB_DRIVER` and mirrors the same schema
(`src/lib/ml/db/schema.sqlite.ts` / `schema.pg.ts`). Generate/update Postgres migrations
with `npm run db:generate:pg` (writes to `src/lib/ml/db/migrations-pg/`).

### Other environment variables

See `.env.example` for the full list — `ML_SESSION_SECRET` (signs the anonymous
profile cookie; change it in any shared deployment) and `ML_QUIZ_PASS_THRESHOLD`
(default `0.7`) are the two worth knowing about beyond the DB settings above.

### Auth model

No accounts, no passwords. On first visit, `src/proxy.ts` mints a signed anonymous
profile cookie; progress, quiz attempts, and playground state are all scoped to that
profile. Clearing cookies starts a fresh profile.

### Tests

`npm test` covers the from-scratch neural-network engine (`src/lib/ml/nn/`, verified via
finite-difference gradient checks against the analytic backprop implementation) and the
quiz-grading / progression-unlock logic (`src/lib/ml/progress/`, run against an in-memory
SQLite database migrated with the real schema).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
