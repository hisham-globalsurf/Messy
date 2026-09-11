"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Phone, Search, Trash2, Users } from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";
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
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return persons;
    return persons.filter((p) => p.name.toLowerCase().includes(q) || (p.phone ?? "").toLowerCase().includes(q));
  }, [persons, query]);

  function handleOpenChange(next: boolean) {
    if (!next) setQuery("");
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage people</DialogTitle>
          <DialogDescription>
            Fix a spelling and it updates everywhere. Deleting a person keeps their past entries.
          </DialogDescription>
        </DialogHeader>

        {persons.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <Users className="size-8 text-muted-foreground/50" />
            No people yet.
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or number…"
                className="h-9 pl-8"
                autoFocus={false}
              />
            </div>

            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No one matches “{query}”.
              </p>
            ) : (
              <ul className="-mx-1 max-h-[55vh] space-y-2 overflow-y-auto px-1 py-0.5">
                {filtered.map((p) => (
                  <PersonRow key={p._id} person={p} onRenamed={onRenamed} onDeleted={onDeleted} />
                ))}
              </ul>
            )}
          </>
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
  const [phone, setPhone] = useState(person.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const dirty =
    (name.trim() !== person.name && name.trim().length > 0) || phone.trim() !== (person.phone ?? "");

  async function save() {
    const next = name.trim();
    setBusy(true);
    try {
      const res = await mutateApi<{ updatedEntries: number }>(
        `/api/persons/${person._id}`,
        "PATCH",
        { name: next, phone: phone.trim() },
      );
      await refreshEntries();
      if (next !== person.name) onRenamed?.(person.name, next);
      toast.success(
        res.updatedEntries > 0
          ? `Saved — updated ${res.updatedEntries} ${res.updatedEntries === 1 ? "entry" : "entries"}`
          : "Saved",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
      setName(person.name);
      setPhone(person.phone ?? "");
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
    <li
      className={`rounded-xl border bg-card p-2.5 transition-colors ${dirty ? "border-primary/40" : "border-border"}`}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {person.name.trim().charAt(0).toUpperCase() || "?"}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <Input
            value={name}
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && dirty) save();
              if (e.key === "Escape") setName(person.name);
            }}
            placeholder="Name"
            className="h-9"
          />
          <div className="relative">
            <Phone className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={phone}
              disabled={busy}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && dirty) save();
                if (e.key === "Escape") setPhone(person.phone ?? "");
              }}
              placeholder="WhatsApp number"
              className="h-9 pl-8"
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-1.5">
          <Button
            size="icon"
            variant="secondary"
            className="size-9"
            disabled={!dirty || busy}
            onClick={save}
            aria-label={`Save details for ${person.name}`}
          >
            {busy ? <Spinner /> : <Check className="size-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-9 text-muted-foreground hover:text-destructive"
            disabled={busy}
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${person.name}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

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
              {busy && <Spinner />}
              {busy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
