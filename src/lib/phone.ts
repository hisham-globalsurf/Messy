/** Strips everything but digits and keeps the last 10 — makes "+91 98765 43210",
 * "09876543210", and "9876543210" all compare equal regardless of how it was typed
 * or stored. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.slice(-10);
}
