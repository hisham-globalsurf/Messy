"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { mutateApi } from "@/lib/client/fetcher";
import { refreshEntries } from "@/lib/client/entries";
import { usePersons, type PersonOption } from "@/lib/client/hooks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRenamed?: (oldName: string, newName: string) => void;
  onDeleted?: (name: string) => void;
}

export function ManagePeopleDialog({ open, onOpenChange, onRenamed, onDeleted }: Props) {
  const { data: persons = [] } = usePersons();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage people</DialogTitle>
          <DialogDescription>
            Fix a spelling and it updates everywhere. Deleting a person keeps their past entries.
          </DialogDescription>
        </DialogHeader>

        {persons.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No people yet.</p>
        ) : (
          <ul className="-mx-2 max-h-[55vh] space-y-1 overflow-y-auto px-2">
            {persons.map((p) => (
              <PersonRow key={p._id} person={p} onRenamed={onRenamed} onDeleted={onDeleted} />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PersonRow({
  person,
  onRenamed,
  onDeleted,
}: {
  person: PersonOption;
  onRenamed?: (oldName: string, newName: string) => void;
  onDeleted?: (name: string) => void;
}) {
  const [name, setName] = useState(person.name);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const dirty = name.trim() !== person.name && name.trim().length > 0;

  async function rename() {
    const next = name.trim();
    setBusy(true);
    try {
      const res = await mutateApi<{ updatedEntries: number }>(
        `/api/persons/${person._id}`,
        "PATCH",
        { name: next },
      );
      await refreshEntries();
      onRenamed?.(person.name, next);
      toast.success(
        res.updatedEntries > 0
          ? `Renamed — updated ${res.updatedEntries} ${res.updatedEntries === 1 ? "entry" : "entries"}`
          : "Renamed",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not rename");
      setName(person.name);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await mutateApi(`/api/persons/${person._id}`, "DELETE");
      await refreshEntries();
      onDeleted?.(person.name);
      toast.success(`Removed ${person.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <li className="flex items-center gap-2 rounded-lg px-1 py-1">
      <Input
        value={name}
        disabled={busy}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && dirty) rename();
          if (e.key === "Escape") setName(person.name);
        }}
        className="h-9"
      />
      <Button
        size="icon"
        variant="secondary"
        className="size-9 shrink-0"
        disabled={!dirty || busy}
        onClick={rename}
        aria-label={`Save name for ${person.name}`}
      >
        <Check className="size-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
        disabled={busy}
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${person.name}`}
      >
        <Trash2 className="size-4" />
      </Button>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {person.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They’ll be removed from the picker. Entries that already include{" "}
              {person.name} are kept unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} disabled={busy}>
              {busy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
