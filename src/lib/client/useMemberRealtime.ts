"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Ably from "ably";
import { mutate as globalMutate } from "swr";

// Mirrors memberChannelName()/NOTIFICATIONS_BROADCAST_CHANNEL in src/lib/ably.ts — that module
// is server-only (wraps the raw API key), so this client file can't import from it directly.
const NOTIFICATIONS_BROADCAST_CHANNEL = "notifications:broadcast";

/**
 * Subscribes to this member's private Ably channel (order accept/reject, a notification targeted
 * at them specifically, or admin blocking/unblocking them), and the shared notifications-broadcast
 * channel (a mess-wide "send notification"), so all of it shows up on an already-open tab
 * immediately, with no polling. Auth goes through /api/member/ably-token, which deliberately
 * stays reachable even while blocked (see that route) so the token never reaches the browser and
 * the issued token can only subscribe to this one member's channel plus that one shared channel.
 *
 * Used both inside MemberShell (normal app) and BlockedScreen — in both cases `personId` is the
 * session's own id, so a block/unblock reaches whichever one is currently mounted.
 *
 * This is additive, not the only path to fresh data: the member SWR hooks still revalidate on
 * focus/reconnect, so if Ably is unreachable (network blocks WebSockets, an Ably incident, etc.)
 * the member still gets correct data the moment they switch back to the tab — same fallback
 * this app already relied on before Ably was introduced.
 */
export function useMemberRealtime(personId: string | null): void {
  const router = useRouter();

  useEffect(() => {
    if (!personId) return;

    const client = new Ably.Realtime({ authUrl: "/api/member/ably-token" });
    const memberChannel = client.channels.get(`member:${personId}`);
    const broadcastChannel = client.channels.get(NOTIFICATIONS_BROADCAST_CHANNEL);

    // Order changes never create in-app notifications (those arrive as "notifications-changed"),
    // so only the order data needs refetching here.
    function onOrderUpdated() {
      globalMutate("/api/member/order");
    }

    function onNotificationsChanged() {
      globalMutate("/api/member/notifications");
    }

    // Admin toggled this member's blocked status — re-run the server-component layout so it
    // swaps between BlockedScreen and the normal app immediately, no manual refresh needed.
    function onBlockedChanged() {
      router.refresh();
    }

    // Both rejects if the channel/connection closes before attach completes — expected when the
    // effect's cleanup below runs quickly (React Strict Mode's dev double-invoke, or any fast
    // unmount), so it's not a real failure and must be caught to avoid an unhandled rejection.
    memberChannel.subscribe("order-updated", onOrderUpdated).catch(() => {});
    memberChannel.subscribe("notifications-changed", onNotificationsChanged).catch(() => {});
    memberChannel.subscribe("blocked-changed", onBlockedChanged).catch(() => {});
    broadcastChannel.subscribe("notifications-changed", onNotificationsChanged).catch(() => {});

    return () => {
      memberChannel.unsubscribe("order-updated", onOrderUpdated);
      memberChannel.unsubscribe("notifications-changed", onNotificationsChanged);
      memberChannel.unsubscribe("blocked-changed", onBlockedChanged);
      broadcastChannel.unsubscribe("notifications-changed", onNotificationsChanged);
      client.close();
    };
  }, [personId, router]);
}
