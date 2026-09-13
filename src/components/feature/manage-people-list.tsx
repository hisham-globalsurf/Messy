"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Phone, Plus, Search, Trash2, Users, X } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mutateApi } from "@/lib/client/fetcher";
import { mutate as globalMutate } from "swr";
import { refreshEntries } from "@/lib/client/entries";
import { usePersons, useSettings, type PersonOption } from "@/lib/client/hooks";

const NO_VARIANT = "__none__";

interface Props {
  onRenamed?: (oldName: string, newName: string) => void;
  onDeleted?: (name: string) => void;
}

export function ManagePeopleList({ onRenamed, onDeleted }: Props) {
  const { data: persons = [] } = usePersons();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return persons;
    return persons.filter((p) => p.name.toLowerCase().includes(q) || (p.phone ?? "").toLowerCase().includes(q));
  }, [persons, query]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or number…"
            className="h-9 pl-8"
          />
        </div>
        <Button size="sm" variant={adding ? "secondary" : "outline"} onClick={() => setAdding((v) => !v)} className="gap-1.5">
          {adding ? <X className="size-4" /> : <Plus className="size-4" />}
          {adding ? "Cancel" : "Add"}
        </Button>
      </div>

      {adding && <AddPersonForm onAdded={() => setAdding(false)} />}

      {persons.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          <Users className="size-8 text-muted-foreground/50" />
          No people yet.
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No one matches &ldquo;{query}&rdquo;.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => (
            <PersonRow key={p._id} person={p} onRenamed={onRenamed} onDeleted={onDeleted} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AddPersonForm({ onAdded }: { onAdded: () => void }) {
  const { data: settings } = useSettings();
  const variants = settings?.foodVariants ?? [];

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredVariant, setPreferredVariant] = useState(settings?.defaultVariant ?? NO_VARIANT);
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      await mutateApi("/api/persons", "POST", {
        name: trimmed,
        phone: phone.trim(),
        preferredVariant: preferredVariant === NO_VARIANT ? undefined : preferredVariant,
      });
      await globalMutate("/api/persons");
      toast.success(`Added ${trimmed}`);
      onAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add person");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-primary/40 bg-card p-2.5">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        placeholder="Name"
        className="h-9"
        autoFocus
      />
      <div className="relative">
        <Phone className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="WhatsApp number"
          className="h-9 pl-8"
        />
      </div>
      {variants.length > 0 && (
        <Select value={preferredVariant} onValueChange={setPreferredVariant}>
          <SelectTrigger size="sm" className="h-9 w-full">
            <SelectValue placeholder="Food preference" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_VARIANT}>No food preference</SelectItem>
            {variants.map((v) => (
              <SelectItem key={v.name} value={v.name}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button size="sm" className="w-full" onClick={save} disabled={saving || !name.trim()}>
        {saving && <Spinner />}
        {saving ? "Adding…" : "Add person"}
      </Button>
    </div>
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
  const { data: settings } = useSettings();
  const variants = settings?.foodVariants ?? [];

  const [name, setName] = useState(person.name);
  const [phone, setPhone] = useState(person.phone ?? "");
  const [preferredVariant, setPreferredVariant] = useState(
    person.preferredVariant ?? settings?.defaultVariant ?? NO_VARIANT,
  );
  const [busy, setBusy] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const dirty =
    (name.trim() !== person.name && name.trim().length > 0) ||
    phone.trim() !== (person.phone ?? "") ||
    preferredVariant !== (person.preferredVariant ?? settings?.defaultVariant ?? NO_VARIANT);

  async function save() {
    const next = name.trim();
    setBusy(true);
    try {
      const res = await mutateApi<{ updatedEntries: number }>(
        `/api/persons/${person._id}`,
        "PATCH",
        {
          name: next,
          phone: phone.trim(),
          preferredVariant: preferredVariant === NO_VARIANT ? undefined : preferredVariant,
        },
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
      setPreferredVariant(person.preferredVariant ?? settings?.defaultVariant ?? NO_VARIANT);
    } finally {
      setBusy(false);
    }
  }

  async function toggleBlocked(blocked: boolean) {
    setBlocking(true);
    try {
      await mutateApi(`/api/persons/${person._id}/block`, "PATCH", { blocked });
      await globalMutate("/api/persons");
      toast.success(blocked ? `${person.name} is blocked` : `${person.name} is unblocked`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    } finally {
      setBlocking(false);
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
          {variants.length > 0 && (
            <Select
              value={preferredVariant}
              onValueChange={setPreferredVariant}
              disabled={busy}
            >
              <SelectTrigger size="sm" className="h-9 w-full">
                <SelectValue placeholder="Food preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_VARIANT}>No food preference</SelectItem>
                {variants.map((v) => (
                  <SelectItem key={v.name} value={v.name}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5">
            <Label htmlFor={`blocked-${person._id}`} className="text-xs text-muted-foreground">
              Blocked — can&apos;t log in or order
            </Label>
            <div className="flex items-center gap-1.5">
              {blocking && <Spinner className="size-3.5" />}
              <Switch
                id={`blocked-${person._id}`}
                size="sm"
                checked={person.blocked ?? false}
                disabled={blocking}
                onCheckedChange={toggleBlocked}
              />
            </div>
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
