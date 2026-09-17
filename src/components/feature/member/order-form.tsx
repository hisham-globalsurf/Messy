"use client";

import { useState } from "react";
import { CheckCircle2, Minus, Pencil, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { MemberPartnerPicker } from "@/components/feature/member/member-partner-picker";
import { formatMoney, formatOrderSummary, formatTime12h } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FoodVariant, QueueOrderItem } from "@/types";

export interface OrderDraft {
  kind: "full" | "half";
  variant: string | null;
  count: number;
  partnerName: string | null;
}

interface LastOrderDraft {
  kind: "full" | "half";
  variant: string | null;
  count: number;
  partnerName: string | null;
}

interface Props {
  dateLabel: string;
  variants: FoodVariant[];
  pricePerMeal: number;
  currency: string;
  existing: QueueOrderItem | null;
  /** Member's most recent past order — prefilled only when there's no existing order for
   * this date yet, so they don't have to re-pick the same thing every day. */
  lastOrder: LastOrderDraft | null;
  cutoffTime: string;
  memberName: string;
  onSubmit: (draft: OrderDraft) => Promise<void>;
  onDelete: () => Promise<void>;
  saving: boolean;
  deleting: boolean;
}

/** A collapsible height wrapper — animates smoothly between 0 and its natural content height
 * via the CSS grid-rows trick (no JS height measuring needed). */
function Collapsible({ open, className, children }: { open: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn("grid transition-[grid-template-rows] duration-300 ease-in-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
    >
      <div className={cn("min-h-0 overflow-hidden", className)}>{children}</div>
    </div>
  );
}

export function OrderForm({
  dateLabel,
  variants,
  pricePerMeal,
  currency,
  existing,
  lastOrder,
  cutoffTime,
  memberName,
  onSubmit,
  onDelete,
  saving,
  deleting,
}: Props) {
  const seed = existing ?? lastOrder ?? null;
  const [variant, setVariant] = useState<string | null>(seed?.variant ?? variants[0]?.name ?? null);
  const [kind, setKind] = useState<"full" | "half">(seed?.kind ?? "full");
  const [count, setCount] = useState(seed?.count ?? 1);
  const [partnerName, setPartnerName] = useState<string | null>(seed?.partnerName ?? null);
  // Collapsed to a one-line summary once an order exists, unless the member clicked "Edit" —
  // deleting drops back to the full form on its own since there's nothing left to summarize.
  const [forceEdit, setForceEdit] = useState(false);
  const expanded = forceEdit || !existing;

  const canSubmit = kind === "full" || !!partnerName;
  const unitPrice = variant ? (variants.find((v) => v.name === variant)?.price ?? pricePerMeal) : pricePerMeal;
  const estimate = kind === "full" ? unitPrice * count : unitPrice / 2;

  async function submit() {
    await onSubmit({ kind, variant, count, partnerName });
    setForceEdit(false);
  }

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold max-[370px]:text-[13px]">{dateLabel}</h2>
        <div className="flex shrink-0 items-center gap-2">
          {existing ? (
            <Badge variant="info" className="h-auto gap-1 px-2.5 py-1">
              <CheckCircle2 />
              Order placed — editable
            </Badge>
          ) : (
            lastOrder && (
              <span className="text-xs text-muted-foreground max-[370px]:text-[11px]">Filled in from your last order</span>
            )
          )}
          {existing && expanded && (
            <button
              type="button"
              onClick={() => setForceEdit(false)}
              aria-label="Close editing"
              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm transition-colors hover:bg-primary/15"
            >
              <X className="size-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      {existing && (
        <Collapsible open={!expanded}>
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-sm font-medium">{formatOrderSummary(existing)}</p>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setForceEdit(true)}
                className="max-[370px]:h-6 max-[370px]:px-2 max-[370px]:text-[13px]"
              >
                <Pencil />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                disabled={deleting}
                className="max-[370px]:h-6 max-[370px]:px-2 max-[370px]:text-[13px]"
              >
                {deleting ? <Spinner /> : "Delete"}
              </Button>
            </div>
          </div>
        </Collapsible>
      )}

      <Collapsible open={expanded} className="space-y-5">
        {variants.length > 0 && (
          <div className="space-y-2">
            <Label>Food</Label>
            <div className="flex flex-wrap gap-2">
              {variants.map((v) => (
                <button
                  key={v.name}
                  type="button"
                  aria-pressed={variant === v.name}
                  onClick={() => setVariant(v.name)}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors max-[370px]:px-2.5 max-[370px]:py-1 max-[370px]:text-[13px]",
                    variant === v.name
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  {v.name}
                  <span
                    className={cn(
                      "text-xs max-[370px]:text-[11px]",
                      variant === v.name ? "text-primary-foreground/80" : "text-muted-foreground",
                    )}
                  >
                    {formatMoney(v.price, currency)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Full or half?</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={kind === "full"}
              onClick={() => setKind("full")}
              className={cn(
                "cursor-pointer rounded-lg border py-2.5 text-sm font-medium transition-colors max-[370px]:py-2 max-[370px]:text-[13px]",
                kind === "full" ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              Full
            </button>
            <button
              type="button"
              aria-pressed={kind === "half"}
              onClick={() => setKind("half")}
              className={cn(
                "cursor-pointer rounded-lg border py-2.5 text-sm font-medium transition-colors max-[370px]:py-2 max-[370px]:text-[13px]",
                kind === "half" ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              Half
            </button>
          </div>
        </div>

        {kind === "full" ? (
          <div className="space-y-2">
            <Label>How many?</Label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCount((c) => Math.max(1, c - 1))}
                disabled={count <= 1}
                className="flex size-9 cursor-pointer items-center justify-center rounded-lg border disabled:cursor-not-allowed disabled:opacity-40 max-[370px]:size-8"
                aria-label="Decrease count"
              >
                <Minus className="size-4 max-[370px]:size-3.5" />
              </button>
              <span className="w-6 text-center text-base font-semibold tabular-nums max-[370px]:text-[15px]">{count}</span>
              <button
                type="button"
                onClick={() => setCount((c) => Math.min(20, c + 1))}
                disabled={count >= 20}
                className="flex size-9 cursor-pointer items-center justify-center rounded-lg border disabled:cursor-not-allowed disabled:opacity-40 max-[370px]:size-8"
                aria-label="Increase count"
              >
                <Plus className="size-4 max-[370px]:size-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Pair with</Label>
            <MemberPartnerPicker value={partnerName} onChange={setPartnerName} excludeName={memberName} />
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
          <span className="text-xs text-muted-foreground max-[370px]:text-[11px]">Estimated cost</span>
          <span className="text-sm font-semibold tabular-nums max-[370px]:text-[13px]">
            {formatMoney(estimate, currency)}
          </span>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            className="flex-1 max-[370px]:h-7 max-[370px]:text-[13px]"
            onClick={submit}
            disabled={!canSubmit || saving || deleting}
          >
            {saving && <Spinner />}
            {saving ? "Saving…" : existing ? "Save changes" : "Submit"}
          </Button>
          {existing && (
            <Button
              variant="ghost"
              onClick={onDelete}
              disabled={saving || deleting}
              className="max-[370px]:h-7 max-[370px]:text-[13px]"
            >
              {deleting ? <Spinner /> : "Delete"}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground max-[370px]:text-[11px]">
          NB: Daily order will close before {formatTime12h(cutoffTime)}.
        </p>
      </Collapsible>
    </div>
  );
}
