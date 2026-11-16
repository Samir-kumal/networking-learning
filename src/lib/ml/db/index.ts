// Server-only D1 client for the ML Foundations Lab. The database is the Cloudflare
// D1 binding `networking_learning_ml` (declared in wrangler.jsonc). Schema lives in
// schema.sqlite.ts and is applied through `migrations/` with `wrangler d1 migrations`.
import { env } from "cloudflare:workers";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema.sqlite";

export { schema };

export type MlDb = DrizzleD1Database<typeof schema>;

/**
 * Dialect-level client type shared by the D1 client and the in-memory SQLite test
 * client, so service functions accept either one.
 */
export type MlDbClient = BaseSQLiteDatabase<"sync" | "async", any, typeof schema>;

/**
 * Lazily created on first property access rather than at module load, so importing
 * this module (for example during a build's page-data collection step) never touches
 * the binding.
 */
let cachedClient: MlDb | undefined;

function resolveClient(): MlDb {
  if (!cachedClient) {
    cachedClient = drizzle(env.networking_learning_ml, { schema });
  }
  return cachedClient;
}

export const db: MlDb = new Proxy({} as MlDb, {
  get(_target, prop, receiver) {
    return Reflect.get(resolveClient(), prop, receiver);
  },
});
