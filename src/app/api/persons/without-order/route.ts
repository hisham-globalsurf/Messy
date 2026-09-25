import { connectDB } from "@/lib/db/mongoose";
import { toUtcDay } from "@/lib/format";
import { todayIst } from "@/lib/cutoff";
import { personIdsWithoutOrder } from "@/lib/unordered";
import { ok, route } from "@/lib/api";

/** Everyone with no order for today, so the "send notification" dialog can target exactly the
 * people who still haven't ordered. */
export const GET = route(async () => {
  await connectDB();
  return ok({ personIds: await personIdsWithoutOrder(toUtcDay(todayIst())) });
});
