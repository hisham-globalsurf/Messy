import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { PersonModel } from "@/models/Person";
import { createMemberSessionCookie } from "@/lib/auth/memberSession";
import { memberLoginSchema } from "@/lib/validation";
import { normalizePhone } from "@/lib/phone";
import { clientIp, rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { BLOCKED_MESSAGE } from "@/lib/memberApi";

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 5 * 60 * 1000;

export async function POST(request: Request): Promise<Response> {
  const rateLimitKey = `member-login:${clientIp(request)}`;
  try {
    const { allowed, retryAfterSeconds } = rateLimit(rateLimitKey, MAX_ATTEMPTS, WINDOW_MS);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Try again shortly." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
      );
    }

    const { phone } = memberLoginSchema.parse(await request.json());
    const target = normalizePhone(phone);
    await connectDB();

    const candidates = await PersonModel.find({ phone: { $ne: "" } }).lean();
    const matches = candidates.filter((p) => normalizePhone(p.phone ?? "") === target && target.length === 10);

    if (matches.length === 0) {
      return NextResponse.json(
        { error: "You're not part of this mess yet — please contact the admin." },
        { status: 404 },
      );
    }
    if (matches.length > 1) {
      return NextResponse.json(
        { error: "Multiple people share this number — please contact the admin to fix this." },
        { status: 409 },
      );
    }

    const person = matches[0];
    if (person.blocked) {
      return NextResponse.json({ error: BLOCKED_MESSAGE }, { status: 403 });
    }

    resetRateLimit(rateLimitKey);
    await createMemberSessionCookie({ sub: person._id.toString(), name: person.name });
    return NextResponse.json({ ok: true, name: person.name });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Enter a phone number" }, { status: 422 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
