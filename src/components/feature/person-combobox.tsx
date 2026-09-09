"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, UserPlus } from "lucide-react";
import { mutate as globalMutate } from "swr";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { usePersons } from "@/lib/client/hooks";
import { mutateApi } from "@/lib/client/fetcher";
import type { Person } from "@/types";

interface Props {
  onPick: (name: string) => void;
  exclude?: string[];
  label?: string;
  disabled?: boolean;
}

export function PersonCombobox({ onPick, exclude = [], label = "Add person", disabled }: Props) {
  const { data: persons = [] } = usePersons();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const excludeLc = useMemo(() => new Set(exclude.map((e) => e.toLowerCase())), [exclude]);
  const available = persons.filter((p) => !excludeLc.has(p.name.toLowerCase()));
  const exactExists = persons.some((p) => p.name.toLowerCase() === query.trim().toLowerCase());
  const trimmed = query.trim();

  function pick(name: string) {
    onPick(name);
    setOpen(false);
    setQuery("");
  }

  async function createAndPick() {
    if (!trimmed) return;
    setCreating(true);
    try {
      const person = await mutateApi<Person>("/api/persons", "POST", { name: trimmed });
      await globalMutate("/api/persons");
      pick(person.name);
      toast.success(`Added ${person.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add person");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled} className="gap-1.5">
          <Plus className="size-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command shouldFilter>
          <CommandInput placeholder="Search or add…" value={query} onValueChange={setQuery} />
          <CommandList>
            {available.length === 0 && !trimmed && (
              <CommandEmpty>No people yet — type a name.</CommandEmpty>
            )}
            {available.length > 0 && (
              <CommandGroup heading="People">
                {available.map((p) => (
                  <CommandItem key={p._id} value={p.name} onSelect={() => pick(p.name)}>
                    {p.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {trimmed && !exactExists && (
              <CommandGroup heading="New">
                <CommandItem
                  value={`__add__${trimmed}`}
                  onSelect={createAndPick}
                  disabled={creating}
                >
                  <UserPlus className="size-4" />
                  Add “{trimmed}” as new person
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
