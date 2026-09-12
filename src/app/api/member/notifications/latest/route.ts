import { connectDB } from "@/lib/db/mongoose";
import { NotificationModel } from "@/models/Notification";
import { serializeNotification } from "@/lib/serialize";
import { ok } from "@/lib/api";
import { memberRoute } from "@/lib/memberApi";

export const GET = memberRoute(async () => {
  await connectDB();
  const latest = await NotificationModel.findOne().sort({ createdAt: -1 }).lean();
  return ok(latest ? serializeNotification(latest) : null);
});
