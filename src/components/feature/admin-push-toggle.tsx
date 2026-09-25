"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { adminPushEnabledHere, adminPushSupported, disableAdminPush, enableAdminPush } from "@/lib/client/adminPush";

/** Per-device switch for admin notifications (the after-cutoff supplier push). */
export function AdminPushToggle() {
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Browser capabilities and this device's opt-in aren't knowable during SSR render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(adminPushSupported());
    setEnabled(adminPushEnabledHere());
  }, []);

  async function toggle(next: boolean) {
    setBusy(true);
    try {
      if (next) {
        await enableAdminPush();
        toast.success("Notifications on for this device");
      } else {
        await disableAdminPush();
        toast.success("Notifications off for this device");
      }
      setEnabled(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update notifications");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground">
        This browser can&apos;t receive notifications. On iPhone, add Messy to your Home Screen and open it from there.
      </p>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor="admin-push" className="text-sm font-normal">
        Notifications on this device
      </Label>
      <div className="flex items-center gap-2">
        {busy && <Spinner />}
        <Switch id="admin-push" checked={enabled} onCheckedChange={toggle} disabled={busy} />
      </div>
    </div>
  );
}
