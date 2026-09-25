import "server-only";
import { PersonModel } from "@/models/Person";
import { QueueOrderModel } from "@/models/QueueOrder";
import { MealEntryModel } from "@/models/MealEntry";
import { entryHasPerson } from "@/lib/entryLookup";

/** Ids of every person with no order for `date` — neither a pending queue row (as orderer or
 * half partner) nor a spot in that day's MealEntry. Backs the admin's "Non-ordered Users" picker
 * and the daily order reminder, so both target exactly the same people. */
export async function personIdsWithoutOrder(date: Date): Promise<string[]> {
  const [persons, queueRows, entry] = await Promise.all([
    PersonModel.find({}, { _id: 1, name: 1 }).lean(),
    QueueOrderModel.find({ date }, { personId: 1, partnerPersonId: 1 }).lean(),
    MealEntryModel.findOne({ date }, { fullEaters: 1, halfPairs: 1 }).lean(),
  ]);

  const queuedIds = new Set<string>();
  for (const row of queueRows) {
    queuedIds.add(row.personId.toString());
    if (row.partnerPersonId) queuedIds.add(row.partnerPersonId.toString());
  }

  return persons
    .filter((p) => !queuedIds.has(p._id.toString()) && !(entry && entryHasPerson(entry, p.name)))
    .map((p) => p._id.toString());
}
