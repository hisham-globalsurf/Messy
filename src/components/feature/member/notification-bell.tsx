"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNotifications } from "@/lib/client/hooks";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "messy-notifications-last-read";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Per-device unread tracking (localStorage timestamp), same simplicity precedent as the
 * rest of this app's device-local state — no server-side read-tracking collection needed. */
export function NotificationBell() {
  const { data: notifications = [] } = useNotifications();
  const [open, setOpen] = useState(false);
  const [lastRead, setLastRead] = useState(0);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastRead(v ? Number(v) : 0);
    } catch {
      // best-effort — unread state just won't persist in this browser
    }
  }, []);

  const unreadCount = notifications.filter((n) => new Date(n.createdAt).getTime() > lastRead).length;

  function markAllRead() {
    const latest = notifications[0] ? new Date(notifications[0].createdAt).getTime() : Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, String(latest));
    } catch {
      // ignore
    }
    setLastRead(latest);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label="Notifications"
        onClick={() => setOpen(true)}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mx-auto flex max-h-[80vh] max-w-lg flex-col overflow-hidden rounded-t-2xl">
          <SheetHeader>
            <div className="flex items-center justify-between gap-2">
              <SheetTitle>Notifications</SheetTitle>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="cursor-pointer pr-8 text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            {notifications.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              <ul className="divide-y">
                {notifications.map((n) => {
                  const unread = new Date(n.createdAt).getTime() > lastRead;
                  return (
                    <li key={n._id} className="flex items-start gap-2 py-3">
                      <span
                        className={cn(
                          "mt-1.5 size-1.5 shrink-0 rounded-full",
                          unread ? "bg-primary" : "bg-transparent",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        {n.kind === "reply" && (
                          <span className="mb-1 inline-flex w-fit items-center rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-400">
                            Admin reply
                          </span>
                        )}
                        <p className="text-sm">{n.message}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{formatWhen(n.createdAt)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
