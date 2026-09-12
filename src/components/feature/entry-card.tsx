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
import { ParticipantDialog } from "@/components/feature/participant-dialog";
import { WhatsAppIcon } from "@/components/feature/whatsapp-icon";
import { mutateApi } from "@/lib/client/fetcher";
import { refreshEntries } from "@/lib/client/entries";
import { useSettings } from "@/lib/client/hooks";
import { whatsAppTextUrl } from "@/lib/client/whatsapp";
import { buildSupplierMessage } from "@/lib/client/supplierMessage";
import { dayParts, formatDate, formatMoney, todayInputValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FullEaterEntry, HalfPairEntry, MealEntry } from "@/types";

interface Props {
  entry: MealEntry;
  currency: string;
  readOnly?: boolean;
  onEdit?: (entry: MealEntry) => void;
}

interface ParticipantTarget {
  name: string;
  fullEater: FullEaterEntry | null;
  halfPair: HalfPairEntry | null;
}

/** One day's meals, rendered as a row. Parent supplies the border + dividers. */
export function EntryCard({ entry, currency, readOnly, onEdit }: Props) {
  const { data: settings } = useSettings();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [participant, setParticipant] = useState<ParticipantTarget | null>(null);
  const { day, month, weekday } = dayParts(entry.date);
  const isToday = entry.date.slice(0, 10) === todayInputValue();

  const isPaid = (name: string) => entry.paidBy.some((n) => n.toLowerCase() === name.toLowerCase());

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

  function sendToSupplier() {
    const phone = settings?.supplierPhone;
    if (!phone) {
      toast.error("Add a supplier WhatsApp number in Settings first");
      return;
    }
    const message = buildSupplierMessage(entry);
    window.open(whatsAppTextUrl(phone, message), "_blank", "noopener,noreferrer");
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
              {entry.mealCount} meal{entry.mealCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-base font-semibold tabular-nums text-amber-700 dark:text-amber-400">
              {formatMoney(entry.totalAmount, currency)}
            </span>
            {!readOnly && (
              <div className="flex">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirming(true)}
                  aria-label="Delete entry"
                >
                  <Trash2 className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => onEdit?.(entry)}
                  aria-label="Edit entry"
                >
                  <Pencil className="size-4" />
                </Button>
                {isToday && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
                    onClick={sendToSupplier}
                    aria-label="Send meal count to supplier on WhatsApp"
                  >
                    <WhatsAppIcon className="size-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {(entry.fullEaters.length > 0 || entry.halfPairs.length > 0) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {entry.fullEaters.map((eater) => (
              <PersonChip
                key={`f-${eater.name}`}
                name={eater.name}
                variant={eater.variant}
                count={eater.count}
                paid={isPaid(eater.name)}
                disabled={readOnly}
                onClick={() => setParticipant({ name: eater.name, fullEater: eater, halfPair: null })}
              />
            ))}
            {entry.halfPairs.map((pair, i) => (
              <div key={`h-${i}`} className="inline-flex items-center gap-1">
                <PersonChip
                  name={pair.names[0]}
                  variant={pair.variant}
                  paid={isPaid(pair.names[0])}
                  disabled={readOnly}
                  onClick={() => setParticipant({ name: pair.names[0], fullEater: null, halfPair: pair })}
                />
                <span className="text-xs text-muted-foreground">+</span>
                <PersonChip
                  name={pair.names[1]}
                  variant={pair.variant}
                  paid={isPaid(pair.names[1])}
                  disabled={readOnly}
                  onClick={() => setParticipant({ name: pair.names[1], fullEater: null, halfPair: pair })}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {participant && (
        <ParticipantDialog
          key={participant.name}
          open
          onOpenChange={(open) => !open && setParticipant(null)}
          entryId={entry._id}
          name={participant.name}
          paid={isPaid(participant.name)}
          fullEater={participant.fullEater}
          halfPair={participant.halfPair}
        />
      )}

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
  variant,
  count,
  paid,
  disabled,
  onClick,
}: {
  name: string;
  variant?: string | null;
  count?: number;
  paid: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const label = count && count > 1 ? `${name} ×${count}` : name;
  const title = [variant, paid ? "paid" : "unpaid"].filter(Boolean).join(" · ");
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={`${name} — ${title} — tap to edit`}
      className={cn(
        "inline-flex h-5 shrink-0 cursor-pointer items-center gap-1 rounded-4xl px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        paid
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      )}
    >
      {paid && <Check className="size-3" />}
      {label}
    </button>
  );
}
