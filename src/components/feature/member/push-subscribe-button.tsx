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
    navigator.serviceWorker.ready
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        if (!sub) return;
        // A browser-side subscription alone doesn't mean pushes arrive — the server may have
        // pruned it (a send came back 410 after permission was toggled off), or never saved it
        // (the original POST failed). If permission was revoked it's dead: drop it so the button
        // shows again. Otherwise re-send it on every load (an idempotent upsert) so the server
        // always has this device's current endpoint.
        if (Notification.permission !== "granted") {
          await sub.unsubscribe();
          return;
        }
        setSubscribed(true);
        await mutateApi("/api/member/push/subscribe", "POST", sub.toJSON());
      })
      .catch(() => {});
  }, []);

  async function enable() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notifications are blocked — allow them for this app in your phone's settings, then try again.");
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Push isn't configured");

      // Always start from a fresh subscription: a leftover one can be dead on the push
      // service's side, or tied to an old VAPID key (subscribe() would then throw).
      const reg = await navigator.serviceWorker.ready;
      const old = await reg.pushManager.getSubscription();
      if (old) await old.unsubscribe();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await mutateApi("/api/member/push/subscribe", "POST", { ...sub.toJSON(), replaces: old?.endpoint });
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
