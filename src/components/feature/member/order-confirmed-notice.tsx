import { CheckCircle2, UtensilsCrossed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatOrderSummary } from "@/lib/format";
import type { ConfirmedOrderItem } from "@/types";

interface Props {
  order: ConfirmedOrderItem;
  dateLabel: string;
  /** Kitchen-timing stage from {@link import("@/lib/cutoff").postCutoffOrderStage}, computed
   * from `orderConfirmedUntilTime` — swaps the pill to "Delivered" once the confirmed window
   * has passed, for the rest of the day. Omit entirely (e.g. for tomorrow's order, where this
   * same-day window doesn't apply) to always show "Confirmed". */
  stage?: "confirmed" | "delivered";
}

export function OrderConfirmedNotice({ order, dateLabel, stage }: Props) {
  const delivered = stage === "delivered";
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{dateLabel}</h2>
        {delivered ? (
          <Badge variant="info" className="h-auto gap-1 px-2.5 py-1">
            <UtensilsCrossed />
            Delivered
          </Badge>
        ) : (
          <Badge variant="success" className="h-auto gap-1 px-2.5 py-1">
            <CheckCircle2 />
            Confirmed
          </Badge>
        )}
      </div>
      <p className="text-sm font-medium">{formatOrderSummary(order)}</p>
    </div>
  );
}
