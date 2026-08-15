// Node-only module (fs, native better-sqlite3/pg addons): never importable from a
// client bundle, and also loaded directly by standalone scripts (seed.ts,
// migrate.ts) via tsx outside of Next's build — so this intentionally does not
// import the `server-only` sentinel package, which throws unconditionally when
// required outside Next's webpack alias resolution.
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { Pool } from "pg";
import { drizzle as drizzleSqlite, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate as migrateSqlite } from "drizzle-orm/better-sqlite3/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import * as sqliteSchema from "./schema.sqlite";
import * as pgSchema from "./schema.pg";

export type MlDbDriver = "sqlite" | "postgres";

// Self-hosted, typically single-instance deployments: apply pending migrations on
// startup rather than requiring a separate deploy step. Drizzle's migrator tracks
// applied migrations in a __drizzle_migrations table and no-ops when there is
// nothing new, so this is safe to run on every process boot.
function createSqliteDb() {
  const url = process.env.ML_DATABASE_URL ?? "./data/ml.sqlite3";
  const filePath = url.startsWith("file:") ? url.slice("file:".length) : url;
  // turbopackIgnore: ML_DATABASE_URL is an operator-controlled env var (a local file
  // path or "file:" URL), never traced/bundled content — without this, Turbopack's
  // static analysis can't prove the path is scoped and traces the whole project into
  // the standalone output.
  const resolved = path.resolve(/* turbopackIgnore: true */ process.cwd(), filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const sqlite = new Database(resolved);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const client = drizzleSqlite(sqlite, { schema: sqliteSchema });
  migrateSqlite(client, {
    migrationsFolder: path.resolve(process.cwd(), "src/lib/ml/db/migrations"),
  });
  return client;
}

function createPgDb() {
  const connectionString = process.env.ML_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "ML_DATABASE_URL is required when ML_DB_DRIVER=postgres (see .env.example)",
    );
  }
  const pool = new Pool({ connectionString });
  const client = drizzlePg(pool, { schema: pgSchema });
  void migratePg(client, {
    migrationsFolder: path.resolve(process.cwd(), "src/lib/ml/db/migrations-pg"),
  }).catch((error: unknown) => {
    console.error("ML Foundations Lab: Postgres migration failed", error);
  });
  return client;
}

const driver: MlDbDriver = process.env.ML_DB_DRIVER === "postgres" ? "postgres" : "sqlite";

/**
 * The active dialect's table definitions. Both schema files declare identical
 * table/column names (see schema.sqlite.ts / schema.pg.ts headers), so callers can
 * write dialect-agnostic queries against `schema.<table>` regardless of which
 * driver is active.
 */
export const schema = (driver === "postgres" ? pgSchema : sqliteSchema) as typeof sqliteSchema;

/**
 * The active Drizzle client. Typed against the SQLite dialect (the default,
 * fully-tested path) because Drizzle's per-dialect instance types don't unify
 * cleanly; the Postgres instance is structurally compatible for the basic
 * select/insert/update/delete builder calls this codebase uses (no dialect-specific
 * SQL functions), so the bridge cast is safe for our query surface.
 *
 * Lazily created on first use (via the Proxy below), not at module load. Next.js's
 * build-time "Collecting page data" step imports every route module, which runs
 * this module's top level — eagerly opening a native DB connection and running
 * migrations there executes real file/native-addon I/O inside the build process
 * rather than at request time, which is both semantically wrong (build time isn't
 * runtime) and has been observed to crash a Turbopack build worker in at least one
 * constrained container environment. The Proxy defers `createSqliteDb()`/
 * `createPgDb()` until the first actual property access (i.e. the first real query).
 */
let cachedClient: BetterSQLite3Database<typeof sqliteSchema> | undefined;

function resolveClient(): BetterSQLite3Database<typeof sqliteSchema> {
  if (!cachedClient) {
    cachedClient = (driver === "postgres" ? createPgDb() : createSqliteDb()) as unknown as BetterSQLite3Database<
      typeof sqliteSchema
    >;
  }
  return cachedClient;
}

export const db: BetterSQLite3Database<typeof sqliteSchema> = new Proxy(
  {} as BetterSQLite3Database<typeof sqliteSchema>,
  {
    get(_target, prop, receiver) {
      return Reflect.get(resolveClient(), prop, receiver);
    },
  },
);
