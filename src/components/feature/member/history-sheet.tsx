"use client";

import { useMemo, useState } from "react";
import { CalendarCheck2, CalendarDays, CalendarX2, Users } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ListSkeleton } from "@/components/feature/states";
import { useMemberHistory, type MemberHistoryPeriod } from "@/lib/client/hooks";
import { formatDate, formatDateShort, formatMoney, todayInputValue } from "@/lib/format";
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

function periodRange(p: MemberHistoryPeriod) {
  return `${formatDateShort(p.dateFrom)} – ${formatDateShort(p.dateTo)}`;
}

export function HistorySheet({ open, onOpenChange, currency }: Props) {
  // null = current (unsettled) period — always what the sheet opens on.
  const [periodId, setPeriodId] = useState<string | null>(null);
  const { data, isLoading } = useMemberHistory(open, periodId);

  // Every response carries the full period list; hold on to the last one so the picker
  // doesn't vanish while a newly selected period is loading.
  const [periods, setPeriods] = useState<MemberHistoryPeriod[]>([]);
  if (data && data.periods !== periods) {
    setPeriods(data.periods);
  }

  const selected = periodId ? periods.find((p) => p.id === periodId) : undefined;
  const isCurrent = periodId === null;

  const handleOpenChange = (next: boolean) => {
    if (!next) setPeriodId(null);
    onOpenChange(next);
  };

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

  const total = data?.total ?? 0;
  const totalDue = data?.totalDue ?? 0;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="mx-auto flex max-h-[85vh] max-w-lg flex-col overflow-hidden rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-1.5">
            {isCurrent ? (
              <CalendarDays className="size-4 text-muted-foreground" />
            ) : (
              <CalendarCheck2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            )}
            {isCurrent ? "Current period" : "Settled period"}
          </SheetTitle>
          <SheetDescription>
            {isCurrent
              ? "Your confirmed meals since the last settlement."
              : selected
                ? `Meals from ${formatDate(selected.dateFrom)} to ${formatDate(selected.dateTo)}, settled on ${formatDate(selected.settledAt)}.`
                : "Your meals in this settled period."}
          </SheetDescription>
        </SheetHeader>

        {periods.length > 0 && (
          <div className="space-y-1.5 px-4">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Period</p>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              <PeriodChip active={isCurrent} onClick={() => setPeriodId(null)}>
                Current
              </PeriodChip>
              {periods.map((p) => (
                <PeriodChip key={p.id} active={periodId === p.id} settled onClick={() => setPeriodId(p.id)}>
                  {periodRange(p)}
                </PeriodChip>
              ))}
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-3">
          {isLoading ? (
            <ListSkeleton rows={2} />
          ) : months.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <CalendarX2 className="size-7 text-muted-foreground/40" />
              {isCurrent ? "No confirmed meals yet this period." : "No meals in this period."}
              {isCurrent && periods.length > 0 && (
                <span className="text-xs">Pick a settled period above to see past meals.</span>
              )}
            </div>
          ) : (
            months.map(([monthKey, days]) => <MonthGrid key={monthKey} monthKey={monthKey} days={days} currency={currency} />)
          )}
        </div>

        {isCurrent ? (
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
        ) : (
          <div className="mx-4 mb-4 flex items-center justify-between rounded-xl border px-4 py-3">
            <span className="text-sm text-muted-foreground">Your total for this period</span>
            <span className="text-base font-semibold tabular-nums">{formatMoney(total, currency)}</span>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function PeriodChip({
  active,
  settled,
  onClick,
  children,
}: {
  active: boolean;
  settled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-transparent text-muted-foreground hover:bg-muted",
      )}
    >
      {settled && <CalendarCheck2 className="size-3" />}
      {children}
    </button>
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
