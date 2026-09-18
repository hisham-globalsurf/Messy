export function formatMoney(amount: number, currency = "₹"): string {
  const rounded = Math.round(amount * 100) / 100;
  const str = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(2);
  return `${currency}${str}`;
}

/** ISO date at UTC midnight — the canonical form for a meal-entry day. */
export function toUtcDay(input: string | Date): Date {
  const d = new Date(input);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Local date + time for an actual instant (e.g. when something was submitted) — unlike
 * formatDate/formatDateShort, which render a calendar day and deliberately stay in UTC. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Full weekday name for a "YYYY-MM-DD" date, e.g. "Monday" — used to label an order date that
 * isn't literally today/tomorrow (a weekend/holiday skip lands on some other day of the week). */
export function weekdayName(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export function dayParts(iso: string): { day: string; month: string; weekday: string } {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("en-GB", { day: "2-digit", timeZone: "UTC" }),
    month: d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }),
    weekday: d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }),
  };
}

export function monthKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Today's date in the browser's local timezone — toISOString() would use UTC and show
 * yesterday's date for hours after local midnight but before UTC midnight (e.g. IST). */
export function todayInputValue(): string {
  return toInputDate(new Date());
}

/** Local calendar date -> "YYYY-MM-DD", the inverse of parseInputDate(). */
export function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** "YYYY-MM-DD" -> a local calendar date (not UTC), for use with day-picker components. */
export function parseInputDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** "HH:mm" (24h) -> "h:mm AM/PM", e.g. "10:25" -> "10:25 AM". */
export function formatTime12h(hhmm: string): string {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const twelveHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelveHour}:${String(minutes).padStart(2, "0")} ${period}`;
}

/** One-line description of a full/half order, e.g. "Full ×2 — Non-veg" or
 * "Half with Priya — Egg" — shared by anywhere an order needs a compact text summary. */
export function formatOrderSummary(order: {
  kind: "full" | "half";
  variant: string | null;
  count: number;
  partnerName: string | null;
}): string {
  return order.kind === "full"
    ? `Full${order.count > 1 ? ` ×${order.count}` : ""}${order.variant ? ` — ${order.variant}` : ""}`
    : `Half with ${order.partnerName}${order.variant ? ` — ${order.variant}` : ""}`;
}
