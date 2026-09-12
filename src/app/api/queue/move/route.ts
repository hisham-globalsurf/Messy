import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { toUtcDay } from "@/lib/format";
import { moveQueueToEntries } from "@/lib/queue";
import { ok, route } from "@/lib/api";

const bodySchema = z.object({ date: z.coerce.date() });

export const POST = route(async (_session, request: Request) => {
  const { date } = bodySchema.parse(await request.json());
  await connectDB();

  const result = await moveQueueToEntries(toUtcDay(date));
  return ok(result);
});
