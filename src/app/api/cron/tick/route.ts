import { timingSafeEqual } from "node:crypto";
import { connectDB } from "@/lib/db/mongoose";
import { SettingsModel } from "@/models/Settings";
import { runLunchReminder, runSupplierDispatch } from "@/lib/dailyJobs";
import { serializeSettings } from "@/lib/serialize";
import { ApiError, errorResponse, ok } from "@/lib/api";

// The supplier job can move the queue (a transaction) and push — give it room so a slow run isn't
// cut off after it has already claimed the day.
export const maxDuration = 60;

/** The scheduler must send `Authorization: Bearer $CRON_SECRET`. */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Called every few minutes by an external scheduler (cron-job.org — Vercel Hobby crons only run
 * once a day, and not at a precise minute). Each job decides from Settings whether it's due, so
 * admins can change the times in Settings without touching the scheduler. */
export async function GET(request: Request): Promise<Response> {
  try {
    if (!isAuthorized(request)) throw new ApiError(401, "Not authenticated");
    await connectDB();
    // Not .lean(): schema defaults only apply on a hydrated document (older Settings docs predate some fields).
    const doc = await SettingsModel.findOne({ key: "singleton" });
    if (!doc) throw new ApiError(500, "Settings not found");
    const settings = serializeSettings(doc.toObject());

    // Independent jobs — one failing must not stop the other.
    const [reminder, supplier] = await Promise.allSettled([runLunchReminder(settings), runSupplierDispatch(settings)]);
    const report = (r: PromiseSettledResult<unknown>) => {
      if (r.status === "fulfilled") return r.value;
      console.error("Cron job failed:", r.reason);
      return { error: r.reason instanceof Error ? r.reason.message : "failed" };
    };
    return ok({ reminder: report(reminder), supplier: report(supplier) });
  } catch (err) {
    return errorResponse(err);
  }
}
