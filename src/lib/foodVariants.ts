import type { FoodVariant } from "@/types";

export function variantPriceLookup(variants: FoodVariant[]): Map<string, number> {
  return new Map(variants.map((v) => [v.name.toLowerCase(), v.price]));
}

/** Resolve a full eater's per-meal price: the chosen variant's price, or the entry's base price. */
export function resolveFullEater(
  eater: { name: string; variant: string | null; count: number },
  pricePerMeal: number,
  variantPrices: Map<string, number>,
): { name: string; variant: string | null; price: number; count: number } {
  const price = eater.variant ? (variantPrices.get(eater.variant.toLowerCase()) ?? pricePerMeal) : pricePerMeal;
  return { name: eater.name, variant: eater.variant, price, count: eater.count };
}

/** Resolve a half-pair's price for the whole shared meal — each partner owes half. */
export function resolveHalfPair(
  pair: { names: [string, string]; variant: string | null },
  pricePerMeal: number,
  variantPrices: Map<string, number>,
): { names: [string, string]; variant: string | null; price: number } {
  const price = pair.variant ? (variantPrices.get(pair.variant.toLowerCase()) ?? pricePerMeal) : pricePerMeal;
  return { names: pair.names, variant: pair.variant, price };
}
