import { connectDB } from "@/lib/db/mongoose";
import { QueueOrderModel } from "@/models/QueueOrder";
import { PersonModel } from "@/models/Person";
import { SettingsModel } from "@/models/Settings";
import { memberOrderSchema } from "@/lib/validation";
import { toUtcDay } from "@/lib/format";
import { isDateOrderable, queueAutoClearAt, todayIst, tomorrowIst } from "@/lib/cutoff";
import { assertPeopleAvailable, findLastOrderDraft } from "@/lib/queue";
import { serializeQueueOrder } from "@/lib/serialize";
import { ApiError, ok } from "@/lib/api";
import { memberRoute } from "@/lib/memberApi";

const collation = { locale: "en", strength: 2 } as const;

export const GET = memberRoute(async (session) => {
  await connectDB();
  const todayDate = todayIst();
  const tomorrowDate = tomorrowIst();

  const rows = await QueueOrderModel.find({
    personId: session.sub,
    date: { $in: [toUtcDay(todayDate), toUtcDay(tomorrowDate)] },
  }).lean();

  const forDate = (d: string) => rows.find((r) => new Date(r.date).toISOString().slice(0, 10) === d);
  const today = forDate(todayDate);
  const tomorrow = forDate(tomorrowDate);
  const lastOrder = today || tomorrow ? null : await findLastOrderDraft(session.name);

  return ok({
    today: today ? serializeQueueOrder(today) : null,
    tomorrow: tomorrow ? serializeQueueOrder(tomorrow) : null,
    todayDate,
    tomorrowDate,
    lastOrder,
  });
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

  return ok(serializeQueueOrder(updated.toObject()));
});
