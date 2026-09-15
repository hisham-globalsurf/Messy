import type { FullEaterEntryDoc, HalfPairEntryDoc } from "@/models/MealEntry";

/** Case-insensitive lookup shared by every place that needs to find a person inside a
 * MealEntry's fullEaters/halfPairs — queue.ts's draft/confirmed-order lookups, the entries
 * list "person" filter, the participant-update route, renamePersonInEntries, and person stats
 * each used to hand-roll this same pair of `.find()` calls independently. */
export function findFullEater(fullEaters: FullEaterEntryDoc[], name: string): FullEaterEntryDoc | undefined {
  const lc = name.toLowerCase();
  return fullEaters.find((e) => e.name.toLowerCase() === lc);
}

export function findHalfPair(halfPairs: HalfPairEntryDoc[], name: string): HalfPairEntryDoc | undefined {
  const lc = name.toLowerCase();
  return halfPairs.find((p) => p.names.some((n) => n.toLowerCase() === lc));
}

/** The *other* name in a half-pair, given one side (case-insensitive) — null only if `name`
 * isn't actually in `pair`, which shouldn't happen given callers always pass a pair that
 * `findHalfPair` already matched against the same name. */
export function halfPairPartner(pair: HalfPairEntryDoc, name: string): string | null {
  const lc = name.toLowerCase();
  return pair.names.find((n) => n.toLowerCase() !== lc) ?? null;
}

/** Whether `name` appears anywhere in this entry, as a full eater or either half-pair side. */
export function entryHasPerson(
  entry: { fullEaters: FullEaterEntryDoc[]; halfPairs: HalfPairEntryDoc[] },
  name: string,
): boolean {
  return Boolean(findFullEater(entry.fullEaters, name) || findHalfPair(entry.halfPairs, name));
}
