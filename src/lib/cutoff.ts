/** Member-ordering cutoff math, pinned to IST (UTC+5:30) regardless of the server's
 * own timezone (Vercel defaults to UTC) — this is a single-mess, single-timezone app.
 * Safe to import from both client and server code (pure Date math, no Node APIs). */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istNow(): Date {
  return new Date(Date.now() + IST_OFFSET_MS);
}

function toDateInputValue(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Today's date in IST, as "YYYY-MM-DD". */
export function todayIst(): string {
  return toDateInputValue(istNow());
}

/** Tomorrow's date in IST, as "YYYY-MM-DD". */
export function tomorrowIst(): string {
  const d = istNow();
  d.setUTCDate(d.getUTCDate() + 1);
  return toDateInputValue(d);
}

/** Whether the current IST wall-clock time is at or past `cutoffTime` ("HH:mm"). */
export function isPastCutoffToday(cutoffTime: string): boolean {
  const [hours, minutes] = cutoffTime.split(":").map(Number);
  const d = istNow();
  const nowMinutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  return nowMinutes >= hours * 60 + minutes;
}

/** Whether members can still submit/edit/delete an order for `dateInputValue` ("YYYY-MM-DD", IST). */
export function isDateOrderable(dateInputValue: string, cutoffTime: string): boolean {
  const today = todayIst();
  if (dateInputValue === today) return !isPastCutoffToday(cutoffTime);
  return dateInputValue > today;
}

/** Minutes remaining until `cutoffTime` today (IST) — negative once it has passed. */
export function minutesUntilCutoffToday(cutoffTime: string): number {
  const [hours, minutes] = cutoffTime.split(":").map(Number);
  const d = istNow();
  const nowMinutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  return hours * 60 + minutes - nowMinutes;
}

function toMinutesOfDay(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Which post-cutoff message a member with a pending order for today should see: "confirmed"
 * until `confirmedUntil`, then "delivered" until `deliveredUntil` (both "HH:mm", IST), then
 * nothing once `deliveredUntil` has passed. */
export function postCutoffOrderStage(
  confirmedUntil: string,
  deliveredUntil: string,
): "confirmed" | "delivered" | null {
  const d = istNow();
  const nowMinutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  if (nowMinutes < toMinutesOfDay(confirmedUntil)) return "confirmed";
  if (nowMinutes < toMinutesOfDay(deliveredUntil)) return "delivered";
  return null;
}

const QUEUE_AUTO_CLEAR_IST_HOUR = 14; // 2pm — unprocessed queue orders are moot once lunch is out.

/** When a queue order for `date` (UTC midnight, see toUtcDay()) should auto-expire — 2pm IST
 * the same calendar day. Used as a MongoDB TTL index field, so cleanup needs no cron job. */
export function queueAutoClearAt(date: Date): Date {
  return new Date(date.getTime() + (QUEUE_AUTO_CLEAR_IST_HOUR - 5.5) * 60 * 60 * 1000);
}
