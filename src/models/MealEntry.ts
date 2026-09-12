import { Schema, model, models, Types, type Model } from "mongoose";

export interface FullEaterEntryDoc {
  name: string;
  /** Variant name snapshotted at entry time (or update time) — null means "no variant, use pricePerMeal". */
  variant: string | null;
  /** Per-meal price for this eater, locked at the time the variant/count was set. */
  price: number;
  count: number;
}

export interface HalfPairEntryDoc {
  names: [string, string];
  /** Variant name snapshotted at entry time — null means "no variant, use pricePerMeal". */
  variant: string | null;
  /** Price for the whole shared meal, locked at the time the variant was set — each partner owes half. */
  price: number;
}

export interface MealEntryDoc {
  _id: Types.ObjectId;
  date: Date;
  fullEaters: FullEaterEntryDoc[];
  halfPairs: HalfPairEntryDoc[];
  pricePerMeal: number;
  mealCount: number;
  totalAmount: number;
  /** Names (from fullEaters/halfPairs) who already paid cash for their own share — independent of settlementId. */
  paidBy: string[];
  settlementId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const fullEaterSchema = new Schema<FullEaterEntryDoc>(
  {
    name: { type: String, required: true },
    variant: { type: String, default: null },
    price: { type: Number, required: true, min: 0 },
    count: { type: Number, default: 1, min: 1 },
  },
  { _id: false },
);

const halfPairSchema = new Schema<HalfPairEntryDoc>(
  {
    names: { type: [String], required: true },
    variant: { type: String, default: null },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const mealEntrySchema = new Schema<MealEntryDoc>(
  {
    date: { type: Date, required: true },
    fullEaters: { type: [fullEaterSchema], default: [] },
    halfPairs: { type: [halfPairSchema], default: [] },
    pricePerMeal: { type: Number, required: true, min: 0 },
    mealCount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    paidBy: { type: [String], default: [] },
    settlementId: { type: Schema.Types.ObjectId, ref: "Settlement", default: null },
  },
  { timestamps: true },
);

mealEntrySchema.index({ date: -1 }, { unique: true });
mealEntrySchema.index({ settlementId: 1 });

export const MealEntryModel: Model<MealEntryDoc> =
  (models.MealEntry as Model<MealEntryDoc>) ?? model<MealEntryDoc>("MealEntry", mealEntrySchema);

/** Derived meal figures — never trust client-supplied counts. */
export function computeDerived(
  fullEaters: { price: number; count: number }[],
  halfPairs: { price: number }[],
): { mealCount: number; totalAmount: number } {
  const fullMeals = fullEaters.reduce((t, e) => t + e.count, 0);
  const fullTotal = fullEaters.reduce((t, e) => t + e.price * e.count, 0);
  const halfTotal = halfPairs.reduce((t, p) => t + p.price, 0);
  const mealCount = fullMeals + halfPairs.length;
  return { mealCount, totalAmount: Number((fullTotal + halfTotal).toFixed(2)) };
}
