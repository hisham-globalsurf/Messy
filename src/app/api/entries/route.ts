import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { MealEntryModel, computeDerived } from "@/models/MealEntry";
import { SettingsModel } from "@/models/Settings";
import { entryInputSchema, entryQuerySchema } from "@/lib/validation";
import { canonicalizeEntryNames } from "@/lib/persons";
import { resolveFullEater, resolveHalfPair, variantPriceLookup } from "@/lib/foodVariants";
import { toUtcDay } from "@/lib/format";
import { serializeEntry } from "@/lib/serialize";
import { ApiError, ok, route } from "@/lib/api";
import { NAME_COLLATION, entryPersonFilter } from "@/lib/entryLookup";

export const GET = route(async (_session, request: NextRequest) => {
  const sp = request.nextUrl.searchParams;
  const { from, to, settled, person } = entryQuerySchema.parse({
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    settled: sp.get("settled") ?? undefined,
    person: sp.get("person") ?? undefined,
  });
  await connectDB();

  const query: Record<string, unknown> = {};
  if (from || to) {
    const range: { $gte?: Date; $lte?: Date } = {};
    if (from) range.$gte = toUtcDay(from);
    if (to) range.$lte = toUtcDay(to);
    query.date = range;
  }
  if (settled === true) query.settlementId = { $ne: null };
  if (settled === false) query.settlementId = null;

  // Person filter runs in Mongo so only matching entries come back over the wire.
  let find = MealEntryModel.find(query);
  if (person) find = MealEntryModel.find({ ...query, ...entryPersonFilter(person) }).collation(NAME_COLLATION);
  const entries = await find.sort({ date: -1, createdAt: -1 }).lean();

  return ok(entries.map((e) => serializeEntry(e)));
});

export const POST = route(async (_session, request: Request) => {
  const input = entryInputSchema.parse(await request.json());
  await connectDB();

  const settings = await SettingsModel.findOne({ key: "singleton" }).lean();
  const pricePerMeal = input.pricePerMeal ?? settings?.pricePerMeal ?? 0;
  const variantPrices = variantPriceLookup(settings?.foodVariants ?? []);

  const canonical = await canonicalizeEntryNames(input);
  const entryDate = toUtcDay(canonical.date);
  const existing = await MealEntryModel.findOne({ date: entryDate }).lean();
  if (existing) throw new ApiError(409, "An entry already exists for this date");

  const fullEaters = canonical.fullEaters.map((e) => resolveFullEater(e, pricePerMeal, variantPrices));
  const halfPairs = canonical.halfPairs.map((p) => resolveHalfPair(p, pricePerMeal, variantPrices));
  const derived = computeDerived(fullEaters, halfPairs);
  const created = await MealEntryModel.create({
    date: entryDate,
    fullEaters,
    halfPairs,
    pricePerMeal,
    ...derived,
  });

  return ok(serializeEntry(created.toObject()), 201);
});
