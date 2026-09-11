import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { MealEntryModel } from "@/models/MealEntry";
import { SettlementModel } from "@/models/Settlement";
import { PersonModel } from "@/models/Person";
import { settlementDeleteSchema } from "@/lib/validation";
import { serializeSettlement } from "@/lib/serialize";
import { entryShares } from "@/lib/mealShares";
import { ApiError, ok, route } from "@/lib/api";
import type { SettlementDetail, SettlementPersonBreakdown } from "@/types";

interface PersonAccum {
  name: string;
  meals: number;
  amount: number;
  paidAmount: number;
  dates: string[];
}

export const GET = route(async (_session, _request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid id");
  await connectDB();

  const settlement = await SettlementModel.findById(id).lean();
  if (!settlement) throw new ApiError(404, "Settlement not found");

  const entries = await MealEntryModel.find({ settlementId: settlement._id }).sort({ date: 1 }).lean();

  const byName = new Map<string, PersonAccum>();
  for (const e of entries) {
    for (const share of entryShares(e)) {
      const key = share.name.toLowerCase();
      const bucket = byName.get(key) ?? { name: share.name, meals: 0, amount: 0, paidAmount: 0, dates: [] };
      bucket.meals += share.meals;
      bucket.amount += share.amount;
      if (share.paid) bucket.paidAmount += share.amount;
      bucket.dates.push(new Date(e.date).toISOString());
      byName.set(key, bucket);
    }
  }

  const persons = byName.size
    ? await PersonModel.find({ name: { $in: [...byName.values()].map((p) => p.name) } })
        .collation({ locale: "en", strength: 2 })
        .lean()
    : [];
  const phoneByName = new Map(persons.map((p) => [p.name.toLowerCase(), p.phone || undefined]));

  const people: SettlementPersonBreakdown[] = [...byName.values()]
    .map((p) => ({
      name: p.name,
      phone: phoneByName.get(p.name.toLowerCase()),
      meals: p.meals,
      amount: Number(p.amount.toFixed(2)),
      paidAmount: Number(p.paidAmount.toFixed(2)),
      dueAmount: Number((p.amount - p.paidAmount).toFixed(2)),
      dates: p.dates,
    }))
    .sort((a, b) => b.dueAmount - a.dueAmount || b.amount - a.amount);

  const paidAmount = Number(people.reduce((t, p) => t + p.paidAmount, 0).toFixed(2));

  const detail: SettlementDetail = {
    ...serializeSettlement(settlement),
    entryCount: entries.length,
    peopleCount: people.length,
    paidAmount,
    dueAmount: Number((settlement.totalAmount - paidAmount).toFixed(2)),
    people,
  };
  return ok(detail);
});

export const DELETE = route(async (_session, request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid id");
  const { mode } = settlementDeleteSchema.parse(await request.json());
  await connectDB();

  const settlement = await SettlementModel.findById(id);
  if (!settlement) throw new ApiError(404, "Settlement not found");

  if (mode === "unsettle") {
    await MealEntryModel.updateMany({ settlementId: settlement._id }, { $set: { settlementId: null } });
  } else {
    await MealEntryModel.deleteMany({ settlementId: settlement._id });
  }
  await settlement.deleteOne();

  return ok({ ok: true });
});
