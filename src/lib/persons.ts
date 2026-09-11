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

  // halfPairs is an array of 2-tuples ([[String]]). Mongo's implicit array
  // matching only unwraps one level, so a query like `{ halfPairs: { $regex } }`
  // (or even `"halfPairs.0"`) never reaches the inner strings and silently
  // matches nothing — confirmed against the driver directly. Filter in
  // application code instead, same as the `person` filter in the entries list route.
  const all = await MealEntryModel.find();
  const entries = all.filter(
    (e) =>
      e.fullEaters.some((fe) => fe.name.toLowerCase() === lc) ||
      e.halfPairs.some((p) => p.names.some((n) => n.toLowerCase() === lc)),
  );

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
