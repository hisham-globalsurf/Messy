import { connectDB } from "@/lib/db/mongoose";
import { ReportModel } from "@/models/Report";
import { reportCreateSchema } from "@/lib/validation";
import { ok } from "@/lib/api";
import { memberRoute } from "@/lib/memberApi";

export const POST = memberRoute(async (session, request: Request) => {
  const { message } = reportCreateSchema.parse(await request.json());
  await connectDB();

  await ReportModel.create({ personId: session.sub, personName: session.name, message });

  return ok({ ok: true }, 201);
});
