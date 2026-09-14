import "server-only";
import Ably from "ably";

let restClient: Ably.Rest | null = null;

function getRestClient(): Ably.Rest {
  if (!restClient) {
    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) throw new Error("ABLY_API_KEY is not set — add it to .env.local.");
    restClient = new Ably.Rest(apiKey);
  }
  return restClient;
}

/** Every member's live-update channel is scoped to their own person id — the token route only
 * ever grants subscribe capability on this exact channel, never a wildcard. */
export function memberChannelName(personId: string): string {
  return `member:${personId}`;
}

/** Every member's token also gets subscribe-only capability on this one shared channel, for
 * updates with no single-person target — e.g. admin's mess-wide "send notification". */
export const NOTIFICATIONS_BROADCAST_CHANNEL = "notifications:broadcast";

/** Tells a member's own open tab(s) to refetch their order/notifications. Best-effort: if Ably
 * is unreachable or misconfigured, the write that triggered this still succeeds — the member
 * just falls back to SWR's revalidate-on-focus/-reconnect until they next switch back to the tab. */
export async function publishOrderUpdate(personId: string): Promise<void> {
  try {
    const channel = getRestClient().channels.get(memberChannelName(personId));
    await channel.publish("order-updated", {});
  } catch (err) {
    console.error(`Ably publish failed for person ${personId}:`, err);
  }
}

/** Tells every open member tab to refetch in-app notifications — used for a mess-wide
 * notification create/clear (no specific recipients) and for clearing all, which always affects
 * everyone regardless of any one notification's recipients. Same best-effort contract as
 * publishOrderUpdate. */
export async function publishNotificationsChangedForAll(): Promise<void> {
  try {
    const channel = getRestClient().channels.get(NOTIFICATIONS_BROADCAST_CHANNEL);
    await channel.publish("notifications-changed", {});
  } catch (err) {
    console.error("Ably broadcast publish failed:", err);
  }
}

/** Tells just this one member's open tab(s) to refetch in-app notifications — used when a
 * notification targets specific people rather than everyone. Reuses the member's existing
 * personal channel (already granted for order updates), so no extra token capability is needed. */
export async function publishNotificationsChangedForPerson(personId: string): Promise<void> {
  try {
    const channel = getRestClient().channels.get(memberChannelName(personId));
    await channel.publish("notifications-changed", {});
  } catch (err) {
    console.error(`Ably publish failed for person ${personId}:`, err);
  }
}

export function getAblyRestClient(): Ably.Rest {
  return getRestClient();
}
