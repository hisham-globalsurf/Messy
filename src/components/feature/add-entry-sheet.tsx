"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { PersonCombobox } from "@/components/feature/person-combobox";
import { mutateApi } from "@/lib/client/fetcher";
import { refreshEntries } from "@/lib/client/entries";
import { useSettings } from "@/lib/client/hooks";
import { formatDate, formatMoney, todayInputValue } from "@/lib/format";
import type { MealEntry } from "@/types";

type Pair = [string, string];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: MealEntry | null;
  /** In create mode, seed the eater lists from this entry (usually the previous day). */
  prefillFrom?: MealEntry | null;
}

export function AddEntrySheet({ open, onOpenChange, entry, prefillFrom }: Props) {
  const { data: settings } = useSettings();
  const isEdit = Boolean(entry);
  const seed = entry ?? prefillFrom ?? null;
  const carriedFrom =
    !isEdit && prefillFrom && prefillFrom.fullEaters.length + prefillFrom.halfPairs.length > 0
      ? prefillFrom.date
      : null;

  // Parent remounts this component (via `key`) each time the sheet opens,
  // so initial state is derived straight from props.
  const [date, setDate] = useState(() => (entry ? entry.date.slice(0, 10) : todayInputValue()));
  const [fullEaters, setFullEaters] = useState<string[]>(() => seed?.fullEaters ?? []);
  const [halfPairs, setHalfPairs] = useState<Pair[]>(() =>
    seed ? seed.halfPairs.map((p) => [...p] as Pair) : [],
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

  const used = useMemo(
    () => [...fullEaters, ...halfPairs.flat(), ...(pending ? [pending] : [])],
    [fullEaters, halfPairs, pending],
  );

  const mealCount = fullEaters.length + halfPairs.length;
  const total = mealCount * price;

  function addFull(name: string) {
    setFullEaters((prev) => [...prev, name]);
  }
  function removeFull(name: string) {
    setFullEaters((prev) => prev.filter((n) => n !== name));
  }
  function addToPair(name: string) {
    if (!pending) {
      setPending(name);
    } else {
      setHalfPairs((prev) => [...prev, [pending, name]]);
      setPending(null);
    }
  }
  function removePair(idx: number) {
    setHalfPairs((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    if (mealCount === 0) {
      toast.error("Add at least one eater");
      return;
    }
    setSaving(true);
    const payload = { date, fullEaters, halfPairs };
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
      <SheetContent side="bottom" className="mx-auto max-h-[92vh] max-w-lg overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit entry" : "Add entry"}</SheetTitle>
          <SheetDescription>
            {formatMoney(price, currency)} per meal
            {isEdit ? " (locked at entry time)" : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4">
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

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Full meal</Label>
              <PersonCombobox onPick={addFull} exclude={used} label="Add" />
            </div>
            {fullEaters.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {fullEaters.map((name) => (
                  <Badge key={name} variant="secondary" className="gap-1 py-1 pl-2.5 pr-1">
                    {name}
                    <button
                      type="button"
                      onClick={() => removeFull(name)}
                      className="cursor-pointer rounded-full p-0.5 hover:bg-background/60"
                      aria-label={`Remove ${name}`}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
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
              <div className="flex flex-wrap gap-2">
                {halfPairs.map((pair, idx) => (
                  <Badge key={`${pair[0]}-${pair[1]}-${idx}`} variant="outline" className="gap-1 py-1 pl-2.5 pr-1">
                    {pair[0]} + {pair[1]}
                    <button
                      type="button"
                      onClick={() => removePair(idx)}
                      className="cursor-pointer rounded-full p-0.5 hover:bg-muted"
                      aria-label="Remove pair"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No pairs.</p>
            )}
          </section>

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
        </div>

        <SheetFooter>
          <Button onClick={save} disabled={saving || mealCount === 0}>
            {saving && <Spinner />}
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add entry"}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
