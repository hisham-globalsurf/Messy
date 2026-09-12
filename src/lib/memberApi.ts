import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getMemberSession } from "@/lib/auth/memberSession";
import { connectDB } from "@/lib/db/mongoose";
import { PersonModel } from "@/models/Person";
import { ApiError } from "@/lib/api";
import type { MemberSessionUser } from "@/types";

export const BLOCKED_MESSAGE = "You've been blocked by the admin. Please contact them for help.";

/** Re-checks the Person record on every request (not just at login) — a member's 10-year
 * session cookie shouldn't keep working the moment an admin blocks or deletes them. */
export async function requireMemberSession(): Promise<MemberSessionUser> {
  const session = await getMemberSession();
  if (!session) throw new ApiError(401, "Not authenticated");

  await connectDB();
  const person = await PersonModel.findById(session.sub).lean();
  if (!person) throw new ApiError(401, "Not authenticated");
  if (person.blocked) throw new ApiError(403, BLOCKED_MESSAGE);

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
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: "Invalid input", issues: err.flatten() },
          { status: 422 },
        );
      }
      console.error(err);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}
