import { connectDB } from "@/lib/db/mongoose";
import { MealEntryModel } from "@/models/MealEntry";
import { entryShares } from "@/lib/mealShares";
import { ok } from "@/lib/api";
import { memberRoute } from "@/lib/memberApi";

/** Per-day amounts (and total due) for the member's own confirmed meals in the current
 * — i.e. not yet settled — period. "Confirmed" means already moved into a real MealEntry
 * by the admin, not a pending queue order. */
export const GET = memberRoute(async (session) => {
  await connectDB();
  const lc = session.name.toLowerCase();

  const entries = await MealEntryModel.find({ settlementId: null }).sort({ date: 1 }).lean();

  const days: { date: string; amount: number; sharedWith?: string }[] = [];
  let totalDue = 0;

  for (const entry of entries) {
    const shares = entryShares(entry).filter((s) => s.name.toLowerCase() === lc);
    if (shares.length === 0) continue;

    const amount = Number(shares.reduce((t, s) => t + s.amount, 0).toFixed(2));
    const pair = entry.halfPairs?.find((p) => p.names.some((n) => n.toLowerCase() === lc));
    const sharedWith = pair?.names.find((n) => n.toLowerCase() !== lc);
    days.push({ date: new Date(entry.date).toISOString().slice(0, 10), amount, sharedWith });

    const due = shares.filter((s) => !s.paid).reduce((t, s) => t + s.amount, 0);
    totalDue += due;
  }

  return ok({ days, totalDue: Number(totalDue.toFixed(2)) });
});
