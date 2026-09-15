"use client";

import useSWR from "swr";
import { fetcher } from "./fetcher";
import type {
  FoodVariant,
  MealEntry,
  MemberDateOrder,
  NotificationItem,
  QueueOrderItem,
  ReportItem,
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

export function useReports() {
  return useSWR<ReportItem[]>("/api/reports", fetcher);
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
  pricePerMeal: number;
  foodVariants: FoodVariant[];
  orderCutoffTime: string;
  orderReminderMinutes: number;
  messClosedFrom: string | null;
  messClosedTo: string | null;
  messClosedMessage: string;
}

// Member-facing hooks opt back into revalidate-on-focus (off globally, see Providers) —
// a member who switches tabs or backgrounds the app and comes back should immediately see
// whether the admin moved/deleted their order, changed the cutoff, etc., not stale state.
const REVALIDATE_ON_RETURN = { revalidateOnFocus: true, revalidateOnReconnect: true };

export function useMemberSettings() {
  return useSWR<MemberSettings>("/api/member/settings", fetcher, REVALIDATE_ON_RETURN);
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
  return useSWR<MemberOrders>("/api/member/order", fetcher, REVALIDATE_ON_RETURN);
}

export interface MemberPersonOption {
  _id: string;
  name: string;
}

export function useMemberPersons() {
  return useSWR<MemberPersonOption[]>("/api/member/persons", fetcher);
}

// No refreshInterval — Ably (see useMemberRealtime) pushes a revalidate the moment the admin
// changes something, so the 30s poll this used to run is no longer needed. REVALIDATE_ON_RETURN
// stays as the fallback if Ably is unreachable when the member switches back to the tab.
export function useNotifications() {
  return useSWR<NotificationItem[]>("/api/member/notifications", fetcher, REVALIDATE_ON_RETURN);
}

export interface MemberHistoryDay {
  date: string;
  amount: number;
}

export interface MemberHistory {
  days: MemberHistoryDay[];
  totalDue: number;
}

export function useMemberHistory(open: boolean) {
  return useSWR<MemberHistory>(open ? "/api/member/history" : null, fetcher);
}
