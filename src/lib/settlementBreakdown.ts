import "server-only";
import type { Types } from "mongoose";
import { MealEntryModel } from "@/models/MealEntry";
import { PersonModel } from "@/models/Person";
import { entryShares } from "@/lib/mealShares";
import type { SettlementPersonBreakdown } from "@/types";

interface PersonAccum {
  name: string;
  meals: number;
  amount: number;
  paidAmount: number;
  dates: string[];
}

export interface SettlementPerson extends SettlementPersonBreakdown {
  /** Person record id — undefined if the name no longer matches a Person. */
  personId?: string;
}

/** Per-person totals for one settlement's entries, highest due first. Shared by the settlement
 * detail view and the "pay your split" notification so both always show the same amounts. */
export async function settlementPeople(settlementId: Types.ObjectId): Promise<{
  entryCount: number;
  people: SettlementPerson[];
}> {
  const entries = await MealEntryModel.find({ settlementId }).sort({ date: 1 }).lean();

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
  const personByName = new Map(persons.map((p) => [p.name.toLowerCase(), p]));

  const people: SettlementPerson[] = [...byName.values()]
    .map((p) => {
      const person = personByName.get(p.name.toLowerCase());
      return {
        name: p.name,
        phone: person?.phone || undefined,
        personId: person?._id.toString(),
        meals: p.meals,
        amount: Number(p.amount.toFixed(2)),
        paidAmount: Number(p.paidAmount.toFixed(2)),
        dueAmount: Number((p.amount - p.paidAmount).toFixed(2)),
        dates: p.dates,
      };
    })
    .sort((a, b) => b.dueAmount - a.dueAmount || b.amount - a.amount);

  return { entryCount: entries.length, people };
}
