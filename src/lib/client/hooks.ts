"use client";

import useSWR from "swr";
import { fetcher } from "./fetcher";
import type {
  FoodVariant,
  MealEntry,
  MemberDateOrder,
  NotificationItem,
  QueueOrderItem,
  Settings,
  SettlementDetail,
  SettlementSummary,
} from "@/types";

export interface PersonOption {
  _id: string;
  name: string;
  phone?: string;
  preferredVariant?: string;
  blocked?: boolean;
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
  return useSWR<SettlementSummary[]>("/api/settlements", fetcher);
}

export function useSettlementDetail(id: string | null) {
  return useSWR<SettlementDetail>(id ? `/api/settlements/${id}` : null, fetcher);
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

/** Admin's live queue view — polls so newly-submitted member orders show up without a manual refresh. */
export function useQueue() {
  return useSWR<QueueOrderItem[]>("/api/queue", fetcher, { refreshInterval: 5000 });
}

export interface MemberSettings {
  messName: string;
  currency: string;
  foodVariants: FoodVariant[];
  orderCutoffTime: string;
  orderReminderMinutes: number;
  messClosedFrom: string | null;
  messClosedTo: string | null;
  messClosedMessage: string;
}

export function useMemberSettings() {
  return useSWR<MemberSettings>("/api/member/settings", fetcher);
}

export interface MemberLastOrderDraft {
  kind: "full" | "half";
  variant: string | null;
  count: number;
  partnerName: string | null;
}

export interface MemberOrders {
  today: MemberDateOrder;
  tomorrow: MemberDateOrder;
  todayDate: string;
  tomorrowDate: string;
  lastOrder: MemberLastOrderDraft | null;
}

export function useMemberOrders() {
  return useSWR<MemberOrders>("/api/member/order", fetcher);
}

export interface MemberPersonOption {
  _id: string;
  name: string;
}

export function useMemberPersons() {
  return useSWR<MemberPersonOption[]>("/api/member/persons", fetcher);
}

export function useLatestNotification() {
  return useSWR<NotificationItem | null>("/api/member/notifications/latest", fetcher, {
    refreshInterval: 30000,
  });
}
