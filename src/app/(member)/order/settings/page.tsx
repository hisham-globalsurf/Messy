"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Flag, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { ThemeToggle } from "@/components/feature/theme-toggle";
import { mutateApi } from "@/lib/client/fetcher";

export default function MemberSettingsPage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

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

  async function submitReport() {
    setSending(true);
    try {
      await mutateApi("/api/member/reports", "POST", { message: message.trim() });
      toast.success("Thanks — the admin will take a look");
      setMessage("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send report");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          asChild
          size="icon"
          aria-label="Back to order"
          className="rounded-full bg-primary/10 text-primary shadow-sm hover:bg-primary/15"
        >
          <Link href="/order">
            <ArrowLeft className="size-5 stroke-[2.5]" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Theme applies to this device.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm">Light / Dark / System</span>
          <ThemeToggle variant="outline" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <Flag className="size-4 text-muted-foreground" />
            Report an issue
          </CardTitle>
          <CardDescription>Tell the admin what&apos;s wrong — they&apos;ll see it right away.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your issue…"
            maxLength={1000}
            rows={4}
          />
          <Button onClick={submitReport} disabled={sending || !message.trim()}>
            {sending && <Spinner />}
            {sending ? "Submitting…" : "Submit"}
          </Button>
        </CardContent>
      </Card>

      <Button variant="destructive" className="w-full" onClick={logout} disabled={loggingOut}>
        {loggingOut ? <Spinner /> : <LogOut className="size-4" />}
        {loggingOut ? "Signing out…" : "Log out"}
      </Button>
    </div>
  );
}
