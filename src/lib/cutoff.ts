/** Member-ordering cutoff math, pinned to IST (UTC+5:30) regardless of the server's
 * own timezone (Vercel defaults to UTC) — this is a single-mess, single-timezone app.
 * Safe to import from both client and server code (pure Date math, no Node APIs). */

import { weekdayName } from "@/lib/format";

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

function fromDateInputValue(dateInputValue: string): Date {
  const [year, month, day] = dateInputValue.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
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

/** "today" / "tomorrow" / weekday name ("Monday") for an order date ("YYYY-MM-DD") — the
 * wording used in member push notifications about an order. */
export function orderDayLabel(dateInputValue: string): string {
  if (dateInputValue === todayIst()) return "today";
  if (dateInputValue === tomorrowIst()) return "tomorrow";
  return weekdayName(dateInputValue);
}

/** The next date after `dateInputValue` ("YYYY-MM-DD") for which `isClosed` returns false —
 * used to land the "order for tomorrow" flow on the next actually-open day when weekends or an
 * admin closure fall in between (e.g. ordering on Friday jumps to Monday). */
export function nextOpenDateAfter(dateInputValue: string, isClosed: (date: string) => boolean): string {
  const d = fromDateInputValue(dateInputValue);
  let next: string;
  do {
    d.setUTCDate(d.getUTCDate() + 1);
    next = toDateInputValue(d);
  } while (isClosed(next));
  return next;
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

/** Milliseconds from now until `hhmm` ("HH:mm", IST) occurs today — negative once it has
 * passed. Second/millisecond-precise (unlike minutesUntilCutoffToday), for scheduling a timer
 * to fire exactly at that instant rather than polling for it. */
export function msUntilIstTime(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const d = istNow();
  const target = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hours, minutes, 0, 0);
  return target - d.getTime();
}

/** Parses "HH:mm" to minutes since midnight, or null if `time` is missing/malformed —
 * callers should treat null as "stage unknown" rather than throw, since older Settings
 * documents may predate a given time field. */
function toMinutesOfDay(time: string | undefined | null): number | null {
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

/** Which post-cutoff message a member with a pending order for today should see: "confirmed"
 * until `confirmedUntil` ("HH:mm", IST), then "delivered" for the rest of the day. */
export function postCutoffOrderStage(confirmedUntil: string | undefined | null): "confirmed" | "delivered" {
  const confirmedMinutes = toMinutesOfDay(confirmedUntil);
  const d = istNow();
  const nowMinutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  if (confirmedMinutes !== null && nowMinutes < confirmedMinutes) return "confirmed";
  return "delivered";
}

const QUEUE_AUTO_CLEAR_IST_HOUR = 14; // 2pm — unprocessed queue orders are moot once lunch is out.

/** When a queue order for `date` (UTC midnight, see toUtcDay()) should auto-expire — 2pm IST
 * the same calendar day. Used as a MongoDB TTL index field, so cleanup needs no cron job. */
export function queueAutoClearAt(date: Date): Date {
  return new Date(date.getTime() + (QUEUE_AUTO_CLEAR_IST_HOUR - 5.5) * 60 * 60 * 1000);
}
