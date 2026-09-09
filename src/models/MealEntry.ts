import { Schema, model, models, Types, type Model } from "mongoose";

export interface MealEntryDoc {
  _id: Types.ObjectId;
  date: Date;
  fullEaters: string[];
  halfPairs: [string, string][];
  pricePerMeal: number;
  mealCount: number;
  totalAmount: number;
  settlementId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const mealEntrySchema = new Schema<MealEntryDoc>(
  {
    date: { type: Date, required: true },
    fullEaters: { type: [String], default: [] },
    halfPairs: { type: [[String]], default: [] },
    pricePerMeal: { type: Number, required: true, min: 0 },
    mealCount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    settlementId: { type: Schema.Types.ObjectId, ref: "Settlement", default: null },
  },
  { timestamps: true },
);

mealEntrySchema.index({ date: -1 });
mealEntrySchema.index({ settlementId: 1 });

export const MealEntryModel: Model<MealEntryDoc> =
  (models.MealEntry as Model<MealEntryDoc>) ?? model<MealEntryDoc>("MealEntry", mealEntrySchema);

/** Derived meal figures — never trust client-supplied counts. */
export function computeDerived(
  fullEaters: string[],
  halfPairs: [string, string][],
  pricePerMeal: number,
): { mealCount: number; totalAmount: number } {
  const mealCount = fullEaters.length + halfPairs.length;
  return { mealCount, totalAmount: Number((mealCount * pricePerMeal).toFixed(2)) };
}
