"use client";

import { useState } from "react";
import { toast } from "sonner";
import { mutate as globalMutate } from "swr";
import { Reply, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/feature/states";
import { useReports } from "@/lib/client/hooks";
import { mutateApi } from "@/lib/client/fetcher";
import { formatDateTime } from "@/lib/format";

export function ReportsList() {
  const { data: reports, isLoading, error, mutate } = useReports();
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  async function dismiss(id: string) {
    try {
      await mutateApi(`/api/reports/${id}`, "DELETE");
      await globalMutate("/api/reports");
      toast.success("Report dismissed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not dismiss report");
    }
  }

  function startReply(id: string) {
    setReplyingId(id);
    setReplyText("");
  }

  async function sendReply(id: string) {
    const message = replyText.trim();
    if (!message) return;
    setSending(true);
    try {
      await mutateApi(`/api/reports/${id}/reply`, "POST", { message });
      await globalMutate("/api/reports");
      toast.success("Reply sent");
      setReplyingId(null);
      setReplyText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reply");
    } finally {
      setSending(false);
    }
  }

  if (isLoading) return <ListSkeleton rows={3} />;
  if (error) return <ErrorState message="Could not load reports." onRetry={() => mutate()} />;
  if (!reports || reports.length === 0) {
    return <EmptyState title="No reports" hint="Issues members send in will show up here." />;
  }

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <div key={r._id} className="space-y-3 rounded-xl border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{r.personName}</span>
                <span className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{r.message}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-primary"
                onClick={() => (replyingId === r._id ? setReplyingId(null) : startReply(r._id))}
                aria-label={`Reply to ${r.personName}`}
              >
                <Reply className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                onClick={() => dismiss(r._id)}
                aria-label={`Dismiss report from ${r.personName}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>

          {replyingId === r._id && (
            <div className="space-y-2 border-t pt-3">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${r.personName}…`}
                maxLength={500}
                rows={2}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setReplyingId(null)} disabled={sending}>
                  Cancel
                </Button>
                <Button size="sm" onClick={() => sendReply(r._id)} disabled={sending || !replyText.trim()}>
                  {sending && <Spinner />}
                  {sending ? "Sending…" : "Send reply"}
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
