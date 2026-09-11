import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { AdminUserModel } from "@/models/AdminUser";
import { SettingsModel } from "@/models/Settings";

/** Idempotent: creates the admin account and settings singleton if missing. */
export async function seed(): Promise<void> {
  const username = process.env.SEED_ADMIN_USERNAME || "admin";
  const password = process.env.SEED_ADMIN_PASSWORD;

  const existingAdmin = await AdminUserModel.findOne({ username }).lean();
  if (!existingAdmin) {
    if (!password) {
      if (process.env.NODE_ENV === "production") {
        // Never stand up a predictable admin login in production — force explicit configuration.
        throw new Error(
          "SEED_ADMIN_PASSWORD is not set. Set it (and SEED_ADMIN_USERNAME) before first run in production.",
        );
      }
      // Local/dev convenience only: generate and print a random password rather
      // than baking in a well-known default like "admin@1234".
      const generated = crypto.randomBytes(9).toString("base64url");
      console.warn(
        `⚠ SEED_ADMIN_PASSWORD not set — created admin "${username}" with a generated password: ${generated}\n` +
          "  Set SEED_ADMIN_PASSWORD in .env.local to pin it.",
      );
      const passwordHash = await bcrypt.hash(generated, 10);
      await AdminUserModel.create({ username, passwordHash });
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      await AdminUserModel.create({ username, passwordHash });
    }
  }

  await SettingsModel.updateOne(
    { key: "singleton" },
    { $setOnInsert: { key: "singleton", pricePerMeal: 60, messName: "Our Mess", currency: "₹" } },
    { upsert: true },
  );
}
