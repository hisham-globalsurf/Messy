"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PersonCombobox } from "@/components/feature/person-combobox";
import { formatDate } from "@/lib/format";

export interface Filters {
  from: string;
  to: string;
  person: string;
}

interface Props {
  value: Filters;
  onChange: (next: Filters) => void;
}

export function EntryFilters({ value, onChange }: Props) {
  const count = [value.from || value.to, value.person].filter(Boolean).length;
  const rangeLabel =
    value.from && value.to
      ? `${formatDate(value.from)} – ${formatDate(value.to)}`
      : value.from
        ? `From ${formatDate(value.from)}`
        : value.to
          ? `Until ${formatDate(value.to)}`
          : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <SlidersHorizontal className="size-4" />
            Filters
            {count > 0 && (
              <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {count}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="filter-from" className="text-xs">From</Label>
              <Input
                id="filter-from"
                type="date"
                value={value.from}
                onChange={(e) => onChange({ ...value, from: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-to" className="text-xs">To</Label>
              <Input
                id="filter-to"
                type="date"
                value={value.to}
                onChange={(e) => onChange({ ...value, to: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Person</Label>
            <PersonCombobox
              label={value.person || "Any person"}
              onPick={(person) => onChange({ ...value, person })}
            />
          </div>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange({ from: "", to: "", person: "" })}
            >
              Clear filters
            </Button>
          )}
        </PopoverContent>
      </Popover>

      {value.person && (
        <FilterChip label={value.person} onClear={() => onChange({ ...value, person: "" })} />
      )}
      {rangeLabel && (
        <FilterChip label={rangeLabel} onClear={() => onChange({ ...value, from: "", to: "" })} />
      )}
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <Badge variant="secondary" className="gap-1 py-1 pl-2.5 pr-1 font-normal">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Clear ${label}`}
        className="cursor-pointer rounded-full p-0.5 hover:bg-background/60"
      >
        <X className="size-3" />
      </button>
    </Badge>
  );
}
