import { CalendarOff } from "lucide-react";
import { formatDate } from "@/lib/format";

export function MessClosedNotice({
  from,
  to,
  message,
}: {
  /** Null for a recurring closure (e.g. weekends) that has no specific date range. */
  from: string | null;
  to: string | null;
  message: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
        <CalendarOff className="size-5" />
      </div>
      <p className="font-medium">Mess is not available</p>
      {from && to && (
        <p className="text-sm text-muted-foreground">
          {formatDate(from)} – {formatDate(to)}
        </p>
      )}
      {message && <p className="max-w-xs text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
