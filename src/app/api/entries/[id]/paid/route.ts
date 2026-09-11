import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { MealEntryModel } from "@/models/MealEntry";
import { entryPaidSchema } from "@/lib/validation";
import { serializeEntry } from "@/lib/serialize";
import { ApiError, ok, route } from "@/lib/api";

export const PATCH = route(async (_session, request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid id");
  const { name, paid } = entryPaidSchema.parse(await request.json());
  await connectDB();

  const entry = await MealEntryModel.findById(id);
  if (!entry) throw new ApiError(404, "Entry not found");

  const lc = name.toLowerCase();
  const canonical = [...entry.fullEaters, ...entry.halfPairs.flat()].find((n) => n.toLowerCase() === lc);
  if (!canonical) throw new ApiError(400, "That person isn't part of this entry");

  const paidBy = new Set(entry.paidBy);
  if (paid) paidBy.add(canonical);
  else paidBy.delete(canonical);
  entry.paidBy = [...paidBy];
  await entry.save();

  return ok(serializeEntry(entry.toObject()));
});
