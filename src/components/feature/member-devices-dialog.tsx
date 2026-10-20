"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { LogOut, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState, ListSkeleton } from "@/components/feature/states";
import { fetcher, mutateApi } from "@/lib/client/fetcher";
import { formatDate } from "@/lib/format";
import type { MemberDevicesResponse } from "@/types";

/** The devices a member is logged in on, with per-device and everywhere logout. */
export function MemberDevicesDialog({
  personId,
  personName,
  open,
  onOpenChange,
}: {
  personId: string;
  personName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const key = `/api/persons/${personId}/devices`;
  const { data, error, isLoading, mutate } = useSWR<MemberDevicesResponse>(open ? key : null, fetcher);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmingAll, setConfirmingAll] = useState(false);

  async function logoutDevice(deviceId: string) {
    setBusy(deviceId);
    try {
      await mutateApi(`/api/devices/${deviceId}`, "DELETE");
      toast.success("Device logged out");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log out device");
    } finally {
      await mutate();
      setBusy(null);
    }
  }

  async function logoutEverywhere() {
    setBusy("all");
    try {
      await mutateApi(key, "DELETE");
      toast.success(`${personName} is logged out everywhere`);
      setConfirmingAll(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log out");
    } finally {
      await mutate();
      setBusy(null);
    }
  }

  const hasAnySession = !!data && (data.devices.length > 0 || data.legacySessionsActive);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (busy) return;
        if (!v) setConfirmingAll(false);
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{personName}&apos;s devices</DialogTitle>
          <DialogDescription>
            Logging a device out means it needs your approval again to log back in.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <ListSkeleton rows={2} />
        ) : error || !data ? (
          <ErrorState message="Could not load devices" onRetry={() => mutate()} />
        ) : (
          <div className="space-y-3">
            {data.devices.length === 0 ? (
              <p className="py-2 text-center text-sm text-muted-foreground">No approved devices yet.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {data.devices.map((d) => (
                  <li key={d._id} className="flex items-center gap-3 px-3 py-2.5">
                    <Smartphone className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.label || "Unknown device"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        Approved {formatDate(d.createdAt)}
                        {d.lastSeenAt ? ` · last used ${formatDate(d.lastSeenAt)}` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => logoutDevice(d._id)}
                      disabled={!!busy}
                    >
                      {busy === d._id ? <Spinner /> : <LogOut className="size-4" />}
                      Log out
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {data.legacySessionsActive && (
              <p className="text-xs text-muted-foreground">
                Logins from before device approval was turned on aren&apos;t listed here. &quot;Log out
                everywhere&quot; ends those too.
              </p>
            )}

            {hasAnySession &&
              (confirmingAll ? (
                <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                  <p className="text-sm">
                    Log {personName} out of every device? They&apos;ll need your approval to log in again.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setConfirmingAll(false)} disabled={!!busy}>
                      Cancel
                    </Button>
                    <Button size="sm" variant="destructive" onClick={logoutEverywhere} disabled={!!busy}>
                      {busy === "all" && <Spinner />}
                      Log out everywhere
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => setConfirmingAll(true)}
                  disabled={!!busy}
                >
                  <LogOut className="size-4" />
                  Log out everywhere
                </Button>
              ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
