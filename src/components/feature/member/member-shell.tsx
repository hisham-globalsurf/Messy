"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, LogOut, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ThemeToggle } from "@/components/feature/theme-toggle";
import { MemberNameProvider } from "@/components/feature/member/member-session-context";
import { HistorySheet } from "@/components/feature/member/history-sheet";
import { NotificationBell } from "@/components/feature/member/notification-bell";
import { mutateApi } from "@/lib/client/fetcher";
import { useMemberSettings } from "@/lib/client/hooks";

export function MemberShell({ name, children }: { name: string; children: React.ReactNode }) {
  const router = useRouter();
  const { data: settings } = useMemberSettings();
  const [loggingOut, setLoggingOut] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await mutateApi("/api/member/logout", "POST");
      toast.success("Signed out");
      router.replace("/order/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out");
      setLoggingOut(false);
    }
  }

  return (
    <MemberNameProvider name={name}>
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
              <ThemeToggle />
              <Button variant="ghost" size="icon" aria-label="Sign out" onClick={logout} disabled={loggingOut}>
                {loggingOut ? <Spinner /> : <LogOut className="size-4" />}
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-10 pt-5">{children}</main>

        <HistorySheet open={historyOpen} onOpenChange={setHistoryOpen} currency={settings?.currency ?? "₹"} />
      </div>
    </MemberNameProvider>
  );
}
