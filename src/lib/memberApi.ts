import "server-only";
import { getMemberSession } from "@/lib/auth/memberSession";
import { connectDB } from "@/lib/db/mongoose";
import { PersonModel } from "@/models/Person";
import { ApiError, errorResponse } from "@/lib/api";
import type { MemberSessionUser } from "@/types";

export const BLOCKED_MESSAGE = "You've been blocked by the admin. Please contact them for help.";

async function loadMemberSession(): Promise<{ session: MemberSessionUser; blocked: boolean }> {
  const session = await getMemberSession();
  if (!session) throw new ApiError(401, "Not authenticated");

  await connectDB();
  const person = await PersonModel.findById(session.sub, { blocked: 1 }).lean();
  if (!person) throw new ApiError(401, "Not authenticated");

  return { session, blocked: person.blocked ?? false };
}

/** Session + Person-still-exists check, without the blocked check — used where a blocked member
 * must still be reachable, e.g. the Ably token route (so the "blocked-changed" realtime event
 * can reach an already-open tab and unblock it without a manual refresh). Prefer
 * `requireMemberSession` below for anything that isn't specifically that case. */
export async function requireMemberSessionIgnoringBlock(): Promise<MemberSessionUser> {
  const { session } = await loadMemberSession();
  return session;
}

/** Re-checks the Person record on every request (not just at login) — a member's 10-year
 * session cookie shouldn't keep working the moment an admin blocks or deletes them. */
export async function requireMemberSession(): Promise<MemberSessionUser> {
  const { session, blocked } = await loadMemberSession();
  if (blocked) throw new ApiError(403, BLOCKED_MESSAGE);
  return session;
}

/** Wraps a member route handler: injects the member session, maps thrown errors to JSON responses.
 * Deliberately separate from `route()` in `src/lib/api.ts` — keeps admin auth code untouched. */
export function memberRoute<T extends unknown[]>(
  handler: (session: MemberSessionUser, ...args: T) => Promise<Response>,
) {
  return async (...args: T): Promise<Response> => {
    try {
      const session = await requireMemberSession();
      return await handler(session, ...args);
    } catch (err) {
      return errorResponse(err);
    }
  };
}
