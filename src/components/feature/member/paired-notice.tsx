import { Users } from "lucide-react";

export function PairedNotice({
  partnerName,
  dateLabel,
  isTomorrow,
}: {
  partnerName: string;
  dateLabel: string;
  isTomorrow: boolean;
}) {
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{dateLabel}</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-700 dark:text-sky-400">
          <Users className="size-3.5" />
          Paired
        </span>
      </div>
      <p className="text-sm font-medium">
        You&apos;re paired for a meal {isTomorrow ? "tomorrow" : "today"} with {partnerName}.
      </p>
      <p className="text-sm text-muted-foreground">
        {partnerName} set this up as a half order. Ask them if you need it changed.
      </p>
    </div>
  );
}
