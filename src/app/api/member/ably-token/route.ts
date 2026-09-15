import { errorResponse, ok } from "@/lib/api";
import { requireMemberSessionIgnoringBlock } from "@/lib/memberApi";
import { getAblyRestClient, memberChannelName, NOTIFICATIONS_BROADCAST_CHANNEL } from "@/lib/ably";

/** Issues a short-lived Ably token scoped to subscribe-only on this member's own channel plus
 * the shared notifications-broadcast channel — the raw ABLY_API_KEY never reaches the browser,
 * and the token can't be used to publish or to read any other member's channel. Ably's SDK
 * re-calls this (authUrl) to renew as needed.
 *
 * Uses `requireMemberSessionIgnoringBlock` instead of `memberRoute` — a blocked member must
 * still be able to fetch a token so their own channel's "blocked-changed" event can reach an
 * already-open tab, otherwise an admin unblocking them would never reach BlockedScreen. Still
 * requires the session to name a Person that actually exists, same as every other member route. */
export async function GET() {
  try {
    const session = await requireMemberSessionIgnoringBlock();
    const tokenRequest = await getAblyRestClient().auth.createTokenRequest({
      clientId: session.sub,
      capability: {
        [memberChannelName(session.sub)]: ["subscribe"],
        [NOTIFICATIONS_BROADCAST_CHANNEL]: ["subscribe"],
      },
    });
    return ok(tokenRequest);
  } catch (err) {
    return errorResponse(err);
  }
}
