import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { PersonModel } from "@/models/Person";
import { renamePersonInEntries } from "@/lib/persons";
import { renamePersonInQueue } from "@/lib/queue";
import { publishQueueChanged } from "@/lib/ably";
import { personCreateSchema } from "@/lib/validation";
import { ApiError, ok, route } from "@/lib/api";

const collation = { locale: "en", strength: 2 } as const;

export const PATCH = route(async (_session, request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid id");
  const { name, phone, preferredVariant } = personCreateSchema.parse(await request.json());
  await connectDB();

  const person = await PersonModel.findById(id);
  if (!person) throw new ApiError(404, "Person not found");

  const clash = await PersonModel.findOne({ name, _id: { $ne: id } }).collation(collation).lean();
  if (clash) throw new ApiError(409, `“${clash.name}” already exists`);

  const oldName = person.name;
  person.name = name;
  person.phone = phone ?? "";
  person.preferredVariant = preferredVariant ?? "";
  await person.save();

  const updatedEntries = await renamePersonInEntries(oldName, name);
  const touchedQueue = await renamePersonInQueue(oldName, name);
  if (touchedQueue > 0) await publishQueueChanged();
  return ok({
    _id: person._id.toString(),
    name: person.name,
    phone: person.phone || undefined,
    preferredVariant: person.preferredVariant || undefined,
    updatedEntries,
  });
});

export const DELETE = route(async (_session, _request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid id");
  await connectDB();

  const person = await PersonModel.findByIdAndDelete(id);
  if (!person) throw new ApiError(404, "Person not found");

  // Meal entries keep the name string — history stays intact.
  return ok({ ok: true });
});
