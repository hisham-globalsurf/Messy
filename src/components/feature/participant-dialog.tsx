"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { Minus, Plus } from "lucide-react";
import { mutateApi } from "@/lib/client/fetcher";
import { refreshEntries } from "@/lib/client/entries";
import { useSettings } from "@/lib/client/hooks";
import type { FullEaterEntry, HalfPairEntry } from "@/types";

const NO_VARIANT = "__none__";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId: string;
  name: string;
  paid: boolean;
  /** Present only when this person is a full eater — carries their own count. */
  fullEater: FullEaterEntry | null;
  /** Present only when this person is in a half-pair — variant applies to the shared meal, no count. */
  halfPair: HalfPairEntry | null;
}

export function ParticipantDialog({
  open,
  onOpenChange,
  entryId,
  name,
  paid: initialPaid,
  fullEater,
  halfPair,
}: Props) {
  const { data: settings } = useSettings();
  const variants = settings?.foodVariants ?? [];
  const partner = halfPair?.names.find((n) => n.toLowerCase() !== name.toLowerCase()) ?? null;

  const [paid, setPaid] = useState(initialPaid);
  const [variant, setVariant] = useState(fullEater?.variant ?? halfPair?.variant ?? NO_VARIANT);
  const [count, setCount] = useState(fullEater?.count ?? 1);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await mutateApi(`/api/entries/${entryId}/participant`, "PATCH", {
        name,
        paid,
        ...(fullEater ? { variant: variant === NO_VARIANT ? null : variant, count } : {}),
        ...(halfPair ? { variant: variant === NO_VARIANT ? null : variant } : {}),
      });
      await refreshEntries();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>
            {fullEater
              ? "Food, meal count, and payment for this day."
              : halfPair
                ? `Food and payment for this day — shared with ${partner}.`
                : "Payment for this day."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {(fullEater || halfPair) && (
            <div className="space-y-2">
              <Label>Food</Label>
              <Select value={variant} onValueChange={setVariant}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_VARIANT}>No preference</SelectItem>
                  {variants.map((v) => (
                    <SelectItem key={v.name} value={v.name}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {halfPair && (
                <p className="text-xs text-muted-foreground">
                  This is one shared meal — changing the food type also changes it for {partner}.
                </p>
              )}
            </div>
          )}

          {fullEater && (
            <div className="space-y-2">
              <Label>Meals</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={count <= 1}
                  onClick={() => setCount((c) => Math.max(1, c - 1))}
                  aria-label="Decrease meal count"
                >
                  <Minus className="size-4" />
                </Button>
                <span className="w-6 text-center text-sm font-medium tabular-nums">{count}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={count >= 20}
                  onClick={() => setCount((c) => Math.min(20, c + 1))}
                  aria-label="Increase meal count"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <Label htmlFor="participant-paid" className="cursor-pointer">
              Already paid
            </Label>
            <Switch id="participant-paid" checked={paid} onCheckedChange={setPaid} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving && <Spinner />}
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
