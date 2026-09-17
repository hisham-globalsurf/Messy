"use client";

import { useMemo } from "react";
import { CalendarDays, CalendarX2, Users } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ListSkeleton } from "@/components/feature/states";
import { useMemberHistory } from "@/lib/client/hooks";
import { formatMoney, todayInputValue } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DayEntry {
  amount: number;
  sharedWith?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
}

export function HistorySheet({ open, onOpenChange, currency }: Props) {
  const { data, isLoading } = useMemberHistory(open);

  const months = useMemo(() => {
    const byMonth = new Map<string, Map<string, DayEntry>>();
    for (const day of data?.days ?? []) {
      const monthKey = day.date.slice(0, 7);
      const forMonth = byMonth.get(monthKey) ?? new Map<string, DayEntry>();
      forMonth.set(day.date, { amount: day.amount, sharedWith: day.sharedWith });
      byMonth.set(monthKey, forMonth);
    }
    return [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  const totalDue = data?.totalDue ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto flex max-h-[85vh] max-w-lg flex-col overflow-hidden rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-1.5">
            <CalendarDays className="size-4 text-muted-foreground" />
            Current period
          </SheetTitle>
          <SheetDescription>Your confirmed meals since the last settlement.</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-3">
          {isLoading ? (
            <ListSkeleton rows={2} />
          ) : months.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <CalendarX2 className="size-7 text-muted-foreground/40" />
              No confirmed meals yet this period.
            </div>
          ) : (
            months.map(([monthKey, days]) => <MonthGrid key={monthKey} monthKey={monthKey} days={days} currency={currency} />)
          )}
        </div>

        <div
          className={cn(
            "mx-4 mb-4 flex items-center justify-between rounded-xl border px-4 py-3",
            totalDue > 0 ? "border-amber-500/30 bg-amber-500/10" : "border-emerald-500/30 bg-emerald-500/10",
          )}
        >
          <span className="text-sm text-muted-foreground">Total due this period</span>
          <span
            className={cn(
              "text-base font-semibold tabular-nums",
              totalDue > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400",
            )}
          >
            {formatMoney(totalDue, currency)}
          </span>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function MonthGrid({
  monthKey,
  days,
  currency,
}: {
  monthKey: string;
  days: Map<string, DayEntry>;
  currency: string;
}) {
  const [year, month] = monthKey.split("-").map(Number);
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const daysInMonth = new Date(year, month, 0).getDate();
  const startWeekday = new Date(year, month - 1, 1).getDay();
  const cells: (number | null)[] = [...Array(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const monthTotal = [...days.values()].reduce((t, v) => t + v.amount, 0);
  const today = todayInputValue();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{monthLabel}</p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
          {formatMoney(monthTotal, currency)}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-medium text-muted-foreground/70">
        {WEEKDAYS.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const entry = days.get(dateStr);
          const isToday = dateStr === today;

          const cell = (
            <div
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-xs",
                entry ? "bg-amber-500/10 text-foreground" : "text-muted-foreground",
                entry?.sharedWith && "cursor-pointer transition-colors hover:bg-amber-500/20",
                isToday && "ring-1 ring-inset ring-primary",
              )}
            >
              {entry?.sharedWith && (
                <span className="absolute top-0.5 right-0.5 flex size-3 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Users className="size-2" />
                </span>
              )}
              <span className={cn(entry && "font-semibold")}>{day}</span>
              {entry ? (
                <span className="text-[10px] leading-none font-semibold text-amber-700 dark:text-amber-400">
                  {formatMoney(entry.amount, currency)}
                </span>
              ) : null}
            </div>
          );

          if (!entry?.sharedWith) return <div key={i}>{cell}</div>;

          return (
            <Popover key={i}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={`Shared with ${entry.sharedWith}`}
                  className="block w-full cursor-pointer appearance-none border-0 bg-transparent p-0 text-left"
                >
                  {cell}
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                className="w-auto flex-row items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
              >
                <Users className="size-3.5 text-muted-foreground" />
                Shared with {entry.sharedWith}
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </div>
  );
}
