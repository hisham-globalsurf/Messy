"use client";

import { useState } from "react";
import { mutate as globalMutate } from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/feature/theme-toggle";
import { ListSkeleton } from "@/components/feature/states";
import { Spinner } from "@/components/ui/spinner";
import { useSettings } from "@/lib/client/hooks";
import { mutateApi } from "@/lib/client/fetcher";
import type { Settings } from "@/types";

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();

  return (
    <div className="space-y-4 lg:space-y-6">
      <h1 className="text-xl font-semibold lg:text-2xl">Settings</h1>
      {isLoading || !settings ? (
        <ListSkeleton rows={3} />
      ) : (
        <MessForm key={settings.updatedAt} settings={settings} />
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
  const [currency, setCurrency] = useState(settings.currency);
  const [pricePerMeal, setPricePerMeal] = useState(String(settings.pricePerMeal));
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(pricePerMeal);
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Enter a valid price");
      return;
    }
    setSaving(true);
    try {
      await mutateApi("/api/settings", "PATCH", {
        messName: messName.trim(),
        currency: currency.trim(),
        pricePerMeal: price,
      });
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
        <CardDescription>Price changes only affect new entries.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mess-name">Mess name</Label>
            <Input id="mess-name" value={messName} onChange={(e) => setMessName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency symbol</Label>
              <Input id="currency" value={currency} maxLength={4} onChange={(e) => setCurrency(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price per meal</Label>
              <Input
                id="price"
                type="number"
                min={0}
                step="0.01"
                value={pricePerMeal}
                onChange={(e) => setPricePerMeal(e.target.value)}
                required
              />
            </div>
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
