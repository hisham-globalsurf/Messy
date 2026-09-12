"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
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
        setSubscribed(!!sub);
      })
      .catch(() => {});
  }, []);

  async function enable() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Push isn't configured");

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await mutateApi("/api/member/push/subscribe", "POST", sub.toJSON());
      setSubscribed(true);
    } catch {
      // best-effort — ordering still works fully without push enabled
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
