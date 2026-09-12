import { SignJWT, jwtVerify } from "jose";
import type { MemberSessionUser } from "@/types";

export const MEMBER_SESSION_COOKIE = "messy_member_session";
// Effectively non-expiring, per spec — 10 years.
export const MEMBER_SESSION_MAX_AGE = 60 * 60 * 24 * 365 * 10;

function getSecret(): Uint8Array {
  const secret = process.env.MEMBER_AUTH_SECRET;
  if (!secret) throw new Error("MEMBER_AUTH_SECRET is not set.");
  return new TextEncoder().encode(secret);
}

export async function signMemberSession(user: MemberSessionUser): Promise<string> {
  return new SignJWT({ name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime(`${MEMBER_SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifyMemberSession(token: string): Promise<MemberSessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.name !== "string") return null;
    return { sub: payload.sub, name: payload.name };
  } catch {
    return null;
  }
}
