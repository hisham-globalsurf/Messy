"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const { day, month, weekday } = dayParts(entry.date);

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
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {entry.fullEaters.map((name) => (
              <Badge key={`f-${name}`} variant="secondary">
                {name}
              </Badge>
            ))}
            {entry.halfPairs.map((pair, i) => (
              <Badge key={`h-${i}`} variant="outline" className="font-normal">
                {pair[0]} <span className="mx-0.5 text-muted-foreground">+</span> {pair[1]}
              </Badge>
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
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
