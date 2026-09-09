import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession } from "@/lib/auth/session";
import type { SessionUser } from "@/types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new ApiError(401, "Not authenticated");
  return session;
}

/** Wraps a route handler: injects the session, maps thrown errors to JSON responses. */
export function route<T extends unknown[]>(
  handler: (session: SessionUser, ...args: T) => Promise<Response>,
) {
  return async (...args: T): Promise<Response> => {
    try {
      const session = await requireSession();
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

export function ok<T>(data: T, status = 200): Response {
  return NextResponse.json(data, { status });
}
