"use client";

import { SettlementRow } from "@/components/feature/settlement-row";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/feature/states";
import { useSettings, useSettlements } from "@/lib/client/hooks";
import { formatMoney } from "@/lib/format";

export default function SettlementsPage() {
  const { data: settings } = useSettings();
  const { data: settlements, error, isLoading, mutate } = useSettlements();
  const currency = settings?.currency ?? "₹";
  const messName = settings?.messName ?? "Mess";

  const totalAmount = (settlements ?? []).reduce((t, s) => t + s.totalAmount, 0);
  const dueAmount = (settlements ?? []).reduce((t, s) => t + s.dueAmount, 0);

  return (
    <div className="space-y-4 lg:space-y-6">
      <h1 className="text-xl font-semibold lg:text-2xl">Settlements</h1>

      {!isLoading && !error && settlements && settlements.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Settlements" value={String(settlements.length)} />
          <StatCard label="Total" value={formatMoney(totalAmount, currency)} />
          <StatCard
            label="Outstanding"
            value={formatMoney(dueAmount, currency)}
            tone={dueAmount > 0 ? "warning" : "success"}
          />
        </div>
      )}

      {isLoading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState message="Could not load settlements" onRetry={() => mutate()} />
      ) : !settlements || settlements.length === 0 ? (
        <EmptyState
          title="No settlements yet"
          hint="Settle up unsettled entries from the Entries tab — they’ll show up here with a per-person breakdown."
        />
      ) : (
        <div className="space-y-3">
          {settlements.map((s) => (
            <SettlementRow key={s._id} settlement={s} currency={currency} messName={messName} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
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
      <p className={`mt-1 text-lg font-semibold tabular-nums ${valueTone}`}>{value}</p>
    </div>
  );
}
