import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { MealEntryModel, computeDerived } from "@/models/MealEntry";
import { SettingsModel } from "@/models/Settings";
import { entryInputSchema, entryQuerySchema } from "@/lib/validation";
import { canonicalizeEntryNames } from "@/lib/persons";
import { toUtcDay } from "@/lib/format";
import { serializeEntry } from "@/lib/serialize";
import { ok, route } from "@/lib/api";

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

  let entries = await MealEntryModel.find(query).sort({ date: -1, createdAt: -1 }).lean();

  if (person) {
    const lc = person.toLowerCase();
    entries = entries.filter(
      (e) =>
        (e.fullEaters ?? []).some((n) => n.toLowerCase() === lc) ||
        (e.halfPairs ?? []).some((p) => p.some((n) => n.toLowerCase() === lc)),
    );
  }

  return ok(entries.map((e) => serializeEntry(e)));
});

export const POST = route(async (_session, request: Request) => {
  const input = entryInputSchema.parse(await request.json());
  await connectDB();

  const settings = await SettingsModel.findOne({ key: "singleton" }).lean();
  const pricePerMeal = input.pricePerMeal ?? settings?.pricePerMeal ?? 0;

  const canonical = await canonicalizeEntryNames(input);
  const derived = computeDerived(canonical.fullEaters, canonical.halfPairs, pricePerMeal);
  const created = await MealEntryModel.create({
    date: toUtcDay(canonical.date),
    fullEaters: canonical.fullEaters,
    halfPairs: canonical.halfPairs,
    pricePerMeal,
    ...derived,
  });

  return ok(serializeEntry(created.toObject()), 201);
});
