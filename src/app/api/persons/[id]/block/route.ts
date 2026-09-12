import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { PersonModel } from "@/models/Person";
import { ApiError, ok, route } from "@/lib/api";

const blockSchema = z.object({ blocked: z.boolean() });

export const PATCH = route(async (_session, request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid id");
  const { blocked } = blockSchema.parse(await request.json());
  await connectDB();

  const person = await PersonModel.findByIdAndUpdate(id, { blocked }, { new: true }).lean();
  if (!person) throw new ApiError(404, "Person not found");

  return ok({ _id: person._id.toString(), blocked: person.blocked ?? false });
});
