import "server-only";
import { cookies } from "next/headers";
import {
  MEMBER_SESSION_COOKIE,
  MEMBER_SESSION_MAX_AGE,
  signMemberSession,
  verifyMemberSession,
} from "./memberJwt";
import type { MemberSessionUser } from "@/types";

export async function getMemberSession(): Promise<MemberSessionUser | null> {
  const store = await cookies();
  const token = store.get(MEMBER_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyMemberSession(token);
}

export async function createMemberSessionCookie(user: MemberSessionUser): Promise<void> {
  const token = await signMemberSession(user);
  const store = await cookies();
  store.set(MEMBER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MEMBER_SESSION_MAX_AGE,
  });
}

export async function clearMemberSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(MEMBER_SESSION_COOKIE);
}
