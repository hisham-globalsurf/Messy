export interface Person {
  _id: string;
  name: string;
  phone?: string;
  /** Default food variant name for this person — carried into new entries, editable per day. */
  preferredVariant?: string;
  /** Blocked members can't log in or place orders — existing entries/history are unaffected. */
  blocked?: boolean;
  createdAt: string;
}

export interface FoodVariant {
  name: string;
  price: number;
}

/** One full-meal participant in an entry. Variant/price are snapshotted at entry time. */
export interface FullEaterEntry {
  name: string;
  variant: string | null;
  price: number;
  count: number;
}

/** Two people splitting one meal. Variant/price (for the whole meal, split equally) are snapshotted at entry time. */
export interface HalfPairEntry {
  names: [string, string];
  variant: string | null;
  price: number;
}

/** A single day's meals. Derived fields are computed server-side, never sent by the client. */
export interface MealEntry {
  _id: string;
  date: string; // ISO date (midnight UTC)
  fullEaters: FullEaterEntry[];
  halfPairs: HalfPairEntry[];
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
  foodVariants: FoodVariant[];
  /** Variant name used when a person has no preference set. */
  defaultVariant?: string;
  /** WhatsApp number for the daily meal-count message to the food supplier. */
  supplierPhone?: string;
  /** Daily cutoff ("HH:mm", IST) after which members can no longer submit/edit/delete today's order. */
  orderCutoffTime: string;
  /** Show the member ordering-page countdown only once this many minutes remain before cutoff. */
  orderReminderMinutes: number;
  /** Mess-closed period ("YYYY-MM-DD", inclusive both ends) — null when no closure is set. */
  messClosedFrom: string | null;
  messClosedTo: string | null;
  messClosedMessage: string;
  updatedAt: string;
}

export interface SessionUser {
  sub: string;
  username: string;
}

export interface MemberSessionUser {
  sub: string; // Person._id
  name: string;
}

/** A member's pending meal order in the live admin queue. */
export interface QueueOrderItem {
  _id: string;
  personId: string;
  personName: string;
  date: string; // ISO date (midnight UTC)
  kind: "full" | "half";
  variant: string | null;
  count: number;
  partnerPersonId: string | null;
  partnerName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConfirmedOrderItem {
  kind: "full" | "half";
  variant: string | null;
  count: number;
  partnerName: string | null;
}

/** A member's order status for one date: nothing yet, still-editable (queue), or already
 * moved into a real entry by the admin (no longer self-editable). */
export type MemberDateOrder =
  | { status: "none" }
  | { status: "pending"; order: QueueOrderItem }
  | { status: "confirmed"; order: ConfirmedOrderItem };

/** In-app announcement from the admin to all members. */
export interface NotificationItem {
  _id: string;
  message: string;
  createdAt: string;
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
  variant: string | null;
  count: number;
  amount: number;
  settled: boolean;
  settlementId: string | null;
}
