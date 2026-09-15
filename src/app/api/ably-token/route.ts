import { ok, route } from "@/lib/api";
import { getAblyRestClient, REPORTS_BROADCAST_CHANNEL } from "@/lib/ably";

/** Issues a short-lived Ably token scoped to subscribe-only on the shared reports-broadcast
 * channel — the raw ABLY_API_KEY never reaches the browser. Mirrors the member-facing token
 * route in src/app/api/member/ably-token, just for the admin side. Ably's SDK re-calls this
 * (authUrl) to renew as needed. */
export const GET = route(async (session) => {
  const tokenRequest = await getAblyRestClient().auth.createTokenRequest({
    clientId: session.sub,
    capability: {
      [REPORTS_BROADCAST_CHANNEL]: ["subscribe"],
    },
  });
  return ok(tokenRequest);
});
