import { PersonModel } from "@/models/Person";
import { MealEntryModel } from "@/models/MealEntry";

const collation = { locale: "en", strength: 2 } as const;

/** Ensure every name exists as a Person (case-insensitive). Returns canonical names. */
export async function ensurePersons(names: string[]): Promise<string[]> {
  const unique = [...new Map(names.map((n) => [n.toLowerCase(), n.trim()])).values()];
  const canonical: string[] = [];

  for (const name of unique) {
    const existing = await PersonModel.findOne({ name }).collation(collation).lean();
    if (existing) {
      canonical.push(existing.name);
    } else {
      const created = await PersonModel.create({ name });
      canonical.push(created.name);
    }
  }
  return canonical;
}

/** Rewrite a person's name across every existing meal entry (case-insensitive match). */
export async function renamePersonInEntries(oldName: string, newName: string): Promise<number> {
  if (oldName.toLowerCase() === newName.toLowerCase() && oldName === newName) return 0;
  const lc = oldName.toLowerCase();
  const entries = await MealEntryModel.find({
    $or: [{ fullEaters: { $regex: `^${escapeRegex(oldName)}$`, $options: "i" } }, { halfPairs: { $regex: `^${escapeRegex(oldName)}$`, $options: "i" } }],
  });

  let touched = 0;
  for (const entry of entries) {
    const swap = (n: string) => (n.toLowerCase() === lc ? newName : n);
    entry.fullEaters = entry.fullEaters.map(swap);
    entry.halfPairs = entry.halfPairs.map(([a, b]) => [swap(a), swap(b)] as [string, string]);
    await entry.save();
    touched += 1;
  }
  return touched;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Map arbitrary-cased names in an entry to their canonical stored spelling. */
export async function canonicalizeEntryNames<T extends { fullEaters: string[]; halfPairs: [string, string][] }>(
  input: T,
): Promise<T> {
  const all = [...input.fullEaters, ...input.halfPairs.flat()];
  const canonical = await ensurePersons(all);
  const lookup = new Map(canonical.map((n) => [n.toLowerCase(), n]));
  const map = (n: string) => lookup.get(n.toLowerCase()) ?? n.trim();
  return {
    ...input,
    fullEaters: input.fullEaters.map(map),
    halfPairs: input.halfPairs.map(([a, b]) => [map(a), map(b)] as [string, string]),
  };
}
