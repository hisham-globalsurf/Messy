import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { QueueOrderModel } from "@/models/QueueOrder";
import { SettingsModel } from "@/models/Settings";
import { isDateOrderable } from "@/lib/cutoff";
import { publishOrderUpdate } from "@/lib/ably";
import { ApiError, ok } from "@/lib/api";
import { memberRoute } from "@/lib/memberApi";

export const DELETE = memberRoute(
  async (session, _request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    if (!isValidObjectId(id)) throw new ApiError(400, "Invalid id");
    await connectDB();

    const row = await QueueOrderModel.findById(id);
    if (!row || row.personId.toString() !== session.sub) throw new ApiError(404, "Order not found");

    const settings = await SettingsModel.findOne({ key: "singleton" }).lean();
    if (!settings) throw new ApiError(500, "Settings not found");

    const dateStr = row.date.toISOString().slice(0, 10);
    if (!isDateOrderable(dateStr, settings.orderCutoffTime)) {
      throw new ApiError(403, "Ordering for this date has closed");
    }

    const partnerId = row.partnerPersonId?.toString() ?? null;
    await row.deleteOne();
    // Deleting a half order un-pairs the partner live, same as pairing them notified on submit.
    if (partnerId) await publishOrderUpdate(partnerId);
    return ok({ ok: true });
  },
);
