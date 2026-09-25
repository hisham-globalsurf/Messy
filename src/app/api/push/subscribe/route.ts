import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { AdminPushSubscriptionModel } from "@/models/AdminPushSubscription";
import { SettingsModel } from "@/models/Settings";
import { sendPushToAdminEndpoint } from "@/lib/push";
import { ApiError, ok, route } from "@/lib/api";

const MAX_SUBSCRIPTIONS_PER_ADMIN = 10;

// https-only, same as the member route: a non-https "endpoint" would make the server send
// requests to arbitrary addresses (SSRF).
const endpoint = z.string().url().refine((url) => url.startsWith("https://"), "Invalid push endpoint");

const subscribeSchema = z.object({
  endpoint,
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
  /** "enable": the admin switched notifications on — save and send a confirmation push to prove
   * delivery. "sync": the page-load refresh on a device already switched on — save quietly,
   * dropping `replaces` (this device's previous endpoint) if the browser rotated it. "rotate": the
   * service worker's pushsubscriptionchange — only carries over an endpoint that was already an
   * admin device (`replaces`), so it can never switch on a device the admin didn't. */
  mode: z.enum(["enable", "sync", "rotate"]).default("sync"),
  replaces: z.string().optional(),
});

export const POST = route(async (session, request: Request) => {
  const { endpoint, keys, mode, replaces } = subscribeSchema.parse(await request.json());
  await connectDB();

  if (mode === "rotate") {
    if (!replaces) return ok({ saved: false });
    const res = await AdminPushSubscriptionModel.updateOne(
      { endpoint: replaces, adminId: session.sub },
      { $set: { endpoint, keys } },
    );
    return ok({ saved: res.modifiedCount > 0 });
  }

  await AdminPushSubscriptionModel.findOneAndUpdate(
    { endpoint },
    { $set: { adminId: session.sub, keys } },
    { upsert: true },
  );
  if (replaces && replaces !== endpoint) {
    await AdminPushSubscriptionModel.deleteOne({ endpoint: replaces, adminId: session.sub });
  }

  const overflow = await AdminPushSubscriptionModel.find({ adminId: session.sub }, { _id: 1 })
    .sort({ updatedAt: -1 })
    .skip(MAX_SUBSCRIPTIONS_PER_ADMIN)
    .lean();
  if (overflow.length > 0) {
    await AdminPushSubscriptionModel.deleteMany({ _id: { $in: overflow.map((o) => o._id) } });
  }

  if (mode === "enable") {
    const settings = await SettingsModel.findOne({ key: "singleton" }, { messName: 1 }).lean();
    const result = await sendPushToAdminEndpoint(endpoint, {
      title: settings?.messName || "Messy",
      body: "Admin notifications are on — you'll get the supplier message here after each cutoff.",
      url: "/queue",
    }).catch((err) => {
      console.error("Admin confirmation push failed:", err);
      return { sent: 0, pruned: 0 };
    });
    if (result.sent === 0) throw new ApiError(502, "Couldn't reach this device — please try again.");
  }

  return ok({ saved: true });
});

/** Switch this device off. Only removes the admin row — the browser subscription itself stays,
 * since the member app on the same phone may be using the very same one. */
export const DELETE = route(async (session, request: Request) => {
  const body = z.object({ endpoint: z.string().min(1) }).parse(await request.json());
  await connectDB();
  await AdminPushSubscriptionModel.deleteOne({ endpoint: body.endpoint, adminId: session.sub });
  return ok({ ok: true });
});
