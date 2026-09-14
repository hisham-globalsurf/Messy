"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { usePersons } from "@/lib/client/hooks";
import { cn } from "cn";

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

/** Recipient picker: empty selection reads as "everyone" — the caller decides what that means
 * server-side. Selecting anyone narrows it to just those people. */
export function PersonMultiSelect({ selectedIds, onChange, disabled }: Props) {
  const { data: persons = [] } = usePersons();
  const [open, setOpen] = useState(false);

  const selected = persons.filter((p) => selectedIds.includes(p._id));

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="flex items-center gap-1.5 overflow-hidden">
            <Users className="size-4 shrink-0 text-muted-foreground" />
            {selected.length === 0 ? (
              "All members"
            ) : (
              <span className="flex flex-wrap gap-1 overflow-hidden">
                {selected.length <= 2 ? (
                  selected.map((p) => (
                    <Badge key={p._id} variant="secondary" className="max-w-32 overflow-hidden">
                      <span className="truncate">{p.name}</span>
                    </Badge>
                  ))
                ) : (
                  <Badge variant="secondary">{selected.length} selected</Badge>
                )}
              </span>
            )}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command shouldFilter>
          <CommandInput placeholder="Search people…" />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            {selectedIds.length > 0 && (
              <CommandGroup>
                <CommandItem value="__all__" onSelect={() => onChange([])}>
                  <Users className="size-4 text-muted-foreground" />
                  All members
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="People">
              {persons.map((p) => {
                const isSelected = selectedIds.includes(p._id);
                return (
                  <CommandItem key={p._id} value={p.name} onSelect={() => toggle(p._id)}>
                    <Check className={cn("size-4", isSelected ? "opacity-100" : "opacity-0")} />
                    {p.name}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
