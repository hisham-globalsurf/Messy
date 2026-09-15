import { connectDB } from "@/lib/db/mongoose";
import { ReportModel } from "@/models/Report";
import { serializeReport } from "@/lib/serialize";
import { ok, route } from "@/lib/api";

export const GET = route(async () => {
  await connectDB();
  const reports = await ReportModel.find().sort({ createdAt: -1 }).lean();
  return ok(reports.map(serializeReport));
});
