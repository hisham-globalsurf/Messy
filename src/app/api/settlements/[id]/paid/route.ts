import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { MealEntryModel } from "@/models/MealEntry";
import { SettlementModel } from "@/models/Settlement";
import { entryShares } from "@/lib/mealShares";
import { ApiError, ok, route } from "@/lib/api";

/** Marks every person's share in this settlement as paid — for when the admin has collected the
 * whole settlement outside the app. Clears its outstanding amount, since that is derived from
 * each entry's paidBy. */
export const POST = route(async (_session, _request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid id");
  await connectDB();

  const settlement = await SettlementModel.findById(id).lean();
  if (!settlement) throw new ApiError(404, "Settlement not found");

  const entries = await MealEntryModel.find({ settlementId: settlement._id }).lean();
  const ops = entries.map((e) => ({
    updateOne: {
      filter: { _id: e._id },
      update: { $set: { paidBy: [...new Set(entryShares(e).map((s) => s.name))] } },
    },
  }));
  if (ops.length) await MealEntryModel.bulkWrite(ops);

  return ok({ ok: true });
});
