"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useMemberPersons } from "@/lib/client/hooks";
import { cn } from "@/lib/utils";

interface Props {
  value: string | null;
  onChange: (name: string) => void;
  excludeName: string;
}

/** Member-facing partner picker for a half meal — names only, no "add new person" (members
 * can't create Person records), mirrors PersonCombobox's search UX but is a separate
 * component so admin and member code paths stay fully isolated. */
export function MemberPartnerPicker({ value, onChange, excludeName }: Props) {
  const { data: persons = [] } = useMemberPersons();
  const [open, setOpen] = useState(false);

  const options = useMemo(
    () => persons.filter((p) => p.name.toLowerCase() !== excludeName.toLowerCase()),
    [persons, excludeName],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between font-normal">
          {value ?? "Pick a partner"}
          <ChevronsUpDown className="size-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command shouldFilter>
          <CommandInput placeholder="Search people…" />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {options.map((p) => (
                <CommandItem
                  key={p._id}
                  value={p.name}
                  onSelect={() => {
                    onChange(p.name);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("size-4", value === p.name ? "opacity-100" : "opacity-0")} />
                  {p.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
