import { connectDB } from "@/lib/db/mongoose";
import { MealEntryModel } from "@/models/MealEntry";
import { SettlementModel } from "@/models/Settlement";
import { settlementCreateSchema } from "@/lib/validation";
import { toUtcDay } from "@/lib/format";
import { serializeSettlement } from "@/lib/serialize";
import { ApiError, ok, route } from "@/lib/api";

export const GET = route(async () => {
  await connectDB();
  const settlements = await SettlementModel.find().sort({ createdAt: -1 }).lean();
  return ok(settlements.map((s) => serializeSettlement(s)));
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
