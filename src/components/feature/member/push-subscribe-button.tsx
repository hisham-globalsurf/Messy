"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { mutateApi } from "@/lib/client/fetcher";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
  return bytes;
}

type SaveMode = "sync" | "enable" | "replace";

function saveSubscription(sub: PushSubscription, mode: SaveMode, replaces?: string) {
  return mutateApi<{ saved: boolean }>("/api/member/push/subscribe", "POST", { ...sub.toJSON(), mode, replaces });
}

/** Drops whatever subscription this browser holds and makes a brand-new one. A leftover one can
 * be dead on the push service's side, or tied to an old VAPID key (subscribe() would throw).
 * Retries because Chrome intermittently rejects a subscribe() made right after an unsubscribe()
 * or while a freshly deployed service worker is still activating ("Registration failed"). */
async function freshSubscription(reg: ServiceWorkerRegistration): Promise<PushSubscription> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error("Push isn't configured");

  const old = await reg.pushManager.getSubscription();
  if (old) await old.unsubscribe().catch(() => {});

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1000 * attempt));
    try {
      return await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

/** Explicit opt-in button — never auto-prompt Notification.requestPermission() on load,
 * several browsers require the prompt to originate from a user gesture anyway. */
export function PushSubscribeButton() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || typeof window === "undefined" || !("PushManager" in window)) return;
    // Feature-detecting browser globals — not knowable during SSR render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(true);

    // A subscription existing in this browser doesn't mean pushes arrive — the server may have
    // pruned it after the push service rejected it, or never saved it. Check with the server on
    // every load and self-heal: known → refreshed; unknown → resubscribe fresh and register that.
    // Never unsubscribes on a permission read alone — that proved unreliable and killed live
    // subscriptions; without permission we simply show the button.
    if (Notification.permission !== "granted") return;
    navigator.serviceWorker.ready
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        if (!sub) return;
        setSubscribed(true);
        const { saved } = await saveSubscription(sub, "sync");
        if (saved) return;
        const fresh = await freshSubscription(reg);
        await saveSubscription(fresh, "replace", sub.endpoint);
      })
      .catch(() => setSubscribed(false));
  }, []);

  async function enable() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notifications are blocked — allow them for this app in your phone's settings, then try again.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await freshSubscription(reg);
      // The server makes this device the member's only subscription and sends a confirmation
      // push to it — a rejection here means delivery genuinely doesn't work on this device.
      await saveSubscription(sub, "enable");
      setSubscribed(true);
      toast.success("Notifications enabled");
    } catch (err) {
      // Ordering still works fully without push — but say so instead of failing silently.
      toast.error(err instanceof Error ? err.message : "Could not enable notifications");
    } finally {
      setLoading(false);
    }
  }

  if (!supported || subscribed) return null;

  return (
    <Button variant="outline" size="sm" onClick={enable} disabled={loading} className="gap-1.5">
      {loading ? <Spinner /> : <Bell className="size-4" />}
      Enable notifications
    </Button>
  );
}
