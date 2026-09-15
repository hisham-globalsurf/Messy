import { connectDB } from "@/lib/db/mongoose";
import { SettingsModel } from "@/models/Settings";
import { ApiError, ok } from "@/lib/api";
import { memberRoute } from "@/lib/memberApi";

/** Member-safe subset of settings — deliberately omits supplierPhone. */
export const GET = memberRoute(async () => {
  await connectDB();
  const settings = await SettingsModel.findOne({ key: "singleton" }).lean();
  if (!settings) throw new ApiError(500, "Settings not found");

  return ok({
    messName: settings.messName,
    currency: settings.currency,
    pricePerMeal: settings.pricePerMeal,
    foodVariants: settings.foodVariants ?? [],
    orderCutoffTime: settings.orderCutoffTime,
    orderReminderMinutes: settings.orderReminderMinutes,
    orderConfirmedUntilTime: settings.orderConfirmedUntilTime,
    orderDeliveredUntilTime: settings.orderDeliveredUntilTime,
    messClosedFrom: settings.messClosedFrom ? new Date(settings.messClosedFrom).toISOString().slice(0, 10) : null,
    messClosedTo: settings.messClosedTo ? new Date(settings.messClosedTo).toISOString().slice(0, 10) : null,
    messClosedMessage: settings.messClosedMessage ?? "",
  });
});
