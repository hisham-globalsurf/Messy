import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { APPROVAL_PICKUP_TTL_MS, MemberDeviceModel } from "@/models/MemberDevice";
import { publishDeviceRequestsChanged, publishSessionRevoked } from "@/lib/ably";
import { ApiError, ok, route } from "@/lib/api";

const decisionSchema = z.object({ action: z.enum(["approve", "reject"]) });

/** How long a rejection is remembered, so the member's waiting screen can still show it. */
const REJECTION_TTL_MS = 60 * 60 * 1000;

/** Approves or rejects a pending login request. Conditional on it still being pending and
 * unexpired, so a double tap or two admins deciding at once can't flip an earlier decision. */
export const PATCH = route(async (_session, request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid id");
  const { action } = decisionSchema.parse(await request.json());
  await connectDB();

  const now = new Date();
  const device = await MemberDeviceModel.findOneAndUpdate(
    { _id: id, status: "pending", expireAt: { $gt: now } },
    {
      $set:
        action === "approve"
          ? { status: "approved", decidedAt: now, expireAt: new Date(now.getTime() + APPROVAL_PICKUP_TTL_MS) }
          : { status: "rejected", decidedAt: now, expireAt: new Date(now.getTime() + REJECTION_TTL_MS) },
    },
  ).lean();
  await publishDeviceRequestsChanged();
  if (!device) throw new ApiError(404, "This request has expired or was already handled");

  return ok({ ok: true });
});

/** Logs one of a member's devices out. Its next request finds no approved device and fails;
 * an open tab is told to re-check right away. */
export const DELETE = route(async (_session, _request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid id");
  await connectDB();

  const device = await MemberDeviceModel.findOneAndDelete({ _id: id, status: "approved" }).lean();
  if (!device) throw new ApiError(404, "Device not found");
  await publishSessionRevoked(device.personId.toString());

  return ok({ ok: true });
});
