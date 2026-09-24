import { PersonModel } from "@/models/Person";
import { MealEntryModel } from "@/models/MealEntry";
import { NAME_COLLATION, entryPersonFilter } from "@/lib/entryLookup";

const collation = { locale: "en", strength: 2 } as const;

/** Ensure every name exists as a Person (case-insensitive). Returns canonical names. */
export async function ensurePersons(names: string[]): Promise<string[]> {
  const unique = [...new Map(names.map((n) => [n.toLowerCase(), n.trim()])).values()];
  if (unique.length === 0) return [];

  // One lookup for every name instead of one round-trip per name, then create only the missing ones.
  const existing = await PersonModel.find({ name: { $in: unique } }).collation(collation).lean();
  const byLower = new Map(existing.map((p) => [p.name.toLowerCase(), p.name]));
  const missing = unique.filter((n) => !byLower.has(n.toLowerCase()));
  const created = await Promise.all(missing.map((name) => PersonModel.create({ name })));
  for (const p of created) byLower.set(p.name.toLowerCase(), p.name);

  return unique.map((n) => byLower.get(n.toLowerCase())!);
}

/** Rewrite a person's name across every existing meal entry (case-insensitive match). */
export async function renamePersonInEntries(oldName: string, newName: string): Promise<number> {
  if (oldName.toLowerCase() === newName.toLowerCase() && oldName === newName) return 0;
  const lc = oldName.toLowerCase();

  // Only this person's entries — halfPairs is now `{ names: [a, b] }[]` (see
  // scripts/migrate-half-pairs.ts), so "halfPairs.names" is directly queryable, unlike the
  // old nested-tuple shape that forced loading every entry and filtering here.
  const entries = await MealEntryModel.find(entryPersonFilter(oldName)).collation(NAME_COLLATION);

  let touched = 0;
  for (const entry of entries) {
    const swap = (n: string) => (n.toLowerCase() === lc ? newName : n);
    entry.fullEaters = entry.fullEaters.map((fe) => ({ ...fe, name: swap(fe.name) }));
    entry.halfPairs = entry.halfPairs.map((p) => ({
      ...p,
      names: [swap(p.names[0]), swap(p.names[1])] as [string, string],
    }));
    entry.paidBy = entry.paidBy.map(swap);
    await entry.save();
    touched += 1;
  }
  return touched;
}

/** Map arbitrary-cased names in an entry to their canonical stored spelling. */
export async function canonicalizeEntryNames<
  T extends { fullEaters: { name: string }[]; halfPairs: { names: [string, string] }[] },
>(input: T): Promise<T> {
  const all = [...input.fullEaters.map((e) => e.name), ...input.halfPairs.flatMap((p) => p.names)];
  const canonical = await ensurePersons(all);
  const lookup = new Map(canonical.map((n) => [n.toLowerCase(), n]));
  const map = (n: string) => lookup.get(n.toLowerCase()) ?? n.trim();
  return {
    ...input,
    fullEaters: input.fullEaters.map((e) => ({ ...e, name: map(e.name) })),
    halfPairs: input.halfPairs.map((p) => ({ ...p, names: [map(p.names[0]), map(p.names[1])] as [string, string] })),
  };
}
