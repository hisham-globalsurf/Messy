import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { PersonModel } from "@/models/Person";
import { MemberDeviceModel } from "@/models/MemberDevice";
import { publishDeviceRequestsChanged, publishSessionRevoked } from "@/lib/ably";
import { ApiError, ok, route } from "@/lib/api";
import type { MemberDevicesResponse } from "@/types";

/** Devices this member is logged in on. Approvals not yet collected by their browser
 * (expireAt still set) aren't logged in anywhere yet, so they're left out. */
export const GET = route(async (_session, _request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid id");
  await connectDB();

  const person = await PersonModel.findById(id, { sessionsRevokedAt: 1 }).lean();
  if (!person) throw new ApiError(404, "Person not found");

  const devices = await MemberDeviceModel.find({ personId: person._id, status: "approved", expireAt: null })
    .sort({ lastSeenAt: -1, createdAt: -1 })
    .lean();

  const body: MemberDevicesResponse = {
    devices: devices.map((d) => ({
      _id: d._id.toString(),
      label: d.label,
      createdAt: d.createdAt.toISOString(),
      lastSeenAt: d.lastSeenAt ? d.lastSeenAt.toISOString() : null,
    })),
    legacySessionsActive: !person.sessionsRevokedAt,
  };
  return ok(body);
});

/** Logs this member out everywhere: every approved device and pending request is removed, and
 * sessions from before device approval existed are ended too. */
export const DELETE = route(async (_session, _request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid id");
  await connectDB();

  const person = await PersonModel.findByIdAndUpdate(id, { $set: { sessionsRevokedAt: new Date() } }).lean();
  if (!person) throw new ApiError(404, "Person not found");

  const { deletedCount } = await MemberDeviceModel.deleteMany({ personId: person._id });
  await publishSessionRevoked(person._id.toString());
  if (deletedCount > 0) await publishDeviceRequestsChanged();

  return ok({ ok: true });
});
