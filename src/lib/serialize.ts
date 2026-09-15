import type {
  FoodVariant,
  FullEaterEntry,
  HalfPairEntry,
  MealEntry,
  NotificationItem,
  QueueOrderItem,
  ReportItem,
  Settlement,
  Settings,
} from "@/types";

interface EntryLike {
  _id: { toString(): string };
  date: Date | string;
  fullEaters?: FullEaterEntry[];
  halfPairs?: HalfPairEntry[];
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
  foodVariants?: FoodVariant[];
  defaultVariant?: string;
  supplierPhone?: string;
  orderCutoffTime: string;
  orderReminderMinutes: number;
  messClosedFrom?: Date | string | null;
  messClosedTo?: Date | string | null;
  messClosedMessage?: string;
  updatedAt: Date | string;
}

interface QueueOrderLike {
  _id: { toString(): string };
  personId: { toString(): string };
  personName: string;
  date: Date | string;
  kind: "full" | "half";
  variant: string | null;
  count: number;
  partnerPersonId?: { toString(): string } | null;
  partnerName: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface NotificationLike {
  _id: { toString(): string };
  message: string;
  createdAt: Date | string;
}

export function serializeEntry(doc: EntryLike): MealEntry {
  return {
    _id: doc._id.toString(),
    date: new Date(doc.date).toISOString(),
    fullEaters: doc.fullEaters ?? [],
    halfPairs: (doc.halfPairs ?? []).map((p) => ({ names: [p.names[0], p.names[1]], variant: p.variant, price: p.price })),
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
    foodVariants: (doc.foodVariants ?? []).map((v) => ({ name: v.name, price: v.price })),
    defaultVariant: doc.defaultVariant || undefined,
    supplierPhone: doc.supplierPhone || undefined,
    orderCutoffTime: doc.orderCutoffTime,
    orderReminderMinutes: doc.orderReminderMinutes,
    messClosedFrom: doc.messClosedFrom ? new Date(doc.messClosedFrom).toISOString().slice(0, 10) : null,
    messClosedTo: doc.messClosedTo ? new Date(doc.messClosedTo).toISOString().slice(0, 10) : null,
    messClosedMessage: doc.messClosedMessage ?? "",
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

export function serializeQueueOrder(doc: QueueOrderLike): QueueOrderItem {
  return {
    _id: doc._id.toString(),
    personId: doc.personId.toString(),
    personName: doc.personName,
    date: new Date(doc.date).toISOString(),
    kind: doc.kind,
    variant: doc.variant,
    count: doc.count,
    partnerPersonId: doc.partnerPersonId ? doc.partnerPersonId.toString() : null,
    partnerName: doc.partnerName,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

export function serializeNotification(doc: NotificationLike): NotificationItem {
  return {
    _id: doc._id.toString(),
    message: doc.message,
    createdAt: new Date(doc.createdAt).toISOString(),
  };
}

interface ReportLike {
  _id: { toString(): string };
  personName: string;
  message: string;
  createdAt: Date | string;
}

export function serializeReport(doc: ReportLike): ReportItem {
  return {
    _id: doc._id.toString(),
    personName: doc.personName,
    message: doc.message,
    createdAt: new Date(doc.createdAt).toISOString(),
  };
}
