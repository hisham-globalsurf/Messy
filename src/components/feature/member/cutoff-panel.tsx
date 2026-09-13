"use client";

import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  showTomorrowButton: boolean;
  onOrderTomorrow: () => void;
}

export function CutoffPanel({ showTomorrowButton, onOrderTomorrow }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-6 text-center">
      <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
        <Clock className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">Today&apos;s ordering window has closed.</p>
        <p className="text-sm text-muted-foreground">Please contact the admin for anything urgent.</p>
      </div>
      {showTomorrowButton && <Button onClick={onOrderTomorrow}>Order for tomorrow</Button>}
    </div>
  );
}
