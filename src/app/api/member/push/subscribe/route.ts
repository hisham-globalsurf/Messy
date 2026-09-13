import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { PushSubscriptionModel } from "@/models/PushSubscription";
import { ApiError, ok } from "@/lib/api";
import { memberRoute } from "@/lib/memberApi";

// Real usage is a handful of devices per person — this just bounds how many bogus
// subscriptions one account could pile up (each one gets an outbound request on
// every push send), without affecting anyone's real multi-device usage.
const MAX_SUBSCRIPTIONS_PER_PERSON = 10;

// https-only: real push services always issue https endpoints. Without this, a
// member could point `endpoint` at an internal address or their own server, and
// the server would later make an outbound request there when sending a push (SSRF).
const subscribeSchema = z.object({
  endpoint: z.string().url().refine((url) => url.startsWith("https://"), "Invalid push endpoint"),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export const POST = memberRoute(async (session, request: Request) => {
  const input = subscribeSchema.parse(await request.json());
  await connectDB();

  // personId is always taken from the member's own session — never from client input,
  // so a member can't register a subscription against someone else's account.
  const existing = await PushSubscriptionModel.findOne({ endpoint: input.endpoint }).lean();
  if (!existing) {
    const count = await PushSubscriptionModel.countDocuments({ personId: session.sub });
    if (count >= MAX_SUBSCRIPTIONS_PER_PERSON) {
      throw new ApiError(429, "Too many devices enabled for notifications");
    }
  }

  await PushSubscriptionModel.findOneAndUpdate(
    { endpoint: input.endpoint },
    { $set: { personId: session.sub, keys: input.keys } },
    { upsert: true },
  );

  return ok({ ok: true });
});
