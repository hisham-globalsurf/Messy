export interface Person {
  _id: string;
  name: string;
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
