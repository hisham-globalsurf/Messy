import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { MemberDeviceModel } from "@/models/MemberDevice";
import { PersonModel } from "@/models/Person";
import {
  clearPendingLoginCookie,
  createMemberSessionCookie,
  getPendingLoginDeviceId,
} from "@/lib/auth/memberSession";
import { BLOCKED_MESSAGE } from "@/lib/memberApi";
import { publishDeviceRequestsChanged } from "@/lib/ably";
import { errorResponse } from "@/lib/api";
import type { LoginRequestStatus } from "@/types";

/** Polled by the member's waiting screen. Once the admin has approved this browser's request,
 * swaps the pending cookie for a real session bound to that device. */
export async function GET(): Promise<Response> {
  try {
    const deviceId = await getPendingLoginDeviceId();
    if (!deviceId) return NextResponse.json<LoginRequestStatus>({ status: "none" });

    await connectDB();
    const device = await MemberDeviceModel.findById(deviceId).lean();
    const now = new Date();

    // Gone (the TTL index removed it, or it was cancelled) or past its window without a decision.
    if (!device || (device.status === "pending" && device.expireAt && device.expireAt <= now)) {
      await clearPendingLoginCookie();
      return NextResponse.json<LoginRequestStatus>({ status: "expired" });
    }

    if (device.status === "pending") {
      return NextResponse.json<LoginRequestStatus>({ status: "pending", name: device.personName, code: device.code });
    }

    if (device.status === "rejected") {
      await clearPendingLoginCookie();
      return NextResponse.json<LoginRequestStatus>({ status: "rejected" });
    }

    // Approved — re-check the member still exists and isn't blocked before issuing a session.
    const person = await PersonModel.findById(device.personId, { name: 1, blocked: 1 }).lean();
    if (!person) {
      await MemberDeviceModel.deleteOne({ _id: device._id });
      await clearPendingLoginCookie();
      return NextResponse.json<LoginRequestStatus>({ status: "expired" });
    }
    if (person.blocked) {
      await clearPendingLoginCookie();
      return NextResponse.json({ error: BLOCKED_MESSAGE }, { status: 403 });
    }

    // Collected — from here the device lives until it's logged out.
    await MemberDeviceModel.updateOne({ _id: device._id }, { $set: { expireAt: null, lastSeenAt: now } });
    await createMemberSessionCookie({ sub: person._id.toString(), name: person.name }, device._id.toString());
    await clearPendingLoginCookie();
    return NextResponse.json<LoginRequestStatus>({ status: "approved" });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Member tapped "Cancel" on the waiting screen — withdraws the request from the admin's list. */
export async function DELETE(): Promise<Response> {
  try {
    const deviceId = await getPendingLoginDeviceId();
    if (deviceId) {
      await connectDB();
      const { deletedCount } = await MemberDeviceModel.deleteOne({ _id: deviceId, status: "pending" });
      if (deletedCount > 0) await publishDeviceRequestsChanged();
    }
    await clearPendingLoginCookie();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
