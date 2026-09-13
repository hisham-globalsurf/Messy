import { connectDB } from "@/lib/db/mongoose";
import { NotificationModel } from "@/models/Notification";
import { SettingsModel } from "@/models/Settings";
import { notificationCreateSchema } from "@/lib/validation";
import { sendPushToAll } from "@/lib/push";
import { ApiError, ok, route } from "@/lib/api";

export const POST = route(async (_session, request: Request) => {
  const { message, push, inApp } = notificationCreateSchema.parse(await request.json());
  await connectDB();

  const settings = await SettingsModel.findOne({ key: "singleton" }).lean();
  if (!settings) throw new ApiError(500, "Settings not found");

  let notificationId: string | null = null;
  if (inApp) {
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
    const notification = await NotificationModel.create({
      message,
      expireAt: new Date(Date.now() + TWO_DAYS_MS),
    });
    notificationId = notification._id.toString();
  }

  let delivered = 0;
  if (push) {
    try {
      const result = await sendPushToAll({ title: settings.messName, body: message, url: "/order" });
      delivered = result.sent;
    } catch (err) {
      // In-app notification (if selected) still succeeds even if push isn't configured/available.
      console.error("Push send failed:", err);
    }
  }

  return ok({ id: notificationId, delivered }, 201);
});

/** Manual bulk-clear — separate from (and doesn't touch) the 2-day TTL index, which keeps
 * auto-expiring old notifications on its own regardless of whether this is ever used. */
export const DELETE = route(async () => {
  await connectDB();
  const result = await NotificationModel.deleteMany({});
  return ok({ deletedCount: result.deletedCount });
});
