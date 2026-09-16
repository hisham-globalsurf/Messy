import { connectDB } from "@/lib/db/mongoose";
import { PersonModel } from "@/models/Person";
import { QueueOrderModel } from "@/models/QueueOrder";
import { MealEntryModel } from "@/models/MealEntry";
import { toUtcDay } from "@/lib/format";
import { todayIst } from "@/lib/cutoff";
import { entryHasPerson } from "@/lib/entryLookup";
import { ok, route } from "@/lib/api";

/** Ids of every person with no order for today — neither a pending queue row (just ordered)
 * nor a spot in today's confirmed MealEntry (order confirmed) — so the "send notification"
 * dialog can target exactly the people who still haven't ordered. */
export const GET = route(async () => {
  await connectDB();
  const date = toUtcDay(todayIst());

  const [persons, queueRows, entry] = await Promise.all([
    PersonModel.find().lean(),
    QueueOrderModel.find({ date }).lean(),
    MealEntryModel.findOne({ date }).lean(),
  ]);

  const queuedIds = new Set<string>();
  for (const row of queueRows) {
    queuedIds.add(row.personId.toString());
    if (row.partnerPersonId) queuedIds.add(row.partnerPersonId.toString());
  }

  const withoutOrder = persons.filter((p) => {
    if (queuedIds.has(p._id.toString())) return false;
    if (entry && entryHasPerson(entry, p.name)) return false;
    return true;
  });

  return ok({ personIds: withoutOrder.map((p) => p._id.toString()) });
});
