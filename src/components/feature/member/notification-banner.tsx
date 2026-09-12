"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useLatestNotification } from "@/lib/client/hooks";

const STORAGE_KEY = "messy-last-seen-notification";

/** Shows the latest admin announcement until dismissed. Dismissal is per-device
 * (localStorage), not per-person — simplest option, no read-tracking collection needed. */
export function NotificationBanner() {
  const { data: notification } = useLatestNotification();
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      // localStorage isn't available during SSR render — can only be read after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissedId(localStorage.getItem(STORAGE_KEY));
    } catch {
      // best-effort — banner just won't remember dismissal in this browser
    }
  }, []);

  if (!notification || notification._id === dismissedId) return null;

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, notification!._id);
    } catch {
      // ignore
    }
    setDismissedId(notification!._id);
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border bg-primary/5 px-3 py-2.5 text-sm">
      <p className="flex-1">{notification.message}</p>
      <button
        type="button"
        onClick={dismiss}
        className="cursor-pointer text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
