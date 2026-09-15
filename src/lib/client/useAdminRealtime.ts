"use client";

import { useEffect } from "react";
import * as Ably from "ably";
import { mutate as globalMutate } from "swr";

// Mirrors REPORTS_BROADCAST_CHANNEL/QUEUE_BROADCAST_CHANNEL in src/lib/ably.ts — that module is
// server-only (wraps the raw API key), so this client file can't import from it directly.
const REPORTS_BROADCAST_CHANNEL = "reports:broadcast";
const QUEUE_BROADCAST_CHANNEL = "queue:broadcast";

/**
 * Subscribes the admin app to the shared reports-broadcast and queue-broadcast channels, so a
 * member's newly submitted report or queue order shows up instantly with no polling. Auth goes
 * through /api/ably-token (admin-session-protected) so the raw Ably API key never reaches the
 * browser. Mirrors useMemberRealtime on the member side.
 *
 * Additive, not the only path to fresh data: an admin who navigates to the Reports or Queue tab
 * still gets a plain SWR fetch, so this only matters for staying live while already on that tab.
 */
export function useAdminRealtime(): void {
  useEffect(() => {
    const client = new Ably.Realtime({ authUrl: "/api/ably-token" });
    const reportsChannel = client.channels.get(REPORTS_BROADCAST_CHANNEL);
    const queueChannel = client.channels.get(QUEUE_BROADCAST_CHANNEL);

    function onReportCreated() {
      globalMutate("/api/reports");
    }
    function onQueueChanged() {
      globalMutate("/api/queue");
    }

    // Rejects if the channel/connection closes before attach completes — expected when the
    // effect's cleanup below runs quickly (React Strict Mode's dev double-invoke, or any fast
    // unmount), so it's not a real failure and must be caught to avoid an unhandled rejection.
    reportsChannel.subscribe("report-created", onReportCreated).catch(() => {});
    queueChannel.subscribe("queue-changed", onQueueChanged).catch(() => {});

    return () => {
      reportsChannel.unsubscribe("report-created", onReportCreated);
      queueChannel.unsubscribe("queue-changed", onQueueChanged);
      client.close();
    };
  }, []);
}
