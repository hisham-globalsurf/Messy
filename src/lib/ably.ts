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

/** The admin app has no per-admin id to scope a channel to (unlike a member's Person id), and
 * every admin session should see the same thing, so this is one shared broadcast channel — same
 * shape as NOTIFICATIONS_BROADCAST_CHANNEL but for the admin side. */
export const REPORTS_BROADCAST_CHANNEL = "reports:broadcast";

/** Same shape as REPORTS_BROADCAST_CHANNEL, for the admin Queue tab — every open admin tab
 * refetches the queue on any change instead of polling /api/queue on an interval. */
export const QUEUE_BROADCAST_CHANNEL = "queue:broadcast";

/** Publishes one event with an empty payload, swallowing any failure — every `publish*` export
 * below is a thin wrapper around this. Best-effort: if Ably is unreachable or misconfigured, the
 * write that triggered the publish still succeeds — the affected tab(s) just fall back to SWR's
 * revalidate-on-focus/-reconnect (or, for `publishBlockedChanged`, a manual refresh) until they
 * next reconnect. */
async function publishBestEffort(channelName: string, event: string): Promise<void> {
  try {
    const channel = getRestClient().channels.get(channelName);
    await channel.publish(event, {});
  } catch (err) {
    console.error(`Ably publish failed for channel "${channelName}":`, err);
  }
}

/** Tells a member's own open tab(s) to refetch their order/notifications. */
export function publishOrderUpdate(personId: string): Promise<void> {
  return publishBestEffort(memberChannelName(personId), "order-updated");
}

/** Tells every open member tab to refetch in-app notifications — used for a mess-wide
 * notification create/clear (no specific recipients) and for clearing all, which always affects
 * everyone regardless of any one notification's recipients. */
export function publishNotificationsChangedForAll(): Promise<void> {
  return publishBestEffort(NOTIFICATIONS_BROADCAST_CHANNEL, "notifications-changed");
}

/** Tells every open admin tab to refetch the reports list — fired right after a member submits
 * one, so it shows up on the Reports tab without waiting for a manual refresh. */
export function publishReportCreated(): Promise<void> {
  return publishBestEffort(REPORTS_BROADCAST_CHANNEL, "report-created");
}

/** Tells just this one member's open tab(s) to refetch in-app notifications — used when a
 * notification targets specific people rather than everyone. Reuses the member's existing
 * personal channel (already granted for order updates), so no extra token capability is needed. */
export function publishNotificationsChangedForPerson(personId: string): Promise<void> {
  return publishBestEffort(memberChannelName(personId), "notifications-changed");
}

/** Tells every open admin tab to refetch the queue — fired whenever a queue row is added,
 * edited, moved to entries, or deleted, from either the member or admin side. */
export function publishQueueChanged(): Promise<void> {
  return publishBestEffort(QUEUE_BROADCAST_CHANNEL, "queue-changed");
}

/** Tells this member's open tab(s) to re-run the server layout — used when admin blocks/unblocks
 * them, so the app swaps to/from BlockedScreen instantly instead of waiting for a manual refresh. */
export function publishBlockedChanged(personId: string): Promise<void> {
  return publishBestEffort(memberChannelName(personId), "blocked-changed");
}

export function getAblyRestClient(): Ably.Rest {
  return getRestClient();
}
