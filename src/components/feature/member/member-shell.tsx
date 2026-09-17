"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Settings as SettingsIcon, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberSessionProvider } from "@/components/feature/member/member-session-context";
import { HistorySheet } from "@/components/feature/member/history-sheet";
import { NotificationBell } from "@/components/feature/member/notification-bell";
import { useMemberSettings } from "@/lib/client/hooks";
import { useMemberRealtime } from "@/lib/client/useMemberRealtime";

export function MemberShell({
  name,
  personId,
  children,
}: {
  name: string;
  personId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isSettingsPage = pathname === "/order/settings";
  const { data: settings } = useMemberSettings();
  const [historyOpen, setHistoryOpen] = useState(false);

  // Live order/notification updates while this tab is open (e.g. admin accepts the order while
  // the member is looking at it) — see useMemberRealtime for the Ably wiring and the
  // revalidate-on-focus fallback it relies on if Ably is unreachable.
  useMemberRealtime(personId);

  return (
    <MemberSessionProvider name={name} personId={personId}>
      <div className="flex min-h-full flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-lg items-center gap-3 px-4">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <UtensilsCrossed className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">{settings?.messName ?? "Messy"}</p>
              <p className="truncate text-xs leading-tight text-muted-foreground">{name}</p>
            </div>
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" aria-label="View current period" onClick={() => setHistoryOpen(true)}>
                <CalendarDays className="size-4" />
              </Button>
              <NotificationBell />
              <Button asChild variant="ghost" size="icon" aria-label={isSettingsPage ? "Back to order" : "Settings"}>
                <Link href={isSettingsPage ? "/order" : "/order/settings"}>
                  {isSettingsPage ? <Home className="size-4" /> : <SettingsIcon className="size-4" />}
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-10 pt-5">{children}</main>

        <HistorySheet open={historyOpen} onOpenChange={setHistoryOpen} currency={settings?.currency ?? "₹"} />
      </div>
    </MemberSessionProvider>
  );
}
