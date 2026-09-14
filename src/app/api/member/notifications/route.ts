import { connectDB } from "@/lib/db/mongoose";
import { NotificationModel } from "@/models/Notification";
import { serializeNotification } from "@/lib/serialize";
import { ok } from "@/lib/api";
import { memberRoute } from "@/lib/memberApi";

/** Newest first. Naturally bounded by the model's 2-day TTL, so a plain limit is enough.
 * `personIds` empty/missing means "everyone" (missing covers notifications created before that
 * field existed); otherwise only members it names should see it. */
export const GET = memberRoute(async (session) => {
  await connectDB();
  const notifications = await NotificationModel.find({
    $or: [{ personIds: { $exists: false } }, { personIds: { $size: 0 } }, { personIds: session.sub }],
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return ok(notifications.map((n) => serializeNotification(n)));
});
