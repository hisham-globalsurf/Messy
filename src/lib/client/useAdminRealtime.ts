"use client";

import { useEffect } from "react";
import * as Ably from "ably";
import { mutate as globalMutate } from "swr";

// Mirrors REPORTS_BROADCAST_CHANNEL in src/lib/ably.ts — that module is server-only (wraps the
// raw API key), so this client file can't import from it directly.
const REPORTS_BROADCAST_CHANNEL = "reports:broadcast";

/**
 * Subscribes the admin app to the shared reports-broadcast channel, so a member's newly
 * submitted report shows up on the Settings > Reports tab instantly, with no polling. Auth goes
 * through /api/ably-token (admin-session-protected) so the raw Ably API key never reaches the
 * browser. Mirrors useMemberRealtime on the member side.
 *
 * Additive, not the only path to fresh data: an admin who navigates to the Reports tab still
 * gets a plain SWR fetch, so this only matters for staying live while already on that tab.
 */
export function useAdminRealtime(): void {
  useEffect(() => {
    const client = new Ably.Realtime({ authUrl: "/api/ably-token" });
    const channel = client.channels.get(REPORTS_BROADCAST_CHANNEL);

    function onReportCreated() {
      globalMutate("/api/reports");
    }

    // Rejects if the channel/connection closes before attach completes — expected when the
    // effect's cleanup below runs quickly (React Strict Mode's dev double-invoke, or any fast
    // unmount), so it's not a real failure and must be caught to avoid an unhandled rejection.
    channel.subscribe("report-created", onReportCreated).catch(() => {});

    return () => {
      channel.unsubscribe("report-created", onReportCreated);
      client.close();
    };
  }, []);
}
