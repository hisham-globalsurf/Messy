import { CalendarOff } from "lucide-react";
import { formatDate } from "@/lib/format";

export function MessClosedNotice({
  from,
  to,
  message,
  dateLabel,
}: {
  /** Null for a recurring closure (e.g. weekends) that has no specific date range. */
  from: string | null;
  to: string | null;
  message: string;
  /** Set for an upcoming closure ("Tomorrow") shown as a card beneath the day's order cards,
   * instead of the full-page notice used when the mess is closed today. */
  dateLabel?: string;
}) {
  const range = from && to && (
    <p className="text-sm text-muted-foreground">
      {from === to ? formatDate(from) : `${formatDate(from)} – ${formatDate(to)}`}
    </p>
  );

  if (dateLabel) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400">
          <CalendarOff className="size-4" />
        </div>
        <div className="space-y-0.5">
          <p className="font-medium">{dateLabel}: mess is not available</p>
          {range}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
        <CalendarOff className="size-5" />
      </div>
      <p className="font-medium">Mess is not available</p>
      {range}
      {message && <p className="max-w-xs text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
