// Node-only module (fs, native better-sqlite3/pg addons): never importable from a
// client bundle, and also loaded directly by standalone scripts (seed.ts,
// migrate.ts) via tsx outside of Next's build — so this intentionally does not
// import the `server-only` sentinel package, which throws unconditionally when
// required outside Next's webpack alias resolution.
import fs from "node:fs";
import os from "node:os";
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
  const isVercel = Boolean(process.env.VERCEL);
  const defaultPath = isVercel
    ? path.join(os.tmpdir(), "ml.sqlite3")
    : "./data/ml.sqlite3";
  const url = process.env.ML_DATABASE_URL ?? defaultPath;
  const filePath = url.startsWith("file:") ? url.slice("file:".length) : url;
  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(/* turbopackIgnore: true */ process.cwd(), filePath);

  try {
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
  } catch {
    // Ignore directory creation errors on read-only filesystems
  }

  const sqlite = new Database(resolved);
  sqlite.pragma(isVercel ? "journal_mode = DELETE" : "journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  // Directly ensure tables exist so serverless environments without migration files never fail
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS chapters (id text PRIMARY KEY NOT NULL, title text NOT NULL, summary text NOT NULL, "order" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS sections (id text PRIMARY KEY NOT NULL, chapter_id text NOT NULL, title text NOT NULL, "order" integer NOT NULL, FOREIGN KEY (chapter_id) REFERENCES chapters(id));
    CREATE TABLE IF NOT EXISTS quizzes (id text PRIMARY KEY NOT NULL, section_id text NOT NULL, pass_threshold real DEFAULT 0.7 NOT NULL, FOREIGN KEY (section_id) REFERENCES sections(id));
    CREATE TABLE IF NOT EXISTS questions (id text PRIMARY KEY NOT NULL, quiz_id text NOT NULL, "order" integer NOT NULL, kind text NOT NULL, prompt text NOT NULL, options text, correct_answer text NOT NULL, tolerance real, explanation text NOT NULL, FOREIGN KEY (quiz_id) REFERENCES quizzes(id));
    CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY NOT NULL, display_name text, created_at integer NOT NULL);
    CREATE TABLE IF NOT EXISTS user_progress (id text PRIMARY KEY NOT NULL, user_id text NOT NULL, section_id text NOT NULL, status text NOT NULL, best_score real, attempt_count integer DEFAULT 0 NOT NULL, updated_at integer NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (section_id) REFERENCES sections(id));
    CREATE TABLE IF NOT EXISTS quiz_attempts (id text PRIMARY KEY NOT NULL, user_id text NOT NULL, quiz_id text NOT NULL, score real NOT NULL, passed integer NOT NULL, answers text NOT NULL, created_at integer NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (quiz_id) REFERENCES quizzes(id));
    CREATE TABLE IF NOT EXISTS playground_state (id text PRIMARY KEY NOT NULL, user_id text NOT NULL, playground_key text NOT NULL, state text NOT NULL, updated_at integer NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id));
    CREATE UNIQUE INDEX IF NOT EXISTS user_progress_user_section_idx ON user_progress (user_id, section_id);
    CREATE UNIQUE INDEX IF NOT EXISTS playground_state_user_key_idx ON playground_state (user_id, playground_key);
    CREATE UNIQUE INDEX IF NOT EXISTS quizzes_section_id_unique ON quizzes (section_id);
  `);

  const client = drizzleSqlite(sqlite, { schema: sqliteSchema });

  try {
    const migrationsFolder = path.resolve(process.cwd(), "src/lib/ml/db/migrations");
    if (fs.existsSync(migrationsFolder)) {
      migrateSqlite(client, { migrationsFolder });
    }
  } catch (error) {
    console.warn("SQLite migration skipped:", error);
  }

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
