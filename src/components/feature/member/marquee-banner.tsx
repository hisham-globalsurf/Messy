"use client";

import { useEffect, useState } from "react";
import { isIos, isStandalone } from "@/lib/pwa";

const DEFAULT_MESSAGE =
  "For a better experience and to get order reminders, add this app to your Home Screen.";
const IOS_MESSAGE =
  'For a better experience and to get order reminders, tap Share, then "Add to Home Screen".';

/** Pure-CSS infinite ticker nudging members to install the PWA (required for push on iOS). */
export function MarqueeBanner() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isStandalone()) return; // already installed — nothing to nudge toward
    // Client-only browser check (window/navigator) — can't be computed during SSR render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessage(isIos() ? IOS_MESSAGE : DEFAULT_MESSAGE);
  }, []);

  if (!message) return null;

  return (
    <div className="overflow-hidden rounded-lg border bg-primary/5 py-2">
      <div className="flex w-max animate-marquee whitespace-nowrap text-sm font-medium text-primary">
        <span className="pr-12">{message}</span>
        <span className="pr-12" aria-hidden="true">
          {message}
        </span>
      </div>
    </div>
  );
}
