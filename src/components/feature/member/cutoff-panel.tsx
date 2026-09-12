"use client";

import { Button } from "@/components/ui/button";

interface Props {
  showTomorrowButton: boolean;
  onOrderTomorrow: () => void;
}

export function CutoffPanel({ showTomorrowButton, onOrderTomorrow }: Props) {
  return (
    <div className="space-y-4 rounded-xl border border-dashed p-6 text-center">
      <p className="font-medium">Today&apos;s ordering window has closed.</p>
      <p className="text-sm text-muted-foreground">Please contact the admin for anything urgent.</p>
      {showTomorrowButton && <Button onClick={onOrderTomorrow}>Order for tomorrow</Button>}
    </div>
  );
}
