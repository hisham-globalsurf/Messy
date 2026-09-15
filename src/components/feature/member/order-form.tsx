"use client";

import { useState } from "react";
import { CheckCircle2, Minus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { MemberPartnerPicker } from "@/components/feature/member/member-partner-picker";
import { formatMoney, formatTime12h } from "@/lib/format";
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

  const canSubmit = kind === "full" || !!partnerName;
  const unitPrice = variant ? (variants.find((v) => v.name === variant)?.price ?? pricePerMeal) : pricePerMeal;
  const estimate = kind === "full" ? unitPrice * count : unitPrice / 2;

  async function submit() {
    await onSubmit({ kind, variant, count, partnerName });
  }

  return (
    <div className="space-y-5 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{dateLabel}</h2>
        {existing ? (
          <Badge variant="info" className="h-auto gap-1 px-2.5 py-1">
            <CheckCircle2 />
            Order placed — editable
          </Badge>
        ) : (
          lastOrder && <span className="text-xs text-muted-foreground">Filled in from your last order</span>
        )}
      </div>

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
                  "flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  variant === v.name
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                {v.name}
                <span className={cn("text-xs", variant === v.name ? "text-primary-foreground/80" : "text-muted-foreground")}>
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
              "cursor-pointer rounded-lg border py-2.5 text-sm font-medium transition-colors",
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
              "cursor-pointer rounded-lg border py-2.5 text-sm font-medium transition-colors",
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
              className="flex size-9 cursor-pointer items-center justify-center rounded-lg border disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Decrease count"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-6 text-center text-base font-semibold tabular-nums">{count}</span>
            <button
              type="button"
              onClick={() => setCount((c) => Math.min(20, c + 1))}
              disabled={count >= 20}
              className="flex size-9 cursor-pointer items-center justify-center rounded-lg border disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Increase count"
            >
              <Plus className="size-4" />
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
        <span className="text-xs text-muted-foreground">Estimated cost</span>
        <span className="text-sm font-semibold tabular-nums">{formatMoney(estimate, currency)}</span>
      </div>

      <div className="flex gap-2 pt-1">
        <Button className="flex-1" onClick={submit} disabled={!canSubmit || saving || deleting}>
          {saving && <Spinner />}
          {saving ? "Saving…" : existing ? "Save changes" : "Submit"}
        </Button>
        {existing && (
          <Button variant="ghost" onClick={onDelete} disabled={saving || deleting}>
            {deleting ? <Spinner /> : "Delete"}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        NB: Daily order will close before {formatTime12h(cutoffTime)}.
      </p>
    </div>
  );
}
