"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { MarqueeBanner } from "@/components/feature/member/marquee-banner";
import { fetcher, mutateApi, RequestError } from "@/lib/client/fetcher";
import { isStandalone } from "@/lib/pwa";
import type { LoginRequestStatus } from "@/types";

const POLL_INTERVAL_MS = 3000;

type View =
  | { kind: "checking" }
  | { kind: "form" }
  | { kind: "waiting"; name: string; code: string };

export default function MemberLoginPage() {
  const router = useRouter();
  const [view, setView] = useState<View>({ kind: "checking" });
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checking = useRef(false);

  // Applies a status from the server: the approved case is the only one that leaves this page.
  const apply = useCallback(
    (result: LoginRequestStatus) => {
      switch (result.status) {
        case "approved":
          // Spinner while navigating — also stops the waiting poll, whose next answer ("none",
          // the pending cookie is gone) would otherwise flash the form back up.
          setView({ kind: "checking" });
          router.replace("/order");
          router.refresh();
          return;
        case "pending":
          setView({ kind: "waiting", name: result.name, code: result.code });
          return;
        case "rejected":
          setError("The admin declined this login. Please contact them if this was you.");
          setView({ kind: "form" });
          return;
        case "expired":
          setError("Your login request expired before the admin approved it. Please try again.");
          setView({ kind: "form" });
          return;
        case "none":
          setView({ kind: "form" });
      }
    },
    [router],
  );

  const checkStatus = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    try {
      apply(await fetcher<LoginRequestStatus>("/api/member/login/status"));
    } catch (err) {
      // A blocked member gets a real error back; a network blip just waits for the next poll.
      if (err instanceof RequestError && err.status === 403) {
        setError(err.message);
        setView({ kind: "form" });
      } else {
        setView((v) => (v.kind === "checking" ? { kind: "form" } : v));
      }
    } finally {
      checking.current = false;
    }
  }, [apply]);

  // Resumes a request already waiting in this browser — the member may have switched to WhatsApp
  // to message the admin, and the OS reloaded the page when they came back.
  useEffect(() => {
    // Async — state is only set once the server answers, not synchronously in this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkStatus();
  }, [checkStatus]);

  const waiting = view.kind === "waiting";
  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(checkStatus, POLL_INTERVAL_MS);
    function onVisible() {
      if (document.visibilityState === "visible") checkStatus();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [waiting, checkStatus]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await mutateApi<LoginRequestStatus>("/api/member/login", "POST", {
        phone,
        standalone: isStandalone(),
      });
      apply(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onCancel() {
    setCancelling(true);
    try {
      await mutateApi("/api/member/login/status", "DELETE");
    } catch {
      // Unanswered requests lapse on their own; the member can still start over.
    } finally {
      setCancelling(false);
      setError(null);
      setView({ kind: "form" });
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <div className="w-full max-w-sm">
        <MarqueeBanner />
      </div>
      <Card className="w-full max-w-sm">
        {view.kind === "checking" ? (
          <CardContent className="flex justify-center py-10">
            <Spinner />
          </CardContent>
        ) : view.kind === "waiting" ? (
          <>
            <CardHeader className="mb-6 flex flex-col items-center justify-center text-center">
              <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
                <ShieldCheck className="size-5" />
              </div>
              <CardTitle>Waiting for admin approval</CardTitle>
              <CardDescription>
                Hi {view.name}, the admin has been asked to approve this device. This page continues
                automatically once they do.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-1 rounded-xl border bg-muted/40 py-4">
                <span className="text-xs text-muted-foreground">Your code</span>
                <span className="text-3xl font-semibold tracking-widest tabular-nums">{view.code}</span>
                <span className="px-4 text-center text-xs text-muted-foreground">
                  The admin may ask for this code to confirm it&apos;s you.
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Spinner className="size-3.5" />
                Waiting…
              </div>
              <Button variant="outline" className="w-full" onClick={onCancel} disabled={cancelling}>
                {cancelling && <Spinner />}
                Cancel
              </Button>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="mb-6 flex flex-col items-center justify-center text-center">
              <div className="mb-2 flex size-11 animate-in items-center justify-center rounded-xl bg-primary text-primary-foreground zoom-in-50 fade-in duration-500 ease-out">
                <UtensilsCrossed className="size-5" />
              </div>
              <CardTitle>Order your meal</CardTitle>
              <CardDescription>Enter your WhatsApp number to continue</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="e.g. 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                {error && (
                  <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Spinner />}
                  {loading ? "Checking…" : "Continue"}
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </main>
  );
}
