import { connectDB } from "@/lib/db/mongoose";
import { SettingsModel } from "@/models/Settings";
import { settingsUpdateSchema } from "@/lib/validation";
import { serializeSettings } from "@/lib/serialize";
import { ApiError, ok, route } from "@/lib/api";

async function getOrCreate() {
  const existing = await SettingsModel.findOne({ key: "singleton" });
  if (existing) return existing;
  return SettingsModel.create({ key: "singleton" });
}

export const GET = route(async () => {
  await connectDB();
  const settings = await getOrCreate();
  return ok(serializeSettings(settings.toObject()));
});

export const PATCH = route(async (_session, request: Request) => {
  const patch = settingsUpdateSchema.parse(await request.json());
  await connectDB();

  const settings = await getOrCreate();
  if (patch.pricePerMeal !== undefined) settings.pricePerMeal = patch.pricePerMeal;
  if (patch.messName !== undefined) settings.messName = patch.messName;
  if (patch.currency !== undefined) settings.currency = patch.currency;
  if (patch.foodVariants !== undefined) settings.set("foodVariants", patch.foodVariants);
  if (patch.defaultVariant !== undefined) settings.defaultVariant = patch.defaultVariant ?? "";
  if (patch.supplierPhone !== undefined) settings.supplierPhone = patch.supplierPhone;
  if (patch.orderCutoffTime !== undefined) settings.orderCutoffTime = patch.orderCutoffTime;
  if (patch.orderReminderMinutes !== undefined) settings.orderReminderMinutes = patch.orderReminderMinutes;
  if (patch.orderConfirmedUntilTime !== undefined) settings.orderConfirmedUntilTime = patch.orderConfirmedUntilTime;
  if (patch.orderDeliveredUntilTime !== undefined) settings.orderDeliveredUntilTime = patch.orderDeliveredUntilTime;
  if (patch.messClosedFrom !== undefined) settings.messClosedFrom = patch.messClosedFrom;
  if (patch.messClosedTo !== undefined) settings.messClosedTo = patch.messClosedTo;
  if (patch.messClosedMessage !== undefined) settings.messClosedMessage = patch.messClosedMessage;

  if (!settings.messName) throw new ApiError(400, "Mess name cannot be empty");
  await settings.save();

  return ok(serializeSettings(settings.toObject()));
});
