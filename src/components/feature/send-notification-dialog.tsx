"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { mutateApi } from "@/lib/client/fetcher";

export function SendNotificationDialog() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    try {
      const result = await mutateApi<{ delivered: number }>("/api/notifications", "POST", { message });
      toast.success(`Sent — ${result.delivered} device${result.delivered === 1 ? "" : "s"} notified`);
      setMessage("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send notification");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Megaphone className="size-4" />
          Notify members
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a notification</DialogTitle>
          <DialogDescription>
            Delivered as a push notification and shown in-app on every member&apos;s order page.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. Ordering closes 30 minutes early today"
          maxLength={500}
          rows={4}
        />
        <DialogFooter>
          <Button onClick={send} disabled={sending || !message.trim()}>
            {sending && <Spinner />}
            {sending ? "Sending…" : "Send to all members"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
