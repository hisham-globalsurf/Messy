import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { PushSubscriptionModel } from "@/models/PushSubscription";
import { SettingsModel } from "@/models/Settings";
import { sendPushToEndpoint } from "@/lib/push";
import { ApiError, ok } from "@/lib/api";
import { memberRoute } from "@/lib/memberApi";

// Bounds how many bogus subscriptions one account could pile up (each one gets an outbound
// request on every push send). Past the cap the oldest are evicted rather than the new one
// being refused — refusing could leave a member holding only dead subscriptions.
const MAX_SUBSCRIPTIONS_PER_PERSON = 10;

// https-only: real push services always issue https endpoints. Without this, a
// member could point `endpoint` at an internal address or their own server, and
// the server would later make an outbound request there when sending a push (SSRF).
const subscribeSchema = z.object({
  endpoint: z.string().url().refine((url) => url.startsWith("https://"), "Invalid push endpoint"),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
  /** "sync": the page-load check. Only refreshes a subscription the server already has — an
   * unknown one means it was pruned after the push service rejected it (or never saved), so
   * the client must resubscribe fresh rather than re-register an endpoint that may be dead.
   * "enable": the member tapped Enable — this device becomes their only subscription (old
   * installs/devices are dropped — a still-live one gets "unknown" from its next "sync" and
   * re-registers itself) and a confirmation push is sent to prove delivery end-to-end.
   * "replace": save this one, dropping `replaces` if given (the service worker's
   * pushsubscriptionchange, or a sync that had to resubscribe). The default because it's the only
   * harmless one — a request without a mode (e.g. a tab still running pre-mode client code) must
   * not wipe the member's other devices and fire a confirmation push the way "enable" does. */
  mode: z.enum(["sync", "enable", "replace"]).default("replace"),
  replaces: z.string().optional(),
});

export const POST = memberRoute(async (session, request: Request) => {
  const { endpoint, keys, mode, replaces } = subscribeSchema.parse(await request.json());
  await connectDB();

  // personId is always taken from the member's own session — never from client input, so a
  // member can't register a subscription against someone else's account. An endpoint that
  // belonged to someone else (shared phone, different member logged in) moves to this member.
  if (mode === "sync") {
    const known = await PushSubscriptionModel.findOneAndUpdate(
      { endpoint },
      { $set: { personId: session.sub, keys } },
    ).lean();
    return ok({ saved: Boolean(known) });
  }

  await PushSubscriptionModel.findOneAndUpdate(
    { endpoint },
    { $set: { personId: session.sub, keys } },
    { upsert: true },
  );

  if (mode === "enable") {
    await PushSubscriptionModel.deleteMany({ personId: session.sub, endpoint: { $ne: endpoint } });
  } else if (replaces && replaces !== endpoint) {
    // Only ever deletes the member's own row — a forged `replaces` can't touch anyone else's.
    await PushSubscriptionModel.deleteOne({ endpoint: replaces, personId: session.sub });
  }

  const overflow = await PushSubscriptionModel.find({ personId: session.sub }, { _id: 1 })
    .sort({ updatedAt: -1 })
    .skip(MAX_SUBSCRIPTIONS_PER_PERSON)
    .lean();
  if (overflow.length > 0) {
    await PushSubscriptionModel.deleteMany({ _id: { $in: overflow.map((o) => o._id) } });
  }

  if (mode === "enable") {
    // Prove it works now rather than letting the member discover a broken setup when the next
    // real reminder silently never arrives. A rejected endpoint is pruned by the send itself.
    const settings = await SettingsModel.findOne({ key: "singleton" }, { messName: 1 }).lean();
    const result = await sendPushToEndpoint(endpoint, {
      title: settings?.messName || "Messy",
      body: "Notifications are on — you'll get order updates here.",
      url: "/order",
    }).catch((err) => {
      console.error("Confirmation push failed:", err);
      return { sent: 0, pruned: 0 };
    });
    if (result.sent === 0) {
      throw new ApiError(502, "Couldn't reach this device — please try enabling again.");
    }
  }

  return ok({ saved: true });
});
