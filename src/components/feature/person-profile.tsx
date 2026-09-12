"use client";

import { useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState, ListSkeleton } from "@/components/feature/states";
import { ShareCard } from "@/components/feature/share-card";
import { fetcher } from "@/lib/client/fetcher";
import { shareOrDownload } from "@/lib/client/share";
import { useSettings, useSettlements } from "@/lib/client/hooks";
import { formatDate, formatMoney } from "@/lib/format";
import type { PersonStats } from "@/types";

type Period = "all" | "unsettled" | string;

export function PersonProfile({ name }: { name: string }) {
  const { data: stats, error, isLoading, mutate } = useSWR<PersonStats>(
    `/api/persons/${encodeURIComponent(name)}/stats`,
    fetcher,
  );
  const { data: settings } = useSettings();
  const { data: settlements = [] } = useSettlements();
  const [period, setPeriod] = useState<Period>("unsettled");
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  const currency = settings?.currency ?? "₹";

  const items = useMemo(() => {
    if (!stats) return [];
    if (period === "all") return stats.history;
    if (period === "unsettled") return stats.history.filter((i) => !i.settled);
    return stats.history.filter((i) => i.settlementId === period);
  }, [stats, period]);

  const meals = items.reduce((t, i) => t + (i.kind === "full" ? i.count : 1), 0);
  const amount = Number(items.reduce((t, i) => t + i.amount, 0).toFixed(2));
  const due = Number(items.filter((i) => !i.settled).reduce((t, i) => t + i.amount, 0).toFixed(2));

  const periodLabel = useMemo(() => {
    if (period === "all") return "All time";
    if (period === "unsettled") return "Unsettled";
    const s = settlements.find((x) => x._id === period);
    return s ? `${formatDate(s.dateFrom)} — ${formatDate(s.dateTo)}` : "Settlement";
  }, [period, settlements]);

  async function onShare() {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const result = await shareOrDownload(cardRef.current, `${name}-mess-${period}.png`);
      toast.success(result === "shared" ? "Shared" : "Image downloaded");
    } catch {
      toast.error("Could not create image");
    } finally {
      setSharing(false);
    }
  }

  if (isLoading) return <ListSkeleton rows={4} />;
  if (error || !stats) return <ErrorState message="Could not load this person" onRetry={() => mutate()} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total meals" value={String(stats.totalMeals)} sub={formatMoney(stats.totalAmount, currency)} />
        <StatCard
          label="Outstanding"
          value={formatMoney(stats.unsettled.amount, currency)}
          sub={`${stats.unsettled.meals} meals unsettled`}
          tone={stats.unsettled.amount > 0 ? "warning" : "success"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unsettled">Unsettled only</SelectItem>
            <SelectItem value="all">All time</SelectItem>
            {settlements.map((s) => (
              <SelectItem key={s._id} value={s._id}>
                {formatDate(s.dateFrom)} — {formatDate(s.dateTo)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={onShare} disabled={sharing || meals === 0}>
          {sharing ? <Spinner /> : <Share2 className="size-4" />}
          {sharing ? "Preparing…" : "Share"}
        </Button>
      </div>

      <div className="flex items-center justify-between rounded-xl border bg-muted/40 px-4 py-3 text-sm">
        <span className="text-muted-foreground">
          {periodLabel} · {meals} meal{meals === 1 ? "" : "s"}
        </span>
        <span className="text-base font-semibold">{formatMoney(period === "all" ? amount : due, currency)}</span>
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No meals in this period.</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {items.map((item, i) => (
            <li key={`${item.entryId}-${item.kind}-${i}`} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{formatDate(item.date)}</p>
                <p className="text-xs text-muted-foreground">
                  {item.kind === "full" ? "Full meal" : `Half with ${item.partner ?? "—"}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={item.settled ? "secondary" : "outline"}>
                  {item.settled ? "Settled" : "Unsettled"}
                </Badge>
                <span className="text-sm font-medium">{formatMoney(item.amount, currency)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ShareCard
        ref={cardRef}
        messName={settings?.messName ?? "Mess"}
        personName={name}
        periodLabel={periodLabel}
        meals={meals}
        amount={amount}
        currency={currency}
        dates={items.map((i) => i.date)}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "neutral" | "warning" | "success";
}) {
  const boxTone = {
    neutral: "bg-card",
    warning: "border-amber-500/30 bg-amber-500/10",
    success: "border-emerald-500/30 bg-emerald-500/10",
  }[tone];
  const valueTone = {
    neutral: "",
    warning: "text-amber-700 dark:text-amber-400",
    success: "text-emerald-700 dark:text-emerald-400",
  }[tone];

  return (
    <div className={`rounded-xl border p-4 ${boxTone}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${valueTone}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
