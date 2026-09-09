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
  await settings.save();

  if (!settings.messName) throw new ApiError(400, "Mess name cannot be empty");
  return ok(serializeSettings(settings.toObject()));
});
