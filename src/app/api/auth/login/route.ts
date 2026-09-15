import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { AdminUserModel } from "@/models/AdminUser";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionCookie } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation";
import { clientIp, rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { errorResponse } from "@/lib/api";

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 5 * 60 * 1000;

export async function POST(request: Request): Promise<Response> {
  const rateLimitKey = `login:${clientIp(request)}`;
  try {
    const { allowed, retryAfterSeconds } = rateLimit(rateLimitKey, MAX_ATTEMPTS, WINDOW_MS);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Try again shortly." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
      );
    }

    const body = loginSchema.parse(await request.json());
    await connectDB();

    const user = await AdminUserModel.findOne({ username: body.username });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    resetRateLimit(rateLimitKey);
    await createSessionCookie({ sub: user._id.toString(), username: user.username });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
