/** Whether `dateInputValue` ("YYYY-MM-DD") falls within an admin-set mess-closed period
 * (inclusive both ends). Pure date-string comparison — auto-clears once `to` passes with
 * no cleanup step needed, since it's re-evaluated fresh on every check. */
export function isMessClosedOn(dateInputValue: string, from: string | null, to: string | null): boolean {
  if (!from || !to) return false;
  return dateInputValue >= from && dateInputValue <= to;
}
