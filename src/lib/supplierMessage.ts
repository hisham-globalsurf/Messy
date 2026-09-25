import type { MealEntry } from "@/types";

/** Aggregate one entry's meals by food variant — each half-pair counts as one physical meal. */
function variantCounts(entry: Pick<MealEntry, "fullEaters" | "halfPairs">): {
  total: number;
  byVariant: Map<string, number>;
} {
  const byVariant = new Map<string, number>();
  let total = 0;
  for (const eater of entry.fullEaters) {
    const key = eater.variant ?? "No preference";
    byVariant.set(key, (byVariant.get(key) ?? 0) + eater.count);
    total += eater.count;
  }
  for (const pair of entry.halfPairs) {
    const key = pair.variant ?? "No preference";
    byVariant.set(key, (byVariant.get(key) ?? 0) + 1);
    total += 1;
  }
  return { total, byVariant };
}

/**
 * Plain-text order summary for the food supplier:
 * Total 7
 *
 * Non-veg 6
 * Egg 1
 */
export function buildSupplierMessage(entry: Pick<MealEntry, "fullEaters" | "halfPairs">): string {
  const { total, byVariant } = variantCounts(entry);
  const lines = [...byVariant.entries()].map(([variant, count]) => `${variant} ${count}`);
  return lines.length > 0 ? `Total ${total}\n\n${lines.join("\n")}` : `Total ${total}`;
}
