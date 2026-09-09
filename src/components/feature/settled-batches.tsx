"use client";

import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { EntryCard } from "@/components/feature/entry-card";
import { EmptyState } from "@/components/feature/states";
import { formatDate, formatMoney } from "@/lib/format";
import type { MealEntry, Settlement } from "@/types";

interface Props {
  entries: MealEntry[];
  settlements: Settlement[];
  currency: string;
}

export function SettledBatches({ entries, settlements, currency }: Props) {
  const byId = new Map<string, MealEntry[]>();
  for (const e of entries) {
    if (!e.settlementId) continue;
    const list = byId.get(e.settlementId) ?? [];
    list.push(e);
    byId.set(e.settlementId, list);
  }

  const batches = settlements
    .filter((s) => byId.has(s._id))
    .map((s) => ({ settlement: s, entries: byId.get(s._id) ?? [] }));

  if (batches.length === 0) {
    return <EmptyState title="Nothing settled yet" hint="Settled batches will appear here, grouped and locked." />;
  }

  return (
    <div className="space-y-3">
      {batches.map(({ settlement, entries: batchEntries }) => (
        <Collapsible key={settlement._id} className="rounded-xl border bg-card">
          <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 p-4 text-left">
            <div>
              <p className="font-medium">
                {formatDate(settlement.dateFrom)} — {formatDate(settlement.dateTo)}
              </p>
              <p className="text-sm text-muted-foreground">
                {batchEntries.length} entr{batchEntries.length === 1 ? "y" : "ies"} · settled{" "}
                {formatDate(settlement.createdAt)}
                {settlement.note ? ` · ${settlement.note}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{formatMoney(settlement.totalAmount, currency)}</span>
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="divide-y border-t">
            {batchEntries.map((entry) => (
              <EntryCard key={entry._id} entry={entry} currency={currency} readOnly />
            ))}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
