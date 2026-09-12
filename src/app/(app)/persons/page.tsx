"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonCombobox } from "@/components/feature/person-combobox";
import { PersonProfile } from "@/components/feature/person-profile";
import { ManagePeopleList } from "@/components/feature/manage-people-list";
import { EmptyState } from "@/components/feature/states";
import { usePersons } from "@/lib/client/hooks";

export default function PersonsPage() {
  const { data: persons = [] } = usePersons();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-4 lg:space-y-6">
      <h1 className="text-xl font-semibold lg:text-2xl">People</h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="manage">Manage</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4 pt-4">
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
        </TabsContent>

        <TabsContent value="manage" className="pt-4">
          <ManagePeopleList
            onRenamed={(oldName, newName) => setSelected((cur) => (cur === oldName ? newName : cur))}
            onDeleted={(name) => setSelected((cur) => (cur === name ? null : cur))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
