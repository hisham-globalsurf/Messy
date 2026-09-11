"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { mutateApi } from "@/lib/client/fetcher";
import { refreshEntries } from "@/lib/client/entries";
import { dayParts, formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MealEntry } from "@/types";

interface Props {
  entry: MealEntry;
  currency: string;
  readOnly?: boolean;
  onEdit?: (entry: MealEntry) => void;
}

/** One day's meals, rendered as a row. Parent supplies the border + dividers. */
export function EntryCard({ entry, currency, readOnly, onEdit }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingName, setTogglingName] = useState<string | null>(null);
  const { day, month, weekday } = dayParts(entry.date);

  const isPaid = (name: string) => entry.paidBy.some((n) => n.toLowerCase() === name.toLowerCase());

  async function togglePaid(name: string) {
    setTogglingName(name);
    try {
      await mutateApi(`/api/entries/${entry._id}/paid`, "PATCH", { name, paid: !isPaid(name) });
      await refreshEntries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update payment status");
    } finally {
      setTogglingName(null);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await mutateApi(`/api/entries/${entry._id}`, "DELETE");
      await refreshEntries();
      toast.success("Entry deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <div className="flex gap-3 p-3 transition-colors hover:bg-muted/40 sm:gap-4 sm:p-4">
      <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-lg border bg-muted/50 py-1.5 text-center">
        <span className="text-lg font-semibold leading-none">{day}</span>
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {month}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium">{weekday}</p>
            <p className="text-xs text-muted-foreground">
              {entry.mealCount} meal{entry.mealCount === 1 ? "" : "s"} ·{" "}
              {formatMoney(entry.pricePerMeal, currency)} each
            </p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-base font-semibold tabular-nums">
              {formatMoney(entry.totalAmount, currency)}
            </span>
            {!readOnly && (
              <div className="flex">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => onEdit?.(entry)}
                  aria-label="Edit entry"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirming(true)}
                  aria-label="Delete entry"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {(entry.fullEaters.length > 0 || entry.halfPairs.length > 0) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {entry.fullEaters.map((name) => (
              <PersonChip
                key={`f-${name}`}
                name={name}
                paid={isPaid(name)}
                disabled={readOnly || togglingName === name}
                loading={togglingName === name}
                onToggle={() => togglePaid(name)}
              />
            ))}
            {entry.halfPairs.map((pair, i) => (
              <div key={`h-${i}`} className="inline-flex items-center gap-1">
                <PersonChip
                  name={pair[0]}
                  paid={isPaid(pair[0])}
                  disabled={readOnly || togglingName === pair[0]}
                  loading={togglingName === pair[0]}
                  onToggle={() => togglePaid(pair[0])}
                />
                <span className="text-xs text-muted-foreground">+</span>
                <PersonChip
                  name={pair[1]}
                  paid={isPaid(pair[1])}
                  disabled={readOnly || togglingName === pair[1]}
                  loading={togglingName === pair[1]}
                  onToggle={() => togglePaid(pair[1])}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              {formatDate(entry.date)} — {entry.mealCount} meal
              {entry.mealCount === 1 ? "" : "s"}, {formatMoney(entry.totalAmount, currency)}. This
              can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} disabled={deleting}>
              {deleting && <Spinner />}
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PersonChip({
  name,
  paid,
  disabled,
  loading,
  onToggle,
}: {
  name: string;
  paid: boolean;
  disabled?: boolean;
  loading?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title={paid ? `${name} already paid — tap to mark unpaid` : `${name} — tap to mark paid`}
      className={cn(
        "inline-flex h-5 shrink-0 cursor-pointer items-center gap-1 rounded-4xl px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        paid
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      )}
    >
      {loading ? <Spinner className="size-3" /> : paid && <Check className="size-3" />}
      {name}
    </button>
  );
}
