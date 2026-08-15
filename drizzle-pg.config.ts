import type { Config } from "drizzle-kit";

// Postgres migration config (opt-in upgrade path): `npm run db:generate:pg`.
export default {
  schema: "./src/lib/ml/db/schema.pg.ts",
  out: "./src/lib/ml/db/migrations-pg",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.ML_DATABASE_URL ??
      "postgres://ml:ml@localhost:5433/ml_foundations_lab",
  },
} satisfies Config;
