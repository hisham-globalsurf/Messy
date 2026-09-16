"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bell, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PersonMultiSelect } from "@/components/feature/person-multi-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { fetcher, mutateApi } from "@/lib/client/fetcher";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendNotificationDialog({ open, onOpenChange }: Props) {
  const [message, setMessage] = useState("");
  const [inApp, setInApp] = useState(false);
  const [push, setPush] = useState(false);
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [loadingUnordered, setLoadingUnordered] = useState(false);

  async function selectWithoutOrder() {
    setLoadingUnordered(true);
    try {
      const { personIds } = await fetcher<{ personIds: string[] }>("/api/persons/without-order");
      setRecipientIds(personIds);
      toast.success(
        personIds.length > 0
          ? `${personIds.length} member${personIds.length === 1 ? "" : "s"} without an order today`
          : "Everyone has ordered today",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load members without an order");
    } finally {
      setLoadingUnordered(false);
    }
  }

  async function send() {
    setSending(true);
    try {
      const result = await mutateApi<{ delivered: number }>("/api/notifications", "POST", {
        message,
        inApp,
        push,
        personIds: recipientIds,
      });
      toast.success(
        push ? `Sent — ${result.delivered} device${result.delivered === 1 ? "" : "s"} notified` : "Sent",
      );
      setMessage("");
      setRecipientIds([]);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send notification");
    } finally {
      setSending(false);
    }
  }

  async function clearAll() {
    setClearing(true);
    try {
      const result = await mutateApi<{ deletedCount: number }>("/api/notifications", "DELETE");
      toast.success(
        result.deletedCount > 0
          ? `Cleared ${result.deletedCount} notification${result.deletedCount === 1 ? "" : "s"}`
          : "Nothing to clear",
      );
      setConfirmingClear(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not clear notifications");
    } finally {
      setClearing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a notification</DialogTitle>
          <DialogDescription>Choose how members should receive this message.</DialogDescription>
        </DialogHeader>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. Ordering closes 30 minutes early today"
          maxLength={500}
          rows={4}
          autoFocus
        />
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5">
            <Label htmlFor="notify-inapp" className="flex items-center gap-2 text-sm font-normal">
              <Bell className="size-4 text-muted-foreground" />
              In-app notification
            </Label>
            <Switch id="notify-inapp" checked={inApp} onCheckedChange={setInApp} />
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5">
            <Label htmlFor="notify-push" className="flex items-center gap-2 text-sm font-normal">
              <Smartphone className="size-4 text-muted-foreground" />
              Push notification
            </Label>
            <Switch id="notify-push" checked={push} onCheckedChange={setPush} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-normal text-muted-foreground">Recipients</Label>
            <PersonMultiSelect selectedIds={recipientIds} onChange={setRecipientIds} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectWithoutOrder}
              disabled={loadingUnordered}
            >
              {loadingUnordered && <Spinner />}
              {loadingUnordered ? "Checking…" : "Non-ordered Users"}
            </Button>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmingClear(true)}
          >
            <Trash2 className="size-4" />
            Clear all
          </Button>
          <Button onClick={send} disabled={sending || !message.trim() || (!inApp && !push)}>
            {sending && <Spinner />}
            {sending
              ? "Sending…"
              : recipientIds.length > 0
                ? `Send to ${recipientIds.length} member${recipientIds.length === 1 ? "" : "s"}`
                : "Send to all members"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={confirmingClear} onOpenChange={setConfirmingClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes every in-app notification for all members right now. They&apos;ll still
              auto-expire after 2 days on their own — this just clears them immediately. This can&apos;t be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearAll} disabled={clearing}>
              {clearing && <Spinner />}
              {clearing ? "Clearing…" : "Clear all"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
