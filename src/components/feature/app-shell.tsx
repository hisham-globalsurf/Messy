"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  HandCoins,
  ListOrdered,
  LogOut,
  Megaphone,
  Users,
  Settings as SettingsIcon,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ThemeToggle } from "@/components/feature/theme-toggle";
import { SendNotificationDialog } from "@/components/feature/send-notification-dialog";
import { mutateApi } from "@/lib/client/fetcher";
import { useSettings } from "@/lib/client/hooks";
import { useAdminRealtime } from "@/lib/client/useAdminRealtime";
import { disableAdminPush, syncAdminPush } from "@/lib/client/adminPush";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Entries", icon: CalendarDays },
  { href: "/queue", label: "Queue", icon: ListOrdered },
  { href: "/settlements", label: "Settlements", icon: HandCoins },
  { href: "/persons", label: "People", icon: Users },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: settings } = useSettings();
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);

  // Live report submissions while any admin page is open — see useAdminRealtime for the Ably
  // wiring and the plain-fetch fallback it relies on when navigating to the Reports tab directly.
  useAdminRealtime();

  // Keeps this device's admin notifications registered on the browser's live subscription.
  useEffect(() => {
    syncAdminPush().catch(() => {});
  }, []);

  async function logout() {
    setLoggingOut(true);
    try {
      // A signed-out device shouldn't keep getting the supplier push. Best-effort.
      await disableAdminPush().catch(() => {});
      await mutateApi("/api/auth/logout", "POST");
      toast.success("Signed out");
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out");
      setLoggingOut(false);
    }
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4 sm:px-6 lg:h-16 lg:max-w-4xl lg:px-8 2xl:max-w-5xl">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <UtensilsCrossed className="size-4" />
            </span>
            <span className="truncate">{settings?.messName ?? "Messy"}</span>
          </Link>
          <nav className="ml-4 hidden items-center gap-1 sm:flex">
            {NAV.map(({ href, label }) => (
              <Button key={href} asChild variant={isActive(href) ? "secondary" : "ghost"} size="sm">
                <Link href={href}>{label}</Link>
              </Button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Notify members" onClick={() => setNotifyOpen(true)}>
              <Megaphone className="size-4" />
            </Button>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={logout}
              disabled={loggingOut}
            >
              {loggingOut ? <Spinner /> : <LogOut className="size-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pb-14 lg:max-w-4xl lg:px-8 lg:pt-8 2xl:max-w-5xl">
        {children}
      </main>

      <SendNotificationDialog open={notifyOpen} onOpenChange={setNotifyOpen} />

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-3xl pb-[env(safe-area-inset-bottom)]">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs",
                isActive(href) ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
