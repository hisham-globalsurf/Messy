import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { PersonModel } from "@/models/Person";
import { LOGIN_REQUEST_TTL_MS, MemberDeviceModel } from "@/models/MemberDevice";
import { getPendingLoginDeviceId, setPendingLoginCookie } from "@/lib/auth/memberSession";
import { memberLoginSchema } from "@/lib/validation";
import { normalizePhone } from "@/lib/phone";
import { deviceLabel } from "@/lib/deviceLabel";
import { clientIp, rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { BLOCKED_MESSAGE } from "@/lib/memberApi";
import { publishDeviceRequestsChanged } from "@/lib/ably";
import { sendPushToAdmins } from "@/lib/push";
import { errorResponse } from "@/lib/api";

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 5 * 60 * 1000;
/** Caps how many requests can sit in the admin's list for one member at once, so someone
 * hammering a member's number can't bury the real request. */
const MAX_PENDING_PER_PERSON = 3;

/** Step one of a member login: matches the phone number to a Person, then files a pending
 * device request for the admin to approve. Nothing is logged in here — the browser only gets a
 * short-lived pending cookie, and /api/member/login/status swaps it for a real session once the
 * admin approves. */
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

    const { phone, standalone } = memberLoginSchema.parse(await request.json());
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
    const now = new Date();

    // Same browser submitting again for the same member (e.g. tapped Continue twice, or reopened
    // the app mid-wait) keeps its existing request rather than stacking a duplicate.
    const existingId = await getPendingLoginDeviceId();
    if (existingId) {
      const existing = await MemberDeviceModel.findOne({
        _id: existingId,
        personId: person._id,
        status: "pending",
        expireAt: { $gt: now },
      }).lean();
      if (existing) {
        return NextResponse.json({ status: "pending", name: person.name, code: existing.code });
      }
    }

    const pendingCount = await MemberDeviceModel.countDocuments({
      personId: person._id,
      status: "pending",
      expireAt: { $gt: now },
    });
    if (pendingCount >= MAX_PENDING_PER_PERSON) {
      return NextResponse.json(
        { error: "There are already login requests waiting for this number. Please ask the admin to review them." },
        { status: 429 },
      );
    }

    const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 400);
    const label = deviceLabel(userAgent, standalone);
    const code = String(randomInt(10, 100));
    const device = await MemberDeviceModel.create({
      personId: person._id,
      personName: person.name,
      status: "pending",
      code,
      label,
      userAgent,
      expireAt: new Date(now.getTime() + LOGIN_REQUEST_TTL_MS),
    });
    await setPendingLoginCookie(device._id.toString());

    await publishDeviceRequestsChanged();
    try {
      await sendPushToAdmins(
        { title: "Login request", body: `${person.name} wants to log in on ${label} · code ${code}`, url: "/dashboard" },
        { ttlSeconds: LOGIN_REQUEST_TTL_MS / 1000 },
      );
    } catch (err) {
      // The request is already saved and shows in the admin app — the push is only a nudge.
      console.error("Login request push to admins failed:", err);
    }

    return NextResponse.json({ status: "pending", name: person.name, code });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Enter a phone number" }, { status: 422 });
    }
    return errorResponse(err);
  }
}
