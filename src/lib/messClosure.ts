/** Whether `dateInputValue` ("YYYY-MM-DD") falls within an admin-set mess-closed period
 * (inclusive both ends). Pure date-string comparison — auto-clears once `to` passes with
 * no cleanup step needed, since it's re-evaluated fresh on every check. */
export function isMessClosedOn(dateInputValue: string, from: string | null, to: string | null): boolean {
  if (!from || !to) return false;
  return dateInputValue >= from && dateInputValue <= to;
}

/** Day of week for an IST calendar date string, parsed at UTC midnight so it never shifts with
 * the server's own timezone. 0 = Sunday .. 6 = Saturday. */
function dayOfWeek(dateInputValue: string): number {
  return new Date(`${dateInputValue}T00:00:00Z`).getUTCDay();
}

/** Whether `dateInputValue` is a Saturday or Sunday and the admin has closed the mess on
 * weekends (Settings.weekendClosed). */
export function isWeekendClosedOn(dateInputValue: string, weekendClosed: boolean): boolean {
  if (!weekendClosed) return false;
  const day = dayOfWeek(dateInputValue);
  return day === 0 || day === 6;
}

export interface ClosureInfo {
  from: string | null;
  to: string | null;
  message: string;
}

/** Whether the mess is closed on `dateInputValue` for any admin-configured reason — an explicit
 * closure range takes priority, otherwise falls back to the recurring weekend closure — and
 * what members should be told if so. Returns null when the mess is open that day. */
export function closureOn(
  dateInputValue: string,
  settings: { messClosedFrom: string | null; messClosedTo: string | null; messClosedMessage: string; weekendClosed: boolean },
): ClosureInfo | null {
  if (isMessClosedOn(dateInputValue, settings.messClosedFrom, settings.messClosedTo)) {
    return { from: settings.messClosedFrom, to: settings.messClosedTo, message: settings.messClosedMessage };
  }
  if (isWeekendClosedOn(dateInputValue, settings.weekendClosed)) {
    return { from: null, to: null, message: "The mess is closed on weekends." };
  }
  return null;
}
