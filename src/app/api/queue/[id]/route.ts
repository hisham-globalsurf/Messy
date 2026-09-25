import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { QueueOrderModel } from "@/models/QueueOrder";
import { orderDayLabel } from "@/lib/cutoff";
import { notifyOrderChange } from "@/lib/notifyMember";
import { publishQueueChanged } from "@/lib/ably";
import { ApiError, ok, route } from "@/lib/api";

export const DELETE = route(async (_session, _request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid id");
  await connectDB();

  const row = await QueueOrderModel.findByIdAndDelete(id);
  if (!row) throw new ApiError(404, "Order not found");

  // Everyone on the removed order is told, on screen and by push — a half order names the
  // other person to each side.
  const partnerId = row.partnerPersonId?.toString() ?? null;
  const when = orderDayLabel(row.date.toISOString().slice(0, 10));
  await Promise.all([
    notifyOrderChange([
      {
        personId: row.personId.toString(),
        body:
          partnerId && row.partnerName
            ? `Your half order with ${row.partnerName} for ${when} was removed by the admin.`
            : `Your order for ${when} was removed by the admin.`,
      },
      ...(partnerId
        ? [{ personId: partnerId, body: `Your half order with ${row.personName} for ${when} was removed by the admin.` }]
        : []),
    ]),
    publishQueueChanged(),
  ]);

  return ok({ ok: true });
});
