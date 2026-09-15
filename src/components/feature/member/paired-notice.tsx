import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
        <Badge variant="sky" className="h-auto gap-1 px-2.5 py-1">
          <Users />
          Paired
        </Badge>
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
