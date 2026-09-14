import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Route protection. Next.js 16 renamed `middleware.ts` to `proxy.ts` (same
// mechanism, new name/export) — see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
//
// This only checks that the session cookie is present and validly signed.
// It does NOT read the household/user out of it for authorization decisions
// beyond "signed in or not" — every Server Action re-derives the session
// itself via getSession() and must not trust proxy having run.

const COOKIE_NAME = "dt_session";
const PUBLIC_PATHS = ["/sign-in"];

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Missing SESSION_SECRET env var. Check .env.local.");
  return new TextEncoder().encode(secret);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  const token = request.cookies.get(COOKIE_NAME)?.value;
  let signedIn = false;
  if (token) {
    try {
      await jwtVerify(token, secretKey());
      signedIn = true;
    } catch {
      signedIn = false;
    }
  }

  if (!signedIn && !isPublicPath) {
    const url = new URL("/sign-in", request.url);
    return NextResponse.redirect(url);
  }
  if (signedIn && isPublicPath) {
    const url = new URL("/week", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
