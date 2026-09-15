"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { mutateApi } from "@/lib/client/fetcher";
import { useMemberRealtime } from "@/lib/client/useMemberRealtime";

export function BlockedScreen({ personId }: { personId: string }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  // If admin unblocks them while this screen is up, swap back to the normal app immediately —
  // see useMemberRealtime for the Ably wiring.
  useMemberRealtime(personId);

  async function signOut() {
    setLoggingOut(true);
    try {
      await mutateApi("/api/member/logout", "POST");
    } finally {
      router.replace("/order/login");
      router.refresh();
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
      <div className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <ShieldAlert className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">You&apos;ve been blocked by the admin</p>
        <p className="text-sm text-muted-foreground">Please contact them for help.</p>
      </div>
      <Button variant="outline" onClick={signOut} disabled={loggingOut}>
        {loggingOut && <Spinner />}
        Sign out
      </Button>
    </main>
  );
}
