import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { SettlementModel } from "@/models/Settlement";
import { NotificationModel } from "@/models/Notification";
import { SettingsModel } from "@/models/Settings";
import { settlementPeople } from "@/lib/settlementBreakdown";
import { sendPushToPerson } from "@/lib/push";
import { publishNotificationsChangedForPerson } from "@/lib/ably";
import { formatDate, formatMoney } from "@/lib/format";
import { ApiError, ok, route } from "@/lib/api";

/** Reminds every member who still owes something in this settlement to pay their GPay split —
 * one in-app notification (plus a best-effort push) per member, each carrying their own amount.
 * Members already fully paid in cash are skipped. */
export const POST = route(async (_session, _request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid id");
  await connectDB();

  const [settlement, settings] = await Promise.all([
    SettlementModel.findById(id).lean(),
    SettingsModel.findOne({ key: "singleton" }).lean(),
  ]);
  if (!settlement) throw new ApiError(404, "Settlement not found");
  if (!settings) throw new ApiError(500, "Settings not found");

  const { people } = await settlementPeople(settlement._id);
  const recipients = people.filter(
    (p): p is typeof p & { personId: string } => p.dueAmount > 0 && Boolean(p.personId),
  );
  if (recipients.length === 0) throw new ApiError(400, "No members with an amount due in this settlement");

  const period = `${formatDate(settlement.dateFrom.toISOString())} to ${formatDate(settlement.dateTo.toISOString())}`;
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
  const expireAt = new Date(Date.now() + TWO_DAYS_MS);

  const messages = recipients.map((p) => ({
    personId: p.personId,
    message: `Please pay your split of ${formatMoney(p.dueAmount, settings.currency)} on GPay for your meals from ${period}.`,
  }));

  await NotificationModel.insertMany(
    messages.map((m) => ({ message: m.message, personIds: [m.personId], expireAt })),
  );

  // Best-effort, same contract as the other notification routes — the in-app notifications are
  // already saved even if live refresh or push delivery fails.
  const results = await Promise.all(
    messages.map(async (m) => {
      await publishNotificationsChangedForPerson(m.personId);
      try {
        const r = await sendPushToPerson(m.personId, { title: settings.messName, body: m.message, url: "/order" });
        return r.sent;
      } catch (err) {
        console.error("Push send failed:", err);
        return 0;
      }
    }),
  );

  return ok({ notified: messages.length, delivered: results.reduce((t, n) => t + n, 0) }, 201);
});
