"use client";

import { useState } from "react";
import { mutate as globalMutate } from "swr";
import { toast } from "sonner";
import { Check, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { mutateApi } from "@/lib/client/fetcher";
import { useLoginRequests } from "@/lib/client/hooks";
import type { LoginRequestItem } from "@/types";

/** Members waiting to log in on a new device — shown above every admin page so a request is never
 * stuck behind a tab the admin isn't on. Renders nothing when there are none. */
export function LoginRequests() {
  const { data: requests } = useLoginRequests();
  if (!requests || requests.length === 0) return null;

  return (
    <section className="mb-4 space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 lg:mb-6">
      <div className="flex items-center gap-2 px-1">
        <ShieldCheck className="size-4 text-amber-700 dark:text-amber-400" />
        <h2 className="text-sm font-semibold">
          Login request{requests.length === 1 ? "" : "s"} ({requests.length})
        </h2>
      </div>
      <p className="px-1 text-xs text-muted-foreground">
        Approve only if you&apos;re sure it&apos;s them — if in doubt, ask the member which code their screen shows.
      </p>
      <ul className="space-y-2">
        {requests.map((r) => (
          <RequestRow key={r._id} request={r} />
        ))}
      </ul>
    </section>
  );
}

function RequestRow({ request }: { request: LoginRequestItem }) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  async function decide(action: "approve" | "reject") {
    setBusy(action);
    try {
      await mutateApi(`/api/devices/${request._id}`, "PATCH", { action });
      toast.success(action === "approve" ? `${request.personName} can now log in` : "Login request rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the request");
    } finally {
      await globalMutate("/api/devices/requests");
      setBusy(null);
    }
  }

  return (
    <li className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
      <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-muted">
        <span className="text-[10px] leading-none text-muted-foreground">code</span>
        <span className="text-base font-semibold tabular-nums">{request.code}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{request.personName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {request.label} · {timeAgo(request.createdAt)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          size="icon"
          variant="outline"
          className="size-9"
          onClick={() => decide("reject")}
          disabled={!!busy}
          aria-label={`Reject ${request.personName}'s login`}
        >
          {busy === "reject" ? <Spinner /> : <X className="size-4" />}
        </Button>
        <Button size="sm" className="h-9" onClick={() => decide("approve")} disabled={!!busy}>
          {busy === "approve" ? <Spinner /> : <Check className="size-4" />}
          Approve
        </Button>
      </div>
    </li>
  );
}

function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  return `${minutes} min ago`;
}
