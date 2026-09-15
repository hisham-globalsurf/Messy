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
    /** Daily cutoff ("HH:mm", IST) after which members can no longer submit/edit/delete an order for today. */
    orderCutoffTime: { type: String, required: true, default: "10:25" },
    /** Show the member ordering-page countdown only once this many minutes remain before cutoff. */
    orderReminderMinutes: { type: Number, required: true, default: 59, min: 1, max: 300 },
    /** After cutoff, members with a pending order see "order confirmed" until this time ("HH:mm",
     * IST), then "order delivered" for the rest of the day. */
    orderConfirmedUntilTime: { type: String, required: true, default: "12:30" },
    /** Mess-closed period (UTC midnight, inclusive both ends) — while today falls in this range,
     * members see a closure notice instead of the ordering form. Auto-clears once `to` passes;
     * nothing needs to run to "turn it off" since it's just a date comparison every time. */
    messClosedFrom: { type: Date, default: null },
    messClosedTo: { type: Date, default: null },
    messClosedMessage: { type: String, trim: true, default: "" },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export type SettingsDoc = InferSchemaType<typeof settingsSchema>;

export const SettingsModel: Model<SettingsDoc> =
  (models.Settings as Model<SettingsDoc>) ??
  model<SettingsDoc>("Settings", settingsSchema);
