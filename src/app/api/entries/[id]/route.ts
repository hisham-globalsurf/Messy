import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { MealEntryModel, computeDerived } from "@/models/MealEntry";
import { entryUpdateSchema } from "@/lib/validation";
import { canonicalizeEntryNames } from "@/lib/persons";
import { toUtcDay } from "@/lib/format";
import { serializeEntry } from "@/lib/serialize";
import { ApiError, ok, route } from "@/lib/api";

export const PATCH = route(async (_session, request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid id");
  const input = entryUpdateSchema.parse(await request.json());
  await connectDB();

  const entry = await MealEntryModel.findById(id);
  if (!entry) throw new ApiError(404, "Entry not found");
  if (entry.settlementId) throw new ApiError(409, "Settled entries are read-only");

  const canonical = await canonicalizeEntryNames(input);
  const price = input.pricePerMeal ?? entry.pricePerMeal;
  const derived = computeDerived(canonical.fullEaters, canonical.halfPairs, price);
  entry.set({
    date: toUtcDay(canonical.date),
    fullEaters: canonical.fullEaters,
    halfPairs: canonical.halfPairs,
    pricePerMeal: price,
    ...derived,
  });
  await entry.save();

  return ok(serializeEntry(entry.toObject()));
});

export const DELETE = route(async (_session, _request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid id");
  await connectDB();

  const entry = await MealEntryModel.findById(id);
  if (!entry) throw new ApiError(404, "Entry not found");
  if (entry.settlementId) throw new ApiError(409, "Settled entries are read-only");

  await entry.deleteOne();
  return ok({ ok: true });
});
