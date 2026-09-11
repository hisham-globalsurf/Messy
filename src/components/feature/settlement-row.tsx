"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, MoreVertical, Share2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
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
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState, ListSkeleton } from "@/components/feature/states";
import { ShareCard } from "@/components/feature/share-card";
import { useSettlementDetail } from "@/lib/client/hooks";
import { mutateApi } from "@/lib/client/fetcher";
import { refreshEntries } from "@/lib/client/entries";
import { shareToWhatsApp } from "@/lib/client/whatsapp";
import { formatDate, formatMoney } from "@/lib/format";
import type { SettlementPersonBreakdown, SettlementSummary } from "@/types";

interface Props {
  settlement: SettlementSummary;
  currency: string;
  messName: string;
}

export function SettlementRow({ settlement, currency, messName }: Props) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState<"unsettle" | "delete-entries" | null>(null);
  const { data: detail, error, isLoading, mutate } = useSettlementDetail(open ? settlement._id : null);

  const periodLabel = `${formatDate(settlement.dateFrom)} — ${formatDate(settlement.dateTo)}`;

  async function onDelete(mode: "unsettle" | "delete-entries") {
    setDeleting(mode);
    try {
      await mutateApi(`/api/settlements/${settlement._id}`, "DELETE", { mode });
      await refreshEntries();
      toast.success(mode === "unsettle" ? "Settlement removed, entries moved back to unsettled" : "Settlement and its entries deleted");
      setConfirming(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete settlement");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 p-4">
        <CollapsibleTrigger className="group flex flex-1 cursor-pointer items-center justify-between gap-3 text-left">
          <div>
            <p className="font-medium">{periodLabel}</p>
            <p className="text-sm text-muted-foreground">
              {settlement.entryCount} entr{settlement.entryCount === 1 ? "y" : "ies"} ·{" "}
              {settlement.peopleCount} people · settled {formatDate(settlement.createdAt)}
              {settlement.note ? ` · ${settlement.note}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end gap-1">
              <span className="font-semibold tabular-nums">{formatMoney(settlement.totalAmount, currency)}</span>
              {settlement.paidAmount > 0 && settlement.dueAmount <= 0 && (
                <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                  All paid
                </Badge>
              )}
            </div>
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </div>
        </CollapsibleTrigger>
        <Button
          size="icon"
          variant="ghost"
          className="size-9 shrink-0 text-muted-foreground"
          onClick={() => setConfirming(true)}
          aria-label="Settlement options"
        >
          <MoreVertical className="size-4" />
        </Button>
      </div>

      <CollapsibleContent className="border-t p-4">
        {isLoading ? (
          <ListSkeleton rows={2} />
        ) : error || !detail ? (
          <ErrorState message="Could not load breakdown" onRetry={() => mutate()} />
        ) : detail.people.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No entries in this settlement.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {detail.people.map((p) => (
              <PersonBreakdownRow
                key={p.name}
                person={p}
                periodLabel={periodLabel}
                currency={currency}
                messName={messName}
                settlementId={settlement._id}
              />
            ))}
          </ul>
        )}
      </CollapsibleContent>

      <AlertDialog open={confirming} onOpenChange={(v) => !deleting && setConfirming(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this settlement?</AlertDialogTitle>
            <AlertDialogDescription>
              Move its {settlement.entryCount} entr{settlement.entryCount === 1 ? "y" : "ies"} back to
              unsettled, or permanently delete them along with the settlement. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                onDelete("unsettle");
              }}
              disabled={!!deleting}
            >
              {deleting === "unsettle" && <Spinner />}
              Move to unsettled
            </AlertDialogAction>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                onDelete("delete-entries");
              }}
              disabled={!!deleting}
            >
              {deleting === "delete-entries" && <Spinner />}
              Delete data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Collapsible>
  );
}

function PersonBreakdownRow({
  person,
  periodLabel,
  currency,
  messName,
  settlementId,
}: {
  person: SettlementPersonBreakdown;
  periodLabel: string;
  currency: string;
  messName: string;
  settlementId: string;
}) {
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [shared, markShared] = useSharedFlag(`whatsapp-shared:${settlementId}:${person.name}`);

  async function onShare() {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const result = await shareToWhatsApp(cardRef.current, `${person.name}-settlement-${settlementId}.png`, person.phone);
      markShared();
      toast.success(
        result === "shared"
          ? "Shared"
          : result === "clipboard"
            ? "Image copied — paste it into the chat and send"
            : "Image downloaded — attach it in WhatsApp",
      );
    } catch {
      toast.error("Could not create image");
    } finally {
      setSharing(false);
    }
  }

  const fullyPaid = person.paidAmount > 0 && person.dueAmount <= 0;
  const partiallyPaid = person.paidAmount > 0 && person.dueAmount > 0;
  const needsPayment = person.dueAmount > 0;

  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{person.name}</p>
        <p className="text-xs text-muted-foreground">
          {person.meals} meal{person.meals === 1 ? "" : "s"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-semibold tabular-nums">{formatMoney(person.dueAmount, currency)}</span>
          {fullyPaid && (
            <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
              Paid
            </Badge>
          )}
          {partiallyPaid && (
            <Badge className="border border-amber-500/30 bg-amber-500/15 font-semibold text-amber-700 dark:text-amber-400">
              Paid {formatMoney(person.paidAmount, currency)}
            </Badge>
          )}
        </div>
        {needsPayment && (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onShare}
            disabled={sharing}
            aria-label={`Share ${person.name}'s breakdown on WhatsApp`}
            className={shared ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}
          >
            {sharing ? <Spinner /> : shared ? <CheckCircle2 className="size-4" /> : <Share2 className="size-4" />}
          </Button>
        )}
      </div>
      {needsPayment && (
        <ShareCard
          ref={cardRef}
          messName={messName}
          personName={person.name}
          periodLabel={periodLabel}
          meals={person.meals}
          amount={person.amount}
          currency={currency}
          dates={person.dates}
        />
      )}
    </li>
  );
}

/** Tracks per-person "already shared on WhatsApp" state in localStorage, scoped to one settlement. */
function useSharedFlag(key: string): [boolean, () => void] {
  const [shared, setShared] = useState(() => {
    try {
      return localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  });

  function markShared() {
    setShared(true);
    try {
      localStorage.setItem(key, "1");
    } catch {
      // Private browsing or storage disabled — the flag just won't persist.
    }
  }

  return [shared, markShared];
}
