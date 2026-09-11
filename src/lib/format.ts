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
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
