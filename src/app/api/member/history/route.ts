import { Types } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { MealEntryModel } from "@/models/MealEntry";
import { SettlementModel } from "@/models/Settlement";
import { entryShares } from "@/lib/mealShares";
import { ApiError, ok } from "@/lib/api";
import { memberRoute } from "@/lib/memberApi";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Per-day amounts for the member's own confirmed meals in one period — the current
 * (not yet settled) one by default, or a past settlement via `?period=<settlementId>`.
 * "Confirmed" means already moved into a real MealEntry by the admin, not a pending queue
 * order. Also lists the past settled periods the member had meals in, newest first. */
export const GET = memberRoute(async (session, request: Request) => {
  await connectDB();
  const lc = session.name.toLowerCase();
  const nameMatch = new RegExp(`^${escapeRegex(session.name)}$`, "i");
  const mine = { $or: [{ "fullEaters.name": nameMatch }, { "halfPairs.names": nameMatch }] };

  const periodParam = new URL(request.url).searchParams.get("period");
  if (periodParam && !Types.ObjectId.isValid(periodParam)) throw new ApiError(400, "Invalid period");
  const settlementId = periodParam ? new Types.ObjectId(periodParam) : null;

  const [entries, settledIds] = await Promise.all([
    MealEntryModel.find({ settlementId, ...mine }).sort({ date: 1 }).lean(),
    MealEntryModel.distinct("settlementId", { settlementId: { $ne: null }, ...mine }),
  ]);
  const settlements = await SettlementModel.find({ _id: { $in: settledIds } })
    .sort({ dateTo: -1, createdAt: -1 })
    .lean();
  if (settlementId && !settlements.some((s) => s._id.equals(settlementId))) {
    throw new ApiError(404, "Period not found");
  }

  const days: { date: string; amount: number; sharedWith?: string }[] = [];
  let total = 0;
  let totalDue = 0;

  for (const entry of entries) {
    const shares = entryShares(entry).filter((s) => s.name.toLowerCase() === lc);
    if (shares.length === 0) continue;

    const amount = Number(shares.reduce((t, s) => t + s.amount, 0).toFixed(2));
    const pair = entry.halfPairs?.find((p) => p.names.some((n) => n.toLowerCase() === lc));
    const sharedWith = pair?.names.find((n) => n.toLowerCase() !== lc);
    days.push({ date: new Date(entry.date).toISOString().slice(0, 10), amount, sharedWith });

    total += amount;
    totalDue += shares.filter((s) => !s.paid).reduce((t, s) => t + s.amount, 0);
  }

  return ok({
    days,
    total: Number(total.toFixed(2)),
    totalDue: Number(totalDue.toFixed(2)),
    periods: settlements.map((s) => ({
      id: s._id.toString(),
      dateFrom: s.dateFrom.toISOString(),
      dateTo: s.dateTo.toISOString(),
      settledAt: s.createdAt.toISOString(),
    })),
  });
});
