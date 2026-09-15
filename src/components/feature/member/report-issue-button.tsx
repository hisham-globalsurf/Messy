"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { mutateApi } from "@/lib/client/fetcher";

export function ReportIssueButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    setSending(true);
    try {
      await mutateApi("/api/member/reports", "POST", { message: message.trim() });
      toast.success("Thanks — the admin will take a look");
      setMessage("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send report");
    } finally {
      setSending(false);
    }
  }

  function cancel() {
    setMessage("");
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Report an issue"
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-40 flex size-11 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
      >
        <Flag className="size-5" />
      </button>

      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : cancel())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report an issue</DialogTitle>
            <DialogDescription>Tell the admin what&apos;s wrong — they&apos;ll see it right away.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your issue…"
            maxLength={1000}
            rows={4}
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={cancel} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={sending || !message.trim()}>
              {sending && <Spinner />}
              {sending ? "Submitting…" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
