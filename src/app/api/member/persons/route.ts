import { connectDB } from "@/lib/db/mongoose";
import { PersonModel } from "@/models/Person";
import { ok } from "@/lib/api";
import { memberRoute } from "@/lib/memberApi";

/** Member-safe person list for the partner picker — names only, no phone numbers. */
export const GET = memberRoute(async () => {
  await connectDB();
  const persons = await PersonModel.find().sort({ name: 1 }).lean();
  return ok(persons.map((p) => ({ _id: p._id.toString(), name: p.name })));
});
