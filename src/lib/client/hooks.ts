"use client";

import useSWR from "swr";
import { fetcher } from "./fetcher";
import type { MealEntry, Settings, Settlement } from "@/types";

export interface PersonOption {
  _id: string;
  name: string;
  createdAt: string;
  uses: number;
}

export function usePersons() {
  return useSWR<PersonOption[]>("/api/persons", fetcher);
}

export function useSettings() {
  return useSWR<Settings>("/api/settings", fetcher);
}

export function useSettlements() {
  return useSWR<Settlement[]>("/api/settlements", fetcher);
}

export interface EntryFilters {
  from?: string;
  to?: string;
  settled?: boolean;
  person?: string;
}

export function entriesKey(filters: EntryFilters): string {
  const sp = new URLSearchParams();
  if (filters.from) sp.set("from", filters.from);
  if (filters.to) sp.set("to", filters.to);
  if (filters.settled !== undefined) sp.set("settled", String(filters.settled));
  if (filters.person) sp.set("person", filters.person);
  const qs = sp.toString();
  return `/api/entries${qs ? `?${qs}` : ""}`;
}

export function useEntries(filters: EntryFilters) {
  return useSWR<MealEntry[]>(entriesKey(filters), fetcher);
}
