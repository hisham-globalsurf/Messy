import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { PersonModel } from "@/models/Person";
import { MealEntryModel } from "@/models/MealEntry";
import { personCreateSchema } from "@/lib/validation";
import { ApiError, ok, route } from "@/lib/api";

export const GET = route(async (_session, request: NextRequest) => {
  await connectDB();
  const q = request.nextUrl.searchParams.get("q")?.trim();

  const filter = q ? { name: { $regex: escapeRegex(q), $options: "i" } } : {};
  const persons = await PersonModel.find(filter).sort({ name: 1 }).lean();

  // Order by usage frequency so recent/frequent names surface first.
  const usage = await MealEntryModel.aggregate<{ _id: string; count: number }>([
    { $project: { names: { $concatArrays: ["$fullEaters", { $reduce: { input: "$halfPairs", initialValue: [], in: { $concatArrays: ["$$value", "$$this"] } } }] } } },
    { $unwind: "$names" },
    { $group: { _id: { $toLower: "$names" }, count: { $sum: 1 } } },
  ]);
  const freq = new Map(usage.map((u) => [u._id, u.count]));

  const result = persons
    .map((p) => ({
      _id: p._id.toString(),
      name: p.name,
      phone: p.phone || undefined,
      createdAt: new Date(p.createdAt).toISOString(),
      uses: freq.get(p.name.toLowerCase()) ?? 0,
    }))
    .sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name));

  return ok(result);
});

export const POST = route(async (_session, request: Request) => {
  const { name, phone } = personCreateSchema.parse(await request.json());
  await connectDB();

  const existing = await PersonModel.findOne({ name })
    .collation({ locale: "en", strength: 2 })
    .lean();
  if (existing) {
    return ok({ _id: existing._id.toString(), name: existing.name, phone: existing.phone || undefined, createdAt: new Date(existing.createdAt).toISOString() });
  }

  try {
    const created = await PersonModel.create({ name, phone });
    return ok({ _id: created._id.toString(), name: created.name, phone: created.phone || undefined, createdAt: created.createdAt.toISOString() }, 201);
  } catch {
    throw new ApiError(409, "That person already exists");
  }
});

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
