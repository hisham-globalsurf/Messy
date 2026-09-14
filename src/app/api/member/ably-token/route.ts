import { ok } from "@/lib/api";
import { memberRoute } from "@/lib/memberApi";
import { getAblyRestClient, memberChannelName, NOTIFICATIONS_BROADCAST_CHANNEL } from "@/lib/ably";

/** Issues a short-lived Ably token scoped to subscribe-only on this member's own channel plus
 * the shared notifications-broadcast channel — the raw ABLY_API_KEY never reaches the browser,
 * and the token can't be used to publish or to read any other member's channel. Ably's SDK
 * re-calls this (authUrl) to renew as needed. */
export const GET = memberRoute(async (session) => {
  const tokenRequest = await getAblyRestClient().auth.createTokenRequest({
    clientId: session.sub,
    capability: {
      [memberChannelName(session.sub)]: ["subscribe"],
      [NOTIFICATIONS_BROADCAST_CHANNEL]: ["subscribe"],
    },
  });
  return ok(tokenRequest);
});
