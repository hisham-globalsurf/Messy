export interface PersonShare {
  name: string;
  amount: number;
  paid: boolean;
}

interface EntryLike {
  date: Date | string;
  fullEaters?: string[];
  halfPairs?: string[][];
  pricePerMeal: number;
  paidBy?: string[];
}

/** Splits one entry's total into each person's share, flagging shares already paid in cash. */
export function entryShares(entry: EntryLike): PersonShare[] {
  const paidSet = new Set((entry.paidBy ?? []).map((n) => n.toLowerCase()));
  const shares: PersonShare[] = [];
  for (const name of entry.fullEaters ?? []) {
    shares.push({ name, amount: entry.pricePerMeal, paid: paidSet.has(name.toLowerCase()) });
  }
  for (const pair of entry.halfPairs ?? []) {
    for (const name of pair) {
      shares.push({ name, amount: entry.pricePerMeal / 2, paid: paidSet.has(name.toLowerCase()) });
    }
  }
  return shares;
}
