import { NextResponse, type NextRequest } from "next/server";
import {
  ML_PROFILE_COOKIE,
  ML_PROFILE_COOKIE_MAX_AGE_SECONDS,
  signProfileToken,
  verifyProfileToken,
} from "@/lib/ml/auth/token";

// Ensures every request under /ml carries a signed anonymous-profile cookie before
// it reaches a Server Component. Setting cookies during Server Component rendering
// is disallowed by Next.js, so profile bootstrap happens here instead; the
// corresponding `users` DB row is created lazily on first write (see
// src/lib/ml/auth/session.ts) since this Edge-capable proxy has no DB access.
// (Next.js 16 renamed the "middleware" file convention to "proxy" — same runtime.)
export async function proxy(request: NextRequest) {
  const existingToken = request.cookies.get(ML_PROFILE_COOKIE)?.value;
  const existingProfileId = existingToken ? await verifyProfileToken(existingToken) : null;
  if (existingProfileId) {
    return NextResponse.next();
  }

  const profileId = crypto.randomUUID();
  const token = await signProfileToken(profileId);
  const response = NextResponse.next();
  response.cookies.set(ML_PROFILE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ML_PROFILE_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
  return response;
}

export const config = {
  matcher: ["/ml/:path*"],
};
