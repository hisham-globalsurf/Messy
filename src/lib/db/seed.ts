import bcrypt from "bcryptjs";
import { AdminUserModel } from "@/models/AdminUser";
import { SettingsModel } from "@/models/Settings";

/** Idempotent: creates the admin account and settings singleton if missing. */
export async function seed(): Promise<void> {
  const username = process.env.SEED_ADMIN_USERNAME || "admin";
  const password = process.env.SEED_ADMIN_PASSWORD || "admin@1234";

  const existingAdmin = await AdminUserModel.findOne({ username }).lean();
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(password, 10);
    await AdminUserModel.create({ username, passwordHash });
  }

  await SettingsModel.updateOne(
    { key: "singleton" },
    { $setOnInsert: { key: "singleton", pricePerMeal: 60, messName: "Our Mess", currency: "₹" } },
    { upsert: true },
  );
}
