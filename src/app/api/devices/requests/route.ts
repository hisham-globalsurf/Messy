import { connectDB } from "@/lib/db/mongoose";
import { MemberDeviceModel } from "@/models/MemberDevice";
import { ok, route } from "@/lib/api";
import type { LoginRequestItem } from "@/types";

/** Member login requests still waiting for the admin. Filters on expireAt as well as status,
 * since the TTL index only sweeps about once a minute. */
export const GET = route(async () => {
  await connectDB();
  const requests = await MemberDeviceModel.find({ status: "pending", expireAt: { $gt: new Date() } })
    .sort({ createdAt: -1 })
    .lean();
  const items: LoginRequestItem[] = requests.map((r) => ({
    _id: r._id.toString(),
    personName: r.personName,
    code: r.code,
    label: r.label,
    createdAt: r.createdAt.toISOString(),
  }));
  return ok(items);
});
