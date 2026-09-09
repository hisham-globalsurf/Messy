import { Schema, model, models, Types, type Model, type InferSchemaType } from "mongoose";

const settlementSchema = new Schema(
  {
    dateFrom: { type: Date, required: true },
    dateTo: { type: Date, required: true },
    note: { type: String, default: "", trim: true },
    totalAmount: { type: Number, required: true, min: 0 },
    mealEntryIds: { type: [Schema.Types.ObjectId], ref: "MealEntry", default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

settlementSchema.index({ createdAt: -1 });

export type SettlementDoc = InferSchemaType<typeof settlementSchema> & {
  _id: Types.ObjectId;
};

export const SettlementModel: Model<SettlementDoc> =
  (models.Settlement as Model<SettlementDoc>) ??
  model<SettlementDoc>("Settlement", settlementSchema);
