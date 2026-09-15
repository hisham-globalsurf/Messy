import { CheckCircle2, UtensilsCrossed } from "lucide-react";
import type { ConfirmedOrderItem } from "@/types";

interface Props {
  order: ConfirmedOrderItem;
  dateLabel: string;
  /** Kitchen-timing stage from {@link import("@/lib/cutoff").postCutoffOrderStage}, computed
   * from `orderConfirmedUntilTime`/`orderDeliveredUntilTime` — swaps the pill to "Delivered"
   * once the confirmed window has passed. `null` (both windows passed) is treated the same as
   * "delivered" since that's the last real stage; omit entirely (e.g. for tomorrow's order,
   * where these same-day windows don't apply) to always show "Confirmed". */
  stage?: "confirmed" | "delivered" | null;
}

export function OrderConfirmedNotice({ order, dateLabel, stage }: Props) {
  const delivered = stage === "delivered" || stage === null;
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{dateLabel}</h2>
        {delivered ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-400">
            <UtensilsCrossed className="size-3.5" />
            Delivered
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            Confirmed
          </span>
        )}
      </div>
      <p className="text-sm font-medium">
        {order.kind === "full"
          ? `Full${order.count > 1 ? ` ×${order.count}` : ""}${order.variant ? ` — ${order.variant}` : ""}`
          : `Half with ${order.partnerName}${order.variant ? ` — ${order.variant}` : ""}`}
      </p>
    </div>
  );
}
