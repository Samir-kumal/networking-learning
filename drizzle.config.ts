import type { Config } from "drizzle-kit";

// SQLite (default) migration config: `npm run db:generate`.
export default {
  schema: "./src/lib/ml/db/schema.sqlite.ts",
  out: "./src/lib/ml/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.ML_DATABASE_URL ?? "./data/ml.sqlite3",
  },
} satisfies Config;
