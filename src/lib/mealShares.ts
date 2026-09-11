export interface PersonShare {
  name: string;
  amount: number;
  /** Meal units this share represents — a full eater's count, or 1 for a half-pair member (unchanged from before). */
  meals: number;
  paid: boolean;
}

interface EntryLike {
  date: Date | string;
  fullEaters?: { name: string; price: number; count: number }[];
  halfPairs?: { names: [string, string]; price: number }[];
  pricePerMeal: number;
  paidBy?: string[];
}

/** Splits one entry's total into each person's share, flagging shares already paid in cash. */
export function entryShares(entry: EntryLike): PersonShare[] {
  const paidSet = new Set((entry.paidBy ?? []).map((n) => n.toLowerCase()));
  const shares: PersonShare[] = [];
  for (const eater of entry.fullEaters ?? []) {
    shares.push({
      name: eater.name,
      amount: eater.price * eater.count,
      meals: eater.count,
      paid: paidSet.has(eater.name.toLowerCase()),
    });
  }
  for (const pair of entry.halfPairs ?? []) {
    for (const name of pair.names) {
      shares.push({ name, amount: pair.price / 2, meals: 1, paid: paidSet.has(name.toLowerCase()) });
    }
  }
  return shares;
}
