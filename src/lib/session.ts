import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "dt_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // ~6 months — personal 2-person household app, long-lived is fine

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Missing SESSION_SECRET env var. Check .env.local.");
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  userName: string;
  householdId: string;
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (
      typeof payload.userId !== "string" ||
      typeof payload.userName !== "string" ||
      typeof payload.householdId !== "string"
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      userName: payload.userName,
      householdId: payload.householdId,
    };
  } catch {
    return null;
  }
}

/** Every authenticated Server Component/layout should call this. proxy.ts
 *  already redirects unauthenticated requests before they get here, but a
 *  Server Action can be invoked directly (see the Data Security guide in
 *  node_modules/next/dist/docs), so pages must not rely on proxy alone. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
