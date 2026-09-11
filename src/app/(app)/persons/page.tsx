"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PersonCombobox } from "@/components/feature/person-combobox";
import { PersonProfile } from "@/components/feature/person-profile";
import { ManagePeopleDialog } from "@/components/feature/manage-people-dialog";
import { EmptyState } from "@/components/feature/states";
import { usePersons } from "@/lib/client/hooks";

export default function PersonsPage() {
  const { data: persons = [] } = usePersons();
  const [selected, setSelected] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold lg:text-2xl">People</h1>
        <Button variant="outline" size="sm" onClick={() => setManageOpen(true)} disabled={persons.length === 0}>
          <Settings2 className="size-4" />
          Manage
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <PersonCombobox label={selected ?? "Search a person"} onPick={setSelected} />
        {persons.slice(0, 8).map((p) => (
          <button key={p._id} type="button" className="cursor-pointer" onClick={() => setSelected(p.name)}>
            <Badge variant={selected === p.name ? "default" : "secondary"}>{p.name}</Badge>
          </button>
        ))}
      </div>

      {selected ? (
        <PersonProfile key={selected} name={selected} />
      ) : (
        <EmptyState
          title="Pick a person"
          hint="See their meal history, what they owe, and share a settlement card."
        />
      )}

      <ManagePeopleDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        onRenamed={(oldName, newName) => setSelected((cur) => (cur === oldName ? newName : cur))}
        onDeleted={(name) => setSelected((cur) => (cur === name ? null : cur))}
      />
    </div>
  );
}
