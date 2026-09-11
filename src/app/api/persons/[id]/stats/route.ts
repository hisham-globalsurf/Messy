import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { MealEntryModel } from "@/models/MealEntry";
import { PersonModel } from "@/models/Person";
import { ApiError, ok, route } from "@/lib/api";
import type { PersonHistoryItem, PersonStats } from "@/types";

export const GET = route(async (_session, _request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id: raw } = await ctx.params;
  const key = decodeURIComponent(raw).trim();
  await connectDB();

  const person = isValidObjectId(key)
    ? await PersonModel.findById(key).lean()
    : await PersonModel.findOne({ name: key }).collation({ locale: "en", strength: 2 }).lean();

  const entries = await MealEntryModel.find().sort({ date: 1 }).lean();

  // A deleted person may still have historical entries — resolve their name from those.
  let displayName = person?.name;
  if (!displayName && !isValidObjectId(key)) {
    const lc = key.toLowerCase();
    const inEntries = entries.some(
      (e) =>
        (e.fullEaters ?? []).some((fe) => fe.name.toLowerCase() === lc) ||
        (e.halfPairs ?? []).some((p) => p.names.some((n) => n.toLowerCase() === lc)),
    );
    if (inEntries) displayName = key;
  }
  if (!displayName) throw new ApiError(404, "Person not found");

  const lc = displayName.toLowerCase();
  const history: PersonHistoryItem[] = [];
  for (const e of entries) {
    const full = (e.fullEaters ?? []).find((fe) => fe.name.toLowerCase() === lc);
    const pair = (e.halfPairs ?? []).find((p) => p.names.some((n) => n.toLowerCase() === lc));
    if (!full && !pair) continue;

    const settled = Boolean(e.settlementId);
    const settlementId = e.settlementId ? e.settlementId.toString() : null;
    const date = new Date(e.date).toISOString();

    if (full) {
      history.push({
        entryId: e._id.toString(),
        date,
        kind: "full",
        partner: null,
        variant: full.variant,
        count: full.count,
        amount: full.price * full.count,
        settled,
        settlementId,
      });
    }
    if (pair) {
      const partner = pair.names.find((n) => n.toLowerCase() !== lc) ?? null;
      history.push({
        entryId: e._id.toString(),
        date,
        kind: "half",
        partner,
        variant: pair.variant,
        count: 1,
        amount: pair.price / 2,
        settled,
        settlementId,
      });
    }
  }

  const meals = (items: PersonHistoryItem[]) =>
    items.reduce((t, i) => t + (i.kind === "full" ? i.count : 1), 0);
  const sum = (items: PersonHistoryItem[]) => Number(items.reduce((t, i) => t + i.amount, 0).toFixed(2));
  const settledItems = history.filter((i) => i.settled);
  const unsettledItems = history.filter((i) => !i.settled);

  const stats: PersonStats = {
    name: displayName,
    totalMeals: meals(history),
    totalAmount: sum(history),
    settled: { meals: meals(settledItems), amount: sum(settledItems) },
    unsettled: { meals: meals(unsettledItems), amount: sum(unsettledItems) },
    history: history.reverse(),
  };
  return ok(stats);
});
