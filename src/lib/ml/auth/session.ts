import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/ml/db";
import { ML_PROFILE_COOKIE, verifyProfileToken } from "./token";

export interface Profile {
  id: string;
  displayName: string | null;
}

/**
 * Reads the current anonymous profile id from the signed cookie set by
 * src/proxy.ts. Every /ml/* request passes through that proxy before reaching a
 * Server Component/Action, so this is non-null for any in-scope route.
 */
export async function getProfileId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(ML_PROFILE_COOKIE)?.value;
  return token ? verifyProfileToken(token) : null;
}

/**
 * Idempotently ensures a `users` row exists for a profile id. Cookie issuance
 * happens in src/proxy.ts (Edge-safe, no DB access there); the row is created
 * lazily the first time a Server Component/Action needs to read or write user data.
 */
export async function ensureUserRow(profileId: string): Promise<void> {
  await db
    .insert(schema.users)
    .values({ id: profileId, displayName: null, createdAt: new Date() })
    .onConflictDoNothing({ target: schema.users.id });
}

/** Profile id + guaranteed DB row, for Server Components/Actions that read or write user data. */
export async function requireProfile(): Promise<Profile> {
  const profileId = await getProfileId();
  if (!profileId) {
    throw new Error(
      "No ML Foundations Lab profile cookie found for this request — is the route covered by the /ml matcher in src/proxy.ts?",
    );
  }
  await ensureUserRow(profileId);
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, profileId)).limit(1);
  return { id: profileId, displayName: rows[0]?.displayName ?? null };
}
