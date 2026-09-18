"use client";

import { CheckCircle2, Clock, UtensilsCrossed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  showTomorrowButton: boolean;
  onOrderTomorrow: () => void;
  /** Button text — "Order for tomorrow" normally, or "Order for <weekday>" when a weekend/
   * holiday closure pushes the next orderable date past tomorrow. */
  orderButtonLabel: string;
  /** Present when the member has an order in for today — swaps the generic "closed" message
   * for a confirmed/delivered status, per {@link import("@/lib/cutoff").postCutoffOrderStage}. */
  orderStage?: "confirmed" | "delivered" | null;
}

export function CutoffPanel({ showTomorrowButton, onOrderTomorrow, orderButtonLabel, orderStage }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-6 text-center">
      {orderStage === "confirmed" ? (
        <Badge variant="success" className="h-auto gap-1.5 px-3 py-1.5 text-sm">
          <CheckCircle2 />
          Today&apos;s order confirmed
        </Badge>
      ) : orderStage === "delivered" ? (
        <Badge variant="info" className="h-auto gap-1.5 px-3 py-1.5 text-sm">
          <UtensilsCrossed />
          Today&apos;s order delivered
        </Badge>
      ) : (
        <>
          <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
            <Clock className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Today&apos;s ordering window has closed.</p>
            <p className="text-sm text-muted-foreground">Please contact the admin for anything urgent.</p>
          </div>
        </>
      )}
      {showTomorrowButton && (
        <Button onClick={onOrderTomorrow} className="hidden sm:inline-flex">
          {orderButtonLabel}
        </Button>
      )}
    </div>
  );
}
