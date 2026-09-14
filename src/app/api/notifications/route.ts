import { connectDB } from "@/lib/db/mongoose";
import { NotificationModel } from "@/models/Notification";
import { SettingsModel } from "@/models/Settings";
import { notificationCreateSchema } from "@/lib/validation";
import { sendPushToAll, sendPushToPerson } from "@/lib/push";
import { publishNotificationsChangedForAll, publishNotificationsChangedForPerson } from "@/lib/ably";
import { ApiError, ok, route } from "@/lib/api";

export const POST = route(async (_session, request: Request) => {
  const { message, push, inApp, personIds } = notificationCreateSchema.parse(await request.json());
  await connectDB();

  const settings = await SettingsModel.findOne({ key: "singleton" }).lean();
  if (!settings) throw new ApiError(500, "Settings not found");

  let notificationId: string | null = null;
  if (inApp) {
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
    const notification = await NotificationModel.create({
      message,
      personIds,
      expireAt: new Date(Date.now() + TWO_DAYS_MS),
    });
    notificationId = notification._id.toString();

    // Best-effort — the targeted member(s), or everyone, should see the new notification
    // immediately rather than waiting to refocus the tab.
    if (personIds.length > 0) {
      await Promise.all(personIds.map((id) => publishNotificationsChangedForPerson(id)));
    } else {
      await publishNotificationsChangedForAll();
    }
  }

  let delivered = 0;
  if (push) {
    try {
      if (personIds.length > 0) {
        const results = await Promise.all(
          personIds.map((id) => sendPushToPerson(id, { title: settings.messName, body: message, url: "/order" })),
        );
        delivered = results.reduce((sum, r) => sum + r.sent, 0);
      } else {
        const result = await sendPushToAll({ title: settings.messName, body: message, url: "/order" });
        delivered = result.sent;
      }
    } catch (err) {
      // In-app notification (if selected) still succeeds even if push isn't configured/available.
      console.error("Push send failed:", err);
    }
  }

  return ok({ id: notificationId, delivered }, 201);
});

/** Manual bulk-clear — separate from (and doesn't touch) the 2-day TTL index, which keeps
 * auto-expiring old notifications on its own regardless of whether this is ever used. Always
 * clears for everyone, regardless of any individual notification's recipients. */
export const DELETE = route(async () => {
  await connectDB();
  const result = await NotificationModel.deleteMany({});

  // Best-effort — see the POST handler above for why this is fire-and-forget.
  await publishNotificationsChangedForAll();

  return ok({ deletedCount: result.deletedCount });
});
