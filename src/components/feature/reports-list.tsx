"use client";

import { toast } from "sonner";
import { mutate as globalMutate } from "swr";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/feature/states";
import { useReports } from "@/lib/client/hooks";
import { mutateApi } from "@/lib/client/fetcher";
import { formatDateTime } from "@/lib/format";

export function ReportsList() {
  const { data: reports, isLoading, error, mutate } = useReports();

  async function dismiss(id: string) {
    try {
      await mutateApi(`/api/reports/${id}`, "DELETE");
      await globalMutate("/api/reports");
      toast.success("Report dismissed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not dismiss report");
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
        <div key={r._id} className="flex items-start justify-between gap-3 rounded-xl border p-4">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{r.personName}</span>
              <span className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{r.message}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => dismiss(r._id)}
            aria-label={`Dismiss report from ${r.personName}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
