import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { PushSubscriptionModel } from "@/models/PushSubscription";
import { ok } from "@/lib/api";
import { memberRoute } from "@/lib/memberApi";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export const POST = memberRoute(async (session, request: Request) => {
  const input = subscribeSchema.parse(await request.json());
  await connectDB();

  // personId is always taken from the member's own session — never from client input,
  // so a member can't register a subscription against someone else's account.
  await PushSubscriptionModel.findOneAndUpdate(
    { endpoint: input.endpoint },
    { $set: { personId: session.sub, keys: input.keys } },
    { upsert: true },
  );

  return ok({ ok: true });
});
