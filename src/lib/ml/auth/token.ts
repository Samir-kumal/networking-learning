// HMAC-signed anonymous profile token. Web Crypto only (no Node `crypto` import)
// so this module works unmodified in both Next.js Middleware (Edge runtime) and
// Server Components/Actions (Node runtime).

export const ML_PROFILE_COOKIE = "ml_profile";
export const ML_PROFILE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 10; // 10 years

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacHex(value: string): Promise<string> {
  const secret = process.env.ML_SESSION_SECRET ?? "dev-only-insecure-secret-change-me";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toHex(signature);
}

export async function signProfileToken(profileId: string): Promise<string> {
  return `${profileId}.${await hmacHex(profileId)}`;
}

/** Verifies a token minted by signProfileToken; returns the profile id or null. */
export async function verifyProfileToken(token: string): Promise<string | null> {
  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex === -1) return null;

  const profileId = token.slice(0, separatorIndex);
  const mac = token.slice(separatorIndex + 1);
  const expected = await hmacHex(profileId);
  if (mac.length !== expected.length) return null;

  // Web Crypto has no timingSafeEqual; a length-checked full-string compare is an
  // acceptable mitigation here — this token gates an anonymous display name and
  // quiz progress, not a secret.
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= mac.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0 ? profileId : null;
}
