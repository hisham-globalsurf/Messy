export interface Person {
  _id: string;
  name: string;
  phone?: string;
  createdAt: string;
}

/** A single day's meals. Derived fields are computed server-side, never sent by the client. */
export interface MealEntry {
  _id: string;
  date: string; // ISO date (midnight UTC)
  fullEaters: string[];
  halfPairs: [string, string][];
  pricePerMeal: number;
  mealCount: number;
  totalAmount: number;
  /** Names who already paid their own share in cash, independent of settlementId. */
  paidBy: string[];
  settlementId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Settlement {
  _id: string;
  dateFrom: string;
  dateTo: string;
  note: string;
  totalAmount: number;
  mealEntryIds: string[];
  createdAt: string;
}

/** Settlement plus the counts shown in the settlements list. */
export interface SettlementSummary extends Settlement {
  entryCount: number;
  peopleCount: number;
  /** Already collected in cash at meal time (paidBy), independent of the bulk settlement itself. */
  paidAmount: number;
  /** Still to be collected — what a GPay split request should cover. */
  dueAmount: number;
}

export interface SettlementPersonBreakdown {
  name: string;
  phone?: string;
  meals: number;
  amount: number;
  paidAmount: number;
  dueAmount: number;
  dates: string[];
}

/** Per-person breakdown for a single settlement, used by the settlement detail view and share card. */
export interface SettlementDetail extends SettlementSummary {
  people: SettlementPersonBreakdown[];
}

export interface Settings {
  pricePerMeal: number;
  messName: string;
  currency: string;
  updatedAt: string;
}

export interface SessionUser {
  sub: string;
  username: string;
}

/** Per-person breakdown used by the person dashboard and share card. */
export interface PersonStats {
  name: string;
  totalMeals: number;
  totalAmount: number;
  settled: { meals: number; amount: number };
  unsettled: { meals: number; amount: number };
  history: PersonHistoryItem[];
}

export interface PersonHistoryItem {
  entryId: string;
  date: string;
  kind: "full" | "half";
  partner: string | null; // the other person in a half pair
  amount: number;
  settled: boolean;
  settlementId: string | null;
}
