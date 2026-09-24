import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { PushSubscriptionModel } from "@/models/PushSubscription";
import { ok } from "@/lib/api";
import { memberRoute } from "@/lib/memberApi";

// Real usage is a handful of devices per person — this just bounds how many bogus
// subscriptions one account could pile up (each one gets an outbound request on
// every push send). Past the cap the oldest are evicted rather than the new one being
// refused: a reinstalled app gets a brand-new endpoint while the dead one from the old
// install lingers until a send happens to prune it, and refusing here would leave the
// member with only dead subscriptions — i.e. silently no notifications.
const MAX_SUBSCRIPTIONS_PER_PERSON = 10;

// https-only: real push services always issue https endpoints. Without this, a
// member could point `endpoint` at an internal address or their own server, and
// the server would later make an outbound request there when sending a push (SSRF).
const subscribeSchema = z.object({
  endpoint: z.string().url().refine((url) => url.startsWith("https://"), "Invalid push endpoint"),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
  /** The endpoint this one supersedes on the same device (re-enable / pushsubscriptionchange). */
  replaces: z.string().optional(),
});

export const POST = memberRoute(async (session, request: Request) => {
  const input = subscribeSchema.parse(await request.json());
  await connectDB();

  // personId is always taken from the member's own session — never from client input,
  // so a member can't register a subscription against someone else's account.
  // Only ever deletes the member's own row — a forged `replaces` can't touch anyone else's.
  if (input.replaces && input.replaces !== input.endpoint) {
    await PushSubscriptionModel.deleteOne({ endpoint: input.replaces, personId: session.sub });
  }

  await PushSubscriptionModel.findOneAndUpdate(
    { endpoint: input.endpoint },
    { $set: { personId: session.sub, keys: input.keys } },
    { upsert: true },
  );

  const overflow = await PushSubscriptionModel.find({ personId: session.sub }, { _id: 1 })
    .sort({ updatedAt: -1 })
    .skip(MAX_SUBSCRIPTIONS_PER_PERSON)
    .lean();
  if (overflow.length > 0) {
    await PushSubscriptionModel.deleteMany({ _id: { $in: overflow.map((o) => o._id) } });
  }

  return ok({ ok: true });
});
