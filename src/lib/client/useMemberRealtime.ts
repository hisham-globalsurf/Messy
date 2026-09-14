"use client";

import { useEffect } from "react";
import * as Ably from "ably";
import { mutate as globalMutate } from "swr";

// Mirrors memberChannelName()/NOTIFICATIONS_BROADCAST_CHANNEL in src/lib/ably.ts — that module
// is server-only (wraps the raw API key), so this client file can't import from it directly.
const NOTIFICATIONS_BROADCAST_CHANNEL = "notifications:broadcast";

/**
 * Subscribes to this member's private Ably channel (order accept/reject, plus any notification
 * targeted at them specifically) and the shared notifications-broadcast channel (a mess-wide
 * "send notification"), so both show up on an already-open tab immediately, with no polling.
 * Auth goes through /api/member/ably-token (memberRoute-protected) so the raw Ably API key
 * never reaches the browser and the issued token can only subscribe to this one member's
 * channel plus that one shared channel.
 *
 * This is additive, not the only path to fresh data: the member SWR hooks still revalidate on
 * focus/reconnect, so if Ably is unreachable (network blocks WebSockets, an Ably incident, etc.)
 * the member still gets correct data the moment they switch back to the tab — same fallback
 * this app already relied on before Ably was introduced.
 */
export function useMemberRealtime(personId: string | null): void {
  useEffect(() => {
    if (!personId) return;

    const client = new Ably.Realtime({ authUrl: "/api/member/ably-token" });
    const memberChannel = client.channels.get(`member:${personId}`);
    const broadcastChannel = client.channels.get(NOTIFICATIONS_BROADCAST_CHANNEL);

    function onOrderUpdated() {
      globalMutate("/api/member/order");
      globalMutate("/api/member/notifications");
    }

    function onNotificationsChanged() {
      globalMutate("/api/member/notifications");
    }

    // Both rejects if the channel/connection closes before attach completes — expected when the
    // effect's cleanup below runs quickly (React Strict Mode's dev double-invoke, or any fast
    // unmount), so it's not a real failure and must be caught to avoid an unhandled rejection.
    memberChannel.subscribe("order-updated", onOrderUpdated).catch(() => {});
    memberChannel.subscribe("notifications-changed", onNotificationsChanged).catch(() => {});
    broadcastChannel.subscribe("notifications-changed", onNotificationsChanged).catch(() => {});

    return () => {
      memberChannel.unsubscribe("order-updated", onOrderUpdated);
      memberChannel.unsubscribe("notifications-changed", onNotificationsChanged);
      broadcastChannel.unsubscribe("notifications-changed", onNotificationsChanged);
      client.close();
    };
  }, [personId]);
}
