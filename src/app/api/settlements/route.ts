import { connectDB } from "@/lib/db/mongoose";
import { MealEntryModel } from "@/models/MealEntry";
import { SettlementModel } from "@/models/Settlement";
import { settlementCreateSchema } from "@/lib/validation";
import { toUtcDay } from "@/lib/format";
import { serializeSettlement } from "@/lib/serialize";
import { entryShares } from "@/lib/mealShares";
import { ApiError, ok, route } from "@/lib/api";

export const GET = route(async () => {
  await connectDB();
  const settlements = await SettlementModel.find().sort({ createdAt: -1 }).lean();

  const entries = await MealEntryModel.find(
    { settlementId: { $in: settlements.map((s) => s._id) } },
    { settlementId: 1, fullEaters: 1, halfPairs: 1, pricePerMeal: 1, paidBy: 1 },
  ).lean();

  const bySettlement = new Map<string, { count: number; people: Set<string>; paidAmount: number }>();
  for (const e of entries) {
    const key = e.settlementId!.toString();
    const bucket = bySettlement.get(key) ?? { count: 0, people: new Set<string>(), paidAmount: 0 };
    bucket.count += 1;
    for (const share of entryShares(e)) {
      bucket.people.add(share.name.toLowerCase());
      if (share.paid) bucket.paidAmount += share.amount;
    }
    bySettlement.set(key, bucket);
  }

  return ok(
    settlements.map((s) => {
      const bucket = bySettlement.get(s._id.toString());
      const paidAmount = Number((bucket?.paidAmount ?? 0).toFixed(2));
      return {
        ...serializeSettlement(s),
        entryCount: bucket?.count ?? s.mealEntryIds.length,
        peopleCount: bucket?.people.size ?? 0,
        paidAmount,
        dueAmount: Number((s.totalAmount - paidAmount).toFixed(2)),
      };
    }),
  );
});

export const POST = route(async (_session, request: Request) => {
  const { dateFrom, dateTo, note } = settlementCreateSchema.parse(await request.json());
  await connectDB();

  const range: { $gte?: Date; $lte: Date } = { $lte: toUtcDay(dateTo) };
  if (dateFrom) range.$gte = toUtcDay(dateFrom);

  const entries = await MealEntryModel.find({ settlementId: null, date: range }).sort({ date: 1 });
  if (entries.length === 0) throw new ApiError(400, "No unsettled entries in that period");

  const totalAmount = Number(entries.reduce((t, e) => t + e.totalAmount, 0).toFixed(2));
  const settlement = await SettlementModel.create({
    dateFrom: dateFrom ? toUtcDay(dateFrom) : entries[0].date,
    dateTo: toUtcDay(dateTo),
    note: note ?? "",
    totalAmount,
    mealEntryIds: entries.map((e) => e._id),
  });

  await MealEntryModel.updateMany(
    { _id: { $in: entries.map((e) => e._id) } },
    { $set: { settlementId: settlement._id } },
  );

  return ok({ ...serializeSettlement(settlement.toObject()), entryCount: entries.length }, 201);
});
