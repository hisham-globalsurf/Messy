import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { QueueOrderModel } from "@/models/QueueOrder";
import { ApiError, ok, route } from "@/lib/api";

export const DELETE = route(async (_session, _request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid id");
  await connectDB();

  const row = await QueueOrderModel.findByIdAndDelete(id);
  if (!row) throw new ApiError(404, "Order not found");
  return ok({ ok: true });
});
