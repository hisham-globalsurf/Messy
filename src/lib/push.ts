import "server-only";
import webpush from "web-push";
import { PushSubscriptionModel } from "@/models/PushSubscription";
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
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          body,
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) toPrune.push(sub._id);
      }
    }),
  );

  if (toPrune.length > 0) {
    await PushSubscriptionModel.deleteMany({ _id: { $in: toPrune } });
  }
  return { sent, pruned: toPrune.length };
}

export async function sendPushToPerson(personId: string, payload: PushPayload) {
  const subs = await PushSubscriptionModel.find({ personId }).lean();
  return sendToSubscriptions(subs, payload);
}

export async function sendPushToAll(payload: PushPayload) {
  const subs = await PushSubscriptionModel.find().lean();
  return sendToSubscriptions(subs, payload);
}
