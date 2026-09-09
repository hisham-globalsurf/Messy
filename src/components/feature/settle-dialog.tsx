"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { mutateApi } from "@/lib/client/fetcher";
import { refreshEntries } from "@/lib/client/entries";
import { formatMoney, todayInputValue } from "@/lib/format";
import type { MealEntry } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unsettled: MealEntry[];
  currency: string;
}

export function SettleDialog({ open, onOpenChange, unsettled, currency }: Props) {
  const [useRange, setUseRange] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(todayInputValue());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const affected = useMemo(() => {
    return unsettled.filter((e) => {
      const day = e.date.slice(0, 10);
      if (day > to) return false;
      if (useRange && from && day < from) return false;
      return true;
    });
  }, [unsettled, from, to, useRange]);

  const totalAmount = affected.reduce((t, e) => t + e.totalAmount, 0);
  const totalMeals = affected.reduce((t, e) => t + e.mealCount, 0);
  const people = new Set(affected.flatMap((e) => [...e.fullEaters, ...e.halfPairs.flat()])).size;

  async function confirm() {
    setSaving(true);
    try {
      const res = await mutateApi<{ entryCount: number }>("/api/settlements", "POST", {
        dateTo: to,
        dateFrom: useRange && from ? from : undefined,
        note: note.trim() || undefined,
      });
      await refreshEntries();
      toast.success(`Settled ${res.entryCount} entr${res.entryCount === 1 ? "y" : "ies"}`);
      onOpenChange(false);
      setNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not settle");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Settle up</DialogTitle>
          <DialogDescription>
            Marks matching unsettled entries as settled. Settled entries become read-only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useRange}
              onChange={(e) => setUseRange(e.target.checked)}
              className="size-4 accent-primary"
            />
            Limit to a start date
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="settle-from" className={useRange ? "" : "text-muted-foreground"}>
                From
              </Label>
              <Input
                id="settle-from"
                type="date"
                value={from}
                disabled={!useRange}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settle-to">Up to</Label>
              <Input id="settle-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settle-note">Note (optional)</Label>
            <Textarea
              id="settle-note"
              rows={2}
              value={note}
              placeholder="e.g. Paid via UPI on 5th"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Entries</span>
              <span className="font-medium">{affected.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Meals · people</span>
              <span className="font-medium">
                {totalMeals} · {people}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">{formatMoney(totalAmount, currency)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={saving || affected.length === 0}>
            {saving ? "Settling…" : `Settle ${affected.length} entr${affected.length === 1 ? "y" : "ies"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
