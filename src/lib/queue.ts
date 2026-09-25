import "server-only";
import mongoose from "mongoose";
import { QueueOrderModel } from "@/models/QueueOrder";
import { MealEntryModel, computeDerived, type FullEaterEntryDoc, type HalfPairEntryDoc } from "@/models/MealEntry";
import { SettingsModel } from "@/models/Settings";
import { resolveFullEater, resolveHalfPair, variantPriceLookup } from "@/lib/foodVariants";
import { notifyOrderChange, type OrderNotice } from "@/lib/notifyMember";
import { publishQueueChanged } from "@/lib/ably";
import { ApiError } from "@/lib/api";
import { NAME_COLLATION, entryPersonFilter, findFullEater, findHalfPair, halfPairPartner } from "@/lib/entryLookup";

/** Rewrite a person's name across any pending queue rows — cascades a Person rename,
 * mirroring `renamePersonInEntries` in src/lib/persons.ts. */
export async function renamePersonInQueue(oldName: string, newName: string): Promise<number> {
  if (oldName.toLowerCase() === newName.toLowerCase() && oldName === newName) return 0;
  const lc = oldName.toLowerCase();
  // Filter in application code rather than a Mongo $regex built from the name — a name
  // containing regex metacharacters (e.g. "A.J") would otherwise match unintended rows.
  const all = await QueueOrderModel.find();
  const rows = all.filter(
    (r) => r.personName.toLowerCase() === lc || r.partnerName?.toLowerCase() === lc,
  );

  let touched = 0;
  for (const row of rows) {
    let changed = false;
    if (row.personName.toLowerCase() === lc) {
      row.personName = newName;
      changed = true;
    }
    if (row.partnerName && row.partnerName.toLowerCase() === lc) {
      row.partnerName = newName;
      changed = true;
    }
    if (changed) {
      await row.save();
      touched += 1;
    }
  }
  return touched;
}

/** Rejects if `personId` (or `partnerId`) is already the submitter or partner of another
 * queue row for the same date — prevents contradictory/duplicate meals for the same people. */
export async function assertPeopleAvailable(
  date: Date,
  personId: string,
  partnerId: string | null,
  excludeRowId?: string,
): Promise<void> {
  const ids = [personId, ...(partnerId ? [partnerId] : [])];
  const query: Record<string, unknown> = {
    date,
    $or: [{ personId: { $in: ids } }, { partnerPersonId: { $in: ids } }],
  };
  if (excludeRowId) query._id = { $ne: excludeRowId };

  const clash = await QueueOrderModel.findOne(query).lean();
  if (!clash) return;

  const clashedId = ids.find(
    (id) => clash.personId.toString() === id || clash.partnerPersonId?.toString() === id,
  );
  const clashedName = clash.personId.toString() === clashedId ? clash.personName : clash.partnerName;
  throw new ApiError(409, `${clashedName} already has an order for this date — sort that out first.`);
}

export interface LastOrderDraft {
  kind: "full" | "half";
  variant: string | null;
  count: number;
  partnerName: string | null;
}

/** The member's most recent past meal (from settled MealEntry history, newest first) —
 * used to prefill the order form so a member doesn't have to re-pick the same thing daily. */
export async function findLastOrderDraft(personName: string): Promise<LastOrderDraft | null> {
  // Let Mongo find the single newest entry containing this person instead of pulling the whole
  // meal history over the wire and scanning it here — that grew with every day logged and was
  // the bulk of /order's load time.
  const entry = await MealEntryModel.findOne(entryPersonFilter(personName))
    .collation(NAME_COLLATION)
    .sort({ date: -1 })
    .lean();
  if (!entry) return null;

  const full = findFullEater(entry.fullEaters, personName);
  if (full) return { kind: "full", variant: full.variant, count: full.count, partnerName: null };

  const pair = findHalfPair(entry.halfPairs, personName);
  if (pair) return { kind: "half", variant: pair.variant, count: 1, partnerName: halfPairPartner(pair, personName) };
  return null;
}

export interface ConfirmedOrder {
  kind: "full" | "half";
  variant: string | null;
  count: number;
  partnerName: string | null;
}

/** Whether `personName` already has an admin-confirmed MealEntry for `date` — once true, the
 * member can no longer self-edit that date; only the admin can change it. Automatically stops
 * being true again if the admin later deletes the entry or removes them from it, since this is
 * re-checked fresh on every request rather than being a stored flag. */
export async function findConfirmedOrder(personName: string, date: Date): Promise<ConfirmedOrder | null> {
  const entry = await MealEntryModel.findOne({ date }).lean();
  if (!entry) return null;

  const full = findFullEater(entry.fullEaters, personName);
  if (full) return { kind: "full", variant: full.variant, count: full.count, partnerName: null };

  const pair = findHalfPair(entry.halfPairs, personName);
  if (pair) return { kind: "half", variant: pair.variant, count: 1, partnerName: halfPairPartner(pair, personName) };

  return null;
}

/** Converts pending queue rows for one date into a real MealEntry, merging into any entry
 * that already exists for that date. Reuses the exact price-resolution helpers the admin's
 * own POST /api/entries route uses, so pricing logic isn't duplicated. Runs in a transaction
 * (Atlas cluster — supports multi-document transactions) with write-then-delete ordering as
 * defense-in-depth even inside it. */
export async function moveQueueToEntries(
  date: Date,
  rowIds?: string[],
): Promise<{ entryId: string; movedCount: number }> {
  const session = await mongoose.startSession();
  try {
    let result: { entryId: string; movedCount: number } | null = null;
    let notices: OrderNotice[] = [];
    let messName = "Messy";

    await session.withTransaction(async () => {
      const rowQuery: Record<string, unknown> = { date };
      if (rowIds) rowQuery._id = { $in: rowIds };
      const rows = await QueueOrderModel.find(rowQuery).session(session);
      if (rows.length === 0) throw new ApiError(404, "No pending orders found for this date");

      const settings = await SettingsModel.findOne({ key: "singleton" }).session(session).lean();
      if (!settings) throw new ApiError(500, "Settings not found");
      messName = settings.messName;

      const existing = await MealEntryModel.findOne({ date }).session(session);
      const pricePerMeal = existing?.pricePerMeal ?? settings.pricePerMeal;
      const variantPrices = variantPriceLookup(settings.foodVariants ?? []);

      const existingFullEaters = existing?.fullEaters ?? [];
      const existingHalfPairs = existing?.halfPairs ?? [];

      const newFullEaters: FullEaterEntryDoc[] = [];
      const newHalfPairs: HalfPairEntryDoc[] = [];
      for (const row of rows) {
        if (row.kind === "full") {
          newFullEaters.push(
            resolveFullEater({ name: row.personName, variant: row.variant, count: row.count }, pricePerMeal, variantPrices),
          );
        } else if (row.partnerName) {
          newHalfPairs.push(
            resolveHalfPair(
              { names: [row.personName, row.partnerName], variant: row.variant },
              pricePerMeal,
              variantPrices,
            ),
          );
        }
      }

      const allNames = [
        ...existingFullEaters.map((e) => e.name),
        ...existingHalfPairs.flatMap((p) => p.names),
        ...newFullEaters.map((e) => e.name),
        ...newHalfPairs.flatMap((p) => p.names),
      ].map((n) => n.toLowerCase());
      const seen = new Set<string>();
      for (const n of allNames) {
        if (seen.has(n)) {
          throw new ApiError(
            409,
            "One of these people already appears in this day's entry — resolve the conflict manually before moving.",
          );
        }
        seen.add(n);
      }

      const mergedFullEaters = [...existingFullEaters, ...newFullEaters];
      const mergedHalfPairs = [...existingHalfPairs, ...newHalfPairs];
      const derived = computeDerived(mergedFullEaters, mergedHalfPairs);

      let entryId: string;
      if (existing) {
        existing.set({ fullEaters: mergedFullEaters, halfPairs: mergedHalfPairs, ...derived });
        await existing.save({ session });
        entryId = existing._id.toString();
      } else {
        const [created] = await MealEntryModel.create(
          [{ date, fullEaters: mergedFullEaters, halfPairs: mergedHalfPairs, pricePerMeal, ...derived }],
          { session },
        );
        entryId = created._id.toString();
      }

      await QueueOrderModel.deleteMany({ _id: { $in: rows.map((r) => r._id) } }, { session });
      result = { entryId, movedCount: rows.length };
      // Half-pair rows only exist once (on the submitter's side) — name the other person
      // in each side's push so both know who they're confirmed with, not just that "a meal" is on.
      notices = rows.flatMap((r) =>
        r.kind === "half" && r.partnerPersonId && r.partnerName
          ? [
              { personId: r.personId.toString(), body: `Your order with ${r.partnerName} is confirmed and it’s on the way!` },
              { personId: r.partnerPersonId.toString(), body: `Your order with ${r.personName} is confirmed and it’s on the way!` },
            ]
          : [{ personId: r.personId.toString(), body: "Your meal is confirmed and it’s on the way!" }],
      );
    });

    if (!result) throw new ApiError(500, "Move failed");

    // Best-effort, outside the transaction — neither notification path should undo the move.
    // Ably covers a member's already-open tab instantly; push covers the case where they've
    // closed it (Ably needs a live connection, so it can't reach a closed tab on its own).
    await Promise.all([publishQueueChanged(), notifyOrderChange(notices, messName)]);

    return result;
  } finally {
    await session.endSession();
  }
}
