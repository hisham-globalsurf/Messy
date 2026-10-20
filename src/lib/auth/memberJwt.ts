import { SignJWT, jwtVerify } from "jose";
import type { MemberSessionUser } from "@/types";

export const MEMBER_SESSION_COOKIE = "messy_member_session";
// Effectively non-expiring, per spec — 10 years.
export const MEMBER_SESSION_MAX_AGE = 60 * 60 * 24 * 365 * 10;

/** Holds a not-yet-approved login request (its MemberDevice id) while the member waits. Outlives
 * the request itself (LOGIN_REQUEST_TTL_MS) so an approval that lands after the member closed the
 * app is still picked up when they reopen it. */
export const MEMBER_PENDING_COOKIE = "messy_member_pending";
export const MEMBER_PENDING_MAX_AGE = 24 * 60 * 60;

function getSecret(): Uint8Array {
  const secret = process.env.MEMBER_AUTH_SECRET;
  if (!secret) throw new Error("MEMBER_AUTH_SECRET is not set.");
  return new TextEncoder().encode(secret);
}

/** Verified session claims. `did` (the approved MemberDevice id) is absent on sessions issued
 * before device approval existed — those stay valid until the admin logs that member out
 * everywhere (Person.sessionsRevokedAt). */
export interface MemberSessionClaims extends MemberSessionUser {
  did?: string;
}

export async function signMemberSession(user: MemberSessionUser, deviceId: string): Promise<string> {
  return new SignJWT({ name: user.name, did: deviceId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime(`${MEMBER_SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifyMemberSession(token: string): Promise<MemberSessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (payload.typ === "pending") return null;
    if (!payload.sub || typeof payload.name !== "string") return null;
    return {
      sub: payload.sub,
      name: payload.name,
      did: typeof payload.did === "string" ? payload.did : undefined,
    };
  } catch {
    return null;
  }
}

/** Deliberately carries no `sub`/`name`, and `typ: "pending"` is rejected above, so this token
 * can never be mistaken for a session even if copied into the session cookie. */
export async function signPendingLogin(deviceId: string): Promise<string> {
  return new SignJWT({ typ: "pending", did: deviceId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MEMBER_PENDING_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifyPendingLogin(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (payload.typ !== "pending" || typeof payload.did !== "string") return null;
    return payload.did;
  } catch {
    return null;
  }
}
