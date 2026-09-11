import type { MealEntry, Settlement, Settings } from "@/types";

interface EntryLike {
  _id: { toString(): string };
  date: Date | string;
  fullEaters?: string[];
  halfPairs?: string[][];
  pricePerMeal: number;
  mealCount: number;
  totalAmount: number;
  paidBy?: string[];
  settlementId?: { toString(): string } | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface SettlementLike {
  _id: { toString(): string };
  dateFrom: Date | string;
  dateTo: Date | string;
  note?: string;
  totalAmount: number;
  mealEntryIds?: { toString(): string }[];
  createdAt: Date | string;
}

interface SettingsLike {
  pricePerMeal: number;
  messName: string;
  currency: string;
  updatedAt: Date | string;
}

export function serializeEntry(doc: EntryLike): MealEntry {
  return {
    _id: doc._id.toString(),
    date: new Date(doc.date).toISOString(),
    fullEaters: doc.fullEaters ?? [],
    halfPairs: (doc.halfPairs ?? []).map((p) => [p[0], p[1]] as [string, string]),
    pricePerMeal: doc.pricePerMeal,
    mealCount: doc.mealCount,
    totalAmount: doc.totalAmount,
    paidBy: doc.paidBy ?? [],
    settlementId: doc.settlementId ? doc.settlementId.toString() : null,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

export function serializeSettlement(doc: SettlementLike): Settlement {
  return {
    _id: doc._id.toString(),
    dateFrom: new Date(doc.dateFrom).toISOString(),
    dateTo: new Date(doc.dateTo).toISOString(),
    note: doc.note ?? "",
    totalAmount: doc.totalAmount,
    mealEntryIds: (doc.mealEntryIds ?? []).map((id) => id.toString()),
    createdAt: new Date(doc.createdAt).toISOString(),
  };
}

export function serializeSettings(doc: SettingsLike): Settings {
  return {
    pricePerMeal: doc.pricePerMeal,
    messName: doc.messName,
    currency: doc.currency,
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}
