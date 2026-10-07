import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { MealEntryModel } from "@/models/MealEntry";
import { SettlementModel } from "@/models/Settlement";
import { settlementDeleteSchema } from "@/lib/validation";
import { serializeSettlement } from "@/lib/serialize";
import { settlementPeople } from "@/lib/settlementBreakdown";
import { ApiError, ok, route } from "@/lib/api";
import type { SettlementDetail } from "@/types";

export const GET = route(async (_session, _request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid id");
  await connectDB();

  const settlement = await SettlementModel.findById(id).lean();
  if (!settlement) throw new ApiError(404, "Settlement not found");

  const { entryCount, people } = await settlementPeople(settlement._id);

  const paidAmount = Number(people.reduce((t, p) => t + p.paidAmount, 0).toFixed(2));

  const detail: SettlementDetail = {
    ...serializeSettlement(settlement),
    entryCount,
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
