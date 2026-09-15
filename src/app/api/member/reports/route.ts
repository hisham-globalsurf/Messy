import { connectDB } from "@/lib/db/mongoose";
import { ReportModel } from "@/models/Report";
import { reportCreateSchema } from "@/lib/validation";
import { publishReportCreated } from "@/lib/ably";
import { ok } from "@/lib/api";
import { memberRoute } from "@/lib/memberApi";

export const POST = memberRoute(async (session, request: Request) => {
  const { message } = reportCreateSchema.parse(await request.json());
  await connectDB();

  await ReportModel.create({ personId: session.sub, personName: session.name, message });

  // Best-effort — the admin's Settings > Reports tab should show this instantly if it's open,
  // but a delivery failure here never fails the report submission itself.
  await publishReportCreated();

  return ok({ ok: true }, 201);
});
