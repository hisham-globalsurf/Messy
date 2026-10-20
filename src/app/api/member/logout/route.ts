import { NextResponse } from "next/server";
import { clearMemberSessionCookie, getMemberSession } from "@/lib/auth/memberSession";
import { connectDB } from "@/lib/db/mongoose";
import { PushSubscriptionModel } from "@/models/PushSubscription";
import { MemberDeviceModel } from "@/models/MemberDevice";

/** `endpoint` (optional) is this device's push subscription — dropped so the device stops getting
 * the logged-out member's personal pushes (order confirmations, partner changes, report replies),
 * which on a shared phone would otherwise reach whoever uses it next. Scoped to the session's own
 * person, so a forged endpoint can't remove anyone else's subscription. */
export async function POST(request: Request): Promise<Response> {
  // Logging out must clear the cookie even if the session lookup itself fails.
  const session = await getMemberSession().catch(() => null);
  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (session?.did) {
    try {
      // This browser's approval ends with the logout — logging in again needs a fresh one.
      await MemberDeviceModel.deleteOne({ _id: session.did, personId: session.sub });
    } catch (err) {
      console.error("Device cleanup on logout failed:", err);
    }
  }
  if (session && typeof body?.endpoint === "string") {
    try {
      await connectDB();
      await PushSubscriptionModel.deleteOne({ endpoint: body.endpoint, personId: session.sub });
    } catch (err) {
      // Logging out must still work even if this cleanup fails.
      console.error("Push subscription cleanup on logout failed:", err);
    }
  }
  await clearMemberSessionCookie();
  return NextResponse.json({ ok: true });
}
