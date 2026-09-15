import { connectDB } from "@/lib/db/mongoose";
import { QueueOrderModel } from "@/models/QueueOrder";
import { PersonModel } from "@/models/Person";
import { SettingsModel } from "@/models/Settings";
import { memberOrderSchema } from "@/lib/validation";
import { toUtcDay } from "@/lib/format";
import { isDateOrderable, queueAutoClearAt, todayIst, tomorrowIst } from "@/lib/cutoff";
import { assertPeopleAvailable, findConfirmedOrder, findLastOrderDraft } from "@/lib/queue";
import { serializeQueueOrder } from "@/lib/serialize";
import { publishOrderUpdate, publishQueueChanged } from "@/lib/ably";
import { ApiError, ok } from "@/lib/api";
import { memberRoute } from "@/lib/memberApi";
import type { MemberDateOrder } from "@/types";

const collation = { locale: "en", strength: 2 } as const;

async function dateOrderStatus(personId: string, personName: string, date: Date): Promise<MemberDateOrder> {
  const confirmed = await findConfirmedOrder(personName, date);
  if (confirmed) return { status: "confirmed", order: confirmed };

  const row = await QueueOrderModel.findOne({ personId, date }).lean();
  if (row) return { status: "pending", order: serializeQueueOrder(row) };

  // Someone else may have already paired with this member for a half order without this
  // member having submitted anything of their own yet — surface that live instead of making
  // them find out only when their own submit gets rejected as a clash.
  const partnerRow = await QueueOrderModel.findOne({ partnerPersonId: personId, date }).lean();
  if (partnerRow) {
    return { status: "paired", order: { partnerName: partnerRow.personName, variant: partnerRow.variant } };
  }

  return { status: "none" };
}

export const GET = memberRoute(async (session) => {
  await connectDB();
  const todayDate = todayIst();
  const tomorrowDate = tomorrowIst();

  const today = await dateOrderStatus(session.sub, session.name, toUtcDay(todayDate));
  const tomorrow = await dateOrderStatus(session.sub, session.name, toUtcDay(tomorrowDate));
  const lastOrder =
    today.status === "none" && tomorrow.status === "none" ? await findLastOrderDraft(session.name) : null;

  return ok({ today, tomorrow, todayDate, tomorrowDate, lastOrder });
});

export const POST = memberRoute(async (session, request: Request) => {
  const input = memberOrderSchema.parse(await request.json());
  await connectDB();

  const settings = await SettingsModel.findOne({ key: "singleton" }).lean();
  if (!settings) throw new ApiError(500, "Settings not found");

  const dateUtc = toUtcDay(input.date);
  const dateStr = dateUtc.toISOString().slice(0, 10);
  if (dateStr !== todayIst() && dateStr !== tomorrowIst()) {
    throw new ApiError(400, "You can only order for today or tomorrow");
  }
  if (!isDateOrderable(dateStr, settings.orderCutoffTime)) {
    throw new ApiError(403, "Ordering for this date has closed");
  }
  if (await findConfirmedOrder(session.name, dateUtc)) {
    throw new ApiError(
      409,
      "Your order has already been confirmed by the admin. Please contact them for any changes.",
    );
  }

  let partnerPersonId: string | null = null;
  let partnerName: string | null = null;
  if (input.kind === "half") {
    if (input.partnerName!.toLowerCase() === session.name.toLowerCase()) {
      throw new ApiError(400, "Pick someone other than yourself");
    }
    const partner = await PersonModel.findOne({ name: input.partnerName }).collation(collation).lean();
    if (!partner) throw new ApiError(404, "That person could not be found");
    partnerPersonId = partner._id.toString();
    partnerName = partner.name;
  }

  const existingOwnRow = await QueueOrderModel.findOne({ personId: session.sub, date: dateUtc }).lean();
  await assertPeopleAvailable(dateUtc, session.sub, partnerPersonId, existingOwnRow?._id.toString());

  const updated = await QueueOrderModel.findOneAndUpdate(
    { personId: session.sub, date: dateUtc },
    {
      $set: {
        personName: session.name,
        kind: input.kind,
        variant: input.variant,
        count: input.kind === "full" ? input.count : 1,
        partnerPersonId,
        partnerName,
        expireAt: queueAutoClearAt(dateUtc),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // Tell the affected partner(s) live: whoever is newly paired should see it appear, and
  // whoever was paired before (now dropped or swapped for someone else) should see it clear.
  const oldPartnerId = existingOwnRow?.partnerPersonId?.toString() ?? null;
  if (oldPartnerId && oldPartnerId !== partnerPersonId) await publishOrderUpdate(oldPartnerId);
  if (partnerPersonId && partnerPersonId !== oldPartnerId) await publishOrderUpdate(partnerPersonId);
  await publishQueueChanged();

  return ok(serializeQueueOrder(updated.toObject()));
});
