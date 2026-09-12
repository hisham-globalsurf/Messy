"use client";

import { useEffect, useState } from "react";
import { minutesUntilCutoffToday } from "@/lib/cutoff";

function format(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m left` : `${mins} min left`;
}

/** Small live countdown to today's ordering cutoff, in the same amber "warning" tone used
 * elsewhere in the app (e.g. the Outstanding stat card, partially-paid badges). Only shows
 * once `reminderMinutes` or fewer remain — admin-configurable in Settings. */
export function CountdownBadge({ cutoffTime, reminderMinutes }: { cutoffTime: string; reminderMinutes: number }) {
  const [minutes, setMinutes] = useState<number | null>(null);

  useEffect(() => {
    function tick() {
      setMinutes(minutesUntilCutoffToday(cutoffTime));
    }
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [cutoffTime]);

  if (minutes === null || minutes <= 0 || minutes > reminderMinutes) return null;

  return (
    <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
      {format(minutes)}
    </span>
  );
}
