import { CheckCircle2 } from "lucide-react";
import type { ConfirmedOrderItem } from "@/types";

export function OrderConfirmedNotice({ order, dateLabel }: { order: ConfirmedOrderItem; dateLabel: string }) {
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{dateLabel}</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" />
          Confirmed
        </span>
      </div>
      <p className="text-sm font-medium">
        {order.kind === "full"
          ? `Full${order.count > 1 ? ` ×${order.count}` : ""}${order.variant ? ` — ${order.variant}` : ""}`
          : `Half with ${order.partnerName}${order.variant ? ` — ${order.variant}` : ""}`}
      </p>
      <p className="text-sm text-muted-foreground">
        Your order has been confirmed by the admin. Please contact them for any changes.
      </p>
    </div>
  );
}
