import "server-only";
import { SettingsModel } from "@/models/Settings";
import { QueueOrderModel } from "@/models/QueueOrder";
import { MealEntryModel } from "@/models/MealEntry";
import { sendPushToAdmins, sendPushToPersons } from "@/lib/push";
import { closureOn } from "@/lib/messClosure";
import { isPastCutoffToday, msUntilIstTime, todayIst } from "@/lib/cutoff";
import { toUtcDay } from "@/lib/format";
import { moveQueueToEntries } from "@/lib/queue";
import { personIdsWithoutOrder } from "@/lib/unordered";
import { buildSupplierMessage } from "@/lib/supplierMessage";
import { whatsAppTextUrl } from "@/lib/whatsappUrl";
import { ApiError } from "@/lib/api";
import type { Settings } from "@/types";

/* Jobs driven by the every-minute cron tick (src/app/api/cron/tick). Each call is a no-op until
 * its time of day arrives, then does its work at most once per IST day — the claim is an atomic
 * write on Settings, so overlapping or repeated ticks can never double-send. */

const REMINDER_BODY = "Lunch plans? Order before the cut-off!";
/** Queue rows auto-delete at 2pm IST (see queueAutoClearAt), and a supplier count is useless by
 * then — a tick delayed past this stops, and an undelivered push expires at it. */
const SUPPLIER_DISPATCH_UNTIL = "13:30";

async function claimToday(field: "lunchReminderSentOn" | "supplierDispatchOn", today: string): Promise<boolean> {
  const res = await SettingsModel.updateOne({ key: "singleton", [field]: { $ne: today } }, { $set: { [field]: today } });
  return res.modifiedCount > 0;
}

/** At `lunchReminderTime`: push everyone who hasn't ordered for today yet. */
export async function runLunchReminder(settings: Settings) {
  const today = todayIst();
  if (msUntilIstTime(settings.lunchReminderTime) > 0) return { skipped: "not time yet" };
  if (closureOn(today, settings)) return { skipped: "mess closed" };
  if (isPastCutoffToday(settings.orderCutoffTime)) return { skipped: "past cutoff" };
  if (!(await claimToday("lunchReminderSentOn", today))) return { skipped: "already sent today" };

  const targets = await personIdsWithoutOrder(toUtcDay(today));
  const result = await sendPushToPersons(
    targets,
    { title: settings.messName, body: REMINDER_BODY, url: "/order" },
    // A phone that was offline must not get "order now" after ordering has closed.
    { ttlSeconds: msUntilIstTime(settings.orderCutoffTime) / 1000 },
  );
  return { targeted: targets.length, sent: result.sent };
}

/** Right after the cutoff: move today's queue into the meal entry, then push the admin a
 * notification that opens WhatsApp with the supplier message ready to send. */
export async function runSupplierDispatch(settings: Settings) {
  const today = todayIst();
  if (!isPastCutoffToday(settings.orderCutoffTime)) return { skipped: "before cutoff" };
  if (isPastCutoffToday(SUPPLIER_DISPATCH_UNTIL)) return { skipped: "too late in the day" };
  if (closureOn(today, settings)) return { skipped: "mess closed" };
  if (!(await claimToday("supplierDispatchOn", today))) return { skipped: "already done today" };

  const date = toUtcDay(today);
  const title = settings.messName;
  const pushOptions = { ttlSeconds: msUntilIstTime(SUPPLIER_DISPATCH_UNTIL) / 1000 };

  if (await QueueOrderModel.exists({ date })) {
    try {
      await moveQueueToEntries(date);
    } catch (err) {
      // 404: the admin moved the queue by hand in the meantime — nothing left to move, carry on.
      if (!(err instanceof ApiError && err.status === 404)) {
        // Nothing was moved (the move is one transaction) — hand it to the admin to sort out.
        console.error("Auto move-to-entries failed:", err);
        const reason = err instanceof ApiError ? err.message : "Something went wrong.";
        await sendPushToAdmins(
          { title, body: `Couldn't move today's orders automatically. ${reason} Tap to review.`, url: "/queue" },
          pushOptions,
        );
        return { moved: false, error: reason };
      }
    }
  }

  const entry = await MealEntryModel.findOne({ date }, { fullEaters: 1, halfPairs: 1 }).lean();
  if (!entry || entry.fullEaters.length + entry.halfPairs.length === 0) return { skipped: "no orders" };

  const message = buildSupplierMessage(entry);
  const summary = message.replace(/\n+/g, " · ");
  const phone = settings.supplierPhone;
  const result = await sendPushToAdmins(
    phone
      ? { title, body: `Ordering closed — ${summary}. Tap to send to supplier.`, url: whatsAppTextUrl(phone, message) }
      : { title, body: `Ordering closed — ${summary}. Add the supplier's WhatsApp number in Settings to send it.`, url: "/settings" },
    pushOptions,
  );
  return { adminDevices: result.sent };
}
