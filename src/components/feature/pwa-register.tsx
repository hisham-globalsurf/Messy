"use client";

import { useEffect } from "react";

/** Registers the offline-fallback service worker. Renders nothing. */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Best-effort — the app works fully without a service worker.
    });
  }, []);

  return null;
}
