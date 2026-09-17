"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { MarqueeBanner } from "@/components/feature/member/marquee-banner";
import { mutateApi } from "@/lib/client/fetcher";

export default function MemberLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await mutateApi("/api/member/login", "POST", { phone });
      router.replace("/order");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <div className="w-full max-w-sm">
        <MarqueeBanner />
      </div>
      <Card className="w-full max-w-sm">
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
      </Card>
    </main>
  );
}
