import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { MealEntryModel, computeDerived } from "@/models/MealEntry";
import { SettingsModel } from "@/models/Settings";
import { entryParticipantSchema } from "@/lib/validation";
import { variantPriceLookup } from "@/lib/foodVariants";
import { serializeEntry } from "@/lib/serialize";
import { ApiError, ok, route } from "@/lib/api";

/**
 * Updates one person's participation in an entry: paid status always, plus
 * variant. Count only applies to full eaters. A half-pair member's variant
 * change updates the whole shared meal (and so both partners' price).
 */
export const PATCH = route(async (_session, request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid id");
  const { name, paid, variant, count } = entryParticipantSchema.parse(await request.json());
  await connectDB();

  const entry = await MealEntryModel.findById(id);
  if (!entry) throw new ApiError(404, "Entry not found");
  if (entry.settlementId) throw new ApiError(409, "Settled entries are read-only");

  const lc = name.toLowerCase();
  const fullEater = entry.fullEaters.find((e) => e.name.toLowerCase() === lc);
  const halfPair = entry.halfPairs.find((p) => p.names.some((n) => n.toLowerCase() === lc));
  if (!fullEater && !halfPair) throw new ApiError(400, "That person isn't part of this entry");

  const canonicalName = fullEater ? fullEater.name : halfPair!.names.find((n) => n.toLowerCase() === lc)!;

  if (paid !== undefined) {
    const paidBy = new Set(entry.paidBy);
    if (paid) paidBy.add(canonicalName);
    else paidBy.delete(canonicalName);
    entry.paidBy = [...paidBy];
  }

  if (variant !== undefined && (fullEater || halfPair)) {
    const settings = await SettingsModel.findOne({ key: "singleton" }).lean();
    const variantPrices = variantPriceLookup(settings?.foodVariants ?? []);
    const price = variant ? (variantPrices.get(variant.toLowerCase()) ?? entry.pricePerMeal) : entry.pricePerMeal;
    if (fullEater) {
      fullEater.variant = variant;
      fullEater.price = price;
    } else if (halfPair) {
      halfPair.variant = variant;
      halfPair.price = price;
    }
  }
  if (fullEater && count !== undefined) fullEater.count = count;
  if (fullEater) entry.markModified("fullEaters");
  if (halfPair) entry.markModified("halfPairs");

  entry.set(computeDerived(entry.fullEaters, entry.halfPairs));
  await entry.save();

  return ok(serializeEntry(entry.toObject()));
});
