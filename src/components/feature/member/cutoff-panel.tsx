"use client";

import { CheckCircle2, Clock, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  showTomorrowButton: boolean;
  onOrderTomorrow: () => void;
  /** Present when the member has an order in for today — swaps the generic "closed" message
   * for a confirmed/delivered status, per {@link import("@/lib/cutoff").postCutoffOrderStage}. */
  orderStage?: "confirmed" | "delivered" | null;
}

export function CutoffPanel({ showTomorrowButton, onOrderTomorrow, orderStage }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-6 text-center">
      {orderStage === "confirmed" ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-4" />
          Today&apos;s order confirmed
        </span>
      ) : orderStage === "delivered" ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-400">
          <UtensilsCrossed className="size-4" />
          Today&apos;s order delivered
        </span>
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
      {showTomorrowButton && <Button onClick={onOrderTomorrow}>Order for tomorrow</Button>}
    </div>
  );
}
