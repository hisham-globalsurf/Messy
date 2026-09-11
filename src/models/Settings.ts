import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

const foodVariantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const settingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "singleton" },
    pricePerMeal: { type: Number, required: true, min: 0, default: 60 },
    messName: { type: String, required: true, default: "Our Mess" },
    currency: { type: String, required: true, default: "₹" },
    foodVariants: { type: [foodVariantSchema], default: [] },
    /** Variant name used when a person has no preference set — chosen from foodVariants. */
    defaultVariant: { type: String, trim: true, default: "" },
    /** WhatsApp number for the daily meal-count message to the food supplier. */
    supplierPhone: { type: String, trim: true, default: "" },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export type SettingsDoc = InferSchemaType<typeof settingsSchema>;

export const SettingsModel: Model<SettingsDoc> =
  (models.Settings as Model<SettingsDoc>) ??
  model<SettingsDoc>("Settings", settingsSchema);
