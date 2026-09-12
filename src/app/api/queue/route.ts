import { connectDB } from "@/lib/db/mongoose";
import { QueueOrderModel } from "@/models/QueueOrder";
import { toUtcDay } from "@/lib/format";
import { todayIst } from "@/lib/cutoff";
import { serializeQueueOrder } from "@/lib/serialize";
import { ok, route } from "@/lib/api";

export const GET = route(async () => {
  await connectDB();
  const rows = await QueueOrderModel.find({ date: { $gte: toUtcDay(todayIst()) } })
    .sort({ date: 1, createdAt: 1 })
    .lean();
  return ok(rows.map((r) => serializeQueueOrder(r)));
});
