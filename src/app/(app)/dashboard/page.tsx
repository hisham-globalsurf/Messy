"use client";

import { useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AddEntrySheet } from "@/components/feature/add-entry-sheet";
import { SettleDialog } from "@/components/feature/settle-dialog";
import { EntryCard } from "@/components/feature/entry-card";
import { EntryFilters, type Filters } from "@/components/feature/entry-filters";
import { SettledBatches } from "@/components/feature/settled-batches";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/feature/states";
import { useEntries, useSettings, useSettlements } from "@/lib/client/hooks";
import { groupByMonth } from "@/lib/group";
import { formatMoney } from "@/lib/format";
import type { MealEntry } from "@/types";

const EMPTY: Filters = { from: "", to: "", person: "" };

export default function DashboardPage() {
  const [tab, setTab] = useState<"unsettled" | "settled">("unsettled");
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [sheet, setSheet] = useState<{ open: boolean; entry: MealEntry | null; key: number }>({
    open: false,
    entry: null,
    key: 0,
  });
  const [settleOpen, setSettleOpen] = useState(false);

  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "₹";

  const query = {
    settled: tab === "settled",
    from: filters.from || undefined,
    to: filters.to || undefined,
    person: filters.person || undefined,
  };
  const { data: entries, error, isLoading, mutate } = useEntries(query);
  const { data: allUnsettled = [] } = useEntries({ settled: false });
  const { data: recentEntries } = useEntries({});
  const { data: settlements = [] } = useSettlements();

  const prevEntry = recentEntries?.[0] ?? null;

  const periodTotal = (entries ?? []).reduce((t, e) => t + e.totalAmount, 0);

  function openAdd() {
    setSheet((s) => ({ open: true, entry: null, key: s.key + 1 }));
  }
  function openEdit(entry: MealEntry) {
    setSheet((s) => ({ open: true, entry, key: s.key + 1 }));
  }
  function onAddChange(open: boolean) {
    setSheet((s) => ({ ...s, open }));
  }

  const showTotal = tab === "unsettled" && (entries?.length ?? 0) > 0;

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
      {/* Fixed control section — the list below it scrolls underneath. */}
      <div className="sticky top-14 z-20 -mx-4 -mt-5 space-y-3 border-b bg-background/95 px-4 pb-3 pt-4 backdrop-blur sm:-mx-6 sm:px-6 lg:top-16 lg:-mx-8 lg:-mt-8 lg:px-8">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold lg:text-2xl">Entries</h1>
          {tab === "unsettled" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettleOpen(true)}
              disabled={allUnsettled.length === 0}
            >
              <Wallet className="size-4" />
              Settle up
            </Button>
          )}
        </div>

        <TabsList className="w-full">
          <TabsTrigger value="unsettled" className="flex-1">
            Unsettled
          </TabsTrigger>
          <TabsTrigger value="settled" className="flex-1">
            Settled
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <EntryFilters value={filters} onChange={setFilters} />
          {showTotal && (
            <div className="flex items-baseline gap-2 text-sm">
              <span className="text-muted-foreground">Outstanding</span>
              <span className="text-base font-semibold tabular-nums">
                {formatMoney(periodTotal, currency)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4">
        <TabsContent value="unsettled" className="mt-0">
          <EntryList
            entries={entries}
            error={error ? String(error) : null}
            isLoading={isLoading}
            currency={currency}
            onEdit={openEdit}
            onRetry={() => mutate()}
            emptyTitle="No unsettled entries"
            emptyHint="Add today’s meals to get started."
            emptyAction={
              <Button onClick={() => openAdd()}>
                <Plus className="size-4" />
                Add entry
              </Button>
            }
          />
        </TabsContent>

        <TabsContent value="settled" className="mt-0">
          {isLoading ? (
            <ListSkeleton />
          ) : error ? (
            <ErrorState message="Could not load settled entries" onRetry={() => mutate()} />
          ) : (
            <SettledBatches entries={entries ?? []} settlements={settlements} currency={currency} />
          )}
        </TabsContent>
      </div>

      <button
        onClick={() => openAdd()}
        className="fixed bottom-20 right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground shadow-lg sm:bottom-8"
      >
        <Plus className="size-5" />
        Add entry
      </button>

      <AddEntrySheet
        key={sheet.key}
        open={sheet.open}
        onOpenChange={onAddChange}
        entry={sheet.entry}
        prefillFrom={prevEntry}
      />
      <SettleDialog
        open={settleOpen}
        onOpenChange={setSettleOpen}
        unsettled={allUnsettled}
        currency={currency}
      />
    </Tabs>
  );
}

interface ListProps {
  entries?: MealEntry[];
  error: string | null;
  isLoading: boolean;
  currency: string;
  onEdit: (e: MealEntry) => void;
  onRetry: () => void;
  emptyTitle: string;
  emptyHint: string;
  emptyAction?: React.ReactNode;
}

function EntryList({
  entries,
  error,
  isLoading,
  currency,
  onEdit,
  onRetry,
  emptyTitle,
  emptyHint,
  emptyAction,
}: ListProps) {
  if (isLoading) return <ListSkeleton />;
  if (error) return <ErrorState message="Could not load entries" onRetry={onRetry} />;
  if (!entries || entries.length === 0)
    return <EmptyState title={emptyTitle} hint={emptyHint} action={emptyAction} />;

  const months = groupByMonth(entries);
  return (
    <div className="space-y-7">
      {months.map((group) => (
        <section key={group.key}>
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.key}
            </h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {group.meals} meals · {formatMoney(group.amount, currency)}
            </span>
          </div>
          <div className="divide-y overflow-hidden rounded-xl border bg-card">
            {group.entries.map((entry) => (
              <EntryCard key={entry._id} entry={entry} currency={currency} onEdit={onEdit} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
