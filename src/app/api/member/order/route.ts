import { connectDB } from "@/lib/db/mongoose";
import { QueueOrderModel } from "@/models/QueueOrder";
import { PersonModel } from "@/models/Person";
import { SettingsModel } from "@/models/Settings";
import { memberOrderSchema } from "@/lib/validation";
import { toUtcDay } from "@/lib/format";
import { isDateOrderable, nextOpenDateAfter, orderDayLabel, queueAutoClearAt, todayIst } from "@/lib/cutoff";
import { closureOn } from "@/lib/messClosure";
import { assertPeopleAvailable, findConfirmedOrder, findLastOrderDraft } from "@/lib/queue";
import { serializeQueueOrder, serializeSettings } from "@/lib/serialize";
import { publishQueueChanged } from "@/lib/ably";
import { notifyOrderChange, type OrderNotice } from "@/lib/notifyMember";
import { ApiError, ok } from "@/lib/api";
import { memberRoute } from "@/lib/memberApi";
import type { MemberDateOrder } from "@/types";

const collation = { locale: "en", strength: 2 } as const;

async function dateOrderStatus(personId: string, personName: string, date: Date): Promise<MemberDateOrder> {
  // All three lookups are independent reads — run them together rather than paying three
  // sequential DB round-trips, then pick the winner in priority order.
  const [confirmed, row, partnerRow] = await Promise.all([
    findConfirmedOrder(personName, date),
    QueueOrderModel.findOne({ personId, date }).lean(),
    // Someone else may have already paired with this member for a half order without this
    // member having submitted anything of their own yet — surface that live instead of making
    // them find out only when their own submit gets rejected as a clash.
    QueueOrderModel.findOne({ partnerPersonId: personId, date }).lean(),
  ]);

  if (confirmed) return { status: "confirmed", order: confirmed };
  if (row) return { status: "pending", order: serializeQueueOrder(row) };
  if (partnerRow) {
    return { status: "paired", order: { partnerName: partnerRow.personName, variant: partnerRow.variant } };
  }

  return { status: "none" };
}

export const GET = memberRoute(async (session) => {
  await connectDB();
  const settingsDoc = await SettingsModel.findOne({ key: "singleton" }).lean();
  if (!settingsDoc) throw new ApiError(500, "Settings not found");
  const settings = serializeSettings(settingsDoc);

  const todayDate = todayIst();
  const tomorrowDate = nextOpenDateAfter(todayDate, (date) => closureOn(date, settings) !== null);

  // lastOrder is fetched alongside rather than after the two statuses — it's a single indexed
  // read, cheaper than the extra sequential round-trip of waiting to see whether it's needed.
  const [today, tomorrow, lastOrderDraft] = await Promise.all([
    dateOrderStatus(session.sub, session.name, toUtcDay(todayDate)),
    dateOrderStatus(session.sub, session.name, toUtcDay(tomorrowDate)),
    findLastOrderDraft(session.name),
  ]);
  // Either date's form (not just both) can need this to prefill — e.g. today's already ordered
  // but tomorrow isn't yet, which is the common case once "Order for tomorrow" opens up.
  const lastOrder = today.status === "none" || tomorrow.status === "none" ? lastOrderDraft : null;

  return ok({ today, tomorrow, todayDate, tomorrowDate, lastOrder });
});

export const POST = memberRoute(async (session, request: Request) => {
  const input = memberOrderSchema.parse(await request.json());
  await connectDB();

  const settingsDoc = await SettingsModel.findOne({ key: "singleton" }).lean();
  if (!settingsDoc) throw new ApiError(500, "Settings not found");
  const settings = serializeSettings(settingsDoc);

  const dateUtc = toUtcDay(input.date);
  const dateStr = dateUtc.toISOString().slice(0, 10);
  const todayDate = todayIst();
  const nextOpenDate = nextOpenDateAfter(todayDate, (date) => closureOn(date, settings) !== null);
  if (dateStr !== todayDate && dateStr !== nextOpenDate) {
    throw new ApiError(400, "You can only order for today or the next available day");
  }
  if (closureOn(dateStr, settings) || !isDateOrderable(dateStr, settings.orderCutoffTime)) {
    throw new ApiError(403, "Ordering for this date has closed");
  }
  if (input.kind === "half" && input.partnerName!.toLowerCase() === session.name.toLowerCase()) {
    throw new ApiError(400, "Pick someone other than yourself");
  }

  // Independent reads — run together instead of one round-trip after another.
  const [confirmed, partner, existingOwnRow] = await Promise.all([
    findConfirmedOrder(session.name, dateUtc),
    input.kind === "half" ? PersonModel.findOne({ name: input.partnerName }).collation(collation).lean() : null,
    QueueOrderModel.findOne({ personId: session.sub, date: dateUtc }).lean(),
  ]);
  if (confirmed) {
    throw new ApiError(
      409,
      "Your order has already been confirmed by the admin. Please contact them for any changes.",
    );
  }

  let partnerPersonId: string | null = null;
  let partnerName: string | null = null;
  if (input.kind === "half") {
    if (!partner) throw new ApiError(404, "That person could not be found");
    partnerPersonId = partner._id.toString();
    partnerName = partner.name;
  }

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

  // Whoever is newly paired should see it appear, and whoever was paired before (now dropped or
  // swapped for someone else) should see it clear — both named, on screen and by push.
  const oldPartnerId = existingOwnRow?.partnerPersonId?.toString() ?? null;
  const when = orderDayLabel(dateStr);
  const notices: OrderNotice[] = [];
  if (oldPartnerId && oldPartnerId !== partnerPersonId) {
    notices.push({ personId: oldPartnerId, body: `${session.name} removed you from their half order for ${when}.` });
  }
  if (partnerPersonId && partnerPersonId !== oldPartnerId) {
    notices.push({ personId: partnerPersonId, body: `${session.name} placed a half order with you for ${when}.` });
  }
  await Promise.all([notifyOrderChange(notices, settings.messName), publishQueueChanged()]);

  return ok(serializeQueueOrder(updated.toObject()));
});
