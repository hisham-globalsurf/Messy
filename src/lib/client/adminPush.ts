"use client";

import { mutateApi } from "@/lib/client/fetcher";
import { vapidApplicationServerKey } from "@/lib/client/vapidKey";

/** The admin and member apps share one origin and service worker, so a browser holds a single
 * push subscription both use. The admin side therefore never unsubscribes or replaces it (that
 * would silently kill the member's pushes on the same phone) — it reuses whatever exists, and
 * remembers which endpoint it registered so it can follow along when the member side rotates it. */

const STORAGE_KEY = "messy-admin-push-endpoint";

function storedEndpoint(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeEndpoint(endpoint: string | null) {
  try {
    if (endpoint) localStorage.setItem(STORAGE_KEY, endpoint);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked — the next page-load sync just can't self-heal; pushes still work.
  }
}

export function adminPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export function adminPushEnabledHere(): boolean {
  return storedEndpoint() !== null && typeof Notification !== "undefined" && Notification.permission === "granted";
}

async function currentOrNewSubscription(): Promise<PushSubscription> {
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidApplicationServerKey() });
}

export async function enableAdminPush(): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notifications are blocked — allow them for this app in your phone's settings, then try again.");
  }
  const sub = await currentOrNewSubscription();
  // The server sends a confirmation push; a rejection means delivery doesn't work on this device.
  await mutateApi("/api/push/subscribe", "POST", { ...sub.toJSON(), mode: "enable", replaces: storedEndpoint() ?? undefined });
  storeEndpoint(sub.endpoint);
}

export async function disableAdminPush(): Promise<void> {
  const endpoint = storedEndpoint();
  if (endpoint) await mutateApi("/api/push/subscribe", "DELETE", { endpoint });
  storeEndpoint(null);
}

/** Self-heal on a device the admin switched on (no-op otherwise): re-registers the browser's
 * current subscription (recreating it if the member app dropped it) in place of the one saved
 * before. Run on admin page load, and by the member app right after it replaces the subscription
 * — that request only succeeds when the admin is signed in on this browser too. */
export async function syncAdminPush(): Promise<void> {
  if (!adminPushSupported() || !adminPushEnabledHere()) return;
  const previous = storedEndpoint();
  const sub = await currentOrNewSubscription();
  await mutateApi("/api/push/subscribe", "POST", {
    ...sub.toJSON(),
    mode: "sync",
    replaces: previous && previous !== sub.endpoint ? previous : undefined,
  });
  storeEndpoint(sub.endpoint);
}
