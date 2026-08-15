// In-memory SQLite Drizzle client for tests — migrated with the same generated SQL
// files the real app uses, so schema drift between tests and production is
// impossible. Not imported by any production code path.
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema.sqlite";

export type TestDb = BetterSQLite3Database<typeof schema>;

export function createTestDb(): TestDb {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.resolve(process.cwd(), "src/lib/ml/db/migrations") });
  return db;
}

export { schema };
