import "server-only";
import { cookies } from "next/headers";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { MemberDeviceModel } from "@/models/MemberDevice";
import { PersonModel } from "@/models/Person";
import {
  MEMBER_PENDING_COOKIE,
  MEMBER_PENDING_MAX_AGE,
  MEMBER_SESSION_COOKIE,
  MEMBER_SESSION_MAX_AGE,
  signMemberSession,
  signPendingLogin,
  verifyMemberSession,
  verifyPendingLogin,
  type MemberSessionClaims,
} from "./memberJwt";
import type { MemberSessionUser } from "@/types";

const LAST_SEEN_INTERVAL_MS = 60 * 60 * 1000;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/** Verifies the cookie and that it's still allowed in: a device-approved session needs its
 * MemberDevice to still be approved (deleting it is how the admin logs that device out); a
 * session from before device approval needs the admin not to have logged the member out
 * everywhere since. */
export async function getMemberSession(): Promise<MemberSessionClaims | null> {
  const store = await cookies();
  const token = store.get(MEMBER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const claims = await verifyMemberSession(token);
  if (!claims || !isValidObjectId(claims.sub)) return null;

  await connectDB();
  if (claims.did) {
    if (!isValidObjectId(claims.did)) return null;
    const device = await MemberDeviceModel.findOne(
      { _id: claims.did, personId: claims.sub, status: "approved" },
      { lastSeenAt: 1 },
    ).lean();
    if (!device) return null;
    // "Last used" for the admin's device list — throttled so it's not a write per request.
    if (!device.lastSeenAt || Date.now() - device.lastSeenAt.getTime() > LAST_SEEN_INTERVAL_MS) {
      await MemberDeviceModel.updateOne({ _id: device._id }, { $set: { lastSeenAt: new Date() } }).catch(() => {});
    }
  } else {
    const person = await PersonModel.findById(claims.sub, { sessionsRevokedAt: 1 }).lean();
    if (person?.sessionsRevokedAt) return null;
  }
  return claims;
}

export async function createMemberSessionCookie(user: MemberSessionUser, deviceId: string): Promise<void> {
  const token = await signMemberSession(user, deviceId);
  const store = await cookies();
  store.set(MEMBER_SESSION_COOKIE, token, { ...cookieOptions, maxAge: MEMBER_SESSION_MAX_AGE });
}

export async function clearMemberSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(MEMBER_SESSION_COOKIE);
}

export async function setPendingLoginCookie(deviceId: string): Promise<void> {
  const token = await signPendingLogin(deviceId);
  const store = await cookies();
  store.set(MEMBER_PENDING_COOKIE, token, { ...cookieOptions, maxAge: MEMBER_PENDING_MAX_AGE });
}

/** The MemberDevice id of this browser's waiting login request, if any. */
export async function getPendingLoginDeviceId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(MEMBER_PENDING_COOKIE)?.value;
  if (!token) return null;
  const deviceId = await verifyPendingLogin(token);
  return deviceId && isValidObjectId(deviceId) ? deviceId : null;
}

export async function clearPendingLoginCookie(): Promise<void> {
  const store = await cookies();
  store.delete(MEMBER_PENDING_COOKIE);
}
