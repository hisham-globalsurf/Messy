import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

const settingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "singleton" },
    pricePerMeal: { type: Number, required: true, min: 0, default: 60 },
    messName: { type: String, required: true, default: "Our Mess" },
    currency: { type: String, required: true, default: "₹" },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export type SettingsDoc = InferSchemaType<typeof settingsSchema>;

export const SettingsModel: Model<SettingsDoc> =
  (models.Settings as Model<SettingsDoc>) ??
  model<SettingsDoc>("Settings", settingsSchema);
