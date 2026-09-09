import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

const adminUserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export type AdminUserDoc = InferSchemaType<typeof adminUserSchema>;

export const AdminUserModel: Model<AdminUserDoc> =
  (models.AdminUser as Model<AdminUserDoc>) ??
  model<AdminUserDoc>("AdminUser", adminUserSchema);
