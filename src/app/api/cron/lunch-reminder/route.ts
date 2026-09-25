import { timingSafeEqual } from "node:crypto";
import { connectDB } from "@/lib/db/mongoose";
import { SettingsModel } from "@/models/Settings";
import { PersonModel } from "@/models/Person";
import { QueueOrderModel } from "@/models/QueueOrder";
import { MealEntryModel } from "@/models/MealEntry";
import { sendPushToPerson } from "@/lib/push";
import { closureOn } from "@/lib/messClosure";
import { isPastCutoffToday, todayIst } from "@/lib/cutoff";
import { toUtcDay } from "@/lib/format";
import { ApiError, errorResponse, ok } from "@/lib/api";

const REMINDER_BODY = "Lunch plans? Order before the cut-off!";

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically once that env var is set. */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Daily "order before the cut-off" push to every active member who hasn't ordered for today yet.
 * Scheduled in vercel.json for 03:00 UTC — on the Hobby plan Vercel fires it anywhere in that
 * hour, i.e. 8:30–9:29 IST, always ahead of the cutoff. Skips closed days and days whose cutoff
 * has already passed, and sends at most once per day even if the cron fires twice. */
export async function GET(request: Request): Promise<Response> {
  try {
    if (!isAuthorized(request)) throw new ApiError(401, "Not authenticated");
    await connectDB();

    const today = todayIst();
    // Not .lean(): schema defaults only apply on a hydrated document (older Settings docs predate some fields).
    const settings = await SettingsModel.findOne({ key: "singleton" });
    if (!settings) throw new ApiError(500, "Settings not found");

    const closure = closureOn(today, {
      messClosedFrom: settings.messClosedFrom ? new Date(settings.messClosedFrom).toISOString().slice(0, 10) : null,
      messClosedTo: settings.messClosedTo ? new Date(settings.messClosedTo).toISOString().slice(0, 10) : null,
      messClosedMessage: settings.messClosedMessage ?? "",
      weekendClosed: settings.weekendClosed ?? false,
    });
    if (closure) return ok({ skipped: "mess closed" });
    if (isPastCutoffToday(settings.orderCutoffTime)) return ok({ skipped: "past cutoff" });

    // Atomic claim so a duplicate cron delivery can't double-send.
    const claimed = await SettingsModel.updateOne(
      { key: "singleton", lunchReminderSentOn: { $ne: today } },
      { $set: { lunchReminderSentOn: today } },
    );
    if (claimed.modifiedCount === 0) return ok({ skipped: "already sent today" });

    const date = toUtcDay(today);
    const [people, orders, entry] = await Promise.all([
      PersonModel.find({ blocked: { $ne: true } }, { _id: 1, name: 1 }).lean(),
      QueueOrderModel.find({ date }, { personId: 1, partnerPersonId: 1 }).lean(),
      MealEntryModel.findOne({ date }, { fullEaters: 1, halfPairs: 1 }).lean(),
    ]);

    // Covered = placed their own order, is someone's half partner, or the admin already added them.
    const orderedIds = new Set(
      orders.flatMap((o) => [o.personId.toString(), o.partnerPersonId?.toString()]).filter(Boolean),
    );
    const enteredNames = new Set(
      [...(entry?.fullEaters.map((e) => e.name) ?? []), ...(entry?.halfPairs.flatMap((p) => p.names) ?? [])].map((n) =>
        n.toLowerCase(),
      ),
    );
    const targets = people.filter((p) => !orderedIds.has(p._id.toString()) && !enteredNames.has(p.name.toLowerCase()));

    const results = await Promise.all(
      targets.map((p) =>
        sendPushToPerson(p._id.toString(), { title: settings.messName, body: REMINDER_BODY, url: "/order" }).catch(
          (err) => {
            console.error(`Lunch reminder push failed for ${p._id.toString()}:`, err);
            return { sent: 0, pruned: 0 };
          },
        ),
      ),
    );

    return ok({ targeted: targets.length, sent: results.reduce((sum, r) => sum + r.sent, 0) });
  } catch (err) {
    return errorResponse(err);
  }
}
