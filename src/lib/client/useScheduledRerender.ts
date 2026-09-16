"use client";

import { useEffect, useState } from "react";

/** `setTimeout`'s max delay is a signed 32-bit ms count (~24.8 days) — anything longer gets
 * clamped by the browser and fires immediately, so re-arm in chunks instead. Not expected in
 * practice here (delays are "minutes until a time later today"), but guards against a
 * misconfigured cutoff/confirmed-until time scheduling a delay that's actually in the past. */
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * Forces a re-render at each given moment (ms from now), then stays idle — for UI derived from
 * the current wall-clock time (e.g. isPastCutoffToday, postCutoffOrderStage) that needs to
 * flip live the instant a known, fixed time arrives, without polling. Pass the delays fresh
 * every render (e.g. `msUntilIstTime(cutoffTime)`) — only positive ones get scheduled, and
 * they're re-armed whenever the set of delays changes (e.g. settings load, or a new day's
 * value shifts them).
 */
export function useScheduledRerender(delaysMs: number[]): void {
  const [, setTick] = useState(0);
  const key = delaysMs.join(",");

  useEffect(() => {
    const timers = delaysMs
      .filter((ms) => ms > 0)
      .map((ms) => {
        let remaining = ms;
        let id: ReturnType<typeof setTimeout>;
        const arm = () => {
          const chunk = Math.min(remaining, MAX_TIMEOUT_MS);
          remaining -= chunk;
          id = setTimeout(() => {
            if (remaining > 0) arm();
            else setTick((t) => t + 1);
          }, chunk);
        };
        arm();
        return () => clearTimeout(id);
      });
    return () => timers.forEach((clear) => clear());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is delaysMs's stable identity
  }, [key]);
}
