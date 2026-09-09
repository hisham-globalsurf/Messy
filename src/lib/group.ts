import { monthKey } from "@/lib/format";
import type { MealEntry } from "@/types";

export interface MonthGroup {
  key: string;
  entries: MealEntry[];
  meals: number;
  amount: number;
}

/** Group entries (already sorted newest-first) by calendar month. */
export function groupByMonth(entries: MealEntry[]): MonthGroup[] {
  const groups = new Map<string, MealEntry[]>();
  for (const entry of entries) {
    const key = monthKey(entry.date);
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  }
  return [...groups.entries()].map(([key, list]) => ({
    key,
    entries: list,
    meals: list.reduce((t, e) => t + e.mealCount, 0),
    amount: list.reduce((t, e) => t + e.totalAmount, 0),
  }));
}
