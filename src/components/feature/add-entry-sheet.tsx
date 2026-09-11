"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { PersonCombobox } from "@/components/feature/person-combobox";
import { mutateApi } from "@/lib/client/fetcher";
import { refreshEntries } from "@/lib/client/entries";
import { usePersons, useSettings } from "@/lib/client/hooks";
import { formatDate, formatMoney, todayInputValue } from "@/lib/format";
import type { MealEntry } from "@/types";

const NO_VARIANT = "__none__";

interface FullEaterDraft {
  name: string;
  variant: string | null;
  count: number;
}
interface PairDraft {
  names: [string, string];
  variant: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: MealEntry | null;
  /** In create mode, seed the eater lists from this entry (usually the previous day). */
  prefillFrom?: MealEntry | null;
}

export function AddEntrySheet({ open, onOpenChange, entry, prefillFrom }: Props) {
  const { data: settings } = useSettings();
  const { data: persons = [] } = usePersons();
  const isEdit = Boolean(entry);
  const seed = entry ?? prefillFrom ?? null;
  const carriedFrom =
    !isEdit && prefillFrom && prefillFrom.fullEaters.length + prefillFrom.halfPairs.length > 0
      ? prefillFrom.date
      : null;

  // Parent remounts this component (via `key`) each time the sheet opens,
  // so initial state is derived straight from props.
  const [date, setDate] = useState(() => (entry ? entry.date.slice(0, 10) : todayInputValue()));
  const [fullEaters, setFullEaters] = useState<FullEaterDraft[]>(
    () => seed?.fullEaters.map((e) => ({ name: e.name, variant: e.variant, count: e.count })) ?? [],
  );
  const [halfPairs, setHalfPairs] = useState<PairDraft[]>(
    () => seed?.halfPairs.map((p) => ({ names: [...p.names] as [string, string], variant: p.variant })) ?? [],
  );
  const [pending, setPending] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function clearAll() {
    setFullEaters([]);
    setHalfPairs([]);
    setPending(null);
  }

  const price = entry?.pricePerMeal ?? settings?.pricePerMeal ?? 0;
  const currency = settings?.currency ?? "₹";
  const variants = settings?.foodVariants ?? [];
  const variantPrice = (name: string | null): number =>
    name ? (variants.find((v) => v.name.toLowerCase() === name.toLowerCase())?.price ?? price) : price;

  const used = useMemo(
    () => [...fullEaters.map((e) => e.name), ...halfPairs.flatMap((p) => p.names), ...(pending ? [pending] : [])],
    [fullEaters, halfPairs, pending],
  );

  const mealCount = fullEaters.reduce((t, e) => t + e.count, 0) + halfPairs.length;
  const total =
    fullEaters.reduce((t, e) => t + variantPrice(e.variant) * e.count, 0) +
    halfPairs.reduce((t, p) => t + variantPrice(p.variant), 0);

  function addFull(name: string) {
    const person = persons.find((p) => p.name.toLowerCase() === name.toLowerCase());
    const preferred = person?.preferredVariant ?? settings?.defaultVariant ?? null;
    setFullEaters((prev) => [...prev, { name, variant: preferred, count: 1 }]);
  }
  function removeFull(name: string) {
    setFullEaters((prev) => prev.filter((e) => e.name !== name));
  }
  function updateFull(name: string, patch: Partial<FullEaterDraft>) {
    setFullEaters((prev) => prev.map((e) => (e.name === name ? { ...e, ...patch } : e)));
  }
  function addToPair(name: string) {
    if (!pending) {
      setPending(name);
    } else {
      setHalfPairs((prev) => [...prev, { names: [pending, name], variant: settings?.defaultVariant ?? null }]);
      setPending(null);
    }
  }
  function removePair(idx: number) {
    setHalfPairs((prev) => prev.filter((_, i) => i !== idx));
  }
  function updatePairVariant(idx: number, variant: string | null) {
    setHalfPairs((prev) => prev.map((p, i) => (i === idx ? { ...p, variant } : p)));
  }

  async function save() {
    if (mealCount === 0) {
      toast.error("Add at least one eater");
      return;
    }
    setSaving(true);
    const payload = {
      date,
      fullEaters: fullEaters.map((e) => ({ name: e.name, variant: e.variant, count: e.count })),
      halfPairs: halfPairs.map((p) => ({ names: p.names, variant: p.variant })),
    };
    try {
      if (isEdit && entry) {
        await mutateApi(`/api/entries/${entry._id}`, "PATCH", payload);
      } else {
        await mutateApi("/api/entries", "POST", payload);
      }
      await refreshEntries();
      toast.success(isEdit ? "Entry updated" : "Entry added");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto flex max-h-[92vh] max-w-lg flex-col overflow-hidden rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit" : "Add"}</SheetTitle>
          <SheetDescription>Pick who’s eating, their food, and how many meals.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4">
          <div className="space-y-2">
            <Label htmlFor="entry-date">Date</Label>
            <Input
              id="entry-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {carriedFrom && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                Carried over from {formatDate(carriedFrom)} — remove anyone not eating.
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="shrink-0 cursor-pointer font-medium underline underline-offset-2"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Full meal</Label>
              <PersonCombobox onPick={addFull} exclude={used} label="Add" />
            </div>
            {fullEaters.length > 0 ? (
              <div className="space-y-2">
                {fullEaters.map((eater) => (
                  <div key={eater.name} className="flex items-center gap-2 rounded-lg border px-2.5 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{eater.name}</span>
                    <Select
                      value={eater.variant ?? NO_VARIANT}
                      onValueChange={(v) => updateFull(eater.name, { variant: v === NO_VARIANT ? null : v })}
                    >
                      <SelectTrigger size="sm" className="w-28 text-xs">
                        <SelectValue placeholder="Food" />
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
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateFull(eater.name, { count: Math.max(1, eater.count - 1) })}
                        disabled={eater.count <= 1}
                        className="flex size-6 cursor-pointer items-center justify-center rounded-md border disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Decrease meals for ${eater.name}`}
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="w-4 text-center text-xs tabular-nums">{eater.count}</span>
                      <button
                        type="button"
                        onClick={() => updateFull(eater.name, { count: Math.min(20, eater.count + 1) })}
                        disabled={eater.count >= 20}
                        className="flex size-6 cursor-pointer items-center justify-center rounded-md border disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Increase meals for ${eater.name}`}
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFull(eater.name)}
                      className="cursor-pointer rounded-full p-1 text-muted-foreground hover:bg-muted"
                      aria-label={`Remove ${eater.name}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No full eaters.</p>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Half meal (pairs)</Label>
              <PersonCombobox
                onPick={addToPair}
                exclude={used}
                label={pending ? "Pick partner" : "Add pair"}
              />
            </div>
            {pending && (
              <p className="text-sm text-muted-foreground">
                Pairing <span className="font-medium text-foreground">{pending}</span> with… pick one
                more. <button className="cursor-pointer underline" type="button" onClick={() => setPending(null)}>cancel</button>
              </p>
            )}
            {halfPairs.length > 0 ? (
              <div className="space-y-2">
                {halfPairs.map((pair, idx) => (
                  <div key={`${pair.names[0]}-${pair.names[1]}-${idx}`} className="flex items-center gap-2 rounded-lg border px-2.5 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {pair.names[0]} + {pair.names[1]}
                    </span>
                    <Select
                      value={pair.variant ?? NO_VARIANT}
                      onValueChange={(v) => updatePairVariant(idx, v === NO_VARIANT ? null : v)}
                    >
                      <SelectTrigger size="sm" className="w-28 text-xs">
                        <SelectValue placeholder="Food" />
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
                    <button
                      type="button"
                      onClick={() => removePair(idx)}
                      className="cursor-pointer rounded-full p-1 text-muted-foreground hover:bg-muted"
                      aria-label={`Remove pair of ${pair.names[0]} and ${pair.names[1]}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No pairs.</p>
            )}
          </section>
        </div>

        <div className="space-y-3 border-t px-4 pt-3">
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              {mealCount} meal{mealCount === 1 ? "" : "s"}
              {mealCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="ml-2 cursor-pointer underline underline-offset-2 hover:text-foreground"
                >
                  clear
                </button>
              )}
            </span>
            <span className="text-base font-semibold">{formatMoney(total, currency)}</span>
          </div>

          <SheetFooter className="p-0 pb-4">
            <Button onClick={save} disabled={saving || mealCount === 0}>
              {saving && <Spinner />}
              {saving ? "Saving…" : isEdit ? "Save" : "Add"}
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
