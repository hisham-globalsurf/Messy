import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { QueueOrderModel } from "@/models/QueueOrder";
import { publishOrderUpdate } from "@/lib/ably";
import { ApiError, ok, route } from "@/lib/api";

export const DELETE = route(async (_session, _request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid id");
  await connectDB();

  const row = await QueueOrderModel.findByIdAndDelete(id);
  if (!row) throw new ApiError(404, "Order not found");

  // Best-effort — a member with this order's tab open should see it disappear immediately
  // rather than waiting to refocus the tab.
  await publishOrderUpdate(row.personId.toString());
  if (row.partnerPersonId) await publishOrderUpdate(row.partnerPersonId.toString());

  return ok({ ok: true });
});
