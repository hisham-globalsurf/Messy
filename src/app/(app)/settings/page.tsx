"use client";

import { useState } from "react";
import { mutate as globalMutate } from "swr";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "@/components/feature/theme-toggle";
import { ListSkeleton } from "@/components/feature/states";
import { Spinner } from "@/components/ui/spinner";
import { useSettings } from "@/lib/client/hooks";
import { mutateApi } from "@/lib/client/fetcher";
import type { FoodVariant, Settings } from "@/types";

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();

  return (
    <div className="space-y-4 lg:space-y-6">
      <h1 className="text-xl font-semibold lg:text-2xl">Settings</h1>
      {isLoading || !settings ? (
        <ListSkeleton rows={3} />
      ) : (
        <>
          <MessForm key={settings.updatedAt} settings={settings} />
          <FoodVariantsForm key={`variants-${settings.updatedAt}`} settings={settings} />
          <SupplierForm key={`supplier-${settings.updatedAt}`} settings={settings} />
        </>
      )}
      <PasswordForm />

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Theme applies to this device.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm">Light / Dark / System</span>
          <ThemeToggle />
        </CardContent>
      </Card>
    </div>
  );
}

function MessForm({ settings }: { settings: Settings }) {
  const [messName, setMessName] = useState(settings.messName);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await mutateApi("/api/settings", "PATCH", { messName: messName.trim() });
      await globalMutate("/api/settings");
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mess</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mess-name">Mess name</Label>
            <Input id="mess-name" value={messName} onChange={(e) => setMessName(e.target.value)} required />
          </div>
          <Button type="submit" disabled={saving}>
            {saving && <Spinner />}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

const NO_DEFAULT = "__none__";

function FoodVariantsForm({ settings }: { settings: Settings }) {
  const [variants, setVariants] = useState<FoodVariant[]>(settings.foodVariants);
  const [defaultVariant, setDefaultVariant] = useState(settings.defaultVariant ?? NO_DEFAULT);
  const [saving, setSaving] = useState(false);

  function addVariant() {
    setVariants((prev) => [...prev, { name: "", price: 0 }]);
  }
  function updateVariant(idx: number, patch: Partial<FoodVariant>) {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  }
  function removeVariant(idx: number) {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = variants.map((v) => ({ name: v.name.trim(), price: Number(v.price) }));
    if (cleaned.some((v) => !v.name || !Number.isFinite(v.price) || v.price < 0)) {
      toast.error("Every variant needs a name and a valid price");
      return;
    }
    const names = cleaned.map((v) => v.name.toLowerCase());
    if (new Set(names).size !== names.length) {
      toast.error("Variant names must be unique");
      return;
    }
    const resolvedDefault =
      defaultVariant !== NO_DEFAULT && names.includes(defaultVariant.toLowerCase()) ? defaultVariant : null;
    setSaving(true);
    try {
      await mutateApi("/api/settings", "PATCH", { foodVariants: cleaned, defaultVariant: resolvedDefault });
      await globalMutate("/api/settings");
      toast.success("Food variants saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Food variants</CardTitle>
        <CardDescription>e.g. Veg, Non-veg — each with its own price per meal.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          {variants.length > 0 ? (
            <div className="space-y-2">
              {variants.map((v, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={v.name}
                    onChange={(e) => updateVariant(idx, { name: e.target.value })}
                    placeholder="Name"
                    className="flex-1"
                    maxLength={40}
                    required
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={v.price}
                    onChange={(e) => updateVariant(idx, { price: Number(e.target.value) })}
                    placeholder="Price"
                    className="w-24"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeVariant(idx)}
                    aria-label={`Remove ${v.name || "variant"}`}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No food variants yet.</p>
          )}

          {variants.some((v) => v.name.trim()) && (
            <div className="space-y-2">
              <Label>Default food preference</Label>
              <Select value={defaultVariant} onValueChange={setDefaultVariant}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DEFAULT}>No default</SelectItem>
                  {variants
                    .filter((v) => v.name.trim())
                    .map((v) => (
                      <SelectItem key={v.name} value={v.name}>
                        {v.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for a person who hasn’t set their own food preference.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addVariant} className="gap-1.5">
              <Plus className="size-4" />
              Add variant
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Spinner />}
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SupplierForm({ settings }: { settings: Settings }) {
  const [phone, setPhone] = useState(settings.supplierPhone ?? "");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await mutateApi("/api/settings", "PATCH", { supplierPhone: phone.trim() });
      await globalMutate("/api/settings");
      toast.success("Supplier number saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Food supplier</CardTitle>
        <CardDescription>WhatsApp number for the daily meal-count message.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supplier-phone">Supplier WhatsApp number</Label>
            <Input
              id="supplier-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +919876543210"
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving && <Spinner />}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordForm() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      toast.error("New passwords don’t match");
      return;
    }
    setSaving(true);
    try {
      await mutateApi("/api/auth/change-password", "POST", { currentPassword, newPassword });
      toast.success("Password changed");
      setCurrent("");
      setNew("");
      setConfirm("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin password</CardTitle>
        <CardDescription>You’ll stay signed in on this device.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current">Current password</Label>
            <Input
              id="current"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new">New password</Label>
              <Input
                id="new"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNew(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>
          <Button type="submit" disabled={saving}>
            {saving && <Spinner />}
            {saving ? "Updating…" : "Change password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
