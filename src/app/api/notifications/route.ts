import { connectDB } from "@/lib/db/mongoose";
import { NotificationModel } from "@/models/Notification";
import { SettingsModel } from "@/models/Settings";
import { notificationCreateSchema } from "@/lib/validation";
import { sendPushToAll } from "@/lib/push";
import { ApiError, ok, route } from "@/lib/api";

export const POST = route(async (_session, request: Request) => {
  const { message } = notificationCreateSchema.parse(await request.json());
  await connectDB();

  const settings = await SettingsModel.findOne({ key: "singleton" }).lean();
  if (!settings) throw new ApiError(500, "Settings not found");

  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
  const notification = await NotificationModel.create({
    message,
    expireAt: new Date(Date.now() + TWO_DAYS_MS),
  });

  let delivered = 0;
  try {
    const result = await sendPushToAll({ title: settings.messName, body: message, url: "/order" });
    delivered = result.sent;
  } catch (err) {
    // In-app notification still succeeds even if push isn't configured/available.
    console.error("Push send failed:", err);
  }

  return ok({ id: notification._id.toString(), delivered }, 201);
});
