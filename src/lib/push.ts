import "server-only";
import webpush from "web-push";
import { PushSubscriptionModel } from "@/models/PushSubscription";
import { PersonModel } from "@/models/Person";
import type { Types } from "mongoose";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID keys are not set — push notifications are unavailable.");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/** Sends to every subscription, pruning any that come back expired/gone (404/410). */
async function sendToSubscriptions(
  subs: { _id: Types.ObjectId; endpoint: string; keys: { p256dh: string; auth: string } }[],
  payload: PushPayload,
): Promise<{ sent: number; pruned: number }> {
  ensureConfigured();
  const body = JSON.stringify(payload);
  let sent = 0;
  const toPrune: Types.ObjectId[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        // urgency "high": Android (FCM) otherwise treats pushes as normal priority and can hold
        // them while the phone dozes, so order reminders showed up late or not at all.
        // TTL: the push service keeps retrying an offline device for a day, then drops it —
        // a stale "order now" reminder is worse than none.
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, body, {
          urgency: "high",
          TTL: 24 * 60 * 60,
        });
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          toPrune.push(sub._id);
        } else {
          // Anything else (bad VAPID config, network error, malformed payload) was
          // previously swallowed here with zero visibility — log it instead.
          console.error(`Push send failed for subscription ${sub._id.toString()}:`, status, err);
        }
      }
    }),
  );

  if (toPrune.length > 0) {
    await PushSubscriptionModel.deleteMany({ _id: { $in: toPrune } });
  }
  return { sent, pruned: toPrune.length };
}

/** Blocked members can't use the app, and deleted ones no longer exist — neither should keep
 * getting pushes on a device that subscribed back when they could. */
const ACTIVE_PERSON = { blocked: { $ne: true } };

export async function sendPushToPerson(personId: string, payload: PushPayload) {
  const person = await PersonModel.exists({ _id: personId, ...ACTIVE_PERSON });
  if (!person) return { sent: 0, pruned: 0 };
  const subs = await PushSubscriptionModel.find({ personId }).lean();
  return sendToSubscriptions(subs, payload);
}

/** One specific device — used to confirm a subscription actually delivers right after it's saved. */
export async function sendPushToEndpoint(endpoint: string, payload: PushPayload) {
  const subs = await PushSubscriptionModel.find({ endpoint }).lean();
  return sendToSubscriptions(subs, payload);
}

export async function sendPushToAll(payload: PushPayload) {
  const active = await PersonModel.find(ACTIVE_PERSON, { _id: 1 }).lean();
  const subs = await PushSubscriptionModel.find({ personId: { $in: active.map((p) => p._id) } }).lean();
  return sendToSubscriptions(subs, payload);
}
